import { supabase } from './supabaseClient';
import type { ExpenseCategory } from './oliviaSchemaData';

export type ExpenseScanResult = {
  vendor: string;
  date: string;
  totalAmount: number;
  currency: 'EUR' | 'NOK' | 'USD' | string;
  category: ExpenseCategory;
  description: string;
  invoiceNumber?: string;
  taxAmount?: number;
  netAmount?: number;
  paymentMethod?: string;
  workerName?: string;
  workHours?: number;
  unitRate?: number;
  scope?: 'farm' | 'parcel';
  items?: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
    amount?: number;
  }>;
  confidence?: number;
  note?: string;
};

export type ExpenseDraft = ExpenseScanResult & {
  parcelId?: string;
  season: string;
};

const EXPENSE_PROMPT = `Analyser dette bilaget for Doña Anna olivengård i Biar, Alicante.
Det kan være kvittering, leverandørfaktura eller faktura for arbeid/tjenester.

Returner KUN gyldig JSON med feltene:
{
  "vendor": "leverandør/person",
  "date": "YYYY-MM-DD",
  "totalAmount": 0,
  "currency": "EUR",
  "category": "innhøsting|beskjæring|nye_planter|trefelling|sprøyting|vann|gjødsel|forsikring|vedlikehold|administrasjon|transport|emballasje|annet",
  "description": "kort norsk beskrivelse",
  "invoiceNumber": "",
  "taxAmount": 0,
  "netAmount": 0,
  "paymentMethod": "",
  "workerName": "",
  "workHours": 0,
  "unitRate": 0,
  "scope": "farm",
  "items": [{"name":"","quantity":1,"unit":"","unitPrice":0,"amount":0}],
  "confidence": 0.0,
  "note": ""
}

Regler:
- totalAmount skal være beløpet som faktisk skal betales, normalt inklusive IVA/MVA.
- Bruk EUR som standard hvis valuta ikke er tydelig og dokumentet er fra Spania.
- Hvis dette er arbeid/tjeneste, hent navn på arbeider/leverandør, timer/dager og sats når det står på dokumentet.
- Kategoriser etter gårdsdrift, ikke privat husholdning.
- Ikke gjett fakturanummer, IVA eller timer hvis det ikke står der; bruk tom streng eller 0.
- Hvis én bestemt parsell ikke kan identifiseres, bruk scope "farm".
- confidence skal være 0-1.
`;

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function extractJson(text: string): any {
  const clean = text.trim().replace(/^\`\`\`json\s*/i, '').replace(/\`\`\`$/i, '').trim();
  const match = clean.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : clean);
}

function normalizeCategory(value: string): ExpenseCategory {
  const allowed: ExpenseCategory[] = ['innhøsting','beskjæring','nye_planter','trefelling','sprøyting','vann','gjødsel','forsikring','vedlikehold','administrasjon','transport','emballasje','annet'];
  const exact = allowed.find(item => item === value);
  if (exact) return exact;
  const raw = String(value || '').toLowerCase();
  if (raw.includes('høst')) return 'innhøsting';
  if (raw.includes('beskj')) return 'beskjæring';
  if (raw.includes('plant')) return 'nye_planter';
  if (raw.includes('felling') || raw.includes('rydd')) return 'trefelling';
  if (raw.includes('sprøy')) return 'sprøyting';
  if (raw.includes('vann') || raw.includes('irrig')) return 'vann';
  if (raw.includes('gjød') || raw.includes('fertil')) return 'gjødsel';
  if (raw.includes('forsik')) return 'forsikring';
  if (raw.includes('transport') || raw.includes('diesel') || raw.includes('fuel')) return 'transport';
  if (raw.includes('emball') || raw.includes('flask') || raw.includes('etikett')) return 'emballasje';
  if (raw.includes('vedlike') || raw.includes('repar') || raw.includes('maskin')) return 'vedlikehold';
  if (raw.includes('admin') || raw.includes('regnskap') || raw.includes('gestor')) return 'administrasjon';
  return 'annet';
}

function normalizeExpenseScan(raw: any): ExpenseScanResult {
  const total = Number(raw.totalAmount ?? raw.amount ?? 0);
  return {
    vendor: String(raw.vendor || raw.supplier || 'Ukjent leverandør'),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.date || '')) ? String(raw.date) : new Date().toISOString().slice(0, 10),
    totalAmount: Number.isFinite(total) ? total : 0,
    currency: String(raw.currency || 'EUR').toUpperCase(),
    category: normalizeCategory(raw.category),
    description: String(raw.description || raw.note || raw.vendor || 'Gårdskostnad'),
    invoiceNumber: raw.invoiceNumber ? String(raw.invoiceNumber) : '',
    taxAmount: Number(raw.taxAmount || 0),
    netAmount: Number(raw.netAmount || 0),
    paymentMethod: raw.paymentMethod ? String(raw.paymentMethod) : '',
    workerName: raw.workerName ? String(raw.workerName) : '',
    workHours: Number(raw.workHours || 0),
    unitRate: Number(raw.unitRate || 0),
    scope: raw.scope === 'parcel' ? 'parcel' : 'farm',
    items: Array.isArray(raw.items) ? raw.items : [],
    confidence: Number(raw.confidence || 0),
    note: raw.note ? String(raw.note) : '',
  };
}

function aiErrorMessage(payload: any, status: number, provider: string): string {
  const message =
    payload?.error?.message ||
    (typeof payload?.error === 'string' ? payload.error : '') ||
    payload?.message ||
    '';
  return message ? `${provider}: ${message}` : `${provider}: HTTP ${status}`;
}

async function analyzeWithGemini(b64: string, mimeType: string): Promise<any> {
  const response = await fetch('/api/ai/gemini/v1beta/models/gemini-2.5-flash:generateContent', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      contents: [{
        parts: [
          { inlineData: { mimeType, data: b64 } },
          { text: EXPENSE_PROMPT },
        ],
      }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(aiErrorMessage(payload, response.status, 'Gemini'));
  const text = payload?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('\n');
  if (!text) throw new Error('Gemini: tom respons.');
  return extractJson(text);
}

async function analyzeWithClaude(b64: string, mimeType: string): Promise<any> {
  const content = mimeType === 'application/pdf'
    ? [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } },
        { type: 'text', text: EXPENSE_PROMPT + '\n\nSvar KUN med gyldig JSON.' },
      ]
    : [
        { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: b64 } },
        { type: 'text', text: EXPENSE_PROMPT + '\n\nSvar KUN med gyldig JSON.' },
      ];

  const response = await fetch('/api/ai/anthropic/v1/messages', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2500,
      temperature: 0,
      messages: [{ role: 'user', content }],
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(aiErrorMessage(payload, response.status, 'Claude'));
  const text = Array.isArray(payload?.content) ? payload.content.map((part: any) => part.text || '').join('\n') : '';
  if (!text) throw new Error('Claude: tom respons.');
  return extractJson(text);
}

async function analyzeWithOpenAI(b64: string, mimeType: string): Promise<any> {
  if (mimeType === 'application/pdf') throw new Error('OpenAI: PDF brukes ikke i denne fallback-ruten.');
  const response = await fetch('/api/ai/openai/v1/chat/completions', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 2500,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${b64}` } },
          { type: 'text', text: EXPENSE_PROMPT + '\n\nSvar KUN med gyldig JSON.' },
        ],
      }],
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(aiErrorMessage(payload, response.status, 'OpenAI'));
  const text = payload?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('OpenAI: tom respons.');
  return extractJson(text);
}

export async function analyzeExpenseDocument(file: File): Promise<ExpenseScanResult> {
  const b64 = await fileToBase64(file);
  const mimeType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
  const errors: string[] = [];

  try {
    const { data, error } = await supabase.functions.invoke('olivia-expense-scan', {
      body: { file: b64, mimeType },
    });
    if (error) throw new Error(error.message || 'Supabase AI scan feilet.');
    if (data?.result) {
      const normalized = normalizeExpenseScan(data.result);
      if (normalized.totalAmount > 0 || normalized.vendor !== 'Ukjent leverandør') return normalized;
      errors.push('Supabase AI svarte, men fant ingen brukbare bilagsdata.');
    } else if (data?.error) {
      errors.push(`Supabase AI: ${data.error}${Array.isArray(data.details) ? ' · ' + data.details.join(' | ') : ''}`);
    }
  } catch (error) {
    errors.push(`Supabase AI: ${error instanceof Error ? error.message : String(error)}`);
  }

  for (const attempt of [
    () => analyzeWithGemini(b64, mimeType),
    () => analyzeWithClaude(b64, mimeType),
    ...(mimeType === 'application/pdf' ? [] : [() => analyzeWithOpenAI(b64, mimeType)]),
  ]) {
    try {
      const raw = await attempt();
      const normalized = normalizeExpenseScan(raw);
      if (normalized.totalAmount > 0 || normalized.vendor !== 'Ukjent leverandør') return normalized;
      errors.push('AI svarte, men fant ingen brukbare bilagsdata.');
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  let health = '';
  try {
    const healthRes = await fetch('/api/ai/health?probe=1', { headers: await authHeaders() });
    if (healthRes.ok) {
      const status = await healthRes.json();
      const fmt = (name: string, item: any) =>
        `${name}: ${item?.configured ? (item?.ok ? 'OK' : `feil${item?.status ? ` ${item.status}` : ''}`) : 'ikke konfigurert'}`;
      health = ' AI-status: ' + [
        fmt('Gemini', status?.gemini),
        fmt('Claude', status?.anthropic),
        fmt('OpenAI', status?.openai),
      ].join(' · ');
    }
  } catch {
    // Keep the original provider errors if the health endpoint is unavailable.
  }

  throw new Error(
    'AI klarte ikke å lese bilaget. ' +
    errors.join(' | ') +
    health
  );
}

async function authHeaders(): Promise<Record<string,string>> {
  const headers: Record<string,string> = { 'Content-Type': 'application/json' };
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  return headers;
}

function safeFilename(name: string) {
  return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(-140);
}

export async function saveExpenseWithDocument(draft: ExpenseDraft, file?: File | null): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Du må være innlogget i Olivia OS.');

  let documentPath: string | null = null;
  if (file) {
    documentPath = `${auth.user.id}/${Date.now()}-${safeFilename(file.name || 'bilag')}`;
    const { error: uploadError } = await supabase.storage
      .from('olivia-expense-documents')
      .upload(documentPath, file, { contentType: file.type || undefined, upsert: false });
    if (uploadError) throw new Error(`Kunne ikke lagre bilaget: ${uploadError.message}`);
  }

  const id = `expense-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { error } = await supabase.from('farm_expenses').insert({
    id,
    date: draft.date,
    season: draft.season || draft.date.slice(0, 4),
    category: draft.category,
    description: draft.description,
    amount: draft.totalAmount,
    scope: draft.scope || (draft.parcelId ? 'parcel' : 'farm'),
    parcel_id: draft.parcelId || null,
    vendor: draft.vendor || null,
    currency: draft.currency || 'EUR',
    invoice_number: draft.invoiceNumber || null,
    tax_amount: draft.taxAmount || null,
    net_amount: draft.netAmount || null,
    payment_method: draft.paymentMethod || null,
    document_path: documentPath,
    document_filename: file?.name || null,
    document_mime_type: file?.type || null,
    source: file ? 'document_scan' : 'manual',
    scan_json: draft,
    worker_name: draft.workerName || null,
    work_hours: draft.workHours || null,
    unit_rate: draft.unitRate || null,
    notes: draft.note || null,
  });
  if (error) {
    if (documentPath) await supabase.storage.from('olivia-expense-documents').remove([documentPath]).catch(() => undefined);
    throw new Error(error.message);
  }
  return id;
}

export async function getExpenseDocumentUrl(path?: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from('olivia-expense-documents').createSignedUrl(path, 900);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
