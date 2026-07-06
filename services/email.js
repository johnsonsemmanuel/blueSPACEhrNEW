const nodemailer = require('nodemailer');

let transporter = null;

const APP_LOGO_URL = process.env.APP_LOGO_URL || 'https://hr.bihlabs.com/logo.png';
const APP_URL = process.env.APP_URL || 'https://hr.bihlabs.com';
const BRAND_COLOR = '#2180f3';

function initTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('SMTP not configured — email sending disabled');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: SMTP_PORT === '465',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

async function sendEmail({ to, subject, html }) {
  try {
    const t = initTransporter();
    if (!t) {
      console.log(`[email] Skipped (no SMTP): to=${to} subject="${subject}"`);
      return false;
    }
    await t.sendMail({
      from: process.env.SMTP_FROM || SMTP_USER,
      to,
      subject,
      html,
    });
    console.log(`[email] Sent to ${to}: "${subject}"`);
    return true;
  } catch (err) {
    console.error('[email] Error:', err.message);
    return false;
  }
}

function row(label, value) {
  return `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;color:#666;font-weight:600;white-space:nowrap;vertical-align:top;">${label}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;color:#222;">${value || '—'}</td>
    </tr>`;
}

function layout({ title, preheader, body }) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <tr>
              <td style="background:${BRAND_COLOR};padding:20px 28px;">
                <img src="${APP_LOGO_URL}" alt="BlueSPACE" height="36" style="height:36px;display:block;">
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h2 style="margin:0 0 4px;color:#1a1a1a;font-size:20px;">${title}</h2>
                ${preheader ? `<p style="margin:0 0 20px;color:#888;font-size:14px;">${preheader}</p>` : ''}
                ${body}
                <p style="margin:24px 0 0;">
                  <a href="${APP_URL}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:6px;font-size:14px;font-weight:600;">Open BlueSPACE HR</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#fafbfc;padding:16px 28px;border-top:1px solid #eee;">
                <p style="margin:0;color:#999;font-size:12px;">This is an automated message from the BlueSPACE HR System. Please do not reply to this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
}

function detailTable(rows) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;overflow:hidden;margin-top:8px;">${rows.join('')}</table>`;
}

async function sendHandoverNotification({ toEmail, toName, fromName, leaveType, startDate, endDate, notes, leaveId }) {
  const body = `
    <p style="color:#333;font-size:15px;line-height:1.5;">Hello ${toName},</p>
    <p style="color:#333;font-size:15px;line-height:1.5;"><strong>${fromName}</strong> has assigned you as their handover contact during their upcoming leave. Please coordinate with them before their leave begins.</p>
    ${detailTable([
      row('Employee', fromName),
      row('Leave Type', leaveType),
      row('Start Date', startDate),
      row('End Date', endDate),
      row('Handover Notes', notes),
      row('Request ID', leaveId ? `#${leaveId}` : '—'),
    ])}
  `;
  const html = layout({
    title: 'Handover Assignment',
    preheader: `${fromName} assigned you as handover for their leave`,
    body,
  });
  return sendEmail({ to: toEmail, subject: `Handover: ${fromName} is on leave`, html });
}

async function sendLeaveSubmittedNotification({ toEmail, toName, fromName, leaveType, startDate, endDate, reason, leaveId, totalDays, handoverName }) {
  const body = `
    <p style="color:#333;font-size:15px;line-height:1.5;">Hello ${toName},</p>
    <p style="color:#333;font-size:15px;line-height:1.5;">A new leave request has been submitted by <strong>${fromName}</strong> and is awaiting your review.</p>
    ${detailTable([
      row('Employee', fromName),
      row('Leave Type', leaveType),
      row('Start Date', startDate),
      row('End Date', endDate),
      row('Duration', totalDays ? `${totalDays} day(s)` : '—'),
      row('Handover To', handoverName),
      row('Reason', reason),
      row('Request ID', leaveId ? `#${leaveId}` : '—'),
    ])}
  `;
  const html = layout({
    title: 'New Leave Request',
    preheader: `${fromName} submitted a leave request for your review`,
    body,
  });
  return sendEmail({ to: toEmail, subject: `Leave Request: ${fromName} - ${leaveType}`, html });
}

async function sendLeaveStatusNotification({ toEmail, toName, leaveType, status, reviewer, startDate, endDate, remark, leaveId, totalDays }) {
  const statusColor = status && status.toLowerCase() === 'approved' ? '#1a9d54' : '#d23b3b';
  const body = `
    <p style="color:#333;font-size:15px;line-height:1.5;">Hello ${toName},</p>
    <p style="color:#333;font-size:15px;line-height:1.5;">Your <strong>${leaveType}</strong> leave request has been <strong style="color:${statusColor};">${status}</strong> by ${reviewer}.</p>
    ${detailTable([
      row('Leave Type', leaveType),
      row('Duration', totalDays ? `${totalDays} day(s)` : '—'),
      row('Start Date', startDate),
      row('End Date', endDate),
      row('Status', status),
      row('Reviewed By', reviewer),
      row('Remark', remark),
      row('Request ID', leaveId ? `#${leaveId}` : '—'),
    ])}
  `;
  const html = layout({
    title: `Leave ${status}`,
    preheader: `Your ${leaveType} leave request was ${status}`,
    body,
  });
  return sendEmail({ to: toEmail, subject: `Leave ${status}: ${leaveType}`, html });
}

module.exports = { sendEmail, sendHandoverNotification, sendLeaveSubmittedNotification, sendLeaveStatusNotification };
