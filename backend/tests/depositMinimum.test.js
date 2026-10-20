require("./helpers");
const test = require("node:test");
const assert = require("node:assert/strict");

const { computePricing } = require("../services/orderPricing.service");
const { validatePatch } = require("../services/setting.service");
const { normalizeEgyptMobile } = require("../utils/egyptPayment");
const { createOrderValidator } = require("../validators/order.validator");
const Setting = require("../models/Setting");

const price = (subtotal, extra = {}) =>
  computePricing({
    subtotal,
    shippingFee: 0,
    paymentMethod: "deposit",
    depositAmount: 100,
    depositMinOrderAmount: 200,
    ...extra,
  });

test("deposit eligibility at the EGP 200 threshold", () => {
  assert.equal(price(150).depositEligible, false);
  assert.equal(price(199.99).depositEligible, false);
  assert.equal(price(200).depositEligible, true);
  assert.equal(price(350).depositEligible, true);
});

test("coupon dropping the total from 250 to 180 makes deposit ineligible", () => {
  assert.equal(price(250).depositEligible, true);
  assert.equal(price(250, { couponDiscount: 70 }).depositEligible, false);
});

test("shipping counts toward the final total", () => {
  assert.equal(price(170, { shippingFee: 30 }).depositEligible, true);
});

test("deposit amount calculation is unchanged by the threshold", () => {
  const p = price(350);
  assert.equal(p.amountDueNow, 100);
  assert.equal(p.remainingAmount, 250);
});

test("changing the threshold changes eligibility", () => {
  assert.equal(price(250, { depositMinOrderAmount: 300 }).depositEligible, false);
  assert.equal(price(50, { depositMinOrderAmount: 0 }).depositEligible, true);
});

test("Setting default is 200 for documents without the field", () => {
  const doc = new Setting({ key: "global" });
  assert.equal(doc.payment.depositMinOrderAmount, 200);
  assert.equal(doc.payment.depositAmount, 100);
});

test("admin patch validates depositMinOrderAmount", () => {
  const ok = validatePatch({ payment: { depositMinOrderAmount: 250.456 } });
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.value.payment.depositMinOrderAmount, 250.46);
  assert.equal(validatePatch({ payment: { depositMinOrderAmount: 0 } }).errors.length, 0);

  for (const bad of [-1, NaN, Infinity, "200", null, 2000000]) {
    const r = validatePatch({ payment: { depositMinOrderAmount: bad } });
    assert.equal(r.errors.length, 1, `should reject ${String(bad)}`);
  }
});

test("Egyptian mobile normalisation", () => {
  for (const v of ["01012345678", "01112345678", "01212345678", "01512345678", "+201012345678", "00201012345678", "010 1234 5678"]) {
    assert.match(normalizeEgyptMobile(v), /^01[0125]\d{8}$/, v);
  }
  for (const v of ["01312345678", "0101234567", "010123456789", "abc", ""]) {
    assert.equal(normalizeEgyptMobile(v), null, v);
  }
});

async function runValidators(body) {
  const req = { body, headers: {}, query: {}, params: {}, cookies: {} };
  for (const v of createOrderValidator) {
    if (typeof v.run === "function") await v.run(req);
  }
  const { validationResult } = require("express-validator");
  return { req, errors: validationResult(req).array() };
}

const baseBody = (phone) => ({
  paymentMethod: "cod",
  amountDueNow: 0,
  shippingAddress: {
    fullName: "Test", phone, country: "Egypt", city: "Cairo",
    street: "1 St", governorate: "cairo",
  },
});

test("order validator rejects invalid phone and normalises valid one", async () => {
  const bad = await runValidators(baseBody("01312345678"));
  assert.ok(bad.errors.some((e) => e.path === "shippingAddress.phone"));

  const good = await runValidators(baseBody("+20 101 234 5678"));
  assert.ok(!good.errors.some((e) => e.path === "shippingAddress.phone"));
  assert.equal(good.req.body.shippingAddress.phone, "01012345678");

  const missing = await runValidators(baseBody(""));
  assert.ok(missing.errors.some((e) => e.path === "shippingAddress.phone"));
});
