// /api/withdraw.js — Vercel Serverless Function
// FaucetPay INSTANT PAYMENT — USDT
// Internal = FaucetPay to FaucetPay, no blockchain fees, instant payout

const FAUCETPAY_API_KEY = process.env.FAUCETPAY_API_KEY;
const FAUCETPAY_API_URL = 'https://faucetpay.io/api/v1/send';

const USDT_PER_T  = 0.0001; // 1 T Coin = $0.0001 USDT (10000 T Coin = $1 USDT)
const MIN_T_COIN  = 25;     // min 25 T Coin = $0.0025 USDT
const CURRENCY    = 'USDT';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      status: 'Withdraw API running — FaucetPay USDT instant payment',
      rate: '25 T Coin = $0.0025 USDT (1 T Coin = $0.0001 USDT)',
      min: `${MIN_T_COIN} T Coin`,
      faucetpay_key_set: !!FAUCETPAY_API_KEY
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!FAUCETPAY_API_KEY) {
    return res.status(500).json({ ok: false, error: 'FAUCETPAY_API_KEY not set in Vercel Environment Variables' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) { body = {}; }
    }

    const { email, tCoinAmount } = body || {};

    if (!email || !tCoinAmount) {
      return res.status(400).json({ ok: false, error: 'Email and tCoinAmount are required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'Invalid email address' });
    }

    const amount = parseFloat(tCoinAmount);
    if (isNaN(amount) || amount < MIN_T_COIN) {
      return res.status(400).json({ ok: false, error: `Minimum ${MIN_T_COIN} T Coin required` });
    }

    // Convert T Coin → USDT, then to FaucetPay's satoshi-style integer units (×10^8)
    const usdtAmount = amount * USDT_PER_T;
    const sendAmount = Math.round(usdtAmount * 1e8); // e.g. 0.1 USDT -> 10000000

    const params = new URLSearchParams({
      api_key:  FAUCETPAY_API_KEY,
      to:       email,
      amount:   sendAmount.toString(),
      currency: CURRENCY,
      referral: 'true'
    });

    const fpRes = await fetch(FAUCETPAY_API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString()
    });

    const fpData = await fpRes.json();
    console.log('FaucetPay USDT response:', JSON.stringify(fpData));

    if (fpData.status === 200) {
      return res.status(200).json({
        ok:        true,
        message:   'Withdrawal successful!',
        payoutId:  fpData.payout_id || null,
        usdtSent:  usdtAmount
      });
    } else {
      return res.status(200).json({
        ok:        false,
        error:     fpData.message || 'FaucetPay error',
        fp_status: fpData.status
      });
    }

  } catch (err) {
    console.error('withdraw error:', err.message);
    return res.status(500).json({ ok: false, error: 'Internal server error: ' + err.message });
  }
}
