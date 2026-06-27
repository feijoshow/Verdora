import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const PORT = Number(process.env.PORT) || 3001;
const XAI_API_KEY = process.env.XAI_API_KEY?.trim() ?? '';
const ZAI_API_KEY = process.env.ZAI_API_KEY?.trim() ?? '';
const GROK_MODEL = process.env.GROK_MODEL?.trim() || 'grok-4.3';
const ZAI_VISION_MODEL = process.env.ZAI_VISION_MODEL?.trim() || 'glm-4.6v-flash';
const ZAI_CHAT_MODEL = process.env.ZAI_CHAT_MODEL?.trim() || 'glm-4.7-flash';
const ZAI_CHAT_URL = 'https://api.z.ai/api/paas/v4/chat/completions';
const SUPABASE_URL = process.env.SUPABASE_URL?.trim() ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim() ?? '';
const RESEND_FROM = process.env.RESEND_FROM?.trim() || 'Verdora <onboarding@resend.dev>';

const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:8081')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const app = express();
app.use(
  cors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  }),
);
app.use(express.json({ limit: '15mb' }));

function ok(res, data) {
  return res.json({ success: true, data });
}

function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function sendPasswordResetEmail(to, code) {
  const upstream = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [to],
      subject: 'Your Verdora password reset code',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1b1b1b;">
          <h2 style="color: #1b4332;">Reset your Verdora password</h2>
          <p>Use this code in the app to choose a new password:</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; color: #2d6a4f;">${code}</p>
          <p style="color: #5c5c5c;">This code expires in 1 hour. If you did not request a reset, you can ignore this email.</p>
        </div>
      `,
    }),
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const message = data?.message ?? data?.error ?? 'Failed to send reset email';
    throw new Error(message);
  }
}

app.get('/health', (_req, res) => {
  ok(res, {
    status: 'ok',
    grok: Boolean(XAI_API_KEY),
    zai: Boolean(ZAI_API_KEY),
    zaiVisionModel: ZAI_VISION_MODEL,
    zaiChatModel: ZAI_CHAT_MODEL,
    chatProvider: ZAI_API_KEY ? 'z.ai' : XAI_API_KEY ? 'grok' : null,
    passwordReset: Boolean(RESEND_API_KEY && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY),
  });
});

/** POST /api/v1/auth/forgot-password — generate Supabase OTP and email via Resend */
app.post('/api/v1/auth/forgot-password', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email) {
    return fail(res, 400, 'email is required');
  }
  if (!RESEND_API_KEY) {
    return fail(res, 503, 'RESEND_API_KEY is not configured on the API server');
  }

  const sb = getSupabaseAdmin();
  if (!sb) {
    return fail(res, 503, 'Supabase admin credentials are not configured on the API server');
  }

  try {
    const { data, error } = await sb.auth.admin.generateLink({
      type: 'recovery',
      email,
    });

    if (error) {
      console.warn('[auth/forgot-password] generateLink:', error.message);
      return ok(res, { sent: true });
    }

    const otp = data?.properties?.email_otp;
    if (!otp) {
      console.error('[auth/forgot-password] generateLink returned no email_otp');
      return ok(res, { sent: true });
    }

    await sendPasswordResetEmail(email, otp);
    return ok(res, { sent: true });
  } catch (err) {
    console.error('[auth/forgot-password]', err);
    return fail(res, 500, err instanceof Error ? err.message : 'Password reset failed');
  }
});

/** POST /api/v1/chat/message — Z.ai GLM chat proxy (falls back to Grok if ZAI key missing) */
app.post('/api/v1/chat/message', async (req, res) => {
  const { message, history, systemPrompt } = req.body ?? {};
  if (!message || typeof message !== 'string') {
    return fail(res, 400, 'message is required');
  }

  const messages = [
    {
      role: 'system',
      content:
        systemPrompt ||
        'You are Verdora, a farming assistant for Namibian small-scale and commercial farmers.',
    },
    ...(Array.isArray(history) ? history : []),
    { role: 'user', content: message },
  ];

  if (ZAI_API_KEY) {
    try {
      const upstream = await fetch(ZAI_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ZAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: ZAI_CHAT_MODEL,
          max_tokens: 1024,
          temperature: 0.7,
          messages,
        }),
      });

      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        const errMsg =
          data?.error?.message ??
          data?.message ??
          (upstream.status === 429 ? 'Z.ai rate limit — wait and try again' : 'Chat request failed');
        console.error('[Z.ai chat upstream]', upstream.status, JSON.stringify(data));
        return fail(res, upstream.status, errMsg);
      }

      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text) {
        return fail(res, 502, 'Chat model returned an empty response');
      }

      return ok(res, {
        reply: {
          id: randomUUID(),
          role: 'assistant',
          content: text,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      return fail(res, 500, err instanceof Error ? err.message : 'Chat proxy failed');
    }
  }

  if (!XAI_API_KEY) {
    return fail(res, 503, 'ZAI_API_KEY is not configured on the API server');
  }

  try {
    const upstream = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        max_tokens: 1024,
        messages,
      }),
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const errMsg =
        (typeof data?.error === 'object' ? data.error?.message : null) ??
        (typeof data?.error === 'string' ? data.error : null) ??
        data?.message ??
        (upstream.status === 403
          ? 'Grok API key rejected — regenerate at console.x.ai and confirm billing/credits'
          : upstream.status === 429
            ? 'Grok rate limit — wait a moment and try again'
            : 'Grok request failed');
      console.error('[Grok upstream]', upstream.status, JSON.stringify(data));
      return fail(res, upstream.status, errMsg);
    }

    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return fail(res, 502, 'Grok returned an empty response');
    }

    return ok(res, {
      reply: {
        id: randomUUID(),
        role: 'assistant',
        content: text,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return fail(res, 500, err instanceof Error ? err.message : 'Chat proxy failed');
  }
});

/** POST /api/v1/crops/diagnose — Z.ai GLM-4.6V-Flash vision proxy */
app.post('/api/v1/crops/diagnose', async (req, res) => {
  if (!ZAI_API_KEY) {
    return fail(res, 503, 'ZAI_API_KEY is not configured on the API server');
  }

  const { imageBase64, mimeType, prompt } = req.body ?? {};
  if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length < 256) {
    return fail(res, 400, 'imageBase64 is required');
  }
  if (!prompt || typeof prompt !== 'string') {
    return fail(res, 400, 'prompt is required');
  }

  try {
    const upstream = await fetch(ZAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ZAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: ZAI_VISION_MODEL,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`,
                },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const msg =
        data?.error?.message ??
        data?.message ??
        (upstream.status === 429 ? 'Z.ai rate limit — wait and try again' : 'Vision scan request failed');
      console.error('[Z.ai upstream]', upstream.status, JSON.stringify(data));
      return fail(res, upstream.status, msg);
    }

    const rawText = data?.choices?.[0]?.message?.content?.trim() ?? '';
    if (!rawText) {
      return fail(res, 502, 'Vision model returned an empty response');
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return fail(res, 502, 'Vision response was not valid JSON');
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return fail(res, 502, 'Vision response was not valid JSON');
    }

    const confidenceRaw = parsed.confidence ?? 0;
    const confidence = confidenceRaw > 1 ? confidenceRaw / 100 : confidenceRaw;

    return ok(res, {
      id: randomUUID(),
      cropName: parsed.cropName ?? 'Unknown crop',
      disease: parsed.disease ?? null,
      confidence: Math.min(1, Math.max(0, confidence)),
      treatment: parsed.treatment ?? 'Monitor the plant and scan again if symptoms persist.',
      scannedAt: new Date().toISOString(),
    });
  } catch (err) {
    return fail(res, 500, err instanceof Error ? err.message : 'Scan proxy failed');
  }
});

app.listen(PORT, () => {
  console.log(`Verdora API listening on http://localhost:${PORT}`);
  console.log(`  Grok: ${XAI_API_KEY ? 'configured' : 'missing XAI_API_KEY'}`);
  console.log(
    `  Z.ai: ${ZAI_API_KEY ? `configured (scan: ${ZAI_VISION_MODEL}, chat: ${ZAI_CHAT_MODEL})` : 'missing ZAI_API_KEY'}`,
  );
  console.log(
    `  Password reset: ${RESEND_API_KEY && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? 'Resend + Supabase admin' : 'not configured'}`,
  );
  console.log(`  CORS: ${corsOrigins.join(', ')}`);
});

