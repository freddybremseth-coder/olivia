const CATASTRO_HOST = "https://ovc.catastro.meh.es";

const catastroFetch = async (url: string): Promise<string> => {
  const path = url.replace(CATASTRO_HOST, "");
  const errors: string[] = [];

  // 1) Vite dev-proxy – kun lokalt under `npm run dev`
  if (import.meta.env.DEV) {
    try {
      const r = await fetch(`/api/catastro${path}`);
      if (r.ok) {
        const text = await r.text();
        if (text.trim().startsWith("<")) return text;
      }
    } catch (_) { /* faller gjennom */ }
  }

  // 2) Direkte – Catastro tillater CORS; les body også ved HTTP 500 (SOAP fault er XML)
  try {
    const r = await fetch(url);
    const text = await r.text();
    console.log("[Catastro direkte]", r.status, JSON.stringify(text.slice(0, 400)));
    // fjern BOM (\uFEFF) før sjekk
    if (text.replace(/^\uFEFF/, '').trim().startsWith("<")) return text;
    errors.push(`direkte HTTP ${r.status}: ikke XML (${text.slice(0, 80)})`);
  } catch (e: any) {
    errors.push(`direkte: ${e.message}`);
  }

  // 3) allorigins.win/get – JSON-wrapper (mer pålitelig enn /raw)
  try {
    const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
    if (r.ok) {
      const json = await r.json();
      const text: string = json?.contents ?? "";
      if (text.trim().startsWith("<")) return text;
      errors.push(`allorigins: ugyldig innhold`);
    } else {
      errors.push(`allorigins HTTP ${r.status}`);
    }
  } catch (e: any) {
    errors.push(`allorigins: ${e.message}`);
  }

  // 4) api.codetabs.com
  try {
    const r = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`);
    if (r.ok) {
      const text = await r.text();
      if (text.trim().startsWith("<")) return text;
      errors.push(`codetabs: ugyldig innhold`);
    } else {
      errors.push(`codetabs HTTP ${r.status}`);
    }
  } catch (e: any) {
    errors.push(`codetabs: ${e.message}`);
  }

  // 5) corsproxy.io
  try {
    const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
    if (r.ok) {
      const text = await r.text();
      if (text.trim().startsWith("<")) return text;
      errors.push(`corsproxy: ugyldig innhold`);
    } else {
      errors.push(`corsproxy HTTP ${r.status}`);
    }
  } catch (e: any) {
    errors.push(`corsproxy: ${e.message}`);
  }

  throw new Error(`Catastro utilgjengelig. (${errors.join('; ')})`);
};

export class SedecService {
  private static WFS_URL =
    "https://ovc.catastro.meh.es/INSPIRE/wfsCP.aspx";
  private static ALPHA_CODES_URL =
    `${CATASTRO_HOST}/ovcservweb/OVCSWLocalizacionRC/OVCCallejeroCodigos.asmx/Consulta_DNPPP_Codigos`;

  async getParcelPolygon(
    refCat: string,
    fallbackCoords?: [number, number]
  ): Promise<[number, number][] | null> {
    try {
      const parcelId = refCat.replace(/\s/g, "").slice(0, 14);
      const params = new URLSearchParams({
        service: "wfs", version: "2", request: "getfeature",
        STOREDQUERIE_ID: "GetParcel",
        refcat: parcelId,
        srsname: "EPSG::4326",
      });
      const r = await fetch(`${SedecService.WFS_URL}?${params}`);
      if (!r.ok) throw new Error(`WFS HTTP ${r.status}`);
      const xml = await r.text();
      const coords = this.parseGmlPolygon(xml);
      if (coords && coords.length > 2) return coords;
      throw new Error("Ingen koordinater i WFS-svar");
    } catch (e) {
      console.warn("[getParcelPolygon]", e);
      if (fallbackCoords) {
        const o = 0.0003, [lat, lon] = fallbackCoords;
        return [
          [lat + o, lon - o], [lat + o, lon + o],
          [lat - o, lon + o], [lat - o, lon - o],
          [lat + o, lon - o],
        ];
      }
      return null;
    }
  }

  async searchMunicipalities(
    provCode: string, namePrefix: string, provLabel: string
  ): Promise<import('../data/es_municipalities').Municipality[]> {
    const url = `${CATASTRO_HOST}/ovcservweb/OVCSWLocalizacionRC/OVCCallejeroCodigos.asmx/ConsultaMunicipioCodigos` +
      `?CodigoProvincia=${provCode}&NombreMunicipio=${encodeURIComponent(namePrefix)}`;
    const xml = await catastroFetch(url);
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    return Array.from(doc.querySelectorAll('muni locat')).map(el => ({
      provinceCode: el.querySelector('nump')?.textContent?.trim() ?? provCode,
      provinceName: provLabel,
      municipalityCode: el.querySelector('cmund')?.textContent?.trim() ?? '',
      municipalityName: el.querySelector('nm')?.textContent?.trim() ?? '',
    })).filter(m => m.municipalityCode);
  }

  async getAlphanumericDataByCode(
    provinciaCod: string, municipioCod: string,
    poligono: string, parcela: string
  ): Promise<any> {
    const params = new URLSearchParams({
      CodigoProvincia: provinciaCod,
      CodigoMunicipio: municipioCod,
      CodigoMunicipioINE: provinciaCod + municipioCod,
      Poligono: poligono,
      Parcela: parcela,
    });
    const url = `${SedecService.ALPHA_CODES_URL}?${params}`;
    const xmlText = await catastroFetch(url);
    console.log("[Catastro XML]", xmlText.slice(0, 600));

    if (xmlText.includes("<err>") || xmlText.includes("<faultstring>")) {
      const m = xmlText.match(/<des>(.*?)<\/des>/i)
               || xmlText.match(/<faultstring>(.*?)<\/faultstring>/i);
      throw new Error(`Catastro: ${m?.[1] || "feil fra API"}`);
    }

    const data = this.parseAlphanumericXml(xmlText);
    if (!data.cadastralId)
      throw new Error("Fant ikke Referencia Catastral i svaret. Sjekk Polígono/Parcela.");
    return data;
  }

  private parseAlphanumericXml(xml: string): any {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, "text/xml");
    const result: any = {};

    const pc1 = xmlDoc.querySelector("pc1")?.textContent?.trim() ?? "";
    const pc2 = xmlDoc.querySelector("pc2")?.textContent?.trim() ?? "";
    const id = pc1 + pc2;
    if (id.length >= 14) result.cadastralId = id;

    const sfe = xmlDoc.querySelector("sfe");
    if (sfe?.textContent) result.areaSqm = parseInt(sfe.textContent.trim(), 10) || 0;

    result.landUse = xmlDoc.querySelector("luso")?.textContent?.trim() || "Ukjent";
    result.address  = xmlDoc.querySelector("ldt")?.textContent?.trim()  || "Ingen adresse";

    return result;
  }

  private parseGmlPolygon(xml: string): [number, number][] | null {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xml, "text/xml");
      const posListEl = xmlDoc.getElementsByTagNameNS("*", "posList")[0];
      if (!posListEl?.textContent) return null;
      const values = posListEl.textContent.trim().split(/\s+/).map(Number);
      const coords: [number, number][] = [];
      for (let i = 0; i + 1 < values.length; i += 2) {
        if (!isNaN(values[i]) && !isNaN(values[i + 1]))
          coords.push([values[i], values[i + 1]]);
      }
      return coords.length > 2 ? coords : null;
    } catch { return null; }
  }
}

export const sedecService = new SedecService();
