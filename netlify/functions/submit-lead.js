exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  
  const SUPABASE_URL = 'https://ywswccgxwbzgisvdpcou.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  
  if (!SUPABASE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SUPABASE_SERVICE_KEY not set', keys: Object.keys(process.env).filter(k => k.includes('SUPA')) }) };
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
      return { statusCode: 500, body: JSON.stringify({ error: 'Supabase ' + res.status, detail: err }) };
    }
    
    return { statusCode: 200, body: JSON.stringify({ ok: true, saved: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
