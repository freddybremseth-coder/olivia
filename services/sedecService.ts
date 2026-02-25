
export class SedecService {
  private static BASE_WFS_URL = "https://ovc.catastro.minhafp.es/ovcservweb/ovcwfs/ServidorWFS.aspx";

  async getParcelPolygon(refCat: string, fallbackCoords?: [number, number]): Promise<[number, number][] | null> {
    try {
      // For rustikke tomter i Biar er formatet ofte CP.CadastralParcel.03043A00900215
      // Vi klipper ned referansen til de første 14 tegnene som er de geografiske
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
      if (!response.ok) throw new Error("CORS or Server Error");

      const xmlText = await response.text();
      const coords = this.parseGmlPolygon(xmlText);
      
      if (coords && coords.length > 0) return coords;
      throw new Error("No coordinates in XML");
    } catch (error) {
      console.warn("WFS Polygon fetch failed, using fallback circle for", refCat);
      if (fallbackCoords) {
        const [lat, lng] = fallbackCoords;
        const offset = 0.0003; 
        return [
          [lat + offset, lng - offset],
          [lat + offset, lng + offset],
          [lat - offset, lng + offset],
          [lat - offset, lng - offset],
          [lat + offset, lng - offset]
        ];
      }
      return null;
    }
  }

  private parseGmlPolygon(xml: string): [number, number][] | null {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xml, "text/xml");
      
      // Leter etter gml:posList eller gml:coordinates
      const posListElements = xmlDoc.getElementsByTagNameNS("*", "posList");
      if (posListElements.length === 0) return null;
      
      const coordsStr = posListElements[0].textContent || "";
      const values = coordsStr.trim().split(/\s+/).map(Number);
      
      const coordinates: [number, number][] = [];
      for (let i = 0; i < values.length; i += 2) {
        // I WFS fra Catastro er formatet ofte Lat Lon (Y X)
        if (!isNaN(values[i]) && !isNaN(values[i+1])) {
          coordinates.push([values[i], values[i + 1]]);
        }
      }
      return coordinates;
    } catch { return null; }
  }
}

export const sedecService = new SedecService();
