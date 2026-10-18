const test = require("node:test");
const assert = require("node:assert/strict");
require("./helpers");
const { resolveSelectedOptions } = require("../utils/productOptions");

const product = {
  name: { en: "T-Shirt", ar: "تيشيرت" },
  options: [
    { name: { en: "Color", ar: "اللون" }, values: [{ name: { en: "Red", ar: "أحمر" } }, { name: { en: "Blue", ar: "أزرق" } }] },
    { name: { en: "Size", ar: "المقاس" }, values: [{ name: { en: "M", ar: "وسط" } }, { name: { en: "L", ar: "كبير" } }] },
  ],
};

test("accepts a full valid selection and returns the product's own canonical text", () => {
  const out = resolveSelectedOptions(product, [
    { name: { en: "Size" }, value: { ar: "كبير" } }, // partial/other-language match
    { name: { en: "Color", ar: "x" }, value: { en: "Red", ar: "x" } },
  ]);
  assert.deepEqual(out, [
    { name: { en: "Color", ar: "اللون" }, value: { en: "Red", ar: "أحمر" } },
    { name: { en: "Size", ar: "المقاس" }, value: { en: "L", ar: "كبير" } },
  ]);
});

test("rejects missing groups with 400", () => {
  assert.throws(() => resolveSelectedOptions(product, [{ name: { en: "Color" }, value: { en: "Red" } }]), (e) => e.statusCode === 400 && /Size/.test(e.message));
  assert.throws(() => resolveSelectedOptions(product, []), (e) => e.statusCode === 400);
});

test("rejects unknown group, unknown value, duplicates", () => {
  assert.throws(() => resolveSelectedOptions(product, [{ name: { en: "Material" }, value: { en: "Wool" } }]), (e) => e.statusCode === 400);
  assert.throws(() => resolveSelectedOptions(product, [{ name: { en: "Color" }, value: { en: "Green" } }]), (e) => e.statusCode === 400);
  assert.throws(
    () => resolveSelectedOptions(product, [
      { name: { en: "Color" }, value: { en: "Red" } },
      { name: { en: "Color" }, value: { en: "Blue" } },
      { name: { en: "Size" }, value: { en: "M" } },
    ]),
    (e) => e.statusCode === 400,
  );
});

test("products without options: [] ok, arbitrary selections rejected", () => {
  assert.deepEqual(resolveSelectedOptions({ name: { en: "Card" }, options: [] }, []), []);
  assert.deepEqual(resolveSelectedOptions({ name: { en: "Card" } }, undefined), []);
  assert.throws(() => resolveSelectedOptions({ name: { en: "Card" }, options: [] }, [{ name: { en: "A" }, value: { en: "B" } }]), (e) => e.statusCode === 400);
});

test("empty strings never match an empty client value", () => {
  assert.throws(() => resolveSelectedOptions(product, [{ name: { en: "", ar: "" }, value: { en: "", ar: "" } }]), (e) => e.statusCode === 400);
});
