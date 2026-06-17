const nodemailer = require('nodemailer');

let transporter = null;

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

async function sendHandoverNotification({ toEmail, toName, fromName, leaveType, startDate, endDate, notes }) {
  const html = `
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
  const html = `
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
  const html = `
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

module.exports = { sendEmail, sendHandoverNotification, sendLeaveSubmittedNotification, sendLeaveStatusNotification };
