const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const { OTP } = require("../config/constants");

/**
 * Email service — wraps nodemailer.
 *
 * Config comes from .env:
 *   EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS,
 *   EMAIL_FROM, EMAIL_FROM_NAME
 *
 * If EMAIL_PASS is missing, we fall back to logging the message to the console
 * (development only).
 */

const BRAND_NAME = "Bosi Gift";

// Bosi Gift palette (mirrors frontend/src/styles/_variables.scss)
const COLORS = {
  primary: "#CA4562", // --brand-primary
  primaryDark: "#B33A55", // --brand-primary-hover
  primarySoft: "#FFF0F3", // --brand-primary-soft
  pink: "#F7A1B0", // --brand-pink
  ink: "#1F3F40", // --brand-ink
  inkSoft: "#3E5E5F", // --brand-ink-soft
  teal: "#1F6A6A", // --brand-secondary
  tealSoft: "#E6F3F2", // --brand-secondary-soft
  page: "#FBF6F5",
  muted: "#6B7F80",
  border: "#F3D9DF",
};

const FONT_STACK = "'Segoe UI',Tahoma,Arial,'Helvetica Neue',sans-serif";

// Small optimised copy of the official logo, attached inline (cid) so it
// renders without depending on any publicly hosted asset.
const LOGO_PATH = path.join(__dirname, "..", "assets", "email", "bosi-logo.png");
const LOGO_CID = "bosi-gift-logo";

function logoAvailable() {
  try {
    return fs.existsSync(LOGO_PATH);
  } catch {
    return false;
  }
}

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
  const name = process.env.EMAIL_FROM_NAME || BRAND_NAME;
  const email =
    process.env.EMAIL_FROM || process.env.EMAIL_USER || "no-reply@localhost";
  return `"${name}" <${email}>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Shared HTML wrapper — Bosi Gift look (pink/teal, white card).
 * Table layout + inline CSS only, so it holds up in Gmail/Outlook/Apple Mail.
 *
 * @param {object} opts
 * @param {string} opts.title       <title> text
 * @param {string} opts.preheader   hidden inbox-preview text
 * @param {string} opts.bodyHtml    inner content
 * @param {boolean} opts.withLogo   whether the inline logo is attached
 */
function wrapHtml({ title, preheader = "", bodyHtml, withLogo = false }) {
  const header = withLogo
    ? `<img src="cid:${LOGO_CID}" width="110" alt="${BRAND_NAME}" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;height:auto;" />`
    : `<div style="font-family:${FONT_STACK};font-size:28px;font-weight:700;color:${COLORS.primary};letter-spacing:0.5px;">${BRAND_NAME}</div>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.page};font-family:${FONT_STACK};color:${COLORS.ink};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${COLORS.page};font-size:1px;line-height:1px;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.page}" style="background-color:${COLORS.page};">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid ${COLORS.border};border-radius:20px;">
          <tr>
            <td height="6" bgcolor="${COLORS.primary}" style="background-color:${COLORS.primary};height:6px;line-height:6px;font-size:0;border-radius:20px 20px 0 0;">&nbsp;</td>
          </tr>
          <tr>
            <td align="center" bgcolor="${COLORS.primarySoft}" style="background-color:${COLORS.primarySoft};padding:24px 24px 16px;">
              ${header}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:18px 28px 26px;border-top:1px solid ${COLORS.border};font-family:${FONT_STACK};font-size:12px;line-height:1.7;color:${COLORS.muted};">
              <div dir="ltr">&copy; ${new Date().getFullYear()} ${BRAND_NAME}</div>
              <div>هذه رسالة آلية، يرجى عدم الرد عليها.</div>
              <div dir="ltr">This is an automated message, please do not reply.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * One table cell per digit — wraps reliably on narrow screens and keeps the
 * code copyable. (Inline-block spans are unreliable in Outlook.)
 */
function buildOtpBoxes(otp) {
  const cells = String(otp)
    .split("")
    .map(
      (digit) =>
        `<td align="center" width="44" height="54" bgcolor="${COLORS.primarySoft}" style="width:44px;height:54px;background-color:${COLORS.primarySoft};border:2px solid ${COLORS.primary};border-radius:12px;font-family:'Courier New',Courier,monospace;font-size:26px;font-weight:700;color:${COLORS.ink};">${escapeHtml(digit)}</td><td width="6" style="width:6px;font-size:0;line-height:0;">&nbsp;</td>`,
    )
    .join("");

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" dir="ltr" style="margin:0 auto;"><tr>${cells}</tr></table>`;
}

function paragraph(text, { size = 15, color = COLORS.inkSoft, mb = 16 } = {}) {
  return `<p style="margin:0 0 ${mb}px;font-family:${FONT_STACK};font-size:${size}px;line-height:1.9;color:${color};">${text}</p>`;
}

function heading(text) {
  return `<h1 style="margin:0 0 14px;font-family:${FONT_STACK};font-size:24px;line-height:1.4;font-weight:700;color:${COLORS.ink};">${text}</h1>`;
}

/** Compact English mirror shown under the Arabic copy. */
function englishBlock(innerHtml) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="ltr" style="margin-top:8px;"><tr><td style="border-top:1px solid ${COLORS.border};padding-top:16px;font-family:${FONT_STACK};font-size:13px;line-height:1.7;color:${COLORS.muted};text-align:left;">${innerHtml}</td></tr></table>`;
}

function codeCard(otp) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 22px;"><tr><td align="center" bgcolor="${COLORS.tealSoft}" style="background-color:${COLORS.tealSoft};border-radius:16px;padding:22px 12px;">
    <div style="font-family:${FONT_STACK};font-size:13px;font-weight:700;color:${COLORS.teal};margin-bottom:12px;">رمز التحقق</div>
    ${buildOtpBoxes(otp)}
  </td></tr></table>`;
}

function greetingAr(name) {
  return name ? `مرحباً ${escapeHtml(name)}،` : "مرحباً بك،";
}

// ─── Email verification OTP ────────────────────────────────────
function buildVerifyOtpEmail({ name, otp }) {
  const minutes = OTP.EXPIRY_MINUTES;
  const withLogo = logoAvailable();

  const body = `
    ${heading("أهلاً بك في Bosi Gift 🎁")}
    ${paragraph(greetingAr(name), { mb: 8 })}
    ${paragraph("شكراً لتسجيلك معنا! لتفعيل حسابك، يرجى تأكيد بريدك الإلكتروني بإدخال الرمز التالي في صفحة التحقق على الموقع:")}
    ${codeCard(otp)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;"><tr><td bgcolor="${COLORS.primarySoft}" style="background-color:${COLORS.primarySoft};border-right:4px solid ${COLORS.primary};border-radius:8px;padding:12px 16px;font-family:${FONT_STACK};font-size:14px;line-height:1.8;color:${COLORS.ink};">
      ⏱️ ينتهي هذا الرمز خلال <strong>${minutes} دقائق</strong>. لا تشاركه مع أي شخص — فريق Bosi Gift لن يطلبه منك أبداً.
    </td></tr></table>
    ${paragraph("إذا لم تقم بإنشاء حساب في Bosi Gift، يمكنك تجاهل هذه الرسالة بأمان.", { size: 13, color: COLORS.muted, mb: 20 })}
    ${englishBlock(`
      <strong style="color:${COLORS.ink};">Welcome to ${BRAND_NAME}!</strong><br />
      ${name ? `Hi ${escapeHtml(name)}, use` : "Use"} the code above to verify your email address and activate your account.
      It expires in <strong>${minutes} minutes</strong>. If you didn't create an account, you can safely ignore this email.
    `)}
  `;

  const html = wrapHtml({
    title: `تأكيد البريد الإلكتروني — ${BRAND_NAME}`,
    preheader: `رمز التحقق الخاص بك هو ${otp} — صالح لمدة ${minutes} دقائق`,
    bodyHtml: body,
    withLogo,
  });

  const text = [
    `أهلاً بك في ${BRAND_NAME}!`,
    "",
    name ? `مرحباً ${name}،` : "مرحباً بك،",
    "لتفعيل حسابك، أدخل رمز التحقق التالي في صفحة التحقق على الموقع:",
    "",
    `    ${otp}`,
    "",
    `ينتهي هذا الرمز خلال ${minutes} دقائق. لا تشاركه مع أي شخص.`,
    "إذا لم تقم بإنشاء حساب، يمكنك تجاهل هذه الرسالة.",
    "",
    "—",
    `Welcome to ${BRAND_NAME}! Use the code above to verify your email address.`,
    `It expires in ${minutes} minutes. If you didn't create an account, ignore this email.`,
  ].join("\n");

  return {
    subject: `تأكيد البريد الإلكتروني — ${BRAND_NAME}`,
    html,
    text,
    withLogo,
  };
}

// ─── Password reset OTP ────────────────────────────────────────
function buildResetOtpEmail({ name, otp }) {
  const minutes = OTP.EXPIRY_MINUTES;
  const withLogo = logoAvailable();

  const body = `
    ${heading("إعادة تعيين كلمة المرور")}
    ${paragraph(greetingAr(name), { mb: 8 })}
    ${paragraph(`وصلنا طلب لإعادة تعيين كلمة المرور الخاصة بحسابك في ${BRAND_NAME}. استخدم الرمز التالي للمتابعة:`)}
    ${codeCard(otp)}
    ${paragraph(`ينتهي هذا الرمز خلال <strong>${minutes} دقائق</strong>. إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان.`, { size: 13, color: COLORS.muted, mb: 20 })}
    ${englishBlock(`
      <strong style="color:${COLORS.ink};">Reset your password</strong><br />
      We received a request to reset your ${BRAND_NAME} password. Use the code above — it expires in <strong>${minutes} minutes</strong>.
      If you didn't request this, you can safely ignore this email.
    `)}
  `;

  const html = wrapHtml({
    title: `إعادة تعيين كلمة المرور — ${BRAND_NAME}`,
    preheader: `رمز إعادة التعيين: ${otp} — صالح لمدة ${minutes} دقائق`,
    bodyHtml: body,
    withLogo,
  });

  const text = [
    `إعادة تعيين كلمة المرور — ${BRAND_NAME}`,
    "",
    `رمز إعادة التعيين: ${otp}`,
    `ينتهي خلال ${minutes} دقائق. إذا لم تطلب ذلك، تجاهل هذه الرسالة.`,
    "",
    `Your ${BRAND_NAME} password reset code is ${otp} (expires in ${minutes} minutes).`,
  ].join("\n");

  return {
    subject: `رمز إعادة تعيين كلمة المرور — ${BRAND_NAME}`,
    html,
    text,
    withLogo,
  };
}

// ─── Password changed confirmation ─────────────────────────────
function buildPasswordChangedEmail({ name }) {
  const withLogo = logoAvailable();

  const body = `
    ${heading("تم تحديث كلمة المرور")}
    ${paragraph(greetingAr(name), { mb: 8 })}
    ${paragraph(`تم تغيير كلمة المرور الخاصة بحسابك في ${BRAND_NAME} بنجاح. إذا لم تكن أنت من قام بذلك، يرجى التواصل معنا فوراً.`, { mb: 20 })}
    ${englishBlock(`
      <strong style="color:${COLORS.ink};">Password updated</strong><br />
      Your ${BRAND_NAME} password was changed successfully. If this wasn't you, please contact us immediately.
    `)}
  `;

  const html = wrapHtml({
    title: `تم تحديث كلمة المرور — ${BRAND_NAME}`,
    preheader: "تم تغيير كلمة المرور الخاصة بحسابك",
    bodyHtml: body,
    withLogo,
  });

  const text = [
    `تم تغيير كلمة المرور الخاصة بحسابك في ${BRAND_NAME} بنجاح.`,
    "إذا لم تكن أنت من قام بذلك، يرجى التواصل معنا فوراً.",
    "",
    `Your ${BRAND_NAME} password was changed. If this wasn't you, contact us immediately.`,
  ].join("\n");

  return {
    subject: `تم تغيير كلمة المرور — ${BRAND_NAME}`,
    html,
    text,
    withLogo,
  };
}

async function sendMail({ to, subject, html, text, withLogo, devPreview }) {
  const t = getTransporter();

  if (!t) {
    // Dev fallback only — never print codes in production logs.
    if (process.env.NODE_ENV !== "production") {
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`📧 [DEV EMAIL] ${subject}`);
      console.log(`   To: ${to}`);
      if (devPreview) {
        console.log("   ─────────────────────────────────");
        console.log(devPreview);
      }
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    }
    return;
  }

  await t.sendMail({
    from: getFromAddress(),
    to,
    subject,
    html,
    text,
    attachments: withLogo
      ? [
          {
            filename: "bosi-gift-logo.png",
            path: LOGO_PATH,
            cid: LOGO_CID,
            contentDisposition: "inline",
          },
        ]
      : [],
  });
}

/**
 * Public API
 */
async function sendPasswordResetOtp({ to, name, otp }) {
  const mail = buildResetOtpEmail({ name, otp });
  await sendMail({
    to,
    ...mail,
    devPreview: `   🔑 Reset OTP: ${otp}\n   ⏱️  Expires in ${OTP.EXPIRY_MINUTES} minutes`,
  });
}

async function sendEmailVerificationOtp({ to, name, otp }) {
  const mail = buildVerifyOtpEmail({ name, otp });
  await sendMail({
    to,
    ...mail,
    devPreview: `   🔑 Verify OTP: ${otp}\n   ⏱️  Expires in ${OTP.EXPIRY_MINUTES} minutes`,
  });
}

async function sendPasswordChangedConfirmation({ to, name }) {
  const mail = buildPasswordChangedEmail({ name });
  await sendMail({
    to,
    ...mail,
    devPreview: `   ✅ Password changed successfully for ${name || to}`,
  });
}

module.exports = {
  sendPasswordResetOtp,
  sendEmailVerificationOtp,
  sendPasswordChangedConfirmation,
  // exposed for rendering/tests
  buildVerifyOtpEmail,
  buildResetOtpEmail,
  buildPasswordChangedEmail,
};
