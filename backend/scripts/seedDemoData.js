/* eslint-disable no-console */
const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");
const env = require("../config/env");

const User = require("../models/User");
const Category = require("../models/Category");
const Product = require("../models/Product");

const CATEGORIES = [
  {
    name: { en: "Home Decor", ar: "ديكور المنزل" },
    slug: "home-decor",
    description: { en: "Beautiful home items", ar: "منتجات منزلية جميلة" },
    image: "/uploads/categories/home-decor.jpg",
    sortOrder: 1,
    isActive: true,
  },
  {
    name: { en: "Kitchenware", ar: "أدوات المطبخ" },
    slug: "kitchenware",
    description: { en: "Artisanal kitchen treasures", ar: "كنوز مطبخ حرفية" },
    image: "/uploads/categories/kitchenware.jpg",
    sortOrder: 2,
    isActive: true,
  },
  {
    name: { en: "Stationery", ar: "القرطاسية" },
    slug: "stationery",
    description: { en: "Journals and notebooks", ar: "دفاتر ومذكرات" },
    image: "/uploads/categories/stationery.jpg",
    sortOrder: 3,
    isActive: true,
  },
  {
    name: { en: "Accessories", ar: "الإكسسوارات" },
    slug: "accessories",
    description: { en: "Silk scarves and more", ar: "أوشحة حريرية والمزيد" },
    image: "/uploads/categories/accessories.jpg",
    sortOrder: 4,
    isActive: true,
  },
];

async function seed() {
  try {
    await mongoose.connect(env.mongoUri);
    console.log("[seed] Connected to MongoDB");

    // ---- Ensure admin exists ----
    let admin = await User.findOne({ email: "admin@habiba.test" });
    if (!admin) {
      admin = await User.create({
        name: "Admin",
        email: "admin@habiba.test",
        password: "Admin12345",
        role: "admin",
      });
      console.log("[seed] Created admin user");
    }

    // ---- Categories ----
    const catMap = {};
    for (const c of CATEGORIES) {
      let doc = await Category.findOne({ slug: c.slug });
      if (!doc) {
        doc = await Category.create(c);
        console.log(`[seed] Created category: ${c.name.en}`);
      } else {
        console.log(`[seed] Category exists: ${c.name.en}`);
      }
      catMap[c.slug] = doc._id;
    }

    // ---- Products ----
    const PRODUCTS = [
      {
        name: { en: "Luxury Scented Candle", ar: "شمعة معطرة فاخرة" },
        slug: "luxury-scented-candle",
        description: {
          en: "Hand-poured soy wax candle with Midnight Jasmine and sandalwood notes. Up to 45 hours burn time.",
          ar: "شمعة من شمع الصويا المصنوعة يدويًا مع نفحات الياسمين الليلي وخشب الصندل. تصل مدة الاحتراق إلى 45 ساعة.",
        },
        shortDescription: {
          en: "Hand-poured premium candle",
          ar: "شمعة فاخرة مصنوعة يدويًا",
        },
        price: 48,
        discountPrice: 42,
        category: catMap["home-decor"],
        images: ["/uploads/products/candle-1.jpg"],
        stock: 20,
        sku: "HD-CANDLE-001",
        isFeatured: true,
        isActive: true,
        options: [
          {
            name: { en: "Scent", ar: "الرائحة" },
            values: [
              { name: { en: "Midnight Jasmine", ar: "الياسمين الليلي" } },
              { name: { en: "Cedar & Saffron", ar: "الأرز والزعفران" } },
              { name: { en: "Morning Mist", ar: "ضباب الصباح" } },
            ],
          },
          {
            name: { en: "Size", ar: "الحجم" },
            values: [
              { name: { en: "Standard (200g)", ar: "ستاندرد 200 جم" } },
              { name: { en: "Large (500g)", ar: "كبير 500 جم" } },
            ],
          },
        ],
      },
      {
        name: { en: "Artisan Ceramic Mug", ar: "كوب سيراميك حرفي" },
        slug: "artisan-ceramic-mug",
        description: {
          en: "Hand-thrown ceramic mug with a unique speckled glaze. Perfect for your morning coffee.",
          ar: "كوب سيراميك مصنوع يدويًا بطبقة لامعة فريدة. مثالي لقهوة الصباح.",
        },
        shortDescription: {
          en: "Handmade ceramic mug",
          ar: "كوب سيراميك مصنوع يدويًا",
        },
        price: 28.5,
        discountPrice: null,
        category: catMap["kitchenware"],
        images: ["/uploads/products/mug-1.jpg"],
        stock: 35,
        sku: "KW-MUG-001",
        isFeatured: true,
        isActive: true,
        options: [],
      },
      {
        name: { en: "Leather Journal Notebook", ar: "دفتر مذكرات جلدي" },
        slug: "leather-journal-notebook",
        description: {
          en: "Genuine leather journal with 200 pages of premium paper. Perfect for notes, sketches, and memories.",
          ar: "دفتر مذكرات من الجلد الطبيعي مع 200 صفحة من الورق الفاخر. مثالي للملاحظات والرسومات والذكريات.",
        },
        shortDescription: {
          en: "Genuine leather journal",
          ar: "دفتر مذكرات من الجلد الطبيعي",
        },
        price: 45,
        discountPrice: 38,
        category: catMap["stationery"],
        images: ["/uploads/products/journal-1.jpg"],
        stock: 15,
        sku: "ST-JOURNAL-001",
        isFeatured: true,
        isActive: true,
        options: [
          {
            name: { en: "Color", ar: "اللون" },
            values: [
              { name: { en: "Tan", ar: "بيج" } },
              { name: { en: "Brown", ar: "بني" } },
              { name: { en: "Black", ar: "أسود" } },
            ],
          },
        ],
      },
      {
        name: { en: "Decorative Silk Scarf", ar: "وشاح حريري مزخرف" },
        slug: "decorative-silk-scarf",
        description: {
          en: "Luxurious silk scarf with hand-rolled edges. Vibrant patterns that add elegance to any outfit.",
          ar: "وشاح حريري فاخر بحواف ملفوفة يدويًا. أنماط نابضة تضيف الأناقة لأي إطلالة.",
        },
        shortDescription: {
          en: "Luxurious silk scarf",
          ar: "وشاح حريري فاخر",
        },
        price: 58,
        discountPrice: null,
        category: catMap["accessories"],
        images: ["/uploads/products/scarf-1.jpg"],
        stock: 8,
        sku: "AC-SCARF-001",
        isFeatured: true,
        isActive: true,
        options: [],
      },
      {
        name: {
          en: "Artisan Handmade Soap Set",
          ar: "طقم صابون حرفي مصنوع يدويًا",
        },
        slug: "artisan-handmade-soap-set",
        description: {
          en: "Set of 4 artisan soaps made with natural ingredients and essential oils.",
          ar: "طقم من 4 صابونات حرفية مصنوعة بمكونات طبيعية وزيوت عطرية.",
        },
        shortDescription: {
          en: "Natural handmade soaps",
          ar: "صابون طبيعي مصنوع يدويًا",
        },
        price: 18,
        discountPrice: null,
        category: catMap["home-decor"],
        images: ["/uploads/products/soap-1.jpg"],
        stock: 50,
        sku: "HD-SOAP-001",
        isFeatured: false,
        isActive: true,
        options: [],
      },
      {
        name: { en: "Ceramic Tea Cup Set", ar: "طقم أكواب شاي سيراميك" },
        slug: "ceramic-tea-cup-set",
        description: {
          en: "Set of 2 ceramic tea cups with saucers. Perfect for cozy afternoons.",
          ar: "طقم من كوبين شاي سيراميك مع صحون. مثالي لأمسيات هادئة.",
        },
        shortDescription: {
          en: "Set of 2 tea cups",
          ar: "طقم من كوبين شاي",
        },
        price: 42,
        discountPrice: 36,
        category: catMap["kitchenware"],
        images: ["/uploads/products/teacup-1.jpg"],
        stock: 12,
        sku: "KW-TEACUP-001",
        isFeatured: false,
        isActive: true,
        options: [],
      },
    ];

    for (const p of PRODUCTS) {
      const exists = await Product.findOne({ slug: p.slug });
      if (!exists) {
        await Product.create(p);
        console.log(`[seed] Created product: ${p.name.en}`);
      } else {
        console.log(`[seed] Product exists: ${p.name.en}`);
      }
    }

    console.log("\n[seed] Done! You can now visit http://localhost:4200/shop");
    console.log("[seed] Admin login: admin@habiba.test / Admin12345\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("[seed] Failed:", err);
    process.exit(1);
  }
}

seed();
