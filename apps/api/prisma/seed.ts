import {
  AdminRole,
  Drivetrain,
  FuelType,
  ListingStage,
  PrismaClient,
  Transmission,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

// Brand logos — Wikipedia Commons SVG/PNG URLs (stable, free-to-use). These
// fill the gaps Session A flagged in v0.6 §4 item 1 (Honda/Chevrolet were
// returning empty + falling back to Google Favicons). The storefront still
// applies a favicon fallback when logoUrl is null, so partial coverage is OK
// — production should host these on the Behbehani CDN.
const BRANDS = [
  { slug: 'toyota', nameEn: 'Toyota', nameAr: 'تويوتا', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Toyota_carlogo.svg/240px-Toyota_carlogo.svg.png' },
  { slug: 'lexus', nameEn: 'Lexus', nameAr: 'لكزس', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Lexus_division_emblem.svg/240px-Lexus_division_emblem.svg.png' },
  { slug: 'nissan', nameEn: 'Nissan', nameAr: 'نيسان', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Nissan_2020_logo.svg/240px-Nissan_2020_logo.svg.png' },
  { slug: 'hyundai', nameEn: 'Hyundai', nameAr: 'هيونداي', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Hyundai_Motor_Company_logo.svg/240px-Hyundai_Motor_Company_logo.svg.png' },
  { slug: 'kia', nameEn: 'Kia', nameAr: 'كيا', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/KIA_logo3.svg/240px-KIA_logo3.svg.png' },
  { slug: 'mitsubishi', nameEn: 'Mitsubishi', nameAr: 'ميتسوبيشي', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Mitsubishi_motors_new_logo.svg/240px-Mitsubishi_motors_new_logo.svg.png' },
  { slug: 'bmw', nameEn: 'BMW', nameAr: 'بي إم دبليو', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/240px-BMW.svg.png' },
  { slug: 'mercedes-benz', nameEn: 'Mercedes-Benz', nameAr: 'مرسيدس بنز', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Mercedes-Logo.svg/240px-Mercedes-Logo.svg.png' },
  { slug: 'audi', nameEn: 'Audi', nameAr: 'أودي', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Audi-Logo_2016.svg/240px-Audi-Logo_2016.svg.png' },
  { slug: 'porsche', nameEn: 'Porsche', nameAr: 'بورشه', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Porsche_logo.svg/240px-Porsche_logo.svg.png' },
  { slug: 'ford', nameEn: 'Ford', nameAr: 'فورد', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Ford_logo_flat.svg/240px-Ford_logo_flat.svg.png' },
  { slug: 'chevrolet', nameEn: 'Chevrolet', nameAr: 'شيفروليه', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Chevrolet.svg/240px-Chevrolet.svg.png' },
  { slug: 'gmc', nameEn: 'GMC', nameAr: 'جي إم سي', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/GMC_logo.svg/240px-GMC_logo.svg.png' },
  { slug: 'honda', nameEn: 'Honda', nameAr: 'هوندا', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Honda.svg/240px-Honda.svg.png' },
  { slug: 'mazda', nameEn: 'Mazda', nameAr: 'مازدا', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Mazda_logo_with_emblem.svg/240px-Mazda_logo_with_emblem.svg.png' },
] as const;

const MODELS: Record<string, { slug: string; nameEn: string; nameAr: string }[]> = {
  toyota: [
    { slug: 'camry', nameEn: 'Camry', nameAr: 'كامري' },
    { slug: 'corolla', nameEn: 'Corolla', nameAr: 'كورولا' },
    { slug: 'land-cruiser', nameEn: 'Land Cruiser', nameAr: 'لاند كروزر' },
    { slug: 'prado', nameEn: 'Prado', nameAr: 'برادو' },
    { slug: 'rav4', nameEn: 'RAV4', nameAr: 'راف فور' },
  ],
  lexus: [
    { slug: 'rx', nameEn: 'RX', nameAr: 'آر إكس' },
    { slug: 'lx', nameEn: 'LX', nameAr: 'إل إكس' },
    { slug: 'es', nameEn: 'ES', nameAr: 'إي إس' },
    { slug: 'nx', nameEn: 'NX', nameAr: 'إن إكس' },
  ],
  nissan: [
    { slug: 'patrol', nameEn: 'Patrol', nameAr: 'باترول' },
    { slug: 'altima', nameEn: 'Altima', nameAr: 'التيما' },
    { slug: 'sunny', nameEn: 'Sunny', nameAr: 'صني' },
    { slug: 'xtrail', nameEn: 'X-Trail', nameAr: 'إكس تريل' },
  ],
  hyundai: [
    { slug: 'sonata', nameEn: 'Sonata', nameAr: 'سوناتا' },
    { slug: 'tucson', nameEn: 'Tucson', nameAr: 'توسان' },
    { slug: 'santa-fe', nameEn: 'Santa Fe', nameAr: 'سانتا في' },
    { slug: 'elantra', nameEn: 'Elantra', nameAr: 'إلنترا' },
  ],
  kia: [
    { slug: 'sportage', nameEn: 'Sportage', nameAr: 'سبورتاج' },
    { slug: 'sorento', nameEn: 'Sorento', nameAr: 'سورنتو' },
    { slug: 'optima', nameEn: 'Optima', nameAr: 'أوبتيما' },
  ],
  mitsubishi: [
    { slug: 'pajero', nameEn: 'Pajero', nameAr: 'باجيرو' },
    { slug: 'lancer', nameEn: 'Lancer', nameAr: 'لانسر' },
    { slug: 'outlander', nameEn: 'Outlander', nameAr: 'أوتلاندر' },
  ],
  bmw: [
    { slug: '3-series', nameEn: '3 Series', nameAr: 'الفئة الثالثة' },
    { slug: '5-series', nameEn: '5 Series', nameAr: 'الفئة الخامسة' },
    { slug: 'x5', nameEn: 'X5', nameAr: 'إكس فايف' },
    { slug: 'x6', nameEn: 'X6', nameAr: 'إكس سيكس' },
  ],
  'mercedes-benz': [
    { slug: 'c-class', nameEn: 'C-Class', nameAr: 'سي كلاس' },
    { slug: 'e-class', nameEn: 'E-Class', nameAr: 'إي كلاس' },
    { slug: 's-class', nameEn: 'S-Class', nameAr: 'إس كلاس' },
    { slug: 'gle', nameEn: 'GLE', nameAr: 'جي إل إي' },
  ],
  audi: [{ slug: 'a4', nameEn: 'A4', nameAr: 'إيه فور' }, { slug: 'q5', nameEn: 'Q5', nameAr: 'كيو فايف' }, { slug: 'q7', nameEn: 'Q7', nameAr: 'كيو سيفن' }],
  porsche: [{ slug: 'cayenne', nameEn: 'Cayenne', nameAr: 'كايين' }, { slug: 'macan', nameEn: 'Macan', nameAr: 'ماكان' }],
  ford: [{ slug: 'explorer', nameEn: 'Explorer', nameAr: 'إكسبلورر' }, { slug: 'edge', nameEn: 'Edge', nameAr: 'إيدج' }, { slug: 'mustang', nameEn: 'Mustang', nameAr: 'موستانج' }],
  chevrolet: [{ slug: 'tahoe', nameEn: 'Tahoe', nameAr: 'تاهو' }, { slug: 'suburban', nameEn: 'Suburban', nameAr: 'سوبربان' }, { slug: 'malibu', nameEn: 'Malibu', nameAr: 'ماليبو' }],
  gmc: [{ slug: 'yukon', nameEn: 'Yukon', nameAr: 'يوكون' }, { slug: 'terrain', nameEn: 'Terrain', nameAr: 'تيرين' }],
  honda: [{ slug: 'accord', nameEn: 'Accord', nameAr: 'أكورد' }, { slug: 'civic', nameEn: 'Civic', nameAr: 'سيفيك' }, { slug: 'crv', nameEn: 'CR-V', nameAr: 'سي آر في' }],
  mazda: [{ slug: 'cx5', nameEn: 'CX-5', nameAr: 'سي إكس فايف' }, { slug: '6', nameEn: 'Mazda 6', nameAr: 'مازدا سكس' }],
};

const BODY_TYPES = [
  { slug: 'sedan', nameEn: 'Sedan', nameAr: 'سيدان' },
  { slug: 'suv', nameEn: 'SUV', nameAr: 'دفع رباعي' },
  { slug: 'hatchback', nameEn: 'Hatchback', nameAr: 'هاتشباك' },
  { slug: 'coupe', nameEn: 'Coupe', nameAr: 'كوبيه' },
  { slug: 'convertible', nameEn: 'Convertible', nameAr: 'مكشوفة' },
  { slug: 'pickup', nameEn: 'Pickup', nameAr: 'بيك أب' },
  { slug: 'van', nameEn: 'Van', nameAr: 'فان' },
  { slug: 'wagon', nameEn: 'Wagon', nameAr: 'ستيشن' },
];

async function seedCatalog(): Promise<void> {
  for (const brand of BRANDS) {
    const dbBrand = await prisma.brand.upsert({
      where: { slug: brand.slug },
      // Backfill logoUrl on re-seed so brands seeded before v0.7 pick up the
      // curated logos. Idempotent for fresh DBs.
      update: { logoUrl: brand.logoUrl },
      create: brand,
    });
    const models = MODELS[brand.slug] ?? [];
    for (const m of models) {
      await prisma.model.upsert({
        where: { brandId_slug: { brandId: dbBrand.id, slug: m.slug } },
        update: {},
        create: { ...m, brandId: dbBrand.id },
      });
    }
  }
  for (const bt of BODY_TYPES) {
    await prisma.bodyType.upsert({
      where: { slug: bt.slug },
      update: {},
      create: bt,
    });
  }
}

async function seedUsers(): Promise<void> {
  const demoPassword = await bcrypt.hash('Demo!Pass8', BCRYPT_ROUNDS);
  await prisma.user.upsert({
    where: { email: 'demo@behbehani-cpo.com' },
    update: {},
    create: {
      email: 'demo@behbehani-cpo.com',
      mobile: null,
      passwordHash: demoPassword,
      fullName: 'Demo Customer',
      role: UserRole.customer,
    },
  });

  const adminPassword = await bcrypt.hash('Admin!Pass8', BCRYPT_ROUNDS);
  await prisma.user.upsert({
    where: { email: 'admin@behbehani-cpo.com' },
    update: {},
    create: {
      email: 'admin@behbehani-cpo.com',
      passwordHash: adminPassword,
      fullName: 'Demo Super Admin',
      role: UserRole.admin,
      adminRoles: [AdminRole.super_admin],
    },
  });

  const opsPassword = await bcrypt.hash('Ops!Pass8', BCRYPT_ROUNDS);
  await prisma.user.upsert({
    where: { email: 'ops@behbehani-cpo.com' },
    update: {},
    create: {
      email: 'ops@behbehani-cpo.com',
      passwordHash: opsPassword,
      fullName: 'Demo Ops Manager',
      role: UserRole.admin,
      adminRoles: [AdminRole.operations_manager, AdminRole.sales_agent],
    },
  });

  const pricingPassword = await bcrypt.hash('Pricing!Pass8', BCRYPT_ROUNDS);
  await prisma.user.upsert({
    where: { email: 'pricing@behbehani-cpo.com' },
    update: {},
    create: {
      email: 'pricing@behbehani-cpo.com',
      passwordHash: pricingPassword,
      fullName: 'Sara Al-Khalifa',
      role: UserRole.admin,
      adminRoles: [AdminRole.finance_officer, AdminRole.pricing_manager],
    },
  });

  // ─── Dev-only: smoke test customer ──────────────────────────────────────
  // Gate ensures this user is NEVER created in production. Use for smoke
  // walks across any local / CI / staging environment.
  if (process.env.NODE_ENV !== 'production') {
    const smokePassword = await bcrypt.hash('Smoke#2026', BCRYPT_ROUNDS);
    await prisma.user.upsert({
      where: { email: 'smoke@test.local' },
      update: {},
      create: {
        email: 'smoke@test.local',
        mobile: '+96550000000',
        passwordHash: smokePassword,
        fullName: 'Smoke Test',
        role: UserRole.customer,
        status: UserStatus.active,
        emailVerifiedAt: new Date(),
        mobileVerifiedAt: new Date(),
      },
    });
    // eslint-disable-next-line no-console
    console.log('[seed] dev test customer ready: smoke@test.local / Smoke#2026');
  }
}

// ─── Sample published listings ────────────────────────────────────────────
// Powers the customer-facing home page (/v1/public/listings/*) with realistic
// rows so the Angular site stops falling back to its mock dataset. All rows
// are upserted on `stockNumber` so re-running the seed is idempotent.
type SeedListing = {
  stockNumber: string;
  vin: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  brandSlug: string;
  modelSlug: string;
  bodyTypeSlug: string;
  year: number;
  mileageKm: number;
  exteriorColor: string;
  interiorColor: string;
  transmission: Transmission;
  fuelType: FuelType;
  drivetrain: Drivetrain;
  engineCc: number;
  cylinders: number;
  seats: number;
  doors: number;
  priceKwd: number;
  heroImage: string;
  inspected: boolean;
  listedDaysAgo: number;
};

const LISTINGS: ReadonlyArray<SeedListing> = [
  {
    stockNumber: 'BMC-SEED-0001', vin: 'JT2BG12K6XU000001',
    slug: '2022-toyota-camry-xle-0001', titleEn: '2022 Toyota Camry XLE', titleAr: '٢٠٢٢ تويوتا كامري XLE',
    brandSlug: 'toyota', modelSlug: 'camry', bodyTypeSlug: 'sedan',
    year: 2022, mileageKm: 45200, exteriorColor: 'Pearl White', interiorColor: 'Beige Leather',
    transmission: 'automatic', fuelType: 'petrol', drivetrain: 'fwd',
    engineCc: 2500, cylinders: 4, seats: 5, doors: 4,
    priceKwd: 5200,
    heroImage: 'https://images.unsplash.com/photo-1621135802920-133df287f89c?w=1200&q=80',
    inspected: true, listedDaysAgo: 5,
  },
  {
    stockNumber: 'BMC-SEED-0002', vin: 'JTHBM1GG5N2000002',
    slug: '2021-lexus-rx-350-f-sport-0002', titleEn: '2021 Lexus RX 350 F-Sport', titleAr: '٢٠٢١ لكزس RX 350 F-Sport',
    brandSlug: 'lexus', modelSlug: 'rx', bodyTypeSlug: 'suv',
    year: 2021, mileageKm: 32100, exteriorColor: 'Atomic Silver', interiorColor: 'Black Leather',
    transmission: 'automatic', fuelType: 'petrol', drivetrain: 'awd',
    engineCc: 3500, cylinders: 6, seats: 5, doors: 5,
    priceKwd: 9800,
    heroImage: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1200&q=80',
    inspected: true, listedDaysAgo: 18,
  },
  {
    stockNumber: 'BMC-SEED-0003', vin: 'WDDWF4KB7NR000003',
    slug: '2023-mercedes-c-300-amg-line-0003', titleEn: '2023 Mercedes-Benz C 300 AMG-Line', titleAr: '٢٠٢٣ مرسيدس C 300 AMG-Line',
    brandSlug: 'mercedes-benz', modelSlug: 'c-class', bodyTypeSlug: 'sedan',
    year: 2023, mileageKm: 18400, exteriorColor: 'Obsidian Black', interiorColor: 'Red Leather',
    transmission: 'automatic', fuelType: 'petrol', drivetrain: 'rwd',
    engineCc: 2000, cylinders: 4, seats: 5, doors: 4,
    priceKwd: 11500,
    heroImage: 'https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=1200&q=80',
    inspected: true, listedDaysAgo: 9,
  },
  {
    stockNumber: 'BMC-SEED-0004', vin: '5UXCR6C09N9000004',
    slug: '2022-bmw-x5-xdrive40i-0004', titleEn: '2022 BMW X5 xDrive40i', titleAr: '٢٠٢٢ بي إم دبليو X5 xDrive40i',
    brandSlug: 'bmw', modelSlug: 'x5', bodyTypeSlug: 'suv',
    year: 2022, mileageKm: 38900, exteriorColor: 'Carbon Black Metallic', interiorColor: 'Cognac Vernasca',
    transmission: 'automatic', fuelType: 'petrol', drivetrain: 'awd',
    engineCc: 3000, cylinders: 6, seats: 5, doors: 5,
    priceKwd: 14200,
    heroImage: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200&q=80',
    inspected: true, listedDaysAgo: 22,
  },
  {
    stockNumber: 'BMC-SEED-0005', vin: 'JN8AY2NC8M9000005',
    slug: '2021-nissan-patrol-platinum-0005', titleEn: '2021 Nissan Patrol Platinum', titleAr: '٢٠٢١ نيسان باترول بلاتينيوم',
    brandSlug: 'nissan', modelSlug: 'patrol', bodyTypeSlug: 'suv',
    year: 2021, mileageKm: 55800, exteriorColor: 'Tungsten Grey', interiorColor: 'Quilted Tan',
    transmission: 'automatic', fuelType: 'petrol', drivetrain: 'four_wd',
    engineCc: 5600, cylinders: 8, seats: 8, doors: 5,
    priceKwd: 12800,
    // v1.5.19 — original photo-1606664922998-f180baa4ef91 was 404'd by Unsplash;
    // swapped for a stable luxury-SUV photo. See scripts/generate-rich-media-demo.mjs.
    heroImage: 'https://images.unsplash.com/photo-1485463611174-f302f6a5c1c9?w=1200&q=80',
    inspected: true, listedDaysAgo: 30,
  },
  {
    stockNumber: 'BMC-SEED-0006', vin: '1FA6P8CF3L5000006',
    slug: '2020-ford-mustang-gt-5-0-0006', titleEn: '2020 Ford Mustang GT 5.0', titleAr: '٢٠٢٠ فورد موستانج GT 5.0',
    brandSlug: 'ford', modelSlug: 'mustang', bodyTypeSlug: 'coupe',
    year: 2020, mileageKm: 42300, exteriorColor: 'Race Red', interiorColor: 'Black Recaro',
    transmission: 'manual', fuelType: 'petrol', drivetrain: 'rwd',
    engineCc: 5000, cylinders: 8, seats: 4, doors: 2,
    priceKwd: 8500,
    // v1.5.22 — original photo-1547744822-39ade1b67762 was 404'd by Unsplash;
    // replaced with stable "Parked red Ford Mustang muscle car" by Stella de Smit.
    heroImage: 'https://images.unsplash.com/photo-1536236160504-1f8201e4a74d?w=1200&q=80',
    inspected: false, listedDaysAgo: 3,
  },
  {
    stockNumber: 'BMC-SEED-0007', vin: 'WP1AB2A50MLB00007',
    slug: '2022-porsche-cayenne-0007', titleEn: '2022 Porsche Cayenne', titleAr: '٢٠٢٢ بورشه كايين',
    brandSlug: 'porsche', modelSlug: 'cayenne', bodyTypeSlug: 'suv',
    year: 2022, mileageKm: 22600, exteriorColor: 'Carrara White', interiorColor: 'Bordeaux Red',
    transmission: 'automatic', fuelType: 'petrol', drivetrain: 'awd',
    engineCc: 3000, cylinders: 6, seats: 5, doors: 5,
    priceKwd: 18500,
    heroImage: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=1200&q=80',
    inspected: true, listedDaysAgo: 7,
  },
  {
    stockNumber: 'BMC-SEED-0008', vin: 'WAUFFAFL4NA000008',
    slug: '2022-audi-q5-45-tfsi-0008', titleEn: '2022 Audi Q5 45 TFSI', titleAr: '٢٠٢٢ أودي Q5 45 TFSI',
    brandSlug: 'audi', modelSlug: 'q5', bodyTypeSlug: 'suv',
    year: 2022, mileageKm: 35100, exteriorColor: 'Mythos Black', interiorColor: 'Rotor Grey',
    transmission: 'automatic', fuelType: 'petrol', drivetrain: 'awd',
    engineCc: 2000, cylinders: 4, seats: 5, doors: 5,
    priceKwd: 10800,
    heroImage: 'https://images.unsplash.com/photo-1542362567-b07e54358753?w=1200&q=80',
    inspected: true, listedDaysAgo: 12,
  },
  {
    stockNumber: 'BMC-SEED-0009', vin: 'JN1BV7AR0FM000009',
    slug: '2023-hyundai-tucson-0009', titleEn: '2023 Hyundai Tucson', titleAr: '٢٠٢٣ هيونداي توسان',
    brandSlug: 'hyundai', modelSlug: 'tucson', bodyTypeSlug: 'suv',
    year: 2023, mileageKm: 14200, exteriorColor: 'Shimmering Silver', interiorColor: 'Black Cloth',
    transmission: 'automatic', fuelType: 'petrol', drivetrain: 'fwd',
    engineCc: 2000, cylinders: 4, seats: 5, doors: 5,
    priceKwd: 6900,
    heroImage: 'https://images.unsplash.com/photo-1568844293986-8d0400bd4745?w=1200&q=80',
    inspected: true, listedDaysAgo: 4,
  },
  {
    stockNumber: 'BMC-SEED-0010', vin: 'KNAGM4A77J5000010',
    slug: '2022-kia-sportage-0010', titleEn: '2022 Kia Sportage', titleAr: '٢٠٢٢ كيا سبورتاج',
    brandSlug: 'kia', modelSlug: 'sportage', bodyTypeSlug: 'suv',
    year: 2022, mileageKm: 28500, exteriorColor: 'Snow White Pearl', interiorColor: 'Black Synthetic',
    transmission: 'automatic', fuelType: 'petrol', drivetrain: 'fwd',
    engineCc: 2400, cylinders: 4, seats: 5, doors: 5,
    priceKwd: 5800,
    heroImage: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=1200&q=80',
    inspected: false, listedDaysAgo: 15,
  },
  {
    stockNumber: 'BMC-SEED-0011', vin: 'WBAJA7C58JB000011',
    slug: '2022-bmw-3-series-330i-0011', titleEn: '2022 BMW 330i M-Sport', titleAr: '٢٠٢٢ بي إم دبليو 330i M-Sport',
    brandSlug: 'bmw', modelSlug: '3-series', bodyTypeSlug: 'sedan',
    year: 2022, mileageKm: 24800, exteriorColor: 'Alpine White', interiorColor: 'Cognac Sensatec',
    transmission: 'automatic', fuelType: 'petrol', drivetrain: 'rwd',
    engineCc: 2000, cylinders: 4, seats: 5, doors: 4,
    priceKwd: 10200,
    // v1.5.22 — original photo-1555215858-9dc80a44d1c1 was 404'd by Unsplash;
    // replaced with stable "White BMW sedan" by Alvis Taurēns.
    heroImage: 'https://images.unsplash.com/photo-1562412386-e48a8277c959?w=1200&q=80',
    inspected: true, listedDaysAgo: 11,
  },
  {
    stockNumber: 'BMC-SEED-0012', vin: 'JTMBFREV3LJ000012',
    slug: '2021-toyota-land-cruiser-vxr-0012', titleEn: '2021 Toyota Land Cruiser VXR', titleAr: '٢٠٢١ تويوتا لاند كروزر VXR',
    brandSlug: 'toyota', modelSlug: 'land-cruiser', bodyTypeSlug: 'suv',
    year: 2021, mileageKm: 48700, exteriorColor: 'Dune Beige', interiorColor: 'Brown Leather',
    transmission: 'automatic', fuelType: 'petrol', drivetrain: 'four_wd',
    engineCc: 5700, cylinders: 8, seats: 8, doors: 5,
    priceKwd: 17500,
    // v1.5.22 — original photo-1601928286906-3c1bf85b3a47 was 404'd by Unsplash;
    // replaced with stable "Grey Toyota Land Cruiser on desert during daytime" by
    // Kristina (real Land Cruiser shot in actual desert setting — matches Kuwait
    // brand context). Original spec said Dune Beige; this photo is grey but is an
    // actual Land Cruiser so model fidelity > exact color match.
    heroImage: 'https://images.unsplash.com/photo-1576676825635-472f74a821ec?w=1200&q=80',
    inspected: true, listedDaysAgo: 25,
  },
];

async function seedListings(): Promise<void> {
  const admin = await prisma.user.findUnique({ where: { email: 'admin@behbehani-cpo.com' } });
  if (!admin) {
    throw new Error('[seed] admin user missing — seedUsers must run before seedListings');
  }
  for (const l of LISTINGS) {
    const brand = await prisma.brand.findUnique({ where: { slug: l.brandSlug } });
    const bodyType = await prisma.bodyType.findUnique({ where: { slug: l.bodyTypeSlug } });
    if (!brand || !bodyType) {
      // eslint-disable-next-line no-console
      console.warn(`[seed] skip ${l.stockNumber}: brand=${l.brandSlug} body=${l.bodyTypeSlug} not found`);
      continue;
    }
    const model = await prisma.model.findUnique({
      where: { brandId_slug: { brandId: brand.id, slug: l.modelSlug } },
    });
    if (!model) {
      // eslint-disable-next-line no-console
      console.warn(`[seed] skip ${l.stockNumber}: model ${l.brandSlug}/${l.modelSlug} not found`);
      continue;
    }
    const listedAt = new Date(Date.now() - l.listedDaysAgo * 24 * 60 * 60 * 1000);
    const priceFils = BigInt(l.priceKwd) * 1000n;
    const baseData = {
      vin: l.vin,
      slug: l.slug,
      titleEn: l.titleEn,
      titleAr: l.titleAr,
      brandId: brand.id,
      modelId: model.id,
      bodyTypeId: bodyType.id,
      year: l.year,
      mileageKm: l.mileageKm,
      exteriorColor: l.exteriorColor,
      interiorColor: l.interiorColor,
      transmission: l.transmission,
      fuelType: l.fuelType,
      drivetrain: l.drivetrain,
      engineCc: l.engineCc,
      cylinders: l.cylinders,
      seats: l.seats,
      doors: l.doors,
      priceFils,
      stage: ListingStage.listed,
      listedAt,
      createdById: admin.id,
    };
    const listing = await prisma.listing.upsert({
      where: { stockNumber: l.stockNumber },
      update: baseData,
      create: { stockNumber: l.stockNumber, ...baseData },
    });
    // Ensure exactly one hero photo (idempotent: delete prior heroes, recreate).
    await prisma.listingPhoto.deleteMany({ where: { listingId: listing.id, isHero: true } });
    await prisma.listingPhoto.create({
      data: {
        listingId: listing.id,
        s3Key: `seed/${l.stockNumber}/hero.jpg`,
        cdnUrl: l.heroImage,
        isHero: true,
        sortOrder: 0,
        uploadStatus: 'ready',
      },
    });
    if (l.inspected) {
      // Demo inspection rows: no scored items yet (inspector must walk the
      // rubric in the admin UI). overallScore stays null until saveProgress
      // recomputes it on first save — matches the contract behaviour of the
      // computeOverallScore helper, which returns null until 71/71 are scored.
      await prisma.inspectionReport.upsert({
        where: { listingId: listing.id },
        update: { overallScore: null, inspectedAt: listedAt },
        create: {
          listingId: listing.id,
          overallScore: null,
          inspectedAt: listedAt,
        },
      });
    }
  }
}

/**
 * v1.5.16 — Premium-tier demo rich-media.
 *
 * Picks the 6 highest-priced listings in the seed and attaches:
 *   - ListingVideo (walk-around MP4)
 *   - Listing360   (360° exterior spin MP4)
 *
 * Both rows point to the static demo assets served by Express at
 * `/static/demo-media/...` — generated by `scripts/generate-rich-media-demo.mjs`.
 * Idempotent: re-running the seed deletes any prior demo media rows for these
 * listings before re-inserting (preserves real admin-uploaded media on
 * non-demo listings).
 *
 * Real content replaces the demo automatically: an admin upload via the
 * existing Media tab will leave the demo row in place but the customer DTO
 * picks whichever video is `uploadStatus='complete'` first — operators
 * should delete the demo row through the admin UI when shipping real footage.
 */
const DEMO_RICH_MEDIA_STOCK_NUMBERS: ReadonlyArray<string> = [
  'BMC-SEED-0007', // Porsche Cayenne, 18,500 KWD
  'BMC-SEED-0004', // BMW X5, 14,200 KWD
  'BMC-SEED-0005', // Nissan Patrol, 12,800 KWD
  'BMC-SEED-0003', // Mercedes C 300, 11,500 KWD
  'BMC-SEED-0008', // Audi Q5, 10,800 KWD
  'BMC-SEED-0002', // Lexus RX 350, 9,800 KWD
];

/**
 * v1.5.18 — Featured-listing seed (closes A v1.5-D11f [ASK A→B-5]).
 *
 * Marks the same 6 premium listings as `featuredAt = listedAt` so the home-page
 * "Featured cars" rail (`GET /v1/public/listings/featured`) populates out of
 * the box. Without this, the rail would be empty until an admin manually
 * toggles via `PATCH /v1/admin/listings/:id/featured` in the admin UI.
 *
 * Spread the featuredAt timestamps so the rail has a deterministic order
 * (newest-featured first per the v1.5.18 sort) instead of all sharing one
 * timestamp.
 */
const FEATURED_STOCK_NUMBERS: ReadonlyArray<string> = DEMO_RICH_MEDIA_STOCK_NUMBERS;

// v1.5.19 — Per-car walkaround URLs (replaces v1.5.16 shared synthetic asset).
// Each listing gets a Ken-Burns animation of its own Unsplash hero photo,
// generated by `scripts/generate-rich-media-demo.mjs`. The 360 spin is still
// shared across all listings (Pixabay video #2708 — real CC0 turntable footage).
function walkaroundUrl(stockNumber: string): string {
  return `/static/demo-media/walkaround/${stockNumber}.mp4`;
}
function walkaroundPosterUrl(stockNumber: string): string {
  return `/static/demo-media/walkaround/${stockNumber}-poster.jpg`;
}
// v1.5.21 — bumped suffix to -v2 so browsers that cached the v1.5.16 synthetic
// cartoon under the prior `demo-spin360.mp4` URL fetch the v1.5.19 real Pixabay
// turntable cleanly. Bump again (-v3, etc.) on any future content swap.
const SPIN360_URL = '/static/demo-media/spin360/demo-spin360-v2.mp4';

async function seedDemoRichMedia(): Promise<void> {
  // Resolve any admin user for `uploadedById` (avoids FK violation). The
  // demo-admin user from seedUsers() always exists by the time this runs.
  const admin = await prisma.user.findFirst({
    where: { role: UserRole.admin },
    select: { id: true },
  });
  if (!admin) {
    // eslint-disable-next-line no-console
    console.warn('[seed] no admin user found — skipping demo rich media');
    return;
  }

  let attached = 0;
  for (let i = 0; i < DEMO_RICH_MEDIA_STOCK_NUMBERS.length; i++) {
    const stockNumber = DEMO_RICH_MEDIA_STOCK_NUMBERS[i];
    const listing = await prisma.listing.findUnique({
      where: { stockNumber },
      select: { id: true },
    });
    if (!listing) {
      // eslint-disable-next-line no-console
      console.warn(`[seed] skip rich media for ${stockNumber}: listing not found`);
      continue;
    }

    // v1.5.18 — also flag as featured (most-recent-featured first in the rail
    // when sorted by featuredAt desc). Stagger by i hours so order is stable.
    if (FEATURED_STOCK_NUMBERS.includes(stockNumber)) {
      const featuredAt = new Date(Date.now() - i * 60 * 60 * 1000);
      await prisma.listing.update({
        where: { id: listing.id },
        data: { featuredAt },
      });
    }

    // Wipe any prior demo rows for this listing (idempotent re-seed).
    // We identify demo rows by the well-known s3Key prefix — production rows
    // use UUID-based S3 paths, so this filter never touches real uploads.
    await prisma.listingVideo.deleteMany({
      where: { listingId: listing.id, s3Key: { startsWith: '/static/demo-media/' } },
    });
    await prisma.listing360.deleteMany({
      where: { listingId: listing.id, archiveS3Key: { startsWith: '/static/demo-media/' } },
    });

    // Walk-around video — per-listing personalized Ken-Burns from this car's
    // own Unsplash hero photo (v1.5.19).
    const waUrl = walkaroundUrl(stockNumber);
    const waPosterUrl = walkaroundPosterUrl(stockNumber);
    await prisma.listingVideo.create({
      data: {
        listingId: listing.id,
        s3Key: waUrl,
        cdnUrl: waUrl,
        durationS: 7,
        // Approximate bytes — actual sizes vary 350-820 KB per car. Used for
        // display ("0.4 MB walk-around") only; not enforced anywhere.
        bytes: 500_000,
        mimeType: 'video/mp4',
        posterS3Key: waPosterUrl,
        uploadStatus: 'complete',
        uploadedById: admin.id,
      },
    });

    // 360° exterior spin — shared Pixabay #2708 across all premium listings
    // (real CC0 turntable footage; v1.5.19). Replace with per-car turntable
    // shots when Behbehani has production content.
    await prisma.listing360.upsert({
      where: { listingId: listing.id },
      update: {
        archiveS3Key: SPIN360_URL,
        mimeType: 'video/mp4',
        bytes: 2_286_260,
        frameCount: null, // real video, not frame sequence
        uploadStatus: 'complete',
        uploadedById: admin.id,
      },
      create: {
        listingId: listing.id,
        archiveS3Key: SPIN360_URL,
        mimeType: 'video/mp4',
        bytes: 2_286_260,
        frameCount: null,
        uploadStatus: 'complete',
        uploadedById: admin.id,
      },
    });

    attached += 1;
  }

  // eslint-disable-next-line no-console
  console.log(`[seed] attached demo rich media (video + 360) to ${attached} premium listings`);
}

async function main(): Promise<void> {
  await seedCatalog();
  await seedUsers();
  await seedListings();
  await seedDemoRichMedia();
  // eslint-disable-next-line no-console
  console.log(`[seed] catalog + demo users + ${LISTINGS.length} sample listings ready`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[seed] failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
