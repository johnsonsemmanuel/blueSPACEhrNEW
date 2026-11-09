const pool = require('../config/database');

const INTEK_API_KEY = process.env.INTEK_SMS_API_KEY;
const INTEK_SENDER_ID = process.env.INTEK_SMS_SENDER_ID || '1';
const INTEK_URL = process.env.INTEK_SMS_URL || 'https://inteksms.top/api/v1/messages/send';

const RATE_LIMIT_DELAY_MS = 120;
let lastSendTime = 0;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function rateLimitedSend(fn) {
  const now = Date.now();
  const elapsed = now - lastSendTime;
  if (elapsed < RATE_LIMIT_DELAY_MS) {
    await sleep(RATE_LIMIT_DELAY_MS - elapsed);
  }
  lastSendTime = Date.now();

  let retries = 0;
  const maxRetries = 3;
  while (retries <= maxRetries) {
    try {
      return await fn();
    } catch (err) {
      const msg = err.message || '';
      const isRateLimit = msg.includes('Too many requests') || msg.includes('rate limit') || err.status === 429;
      if (isRateLimit && retries < maxRetries) {
        const backoff = Math.pow(2, retries) * 1000;
        console.warn(`[sms] Rate limited, retrying in ${backoff}ms (attempt ${retries + 1}/${maxRetries})`);
        await sleep(backoff);
        retries++;
        continue;
      }
      throw err;
    }
  }
}

function normalizePhone(raw, countryCode = '234') {
  if (!raw) return null;
  let s = String(raw).trim().replace(/[\s().-]/g, '');
  if (!s) return null;

  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (s.startsWith('+')) {
    // already international
  } else if (s.startsWith('0')) {
    const national = s.slice(1);
    if (national.length < 7) return null;
    s = '+' + countryCode + national;
  } else if (s.startsWith(countryCode)) {
    s = '+' + s;
  } else {
    if (s.length < 7) return null;
    s = '+' + countryCode + s;
  }

  const digits = s.slice(1);
  if (!/^\d{7,15}$/.test(digits)) return null;
  return s.replace('+', '');
}

async function logSms(to, content, status, errorMessage) {
  try {
    await pool.query(
      'INSERT INTO sms_logs (to_phone, content, status, error_message, created_at) VALUES (?, ?, ?, ?, NOW())',
      [to, content, status, errorMessage || null]
    );
  } catch (err) {
    console.error('[sms-log] Failed to log SMS:', err.message);
  }
}

async function sendSms({ to, content }) {
  if (!INTEK_API_KEY) {
    console.log(`[sms] Skipped (no INTEK_SMS_API_KEY): to=${to}`);
    await logSms(to, content, 'skipped', 'No API key configured');
    return { status: 'skipped' };
  }

  const msisdn = normalizePhone(to);
  if (!msisdn) {
    await logSms(to, content, 'failed', `Invalid phone number: ${to}`);
    return { status: 'failed', error: `Invalid phone number: ${to}` };
  }

  try {
    await rateLimitedSend(async () => {
      const res = await fetch(INTEK_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${INTEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_id: parseInt(INTEK_SENDER_ID),
          message: content,
          recipients: [msisdn],
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) throw new Error('Invalid API key');
      if (res.status === 402) throw new Error('Insufficient SMS credits');
      if (res.status === 403) throw new Error('Sender ID not approved');
      if (res.status === 422) throw new Error(body?.message || 'Validation error');
      if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
    });

    console.log(`[sms] Sent to ${to}`);
    await logSms(to, content, 'sent', null);
    return { status: 'sent' };
  } catch (err) {
    console.error('[sms] Error:', err.message);
    await logSms(to, content, 'failed', err.message);
    return { status: 'failed', error: err.message };
  }
}

function buildSmsContent(type, data) {
  const greet = data.recipient_name ? `Hi ${data.recipient_name}, ` : '';
  if (type === 'staff_on_leave') {
    const handover = data.handover_name ? ` Kindly direct urgent matters to ${data.handover_name}.` : '';
    return `${greet}${data.employee_name} is now on ${data.leave_type} leave until ${data.end_date}.${handover} - BlueSPACE HR`;
  }
  if (type === 'staff_returned') {
    return `${greet}${data.employee_name} is back from ${data.leave_type} leave as of today. - BlueSPACE HR`;
  }
  if (type === 'payment_reminder') {
    let msg = `${greet}PAYMENT REMINDER: ${data.title} due ${data.due_date}`;
    if (data.amount) msg += ` - Amount: ₵${data.amount}`;
    if (data.description) msg += `. ${data.description}`;
    msg += ' - BlueSPACE HR';
    return msg;
  }
  if (type === 'expense_reminder') {
    let msg = `${greet}EXPENSE REMINDER: ${data.category} - ${data.description} due ${data.due_date}`;
    if (data.amount) msg += ` - ₵${data.amount}`;
    msg += ' - BlueSPACE HR';
    return msg;
  }
  return null;
}

async function sendTemplatedSms(type, to, data) {
  const content = buildSmsContent(type, data);
  if (!content) {
    console.error(`[sms] Unknown SMS type: ${type}`);
    return false;
  }
  const { status } = await sendSms({ to, content });
  return status === 'sent';
}

module.exports = { sendSms, sendTemplatedSms, normalizePhone, buildSmsContent };
