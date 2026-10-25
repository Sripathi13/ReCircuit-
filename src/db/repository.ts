import { and, asc, desc, eq, gte, ilike, inArray, lte, or } from 'drizzle-orm';
import { db } from './index.ts';
import {
  users,
  userProfiles,
  shops,
  shopVerificationDocuments,
  devices,
  deviceImages,
  savedDevices,
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
import { createDeviceSvgDataUrl } from './seed.ts';

function sanitizeError(context: string, error: unknown): never {
  console.error(`Database error in ${context}:`, error);
  throw new Error('Database operation failed. Please try again later.', { cause: error });
}

export async function getPlatformStats() {
  try {
    const allDevices = await db.select().from(devices);
    const allShops = await db.select().from(shops);
    const allTransactions = await db.select().from(transactions);

    const devicesRegistered = allDevices.filter((d) => d.listingStatus !== 'DRAFT').length;
    const devicesReused = allTransactions.filter(
      (t) =>
        t.transactionStatus === 'COMPLETED' &&
        ['SALE', 'DONATION', 'EXCHANGE', 'REFURBISHMENT'].includes(t.transactionType)
    ).length;
    const devicesRecycled = allTransactions.filter(
      (t) =>
        (t.transactionStatus === 'COMPLETED' || t.transactionStatus === 'COLLECTED') &&
        t.transactionType === 'RECYCLING'
    ).length;
    const verifiedShops = allShops.filter((s) => s.verificationStatus === 'APPROVED').length;

    return {
      devicesRegistered,
      devicesReused,
      devicesRecycled,
      verifiedShops,
    };
  } catch (error) {
    sanitizeError('getPlatformStats', error);
  }
}

export async function getUserFullProfile(userId: number) {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return null;

    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
    const [shop] = await db.select().from(shops).where(eq(shops.userId, userId)).limit(1);
    let verificationDocs: typeof shopVerificationDocuments.$inferSelect[] = [];
    if (shop) {
      verificationDocs = await db
        .select()
        .from(shopVerificationDocuments)
        .where(eq(shopVerificationDocuments.shopId, shop.id));
    }

    const { passwordHash: _pw, ...safeUser } = user;
    return {
      ...safeUser,
      profile: profile || null,
      shop: shop
        ? {
            ...shop,
            documents: verificationDocs,
          }
        : null,
    };
  } catch (error) {
    sanitizeError('getUserFullProfile', error);
  }
}

export interface DeviceFilterParams {
  search?: string;
  category?: string;
  brand?: string;
  condition?: string;
  city?: string;
  pinCode?: string;
  disposalPreference?: string;
  minPrice?: number;
  maxPrice?: number;
  onlyAvailable?: boolean;
  sortBy?: 'newest' | 'oldest' | 'price_asc' | 'price_desc';
  includeNonPublicForOwnerId?: number;
}

export async function listMarketplaceDevices(params: DeviceFilterParams) {
  try {
    const conditions = [];

    if (!params.includeNonPublicForOwnerId) {
      conditions.push(eq(devices.isPublic, true));
    }

    if (params.onlyAvailable) {
      conditions.push(inArray(devices.listingStatus, ['AVAILABLE', 'INTERESTED', 'NEGOTIATING']));
    } else if (!params.includeNonPublicForOwnerId) {
      conditions.push(
        inArray(devices.listingStatus, [
          'AVAILABLE',
          'INTERESTED',
          'REQUEST_PENDING',
          'NEGOTIATING',
          'RESERVED',
          'COLLECTED',
          'COMPLETED',
        ])
      );
    }

    if (params.category && params.category !== 'ALL') {
      conditions.push(eq(devices.category, params.category));
    }
    if (params.brand && params.brand.trim() !== '') {
      conditions.push(ilike(devices.brand, `%${params.brand.trim()}%`));
    }
    if (params.condition && params.condition !== 'ALL') {
      conditions.push(eq(devices.condition, params.condition));
    }
    if (params.city && params.city.trim() !== '') {
      conditions.push(ilike(devices.city, `%${params.city.trim()}%`));
    }
    if (params.pinCode && params.pinCode.trim() !== '') {
      conditions.push(ilike(devices.pinCode, `%${params.pinCode.trim()}%`));
    }
    if (params.disposalPreference && params.disposalPreference !== 'ALL') {
      conditions.push(eq(devices.disposalPreference, params.disposalPreference));
    }
    if (typeof params.minPrice === 'number' && !Number.isNaN(params.minPrice)) {
      conditions.push(gte(devices.askingPrice, params.minPrice));
    }
    if (typeof params.maxPrice === 'number' && !Number.isNaN(params.maxPrice)) {
      conditions.push(lte(devices.askingPrice, params.maxPrice));
    }
    if (params.search && params.search.trim() !== '') {
      const q = `%${params.search.trim()}%`;
      conditions.push(
        or(
          ilike(devices.title, q),
          ilike(devices.brand, q),
          ilike(devices.model, q),
          ilike(devices.category, q),
          ilike(devices.city, q),
          ilike(devices.approximateLocality, q),
          ilike(devices.listingCode, q)
        )
      );
    }

    let orderByClause = desc(devices.createdAt);
    if (params.sortBy === 'oldest') orderByClause = asc(devices.createdAt);
    else if (params.sortBy === 'price_asc') orderByClause = asc(devices.askingPrice);
    else if (params.sortBy === 'price_desc') orderByClause = desc(devices.askingPrice);

    const rows =
      conditions.length > 0
        ? await db
            .select()
            .from(devices)
            .where(and(...conditions))
            .orderBy(orderByClause)
        : await db.select().from(devices).orderBy(orderByClause);

    const allImages = await db.select().from(deviceImages).orderBy(asc(deviceImages.displayOrder));
    const allInterests = await db.select().from(deviceInterests);

    return rows.map((dev) => {
      const imgs = allImages.filter((i) => i.deviceId === dev.id);
      const interestCount = allInterests.filter((i) => i.deviceId === dev.id).length;
      return {
        ...dev,
        images: imgs,
        primaryImage: imgs[0]?.storageKey || null,
        interestCount,
      };
    });
  } catch (error) {
    sanitizeError('listMarketplaceDevices', error);
  }
}

export async function getDeviceDetails(deviceId: number, viewerUserId?: number, viewerRole?: string) {
  try {
    const [device] = await db.select().from(devices).where(eq(devices.id, deviceId)).limit(1);
    if (!device) return null;

    const images = await db
      .select()
      .from(deviceImages)
      .where(eq(deviceImages.deviceId, device.id))
      .orderBy(asc(deviceImages.displayOrder));

    const [owner] = await db.select().from(users).where(eq(users.id, device.ownerId)).limit(1);
    const interests = await db.select().from(deviceInterests).where(eq(deviceInterests.deviceId, device.id));
    const deviceOffers = await db.select().from(offers).where(eq(offers.deviceId, device.id));
    const [tx] = await db.select().from(transactions).where(eq(transactions.deviceId, device.id)).limit(1);

    let viewerShop: typeof shops.$inferSelect | null = null;
    if (viewerUserId && viewerRole === 'SHOP') {
      const [foundShop] = await db.select().from(shops).where(eq(shops.userId, viewerUserId)).limit(1);
      viewerShop = foundShop || null;
    }

    const isOwner = viewerUserId === device.ownerId;
    const isAdmin = viewerRole === 'ADMIN';
    const isVerifiedShop = viewerShop?.verificationStatus === 'APPROVED';

    // Determine whether phone number can be revealed
    const hasAcceptedWithThisShop =
      viewerShop &&
      (interests.some((i) => i.shopId === viewerShop!.id && i.requestStatus === 'ACCEPTED') ||
        deviceOffers.some((o) => o.shopId === viewerShop!.id && o.offerStatus === 'ACCEPTED') ||
        (tx && tx.shopId === viewerShop.id));

    const canSeeOwnerPhone =
      isOwner ||
      isAdmin ||
      (isVerifiedShop &&
        (device.phoneRevealPolicy === 'VERIFIED_SHOPS' ||
          (device.phoneRevealPolicy === 'AFTER_ACCEPTANCE' && Boolean(hasAcceptedWithThisShop))));

    const canContactOwner = isOwner || isAdmin || isVerifiedShop;

    return {
      ...device,
      images,
      primaryImage: images[0]?.storageKey || null,
      interestCount: interests.length,
      offerCount: deviceOffers.length,
      ownerInfo: {
        id: owner?.id,
        displayName: owner ? owner.fullName : 'Device Owner',
        preferredContactMethod: device.contactMethod,
        phoneRevealPolicy: device.phoneRevealPolicy,
        phone: canSeeOwnerPhone ? owner?.phone : null,
        email: isOwner || isAdmin ? owner?.email : null,
        canContact: canContactOwner,
      },
      viewerContext: {
        isOwner,
        isAdmin,
        isVerifiedShop,
        shopVerificationStatus: viewerShop?.verificationStatus || null,
        hasExistingInterest: viewerShop
          ? interests.some((i) => i.shopId === viewerShop!.id && i.requestStatus === 'PENDING')
          : false,
        hasExistingOffer: viewerShop
          ? deviceOffers.some((o) => o.shopId === viewerShop!.id && ['PENDING', 'COUNTERED'].includes(o.offerStatus))
          : false,
      },
    };
  } catch (error) {
    sanitizeError('getDeviceDetails', error);
  }
}

export async function createDeviceListing(ownerId: number, payload: Record<string, any>) {
  try {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const listingCode = `RC-DEV-${randomSuffix}`;
    const isDraft = payload.saveAsDraft === true;
    const now = new Date();

    const categoryKindMap: Record<string, 'phone' | 'damaged_phone' | 'laptop' | 'tablet' | 'monitor' | 'printer'> = {
      Smartphones: payload.condition === 'DAMAGED' ? 'damaged_phone' : 'phone',
      Tablets: 'tablet',
      Laptops: 'laptop',
      'Desktop computers': 'monitor',
      Monitors: 'monitor',
      Printers: 'printer',
    };
    const svgKind = categoryKindMap[payload.category] || 'phone';

    const [inserted] = await db
      .insert(devices)
      .values({
        listingCode,
        ownerId,
        title: payload.title || `${payload.brand} ${payload.model}`,
        category: payload.category,
        brand: payload.brand,
        model: payload.model,
        purchaseYear: payload.purchaseYear ? Number(payload.purchaseYear) : null,
        description: payload.description,
        condition: payload.condition,
        powersOn: Boolean(payload.powersOn),
        screenFunctional: Boolean(payload.screenFunctional),
        batteryCondition: payload.batteryCondition || 'WORKING',
        accessories: JSON.stringify(Array.isArray(payload.accessories) ? payload.accessories : []),
        originalChargerIncluded: Boolean(payload.originalChargerIncluded),
        hasPhysicalDamage: Boolean(payload.hasPhysicalDamage),
        knownDamage: payload.knownDamage || '',
        conditionNotes: payload.conditionNotes || '',
        disposalPreference: payload.disposalPreference,
        disposalDetails: payload.disposalDetails || '',
        askingPrice: payload.askingPrice !== undefined && payload.askingPrice !== '' ? Number(payload.askingPrice) : null,
        priceNegotiable: payload.priceNegotiable !== false,
        city: payload.city,
        state: payload.state || 'Tamil Nadu',
        pinCode: payload.pinCode,
        approximateLocality: payload.approximateLocality,
        contactMethod: payload.contactMethod || 'MESSAGING',
        preferredCollectionMethod: payload.preferredCollectionMethod || 'SHOP_PICKUP',
        phoneRevealPolicy: payload.phoneRevealPolicy || 'AFTER_ACCEPTANCE',
        isPublic: !isDraft,
        listingStatus: isDraft ? 'DRAFT' : 'AVAILABLE',
        isDemo: false,
        publishedAt: isDraft ? null : now,
      })
      .returning();

    const uploadedImages: Array<{ storageKey: string; imageType: string }> = Array.isArray(payload.images)
      ? payload.images.filter((img: any) => img && img.storageKey)
      : [];

    if (uploadedImages.length > 0) {
      await db.insert(deviceImages).values(
        uploadedImages.map((img, idx) => ({
          deviceId: inserted.id,
          storageKey: img.storageKey,
          imageType: img.imageType || 'FRONT',
          displayOrder: idx,
        }))
      );
    } else {
      const defaultSvg = createDeviceSvgDataUrl(
        `${inserted.brand} ${inserted.model}`,
        `${inserted.listingCode} · ${inserted.condition}`,
        '#137C5A',
        svgKind
      );
      await db.insert(deviceImages).values({
        deviceId: inserted.id,
        storageKey: defaultSvg,
        imageType: 'FRONT',
        displayOrder: 0,
      });
    }

    if (!isDraft) {
      await db.insert(notifications).values({
        userId: ownerId,
        notificationType: 'DEVICE_PUBLISHED',
        title: `Device Published (${inserted.listingCode})`,
        message: `Your listing "${inserted.title}" is now live in the ReCircuit marketplace.`,
        relatedDeviceId: inserted.id,
      });
    }

    return inserted;
  } catch (error) {
    sanitizeError('createDeviceListing', error);
  }
}

export async function createNotification(data: {
  userId: number;
  notificationType: string;
  title: string;
  message: string;
  relatedDeviceId?: number | null;
  relatedTransactionId?: number | null;
}) {
  try {
    const [notif] = await db
      .insert(notifications)
      .values({
        userId: data.userId,
        notificationType: data.notificationType,
        title: data.title,
        message: data.message,
        relatedDeviceId: data.relatedDeviceId ?? null,
        relatedTransactionId: data.relatedTransactionId ?? null,
        isRead: false,
      })
      .returning();
    return notif;
  } catch (error) {
    sanitizeError('createNotification', error);
  }
}

export async function ensureConversation(userAId: number, userBId: number, deviceId?: number | null, transactionId?: number | null) {
  try {
    const allConvs = await db.select().from(conversations);
    const allParts = await db.select().from(conversationParticipants);

    for (const conv of allConvs) {
      if (deviceId && conv.deviceId !== deviceId) continue;
      const parts = allParts.filter((p) => p.conversationId === conv.id).map((p) => p.userId);
      if (parts.includes(userAId) && parts.includes(userBId)) {
        if (transactionId && !conv.transactionId) {
          await db
            .update(conversations)
            .set({ transactionId, updatedAt: new Date() })
            .where(eq(conversations.id, conv.id));
        }
        return conv;
      }
    }

    const [created] = await db
      .insert(conversations)
      .values({
        deviceId: deviceId ?? null,
        transactionId: transactionId ?? null,
      })
      .returning();

    await db.insert(conversationParticipants).values([
      { conversationId: created.id, userId: userAId },
      { conversationId: created.id, userId: userBId },
    ]);

    return created;
  } catch (error) {
    sanitizeError('ensureConversation', error);
  }
}

export {
  users,
  userProfiles,
  shops,
  shopVerificationDocuments,
  devices,
  deviceImages,
  savedDevices,
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
};
