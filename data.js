// Shared Supabase access for both screens. The anon key is meant to be public —
// it only grants what the row level security policies in supabase-setup.sql allow.
const SUPABASE_URL = 'https://vixlylixfbidcdrrgwzv.supabase.co';
const SUPABASE_ANON_KEY = 'PASTE_YOUR_SUPABASE_ANON_KEY';

const REQUESTS_ENDPOINT = SUPABASE_URL + '/rest/v1/requests';

function isConfigured() {
  return !SUPABASE_ANON_KEY.startsWith('PASTE_');
}

function headers(extra) {
  return Object.assign({
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  }, extra || {});
}

async function createRequest(record) {
  if (!isConfigured()) {
    console.warn('Supabase is not configured — request not saved:', record);
    return null;
  }

  const response = await fetch(REQUESTS_ENDPOINT, {
    method: 'POST',
    headers: headers({ 'Prefer': 'return=representation' }),
    body: JSON.stringify({
      bdr_email: record.bdrEmail,
      industry: record.industry,
      request: record.request,
      link: record.link,
    }),
  });

  if (!response.ok) {
    throw new Error('Could not save request: ' + response.status + ' ' + await response.text());
  }

  const [saved] = await response.json();
  return saved;
}

async function listRequests() {
  if (!isConfigured()) {
    console.warn('Supabase is not configured — no requests to list.');
    return [];
  }

  const response = await fetch(REQUESTS_ENDPOINT + '?select=*&order=requested_at.asc', {
    headers: headers(),
  });

  if (!response.ok) {
    throw new Error('Could not load requests: ' + response.status + ' ' + await response.text());
  }

  return response.json();
}

async function attachLink(id, link) {
  const response = await fetch(REQUESTS_ENDPOINT + '?id=eq.' + encodeURIComponent(id), {
    method: 'PATCH',
    headers: headers({ 'Prefer': 'return=representation' }),
    body: JSON.stringify({ link, fulfilled_at: new Date().toISOString() }),
  });

  if (!response.ok) {
    throw new Error('Could not save link: ' + response.status + ' ' + await response.text());
  }

  const [updated] = await response.json();
  return updated;
}
