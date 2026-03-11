const SUPABASE_URL = 'https://ywswccgxwbzgisvdpcou.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TELEGRAM_BOT_TOKEN = '8559730594:AAFEU2i_Az-E2eNtI4uSSeSrsNDl--lRpF4';
const TELEGRAM_CHAT_ID = '5434271126';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const { name, company, email, phone, business_type, volume, notes } = data;

    if (!name || !email || !phone) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    // Save to Supabase
    const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/email_list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        name: `${name} (${company || 'no company'})`,
        email,
        phone,
        source: 'windsanity',
        source_detail: `B2B: ${business_type || 'unknown'} | Vol: ${volume || 'unknown'} | Notes: ${(notes || '').slice(0, 200)}`,
        tags: ['b2b', business_type || 'unknown'].filter(Boolean),
        status: 'subscribed'
      })
    });

    // Telegram notification
    const msg = `NEW B2B LEAD (Windsanity)\n\nName: ${name}\nCompany: ${company || 'N/A'}\nEmail: ${email}\nPhone: ${phone}\nType: ${business_type || 'N/A'}\nVolume: ${volume || 'N/A'}\nNotes: ${(notes || 'None').slice(0, 200)}`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg })
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('B2B submit error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
