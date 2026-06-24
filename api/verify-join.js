// /api/verify-join.js — Vercel Serverless Function
// Bot token only from environment variable — never hardcoded

const BOT_TOKEN = process.env.BOT_TOKEN;

const ALLOWED_CHANNELS = [
  'rewardsoftware',
  'rewardhubzone',
  'faucetpayreward',
  'rewardsoftwarepayment',
  'rewardgamese',
  'telegarmtask',
  'rewardcoinse',
  'rewardsoftwarenews',
  'cryptodetailsupdate',
  'earnfreecryptoreward'
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!BOT_TOKEN) {
    return res.status(500).json({ ok: false, error: 'BOT_TOKEN not configured in Vercel environment variables' });
  }

  let userId, channelUsername;

  if (req.method === 'GET') {
    userId = req.query.userId;
    channelUsername = req.query.channelUsername;
  } else {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) { body = {}; }
    }
    userId = body?.userId;
    channelUsername = body?.channelUsername;
  }

  if (!userId || !channelUsername) {
    return res.status(400).json({ ok: false, error: 'userId and channelUsername are required' });
  }

  const cleanUsername = channelUsername.replace('@', '').toLowerCase();

  if (!ALLOWED_CHANNELS.includes(cleanUsername)) {
    return res.status(403).json({ ok: false, error: 'Channel not in whitelist' });
  }

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: '@' + cleanUsername,
        user_id: parseInt(userId)
      })
    });

    if (!tgRes.ok) {
      return res.status(200).json({ ok: false, error: 'Telegram API unreachable' });
    }

    const tgData = await tgRes.json();

    if (!tgData.ok) {
      const desc = tgData.description || '';
      if (desc.includes('user not found') || desc.includes('PARTICIPANT_ID_INVALID')) {
        return res.status(200).json({ ok: true, isMember: false });
      }
      return res.status(200).json({ ok: false, error: desc || 'Telegram API error' });
    }

    const status = tgData.result?.status;
    const isMember = ['member', 'administrator', 'creator'].includes(status);

    return res.status(200).json({ ok: true, isMember, status });

  } catch (err) {
    console.error('verify-join error:', err.message);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
