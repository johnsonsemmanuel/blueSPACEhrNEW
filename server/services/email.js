const { Resend } = require('resend');

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

async function sendEmail({ to, subject, html }) {
  try {
    const client = getClient();
    if (!client) {
      console.log(`[email] Skipped (no API key): to=${to} subject="${subject}"`);
      return false;
    }
    await client.emails.send({
      from: process.env.RESEND_FROM || 'noreply@bluespacehr.com',
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

async function sendLeaveExtendedNotification({ toEmail, toName, leaveType, reviewer, oldEndDate, newEndDate, totalDays }) {
  const html = `
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
  const html = `
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
