
export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const MULTI_GLOSSARY: Record<string, Record<string, string>> = {
  en: {
    "olive fly": "Bactrocera oleae. A serious pest that lays eggs in olives, leading to rot and poor oil quality.",
    "polyphenols": "Natural antioxidants in olive oil that provide health benefits and a peppery taste.",
    "evoo": "Extra Virgin Olive Oil. The highest quality olive oil, extracted purely by mechanical means.",
    "picual": "A common Spanish olive variety known for high stability and bitterness.",
    "et0": "Reference Evapotranspiration. The amount of water lost by soil and plants, crucial for irrigation planning."
  },
  es: {
    "mosca del olivo": "Bactrocera oleae. Una plaga destructiva que pone huevos en el fruto, causando podredumbre.",
    "polifenoles": "Antioxidantes naturales que dan estabilidad al aceite y beneficios para la salud.",
    "aove": "Aceite de Oliva Virgen Extra. La máxima categoría de aceite de oliva.",
    "picual": "Variedad de aceituna muy común en España, rica en ácido oleico.",
    "et0": "Evapotranspiración de referencia. Medida clave para calcular el riego necesario."
  },
  it: {
    "mosca dell'olivo": "Bactrocera oleae. Il principale parassita dell'olivo che compromette la qualità dell'olio.",
    "polifenoli": "Antiossidanti naturali che conferiscono longevità all'olio e il tipico sapore piccante.",
    "olio evo": "Olio Extra Vergine di Oliva. La categoria merceologica superiore ottenuta solo con processi meccanici.",
    "frantoio": "Una delle varietà di olivo più pregiate in Italia, tipica della Toscana.",
    "et0": "Evapotraspirazione di riferimento. Fondamentale per il bilancio idrico del terreno."
  },
  fr: {
    "mouche de l'olive": "Bactrocera oleae. Ravageur majeur dont la larve se développe dans la pulpe du fruit.",
    "polyphénols": "Antioxydants naturels présents dans l'huile d'olive, bénéfiques pour la santé.",
    "hove": "Huile d'Olive Vierge Extra. La plus haute qualité d'huile d'olive.",
    "arbequina": "Variété d'olive produisant une huile douce et fruitée.",
    "et0": "Évapotranspiration de référence. Cruciale pour piloter l'irrigation avec précision."
  },
  no: {
    "olivenflue": "Bactrocera oleae. Et skadedyr som legger egg i oliven og reduserer oljekvaliteten.",
    "polyfenoler": "Naturlige antioksidanter som gir oljen holdbarhet og helsefordeler.",
    "evoo": "Extra Virgin Olive Oil. Olje av høyeste kvalitet, presset mekanisk.",
    "picual": "Spansk olivensort kjent for stabilitet og bitterhet.",
    "et0": "Referansefordamping. Viktig for å beregne nøyaktig vannbehov."
  }
};

export const highlightGlossaryTerms = (text: string, lang: string = 'en') => {
  if (!text) return [{ text, isTerm: false }];
  
  const currentLangGlossary = MULTI_GLOSSARY[lang] || MULTI_GLOSSARY['en'];
  const terms = Object.keys(currentLangGlossary).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`\\b(${terms.join('|')})\\b`, 'gi');
  
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, match.index),
        isTerm: false
      });
    }
    
    parts.push({
      text: match[0],
      isTerm: true,
      definition: currentLangGlossary[match[0].toLowerCase()]
    });
    
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      isTerm: false
    });
  }

  return parts;
};
