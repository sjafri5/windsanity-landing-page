exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  
  const SUPABASE_URL = 'https://ywswccgxwbzgisvdpcou.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  
  if (!SUPABASE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SUPABASE_SERVICE_KEY not set' }) };
  }
  
  const results = { supabase: false, telegram: false, sheets: false };
  
  try {
    const data = JSON.parse(event.body);
    const payload = {
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      source: 'windsanity',
      source_detail: data.source_detail || 'landing-page-form'
    };
    
    // 1. Primary: Supabase
    try {
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
      results.supabase = res.ok;
      if (!res.ok) console.error('Supabase error:', res.status, await res.text());
    } catch (e) { console.error('Supabase failed:', e.message); }
    
    // 2. Backup: Google Sheets (via Apps Script web app)
    const SHEETS_URL = process.env.GOOGLE_SHEETS_WEBHOOK;
    if (SHEETS_URL) {
      try {
        const sheetRes = await fetch(SHEETS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, timestamp: new Date().toISOString() })
        });
        results.sheets = sheetRes.ok;
      } catch (e) { console.error('Sheets failed:', e.message); }
    }
    
    // 3. Notification: Telegram
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (BOT_TOKEN) {
      try {
        await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: '5434271126',
            text: 'New Windsanity lead!\nName: ' + payload.name + '\nEmail: ' + payload.email + '\nPhone: ' + payload.phone + '\nArea: ' + payload.source_detail + '\n\nSaved: Supabase=' + results.supabase + ' Sheets=' + results.sheets
          })
        });
        results.telegram = true;
      } catch (e) { console.error('Telegram failed:', e.message); }
    }
    
    // Return success if at least one storage method worked
    if (results.supabase || results.sheets) {
      return { statusCode: 200, body: JSON.stringify({ ok: true, results }) };
    }
    return { statusCode: 500, body: JSON.stringify({ error: 'All storage methods failed', results }) };
    
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
