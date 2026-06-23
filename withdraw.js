// /api/withdraw.js — Vercel Serverless Function
// FaucetPay instant USDT (TRC20) withdrawal via registered email
// Docs: https://faucetpay.io/page/api-documentation

const FAUCETPAY_API_KEY = process.env.FAUCETPAY_API_KEY || 'c12b5478bcceac57b2a7f3bb3606e0132f259ef0518e0114b6435cb170d07e4a';
const FAUCETPAY_API_URL = 'https://faucetpay.io/api/v1/send';

const T_PER_USD   = 10000;        // 10000 T Coin = $1
const MIN_T_COIN  = 20;           // minimum 20 T Coin
const CURRENCY    = 'USDT-TRC20'; // FaucetPay currency string

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const { email, tCoinAmount } = req.body;

    // ── Validate inputs ──
    if (!email || !tCoinAmount) {
      return res.status(400).json({ ok: false, error: 'Email aur tCoinAmount required hain' });
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'Valid email address required' });
    }

    const amount = parseFloat(tCoinAmount);
    if (isNaN(amount) || amount < MIN_T_COIN) {
      return res.status(400).json({ ok: false, error: `Minimum ${MIN_T_COIN} T Coin required` });
    }

    // ── Convert T Coin → USD ──
    const usdAmount = amount / T_PER_USD; // e.g. 20 T = $0.002

    if (usdAmount < 0.001) {
      return res.status(400).json({ ok: false, error: 'Amount too small for FaucetPay (min $0.001)' });
    }

    // ── Call FaucetPay API ──
    const params = new URLSearchParams({
      api_key:  FAUCETPAY_API_KEY,
      to:       email,           // FaucetPay registered email
      amount:   usdAmount.toFixed(6),
      currency: CURRENCY,
      referral: 'true'
    });

    const fpRes = await fetch(FAUCETPAY_API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString()
    });

    const fpData = await fpRes.json();

    if (fpData.status === 200) {
      return res.status(200).json({
        ok:       true,
        message:  'Withdrawal successful!',
        payoutId: fpData.payout_id || null,
        usdSent:  usdAmount.toFixed(6)
      });
    } else {
      return res.status(200).json({
        ok:    false,
        error: fpData.message || 'FaucetPay error — try again'
      });
    }

  } catch (err) {
    console.error('withdraw error:', err);
    return res.status(500).json({ ok: false, error: 'Server error — try again later' });
  }
}
