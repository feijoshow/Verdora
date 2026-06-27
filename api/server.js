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

const PLANTING_GUIDE_SYSTEM = `You are Verdora, an agricultural advisor for Namibian small-scale and commercial farmers.
Return ONLY a single JSON object (no markdown) with these exact fields:
{
  "name": "Crop display name",
  "aliases": ["optional", "aliases"],
  "bestPlantingMonths": "Human-readable planting window for Namibia",
  "harvestWindow": "Typical harvest window after planting",
  "maturityDays": 90,
  "maturityDaysRange": "e.g. 80-100 days",
  "soilType": "Recommended soil type",
  "soilPh": "e.g. pH 5.5 - 6.8",
  "irrigation": "Irrigation method",
  "waterNote": "Seasonal water needs in mm or practical guidance"
}
Use realistic Namibia seasonal advice (wet season Nov-Apr, dry May-Oct). maturityDays must be a number.`;

function slugifyCropName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizePlantingGuidePayload(raw, cropName) {
  const name = (raw?.name ?? cropName ?? 'Custom crop').trim();
  const maturityDays = Number(raw?.maturityDays);
  return {
    id: `custom-${slugifyCropName(name) || 'crop'}`,
    name,
    aliases: Array.isArray(raw?.aliases)
      ? raw.aliases.filter((a) => typeof a === 'string' && a.trim())
      : [],
    bestPlantingMonths:
      raw?.bestPlantingMonths?.trim() ||
      'February – March & August – September (adjust for local rainfall)',
    harvestWindow:
      raw?.harvestWindow?.trim() || `${Math.max(60, maturityDays || 90)} days after planting`,
    maturityDays: Number.isFinite(maturityDays) && maturityDays > 0 ? Math.round(maturityDays) : 90,
    maturityDaysRange: raw?.maturityDaysRange?.trim() || '60–120 days',
    soilType: raw?.soilType?.trim() || 'Well-drained loam with organic matter',
    soilPh: raw?.soilPh?.trim() || 'pH 5.5 – 7.0',
    irrigation: raw?.irrigation?.trim() || 'Drip irrigation recommended in dry season',
    waterNote:
      raw?.waterNote?.trim() ||
      'Match irrigation to growth stage — increase during flowering and fruiting',
  };
}

async function requestPlantingGuideFromChat(cropName, location) {
  const locationHint = location?.trim() ? ` Location: ${location.trim()}.` : ' Location: Namibia.';
  const userPrompt = `Create a practical planting guide JSON for "${cropName}".${locationHint}`;
  const messages = [
    { role: 'system', content: PLANTING_GUIDE_SYSTEM },
    { role: 'user', content: userPrompt },
  ];
  const errors = [];

  function extractContent(data) {
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === 'string') return content.trim();
    if (Array.isArray(content)) {
      return content
        .map((part) => (typeof part === 'string' ? part : part?.text ?? ''))
        .join('')
        .trim();
    }
    return '';
  }

  function parseGuideJson(rawText) {
    if (!rawText) throw new Error('Guide model returned an empty response');
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Guide response was not valid JSON');
    return JSON.parse(jsonMatch[0]);
  }

  async function callZai(useJsonFormat) {
    const body = {
      model: ZAI_CHAT_MODEL,
      max_tokens: 900,
      temperature: 0.35,
      messages,
    };
    if (useJsonFormat) body.response_format = { type: 'json_object' };

    const upstream = await fetch(ZAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ZAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const errMsg =
        data?.error?.message ??
        data?.message ??
        (upstream.status === 429 ? 'Z.ai rate limit — wait and try again' : 'Z.ai guide request failed');
      throw new Error(errMsg);
    }

    return parseGuideJson(extractContent(data));
  }

  async function callGrok() {
    const upstream = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        max_tokens: 900,
        temperature: 0.35,
        messages,
      }),
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const errMsg =
        (typeof data?.error === 'object' ? data.error?.message : null) ??
        data?.message ??
        'Grok guide request failed';
      throw new Error(errMsg);
    }

    return parseGuideJson(extractContent(data));
  }

  if (ZAI_API_KEY) {
    for (const useJson of [false, true]) {
      try {
        return await callZai(useJson);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : 'Z.ai failed');
      }
    }
  }

  if (XAI_API_KEY) {
    try {
      return await callGrok();
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Grok failed');
    }
  }

  throw new Error(errors.join(' | ') || 'No AI key configured for planting guide generation');
}

/** POST /api/v1/calendar/planting-guide — AI planting guide for custom crops */
app.post('/api/v1/calendar/planting-guide', async (req, res) => {
  const { cropName, location } = req.body ?? {};
  if (!cropName || typeof cropName !== 'string' || !cropName.trim()) {
    return fail(res, 400, 'cropName is required');
  }

  if (!ZAI_API_KEY && !XAI_API_KEY) {
    return fail(res, 503, 'No AI key configured for planting guide generation');
  }

  try {
    const parsed = await requestPlantingGuideFromChat(cropName.trim(), location);
    return ok(res, { guide: normalizePlantingGuidePayload(parsed, cropName.trim()) });
  } catch (err) {
    return fail(res, 500, err instanceof Error ? err.message : 'Planting guide generation failed');
  }
});

const CARE_SCHEDULE_SYSTEM = `You are Verdora, an agricultural advisor for Namibian farmers.
Return ONLY a JSON object (no markdown):
{
  "tasks": [
    {
      "type": "water" | "fertilize" | "weed" | "inspect" | "harvest",
      "scheduledAt": "ISO-8601 datetime with timezone offset",
      "title": "Short title e.g. Water mango",
      "message": "One practical sentence for the farmer"
    }
  ]
}
Rules:
- Plan from plant date through harvest using realistic crop growth stages for Namibia.
- Use morning times (06:00–09:00 local) for field work when possible.
- Include watering, weeding, inspection, fertilizing, and harvest readiness checks.
- Limit to at most 20 tasks total.
- scheduledAt must be in the future relative to now when demoMode is false.
- When demoMode is true, schedule tasks within the next 30 minutes from plant date for testing.`;

function normalizeCareScheduleTasks(rawTasks, cropName, demoMode) {
  if (!Array.isArray(rawTasks)) return [];
  const allowed = new Set(['water', 'fertilize', 'weed', 'pest', 'inspect', 'harvest', 'other']);
  const now = Date.now();
  const parsed = [];

  for (const raw of rawTasks.slice(0, 24)) {
    const type = String(raw?.type ?? 'inspect').toLowerCase();
    if (!allowed.has(type)) continue;
    const when = new Date(raw?.scheduledAt ?? '');
    if (Number.isNaN(when.getTime()) || when.getTime() <= now - 60_000) continue;
    parsed.push({
      type,
      scheduledAt: when.toISOString(),
      title: raw?.title?.trim() || `${type} — ${cropName}`,
      message: raw?.message?.trim() || `Care task for ${cropName}.`,
    });
  }

  return parsed.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

async function requestCareScheduleFromChat(payload) {
  const {
    cropName,
    plantDate,
    harvestDate,
    maturityDays,
    irrigation,
    waterNote,
    location,
    demoMode,
  } = payload;

  const locationHint = location?.trim() ? ` Location: ${location.trim()}.` : ' Location: Namibia.';
  const userPrompt = `Create a care schedule for "${cropName}" planted on ${plantDate}.${
    harvestDate ? ` Expected harvest: ${harvestDate}.` : ''
  } Maturity ~${maturityDays ?? 90} days. Irrigation: ${irrigation ?? 'drip'}. ${
    waterNote ?? ''
  }.${locationHint} demoMode=${Boolean(demoMode)}. Now: ${new Date().toISOString()}.`;

  const messages = [
    { role: 'system', content: CARE_SCHEDULE_SYSTEM },
    { role: 'user', content: userPrompt },
  ];
  const errors = [];

  function extractContent(data) {
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === 'string') return content.trim();
    if (Array.isArray(content)) {
      return content
        .map((part) => (typeof part === 'string' ? part : part?.text ?? ''))
        .join('')
        .trim();
    }
    return '';
  }

  function parseTasksJson(rawText) {
    if (!rawText) throw new Error('Care schedule model returned an empty response');
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Care schedule response was not valid JSON');
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed?.tasks ?? parsed;
  }

  async function callZai(useJsonFormat) {
    const body = {
      model: ZAI_CHAT_MODEL,
      max_tokens: 1200,
      temperature: 0.35,
      messages,
    };
    if (useJsonFormat) body.response_format = { type: 'json_object' };

    const upstream = await fetch(ZAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ZAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      throw new Error(data?.error?.message ?? data?.message ?? 'Z.ai care schedule failed');
    }
    return parseTasksJson(extractContent(data));
  }

  async function callGrok() {
    const upstream = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        max_tokens: 1200,
        temperature: 0.35,
        messages,
      }),
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      throw new Error(
        (typeof data?.error === 'object' ? data.error?.message : null) ??
          data?.message ??
          'Grok care schedule failed',
      );
    }
    return parseTasksJson(extractContent(data));
  }

  if (ZAI_API_KEY) {
    for (const useJson of [false, true]) {
      try {
        return await callZai(useJson);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : 'Z.ai failed');
      }
    }
  }

  if (XAI_API_KEY) {
    try {
      return await callGrok();
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Grok failed');
    }
  }

  throw new Error(errors.join(' | ') || 'No AI key configured for care schedule');
}

/** POST /api/v1/calendar/care-schedule — AI-timed water/weed/inspect plan */
app.post('/api/v1/calendar/care-schedule', async (req, res) => {
  const {
    cropName,
    plantDate,
    harvestDate,
    maturityDays,
    irrigation,
    waterNote,
    location,
    demoMode,
  } = req.body ?? {};

  if (!cropName || typeof cropName !== 'string' || !cropName.trim()) {
    return fail(res, 400, 'cropName is required');
  }
  if (!plantDate || typeof plantDate !== 'string') {
    return fail(res, 400, 'plantDate is required');
  }

  if (!ZAI_API_KEY && !XAI_API_KEY) {
    return fail(res, 503, 'No AI key configured for care schedule');
  }

  try {
    const rawTasks = await requestCareScheduleFromChat({
      cropName: cropName.trim(),
      plantDate,
      harvestDate,
      maturityDays,
      irrigation,
      waterNote,
      location,
      demoMode: Boolean(demoMode),
    });
    const tasks = normalizeCareScheduleTasks(rawTasks, cropName.trim(), Boolean(demoMode));
    if (tasks.length === 0) {
      return fail(res, 502, 'AI returned no valid care tasks');
    }
    return ok(res, { tasks });
  } catch (err) {
    return fail(res, 500, err instanceof Error ? err.message : 'Care schedule generation failed');
  }
});

/** POST /api/v1/crops/diagnose — Z.ai GLM-4.6V-Flash vision proxy */
const VISION_DIAGNOSIS_SYSTEM = `You are Verdora, an expert crop pathologist for Namibian farmers.
Identify any visible plant (fruits, vegetables, grains, trees) and diagnose disease or pest damage from photos.
Never label a plant photo as "not a crop". Only use "not a crop" when no plant is visible at all.
Name specific diseases when possible (e.g. Black Sigatoka, anthracnose, blight, mosaic, rust).
Always respond with valid JSON only.`;

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
        temperature: 0.25,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: VISION_DIAGNOSIS_SYSTEM },
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
      cropName: parsed.cropName ?? 'Unidentified crop',
      disease: parsed.disease ?? null,
      confidence: Math.min(1, Math.max(0, confidence)),
      treatment:
        parsed.treatment ??
        (parsed.symptoms
          ? `Observed: ${parsed.symptoms}. Monitor and scan again if symptoms spread.`
          : 'Monitor the plant and scan again if symptoms persist.'),
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

