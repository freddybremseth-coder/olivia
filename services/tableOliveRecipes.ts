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
  const fermentationSaltGrams = processWaterL * 80;
  const marinadeWaterL = oliveKg * 0.75;
  const marinadeSaltGrams = marinadeWaterL * 60;
  const vinegarL = marinadeWaterL * 0.12;
  const herbsGrams = Math.max(oliveKg * 8, 10);
  const citrusOrGarlicGrams = Math.max(oliveKg * 4, 5);
  const readyAfterDays = recipe?.readyAfterDays || 45;
  const marinadeDayFrom = recipe?.marinadeDayFrom || 30;
  const brineChangeDays = recipe?.brineChangeDays?.length ? recipe.brineChangeDays : [3, 7, 14, 21];

  const baseIngredients: Ingredient[] = [
    ingredient('Rå oliven', oliveKg, 'kg'),
    ingredient('Vann til forbehandling og skylling', processWaterL, 'L + ekstra etter behov'),
    ingredient('Godkjent forbehandlings-SOP', 'Følg intern godkjent prosedyre', ''),
    ingredient('Vann til fermenteringslake', processWaterL, 'L'),
    ingredient('Havsalt til 8 % fermenteringslake', fermentationSaltGrams, 'g'),
    ingredient('Vann til sluttlake/marinade', marinadeWaterL, 'L'),
    ingredient('Havsalt til ca. 6 % sluttlake', marinadeSaltGrams, 'g'),
    ingredient('Vineddik / mild eddik', vinegarL, 'L'),
    ingredient('Urter etter profil', herbsGrams, 'g'),
    ingredient('Sitrus eller godkjent smakstilsetning', citrusOrGarlicGrams, 'g'),
  ];

  const customIngredients = (recipe?.ingredients || []).filter(item => item.name && !baseIngredients.some(base => base.name.toLowerCase() === item.name.toLowerCase()));
  const ingredients = [...baseIngredients, ...customIngredients];

  const logs: BatchLog[] = [
    {
      stage: 'PLUKKING',
      startDate,
      notes: `Sorter ${rounded(oliveKg)} kg ${oliveType}. Fjern skadde, myke og angrepne oliven. Vask og klargjør etter hygienerutine.`,
    },
    {
      stage: 'LAKE',
      startDate,
      notes: 'Forbehandling: følg godkjent intern SOP. Registrer start, stopp, ansvarlig person og kontrollpunkt i batchloggen.',
    },
    {
      stage: 'SKYLLING',
      startDate: addDays(startDate, 1),
      notes: 'Skylling og kontroll: dokumenter vannbytter, lukt, visuell kvalitet og at batchen er klar for lake/fermentering.',
    },
    {
      stage: 'LAKE',
      startDate: addDays(startDate, 3),
      notes: `Fermentering/saltlake: planlegg ca. ${rounded(processWaterL)} L lake med ${rounded(fermentationSaltGrams, 0)} g havsalt. Hold oliven under væske og kontroller pH/salt, lukt, farge og overflate. Planlagte kontroller: dag ${brineChangeDays.join(', ')}.`,
    },
    {
      stage: 'MARINERING',
      startDate: addDays(startDate, marinadeDayFrom),
      notes: `Når batchen er godkjent for marinering: planlegg ca. ${rounded(marinadeWaterL)} L sluttlake, ${rounded(marinadeSaltGrams, 0)} g havsalt, ${rounded(vinegarL, 2)} L eddik og smakstilsetning. Juster etter målinger og ønsket profil.`,
    },
    {
      stage: 'LAGRING',
      startDate: addDays(startDate, marinadeDayFrom + 7),
      notes: 'Modning/lagring: kontroller smak, tekstur, pH/syre, salt, lukt, gass og overflate. Hold produktet dekket av lake.',
    },
    {
      stage: 'PAKKING',
      startDate: addDays(startDate, Math.max(readyAfterDays - 2, marinadeDayFrom + 8)),
      notes: 'Pakking: bruk rene beholdere, batchkode, ingrediensliste, nettoinnhold, produksjonsdato og lagringsinformasjon. Ikke pakk for salg før kvalitet er godkjent.',
    },
    {
      stage: 'SALG',
      startDate: addDays(startDate, readyAfterDays),
      notes: 'Klar for salg når smak, tekstur, salt, pH/syre, emballasje, merking og dokumentasjon er kontrollert og godkjent.',
    },
  ];

  const safetyTargets = [
    'Rå oliven må behandles og/eller fermenteres før de er klare som bordoliven.',
    'Forbehandling er et kritisk kontrollpunkt og skal følge godkjent intern SOP.',
    'Fermenteringslake bør følges med pH-/saltmåling og visuell kontroll.',
    'Klar-for-salg må baseres på målinger, sensorikk, hygiene og dokumentasjon, ikke kun kalenderdager.',
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
