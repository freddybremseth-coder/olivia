/**
 * Doña Anna public contact client, staged behind an explicit frontend launch flag.
 * A successful HTTP status is NOT sufficient: require accepted: true.
 */
export type PublicInquiryPayload = {
  kind: 'tasting' | 'gift' | 'corporate-gift';
  giftPreference?: 'tasting-set' | 'personal-gift';
  product: string;
  audience: 'private' | 'business';
  name: string;
  email: string;
  company?: string;
  role?: string;
  area?: string;
  message?: string;
  turnstileToken: string;
};

export type PublicInquiryResult = { accepted: true } | { accepted: false; error: string };

export async function sendPublicInquiry(
  data: PublicInquiryPayload,
  fetcher: typeof fetch = fetch,
): Promise<PublicInquiryResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetcher('/api/public-inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, website: '' }),
      credentials: 'same-origin',
      signal: controller.signal,
    });
    if (!response.ok) return { accepted: false, error: response.status === 503 ? 'not_configured' : 'delivery_failed' };
    const result = await response.json() as { accepted?: unknown };
    if (result.accepted !== true) return { accepted: false, error: 'unconfirmed' };
    return { accepted: true };
  } catch {
    return { accepted: false, error: 'network_error' };
  } finally {
    clearTimeout(timeout);
  }
}
