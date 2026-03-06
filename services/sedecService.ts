
// corsproxy.io gir CORS-headere slik at nettleseren aksepterer svaret fra Catastro
const CORS_PROXY = "https://corsproxy.io/?";

const proxiedFetch = async (url: string): Promise<Response> => {
  // Prøv direkte først (fungerer fra Node / noen nettlesere)
  try {
    const direct = await fetch(url, { mode: "cors" });
    if (direct.ok) return direct;
  } catch {}
  // Fallback: rut gjennom CORS-proxy
  return fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
};

export class SedecService {
  private static BASE_WFS_URL = "https://ovc.catastro.minhafp.es/ovcservweb/ovcwfs/ServidorWFS.aspx";

  // Offisielle Catastro-endepunkter — bruker HTTPS-varianten
  private static BASE_ALPHANUMERIC_URL =
    "https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPPP";
  private static BASE_ALPHANUMERIC_URL_CODIGOS =
    "https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejeroCodigos.asmx/Consulta_DNPPP_Codigos";

  async getParcelPolygon(refCat: string, fallbackCoords?: [number, number]): Promise<[number, number][] | null> {
    try {
      const parcelId = refCat.replace(/\s/g, "").slice(0, 14);

      const params = new URLSearchParams({
        SERVICE: "WFS",
        VERSION: "1.1.0",
        REQUEST: "GetFeature",
        TYPENAME: "CP:CadastralParcel",
        FEATUREID: `CP.CadastralParcel.${parcelId}`,
        SRSNAME: "EPSG:4326",
      });

      const response = await fetch(`${SedecService.BASE_WFS_URL}?${params.toString()}`);
      if (!response.ok) throw new Error("WFS server error");

      const xmlText = await response.text();
      const coords = this.parseGmlPolygon(xmlText);

      if (coords && coords.length > 0) return coords;
      throw new Error("No coordinates in WFS response");
    } catch (error) {
      console.warn("WFS Polygon fetch failed, using fallback for", refCat, error);
      if (fallbackCoords) {
        const o = 0.0003;
        const [lat, lon] = fallbackCoords;
        return [
          [lat + o, lon - o],
          [lat + o, lon + o],
          [lat - o, lon + o],
          [lat - o, lon - o],
          [lat + o, lon - o],
        ];
      }
      return null;
    }
  }

  async getAlphanumericData(
    provincia: string,
    municipio: string,
    poligono: string,
    parcela: string
  ): Promise<any | null> {
    const params = new URLSearchParams({ Provincia: provincia, Municipio: municipio, Poligono: poligono, Parcela: parcela });
    return this._fetchAndParse(`${SedecService.BASE_ALPHANUMERIC_URL}?${params}`);
  }

  async getAlphanumericDataByCode(
    provinciaCod: string,
    municipioCod: string,
    poligono: string,
    parcela: string
  ): Promise<any | null> {
    const params = new URLSearchParams({
      CodigoProvincia: provinciaCod,
      CodigoMunicipio: municipioCod,
      Poligono: poligono,
      Parcela: parcela,
    });
    return this._fetchAndParse(`${SedecService.BASE_ALPHANUMERIC_URL_CODIGOS}?${params}`);
  }

  private async _fetchAndParse(url: string): Promise<any | null> {
    try {
      const response = await proxiedFetch(url);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const xmlText = await response.text();
      console.log("[Catastro XML]", xmlText.slice(0, 400));

      const data = this.parseAlphanumericXml(xmlText);

      if (!data.cadastralId) throw new Error("Fant ikke Referencia Catastral i svaret.");

      return data;
    } catch (error) {
      console.error("Catastro fetch/parse failed:", error);
      return null;
    }
  }

  private parseAlphanumericXml(xml: string): any {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, "text/xml");

    const result: any = {};

    // Referencia Catastral: pc1 + pc2 (kan ligge direkte under <dt> eller inne i <bico>)
    const allPc1 = xmlDoc.querySelectorAll("pc1");
    const allPc2 = xmlDoc.querySelectorAll("pc2");
    if (allPc1.length > 0 && allPc2.length > 0) {
      result.cadastralId = (allPc1[0].textContent || "") + (allPc2[0].textContent || "");
    }

    // Areal (sfe = superficie en m²)
    const sfeEl = xmlDoc.querySelector("sfe");
    if (sfeEl?.textContent) result.areaSqm = parseInt(sfeEl.textContent.trim(), 10);

    // Bruksklasse
    const lusoEl = xmlDoc.querySelector("luso");
    result.landUse = lusoEl?.textContent?.trim() || "Ukjent";

    // Adresse
    const ldtEl = xmlDoc.querySelector("ldt");
    result.address = ldtEl?.textContent?.trim() || "Ingen adresse";

    // Eier (titular) — kun tilgjengelig hvis API-et returnerer det (datos no protegidos)
    const titEl = xmlDoc.querySelector("tit nif");
    if (titEl) result.ownerNif = titEl.textContent?.trim();

    return result;
  }

  private parseGmlPolygon(xml: string): [number, number][] | null {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xml, "text/xml");

      const posListElements = xmlDoc.getElementsByTagNameNS("*", "posList");
      if (posListElements.length === 0) return null;

      const coordsStr = posListElements[0].textContent || "";
      const values = coordsStr.trim().split(/\s+/).map(Number);

      const coordinates: [number, number][] = [];
      for (let i = 0; i < values.length - 1; i += 2) {
        if (!isNaN(values[i]) && !isNaN(values[i + 1])) {
          coordinates.push([values[i], values[i + 1]]);
        }
      }
      return coordinates.length > 2 ? coordinates : null;
    } catch {
      return null;
    }
  }
}

export const sedecService = new SedecService();
