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

export function confirmCoverage(zip, service) {
  const serviceQuery = service ? `&service=${encodeURIComponent(service)}` : '';
  return getJson(`/coverage?zip=${encodeURIComponent(zip)}${serviceQuery}`);
}

export function loadCompanies(service, zip) {
  const zipQuery = zip ? `&zip=${encodeURIComponent(zip)}` : '';
  return getJson(`/companies?service=${encodeURIComponent(service)}${zipQuery}`);
}

export function loadLabs(business) {
  const query = business ? `?business=${encodeURIComponent(business)}` : '';
  return getJson(`/labs${query}`);
}

export function loadImaging(business) {
  const query = business ? `?business=${encodeURIComponent(business)}` : '';
  return getJson(`/imaging${query}`);
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

export function loadQuote(zip, service, business) {
  const serviceQuery = service ? `&service=${encodeURIComponent(service)}` : '';
  const businessQuery = business ? `&business=${encodeURIComponent(business)}` : '';
  return getJson(`/quote?zip=${encodeURIComponent(zip)}${serviceQuery}${businessQuery}`);
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

export function saveRules(token, rules) {
  return officeFetch('/office/rules', token, { method: 'PUT', body: JSON.stringify(rules) });
}

export function addOfficeTest(token, test) {
  return officeFetch('/office/tests', token, { method: 'POST', body: JSON.stringify(test) });
}

export function removeOfficeTest(token, code) {
  return officeFetch(`/office/tests?code=${encodeURIComponent(code)}`, token, { method: 'DELETE' });
}

export async function uploadOfficeTests(token, file) {
  const body = new FormData();
  body.append('file', file);
  const response = await fetch(`${API_URL}/office/tests/upload?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.detail === 'string' ? payload.detail : 'Upload failed.');
  }
  return payload;
}

export function savePrice(token, code, price) {
  return officeFetch('/office/prices', token, { method: 'PUT', body: JSON.stringify({ code, price }) });
}

export function saveContent(token, content) {
  return officeFetch('/office/content', token, { method: 'PUT', body: JSON.stringify(content) });
}

export function saveQuestions(token, payload) {
  return officeFetch('/office/questions', token, { method: 'PUT', body: JSON.stringify(payload) });
}

export function registerBusiness(token, business) {
  return officeFetch('/office/businesses', token, { method: 'POST', body: JSON.stringify(business) });
}

export function inviteLogin(token, person) {
  return officeFetch('/office/invites', token, { method: 'POST', body: JSON.stringify(person) });
}

export function loadQuestionnaires(labCodes = [], imagingCodes = [], service, business) {
  const params = new URLSearchParams();
  if (service) {
    params.set('service', service);
  }
  if (business) {
    params.set('business', business);
  }
  labCodes.forEach((code) => params.append('lab', code));
  imagingCodes.forEach((code) => params.append('imaging', code));
  const query = params.toString();
  return getJson(`/questionnaires${query ? `?${query}` : ''}`);
}
