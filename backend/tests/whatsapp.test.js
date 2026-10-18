const test = require("node:test");
const assert = require("node:assert/strict");
require("./helpers");
const { buildOrderMessage } = require("../services/whatsappMessage.service");

const SCREENSHOT = "تم رفع";

function baseOrder(extra = {}) {
  return {
    orderNumber: "BG-1001",
    shippingAddress: { fullName: "منى", phone: "01000000000", street: "ش النيل", city: "القاهرة", country: "مصر" },
    items: [
      {
        type: "product",
        nameSnapshot: { en: "Mug", ar: "كوب" },
        quantity: 2,
        subtotal: 200,
        selectedOptions: [
          { name: { en: "Color", ar: "اللون" }, value: { en: "Red", ar: "أحمر" } },
          { name: { en: "Size", ar: "المقاس" }, value: { en: "L", ar: "كبير" } },
        ],
      },
      { type: "product", nameSnapshot: { en: "Card", ar: "كارت" }, quantity: 1, subtotal: 20, selectedOptions: [] },
      { type: "product", nameSnapshot: { en: "Mug", ar: "كوب" }, quantity: 1, subtotal: 100,
        selectedOptions: [{ name: { en: "Color", ar: "اللون" }, value: { en: "Blue", ar: "أزرق" } }] },
    ],
    subtotal: 320, shippingFee: 50, tax: 0, discount: 0, paymentDiscount: 0, total: 370,
    paymentStatus: "pending",
    ...extra,
  };
}

test("COD: no screenshot confirmation, shows amount due on delivery", () => {
  const msg = buildOrderMessage(baseOrder({ paymentMethod: "cod", amountDueNow: 0, remainingAmount: 0, hasPaymentProof: false }));
  assert.ok(!msg.includes(SCREENSHOT), msg);
  assert.ok(!msg.includes("إثبات"), msg);
  assert.ok(msg.includes("الدفع عند الاستلام"));
  assert.ok(msg.includes("المطلوب عند الاستلام"));
});

test("COD: stays clean even if a stray proof flag exists", () => {
  const msg = buildOrderMessage(baseOrder({ paymentMethod: "cod", hasPaymentProof: true, paymentProofUploadedAt: new Date() }));
  assert.ok(!msg.includes(SCREENSHOT));
});

test("Full advance + uploaded proof: confirmation present, marked under review, not 'verified'", () => {
  const msg = buildOrderMessage(baseOrder({ paymentMethod: "full", amountDueNow: 370, remainingAmount: 0, hasPaymentProof: true }));
  assert.ok(msg.includes(SCREENSHOT));
  assert.ok(msg.includes("قيد المراجعة"));
  assert.ok(msg.includes("دفع كامل مقدمًا"));
  assert.ok(!msg.includes("المبلغ المدفوع مقدمًا")); // pending → not claimed as paid
});

test("Full advance without saved proof: no confirmation", () => {
  const msg = buildOrderMessage(baseOrder({ paymentMethod: "full", amountDueNow: 370, hasPaymentProof: false }));
  assert.ok(!msg.includes(SCREENSHOT));
});

test("Partial advance + proof: separates advance from remaining balance", () => {
  const msg = buildOrderMessage(baseOrder({ paymentMethod: "deposit", amountDueNow: 100, remainingAmount: 270, hasPaymentProof: true }));
  assert.ok(msg.includes(SCREENSHOT));
  assert.ok(msg.includes("العربون المحوّل (قيد المراجعة)"));
  assert.ok(msg.includes("100 ج.م"));
  assert.ok(msg.includes("الباقي عند الاستلام: 270 ج.م"));
  assert.ok(!msg.includes("الباقي المدفوع"));
});

test("Partial advance without saved proof: no confirmation", () => {
  const msg = buildOrderMessage(baseOrder({ paymentMethod: "deposit", amountDueNow: 100, remainingAmount: 270, hasPaymentProof: false }));
  assert.ok(!msg.includes(SCREENSHOT));
});

test("Verified payment status is reflected, never inferred from the upload", () => {
  const msg = buildOrderMessage(baseOrder({ paymentMethod: "full", amountDueNow: 370, hasPaymentProof: true, paymentStatus: "paid" }));
  assert.ok(msg.includes("المبلغ المدفوع مقدمًا"));
});

test("Selected options appear per line; same product with different variants stays distinct", () => {
  const msg = buildOrderMessage(baseOrder({ paymentMethod: "cod" }));
  assert.ok(msg.includes("اللون: أحمر، المقاس: كبير"));
  assert.ok(msg.includes("اللون: أزرق"));
  assert.equal((msg.match(/كوب ×/g) || []).length, 2);
});

test("Header uses the Bosi Gift brand", () => {
  const msg = buildOrderMessage(baseOrder({ paymentMethod: "cod" }));
  assert.ok(msg.includes("Bosi Gift"));
  assert.ok(!/حبيبة|Habiba/i.test(msg));
});

test("Legacy order items without selectedOptions render fine", () => {
  const o = baseOrder({ paymentMethod: "cod" });
  delete o.items[0].selectedOptions;
  assert.doesNotThrow(() => buildOrderMessage(o));
});
