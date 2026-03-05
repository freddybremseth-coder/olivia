
export class SedecService {
  private static BASE_WFS_URL = "https://ovc.catastro.minhafp.es/ovcservweb/ovcwfs/ServidorWFS.aspx";
  // Korrekt, offisielt endepunkt for alfanumerisk data (datos no protegidos)
  private static BASE_ALPHANUMERIC_URL = "http://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPPP";
  // Mer robust endepunkt som bruker INE-koder i stedet for tekstnavn
  private static BASE_ALPHANUMERIC_URL_CODIGOS = "http://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejeroCodigos.asmx/Consulta_DNPPP_Codigos";

  async getParcelPolygon(refCat: string, fallbackCoords?: [number, number]): Promise<[number, number][] | null> {
    try {
      const parcelId = refCat.slice(0, 14);
      
      const params = new URLSearchParams({
        SERVICE: "WFS",
        VERSION: "1.1.0",
        REQUEST: "GetFeature",
        TYPENAME: "CP:CadastralParcel",
        FEATUREID: `CP.CadastralParcel.${parcelId}`,
        SRSNAME: "EPSG:4326"
      });

      const response = await fetch(`${SedecService.BASE_WFS_URL}?${params.toString()}`);
      if (!response.ok) throw new Error("CORS or Server Error fetching polygon");

      const xmlText = await response.text();
      const coords = this.parseGmlPolygon(xmlText);
      
      if (coords && coords.length > 0) return coords;
      throw new Error("No coordinates in XML");
    } catch (error) {
      console.warn("WFS Polygon fetch failed, using fallback circle for", refCat, error);
      if (fallbackCoords) {
        const offset = 0.0003; 
        return [
          [fallbackCoords[0] + offset, fallbackCoords[1] - offset],
          [fallbackCoords[0] + offset, fallbackCoords[1] + offset],
          [fallbackCoords[0] - offset, fallbackCoords[1] + offset],
          [fallbackCoords[0] - offset, fallbackCoords[1] - offset],
          [fallbackCoords[0] + offset, fallbackCoords[1] - offset]
        ];
      }
      return null;
    }
  }

  // Oppdatert metode for å hente alfanumeriske data via det offisielle API-et
  async getAlphanumericData(provincia: string, municipio: string, poligono: string, parcela: string): Promise<any | null> {
    try {
      const params = new URLSearchParams({
        Provincia: provincia,
        Municipio: municipio,
        Poligono: poligono,
        Parcela: parcela
      });
      
      // Catastro API returnerer XML og kan ha CORS-problemer. En proxy kan være nødvendig i produksjon.
      const response = await fetch(`${SedecService.BASE_ALPHANUMERIC_URL}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const xmlText = await response.text();
      const data = this.parseAlphanumericXml(xmlText);
      
      if (!data.cadastralId) {
        throw new Error("Could not parse Cadastral ID from the response.");
      }
      
      return data;
    } catch (error) {
      console.error("Failed to fetch or parse alphanumeric data:", error);
      return null;
    }
  }

  /**
   * Henter alfanumeriske data (datos no protegidos) fra Catastro basert på provins- og kommune-koder (INE).
   * Dette er en mer robust metode enn å bruke tekstnavn for å unngå feil med staving og formatering.
   * @param provinciaCod INE-koden for provinsen (f.eks. "03" for Alicante).
   * @param municipioCod INE-koden for kommunen (f.eks. "014" for Altea).
   * @param poligono Polygonnummer.
   * @param parcela Parsellnummer.
   * @returns Et objekt med matrikkeldata, eller null ved feil.
   */
  async getAlphanumericDataByCode(provinciaCod: string, municipioCod: string, poligono: string, parcela: string): Promise<any | null> {
    try {
      const params = new URLSearchParams({
        CodigoProvincia: provinciaCod,
        CodigoMunicipio: municipioCod,
        Poligono: poligono,
        Parcela: parcela
      });
      
      const response = await fetch(`${SedecService.BASE_ALPHANUMERIC_URL_CODIGOS}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const xmlText = await response.text();
      const data = this.parseAlphanumericXml(xmlText);
      
      if (!data.cadastralId) {
        throw new Error("Could not parse Cadastral ID from the response.");
      }
      
      return data;
    } catch (error) {
      console.error("Failed to fetch or parse alphanumeric data by code:", error);
      return null;
    }
  }

  private parseAlphanumericXml(xml: string): any {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, "text/xml");
    
    // Finner rot-elementet for eiendomsdata
    const bi = xmlDoc.querySelector("bico > bi");
    const dt = xmlDoc.querySelector("dt");
    const loct = xmlDoc.querySelector("loct");

    if (!bi && !dt) {
      console.warn("No 'bi' or 'dt' element found in XML response for alphanumeric data.");
      return {};
    }

    const result: any = {};
    
    // Hent Referencia Catastral (20 siffer)
    const pc1 = dt?.querySelector("pc > pc1")?.textContent || "";
    const pc2 = dt?.querySelector("pc > pc2")?.textContent || "";
    result.cadastralId = `${pc1}${pc2}`;

    // Hent areal
    const superficie = bi?.querySelector("dt > debi > sfe")?.textContent;
    if (superficie) {
      result.areaSqm = parseInt(superficie, 10);
    }
    
    // Hent bruksklasse (Rústico/Urbano) og hovedbruk
    result.landUse = bi?.querySelector("dt > debi > luso")?.textContent || "Ukjent";
    
    // Hent lokasjon/adresse hvis tilgjengelig
    result.address = loct?.querySelector("ldt")?.textContent || "Ingen adresse funnet";

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
      for (let i = 0; i < values.length; i += 2) {
        if (!isNaN(values[i]) && !isNaN(values[i+1])) {
          coordinates.push([values[i], values[i + 1]]);
        }
      }
      return coordinates;
    } catch { return null; }
  }
}

export const sedecService = new SedecService();
