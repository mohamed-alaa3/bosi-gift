const Setting = require("../models/Setting");
const ApiError = require("../utils/ApiError");
const {
  GOVERNORATES,
  GOVERNORATE_BY_KEY,
} = require("../config/governorates");
const {
  toLatinDigits,
  normalizeEgyptMobile,
  normalizeInstapay,
} = require("../utils/egyptPayment");

const { SETTINGS_KEY } = Setting;

// Machine-readable codes returned in `errors[].message`
const ERROR_CODES = Object.freeze({
  REQUIRED: "REQUIRED",
  INVALID_TYPE: "INVALID_TYPE",
  OUT_OF_RANGE: "OUT_OF_RANGE",
  TOO_LONG: "TOO_LONG",
  INVALID_PHONE: "INVALID_PHONE",
  INVALID_INSTAPAY: "INVALID_INSTAPAY",
  INVALID_EMAIL: "INVALID_EMAIL",
  UNKNOWN_GOVERNORATE: "UNKNOWN_GOVERNORATE",
  DUPLICATE_GOVERNORATE: "DUPLICATE_GOVERNORATE",
});

const LIMITS = Object.freeze({
  maxFee: 100000,
  maxDeposit: 100000,
  storeName: 80,
  storePhone: 30,
  storeEmail: 120,
  storeAddress: 200,
});

const round2 = (n) => Math.round(n * 100) / 100;
const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isNumber = (v) => typeof v === "number" && Number.isFinite(v);

// ------------------------------------------------------------------
// Load (create on first use)
// ------------------------------------------------------------------

function defaultGovernorateRows() {
  return GOVERNORATES.map((g) => ({ key: g.key, fee: g.fee, enabled: g.enabled }));
}

/**
 * The single settings document. Created with defaults on first read;
 * governorates missing from the stored list (e.g. added to the code later)
 * are added with their defaults.
 */
async function getSettingsDoc() {
  let doc = await Setting.findOne({ key: SETTINGS_KEY });

  if (!doc) {
    try {
      doc = await Setting.create({
        key: SETTINGS_KEY,
        governorates: defaultGovernorateRows(),
      });
    } catch (err) {
      // Two requests raced to create it — use the one that won.
      if (err && err.code === 11000) {
        doc = await Setting.findOne({ key: SETTINGS_KEY });
      } else {
        throw err;
      }
    }
  }
  if (!doc) throw ApiError.internal("Could not load store settings");

  const have = new Set(doc.governorates.map((g) => g.key));
  const missing = defaultGovernorateRows().filter((g) => !have.has(g.key));
  if (missing.length > 0) {
    doc.governorates.push(...missing);
    await doc.save();
  }

  return doc;
}

// ------------------------------------------------------------------
// Views
// ------------------------------------------------------------------

/** Governorates in the canonical order, merged with their static info. */
function governorateViews(doc, { withRegion }) {
  const stored = new Map(doc.governorates.map((g) => [g.key, g]));

  return GOVERNORATES.map((def) => {
    const row = stored.get(def.key);
    const view = {
      key: def.key,
      name: { en: def.name.en, ar: def.name.ar },
      fee: row ? row.fee : def.fee,
      enabled: row ? row.enabled : def.enabled,
    };
    if (withRegion) view.region = def.region;
    return view;
  });
}

function paymentView(doc) {
  const p = doc.payment;
  return {
    depositAmount: p.depositAmount,
    fullPaymentDiscountPercent: p.fullPaymentDiscountPercent,
    vodafoneCashNumber: p.vodafoneCashNumber || "",
    instapayNumber: p.instapayNumber || "",
  };
}

function storeView(doc) {
  const s = doc.store;
  return {
    name: s.name || "",
    phone: s.phone || "",
    email: s.email || "",
    address: s.address || "",
  };
}

/** Everything the admin can edit. */
function toAdminView(doc) {
  return {
    governorates: governorateViews(doc, { withRegion: true }),
    payment: paymentView(doc),
    store: storeView(doc),
    updatedAt: doc.updatedAt || null,
  };
}

/**
 * PUBLIC view — an explicit allow-list. Nothing else may ever be added here
 * without a conscious decision (store info, updatedBy, ids... stay private).
 */
function toPublicView(doc) {
  const payment = paymentView(doc);
  return {
    governorates: governorateViews(doc, { withRegion: false }),
    depositAmount: payment.depositAmount,
    fullPaymentDiscountPercent: payment.fullPaymentDiscountPercent,
    vodafoneCashNumber: payment.vodafoneCashNumber,
    instapayNumber: payment.instapayNumber,
  };
}

async function getAdminSettings() {
  return toAdminView(await getSettingsDoc());
}

async function getPublicSettings() {
  return toPublicView(await getSettingsDoc());
}

/** For pricing (Phase 3): { key, name, fee, enabled } or null when unknown. */
async function getGovernorate(key) {
  if (!GOVERNORATE_BY_KEY[key]) return null;
  const doc = await getSettingsDoc();
  return governorateViews(doc, { withRegion: false }).find((g) => g.key === key) || null;
}

/** For pricing (Phase 3). */
async function getPaymentSettings() {
  return paymentView(await getSettingsDoc());
}

// ------------------------------------------------------------------
// Update
// ------------------------------------------------------------------

/**
 * Validate + normalise a partial update. Collects ALL field errors so the
 * admin UI can show them together.
 * @returns {{ value: object, errors: {field:string, message:string}[] }}
 */
function validatePatch(patch) {
  const errors = [];
  const value = {};
  const add = (field, message) => errors.push({ field, message });

  if (!isPlainObject(patch)) {
    return { value, errors: [{ field: "body", message: ERROR_CODES.INVALID_TYPE }] };
  }

  // ---- governorates: [{ key, fee?, enabled? }] ----
  if (patch.governorates !== undefined) {
    if (!Array.isArray(patch.governorates) || patch.governorates.length > GOVERNORATES.length) {
      add("governorates", ERROR_CODES.INVALID_TYPE);
    } else {
      const seen = new Set();
      const rows = [];

      patch.governorates.forEach((item, i) => {
        const at = `governorates[${i}]`;
        if (!isPlainObject(item) || typeof item.key !== "string") {
          add(at, ERROR_CODES.INVALID_TYPE);
          return;
        }
        if (!GOVERNORATE_BY_KEY[item.key]) {
          add(`${at}.key`, ERROR_CODES.UNKNOWN_GOVERNORATE);
          return;
        }
        if (seen.has(item.key)) {
          add(`${at}.key`, ERROR_CODES.DUPLICATE_GOVERNORATE);
          return;
        }
        seen.add(item.key);

        const row = { key: item.key };
        if (item.fee !== undefined) {
          if (!isNumber(item.fee)) add(`${at}.fee`, ERROR_CODES.INVALID_TYPE);
          else if (item.fee < 0 || item.fee > LIMITS.maxFee) add(`${at}.fee`, ERROR_CODES.OUT_OF_RANGE);
          else row.fee = round2(item.fee);
        }
        if (item.enabled !== undefined) {
          if (typeof item.enabled !== "boolean") add(`${at}.enabled`, ERROR_CODES.INVALID_TYPE);
          else row.enabled = item.enabled;
        }
        rows.push(row);
      });

      value.governorates = rows;
    }
  }

  // ---- payment ----
  if (patch.payment !== undefined) {
    if (!isPlainObject(patch.payment)) {
      add("payment", ERROR_CODES.INVALID_TYPE);
    } else {
      const p = patch.payment;
      const out = {};

      if (p.depositAmount !== undefined) {
        if (!isNumber(p.depositAmount)) add("payment.depositAmount", ERROR_CODES.INVALID_TYPE);
        else if (p.depositAmount < 1 || p.depositAmount > LIMITS.maxDeposit) add("payment.depositAmount", ERROR_CODES.OUT_OF_RANGE);
        else out.depositAmount = round2(p.depositAmount);
      }

      if (p.fullPaymentDiscountPercent !== undefined) {
        const v = p.fullPaymentDiscountPercent;
        if (!isNumber(v)) add("payment.fullPaymentDiscountPercent", ERROR_CODES.INVALID_TYPE);
        else if (v < 0 || v > 100) add("payment.fullPaymentDiscountPercent", ERROR_CODES.OUT_OF_RANGE);
        else out.fullPaymentDiscountPercent = round2(v);
      }

      if (p.vodafoneCashNumber !== undefined) {
        if (typeof p.vodafoneCashNumber !== "string") {
          add("payment.vodafoneCashNumber", ERROR_CODES.INVALID_TYPE);
        } else if (p.vodafoneCashNumber.trim() === "") {
          out.vodafoneCashNumber = ""; // cleared → Vodafone Cash not offered
        } else {
          const n = normalizeEgyptMobile(p.vodafoneCashNumber);
          if (n) out.vodafoneCashNumber = n;
          else add("payment.vodafoneCashNumber", ERROR_CODES.INVALID_PHONE);
        }
      }

      if (p.instapayNumber !== undefined) {
        if (typeof p.instapayNumber !== "string") {
          add("payment.instapayNumber", ERROR_CODES.INVALID_TYPE);
        } else if (p.instapayNumber.trim() === "") {
          out.instapayNumber = ""; // cleared → InstaPay not offered
        } else {
          const n = normalizeInstapay(p.instapayNumber);
          if (n) out.instapayNumber = n;
          else add("payment.instapayNumber", ERROR_CODES.INVALID_INSTAPAY);
        }
      }

      value.payment = out;
    }
  }

  // ---- store info (all optional) ----
  if (patch.store !== undefined) {
    if (!isPlainObject(patch.store)) {
      add("store", ERROR_CODES.INVALID_TYPE);
    } else {
      const s = patch.store;
      const out = {};

      const text = (field, max) => {
        if (s[field] === undefined) return;
        if (typeof s[field] !== "string") {
          add(`store.${field}`, ERROR_CODES.INVALID_TYPE);
          return;
        }
        const v = s[field].trim();
        if (v.length > max) add(`store.${field}`, ERROR_CODES.TOO_LONG);
        else out[field] = v;
      };

      text("name", LIMITS.storeName);
      text("address", LIMITS.storeAddress);

      if (s.phone !== undefined) {
        if (typeof s.phone !== "string") {
          add("store.phone", ERROR_CODES.INVALID_TYPE);
        } else {
          const v = toLatinDigits(s.phone).trim();
          if (v.length > LIMITS.storePhone) add("store.phone", ERROR_CODES.TOO_LONG);
          else if (v && !/^[0-9+()\-\s.]+$/.test(v)) add("store.phone", ERROR_CODES.INVALID_PHONE);
          else out.phone = v;
        }
      }

      if (s.email !== undefined) {
        if (typeof s.email !== "string") {
          add("store.email", ERROR_CODES.INVALID_TYPE);
        } else {
          const v = s.email.trim();
          if (v.length > LIMITS.storeEmail) add("store.email", ERROR_CODES.TOO_LONG);
          else if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) add("store.email", ERROR_CODES.INVALID_EMAIL);
          else out.email = v;
        }
      }

      value.store = out;
    }
  }

  if (errors.length === 0 && !value.governorates && !value.payment && !value.store) {
    errors.push({ field: "body", message: ERROR_CODES.REQUIRED });
  }

  return { value, errors };
}

/**
 * Apply a partial update. Only what is sent changes, so saving one tab in
 * the admin page can never overwrite another tab.
 */
async function updateSettings(patch, adminId = null) {
  const { value, errors } = validatePatch(patch);
  if (errors.length > 0) {
    throw ApiError.badRequest("Invalid settings", errors);
  }

  const doc = await getSettingsDoc();

  if (value.governorates) {
    for (const update of value.governorates) {
      const row = doc.governorates.find((g) => g.key === update.key);
      if (!row) continue; // can't happen: getSettingsDoc() guarantees every key
      if (update.fee !== undefined) row.fee = update.fee;
      if (update.enabled !== undefined) row.enabled = update.enabled;
    }
  }

  for (const [field, val] of Object.entries(value.payment || {})) {
    doc.set(`payment.${field}`, val);
  }
  for (const [field, val] of Object.entries(value.store || {})) {
    doc.set(`store.${field}`, val);
  }

  if (adminId) doc.updatedBy = adminId;
  await doc.save();

  return toAdminView(doc);
}

module.exports = {
  ERROR_CODES,
  validatePatch,
  getAdminSettings,
  getPublicSettings,
  getGovernorate,
  getPaymentSettings,
  updateSettings,
};
