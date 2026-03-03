exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  
  const SUPABASE_URL = 'https://ywswccgxwbzgisvdpcou.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  
  if (!SUPABASE_KEY) {
    console.error('SUPABASE_SERVICE_KEY env var not set');
    return { statusCode: 500, body: JSON.stringify({ error: 'Config error' }) };
  }
  
  try {
    const data = JSON.parse(event.body);
    const payload = {
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      source: 'windsanity',
      source_detail: 'landing-page-form'
    };
    
    const res = await fetch(SUPABASE_URL + '/rest/v1/email_list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      const err = await res.text();
      console.error('Supabase error:', res.status, err);
      return { statusCode: 500, body: JSON.stringify({ error: 'Save failed' }) };
    }
    
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        await fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: '5434271126',
            text: 'New Windsanity lead!\nName: ' + payload.name + '\nEmail: ' + payload.email + '\nPhone: ' + payload.phone
          })
        });
      }
    } catch (e) { /* best-effort */ }
    
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error('Function error:', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
