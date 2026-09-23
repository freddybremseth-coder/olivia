export const DONA_ANNA_BRAND = {
  name: 'Doña Anna',
  location: 'Biar · Alicante',
  altitude: '650 moh.',
  tagline: 'Premium olivenprodukter fra Biar',
  story: 'Doña Anna er en hyllest til Anna og til gården i Biar. Den sittende kvinnen er merkevarens identitetssymbol og brukes på flasker, etiketter, QR-sider, rapporter og salgsflater.',
  logoPath: '/brand/dona-anna-figure.svg',
  symbolPath: '/brand/dona-anna-figure.svg',
  colors: {
    black: '#0d0d0d',
    gold: '#d4af37',
    cream: '#f8f5ea',
    champagne: '#e6d5b8',
  },
} as const;

export function donaAnnaTraceUrl(qrSlug?: string): string {
  if (!qrSlug) return '/trace';
  return `/trace/${qrSlug}`;
}
