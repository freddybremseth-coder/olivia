const CATASTRO_HOST = "https://ovc.catastro.meh.es";

/** Returns true only for actual XML (not HTML error pages) */
const isXml = (text: string) => {
  const t = text.replace(/^\uFEFF/, '').trim();
  return t.startsWith("<?xml") || t.startsWith("<consulta") || t.startsWith("<string") || t.startsWith("<municipiero") || t.startsWith("<datos") || t.startsWith("<wfs") || t.startsWith("<FeatureCollection");
};

/**
 * Catastro fetch — uses our own proxy at /api/catastro (Vite dev-proxy locally,
 * Vercel serverless in production). The previous fallbacks via allorigins.win,
 * api.codetabs.com and corsproxy.io leaked every cadastral lookup to random
 * third-party services and added latency on every request, so they're removed.
 *
 * If the local proxy fails we try Catastro directly once (it sets CORS in some
 * cases and returns XML even on HTTP 500 SOAP faults), then surface a real
 * error instead of silently swallowing it.
 */
const catastroFetch = async (url: string): Promise<string> => {
  const path = url.replace(CATASTRO_HOST, "");
  const errors: string[] = [];

  // 1) Own proxy
  try {
    const r = await fetch(`/api/catastro${path}`);
    const text = await r.text();
    if (isXml(text)) return text;
    errors.push(`proxy HTTP ${r.status}: ikke XML (${text.slice(0, 80)})`);
  } catch (e: any) {
    errors.push(`proxy: ${e.message}`);
  }

  // 2) Direct (last-resort; Catastro sometimes allows CORS and returns XML even on 500)
  try {
    const r = await fetch(url);
    const text = await r.text();
    if (text.replace(/^\uFEFF/, "").trim().startsWith("<")) return text;
    errors.push(`direkte HTTP ${r.status}: ikke XML (${text.slice(0, 80)})`);
  } catch (e: any) {
    errors.push(`direkte: ${e.message}`);
  }

  throw new Error(
    `Catastro utilgjengelig. Sjekk at /api/catastro proxyer mot ovc.catastro.meh.es. (${errors.join("; ")})`
  );
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
      const url = `${SedecService.WFS_URL}?${params}`;
      const xml = await catastroFetch(url);
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

  /** Lookup cadastral reference (RC) from WGS-84 coordinates */
  async getParcelRC(lat: number, lon: number): Promise<{ rc: string; address: string }> {
    const url = `${CATASTRO_HOST}/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_RCCOOR` +
      `?SRS=EPSG:4326&Coordenada_X=${lon.toFixed(7)}&Coordenada_Y=${lat.toFixed(7)}`;
    const xml = await catastroFetch(url);
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const get = (tag: string) =>
      doc.getElementsByTagNameNS('*', tag)[0]?.textContent?.trim() ?? '';
    const rc = get('pc1') + get('pc2');
    if (rc.length < 14) throw new Error(get('des') || 'Ingen eiendom funnet på dette stedet');
    return { rc, address: get('ldt') };
  }

  async searchMunicipalities(
    provCode: string, namePrefix: string, provLabel: string
  ): Promise<import('../data/es_municipalities').Municipality[]> {
    // ConsultaMunicipioCodigos requires all 4 params; CodigoMunicipio+Ine can be empty
    const url = `${CATASTRO_HOST}/ovcservweb/OVCSWLocalizacionRC/OVCCallejeroCodigos.asmx/ConsultaMunicipioCodigos` +
      `?CodigoProvincia=${provCode}&CodigoMunicipio=&CodigoMunicipioIne=&NombreMunicipio=${encodeURIComponent(namePrefix.toUpperCase())}`;
    const xml = await catastroFetch(url);
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    // Response returns ALL province municipalities — filter client-side by name
    // <muni><nm>BIAR</nm><locat><cd>3</cd><cmc>43</cmc></locat>...
    const upper = namePrefix.toUpperCase();
    return Array.from(doc.querySelectorAll('muni')).map(el => ({
      provinceCode: provCode,
      provinceName: provLabel,
      municipalityCode: el.querySelector('cmc')?.textContent?.trim() ?? '',
      municipalityName: el.querySelector('nm')?.textContent?.trim() ?? '',
    })).filter(m => m.municipalityCode && m.municipalityName.toUpperCase().includes(upper));
  }

  async getAlphanumericDataByCode(
    provinciaCod: string, municipioCod: string,
    poligono: string, parcela: string
  ): Promise<any> {
    const params = new URLSearchParams({
      CodigoProvincia: provinciaCod,
      CodigoMunicipio: municipioCod,
      CodigoMunicipioINE: municipioCod,  // Catastro uses its own sequential codes, not INE province+mun
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

    // Must use getElementsByTagNameNS because Catastro XML has default namespace
    const get = (tag: string) =>
      xmlDoc.getElementsByTagNameNS("*", tag)[0]?.textContent?.trim() ?? "";

    const id = get("pc1") + get("pc2");
    if (id.length >= 14) result.cadastralId = id;

    const sfeText = get("sfe");
    result.areaSqm = sfeText ? parseInt(sfeText, 10) || 0 : 0;

    result.landUse = get("luso") || "Ukjent";
    result.address  = get("ldt")  || "Ingen adresse";

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
