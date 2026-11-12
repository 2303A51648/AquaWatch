const configuredApiUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
export const API_BASE_URL = configuredApiUrl
  ? /^https?:\/\//i.test(configuredApiUrl)
    ? configuredApiUrl
    : `https://${configuredApiUrl}`
  : '';

function mapKeys(value: unknown, keyMapper: (key: string) => string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => mapKeys(item, keyMapper));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        keyMapper(key),
        mapKeys(item, keyMapper),
      ])
    );
  }
  return value;
}

function toSnakeKey(key: string): string {
  if (key === 'lat') return 'latitude';
  if (key === 'lng') return 'longitude';
  if (key === 'capacityMGD') return 'capacity_mgd';
  return key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function toCamelKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data: T; [key: string]: any }> {
  const requestOptions = { ...options };
  if (typeof requestOptions.body === 'string' && path !== '/api/thresholds') {
    try {
      requestOptions.body = JSON.stringify(
        mapKeys(JSON.parse(requestOptions.body), toSnakeKey)
      );
    } catch {
      throw new Error('Invalid JSON request body.');
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, requestOptions);
  const text = await response.text();
  let payload: any = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      if (response.ok) {
        throw new Error('The backend returned an invalid response.');
      }
      payload = { detail: text };
    }
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.detail || payload?.error || `Backend request failed (${response.status}).`);
  }

  const normalized = mapKeys(payload, toCamelKey) as any;
  if (normalized && typeof normalized === 'object' && 'success' in normalized) {
    return normalized;
  }
  return { success: true, data: normalized as T };
}
