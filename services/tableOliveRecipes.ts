import type { BatchLog, Ingredient, Recipe } from '../types';

export interface BalancedTableOlivePlan {
  ingredients: Ingredient[];
  logs: BatchLog[];
  readyAfterDays: number;
  brineChangeDays: number[];
  marinadeDayFrom: number;
  notes: string;
  safetyTargets: string[];
}

export interface TableOlivePlanOptions {
  oliveKg: number;
  recipe?: Partial<Recipe>;
  startDate: string;
  oliveType?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T12:00:00`);
  date.setTime(date.getTime() + days * DAY_MS);
  return date.toISOString().slice(0, 10);
}

function rounded(value: number, decimals = 1): string {
  const factor = 10 ** decimals;
  return (Math.round(value * factor) / factor).toLocaleString('no-NO');
}

function ingredient(name: string, amount: number | string, unit: string): Ingredient {
  return { name, amount: typeof amount === 'number' ? rounded(amount) : amount, unit };
}

function notesFromRecipe(recipe?: Partial<Recipe>) {
  return recipe?.notes?.trim() ? `${recipe.notes.trim()}\n\n` : '';
}

export function buildBalancedTableOlivePlan(options: TableOlivePlanOptions): BalancedTableOlivePlan {
  const oliveKg = Math.max(0, Number(options.oliveKg || 0));
  const recipe = options.recipe;
  const startDate = options.startDate;
  const oliveType = options.oliveType || recipe?.recommendedOliveTypes?.[0] || 'bordoliven';

  const processWaterL = oliveKg * 1.2;
  const fermentationBrinePercent = 8;
  const fermentationSaltGrams = processWaterL * 80;
  const marinadeWaterL = oliveKg * 0.75;
  const marinadeSaltGrams = marinadeWaterL * 60;
  const vinegarL = marinadeWaterL * 0.12;
  const herbsGrams = Math.max(oliveKg * 8, 10);
  const garlicOrCitrusGrams = Math.max(oliveKg * 4, 5);
  const readyAfterDays = recipe?.readyAfterDays || 45;
  const marinadeDayFrom = recipe?.marinadeDayFrom || 30;
  const brineChangeDays = recipe?.brineChangeDays?.length ? recipe.brineChangeDays : [3, 7, 14, 21];

  const baseIngredients: Ingredient[] = [
    ingredient('Rå oliven', oliveKg, 'kg'),
    ingredient('Vann til forbehandling/skylling', processWaterL, 'L + ekstra etter behov'),
    ingredient('Lutbehandling', 'Bruk kun godkjent SOP/fagoppskrift', ''),
    ingredient('Vann til fermenteringslake', processWaterL, 'L'),
    ingredient('Havsalt til 8 % fermenteringslake', fermentationSaltGrams, 'g'),
    ingredient('Vann til sluttlake/marinade', marinadeWaterL, 'L'),
    ingredient('Havsalt til ca. 6 % sluttlake', marinadeSaltGrams, 'g'),
    ingredient('Vineddik / mild eddik', vinegarL, 'L'),
    ingredient('Urter etter profil', herbsGrams, 'g'),
    ingredient('Hvitløk eller sitrus etter profil', garlicOrCitrusGrams, 'g'),
  ];

  const customIngredients = (recipe?.ingredients || []).filter(item => item.name && !baseIngredients.some(base => base.name.toLowerCase() === item.name.toLowerCase()));
  const ingredients = [...baseIngredients, ...customIngredients];

  const logs: BatchLog[] = [
    {
      stage: 'PLUKKING',
      startDate,
      notes: `Sorter ${rounded(oliveKg)} kg ${oliveType}. Fjern skadde, myke og angrepne oliven. Vask godt før behandling.`,
    },
    {
      stage: 'LAKE',
      startDate,
      notes: 'Forbehandling/lut: utføres kun etter godkjent intern SOP eller faglig verifisert oppskrift. Registrer faktisk starttid, sluttid, kontrollpunkt og skylling i batchloggen. Oliven skal være helt dekket og behandlingen stoppes etter kontroll, ikke bare etter klokke.',
    },
    {
      stage: 'SKYLLING',
      startDate: addDays(startDate, 1),
      notes: 'Skylling: bytt vann flere ganger til forbehandlingen er fjernet og oliven er klare for lake. Dokumenter antall vannbytter og kontroll før fermentering.',
    },
    {
      stage: 'LAKE',
      startDate: addDays(startDate, 3),
      notes: `Fermentering/saltlake: legg oliven i ca. ${rounded(processWaterL)} L ${fermentationBrinePercent} % lake (${rounded(fermentationSaltGrams, 0)} g salt). Hold oliven under væske. Følg lukt, farge, pH og salt. Planlagte kontroller/lakebytter: dag ${brineChangeDays.join(', ')}.`,
    },
    {
      stage: 'MARINERING',
      startDate: addDays(startDate, marinadeDayFrom),
      notes: `Når bitterhet og fermentering er under kontroll: flytt til sluttlake/marinade. Plan: ${rounded(marinadeWaterL)} L vann, ${rounded(marinadeSaltGrams, 0)} g salt, ${rounded(vinegarL, 2)} L eddik, urter og smakstilsetning. Juster etter faktisk pH/salt og ønsket smak.`,
    },
    {
      stage: 'LAGRING',
      startDate: addDays(startDate, marinadeDayFrom + 7),
      notes: 'Modning/lagring: kontroller smak, salt, pH, lukt, gass og overflate. Hold produktet dekket av lake. Juster salt/syre etter måling, ikke bare smak.',
    },
    {
      stage: 'PAKKING',
      startDate: addDays(startDate, Math.max(readyAfterDays - 2, marinadeDayFrom + 8)),
      notes: 'Pakking: bruk rene glass/poser, batchkode, ingrediensliste, nettoinnhold, produksjonsdato og holdbarhets-/lagringsinformasjon. Ikke pakk for salg før kvalitet og matsikkerhet er godkjent.',
    },
    {
      stage: 'SALG',
      startDate: addDays(startDate, readyAfterDays),
      notes: 'Klar for salg hvis smak, tekstur, salt, pH/syre, lukt, emballasje og merking er kontrollert og dokumentert. Ved kommersielt salg bør prosessen kvalitetssikres etter lokale næringsmiddelkrav.',
    },
  ];

  const safetyTargets = [
    'Rå oliven må behandles/fermenteres før de er spiselige; målet er å redusere bitterstoffer og stabilisere produktet.',
    'Lut/forbehandling er et kontrollpunkt og skal følge en godkjent SOP, ikke genereres fritt av appen.',
    'Fermenteringslake planlegges rundt 8 % salt og bør følges med pH/saltmåling.',
    'Produkt for salg må ikke baseres kun på kalender. Bruk målinger, sensorikk og hygienekontroll før pakking/salg.',
  ];

  const notes = `${notesFromRecipe(recipe)}Automatisk balansert plan for ${rounded(oliveKg)} kg ${oliveType}. Mengdene skaleres med batchvekten. Planen er et produksjonsverktøy og må kvalitetssikres med faktiske pH-/saltmålinger, lokal hygienepraksis og gjeldende næringsmiddelkrav før salg.\n\nSikkerhetsmål:\n- ${safetyTargets.join('\n- ')}`;

  return { ingredients, logs, readyAfterDays, brineChangeDays, marinadeDayFrom, notes, safetyTargets };
}

export function buildDefaultTableOliveRecipe(): Recipe {
  const plan = buildBalancedTableOlivePlan({ oliveKg: 100, startDate: new Date().toISOString().slice(0, 10), oliveType: 'Gordal / Changlot Real' });
  return {
    id: `R${Date.now()}`,
    name: 'Doña Anna klassisk bordoliven – lake og mild middelhavsmarinade',
    flavorProfile: 'middelhav',
    description: 'Skalerbar basisoppskrift for grønne bordoliven. Brukes som utgangspunkt når en ny batch settes, og balanseres automatisk etter kg oliven.',
    recommendedOliveTypes: ['Gordal', 'Changlot Real', 'Genoesa'],
    ingredients: plan.ingredients,
    brineChangeDays: plan.brineChangeDays,
    marinadeDayFrom: plan.marinadeDayFrom,
    readyAfterDays: plan.readyAfterDays,
    rating: 4,
    notes: plan.notes,
    isAiGenerated: false,
    isQualityAssured: false,
  };
}
