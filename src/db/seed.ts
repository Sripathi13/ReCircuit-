import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  users,
  userProfiles,
  shops,
  shopVerificationDocuments,
  devices,
  deviceImages,
  deviceInterests,
  offers,
  transactions,
  transactionEvents,
  conversations,
  conversationParticipants,
  messages,
  notifications,
  reports,
  supportRequests,
  auditLogs,
} from './schema.ts';

function createDeviceSvgDataUrl(title: string, subtitle: string, accentColor: string, deviceKind: 'phone' | 'damaged_phone' | 'laptop' | 'tablet' | 'monitor' | 'printer'): string {
  let illustration = '';
  if (deviceKind === 'phone') {
    illustration = `
      <rect x="290" y="70" width="220" height="360" rx="28" fill="#1E293B" stroke="${accentColor}" stroke-width="4"/>
      <rect x="304" y="92" width="192" height="316" rx="16" fill="#0F172A"/>
      <circle cx="400" cy="108" r="5" fill="#334155"/>
      <rect x="335" y="150" width="130" height="14" rx="7" fill="${accentColor}" opacity="0.85"/>
      <rect x="335" y="178" width="90" height="10" rx="5" fill="#475569"/>
      <circle cx="400" cy="270" r="46" fill="${accentColor}" opacity="0.18" stroke="${accentColor}" stroke-width="2"/>
      <path d="M385 270 L396 281 L418 259" stroke="${accentColor}" stroke-width="4" fill="none" stroke-linecap="round"/>
    `;
  } else if (deviceKind === 'damaged_phone') {
    illustration = `
      <rect x="290" y="70" width="220" height="360" rx="28" fill="#1E293B" stroke="#D97706" stroke-width="4"/>
      <rect x="304" y="92" width="192" height="316" rx="16" fill="#18181B"/>
      <path d="M304 140 L375 210 L340 265 L430 330 L496 300" stroke="#F59E0B" stroke-width="2.5" fill="none" stroke-dasharray="6 4"/>
      <path d="M375 210 L460 165" stroke="#F59E0B" stroke-width="2" fill="none"/>
      <rect x="335" y="120" width="110" height="12" rx="6" fill="#F59E0B" opacity="0.8"/>
    `;
  } else if (deviceKind === 'laptop') {
    illustration = `
      <rect x="210" y="95" width="380" height="240" rx="16" fill="#1E293B" stroke="${accentColor}" stroke-width="4"/>
      <rect x="228" y="113" width="344" height="204" rx="8" fill="#0F172A"/>
      <path d="M160 335 L640 335 L615 365 L185 365 Z" fill="#334155" stroke="#475569" stroke-width="2"/>
      <rect x="360" y="335" width="80" height="8" rx="4" fill="#64748B"/>
      <rect x="265" y="155" width="180" height="14" rx="7" fill="${accentColor}" opacity="0.85"/>
      <rect x="265" y="185" width="250" height="10" rx="5" fill="#334155"/>
      <rect x="265" y="210" width="210" height="10" rx="5" fill="#334155"/>
    `;
  } else if (deviceKind === 'tablet') {
    illustration = `
      <rect x="250" y="80" width="300" height="340" rx="24" fill="#1E293B" stroke="${accentColor}" stroke-width="4"/>
      <rect x="270" y="100" width="260" height="300" rx="12" fill="#0F172A"/>
      <line x1="575" y1="120" x2="575" y2="370" stroke="#94A3B8" stroke-width="10" stroke-linecap="round"/>
      <polygon points="570,370 580,370 575,390" fill="${accentColor}"/>
      <circle cx="400" cy="245" r="55" fill="${accentColor}" opacity="0.16" stroke="${accentColor}" stroke-width="2"/>
    `;
  } else if (deviceKind === 'monitor') {
    illustration = `
      <rect x="190" y="80" width="420" height="250" rx="12" fill="#1E293B" stroke="${accentColor}" stroke-width="4"/>
      <rect x="206" y="96" width="388" height="218" rx="6" fill="#0F172A"/>
      <rect x="375" y="330" width="50" height="45" fill="#475569"/>
      <rect x="310" y="375" width="180" height="12" rx="6" fill="#334155"/>
      <rect x="250" y="145" width="160" height="14" rx="7" fill="${accentColor}" opacity="0.85"/>
      <rect x="250" y="175" width="280" height="10" rx="5" fill="#334155"/>
    `;
  } else {
    illustration = `
      <rect x="230" y="150" width="340" height="180" rx="18" fill="#1E293B" stroke="${accentColor}" stroke-width="4"/>
      <rect x="280" y="95" width="240" height="60" rx="8" fill="#334155" stroke="#475569" stroke-width="2"/>
      <rect x="280" y="280" width="240" height="75" rx="8" fill="#0F172A" stroke="#475569" stroke-width="2"/>
      <circle cx="515" cy="195" r="10" fill="${accentColor}"/>
      <circle cx="485" cy="195" r="10" fill="#64748B"/>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520" width="800" height="520">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#F1F5F3"/>
        <stop offset="100%" stop-color="#E2ECE7"/>
      </linearGradient>
    </defs>
    <rect width="800" height="520" fill="url(#bg)"/>
    <circle cx="680" cy="90" r="160" fill="${accentColor}" opacity="0.06"/>
    <circle cx="120" cy="430" r="180" fill="#172B4D" opacity="0.05"/>
    ${illustration}
    <text x="400" y="455" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="22" font-weight="700" fill="#0F172A">${title}</text>
    <text x="400" y="485" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="14" font-weight="500" fill="#475569">${subtitle}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function ensureSeeded() {
  try {
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      return { seeded: false, message: 'Database already contains records.' };
    }

    const passwordHash = await bcrypt.hash('DemoPass#2026', 10);
    const adminPasswordHash = await bcrypt.hash('ReCircuitAdmin#2026', 10);
    const now = new Date();

    // 1. Create sample users
    const insertedUsers = await db
      .insert(users)
      .values([
        {
          uid: 'demo-user-arjun-001',
          fullName: 'Arjun Nair',
          email: 'arjun.nair@demo.recircuit.org',
          phone: '+91 98422 51012',
          passwordHash,
          role: 'USER',
          emailVerifiedAt: now,
          accountStatus: 'ACTIVE',
          isDemo: true,
        },
        {
          uid: 'demo-shop-covai-002',
          fullName: 'Priya Sundaram',
          email: 'priya@covaimobilecare.demo.recircuit.org',
          phone: '+91 94431 82019',
          passwordHash,
          role: 'SHOP',
          emailVerifiedAt: now,
          accountStatus: 'ACTIVE',
          isDemo: true,
        },
        {
          uid: 'demo-shop-silicon-003',
          fullName: 'Karthik Rajan',
          email: 'karthik@siliconfix.demo.recircuit.org',
          phone: '+91 98801 44210',
          passwordHash,
          role: 'SHOP',
          emailVerifiedAt: now,
          accountStatus: 'ACTIVE',
          isDemo: true,
        },
        {
          uid: 'demo-shop-ecocircuit-004',
          fullName: 'Dr. Meera Krishnan',
          email: 'compliance@ecocircuitrecycle.demo.recircuit.org',
          phone: '+91 98409 77320',
          passwordHash,
          role: 'SHOP',
          emailVerifiedAt: now,
          accountStatus: 'ACTIVE',
          isDemo: true,
        },
        {
          uid: 'demo-shop-pending-005',
          fullName: 'Rahul Verma',
          email: 'rahul@metrodevices.demo.recircuit.org',
          phone: '+91 97650 19283',
          passwordHash,
          role: 'SHOP',
          emailVerifiedAt: now,
          accountStatus: 'ACTIVE',
          isDemo: true,
        },
        {
          uid: 'demo-admin-006',
          fullName: 'Vikramaditya Menon (Platform Admin)',
          email: 'admin@recircuit.org',
          phone: '+91 90030 10001',
          passwordHash: adminPasswordHash,
          role: 'ADMIN',
          emailVerifiedAt: now,
          accountStatus: 'ACTIVE',
          isDemo: true,
        },
      ])
      .returning();

    const [arjun, priya, karthik, meera, rahul, adminUser] = insertedUsers;

    // 2. Create UserProfiles
    await db.insert(userProfiles).values([
      {
        userId: arjun.id,
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pinCode: '641012',
        approximateLocality: 'RS Puram West',
        preferredContactMethod: 'MESSAGING',
        phoneDisclosurePreference: 'AFTER_ACCEPTANCE',
        emailNotifications: true,
      },
      {
        userId: adminUser.id,
        city: 'Chennai',
        state: 'Tamil Nadu',
        pinCode: '600018',
        approximateLocality: 'Teynampet',
        preferredContactMethod: 'EMAIL',
        phoneDisclosurePreference: 'NEVER',
        emailNotifications: true,
      },
    ]);

    // 3. Create Shops
    const insertedShops = await db
      .insert(shops)
      .values([
        {
          userId: priya.id,
          shopName: 'Covai Mobile Care & Refurb Hub',
          ownerName: 'Priya Sundaram',
          businessType: 'Mobile phone shop',
          description:
            'ISO-compliant smartphone diagnostics, board-level repair, and certified pre-owned mobile refurbishment center serving Coimbatore since 2018.',
          businessRegistrationNumber: 'TN-CBE-MSME-2018-09412',
          addressPrivate: 'No. 42, Cross Cut Road, Gandhipuram, Coimbatore',
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          pinCode: '641012',
          verificationStatus: 'APPROVED',
          verificationNotes: 'Verified GST and Municipal Trade License by Platform Admin.',
          acceptedCategories: JSON.stringify(['Smartphones', 'Tablets', 'Smartwatches', 'Audio equipment']),
          collectionPreferences: JSON.stringify(['SHOP_PICKUP', 'USER_DROPOFF']),
          isDemo: true,
        },
        {
          userId: karthik.id,
          shopName: 'SiliconFix Laptop & Compute Studio',
          ownerName: 'Karthik Rajan',
          businessType: 'Laptop and computer shop',
          description:
            'Specialized business laptop refurbishment, monitor recovery, and workstation upgrades with doorstep pickup across South India.',
          businessRegistrationNumber: 'KA-BLR-GST-29AABCS1429B1Z',
          addressPrivate: '108, 100 Feet Road, Indiranagar, Bengaluru',
          city: 'Bengaluru',
          state: 'Karnataka',
          pinCode: '560038',
          verificationStatus: 'APPROVED',
          verificationNotes: 'Verified Commercial Establishment Certificate and GST registration.',
          acceptedCategories: JSON.stringify(['Laptops', 'Desktop computers', 'Monitors', 'Routers', 'Printers']),
          collectionPreferences: JSON.stringify(['SHOP_PICKUP', 'USER_DROPOFF', 'THIRD_PARTY_COLLECTION']),
          isDemo: true,
        },
        {
          userId: meera.id,
          shopName: 'EcoCircuit Authorized E-Waste Recyclers',
          ownerName: 'Dr. Meera Krishnan',
          businessType: 'Authorized e-waste recycler',
          description:
            'TNPCB & CPCB authorized E-Waste Dismantling and Material Recovery Facility (Form-6 compliant) handling non-working electronics, batteries, and appliances safely.',
          businessRegistrationNumber: 'TNPCB-EWASTE-AUTH-2024-8821',
          addressPrivate: 'Plot 14, SIDCO Industrial Estate, Guindy, Chennai',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pinCode: '600032',
          verificationStatus: 'APPROVED',
          verificationNotes: 'Verified State Pollution Control Board E-Waste Authorization.',
          acceptedCategories: JSON.stringify([
            'Smartphones',
            'Tablets',
            'Laptops',
            'Desktop computers',
            'Monitors',
            'Televisions',
            'Printers',
            'Small electronic appliances',
            'Other electronics',
          ]),
          collectionPreferences: JSON.stringify(['SHOP_PICKUP', 'THIRD_PARTY_COLLECTION']),
          isDemo: true,
        },
        {
          userId: rahul.id,
          shopName: 'Metro Second-Hand Electronics',
          ownerName: 'Rahul Verma',
          businessType: 'Second-hand electronics dealer',
          description:
            'Local buyer and reseller of used consumer electronics, gaming consoles, home audio systems, and accessories.',
          businessRegistrationNumber: 'MH-PUN-SHOP-2025-1190',
          addressPrivate: 'Shop 7, MG Road Commercial Complex, Camp, Pune',
          city: 'Pune',
          state: 'Maharashtra',
          pinCode: '411001',
          verificationStatus: 'PENDING_VERIFICATION',
          verificationNotes: 'Awaiting administrator review of uploaded business registration certificate.',
          acceptedCategories: JSON.stringify(['Smartphones', 'Gaming consoles', 'Audio equipment', 'Televisions']),
          collectionPreferences: JSON.stringify(['USER_DROPOFF']),
          isDemo: true,
        },
      ])
      .returning();

    const [covaiShop, siliconShop, ecoShop, metroShop] = insertedShops;

    // 4. Shop Verification Documents
    await db.insert(shopVerificationDocuments).values([
      {
        shopId: covaiShop.id,
        documentType: 'GST & Trade License Certificate',
        fileName: 'covai_mobile_care_gst_2025.pdf',
        privateStorageKey: 'private://verification-docs/covai-shop-gst.pdf',
        reviewStatus: 'APPROVED',
        reviewedBy: adminUser.id,
        reviewedAt: now,
      },
      {
        shopId: siliconShop.id,
        documentType: 'Commercial Establishment License',
        fileName: 'siliconfix_commercial_cert.pdf',
        privateStorageKey: 'private://verification-docs/siliconfix-cert.pdf',
        reviewStatus: 'APPROVED',
        reviewedBy: adminUser.id,
        reviewedAt: now,
      },
      {
        shopId: ecoShop.id,
        documentType: 'TNPCB E-Waste Authorization Certificate',
        fileName: 'ecocircuit_tnpcb_form6.pdf',
        privateStorageKey: 'private://verification-docs/ecocircuit-tnpcb.pdf',
        reviewStatus: 'APPROVED',
        reviewedBy: adminUser.id,
        reviewedAt: now,
      },
      {
        shopId: metroShop.id,
        documentType: 'Shop Act Registration',
        fileName: 'metro_electronics_shop_act.pdf',
        privateStorageKey: 'private://verification-docs/metro-shop-act.pdf',
        reviewStatus: 'PENDING',
      },
    ]);

    // 5. Create 6 Sample Devices
    const insertedDevices = await db
      .insert(devices)
      .values([
        {
          listingCode: 'RC-DEV-1001',
          ownerId: arjun.id,
          title: 'Samsung Galaxy S22 5G (128GB, Phantom Black) [DEMO]',
          category: 'Smartphones',
          brand: 'Samsung',
          model: 'Galaxy S22 5G (SM-S901E)',
          purchaseYear: 2023,
          description:
            'Demonstration listing: Gently used Samsung Galaxy S22 5G with 8GB RAM and 128GB storage. Always kept in a protective case. Battery holds a full day charge under normal use.',
          condition: 'GOOD',
          powersOn: true,
          screenFunctional: true,
          batteryCondition: 'WORKING',
          accessories: JSON.stringify(['Original Box', 'USB-C Cable', 'SIM Ejector']),
          originalChargerIncluded: true,
          hasPhysicalDamage: false,
          knownDamage: 'None. Minor micro-scratches near USB-C port.',
          conditionNotes: 'Fully unlocked, factory reset ready, display 120Hz AMOLED has zero burn-in.',
          disposalPreference: 'SELL',
          disposalDetails: 'Open to verified mobile shops in Coimbatore for quick inspection and pickup.',
          askingPrice: 21500,
          priceNegotiable: true,
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          pinCode: '641012',
          approximateLocality: 'RS Puram West',
          contactMethod: 'MESSAGING',
          preferredCollectionMethod: 'SHOP_PICKUP',
          phoneRevealPolicy: 'VERIFIED_SHOPS',
          isPublic: true,
          listingStatus: 'AVAILABLE',
          isDemo: true,
          publishedAt: now,
        },
        {
          listingCode: 'RC-DEV-1002',
          ownerId: arjun.id,
          title: 'OnePlus 9 Pro 5G (256GB, Morning Mist) — Cracked Glass [DEMO]',
          category: 'Smartphones',
          brand: 'OnePlus',
          model: '9 Pro 5G (LE2121)',
          purchaseYear: 2021,
          description:
            'Demonstration listing: OnePlus 9 Pro that powers on and boots normally, but has a cracked back glass panel and one vertical green line on the OLED panel. Ideal for screen refurbishment or component harvesting.',
          condition: 'DAMAGED',
          powersOn: true,
          screenFunctional: false,
          batteryCondition: 'WORKING',
          accessories: JSON.stringify(['65W Warp Charger']),
          originalChargerIncluded: true,
          hasPhysicalDamage: true,
          knownDamage: 'Back glass cracked at bottom corner; OLED display has 1 vertical green line.',
          conditionNotes: 'Motherboard, cameras, and Warp charging work properly.',
          disposalPreference: 'REPAIR_OR_REFURBISH',
          disposalDetails: 'Offering device to repair/refurbishment shops for parts recovery or buyback.',
          askingPrice: 6500,
          priceNegotiable: true,
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          pinCode: '641012',
          approximateLocality: 'RS Puram West',
          contactMethod: 'MESSAGING',
          preferredCollectionMethod: 'USER_DROPOFF',
          phoneRevealPolicy: 'AFTER_ACCEPTANCE',
          isPublic: true,
          listingStatus: 'INTERESTED',
          isDemo: true,
          publishedAt: now,
        },
        {
          listingCode: 'RC-DEV-1003',
          ownerId: arjun.id,
          title: 'Dell Latitude 5420 14" Business Laptop (i5-1145G7 / 16GB / 512GB NVMe) [DEMO]',
          category: 'Laptops',
          brand: 'Dell',
          model: 'Latitude 5420',
          purchaseYear: 2022,
          description:
            'Demonstration listing: Clean corporate-grade Dell Latitude 5420 notebook upgraded to 16GB DDR4 RAM and 512GB NVMe SSD. Includes original 65W Type-C power adapter.',
          condition: 'LIKE_NEW',
          powersOn: true,
          screenFunctional: true,
          batteryCondition: 'WORKING',
          accessories: JSON.stringify(['Original 65W USB-C Charger', 'Laptop Sleeve']),
          originalChargerIncluded: true,
          hasPhysicalDamage: false,
          knownDamage: 'None',
          conditionNotes: 'Battery health is at 86% in Dell BIOS diagnostics. All ports tested.',
          disposalPreference: 'SELL',
          disposalDetails: 'Available for verified laptop dealers and refurbishers.',
          askingPrice: 26500,
          priceNegotiable: true,
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          pinCode: '641012',
          approximateLocality: 'Race Course',
          contactMethod: 'MESSAGING',
          preferredCollectionMethod: 'SHOP_PICKUP',
          phoneRevealPolicy: 'AFTER_ACCEPTANCE',
          isPublic: true,
          listingStatus: 'NEGOTIATING',
          isDemo: true,
          publishedAt: now,
        },
        {
          listingCode: 'RC-DEV-1004',
          ownerId: arjun.id,
          title: 'Apple iPad Air 4th Gen (64GB Wi-Fi, Sky Blue) [DEMO]',
          category: 'Tablets',
          brand: 'Apple',
          model: 'iPad Air 4th Generation (A2316)',
          purchaseYear: 2021,
          description:
            'Demonstration listing: Well-maintained 10.9-inch iPad Air 4th Gen used for digital reading and notes. Touch ID and Liquid Retina screen are in crisp condition.',
          condition: 'GOOD',
          powersOn: true,
          screenFunctional: true,
          batteryCondition: 'WORKING',
          accessories: JSON.stringify(['Magnetic Folio Case', '20W USB-C Adapter']),
          originalChargerIncluded: true,
          hasPhysicalDamage: false,
          knownDamage: 'None',
          conditionNotes: 'iCloud signed out and Find My iPad disabled.',
          disposalPreference: 'EXCHANGE',
          disposalDetails: 'Open to direct sale or exchange toward a 27-inch USB-C monitor.',
          askingPrice: 23000,
          priceNegotiable: true,
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          pinCode: '641012',
          approximateLocality: 'RS Puram West',
          contactMethod: 'MESSAGING',
          preferredCollectionMethod: 'SHOP_PICKUP',
          phoneRevealPolicy: 'AFTER_ACCEPTANCE',
          isPublic: true,
          listingStatus: 'AVAILABLE',
          isDemo: true,
          publishedAt: now,
        },
        {
          listingCode: 'RC-DEV-1005',
          ownerId: arjun.id,
          title: 'LG 27MP60G 27-Inch Full HD IPS Monitor (75Hz, FreeSync) [DEMO]',
          category: 'Monitors',
          brand: 'LG',
          model: '27MP60G-B',
          purchaseYear: 2022,
          description:
            'Demonstration listing: Working 27-inch IPS desktop monitor with HDMI, DisplayPort, and D-Sub inputs. Donating to a refurbisher or educational computer lab program.',
          condition: 'GOOD',
          powersOn: true,
          screenFunctional: true,
          batteryCondition: 'NOT_APPLICABLE',
          accessories: JSON.stringify(['Power Brick', 'HDMI Cable', 'Desk Stand']),
          originalChargerIncluded: true,
          hasPhysicalDamage: false,
          knownDamage: 'None',
          conditionNotes: 'Zero dead pixels. Stand and VESA mount threads intact.',
          disposalPreference: 'DONATE',
          disposalDetails: 'Requires shop pickup from RS Puram locality.',
          askingPrice: 0,
          priceNegotiable: false,
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          pinCode: '641012',
          approximateLocality: 'RS Puram West',
          contactMethod: 'MESSAGING',
          preferredCollectionMethod: 'SHOP_PICKUP',
          phoneRevealPolicy: 'AFTER_ACCEPTANCE',
          isPublic: true,
          listingStatus: 'AVAILABLE',
          isDemo: true,
          publishedAt: now,
        },
        {
          listingCode: 'RC-DEV-1006',
          ownerId: arjun.id,
          title: 'HP LaserJet Pro M1136 Multifunction Printer (Non-Working / For Recycling) [DEMO]',
          category: 'Printers',
          brand: 'HP',
          model: 'LaserJet Pro M1136 MFP',
          purchaseYear: 2017,
          description:
            'Demonstration listing: Non-working laser multifunction printer with fuser error and worn roller assembly. Listed for authorized e-waste collection and material recovery.',
          condition: 'NOT_WORKING',
          powersOn: false,
          screenFunctional: false,
          batteryCondition: 'NOT_APPLICABLE',
          accessories: JSON.stringify(['Power Cord']),
          originalChargerIncluded: false,
          hasPhysicalDamage: true,
          knownDamage: 'Fuser unit failed; paper tray hinge cracked; does not power on.',
          conditionNotes: 'Toner cartridge removed separately. Ready for safe e-waste pickup.',
          disposalPreference: 'RECYCLE_RESPONSIBLY',
          disposalDetails: 'Must be collected by an authorized e-waste recycler.',
          askingPrice: 0,
          priceNegotiable: false,
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          pinCode: '641012',
          approximateLocality: 'RS Puram West',
          contactMethod: 'MESSAGING',
          preferredCollectionMethod: 'SHOP_PICKUP',
          phoneRevealPolicy: 'AFTER_ACCEPTANCE',
          isPublic: true,
          listingStatus: 'RESERVED',
          isDemo: true,
          publishedAt: now,
        },
      ])
      .returning();

    const [s22, oneplus, dellLaptop, ipad, lgMonitor, hpPrinter] = insertedDevices;

    // 6. Create DeviceImages
    await db.insert(deviceImages).values([
      {
        deviceId: s22.id,
        storageKey: createDeviceSvgDataUrl('Samsung Galaxy S22 5G', 'RC-DEV-1001 · GOOD · ₹21,500', '#137C5A', 'phone'),
        imageType: 'FRONT',
        displayOrder: 0,
      },
      {
        deviceId: oneplus.id,
        storageKey: createDeviceSvgDataUrl('OnePlus 9 Pro 5G (Damaged)', 'RC-DEV-1002 · DAMAGED · ₹6,500', '#D97706', 'damaged_phone'),
        imageType: 'FRONT',
        displayOrder: 0,
      },
      {
        deviceId: dellLaptop.id,
        storageKey: createDeviceSvgDataUrl('Dell Latitude 5420 14"', 'RC-DEV-1003 · LIKE NEW · ₹26,500', '#137C5A', 'laptop'),
        imageType: 'FRONT',
        displayOrder: 0,
      },
      {
        deviceId: ipad.id,
        storageKey: createDeviceSvgDataUrl('Apple iPad Air 4th Gen', 'RC-DEV-1004 · GOOD · EXCHANGE / ₹23,000', '#0284C7', 'tablet'),
        imageType: 'FRONT',
        displayOrder: 0,
      },
      {
        deviceId: lgMonitor.id,
        storageKey: createDeviceSvgDataUrl('LG 27" IPS Full HD Monitor', 'RC-DEV-1005 · GOOD · DONATION', '#137C5A', 'monitor'),
        imageType: 'FRONT',
        displayOrder: 0,
      },
      {
        deviceId: hpPrinter.id,
        storageKey: createDeviceSvgDataUrl('HP LaserJet Pro M1136 MFP', 'RC-DEV-1006 · NOT WORKING · RECYCLE', '#64748B', 'printer'),
        imageType: 'FRONT',
        displayOrder: 0,
      },
    ]);

    // 7. Create Sample DeviceInterests
    const insertedInterests = await db
      .insert(deviceInterests)
      .values([
        {
          deviceId: oneplus.id,
          shopId: covaiShop.id,
          interestMessage:
            '[DEMO] We can replace the OLED assembly or acquire this OnePlus 9 Pro for board refurbishment at our Gandhipuram service hub.',
          intendedAction: 'REPAIR_OR_REFURBISHMENT',
          proposedPrice: 6000,
          collectionMethod: 'USER_DROPOFF',
          proposedCollectionDate: '2026-10-28',
          additionalNotes: 'Free 15-minute diagnostic check upon handover.',
          requestStatus: 'PENDING',
        },
        {
          deviceId: hpPrinter.id,
          shopId: ecoShop.id,
          interestMessage:
            '[DEMO] EcoCircuit route vehicle will be in Coimbatore RS Puram zone this week for certified e-waste collection.',
          intendedAction: 'RESPONSIBLE_RECYCLING',
          proposedPrice: 0,
          collectionMethod: 'SHOP_PICKUP',
          proposedCollectionDate: '2026-10-27',
          additionalNotes: 'Form-6 compliant disposal certificate provided upon dismantling.',
          requestStatus: 'ACCEPTED',
        },
      ])
      .returning();

    // 8. Create Sample Offers
    const insertedOffers = await db
      .insert(offers)
      .values([
        {
          deviceId: dellLaptop.id,
          shopId: siliconShop.id,
          userId: arjun.id,
          proposedPrice: 24500,
          currency: 'INR',
          collectionMethod: 'SHOP_PICKUP',
          proposedCollectionDate: '2026-10-29',
          message:
            '[DEMO] Offer includes doorstep inspection and insured pickup for the Dell Latitude 5420.',
          offerStatus: 'PENDING',
          expiresAt: '2026-11-02',
        },
        {
          deviceId: s22.id,
          shopId: covaiShop.id,
          userId: arjun.id,
          proposedPrice: 19800,
          currency: 'INR',
          collectionMethod: 'SHOP_PICKUP',
          proposedCollectionDate: '2026-10-28',
          message: '[DEMO] Instant pickup offer after verifying AMOLED display and IMEI status.',
          offerStatus: 'PENDING',
          expiresAt: '2026-11-01',
        },
      ])
      .returning();

    // 9. Create Sample Transaction (for the HP Printer scheduled for Recycling)
    const [createdTx] = await db
      .insert(transactions)
      .values([
        {
          deviceId: hpPrinter.id,
          ownerId: arjun.id,
          shopId: ecoShop.id,
          acceptedInterestId: insertedInterests[1].id,
          transactionType: 'RECYCLING',
          agreedPrice: 0,
          transactionStatus: 'SCHEDULED',
          collectionMethod: 'SHOP_PICKUP',
          collectionScheduledAt: '2026-10-27 11:00 AM',
          collectionLocationNotes: 'RS Puram West main gate pickup point, Coimbatore',
          collectionInstructions: 'Keep power cord bundled; toner cartridge already removed.',
          handoverChecklistConfirmed: true,
          shopNextAction: 'SEND_TO_RECYCLER',
          shopHandlingNotes: 'Scheduled for dismantling batch #TN-2026-10.',
        },
      ])
      .returning();

    await db.insert(transactionEvents).values([
      {
        transactionId: createdTx.id,
        actorId: arjun.id,
        previousStatus: 'NONE',
        newStatus: 'REQUESTED',
        eventDescription: 'Owner accepted EcoCircuit Authorized E-Waste Recyclers collection request.',
      },
      {
        transactionId: createdTx.id,
        actorId: meera.id,
        previousStatus: 'REQUESTED',
        newStatus: 'SCHEDULED',
        eventDescription: 'Collection scheduled for 2026-10-27 11:00 AM via Shop Pickup.',
      },
    ]);

    // 10. Create Sample Conversations & Messages
    const [conv1, conv2] = await db
      .insert(conversations)
      .values([
        {
          deviceId: oneplus.id,
          transactionId: null,
        },
        {
          deviceId: hpPrinter.id,
          transactionId: createdTx.id,
        },
      ])
      .returning();

    await db.insert(conversationParticipants).values([
      { conversationId: conv1.id, userId: arjun.id },
      { conversationId: conv1.id, userId: priya.id },
      { conversationId: conv2.id, userId: arjun.id },
      { conversationId: conv2.id, userId: meera.id },
    ]);

    await db.insert(messages).values([
      {
        conversationId: conv1.id,
        senderId: priya.id,
        messageText:
          '[DEMO] Hello Arjun, we reviewed your OnePlus 9 Pro listing (RC-DEV-1002). Does the touch digitizer still respond across the entire screen despite the green line?',
      },
      {
        conversationId: conv1.id,
        senderId: arjun.id,
        messageText:
          '[DEMO] Hi Priya, yes! Touch works across 100% of the screen and Warp charging is fast. Only the back glass corner is cracked and there is one vertical green line.',
      },
      {
        conversationId: conv2.id,
        senderId: meera.id,
        messageText:
          '[DEMO] Greetings from EcoCircuit. Our authorized e-waste collection van will arrive at RS Puram West on Oct 27 at 11:00 AM for the HP LaserJet M1136.',
      },
    ]);

    // 11. Create Notifications
    await db.insert(notifications).values([
      {
        userId: arjun.id,
        notificationType: 'SHOP_INTEREST',
        title: 'New Shop Interest on OnePlus 9 Pro 5G',
        message: 'Covai Mobile Care & Refurb Hub expressed interest in RC-DEV-1002.',
        relatedDeviceId: oneplus.id,
        isRead: false,
      },
      {
        userId: arjun.id,
        notificationType: 'NEW_OFFER',
        title: 'Purchase Offer Received: ₹24,500',
        message: 'SiliconFix Laptop & Compute Studio submitted an offer of ₹24,500 for Dell Latitude 5420.',
        relatedDeviceId: dellLaptop.id,
        isRead: false,
      },
      {
        userId: arjun.id,
        notificationType: 'COLLECTION_SCHEDULED',
        title: 'Collection Scheduled for HP LaserJet Printer',
        message: 'EcoCircuit scheduled pickup for 2026-10-27 11:00 AM.',
        relatedDeviceId: hpPrinter.id,
        relatedTransactionId: createdTx.id,
        isRead: true,
      },
      {
        userId: priya.id,
        notificationType: 'VERIFICATION_APPROVED',
        title: 'Shop Verification Approved',
        message: 'Covai Mobile Care & Refurb Hub is verified and authorized to contact device owners.',
        isRead: true,
      },
    ]);

    // 12. Create Sample Audit Log
    await db.insert(auditLogs).values([
      {
        actorId: adminUser.id,
        action: 'SHOP_VERIFICATION_APPROVED',
        entityType: 'SHOP',
        entityId: String(covaiShop.id),
        metadata: JSON.stringify({ shopName: covaiShop.shopName, status: 'APPROVED' }),
      },
      {
        actorId: adminUser.id,
        action: 'SHOP_VERIFICATION_APPROVED',
        entityType: 'SHOP',
        entityId: String(siliconShop.id),
        metadata: JSON.stringify({ shopName: siliconShop.shopName, status: 'APPROVED' }),
      },
      {
        actorId: adminUser.id,
        action: 'SHOP_VERIFICATION_APPROVED',
        entityType: 'SHOP',
        entityId: String(ecoShop.id),
        metadata: JSON.stringify({ shopName: ecoShop.shopName, status: 'APPROVED' }),
      },
    ]);

    return {
      seeded: true,
      message: 'Seeded ReCircuit demonstration accounts, verified shops, devices, offers, and transactions.',
      offersCount: insertedOffers.length,
    };
  } catch (error) {
    console.error('Database seed failed:', error);
    throw new Error('Failed to seed demonstration data.', { cause: error });
  }
}

export { createDeviceSvgDataUrl };
