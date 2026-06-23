// /api/verify-join.js — Vercel Serverless Function
// Verifies if a Telegram user is a member of a given channel
// Bot (@Rewardsoftware1) must be admin in all channels

const BOT_TOKEN = process.env.BOT_TOKEN || ':';

// Allowed channel usernames (without @)
const ALLOWED_CHANNELS = [
  'Rewardsoftware',
  'rewardhubzone',
  'faucetpayreward',
  'rewardsoftwarepayment',
  'rewardgamese',
  'telegarmtask',
  'rewardcoinse',
  'RewardSoftwarenews',
  'Cryptodetailsupdate',
  'earnfreecryptoreward'
];

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const { userId, channelUsername } = req.body;

    // Validate inputs
    if (!userId || !channelUsername) {
      return res.status(400).json({ ok: false, error: 'userId aur channelUsername required hain' });
    }

    // Only allow whitelisted channels
    const cleanUsername = channelUsername.replace('@', '');
    const isAllowed = ALLOWED_CHANNELS.some(
      ch => ch.toLowerCase() === cleanUsername.toLowerCase()
    );
    if (!isAllowed) {
      return res.status(403).json({ ok: false, error: 'Channel allowed nahi hai' });
    }

    // Call Telegram Bot API — getChatMember
    const tgUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`;
    const tgRes = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: '@' + cleanUsername,
        user_id: parseInt(userId)
      })
    });

    const tgData = await tgRes.json();

    if (!tgData.ok) {
      // Common errors
      if (tgData.description?.includes('user not found')) {
        return res.status(200).json({ ok: true, isMember: false });
      }
      return res.status(200).json({ ok: false, error: tgData.description || 'Telegram API error' });
    }

    // Check membership status
    const status = tgData.result?.status;
    // member, administrator, creator = joined
    // left, kicked, restricted = not joined
    const isMember = ['member', 'administrator', 'creator'].includes(status);

    return res.status(200).json({ ok: true, isMember, status });

  } catch (err) {
    console.error('verify-join error:', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
