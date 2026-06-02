export const DONA_ANNA_BRAND = {
  name: 'Doña Anna',
  location: 'Biar · Alicante',
  altitude: '650 moh.',
  tagline: 'Premium olivenprodukter fra Biar',
  story: 'Doña Anna er en hyllest til Anna og til gården i Biar. Den sittende kvinnen er merkevarens identitetssymbol og brukes på flasker, etiketter, QR-sider, rapporter og salgsflater.',
  logoPath: '/brand/donaanna-logo.png',
  symbolPath: '/brand/donaanna-symbol.png',
  colors: {
    black: '#070b08',
    gold: '#d9b657',
    cream: '#f4eddd',
    olive: '#6f7f3c',
  },
} as const;

export function donaAnnaTraceUrl(qrSlug?: string): string {
  if (!qrSlug) return '/trace';
  return `/trace/${qrSlug}`;
}
