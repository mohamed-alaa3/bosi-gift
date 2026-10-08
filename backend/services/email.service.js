const nodemailer = require("nodemailer");

/**
 * Email service — wraps nodemailer.
 *
 * Config comes from .env:
 *   EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS,
 *   EMAIL_FROM, EMAIL_FROM_NAME
 *
 * If EMAIL_PASS is missing, we fall back to logging the message to the console.
 */

const BRAND_COLOR = "#F58220";
const BRAND_COLOR_DARK = "#E0700E";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS } =
    process.env;

  if (!EMAIL_USER || !EMAIL_PASS || !EMAIL_HOST) {
    return null; // dev fallback
  }

  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT) || 465,
    secure: String(EMAIL_SECURE).toLowerCase() === "true",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  return transporter;
}

function getFromAddress() {
  const name = process.env.EMAIL_FROM_NAME || "Habiba Gift Store";
  const email =
    process.env.EMAIL_FROM || process.env.EMAIL_USER || "no-reply@habiba.local";
  return `"${name}" <${email}>`;
}

/**
 * Shared HTML wrapper — matches the store's warm brand look.
 */
function wrapHtml(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;color:#2E2E2E;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg, ${BRAND_COLOR} 0%, ${BRAND_COLOR_DARK} 100%);padding:28px 32px;text-align:center;">
              <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">
                Habiba <span style="font-weight:400;">Gift Store</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #eee;text-align:center;font-size:12px;color:#999;">
              © ${new Date().getFullYear()} Habiba Gift Store. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildOtpBoxes(otp) {
  return otp
    .split("")
    .map(
      (digit) =>
        `<span style="display:inline-block;width:38px;height:48px;line-height:48px;margin:0 3px;background:#FFF7ED;border:1.5px solid ${BRAND_COLOR};border-radius:10px;font-size:24px;font-weight:700;color:#2E2E2E;text-align:center;">${digit}</span>`,
    )
    .join("");
}

// ─── Password reset OTP ────────────────────────────────────────
function buildResetOtpHtml({ name, otp }) {
  const greeting = name ? `Hi ${name},` : "Hi there,";

  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#2E2E2E;">Reset your password</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#555;">${greeting}</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#555;">
      We received a request to reset your Habiba Gift Store password. Use the code below to continue. It expires in <strong>10 minutes</strong>.
    </p>

    <div style="text-align:center;margin:28px 0;">${buildOtpBoxes(otp)}</div>

    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#777;">
      If you didn't request a password reset, you can safely ignore this email.
    </p>

    <hr style="border:none;border-top:1px solid #eee;margin:28px 0;" />

    <div dir="rtl" style="text-align:right;">
      <h2 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#2E2E2E;">إعادة تعيين كلمة المرور</h2>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#555;">مرحباً${name ? " " + name : ""}،</p>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#555;">
        وصلنا طلب لإعادة تعيين كلمة المرور الخاصة بحسابك في متجر حبيبة. استخدم الرمز أعلاه للمتابعة. تنتهي صلاحيته خلال <strong>10 دقائق</strong>.
      </p>
      <p style="margin:0;font-size:13px;line-height:1.7;color:#777;">
        إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد بأمان.
      </p>
    </div>
  `;

  return wrapHtml("Reset your password — Habiba Gift Store", body);
}

// ─── Email verification OTP ────────────────────────────────────
function buildVerifyOtpHtml({ name, otp }) {
  const greeting = name ? `Hi ${name},` : "Hi there,";

  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#2E2E2E;">Verify your email</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#555;">${greeting}</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#555;">
      Welcome to Habiba Gift Store! Use the code below to verify your email address and activate your account. It expires in <strong>10 minutes</strong>.
    </p>

    <div style="text-align:center;margin:28px 0;">${buildOtpBoxes(otp)}</div>

    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#777;">
      If you didn't create an account with us, you can safely ignore this email.
    </p>

    <hr style="border:none;border-top:1px solid #eee;margin:28px 0;" />

    <div dir="rtl" style="text-align:right;">
      <h2 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#2E2E2E;">تأكيد البريد الإلكتروني</h2>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#555;">مرحباً${name ? " " + name : ""}،</p>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#555;">
        أهلاً بك في متجر حبيبة! استخدم الرمز أعلاه لتأكيد بريدك الإلكتروني وتفعيل حسابك. تنتهي صلاحيته خلال <strong>10 دقائق</strong>.
      </p>
      <p style="margin:0;font-size:13px;line-height:1.7;color:#777;">
        إذا لم تقم بإنشاء حساب معنا، يمكنك تجاهل هذا البريد بأمان.
      </p>
    </div>
  `;

  return wrapHtml("Verify your email — Habiba Gift Store", body);
}

// ─── Password changed confirmation ─────────────────────────────
function buildPasswordChangedHtml({ name }) {
  const greeting = name ? `Hi ${name},` : "Hi there,";

  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#2E2E2E;">Password updated</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#555;">${greeting}</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#555;">
      Your Habiba Gift Store password was changed successfully. If this wasn't you, please contact us immediately.
    </p>

    <hr style="border:none;border-top:1px solid #eee;margin:28px 0;" />

    <div dir="rtl" style="text-align:right;">
      <h2 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#2E2E2E;">تم تحديث كلمة المرور</h2>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#555;">مرحباً${name ? " " + name : ""}،</p>
      <p style="margin:0;font-size:14px;line-height:1.7;color:#555;">
        تم تغيير كلمة المرور الخاصة بحسابك في متجر حبيبة بنجاح. إذا لم تكن أنت من قام بذلك، يرجى التواصل معنا فوراً.
      </p>
    </div>
  `;

  return wrapHtml("Password updated — Habiba Gift Store", body);
}

async function sendMail({ to, subject, html, devPreview }) {
  const t = getTransporter();

  if (!t) {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📧 [DEV EMAIL] ${subject}`);
    console.log(`   To: ${to}`);
    if (devPreview) {
      console.log("   ─────────────────────────────────");
      console.log(devPreview);
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    return;
  }

  await t.sendMail({
    from: getFromAddress(),
    to,
    subject,
    html,
  });
}

/**
 * Public API
 */
async function sendPasswordResetOtp({ to, name, otp }) {
  await sendMail({
    to,
    subject: "Your Habiba Gift Store password reset code",
    html: buildResetOtpHtml({ name, otp }),
    devPreview: `   🔑 Reset OTP: ${otp}\n   ⏱️  Expires in 10 minutes`,
  });
}

async function sendEmailVerificationOtp({ to, name, otp }) {
  await sendMail({
    to,
    subject: "Verify your email — Habiba Gift Store",
    html: buildVerifyOtpHtml({ name, otp }),
    devPreview: `   🔑 Verify OTP: ${otp}\n   ⏱️  Expires in 10 minutes`,
  });
}

async function sendPasswordChangedConfirmation({ to, name }) {
  await sendMail({
    to,
    subject: "Your Habiba Gift Store password was changed",
    html: buildPasswordChangedHtml({ name }),
    devPreview: `   ✅ Password changed successfully for ${name || to}`,
  });
}

module.exports = {
  sendPasswordResetOtp,
  sendEmailVerificationOtp,
  sendPasswordChangedConfirmation,
};
