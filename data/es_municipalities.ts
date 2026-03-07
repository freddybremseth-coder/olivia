
export interface Municipality {
  provinceCode: string;
  provinceName: string;
  municipalityCode: string;
  municipalityName: string;
}

export const MUNICIPALITIES: Municipality[] = [
  // Alicante (03)
  { provinceCode: "03", provinceName: "Alicante", municipalityCode: "014", municipalityName: "Alicante/Alacant" },
  { provinceCode: "03", provinceName: "Alicante", municipalityCode: "040", municipalityName: "Biar" },
  { provinceCode: "03", provinceName: "Alicante", municipalityCode: "023", municipalityName: "Beneixama" },
  { provinceCode: "03", provinceName: "Alicante", municipalityCode: "032", municipalityName: "Benidorm" },
  { provinceCode: "03", provinceName: "Alicante", municipalityCode: "063", municipalityName: "Elche/Elx" },
  { provinceCode: "03", provinceName: "Alicante", municipalityCode: "133", municipalityName: "Torrevieja" },
  { provinceCode: "03", provinceName: "Alicante", municipalityCode: "018", municipalityName: "Altea" },
  { provinceCode: "03", provinceName: "Alicante", municipalityCode: "053", municipalityName: "Cocentaina" },


  // Murcia (30)
  { provinceCode: "30", provinceName: "Murcia", municipalityCode: "016", municipalityName: "Cartagena" },
  { provinceCode: "30", provinceName: "Murcia", municipalityCode: "024", municipalityName: "Jumilla" },
  { provinceCode: "30", provinceName: "Murcia", municipalityCode: "025", municipalityName: "Lorca" },
  { provinceCode: "30", provinceName: "Murcia", municipalityCode: "030", municipalityName: "Murcia" },
  { provinceCode: "30", provinceName: "Murcia", municipalityCode: "043", municipalityName: "Yecla" },

  // Valencia (46)
  { provinceCode: "46", provinceName: "Valencia", municipalityCode: "250", municipalityName: "Valencia" },
  { provinceCode: "46", provinceName: "Valencia", municipalityCode: "135", municipalityName: "Gandia" },
  { provinceCode: "46", provinceName: "Valencia", municipalityCode: "220", municipalityName: "Sagunto/Sagunt" },
  { provinceCode: "46", provinceName: "Valencia", municipalityCode: "244", municipalityName: "Torrent" },
  { provinceCode: "46", provinceName: "Valencia", municipalityCode: "186", municipalityName: "Oliva" },

  // Madrid (28)
  { provinceCode: "28", provinceName: "Madrid", municipalityCode: "079", municipalityName: "Madrid" },
  { provinceCode: "28", provinceName: "Madrid", municipalityCode: "005", municipalityName: "Alcalá de Henares" },
  { provinceCode: "28", provinceName: "Madrid", municipalityCode: "049", municipalityName: "Getafe" },
  { provinceCode: "28", provinceName: "Madrid", municipalityCode: "082", municipalityName: "Móstoles" },
  
  // Jaén (23)
  { provinceCode: "23", provinceName: "Jaén", municipalityCode: "050", municipalityName: "Jaén" },
  { provinceCode: "23", provinceName: "Jaén", municipalityCode: "092", municipalityName: "Úbeda" },
  { provinceCode: "23", provinceName: "Jaén", municipalityCode: "055", municipalityName: "Linares" },
  { provinceCode: "23", provinceName: "Jaén", municipalityCode: "005", municipalityName: "Andújar" }
];

// Provins-navn → Catastro/INE-kode (brukes for dynamisk kommunesøk)
export const PROVINCE_CODE_MAP: Record<string, string> = {
  "Álava": "01", "Alava": "01", "Araba": "01",
  "Albacete": "02",
  "Alicante": "03", "Alacant": "03",
  "Almería": "04", "Almeria": "04",
  "Ávila": "05", "Avila": "05",
  "Badajoz": "06",
  "Baleares": "07", "Illes Balears": "07", "Islas Baleares": "07",
  "Barcelona": "08",
  "Burgos": "09",
  "Cáceres": "10", "Caceres": "10",
  "Cádiz": "11", "Cadiz": "11",
  "Castellón": "12", "Castellon": "12", "Castelló": "12",
  "Ciudad Real": "13",
  "Córdoba": "14", "Cordoba": "14",
  "A Coruña": "15", "La Coruña": "15",
  "Cuenca": "16",
  "Girona": "17", "Gerona": "17",
  "Granada": "18",
  "Guadalajara": "19",
  "Gipuzkoa": "20", "Guipúzcoa": "20",
  "Huelva": "21",
  "Huesca": "22",
  "Jaén": "23", "Jaen": "23",
  "León": "24", "Leon": "24",
  "Lleida": "25", "Lérida": "25",
  "La Rioja": "26", "Rioja": "26",
  "Lugo": "27",
  "Madrid": "28",
  "Málaga": "29", "Malaga": "29",
  "Murcia": "30",
  "Navarra": "31", "Nafarroa": "31",
  "Ourense": "32", "Orense": "32",
  "Asturias": "33",
  "Palencia": "34",
  "Las Palmas": "35",
  "Pontevedra": "36",
  "Salamanca": "37",
  "Santa Cruz de Tenerife": "38", "Tenerife": "38",
  "Cantabria": "39",
  "Segovia": "40",
  "Sevilla": "41",
  "Soria": "42",
  "Tarragona": "43",
  "Teruel": "44",
  "Toledo": "45",
  "Valencia": "46", "València": "46",
  "Valladolid": "47",
  "Bizkaia": "48", "Vizcaya": "48",
  "Zamora": "49",
  "Zaragoza": "50",
  "Ceuta": "51",
  "Melilla": "52",
};

// Create a unique list of provinces for the dropdown
export const PROVINCES =[...new Map(MUNICIPALITIES.map(item => [item.provinceName, item])).values()]
    .map(p => ({ code: p.provinceCode, name: p.provinceName }))
    .sort((a,b) => a.name.localeCompare(b.name));