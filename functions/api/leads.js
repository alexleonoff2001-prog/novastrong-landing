const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  }
});

const HEADERS = [
  'ID del lead', 'Fecha UTC', 'Fecha Colombia', 'Nombre completo',
  'Código de país', 'Teléfono local', 'Teléfono completo',
  'Consentimiento de contacto', 'Consentimiento de marketing',
  'Página de conversión', 'UTM source', 'UTM medium', 'UTM campaign',
  'UTM campaign ID', 'UTM term', 'UTM content', 'Meta ad set ID',
  'Meta ad ID', 'Meta placement'
];

const allowedOrigins = new Set([
  'https://novastrong.win',
  'https://novastrong-landing.pages.dev'
]);

let cachedAccessToken = '';
let accessTokenExpiresAt = 0;
let sheetReadyPromise;

const normalizeName = (value) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, 80);
const normalizePhone = (value) => String(value || '').replace(/\D/g, '').slice(0, 15);
const normalizeCountry = (value) => /^\+\d{1,4}$/.test(String(value || '')) ? String(value) : '';
const cleanText = (value, maxLength = 120) => String(value || '').trim().slice(0, maxLength);

const attributionValues = (value) => {
  const attribution = value && typeof value === 'object' ? value : {};
  return [
    cleanText(attribution.utmSource), cleanText(attribution.utmMedium),
    cleanText(attribution.utmCampaign), cleanText(attribution.utmCampaignId),
    cleanText(attribution.utmTerm), cleanText(attribution.utmContent),
    cleanText(attribution.metaAdsetId), cleanText(attribution.metaAdId),
    cleanText(attribution.metaPlacement)
  ];
};

const base64Url = (bytes) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const encodeJson = (value) => base64Url(new TextEncoder().encode(JSON.stringify(value)));

const importPrivateKey = async (privateKeyBase64) => {
  const pem = atob(privateKeyBase64.replace(/\s/g, ''));
  const derBase64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binary = atob(derBase64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8', bytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );
};

const getAccessToken = async (env) => {
  if (cachedAccessToken && Date.now() < accessTokenExpiresAt) return cachedAccessToken;

  const issuedAt = Math.floor(Date.now() / 1000);
  const unsignedToken = `${encodeJson({ alg: 'RS256', typ: 'JWT' })}.${encodeJson({
    iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: issuedAt,
    exp: issuedAt + 3600
  })}`;
  const privateKey = await importPrivateKey(env.GOOGLE_PRIVATE_KEY_BASE64);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(unsignedToken)
  );
  const assertion = `${unsignedToken}.${base64Url(new Uint8Array(signature))}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion
    })
  });
  if (!response.ok) throw new Error('No se pudo autenticar Google Sheets.');
  const token = await response.json();
  cachedAccessToken = token.access_token;
  accessTokenExpiresAt = Date.now() + (Number(token.expires_in || 3600) - 120) * 1000;
  return cachedAccessToken;
};

const googleRequest = async (env, url, options = {}) => {
  const accessToken = await getAccessToken(env);
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error('Google Sheets rechazó la operación.');
  return response.status === 204 ? null : response.json();
};

const quotedTab = (tab) => `'${tab.replace(/'/g, "''")}'`;

const ensureSheetStructure = async (env) => {
  const spreadsheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.GOOGLE_SHEET_ID)}`;
  const metadata = await googleRequest(env, `${spreadsheetUrl}?fields=sheets.properties.title`);
  const tabExists = metadata.sheets?.some((sheet) => sheet.properties?.title === env.GOOGLE_SHEET_TAB);

  if (!tabExists) {
    await googleRequest(env, `${spreadsheetUrl}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: env.GOOGLE_SHEET_TAB } } }] })
    });
  }

  const headerRange = `${quotedTab(env.GOOGLE_SHEET_TAB)}!A1:S1`;
  const valuesUrl = `${spreadsheetUrl}/values/${encodeURIComponent(headerRange)}`;
  const current = await googleRequest(env, valuesUrl);
  const existingHeaders = current.values?.[0] || [];

  if (existingHeaders.length === 0) {
    await googleRequest(env, `${valuesUrl}?valueInputOption=RAW`, {
      method: 'PUT',
      body: JSON.stringify({ range: headerRange, majorDimension: 'ROWS', values: [HEADERS] })
    });
    return;
  }

  const compatible = HEADERS.every((header, index) => existingHeaders[index] === header);
  if (!compatible) throw new Error('La pestaña de leads tiene encabezados incompatibles.');
};

const ensureSheet = (env) => {
  if (!sheetReadyPromise) {
    sheetReadyPromise = ensureSheetStructure(env).catch((error) => {
      sheetReadyPromise = undefined;
      throw error;
    });
  }
  return sheetReadyPromise;
};

const appendLead = async (env, values) => {
  await ensureSheet(env);
  const range = `${quotedTab(env.GOOGLE_SHEET_TAB)}!A:S`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.GOOGLE_SHEET_ID)}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  await googleRequest(env, url, {
    method: 'POST',
    body: JSON.stringify({ range, majorDimension: 'ROWS', values: [values] })
  });
};

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (!origin || !allowedOrigins.has(origin)) return json({ error: 'Origen no autorizado.' }, 403);
  if (contentLength > 8192) return json({ error: 'Solicitud demasiado grande.' }, 413);

  const requiredConfig = [
    env.GOOGLE_SERVICE_ACCOUNT_EMAIL, env.GOOGLE_PRIVATE_KEY_BASE64,
    env.GOOGLE_SHEET_ID, env.GOOGLE_SHEET_TAB
  ];
  if (requiredConfig.some((value) => !value)) return json({ error: 'Integración no configurada.' }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400);
  }

  const name = normalizeName(body.name);
  const phone = normalizePhone(body.phone);
  const country = normalizeCountry(body.country);
  const startedAt = Number(body.startedAt);
  const elapsed = Date.now() - startedAt;

  if (body.website) return json({ ok: true });
  if (!body.consent) return json({ error: 'Debes autorizar el tratamiento de datos.' }, 400);
  if (name.length < 3 || !/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(name)) return json({ error: 'Nombre inválido.' }, 400);
  if (phone.length < 7 || phone.length > 15 || !country) return json({ error: 'Teléfono inválido.' }, 400);
  if (!Number.isFinite(startedAt) || elapsed < 1500 || elapsed > 86400000) return json({ error: 'Solicitud inválida.' }, 400);

  const leadHash = await crypto.subtle.digest(
    'SHA-256', new TextEncoder().encode(`${name.toLowerCase()}|${country}${phone}`)
  );
  const hash = [...new Uint8Array(leadHash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const duplicateKey = new Request(`https://duplicate.internal/${hash}`, { method: 'GET' });
  const cache = caches.default;
  if (await cache.match(duplicateKey)) return json({ error: 'duplicate' }, 409);

  const now = new Date();
  const leadId = crypto.randomUUID();
  const colombiaDate = now.toLocaleString('es-CO', {
    timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'medium'
  });
  const values = [
    leadId, now.toISOString(), colombiaDate, name, country, phone, `${country}${phone}`,
    'Sí', body.marketingConsent === true ? 'Sí' : 'No', cleanText(body.page),
    ...attributionValues(body.attribution)
  ];

  try {
    await appendLead(env, values);
  } catch {
    return json({ error: 'No fue posible guardar la solicitud.' }, 502);
  }

  context.waitUntil(cache.put(duplicateKey, new Response('1', {
    headers: { 'Cache-Control': 'max-age=300' }
  })));
  return json({ ok: true, leadId }, 201);
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
}
