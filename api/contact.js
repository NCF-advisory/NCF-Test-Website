function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function getPipedriveBaseUrl() {
  const domain = process.env.PIPEDRIVE_COMPANY_DOMAIN;
  if (!domain) return null;

  if (/^https?:\/\//i.test(domain)) {
    return domain.replace(/\/+$/, '');
  }

  const cleanDomain = domain
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
    .replace(/\.pipedrive\.com$/i, '');

  return `https://${cleanDomain}.pipedrive.com`;
}

function clean(value) {
  return String(value || '').trim();
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks).toString('utf8');
  return rawBody ? JSON.parse(rawBody) : {};
}

async function pipedriveRequest(path, body) {
  const token = process.env.PIPEDRIVE_API_TOKEN;
  const baseUrl = getPipedriveBaseUrl();

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-token': token,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const message = payload.error || payload.error_info || `Pipedrive HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload.data;
}

async function sendNotificationEmail({ prenom, nom, email, telephone, message, pageUrl, referrer }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_EMAIL_FROM;
  const to = process.env.CONTACT_EMAIL_TO;
  if (!apiKey || !from || !to) return;

  const lines = [
    `<strong>Nom :</strong> ${escapeHtml(`${prenom} ${nom}`)}`,
    `<strong>Email :</strong> ${escapeHtml(email)}`,
    telephone ? `<strong>Téléphone :</strong> ${escapeHtml(telephone)}` : '',
    message ? `<strong>Message :</strong><br>${escapeHtml(message)}` : '<strong>Message :</strong> Non renseigné',
    pageUrl ? `<strong>Page :</strong> ${escapeHtml(pageUrl)}` : '',
    referrer ? `<strong>Référent :</strong> ${escapeHtml(referrer)}` : '',
  ].filter(Boolean);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: email,
      subject: `Nouvelle demande site web - ${prenom} ${nom}`,
      html: lines.join('<br><br>'),
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || `Resend HTTP ${response.status}`);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  if (!process.env.PIPEDRIVE_API_TOKEN || !getPipedriveBaseUrl()) {
    return json(res, 500, { ok: false, error: 'Pipedrive is not configured' });
  }

  try {
    const body = await readBody(req);

    if (clean(body.website)) {
      return json(res, 200, { ok: true });
    }

    const prenom = clean(body.prenom);
    const nom = clean(body.nom);
    const email = clean(body.email).toLowerCase();
    const telephone = clean(body.telephone);
    const message = clean(body.message);
    const pageUrl = clean(body.page_url);
    const referrer = clean(body.referrer) || clean(req.headers.referer);

    if (!prenom || !nom || !email) {
      return json(res, 400, { ok: false, error: 'Missing required fields' });
    }

    const personPayload = {
      name: `${prenom} ${nom}`.trim(),
      emails: [{ value: email, primary: true, label: 'work' }],
    };

    if (telephone) {
      personPayload.phones = [{ value: telephone, primary: true, label: 'work' }];
    }

    const person = await pipedriveRequest('/api/v2/persons', personPayload);

    const leadPayload = {
      title: `Demande site web - ${personPayload.name}`,
      person_id: person.id,
    };

    if (process.env.PIPEDRIVE_OWNER_ID) {
      leadPayload.owner_id = Number(process.env.PIPEDRIVE_OWNER_ID);
    }

    const lead = await pipedriveRequest('/api/v1/leads', leadPayload);

    const noteLines = [
      '<strong>Nouvelle demande depuis le site NCF</strong>',
      telephone ? `<strong>Téléphone :</strong> ${escapeHtml(telephone)}` : '',
      message ? `<strong>Message :</strong><br>${escapeHtml(message)}` : '<strong>Message :</strong> Non renseigné',
      pageUrl ? `<strong>Page :</strong> ${escapeHtml(pageUrl)}` : '',
      referrer ? `<strong>Référent :</strong> ${escapeHtml(referrer)}` : '',
    ].filter(Boolean);

    await pipedriveRequest('/api/v1/notes', {
      lead_id: lead.id,
      content: noteLines.join('<br><br>'),
      pinned_to_lead_flag: 1,
    });

    try {
      await sendNotificationEmail({ prenom, nom, email, telephone, message, pageUrl, referrer });
    } catch (emailError) {
      console.error('Contact email notification failed:', emailError);
    }

    return json(res, 200, { ok: true });
  } catch (error) {
    console.error('Contact form submission failed:', error);
    return json(res, 502, { ok: false, error: 'Unable to create Pipedrive lead' });
  }
};
