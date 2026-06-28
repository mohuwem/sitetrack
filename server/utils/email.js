const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendPasswordResetEmail(toEmail, resetLink) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM || "onboarding@resend.dev",
    to: toEmail,
    subject: "Reset your SiteTrack password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#1a1a1a;">Reset your password</h2>
        <p style="color:#555;">You requested a password reset for your SiteTrack account.</p>
        <p style="margin:24px 0;">
          <a href="${resetLink}"
             style="background:#f97316;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Reset password
          </a>
        </p>
        <p style="color:#888;font-size:13px;">
          This link expires in 1 hour. If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetEmail };
