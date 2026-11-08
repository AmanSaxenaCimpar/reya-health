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

export async function saveBooking(booking, token) {
  const response = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(token ? { ...booking, patient_token: token } : booking),
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

export function officePatients(token) {
  return officeFetch('/office/patients', token);
}

export function officeMessage(token, visitId, body) {
  return officeFetch('/office/messages', token, { method: 'POST', body: JSON.stringify({ visit_id: visitId, body }) });
}

export function officeResult(token, file) {
  return officeFetch('/office/results', token, { method: 'POST', body: JSON.stringify(file) });
}

async function patientFetch(path, token, options = {}) {
  const response = await fetch(`${API_URL}${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.detail === 'string' ? payload.detail : 'Patient portal request failed.');
  }
  return payload;
}

export async function patientSignup(account) {
  const response = await fetch(`${API_URL}/patient/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(account),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.detail === 'string' ? payload.detail : 'Could not create the account.');
  }
  return payload;
}

export function patientVerify(token) {
  return fetch(`${API_URL}/patient/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: token }),
  }).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(typeof payload.detail === 'string' ? payload.detail : 'That confirmation link is not valid.');
    }
    return payload;
  });
}

export function patientResend(email) {
  return fetch(`${API_URL}/patient/verify/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  }).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(typeof payload.detail === 'string' ? payload.detail : 'Could not send a new confirmation email.');
    }
    return payload;
  });
}

export async function patientLogin(email, password) {
  const response = await fetch(`${API_URL}/patient/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.detail === 'string' ? payload.detail : 'Could not sign in.');
  }
  return payload;
}

export function patientVisits(token) {
  return patientFetch('/patient/visits', token);
}

export function patientDocument(token, file) {
  return patientFetch('/patient/documents', token, { method: 'POST', body: JSON.stringify(file) });
}

export function patientMessage(token, visitId, body) {
  return patientFetch('/patient/messages', token, { method: 'POST', body: JSON.stringify({ visit_id: visitId, body }) });
}

export function patientProfile(token, profile) {
  return patientFetch('/patient/profile', token, { method: 'PUT', body: JSON.stringify(profile) });
}

export function patientRead(token) {
  return patientFetch('/patient/messages/read', token, { method: 'POST', body: '{}' });
}

export async function patientFinishLink(email, name) {
  const response = await fetch(`${API_URL}/patient/finish-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.detail === 'string' ? payload.detail : 'Could not send the account link.');
  }
  return payload;
}

export async function createPaymentIntent(amount) {
  const response = await fetch(`${API_URL}/payments/intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.detail === 'string' ? payload.detail : 'Card payment could not be started.');
  }
  return payload;
}

export function officeNote(token, visitId, body) {
  return officeFetch('/office/notes', token, { method: 'POST', body: JSON.stringify({ visit_id: visitId, body }) });
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
