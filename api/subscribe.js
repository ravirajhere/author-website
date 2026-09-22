import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

const rateLimit = new Map();
const RATE_WINDOW = 60 * 60 * 1000;
const RATE_MAX = 10;

function getIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimit.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_WINDOW) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  rateLimit.set(ip, entry);
  return entry.count > RATE_MAX;
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 120) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getIP(req);
  if (isRateLimited(ip)) {
    return res.status(429).json({
      error: 'Too many requests. Please try again later.',
    });
  }

  const { email, source = 'author', website } = req.body || {};

  if (website && website.trim() !== '') {
    return res.status(200).json({ ok: true });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const { data, error } = await supabase
      .from('subscribers')
      .insert({
        email: cleanEmail,
        source: String(source).slice(0, 40),
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(200).json({
          ok: true,
          message: 'You are already subscribed.',
          alreadySubscribed: true,
        });
      }
      console.error('[subscribe] Supabase error:', JSON.stringify(error));
      return res.status(500).json({
        error: 'Subscription failed.',
        details: error.message || 'Unknown'
      });
    }

    try {
      await resend.emails.send({
        from: 'Ravi Raj <onboarding@resend.dev>',
        to: cleanEmail,
        subject: "You're subscribed — A Boy Who Never Thought",
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:560px;padding:20px;color:#1C1A17;">
            <h2 style="margin:0 0 16px;font-family:Georgia,serif;">Thanks for subscribing.</h2>
            <p style="margin:0 0 12px;line-height:1.7;">
              You'll get updates when new chapters are published, and occasional notes from Patna.
            </p>
            <p style="margin:0 0 12px;line-height:1.7;">
              No spam. No drama. Just the story.
            </p>
            <hr style="border:none;border-top:1px solid #E5DED2;margin:24px 0;">
            <p style="margin:0;font-size:13px;color:#7A7068;">
              — Ravi Raj Singh<br>
              <a href="https://ravirajhere-author.vercel.app/author.html" style="color:#8B6F3F;">ravirajhere-author.vercel.app</a>
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('[subscribe] Welcome email failed:', emailErr);
    }

    return res.status(200).json({
      ok: true,
      message: 'Subscribed. Check your inbox.',
    });

  } catch (err) {
    console.error('[subscribe] Error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
}
