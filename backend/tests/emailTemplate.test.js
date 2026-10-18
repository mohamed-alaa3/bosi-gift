const test = require("node:test");
const assert = require("node:assert/strict");
require("./helpers");
const email = require("../services/email.service");
const { OTP } = require("../config/constants");

test("verification email: Bosi Gift branding, brand palette, Arabic copy, OTP digits, expiry from config", () => {
  const m = email.buildVerifyOtpEmail({ name: "منى <b>", otp: "042913" });
  assert.match(m.subject, /Bosi Gift/);
  assert.ok(!/habiba|حبيبة/i.test(m.html + m.text + m.subject));
  assert.ok(m.html.includes("#CA4562")); // brand primary
  assert.ok(m.html.includes('dir="rtl"'));
  for (const d of "042913") assert.ok(m.html.includes(`>${d}</td>`));
  assert.ok(m.html.includes(`${OTP.EXPIRY_MINUTES} دقائق`));
  assert.ok(m.text.includes("042913") && m.text.includes(String(OTP.EXPIRY_MINUTES)));
  assert.ok(!m.html.includes("منى <b>")); // name is escaped
  assert.ok(m.html.includes("منى &lt;b&gt;"));
  assert.ok(!/<script/i.test(m.html));
  assert.ok(!/localhost/.test(m.html));
});

test("inline logo is attached by cid and the asset exists", () => {
  const m = email.buildVerifyOtpEmail({ name: "", otp: "123456" });
  assert.equal(m.withLogo, true);
  assert.ok(m.html.includes('src="cid:bosi-gift-logo"'));
});

test("reset + password-changed emails are rebranded too", () => {
  for (const m of [email.buildResetOtpEmail({ name: "A", otp: "111111" }), email.buildPasswordChangedEmail({ name: "A" })]) {
    assert.ok(m.html.includes("Bosi Gift"));
    assert.ok(!/habiba|حبيبة/i.test(m.html + m.text + m.subject));
  }
});
