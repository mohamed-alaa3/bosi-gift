/**
 * Canonical list of the 27 Egyptian governorates.
 *
 * - `key`      stable identifier (never rename after launch)
 * - `name`     { en, ar } display names
 * - `region`   grouping used by the admin UI
 * - `fee`      default shipping fee (EGP) — admin can override
 * - `enabled`  default shipping availability — admin can override
 *
 * Only `fee` and `enabled` are editable in the admin Settings page.
 */

const REGIONS = {
  MAJOR: "major",
  DELTA: "delta",
  UPPER: "upper",
  FRONTIER: "frontier",
};

const GOVERNORATES = [
  // ─── Major cities (40 EGP) ──────────────────────────────
  {
    key: "cairo",
    name: { en: "Cairo", ar: "القاهرة" },
    region: REGIONS.MAJOR,
    fee: 40,
    enabled: true,
  },
  {
    key: "giza",
    name: { en: "Giza", ar: "الجيزة" },
    region: REGIONS.MAJOR,
    fee: 40,
    enabled: true,
  },
  {
    key: "alexandria",
    name: { en: "Alexandria", ar: "الإسكندرية" },
    region: REGIONS.MAJOR,
    fee: 40,
    enabled: true,
  },

  // ─── Delta & Canal (50 EGP) ─────────────────────────────
  {
    key: "dakahlia",
    name: { en: "Dakahlia", ar: "الدقهلية" },
    region: REGIONS.DELTA,
    fee: 50,
    enabled: true,
  },
  {
    key: "sharqia",
    name: { en: "Sharqia", ar: "الشرقية" },
    region: REGIONS.DELTA,
    fee: 50,
    enabled: true,
  },
  {
    key: "gharbia",
    name: { en: "Gharbia", ar: "الغربية" },
    region: REGIONS.DELTA,
    fee: 50,
    enabled: true,
  },
  {
    key: "monufia",
    name: { en: "Monufia", ar: "المنوفية" },
    region: REGIONS.DELTA,
    fee: 50,
    enabled: true,
  },
  {
    key: "qalyubia",
    name: { en: "Qalyubia", ar: "القليوبية" },
    region: REGIONS.DELTA,
    fee: 50,
    enabled: true,
  },
  {
    key: "kafr-el-sheikh",
    name: { en: "Kafr El Sheikh", ar: "كفر الشيخ" },
    region: REGIONS.DELTA,
    fee: 50,
    enabled: true,
  },
  {
    key: "beheira",
    name: { en: "Beheira", ar: "البحيرة" },
    region: REGIONS.DELTA,
    fee: 50,
    enabled: true,
  },
  {
    key: "damietta",
    name: { en: "Damietta", ar: "دمياط" },
    region: REGIONS.DELTA,
    fee: 50,
    enabled: true,
  },
  {
    key: "port-said",
    name: { en: "Port Said", ar: "بورسعيد" },
    region: REGIONS.DELTA,
    fee: 50,
    enabled: true,
  },
  {
    key: "ismailia",
    name: { en: "Ismailia", ar: "الإسماعيلية" },
    region: REGIONS.DELTA,
    fee: 50,
    enabled: true,
  },
  {
    key: "suez",
    name: { en: "Suez", ar: "السويس" },
    region: REGIONS.DELTA,
    fee: 50,
    enabled: true,
  },

  // ─── Upper Egypt (65 EGP) ───────────────────────────────
  {
    key: "fayoum",
    name: { en: "Fayoum", ar: "الفيوم" },
    region: REGIONS.UPPER,
    fee: 65,
    enabled: true,
  },
  {
    key: "beni-suef",
    name: { en: "Beni Suef", ar: "بني سويف" },
    region: REGIONS.UPPER,
    fee: 65,
    enabled: true,
  },
  {
    key: "minya",
    name: { en: "Minya", ar: "المنيا" },
    region: REGIONS.UPPER,
    fee: 65,
    enabled: true,
  },
  {
    key: "asyut",
    name: { en: "Asyut", ar: "أسيوط" },
    region: REGIONS.UPPER,
    fee: 65,
    enabled: true,
  },
  {
    key: "sohag",
    name: { en: "Sohag", ar: "سوهاج" },
    region: REGIONS.UPPER,
    fee: 65,
    enabled: true,
  },
  {
    key: "qena",
    name: { en: "Qena", ar: "قنا" },
    region: REGIONS.UPPER,
    fee: 65,
    enabled: true,
  },
  {
    key: "luxor",
    name: { en: "Luxor", ar: "الأقصر" },
    region: REGIONS.UPPER,
    fee: 65,
    enabled: true,
  },
  {
    key: "aswan",
    name: { en: "Aswan", ar: "أسوان" },
    region: REGIONS.UPPER,
    fee: 65,
    enabled: true,
  },

  // ─── Frontier (80 EGP) ──────────────────────────────────
  {
    key: "red-sea",
    name: { en: "Red Sea", ar: "البحر الأحمر" },
    region: REGIONS.FRONTIER,
    fee: 80,
    enabled: true,
  },
  {
    key: "new-valley",
    name: { en: "New Valley", ar: "الوادي الجديد" },
    region: REGIONS.FRONTIER,
    fee: 80,
    enabled: true,
  },
  {
    key: "matrouh",
    name: { en: "Matrouh", ar: "مطروح" },
    region: REGIONS.FRONTIER,
    fee: 80,
    enabled: true,
  },
  {
    key: "north-sinai",
    name: { en: "North Sinai", ar: "شمال سيناء" },
    region: REGIONS.FRONTIER,
    fee: 80,
    enabled: true,
  },
  {
    key: "south-sinai",
    name: { en: "South Sinai", ar: "جنوب سيناء" },
    region: REGIONS.FRONTIER,
    fee: 80,
    enabled: true,
  },
];

// Quick lookups
const GOVERNORATE_BY_KEY = Object.freeze(
  GOVERNORATES.reduce((acc, g) => {
    acc[g.key] = g;
    return acc;
  }, {}),
);

module.exports = {
  REGIONS,
  GOVERNORATES,
  GOVERNORATE_BY_KEY,
};
