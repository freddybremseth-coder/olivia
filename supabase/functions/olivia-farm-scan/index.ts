import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function requiredEnv(...names: string[]) {
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value) return value;
  }
  throw new Error("Missing AI secret: " + names.join(" or "));
}

function extractJson(text: string) {
  const clean = String(text || "").trim()
    .replace(/^\x60\x60\x60json\s*/i, "")
    .replace(/\x60\x60\x60$/i, "")
    .trim();
  try { return JSON.parse(clean); } catch {}
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI returned no JSON object");
  return JSON.parse(match[0]);
}

const schemaPrompt = [
"Du analyserer bevismateriale for Doña Anna, en økologisk olivengård i Biar, Alicante.",
"Målet er å bygge gårdens driftsjournal som FASIT. Du må skille strengt mellom det dokumentet faktisk beviser og det som bare er planlagt/anbefalt.",
"",
"Returner KUN gyldig JSON:",
"{",
'  "documentKind": "invoice|receipt|quote|proforma|agronomy_plan|message|photo|lab|rain_record|work_order|other",',
'  "evidenceStatus": "completed|planned|recommended|ordered|purchased|observed|unknown",',
'  "documentDate": "YYYY-MM-DD eller null",',
'  "sourceName": "leverandør/person/avsender eller tom streng",',
'  "title": "kort norsk tittel",',
'  "summary": "presis norsk oppsummering av hva kilden faktisk dokumenterer",',
'  "confidence": 0.0,',
'  "events": [{',
'    "eventType": "spraying|pruning|cultivation|desuckering|young_tree_care|planting|fertilization|irrigation|rain|inspection|maintenance|harvest|purchase|soil_work|pest_control|disease_control|training|other",',
'    "eventStatus": "completed|planned|recommended|ordered|purchased|observed",',
'    "title": "kort hendelsestittel",',
'    "description": "hva som faktisk står i kilden",',
'    "occurredOn": "YYYY-MM-DD eller null",',
'    "plannedFor": "YYYY-MM-DD eller null",',
'    "periodLabel": "f.eks. finales agosto / mitad septiembre / ukjent dato",',
'    "datePrecision": "exact|month|window|invoice_date_only|unknown",',
'    "parcelHint": "kun hvis parsell eksplisitt står i kilden, ellers tom streng",',
'    "sourceRef": "linje/artikkel/punkt i dokumentet",',
'    "vendor": "leverandør/utfører",',
'    "amount": 0,',
'    "currency": "EUR",',
'    "treeCountDelta": null,',
'    "recurrenceCandidate": false,',
'    "recurrenceReason": "hvorfor dette kan være relevant i neste årshjul",',
'    "products": [{"name":"","composition":"","purpose":"","dose":"","quantity":null,"unit":"","organicNote":""}],',
'    "confidence": 0.0',
'  }],',
'  "products": [{"name":"","composition":"","purpose":"","dose":"","organicNote":""}],',
'  "facts": [{',
'    "knowledgeKey": "kort stabil nøkkel, f.eks. well.parcel190.depth.measured_2016",',
'    "subjectType": "farm|parcel|well|product|supplier|operation|other",',
'    "category": "f.eks. water, planting_plan, supplier, infrastructure, payment, agronomy",',
'    "statement": "presis setning som kilden faktisk støtter",',
'    "value": {},',
'    "confidence": 0.0,',
'    "requiresConfirmation": false,',
'    "question": "spørsmål hvis faktum må avklares, ellers tom streng"',
'  }],',
'  "questions": [{"question":"","reason":"","priority":"low|medium|high|critical","relatedKnowledgeKey":""}],',
'  "warnings": ["usikkerhet eller konflikt som må kontrolleres av bruker"]',
"}",
"",
"ABSOLUTTE REGLER:",
"- Ikke gjør en proforma, et tilbud eller et produktkjøp om til utført behandling. Det beviser bestilling/innkjøp, ikke bruk.",
"- En agronomplan/behandlingsplan er ANBEFALT eller PLANLAGT, ikke utført.",
"- En faktura for arbeid kan dokumentere utført arbeid. Hvis en linje har eksplisitt arbeidsdato, bruk den som occurredOn med datePrecision exact.",
"- Hvis en arbeidslinje mangler arbeidsdato, IKKE bruk fakturadato som faktisk arbeidsdato. Sett occurredOn null, periodLabel til at datoen er ukjent/fakturert på dokumentdato og datePrecision invoice_date_only.",
"- En faktura for varer dokumenterer kjøp/belastning, ikke at varen er brukt.",
"- En melding kan være anbefaling, plan eller bekreftelse av utført arbeid. Bruk bare completed når formuleringen eksplisitt sier at arbeidet er gjort.",
"- Et bilde dokumenterer OBSERVERT tilstand på bildet. Ikke gjett sykdom, sort, parsell eller utført arbeid ut fra et generelt bilde.",
"- Ikke gjett parsell. Bruk farm scope hvis parsell ikke eksplisitt kan identifiseres.",
"- Ikke gjett treantall. treeCountDelta brukes bare når kilden eksplisitt sier hvor mange trær som er plantet/fjernet/døde.",
"- recurrenceCandidate kan være true for tilbakevendende drift som sprøyting, beskjæring, jordarbeid, gjødsling, vanningskontroll, skuddfjerning og unge-trær-arbeid. Det betyr bare vurder samme periode neste år, ikke automatisk utførelse.",
"- For produkter: skill navn, sammensetning/aktivt stoff, formål/bruksområde og dose når det står. Ikke konkluder økologisk godkjent bare fordi gården er økologisk; skriv kun organicNote når dokumentet faktisk støtter det.",
"- facts brukes til varig kunnskap som brønndata, vannrett, tre-/plantingsforslag, dokumentert sort, leverandørreferanse, betaling eller andre stabile opplysninger. Ikke dupliser hele hendelseslisten som facts.",
"- Hvis to kilder kan være i konflikt (f.eks. to ulike brønndybder), behold begge som separate facts med kildepresis statement. Sett requiresConfirmation=true og lag et konkret spørsmål. Ikke velg den ene som riktig.",
"- Hvis et kart eller bilde inneholder tekst/antall, bevar kildens skrivemåte. Ikke rett sortsnavn eller stedsnavn uten bekreftelse.",
"- questions skal være korte konkrete spørsmål en gårdseier kan svare på. Still spørsmål når parsell, dato, sortsnavn, betalingsavvik, faktisk utførelse eller betydningen av et tall er usikker.",
"- confidence er 0-1."
].join("\n");

async function callGemini(fileB64: string | null, mimeType: string | null, textInput: string | null) {
  const key = requiredEnv("FAMILYHUB_GEMINI_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY");
  const parts: any[] = [];
  if (fileB64 && mimeType) parts.push({ inlineData: { mimeType, data: fileB64 } });
  if (textInput) parts.push({ text: "KILDETEKST:\n" + textInput });
  parts.push({ text: schemaPrompt });

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(key),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { responseMimeType: "application/json", temperature: 0 },
      }),
    },
  );
  const body = await res.text();
  if (!res.ok) throw new Error("Gemini " + res.status + ": " + body.slice(0, 500));
  const data = JSON.parse(body);
  const out = data?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("\n") || "";
  return extractJson(out);
}

async function callClaude(fileB64: string | null, mimeType: string | null, textInput: string | null) {
  const key = requiredEnv("FAMILYHUB_CLAUDE_API_KEY", "ANTHROPIC_API_KEY", "CLAUDE_API_KEY");
  const content: any[] = [];
  if (fileB64 && mimeType === "application/pdf") {
    content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: fileB64 } });
  } else if (fileB64 && mimeType?.startsWith("image/")) {
    content.push({ type: "image", source: { type: "base64", media_type: mimeType, data: fileB64 } });
  }
  if (textInput) content.push({ type: "text", text: "KILDETEKST:\n" + textInput });
  content.push({ type: "text", text: schemaPrompt });

  const models = ["claude-sonnet-4-5-20250929", "claude-3-5-haiku-20241022", "claude-3-haiku-20240307"];
  let last = "";
  for (const model of models) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens: 6000, temperature: 0, messages: [{ role: "user", content }] }),
    });
    const body = await res.text();
    if (res.ok) {
      const data = JSON.parse(body);
      const out = Array.isArray(data?.content) ? data.content.map((p:any)=>p.text||"").join("\n") : "";
      return extractJson(out);
    }
    last = "Claude " + model + " " + res.status + ": " + body.slice(0, 500);
    if (res.status !== 404) break;
  }
  throw new Error(last || "Claude failed");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const fileB64 = body?.file ? String(body.file) : null;
    const mimeType = body?.mimeType ? String(body.mimeType) : null;
    const textInput = body?.text ? String(body.text).slice(0, 60000) : null;

    if (!fileB64 && !textInput) throw new Error("Missing file or text");
    if (mimeType?.startsWith("video/")) {
      return new Response(JSON.stringify({
        error: "Video can be stored as evidence, but automatic video interpretation is not enabled in this scanner.",
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const errors: string[] = [];
    try {
      const result = await callGemini(fileB64, mimeType, textInput);
      return new Response(JSON.stringify({ provider: "gemini", result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }

    try {
      const result = await callClaude(fileB64, mimeType, textInput);
      return new Response(JSON.stringify({ provider: "claude", result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }

    return new Response(JSON.stringify({ error: "AI scan failed", details: errors }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
