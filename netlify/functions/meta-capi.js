// Meta Conversions API (CAPI) — server-side event relay
// Fires events to Meta from the server for better attribution & match rates

const PIXEL_ID = '1574746923780972';
const API_VERSION = 'v21.0';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const TOKEN = process.env.META_ACCESS_TOKEN;
  if (!TOKEN) {
    console.error('META_ACCESS_TOKEN not set');
    return { statusCode: 500, body: JSON.stringify({ error: 'META_ACCESS_TOKEN not set' }) };
  }

  try {
    const data = JSON.parse(event.body);
    const events = Array.isArray(data.events) ? data.events : [data];

    const payload = events.map(function(evt) {
      // Hash user data fields with SHA-256 for Meta matching
      var userData = {};

      // Phone — normalize to digits only, add country code if missing
      if (evt.phone) {
        var digits = evt.phone.replace(/\D/g, '');
        if (digits.length === 10) digits = '1' + digits;
        userData.ph = [hashSHA256(digits)];
      }

      // Name — lowercase, trim
      if (evt.name) {
        var parts = evt.name.trim().toLowerCase().split(/\s+/);
        if (parts[0]) userData.fn = [hashSHA256(parts[0])];
        if (parts.length > 1) userData.ln = [hashSHA256(parts[parts.length - 1])];
      }

      // ZIP — first 5 digits
      if (evt.zip) {
        userData.zp = [hashSHA256(evt.zip.replace(/\D/g, '').slice(0, 5))];
      }

      // fbc and fbp cookies — sent raw (not hashed)
      if (evt.fbc) userData.fbc = evt.fbc;
      if (evt.fbp) userData.fbp = evt.fbp;

      // Client IP and user agent from request headers
      var headers = event.headers || {};
      userData.client_ip_address = headers['x-forwarded-for']
        ? headers['x-forwarded-for'].split(',')[0].trim()
        : headers['client-ip'] || '0.0.0.0';
      userData.client_user_agent = evt.user_agent || headers['user-agent'] || '';

      return {
        event_name: evt.event_name || 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        event_id: evt.event_id || generateEventId(),
        event_source_url: evt.source_url || '',
        action_source: 'website',
        user_data: userData,
        custom_data: evt.custom_data || {}
      };
    });

    var url = 'https://graph.facebook.com/' + API_VERSION + '/' + PIXEL_ID + '/events?access_token=' + TOKEN;

    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: payload,
        test_event_code: data.test_event_code || undefined
      })
    });

    var resBody = await res.json();

    if (!res.ok) {
      console.error('Meta CAPI error:', JSON.stringify(resBody));
      return { statusCode: res.status, body: JSON.stringify(resBody) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, events_received: resBody.events_received })
    };

  } catch (e) {
    console.error('CAPI handler error:', e.message);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};

// SHA-256 hash using Node.js crypto
function hashSHA256(value) {
  var crypto = require('crypto');
  return crypto.createHash('sha256').update(value.toString()).digest('hex');
}

// Generate a unique event ID for deduplication with browser pixel
function generateEventId() {
  var crypto = require('crypto');
  return crypto.randomBytes(16).toString('hex');
}
