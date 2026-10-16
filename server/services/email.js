const { Resend } = require('resend');
const pool = require('../config/database');

// BlueSPACE HR logo (dark variant, for light backgrounds), embedded for email clients.
const LOGO_BASE64 = "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";

function emailHeader() {
  return `<p style="text-align:center;margin:0 0 16px;"><img src="data:image/png;base64,${LOGO_BASE64}" alt="BlueSPACE HR" style="height:34px;width:auto;"></p>`;
}

let resend = null;

function getClient() {
  if (resend) return resend;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured — email sending disabled');
    return null;
  }
  resend = new Resend(apiKey);
  return resend;
}

async function logEmail(to, subject, status, errorMessage) {
  try {
    await pool.query(
      'INSERT INTO email_logs (to_email, subject, status, error_message, created_at) VALUES (?, ?, ?, ?, NOW())',
      [to, subject, status, errorMessage || null]
    );
  } catch (err) {
    console.error('[email-log] Failed to log email:', err.message);
  }
}

async function sendEmail({ to, subject, html }) {
  try {
    const client = getClient();
    if (!client) {
      console.log(`[email] Skipped (no API key): to=${to} subject="${subject}"`);
      await logEmail(to, subject, 'skipped', 'No API key configured');
      return false;
    }
    await client.emails.send({
      from: process.env.RESEND_FROM || 'noreply@bluespacehr.com',
      to,
      subject,
      html,
    });
    console.log(`[email] Sent to ${to}: "${subject}"`);
    await logEmail(to, subject, 'sent', null);
    return true;
  } catch (err) {
    console.error('[email] Error:', err.message);
    await logEmail(to, subject, 'failed', err.message);
    return false;
  }
}

async function sendHandoverNotification({ toEmail, toName, fromName, leaveType, startDate, endDate, notes }) {
  const html = `${emailHeader()}
    <h2>Handover Assignment</h2>
    <p>Hello ${toName},</p>
    <p><strong>${fromName}</strong> has assigned you as their handover during their upcoming leave.</p>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;">
      <tr><td><strong>Leave Type</strong></td><td>${leaveType}</td></tr>
      <tr><td><strong>Start Date</strong></td><td>${startDate}</td></tr>
      <tr><td><strong>End Date</strong></td><td>${endDate}</td></tr>
      ${notes ? `<tr><td><strong>Handover Notes</strong></td><td>${notes}</td></tr>` : ''}
    </table>
    <p>Please coordinate with them before their leave begins.</p>
    <hr>
    <p style="color:#888;font-size:12px;">BlueSPACE HR System</p>
  `;
  return sendEmail({ to: toEmail, subject: `Handover: ${fromName} is on leave`, html });
}

async function sendLeaveSubmittedNotification({ toEmail, toName, fromName, leaveType, startDate, endDate, reason }) {
  const html = `${emailHeader()}
    <h2>New Leave Request</h2>
    <p>Hello ${toName},</p>
    <p><strong>${fromName}</strong> has submitted a new leave request for your review.</p>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;">
      <tr><td><strong>Leave Type</strong></td><td>${leaveType}</td></tr>
      <tr><td><strong>Start Date</strong></td><td>${startDate}</td></tr>
      <tr><td><strong>End Date</strong></td><td>${endDate}</td></tr>
      ${reason ? `<tr><td><strong>Reason</strong></td><td>${reason}</td></tr>` : ''}
    </table>
    <p>Please review this request in the system.</p>
    <hr>
    <p style="color:#888;font-size:12px;">BlueSPACE HR System</p>
  `;
  return sendEmail({ to: toEmail, subject: `Leave Request: ${fromName} - ${leaveType}`, html });
}

async function sendLeaveStatusNotification({ toEmail, toName, leaveType, status, reviewer, startDate, endDate, remark }) {
  const html = `${emailHeader()}
    <h2>Leave ${status}</h2>
    <p>Hello ${toName},</p>
    <p>Your <strong>${leaveType}</strong> leave request has been <strong>${status.toLowerCase()}</strong> by ${reviewer}.</p>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;">
      <tr><td><strong>Start Date</strong></td><td>${startDate}</td></tr>
      <tr><td><strong>End Date</strong></td><td>${endDate}</td></tr>
      ${remark ? `<tr><td><strong>Remark</strong></td><td>${remark}</td></tr>` : ''}
    </table>
    <hr>
    <p style="color:#888;font-size:12px;">BlueSPACE HR System</p>
  `;
  return sendEmail({ to: toEmail, subject: `Leave ${status}: ${leaveType}`, html });
}

async function sendLeaveExtendedNotification({ toEmail, toName, leaveType, reviewer, oldEndDate, newEndDate, totalDays }) {
  const html = `${emailHeader()}
    <h2>Leave Extended</h2>
    <p>Hello ${toName},</p>
    <p>Your <strong>${leaveType}</strong> leave has been <strong>extended</strong> by ${reviewer}.</p>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;">
      <tr><td><strong>Previous End Date</strong></td><td>${oldEndDate}</td></tr>
      <tr><td><strong>New End Date</strong></td><td>${newEndDate}</td></tr>
      <tr><td><strong>Total Days</strong></td><td>${totalDays}</td></tr>
    </table>
    <hr>
    <p style="color:#888;font-size:12px;">BlueSPACE HR System</p>
  `;
  return sendEmail({ to: toEmail, subject: `Leave Extended: ${leaveType}`, html });
}

async function sendPasswordResetNotification({ toEmail, toName, newPassword }) {
  const html = `${emailHeader()}
    <h2>Password Reset</h2>
    <p>Hello ${toName},</p>
    <p>Your password has been reset by an administrator.</p>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;">
      <tr><td><strong>New Password</strong></td><td>${newPassword}</td></tr>
    </table>
    <p>You will be prompted to set a new password on your next login.</p>
    <p><a href="https://hr.bihlabs.com" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">Login to System</a></p>
    <hr>
    <p style="color:#888;font-size:12px;">BlueSPACE HR System</p>
  `;
  return sendEmail({ to: toEmail, subject: 'Password Reset - BlueSPACE HR', html });
}

module.exports = { sendEmail, sendHandoverNotification, sendLeaveSubmittedNotification, sendLeaveStatusNotification, sendLeaveExtendedNotification, sendPasswordResetNotification };
