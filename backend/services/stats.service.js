const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

/**
 * Return start/end Date objects for a given range shortcut.
 * Defaults to last 30 days.
 */
function resolveRange({ range, from, to }) {
  const now = new Date();
  let start;
  let end = to ? new Date(to) : now;

  switch (range) {
    case "today": {
      start = new Date();
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "7d": {
      start = new Date(now);
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "30d": {
      start = new Date(now);
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "90d": {
      start = new Date(now);
      start.setDate(now.getDate() - 89);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "custom": {
      start = from
        ? new Date(from)
        : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    }
    default: {
      start = new Date(now);
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
    }
  }

  return { start, end };
}

/**
 * Overview KPIs for the admin dashboard.
 * Compares current range vs previous equal-length range.
 */
async function getOverview({ range, from, to }) {
  const { start, end } = resolveRange({ range, from, to });
  const spanMs = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - spanMs);
  const prevEnd = new Date(start.getTime());

  const revenueMatch = { status: { $ne: "cancelled" } };

  const [
    currentRevenue,
    prevRevenue,
    currentOrders,
    prevOrders,
    currentCustomers,
    prevCustomers,
  ] = await Promise.all([
    Order.aggregate([
      { $match: { ...revenueMatch, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Order.aggregate([
      {
        $match: {
          ...revenueMatch,
          createdAt: { $gte: prevStart, $lt: prevEnd },
        },
      },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Order.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    Order.countDocuments({ createdAt: { $gte: prevStart, $lt: prevEnd } }),
    User.countDocuments({
      role: "customer",
      createdAt: { $gte: start, $lte: end },
    }),
    User.countDocuments({
      role: "customer",
      createdAt: { $gte: prevStart, $lt: prevEnd },
    }),
  ]);

  const curRev = currentRevenue[0]?.total || 0;
  const preRev = prevRevenue[0]?.total || 0;

  const growth = (cur, prev) => {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 1000) / 10; // 1 decimal %
  };

  // Conversion: orders / customers in the range (simple ratio, V1)
  const totalCustomers = await User.countDocuments({ role: "customer" });
  const conversionRate =
    totalCustomers > 0
      ? Math.round((currentOrders / totalCustomers) * 1000) / 10
      : 0;

  return {
    range: { from: start.toISOString(), to: end.toISOString() },
    revenue: {
      total: Math.round(curRev * 100) / 100,
      previousTotal: Math.round(preRev * 100) / 100,
      growthPercent: growth(curRev, preRev),
    },
    orders: {
      total: currentOrders,
      previousTotal: prevOrders,
      growthPercent: growth(currentOrders, prevOrders),
    },
    customers: {
      newInRange: currentCustomers,
      previousNewInRange: prevCustomers,
      growthPercent: growth(currentCustomers, prevCustomers),
      total: totalCustomers,
    },
    conversionRate,
  };
}

/**
 * Revenue time series (daily buckets) for the given range.
 * Returns [{ date: 'YYYY-MM-DD', revenue, orders }]
 */
async function getRevenueSeries({ range, from, to }) {
  const { start, end } = resolveRange({ range, from, to });

  const result = await Order.aggregate([
    {
      $match: {
        status: { $ne: "cancelled" },
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: {
          y: { $year: "$createdAt" },
          m: { $month: "$createdAt" },
          d: { $dayOfMonth: "$createdAt" },
        },
        revenue: { $sum: "$total" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
  ]);

  return result.map((row) => {
    const m = String(row._id.m).padStart(2, "0");
    const d = String(row._id.d).padStart(2, "0");
    return {
      date: `${row._id.y}-${m}-${d}`,
      revenue: Math.round(row.revenue * 100) / 100,
      orders: row.orders,
    };
  });
}

/**
 * Low stock products (stock <= threshold).
 */
async function getLowStock({ threshold = 5, limit = 20 } = {}) {
  const products = await Product.find({
    isActive: true,
    stock: { $lte: threshold },
  })
    .select("name slug images stock sku")
    .sort({ stock: 1 })
    .limit(limit);

  return products;
}

/**
 * Top products by revenue in the range.
 */
async function getTopProducts({ range, from, to, limit = 5 }) {
  const { start, end } = resolveRange({ range, from, to });

  const result = await Order.aggregate([
    {
      $match: {
        status: { $ne: "cancelled" },
        createdAt: { $gte: start, $lte: end },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        name: { $first: "$items.nameSnapshot" },
        image: { $first: "$items.imageSnapshot" },
        totalRevenue: { $sum: "$items.subtotal" },
        totalSold: { $sum: "$items.quantity" },
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: limit },
  ]);

  return result.map((row) => ({
    productId: row._id,
    name: row.name,
    image: row.image,
    totalRevenue: Math.round(row.totalRevenue * 100) / 100,
    totalSold: row.totalSold,
  }));
}

/**
 * Recent orders (for admin dashboard).
 */
async function getRecentOrders({ limit = 5 } = {}) {
  const orders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .select(
      "orderNumber total status paymentStatus createdAt user shippingAddress.fullName",
    );

  return orders;
}

module.exports = {
  getOverview,
  getRevenueSeries,
  getLowStock,
  getTopProducts,
  getRecentOrders,
};
