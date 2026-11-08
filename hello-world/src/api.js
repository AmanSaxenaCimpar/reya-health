function resolveApiUrl() {
  // Optional: set when using a public tunnel for the API (ngrok, Cloudflare, etc.)
  // Example: EXPO_PUBLIC_API_URL=https://abc123.ngrok-free.app
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const { hostname, origin, protocol, port } = window.location;
    const local = !hostname || hostname === 'localhost' || hostname === '127.0.0.1';
    // Public demo link (https, or port 80/443) serves the app and API together.
    if (!local && (protocol === 'https:' || port === '' || port === '80' || port === '443')) {
      return origin;
    }
    if (!local) {
      return `http://${hostname}:8000`;
    }
  }
  return 'http://127.0.0.1:8000';
}

export const API_URL = resolveApiUrl();

async function getJson(path) {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) {
    throw new Error('api');
  }
  return response.json();
}

export function confirmCoverage(zip) {
  return getJson(`/coverage?zip=${encodeURIComponent(zip)}`);
}

export function loadCompanies(service) {
  return getJson(`/companies?service=${encodeURIComponent(service)}`);
}

export function loadLabs() {
  return getJson('/labs');
}

export function loadImaging() {
  return getJson('/imaging');
}

export async function saveBooking(booking) {
  const response = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.detail;
    throw new Error(typeof detail === 'string' ? detail : 'Could not save this visit to SharePoint.');
  }
  return payload;
}

export function loadPricing() {
  return getJson('/pricing');
}

async function officeFetch(path, token, options = {}) {
  const response = await fetch(`${API_URL}${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.detail === 'string' ? payload.detail : 'Back office request failed.');
  }
  return payload;
}

export function officeLogin(email, password) {
  return fetch(`${API_URL}/office/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(typeof payload.detail === 'string' ? payload.detail : 'Sign-in failed.');
    }
    return payload;
  });
}

export function officeCatalog(token) {
  return officeFetch('/office/catalog', token);
}

export function saveTransport(token, rule) {
  return officeFetch('/office/transport', token, { method: 'PUT', body: JSON.stringify(rule) });
}

export function savePrice(token, code, price) {
  return officeFetch('/office/prices', token, { method: 'PUT', body: JSON.stringify({ code, price }) });
}

export function registerBusiness(token, business) {
  return officeFetch('/office/businesses', token, { method: 'POST', body: JSON.stringify(business) });
}

export function inviteLogin(token, person) {
  return officeFetch('/office/invites', token, { method: 'POST', body: JSON.stringify(person) });
}

export function loadQuestionnaires(labCodes = [], imagingCodes = []) {
  const params = new URLSearchParams();
  labCodes.forEach((code) => params.append('lab', code));
  imagingCodes.forEach((code) => params.append('imaging', code));
  const query = params.toString();
  return getJson(`/questionnaires${query ? `?${query}` : ''}`);
}
