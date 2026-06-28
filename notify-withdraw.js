// /api/notify-withdraw.js
// Deploy this on Vercel under the /api folder.
// Uses the same BOT_TOKEN env variable already set up for channel verification.
// Sends a Telegram message to the admin chat whenever a user submits a
// manual Cwallet / Binance Pay withdrawal request.

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '6601027952';

export default async function handler(req, res) {
  // CORS (so the Telegram Mini App frontend can call this)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!BOT_TOKEN) {
    console.error('notify-withdraw: BOT_TOKEN env var missing');
    return res.status(500).json({ ok: false, error: 'Server misconfigured (BOT_TOKEN missing)' });
  }

  try {
    const {
      requestId,
      method,      // 'Cwallet' or 'Binance Pay'
      wallet,      // Cwallet ID/email or Binance Pay ID/email
      tCoinAmount,
      usdt,
      userId,      // Telegram user id of the requester
      username,    // Telegram @username (may be empty)
      time
    } = req.body || {};

    if (!wallet || !tCoinAmount) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    const userTag = username ? '@' + username : '(no username)';

    const text =
      '🛠️ *New Withdrawal Request*\n\n' +
      '*Method:* ' + (method || 'Unknown') + '\n' +
      '*Wallet/ID:* `' + wallet + '`\n' +
      '*Amount:* ' + tCoinAmount + ' T Coin (≈ $' + (usdt || '0.0000') + ' USDT)\n' +
      '*User:* ' + userTag + ' (ID: ' + (userId || 'unknown') + ')\n' +
      '*Request ID:* `' + (requestId || '—') + '`\n' +
      '*Time:* ' + (time || new Date().toLocaleString());

    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text,
        parse_mode: 'Markdown'
      })
    });

    const tgData = await tgRes.json();

    if (!tgData.ok) {
      console.error('Telegram sendMessage failed:', tgData);
      return res.status(502).json({ ok: false, error: tgData.description || 'Telegram API error' });
    }

    return res.status(200).json({ ok: true, requestId });
  } catch (err) {
    console.error('notify-withdraw error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Internal server error' });
  }
}
