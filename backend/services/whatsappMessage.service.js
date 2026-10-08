/**
 * Builds the WhatsApp order-confirmation message.
 *
 * The message is plain Arabic text with line breaks. The frontend
 * URL-encodes it and appends it to `https://wa.me/<number>?text=...`.
 *
 * Nothing is persisted — the string is returned once on order create.
 *
 * NOTE: All emojis are written as Unicode escapes (\u{...}) so that
 * the string survives any middleware that might HTML-encode characters,
 * and so that the WhatsApp link doesn't break on some clients.
 */

const { PAYMENT_METHODS } = require("../config/constants");

// ─── Emoji shortcuts (Unicode escapes for reliability) ─────
const E = {
  bag: "\u{1F6CD}\u{FE0F}", // 🛍️
  clipboard: "\u{1F4CB}", // 📋
  person: "\u{1F464}", // 👤
  pin: "\u{1F4CD}", // 📍
  package: "\u{1F4E6}", // 📦
  money: "\u{1F4B5}", // 💵
  wallet: "\u{1F4B0}", // 💰
  card: "\u{1F4B3}", // 💳
  note: "\u{1F4DD}", // 📝
  camera: "\u{1F4F8}", // 📸
  flower: "\u{1F338}", // 🌸
};

/**
 * Formats a number as "1,234.56 ج.م".
 */
function egp(amount) {
  const n = Number(amount) || 0;
  const formatted = n.toLocaleString("en-EG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${formatted} ج.م`;
}

/**
 * Short label for a payment method.
 */
function paymentLabel(method) {
  switch (method) {
    case PAYMENT_METHODS.DEPOSIT:
      return "عربون + الباقي عند الاستلام";
    case PAYMENT_METHODS.FULL:
      return "دفع كامل مقدمًا";
    case PAYMENT_METHODS.COD:
    default:
      return "الدفع عند الاستلام";
  }
}

/**
 * Compresses a multi-line address into a single line.
 */
function formatAddress(addr) {
  if (!addr) return "";
  const parts = [
    addr.street,
    addr.building,
    addr.apartment,
    addr.area,
    addr.city,
    addr.governorateName?.ar || addr.governorateName?.en || addr.governorate,
    addr.country,
  ].filter((p) => p && String(p).trim().length > 0);
  return parts.join("، ");
}

/**
 * Lists order items (products + gift boxes) as lines.
 */
function formatItems(items = []) {
  return items
    .map((item, i) => {
      if (item.type === "gift-box" && item.giftBox) {
        const boxName =
          item.giftBox?.box?.name?.ar ||
          item.giftBox?.box?.name?.en ||
          "بوكس هدايا";
        const inner = (item.giftBox.items || []).length;
        return `${i + 1}. ${boxName} (مخصص - ${inner} عناصر) — ${egp(item.subtotal)}`;
      }
      const name = item.nameSnapshot?.ar || item.nameSnapshot?.en || "منتج";
      return `${i + 1}. ${name} × ${item.quantity} — ${egp(item.subtotal)}`;
    })
    .join("\n");
}

/**
 * Builds the full WhatsApp message for an order.
 */
function buildOrderMessage(order) {
  if (!order) return "";

  const lines = [];
  lines.push(`${E.bag} *طلب جديد من متجر حبيبة*`);
  lines.push("");
  lines.push(`${E.clipboard} رقم الطلب: *${order.orderNumber}*`);
  lines.push("");
  lines.push(`${E.person} *بيانات العميل*`);
  lines.push(`الاسم: ${order.shippingAddress?.fullName || "-"}`);
  lines.push(`الهاتف: ${order.shippingAddress?.phone || "-"}`);
  lines.push("");
  lines.push(`${E.pin} *عنوان الشحن*`);
  lines.push(formatAddress(order.shippingAddress) || "-");
  lines.push("");
  lines.push(`${E.package} *المنتجات*`);
  lines.push(formatItems(order.items));
  lines.push("");
  lines.push(`${E.money} *الملخص*`);
  lines.push(`المجموع الفرعي: ${egp(order.subtotal)}`);
  if (order.shippingFee > 0) {
    lines.push(`الشحن: ${egp(order.shippingFee)}`);
  }
  if (order.tax > 0) {
    lines.push(`الضريبة: ${egp(order.tax)}`);
  }
  if (order.discount > 0) {
    const label = order.couponCode ? `خصم (${order.couponCode})` : "خصم";
    lines.push(`${label}: -${egp(order.discount)}`);
  }
  if (order.paymentDiscount > 0) {
    lines.push(`خصم الدفع الكامل: -${egp(order.paymentDiscount)}`);
  }
  lines.push(`*الإجمالي: ${egp(order.total)}*`);

  if (order.paymentMethod === PAYMENT_METHODS.DEPOSIT) {
    lines.push("");
    lines.push(
      `${E.wallet} *العربون المطلوب الآن:* ${egp(order.amountDueNow)}`,
    );
    lines.push(`الباقي عند الاستلام: ${egp(order.remainingAmount)}`);
  } else if (order.paymentMethod === PAYMENT_METHODS.FULL) {
    lines.push("");
    lines.push(
      `${E.wallet} *المبلغ المدفوع مقدمًا:* ${egp(order.amountDueNow)}`,
    );
  }

  lines.push("");
  lines.push(`${E.card} طريقة الدفع: ${paymentLabel(order.paymentMethod)}`);

  if (order.notes) {
    lines.push("");
    lines.push(`${E.note} ملاحظات:`);
    lines.push(order.notes);
  }

  lines.push("");
  lines.push(`${E.camera} تم رفع صورة إثبات التحويل على الموقع.`);
  lines.push("");
  lines.push(`برجاء تأكيد الطلب. شكرًا لكم ${E.flower}`);

  return lines.join("\n");
}

module.exports = { buildOrderMessage };
