const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.warn("GMAIL_USER / GMAIL_APP_PASSWORD not set — password reset emails will be logged, not sent.");
    return null;
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  return transporter;
}

async function sendPasswordResetEmail(toEmail, resetUrl) {
  const t = getTransporter();

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #0f766e;">HINDVED HEALTHCARE — Password Reset</h2>
      <p>We received a request to reset your Agent Console password.</p>
      <p>
        <a href="${resetUrl}" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
          Reset Password
        </a>
      </p>
      <p>This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.</p>
      <p style="color:#6b7280;font-size:12px;">If the button doesn't work, copy this link: ${resetUrl}</p>
    </div>
  `;

  if (!t) {
    console.log(`[mailer] (no SMTP configured) Reset link for ${toEmail}: ${resetUrl}`);
    return;
  }

  await t.sendMail({
    from: `HINDVED HEALTHCARE <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: "Reset your HINDVED HEALTHCARE password",
    html,
  });
}

module.exports = { sendPasswordResetEmail };
