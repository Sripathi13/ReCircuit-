import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from './src/db/index.ts';
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
  getPlatformStats,
  getUserFullProfile,
  listMarketplaceDevices,
  getDeviceDetails,
  createDeviceListing,
  createNotification,
  ensureConversation,
} from './src/db/repository.ts';
import { ensureSeeded } from './src/db/seed.ts';
import { getUserByEmail } from './src/db/users.ts';
import {
  AuthRequest,
  createSessionToken,
  optionalAuth,
  requireAuth,
  requireRole,
} from './src/middleware/auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

let seedPromise: Promise<any> | null = null;
async function autoSeedOnce() {
  if (!seedPromise) {
    seedPromise = ensureSeeded().catch((err) => {
      console.error('Auto-seed warning:', err);
      seedPromise = null;
    });
  }
  return seedPromise;
}

function setSessionCookie(res: express.Response, token: string) {
  res.cookie('recircuit_session', token, {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

// ============================================================================
// PUBLIC & PLATFORM ENDPOINTS
// ============================================================================

app.get('/api/stats', async (_req, res) => {
  try {
    await autoSeedOnce();
    const stats = await getPlatformStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load platform stats' });
  }
});

app.post('/api/seed', async (_req, res) => {
  try {
    const result = await ensureSeeded();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Seed failed' });
  }
});

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

app.post('/api/auth/register', async (req, res) => {
  try {
    await autoSeedOnce();
    const { fullName, email, phone, password, city, state, pinCode, approximateLocality } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const uid = `user-${crypto.randomUUID()}`;
    const now = new Date();

    const [createdUser] = await db
      .insert(users)
      .values({
        uid,
        fullName: String(fullName).trim(),
        email: String(email).trim().toLowerCase(),
        phone: String(phone || '').trim(),
        passwordHash,
        role: 'USER',
        emailVerifiedAt: now,
        accountStatus: 'ACTIVE',
        isDemo: false,
      })
      .returning();

    await db.insert(userProfiles).values({
      userId: createdUser.id,
      city: String(city || 'Coimbatore').trim(),
      state: String(state || 'Tamil Nadu').trim(),
      pinCode: String(pinCode || '641001').trim(),
      approximateLocality: String(approximateLocality || city || '').trim(),
      preferredContactMethod: 'MESSAGING',
      phoneDisclosurePreference: 'AFTER_ACCEPTANCE',
      emailNotifications: true,
    });

    const token = createSessionToken(createdUser.id, createdUser.uid, createdUser.email, createdUser.role);
    setSessionCookie(res, token);
    const fullProfile = await getUserFullProfile(createdUser.id);
    res.status(201).json({ token, user: fullProfile });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

app.post('/api/shops/register', async (req, res) => {
  try {
    await autoSeedOnce();
    const {
      shopName,
      ownerName,
      email,
      phone,
      password,
      businessType,
      addressPrivate,
      city,
      state,
      pinCode,
      businessRegistrationNumber,
      description,
      acceptedCategories,
      collectionPreferences,
      documentType,
      documentFileName,
    } = req.body;

    if (!shopName || !ownerName || !email || !password || !businessType || !city || !pinCode) {
      return res.status(400).json({ error: 'Please complete all required shop registration fields.' });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const uid = `shop-${crypto.randomUUID()}`;
    const now = new Date();

    const [createdUser] = await db
      .insert(users)
      .values({
        uid,
        fullName: String(ownerName).trim(),
        email: String(email).trim().toLowerCase(),
        phone: String(phone || '').trim(),
        passwordHash,
        role: 'SHOP',
        emailVerifiedAt: now,
        accountStatus: 'ACTIVE',
        isDemo: false,
      })
      .returning();

    const [createdShop] = await db
      .insert(shops)
      .values({
        userId: createdUser.id,
        shopName: String(shopName).trim(),
        ownerName: String(ownerName).trim(),
        businessType: String(businessType).trim(),
        description: String(description || 'Registered electronics partner on ReCircuit.').trim(),
        businessRegistrationNumber: String(businessRegistrationNumber || '').trim(),
        addressPrivate: String(addressPrivate || `${city}, ${state}`).trim(),
        city: String(city).trim(),
        state: String(state || 'Tamil Nadu').trim(),
        pinCode: String(pinCode).trim(),
        verificationStatus: 'PENDING_VERIFICATION',
        verificationNotes: 'Submitted for administrator review.',
        acceptedCategories: JSON.stringify(
          Array.isArray(acceptedCategories) && acceptedCategories.length > 0
            ? acceptedCategories
            : ['Smartphones', 'Laptops', 'Tablets']
        ),
        collectionPreferences: JSON.stringify(
          Array.isArray(collectionPreferences) && collectionPreferences.length > 0
            ? collectionPreferences
            : ['SHOP_PICKUP', 'USER_DROPOFF']
        ),
        isDemo: false,
      })
      .returning();

    await db.insert(shopVerificationDocuments).values({
      shopId: createdShop.id,
      documentType: String(documentType || 'Business Trade & GST Registration'),
      fileName: String(documentFileName || 'business_verification_document.pdf'),
      privateStorageKey: `private://verification-docs/shop-${createdShop.id}-${Date.now()}.pdf`,
      reviewStatus: 'PENDING',
    });

    await createNotification({
      userId: createdUser.id,
      notificationType: 'SHOP_REGISTRATION_SUBMITTED',
      title: 'Shop Verification Pending Review',
      message: `${createdShop.shopName} has been registered and is awaiting administrator verification.`,
    });

    const token = createSessionToken(createdUser.id, createdUser.uid, createdUser.email, createdUser.role);
    setSessionCookie(res, token);
    const fullProfile = await getUserFullProfile(createdUser.id);
    res.status(201).json({ token, user: fullProfile });
  } catch (error: any) {
    console.error('Shop registration error:', error);
    res.status(500).json({ error: error.message || 'Shop registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    await autoSeedOnce();
    const { email, password, isDemoQuickLogin } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.accountStatus !== 'ACTIVE') {
      return res.status(403).json({ error: `Account is ${user.accountStatus.toLowerCase()}.` });
    }

    if (isDemoQuickLogin && user.isDemo) {
      // Allow 1-click demo switch for explicitly flagged demonstration accounts
    } else {
      if (!password) {
        return res.status(400).json({ error: 'Password is required.' });
      }
      const valid = user.passwordHash ? await bcrypt.compare(String(password), user.passwordHash) : false;
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
    }

    const token = createSessionToken(user.id, user.uid, user.email, user.role);
    setSessionCookie(res, token);
    const fullProfile = await getUserFullProfile(user.id);
    res.json({ token, user: fullProfile });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('recircuit_session', {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    path: '/',
  });
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await getUserFullProfile(req.dbUser!.id);
    res.json({ user: profile });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch current user' });
  }
});

app.post('/api/auth/verify-email', requireAuth, async (req: AuthRequest, res) => {
  try {
    await db
      .update(users)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, req.dbUser!.id));
    const profile = await getUserFullProfile(req.dbUser!.id);
    res.json({ user: profile, message: 'Email address verified.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Verification failed' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    res.json({
      message:
        'If an account exists for this email, a password reset instruction has been generated. (Note: External SMTP email delivery requires EMAIL_PROVIDER_API_KEY configuration; use the Reset Password form directly in development mode.)',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Request failed' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Valid email and a password of at least 6 characters are required.' });
    }
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'Account not found.' });
    }
    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));
    res.json({ message: 'Password updated successfully. You may now sign in.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Password reset failed' });
  }
});

// ============================================================================
// USER PROFILE ENDPOINTS
// ============================================================================

app.get('/api/users/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await getUserFullProfile(req.dbUser!.id);
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch user profile' });
  }
});

app.patch('/api/users/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.dbUser!.id;
    const {
      fullName,
      phone,
      city,
      state,
      pinCode,
      approximateLocality,
      preferredContactMethod,
      phoneDisclosurePreference,
      emailNotifications,
    } = req.body;

    if (fullName !== undefined || phone !== undefined) {
      await db
        .update(users)
        .set({
          fullName: fullName !== undefined ? String(fullName).trim() : req.dbUser!.fullName,
          phone: phone !== undefined ? String(phone).trim() : req.dbUser!.phone,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }

    const [existingProfile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
    if (existingProfile) {
      await db
        .update(userProfiles)
        .set({
          city: city !== undefined ? String(city).trim() : existingProfile.city,
          state: state !== undefined ? String(state).trim() : existingProfile.state,
          pinCode: pinCode !== undefined ? String(pinCode).trim() : existingProfile.pinCode,
          approximateLocality:
            approximateLocality !== undefined ? String(approximateLocality).trim() : existingProfile.approximateLocality,
          preferredContactMethod: preferredContactMethod || existingProfile.preferredContactMethod,
          phoneDisclosurePreference: phoneDisclosurePreference || existingProfile.phoneDisclosurePreference,
          emailNotifications:
            emailNotifications !== undefined ? Boolean(emailNotifications) : existingProfile.emailNotifications,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, userId));
    } else {
      await db.insert(userProfiles).values({
        userId,
        city: String(city || ''),
        state: String(state || ''),
        pinCode: String(pinCode || ''),
        approximateLocality: String(approximateLocality || ''),
        preferredContactMethod: preferredContactMethod || 'MESSAGING',
        phoneDisclosurePreference: phoneDisclosurePreference || 'AFTER_ACCEPTANCE',
        emailNotifications: emailNotifications !== false,
      });
    }

    const updated = await getUserFullProfile(userId);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update profile' });
  }
});

app.delete('/api/users/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    await db
      .update(users)
      .set({ accountStatus: 'DEACTIVATED', updatedAt: new Date() })
      .where(eq(users.id, req.dbUser!.id));
    res.clearCookie('recircuit_session');
    res.json({ message: 'Account deactivated.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to deactivate account' });
  }
});

// ============================================================================
// SHOP PROFILE & SAVED DEVICES ENDPOINTS
// ============================================================================

app.get('/api/shops/me', requireAuth, requireRole('SHOP', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const [shop] = await db.select().from(shops).where(eq(shops.userId, req.dbUser!.id)).limit(1);
    if (!shop) return res.status(404).json({ error: 'Shop profile not found' });
    const docs = await db
      .select()
      .from(shopVerificationDocuments)
      .where(eq(shopVerificationDocuments.shopId, shop.id));
    res.json({ ...shop, documents: docs });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load shop profile' });
  }
});

app.patch('/api/shops/me', requireAuth, requireRole('SHOP'), async (req: AuthRequest, res) => {
  try {
    const [shop] = await db.select().from(shops).where(eq(shops.userId, req.dbUser!.id)).limit(1);
    if (!shop) return res.status(404).json({ error: 'Shop profile not found' });

    const {
      shopName,
      ownerName,
      businessType,
      description,
      addressPrivate,
      city,
      state,
      pinCode,
      acceptedCategories,
      collectionPreferences,
      resubmitVerification,
      documentType,
      documentFileName,
    } = req.body;

    const nextStatus =
      resubmitVerification && ['REJECTED', 'INFO_REQUESTED'].includes(shop.verificationStatus)
        ? 'PENDING_VERIFICATION'
        : shop.verificationStatus;

    await db
      .update(shops)
      .set({
        shopName: shopName !== undefined ? String(shopName).trim() : shop.shopName,
        ownerName: ownerName !== undefined ? String(ownerName).trim() : shop.ownerName,
        businessType: businessType !== undefined ? String(businessType).trim() : shop.businessType,
        description: description !== undefined ? String(description).trim() : shop.description,
        addressPrivate: addressPrivate !== undefined ? String(addressPrivate).trim() : shop.addressPrivate,
        city: city !== undefined ? String(city).trim() : shop.city,
        state: state !== undefined ? String(state).trim() : shop.state,
        pinCode: pinCode !== undefined ? String(pinCode).trim() : shop.pinCode,
        acceptedCategories: Array.isArray(acceptedCategories)
          ? JSON.stringify(acceptedCategories)
          : shop.acceptedCategories,
        collectionPreferences: Array.isArray(collectionPreferences)
          ? JSON.stringify(collectionPreferences)
          : shop.collectionPreferences,
        verificationStatus: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(shops.id, shop.id));

    if (documentFileName) {
      await db.insert(shopVerificationDocuments).values({
        shopId: shop.id,
        documentType: String(documentType || 'Additional Verification Document'),
        fileName: String(documentFileName),
        privateStorageKey: `private://verification-docs/shop-${shop.id}-${Date.now()}.pdf`,
        reviewStatus: 'PENDING',
      });
    }

    const [updatedShop] = await db.select().from(shops).where(eq(shops.id, shop.id)).limit(1);
    const docs = await db
      .select()
      .from(shopVerificationDocuments)
      .where(eq(shopVerificationDocuments.shopId, shop.id));
    res.json({ ...updatedShop, documents: docs });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update shop profile' });
  }
});

app.get('/api/shops/me/saved-devices', requireAuth, requireRole('SHOP'), async (req: AuthRequest, res) => {
  try {
    const [shop] = await db.select().from(shops).where(eq(shops.userId, req.dbUser!.id)).limit(1);
    if (!shop) return res.json([]);
    const saved = await db.select().from(savedDevices).where(eq(savedDevices.shopId, shop.id));
    const deviceIds = saved.map((s) => s.deviceId);
    if (deviceIds.length === 0) return res.json([]);

    const allDevices = await listMarketplaceDevices({});
    const filtered = allDevices.filter((d) => deviceIds.includes(d.id));
    res.json(filtered);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load saved devices' });
  }
});

app.post('/api/shops/me/saved-devices/:deviceId', requireAuth, requireRole('SHOP'), async (req: AuthRequest, res) => {
  try {
    const deviceId = Number(req.params.deviceId);
    const [shop] = await db.select().from(shops).where(eq(shops.userId, req.dbUser!.id)).limit(1);
    if (!shop) return res.status(404).json({ error: 'Shop profile not found' });

    const existing = await db
      .select()
      .from(savedDevices)
      .where(and(eq(savedDevices.shopId, shop.id), eq(savedDevices.deviceId, deviceId)))
      .limit(1);

    if (existing.length > 0) {
      await db.delete(savedDevices).where(eq(savedDevices.id, existing[0].id));
      return res.json({ saved: false });
    } else {
      await db.insert(savedDevices).values({ shopId: shop.id, deviceId });
      return res.json({ saved: true });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to toggle saved device' });
  }
});

// ============================================================================
// DEVICES & MARKETPLACE ENDPOINTS
// ============================================================================

app.get('/api/devices', optionalAuth, async (req: AuthRequest, res) => {
  try {
    await autoSeedOnce();
    const {
      search,
      category,
      brand,
      condition,
      city,
      pinCode,
      disposalPreference,
      minPrice,
      maxPrice,
      onlyAvailable,
      sortBy,
    } = req.query;

    const results = await listMarketplaceDevices({
      search: search ? String(search) : undefined,
      category: category ? String(category) : undefined,
      brand: brand ? String(brand) : undefined,
      condition: condition ? String(condition) : undefined,
      city: city ? String(city) : undefined,
      pinCode: pinCode ? String(pinCode) : undefined,
      disposalPreference: disposalPreference ? String(disposalPreference) : undefined,
      minPrice: minPrice !== undefined && minPrice !== '' ? Number(minPrice) : undefined,
      maxPrice: maxPrice !== undefined && maxPrice !== '' ? Number(maxPrice) : undefined,
      onlyAvailable: onlyAvailable === 'true',
      sortBy: (sortBy as any) || 'newest',
    });

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to list marketplace devices' });
  }
});

app.get('/api/users/me/devices', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userDevices = await db
      .select()
      .from(devices)
      .where(eq(devices.ownerId, req.dbUser!.id))
      .orderBy(desc(devices.updatedAt));

    const allImages = await db.select().from(deviceImages).orderBy(asc(deviceImages.displayOrder));
    const allInterests = await db.select().from(deviceInterests);
    const allOffers = await db.select().from(offers);

    const enriched = userDevices.map((dev) => {
      const imgs = allImages.filter((i) => i.deviceId === dev.id);
      const interestCount = allInterests.filter((i) => i.deviceId === dev.id).length;
      const offerCount = allOffers.filter((o) => o.deviceId === dev.id).length;
      return {
        ...dev,
        images: imgs,
        primaryImage: imgs[0]?.storageKey || null,
        interestCount,
        offerCount,
      };
    });

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch your devices' });
  }
});

app.get('/api/devices/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    await autoSeedOnce();
    const deviceId = Number(req.params.id);
    if (Number.isNaN(deviceId)) return res.status(400).json({ error: 'Invalid device ID' });

    const details = await getDeviceDetails(deviceId, req.dbUser?.id, req.dbUser?.role);
    if (!details) return res.status(404).json({ error: 'Device listing not found' });

    if (!details.isPublic && !details.viewerContext.isOwner && !details.viewerContext.isAdmin) {
      return res.status(403).json({ error: 'This listing is private or in draft mode.' });
    }

    res.json(details);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load device details' });
  }
});

app.post('/api/devices', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { category, brand, model, description, condition, disposalPreference, city, pinCode, approximateLocality } =
      req.body;
    if (!category || !brand || !model || !description || !condition || !disposalPreference || !city || !pinCode) {
      return res.status(400).json({ error: 'Please complete all required device fields.' });
    }

    const created = await createDeviceListing(req.dbUser!.id, req.body);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to register device' });
  }
});

app.patch('/api/devices/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const deviceId = Number(req.params.id);
    const [existing] = await db.select().from(devices).where(eq(devices.id, deviceId)).limit(1);
    if (!existing) return res.status(404).json({ error: 'Device not found' });

    if (existing.ownerId !== req.dbUser!.id && req.dbUser!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: You can only edit your own devices.' });
    }

    if (['COMPLETED', 'COLLECTED'].includes(existing.listingStatus)) {
      return res
        .status(400)
        .json({ error: 'Completed or collected device listings cannot be modified without raising a dispute.' });
    }

    const {
      title,
      description,
      condition,
      askingPrice,
      priceNegotiable,
      disposalPreference,
      disposalDetails,
      city,
      pinCode,
      approximateLocality,
      contactMethod,
      preferredCollectionMethod,
      phoneRevealPolicy,
      listingStatus,
    } = req.body;

    const [updated] = await db
      .update(devices)
      .set({
        title: title !== undefined ? String(title).trim() : existing.title,
        description: description !== undefined ? String(description).trim() : existing.description,
        condition: condition || existing.condition,
        askingPrice:
          askingPrice !== undefined
            ? askingPrice === '' || askingPrice === null
              ? null
              : Number(askingPrice)
            : existing.askingPrice,
        priceNegotiable: priceNegotiable !== undefined ? Boolean(priceNegotiable) : existing.priceNegotiable,
        disposalPreference: disposalPreference || existing.disposalPreference,
        disposalDetails: disposalDetails !== undefined ? String(disposalDetails) : existing.disposalDetails,
        city: city !== undefined ? String(city).trim() : existing.city,
        pinCode: pinCode !== undefined ? String(pinCode).trim() : existing.pinCode,
        approximateLocality:
          approximateLocality !== undefined ? String(approximateLocality).trim() : existing.approximateLocality,
        contactMethod: contactMethod || existing.contactMethod,
        preferredCollectionMethod: preferredCollectionMethod || existing.preferredCollectionMethod,
        phoneRevealPolicy: phoneRevealPolicy || existing.phoneRevealPolicy,
        listingStatus: listingStatus || existing.listingStatus,
        updatedAt: new Date(),
      })
      .where(eq(devices.id, deviceId))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update device' });
  }
});

app.post('/api/devices/:id/publish', requireAuth, async (req: AuthRequest, res) => {
  try {
    const deviceId = Number(req.params.id);
    const [existing] = await db.select().from(devices).where(eq(devices.id, deviceId)).limit(1);
    if (!existing || existing.ownerId !== req.dbUser!.id) {
      return res.status(403).json({ error: 'Not authorized to publish this device.' });
    }
    const [updated] = await db
      .update(devices)
      .set({
        listingStatus: 'AVAILABLE',
        isPublic: true,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(devices.id, deviceId))
      .returning();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to publish device' });
  }
});

app.post('/api/devices/:id/pause', requireAuth, async (req: AuthRequest, res) => {
  try {
    const deviceId = Number(req.params.id);
    const [existing] = await db.select().from(devices).where(eq(devices.id, deviceId)).limit(1);
    if (!existing || existing.ownerId !== req.dbUser!.id) {
      return res.status(403).json({ error: 'Not authorized to pause this device.' });
    }
    if (['RESERVED', 'COLLECTED', 'COMPLETED'].includes(existing.listingStatus)) {
      return res.status(400).json({ error: 'Cannot pause a reserved or completed listing.' });
    }
    const [updated] = await db
      .update(devices)
      .set({ listingStatus: 'PAUSED', updatedAt: new Date() })
      .where(eq(devices.id, deviceId))
      .returning();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to pause listing' });
  }
});

app.post('/api/devices/:id/resume', requireAuth, async (req: AuthRequest, res) => {
  try {
    const deviceId = Number(req.params.id);
    const [existing] = await db.select().from(devices).where(eq(devices.id, deviceId)).limit(1);
    if (!existing || existing.ownerId !== req.dbUser!.id) {
      return res.status(403).json({ error: 'Not authorized to resume this device.' });
    }
    const [updated] = await db
      .update(devices)
      .set({ listingStatus: 'AVAILABLE', isPublic: true, updatedAt: new Date() })
      .where(eq(devices.id, deviceId))
      .returning();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to resume listing' });
  }
});

app.delete('/api/devices/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const deviceId = Number(req.params.id);
    const [existing] = await db.select().from(devices).where(eq(devices.id, deviceId)).limit(1);
    if (!existing || (existing.ownerId !== req.dbUser!.id && req.dbUser!.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Not authorized to delete this listing.' });
    }
    if (['RESERVED', 'COLLECTED', 'COMPLETED'].includes(existing.listingStatus)) {
      return res.status(400).json({ error: 'Cannot delete a listing with an active or completed transaction.' });
    }
    await db.delete(devices).where(eq(devices.id, deviceId));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete listing' });
  }
});

// ============================================================================
// SHOP INTERESTS ENDPOINTS
// ============================================================================

app.post('/api/devices/:id/interests', requireAuth, requireRole('SHOP'), async (req: AuthRequest, res) => {
  try {
    const deviceId = Number(req.params.id);
    const [shop] = await db.select().from(shops).where(eq(shops.userId, req.dbUser!.id)).limit(1);
    if (!shop) return res.status(404).json({ error: 'Shop profile not found.' });

    if (shop.verificationStatus !== 'APPROVED') {
      return res
        .status(403)
        .json({ error: 'Only verified shops may express interest or initiate collection requests.' });
    }

    const [device] = await db.select().from(devices).where(eq(devices.id, deviceId)).limit(1);
    if (!device) return res.status(404).json({ error: 'Device not found.' });

    if (!['AVAILABLE', 'INTERESTED', 'NEGOTIATING'].includes(device.listingStatus)) {
      return res.status(400).json({ error: `Device is currently ${device.listingStatus} and cannot accept new requests.` });
    }

    // Check duplicate active interest
    const existingInterest = await db
      .select()
      .from(deviceInterests)
      .where(
        and(
          eq(deviceInterests.deviceId, deviceId),
          eq(deviceInterests.shopId, shop.id),
          eq(deviceInterests.requestStatus, 'PENDING')
        )
      )
      .limit(1);

    if (existingInterest.length > 0) {
      return res.status(409).json({ error: 'You already have an active interest request for this device.' });
    }

    const { interestMessage, intendedAction, proposedPrice, collectionMethod, proposedCollectionDate, additionalNotes } =
      req.body;

    if (!interestMessage || !intendedAction || !collectionMethod) {
      return res.status(400).json({ error: 'Message, intended action, and proposed collection method are required.' });
    }

    const [createdInterest] = await db
      .insert(deviceInterests)
      .values({
        deviceId,
        shopId: shop.id,
        interestMessage: String(interestMessage).trim(),
        intendedAction,
        proposedPrice: proposedPrice !== undefined && proposedPrice !== '' ? Number(proposedPrice) : null,
        collectionMethod,
        proposedCollectionDate: proposedCollectionDate || null,
        additionalNotes: additionalNotes || null,
        requestStatus: 'PENDING',
      })
      .returning();

    if (device.listingStatus === 'AVAILABLE') {
      await db
        .update(devices)
        .set({ listingStatus: 'INTERESTED', updatedAt: new Date() })
        .where(eq(devices.id, deviceId));
    }

    // Ensure conversation & post initial message
    const conv = await ensureConversation(device.ownerId, req.dbUser!.id, deviceId, null);
    await db.insert(messages).values({
      conversationId: conv.id,
      senderId: req.dbUser!.id,
      messageText: `[Shop Interest — ${intendedAction}] ${interestMessage}`,
    });

    await createNotification({
      userId: device.ownerId,
      notificationType: 'SHOP_INTEREST',
      title: `New Shop Interest: ${shop.shopName}`,
      message: `${shop.shopName} expressed interest in ${device.title} (${device.listingCode}).`,
      relatedDeviceId: device.id,
    });

    res.status(201).json(createdInterest);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to submit interest' });
  }
});

app.get('/api/users/me/interests', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userDevs = await db.select().from(devices).where(eq(devices.ownerId, req.dbUser!.id));
    const devIds = userDevs.map((d) => d.id);
    if (devIds.length === 0) return res.json([]);

    const interests = await db
      .select()
      .from(deviceInterests)
      .where(inArray(deviceInterests.deviceId, devIds))
      .orderBy(desc(deviceInterests.createdAt));

    const allShops = await db.select().from(shops);
    const enriched = interests.map((item) => {
      const dev = userDevs.find((d) => d.id === item.deviceId);
      const shop = allShops.find((s) => s.id === item.shopId);
      return {
        ...item,
        device: dev || null,
        shop: shop
          ? {
              id: shop.id,
              userId: shop.userId,
              shopName: shop.shopName,
              businessType: shop.businessType,
              city: shop.city,
              state: shop.state,
              verificationStatus: shop.verificationStatus,
              description: shop.description,
            }
          : null,
      };
    });

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load shop interests' });
  }
});

app.get('/api/shops/me/interests', requireAuth, requireRole('SHOP'), async (req: AuthRequest, res) => {
  try {
    const [shop] = await db.select().from(shops).where(eq(shops.userId, req.dbUser!.id)).limit(1);
    if (!shop) return res.json([]);

    const interests = await db
      .select()
      .from(deviceInterests)
      .where(eq(deviceInterests.shopId, shop.id))
      .orderBy(desc(deviceInterests.createdAt));

    const allDevices = await db.select().from(devices);
    const enriched = interests.map((item) => ({
      ...item,
      device: allDevices.find((d) => d.id === item.deviceId) || null,
    }));

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load your requests' });
  }
});

app.patch('/api/interests/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const interestId = Number(req.params.id);
    const { status } = req.body; // 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
    const [interest] = await db.select().from(deviceInterests).where(eq(deviceInterests.id, interestId)).limit(1);
    if (!interest) return res.status(404).json({ error: 'Interest request not found' });

    const [device] = await db.select().from(devices).where(eq(devices.id, interest.deviceId)).limit(1);
    if (!device) return res.status(404).json({ error: 'Device not found' });

    const [shop] = await db.select().from(shops).where(eq(shops.id, interest.shopId)).limit(1);

    if (status === 'ACCEPTED' || status === 'REJECTED') {
      if (device.ownerId !== req.dbUser!.id) {
        return res.status(403).json({ error: 'Only the device owner can accept or reject this request.' });
      }
    }

    if (status === 'ACCEPTED') {
      if (['RESERVED', 'COLLECTED', 'COMPLETED'].includes(device.listingStatus)) {
        return res.status(400).json({ error: 'This device is already reserved or completed in another transaction.' });
      }

      await db
        .update(deviceInterests)
        .set({ requestStatus: 'ACCEPTED', updatedAt: new Date() })
        .where(eq(deviceInterests.id, interestId));

      await db
        .update(devices)
        .set({ listingStatus: 'RESERVED', updatedAt: new Date() })
        .where(eq(devices.id, device.id));

      const txTypeMap: Record<string, string> = {
        PURCHASE: 'SALE',
        DONATION_COLLECTION: 'DONATION',
        EXCHANGE: 'EXCHANGE',
        REPAIR_OR_REFURBISHMENT: 'REFURBISHMENT',
        RESPONSIBLE_RECYCLING: 'RECYCLING',
      };

      const [createdTx] = await db
        .insert(transactions)
        .values({
          deviceId: device.id,
          ownerId: device.ownerId,
          shopId: interest.shopId,
          acceptedInterestId: interest.id,
          transactionType: txTypeMap[interest.intendedAction] || 'SALE',
          agreedPrice: interest.proposedPrice ?? device.askingPrice ?? 0,
          transactionStatus: 'REQUESTED',
          collectionMethod: interest.collectionMethod,
          collectionScheduledAt: interest.proposedCollectionDate || null,
        })
        .returning();

      await db.insert(transactionEvents).values({
        transactionId: createdTx.id,
        actorId: req.dbUser!.id,
        previousStatus: 'NONE',
        newStatus: 'REQUESTED',
        eventDescription: `Owner accepted ${shop?.shopName || 'Shop'} request (${interest.intendedAction}). Device reserved.`,
      });

      if (shop) {
        await ensureConversation(device.ownerId, shop.userId, device.id, createdTx.id);
        await createNotification({
          userId: shop.userId,
          notificationType: 'REQUEST_ACCEPTED',
          title: `Request Accepted for ${device.listingCode}`,
          message: `The owner accepted your request for ${device.title}. You can now coordinate collection.`,
          relatedDeviceId: device.id,
          relatedTransactionId: createdTx.id,
        });
      }

      return res.json({ interest: { ...interest, requestStatus: 'ACCEPTED' }, transaction: createdTx });
    }

    const [updated] = await db
      .update(deviceInterests)
      .set({ requestStatus: status, updatedAt: new Date() })
      .where(eq(deviceInterests.id, interestId))
      .returning();

    if (shop && status === 'REJECTED') {
      await createNotification({
        userId: shop.userId,
        notificationType: 'REQUEST_REJECTED',
        title: `Update on ${device.listingCode}`,
        message: `The owner declined your request for ${device.title}.`,
        relatedDeviceId: device.id,
      });
    }

    res.json({ interest: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update interest status' });
  }
});

// ============================================================================
// OFFERS & COUNTEROFFERS ENDPOINTS
// ============================================================================

app.post('/api/devices/:id/offers', requireAuth, requireRole('SHOP'), async (req: AuthRequest, res) => {
  try {
    const deviceId = Number(req.params.id);
    const [shop] = await db.select().from(shops).where(eq(shops.userId, req.dbUser!.id)).limit(1);
    if (!shop) return res.status(404).json({ error: 'Shop profile not found.' });

    if (shop.verificationStatus !== 'APPROVED') {
      return res.status(403).json({ error: 'Only verified shops may submit purchase offers.' });
    }

    const [device] = await db.select().from(devices).where(eq(devices.id, deviceId)).limit(1);
    if (!device) return res.status(404).json({ error: 'Device not found.' });

    if (!['AVAILABLE', 'INTERESTED', 'NEGOTIATING'].includes(device.listingStatus)) {
      return res.status(400).json({ error: `Device is currently ${device.listingStatus} and cannot receive offers.` });
    }

    const { proposedPrice, collectionMethod, proposedCollectionDate, expiresAt, message } = req.body;
    if (proposedPrice === undefined || Number(proposedPrice) < 0) {
      return res.status(400).json({ error: 'Please enter a valid offer amount.' });
    }

    const [createdOffer] = await db
      .insert(offers)
      .values({
        deviceId,
        shopId: shop.id,
        userId: device.ownerId,
        proposedPrice: Number(proposedPrice),
        currency: 'INR',
        collectionMethod: collectionMethod || 'SHOP_PICKUP',
        proposedCollectionDate: proposedCollectionDate || null,
        expiresAt: expiresAt || null,
        message: message || '',
        offerStatus: 'PENDING',
      })
      .returning();

    await db
      .update(devices)
      .set({ listingStatus: 'NEGOTIATING', updatedAt: new Date() })
      .where(eq(devices.id, deviceId));

    const conv = await ensureConversation(device.ownerId, req.dbUser!.id, deviceId, null);
    await db.insert(messages).values({
      conversationId: conv.id,
      senderId: req.dbUser!.id,
      messageText: `[Purchase Offer: ₹${Number(proposedPrice).toLocaleString('en-IN')}] ${message || 'Submitted formal purchase offer.'}`,
    });

    await createNotification({
      userId: device.ownerId,
      notificationType: 'NEW_OFFER',
      title: `New Offer: ₹${Number(proposedPrice).toLocaleString('en-IN')} for ${device.listingCode}`,
      message: `${shop.shopName} offered ₹${Number(proposedPrice).toLocaleString('en-IN')} for ${device.title}.`,
      relatedDeviceId: device.id,
    });

    res.status(201).json(createdOffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to submit offer' });
  }
});

app.get('/api/users/me/offers', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userOffers = await db
      .select()
      .from(offers)
      .where(eq(offers.userId, req.dbUser!.id))
      .orderBy(desc(offers.createdAt));

    const allDevices = await db.select().from(devices);
    const allShops = await db.select().from(shops);

    const enriched = userOffers.map((o) => ({
      ...o,
      device: allDevices.find((d) => d.id === o.deviceId) || null,
      shop: allShops.find((s) => s.id === o.shopId) || null,
    }));

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch offers' });
  }
});

app.get('/api/shops/me/offers', requireAuth, requireRole('SHOP'), async (req: AuthRequest, res) => {
  try {
    const [shop] = await db.select().from(shops).where(eq(shops.userId, req.dbUser!.id)).limit(1);
    if (!shop) return res.json([]);

    const shopOffers = await db
      .select()
      .from(offers)
      .where(eq(offers.shopId, shop.id))
      .orderBy(desc(offers.createdAt));

    const allDevices = await db.select().from(devices);
    const enriched = shopOffers.map((o) => ({
      ...o,
      device: allDevices.find((d) => d.id === o.deviceId) || null,
      shop,
    }));

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch shop offers' });
  }
});

app.patch('/api/offers/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const offerId = Number(req.params.id);
    const { action, counterPrice } = req.body; // action: 'ACCEPT' | 'REJECT' | 'COUNTER'
    const [offer] = await db.select().from(offers).where(eq(offers.id, offerId)).limit(1);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });

    const [device] = await db.select().from(devices).where(eq(devices.id, offer.deviceId)).limit(1);
    if (!device) return res.status(404).json({ error: 'Device not found' });

    const [shop] = await db.select().from(shops).where(eq(shops.id, offer.shopId)).limit(1);

    if (action === 'COUNTER') {
      if (device.ownerId !== req.dbUser!.id) {
        return res.status(403).json({ error: 'Only the device owner can send a counteroffer.' });
      }
      if (!counterPrice || Number(counterPrice) <= 0) {
        return res.status(400).json({ error: 'Please specify a valid counteroffer price.' });
      }

      const [updated] = await db
        .update(offers)
        .set({
          counterPrice: Number(counterPrice),
          offerStatus: 'COUNTERED',
          updatedAt: new Date(),
        })
        .where(eq(offers.id, offerId))
        .returning();

      if (shop) {
        await createNotification({
          userId: shop.userId,
          notificationType: 'COUNTEROFFER_RECEIVED',
          title: `Counteroffer on ${device.listingCode}: ₹${Number(counterPrice).toLocaleString('en-IN')}`,
          message: `The owner proposed a counteroffer of ₹${Number(counterPrice).toLocaleString('en-IN')} for ${device.title}.`,
          relatedDeviceId: device.id,
        });
      }

      return res.json({ offer: updated });
    }

    if (action === 'ACCEPT') {
      if (['RESERVED', 'COLLECTED', 'COMPLETED'].includes(device.listingStatus)) {
        return res.status(400).json({ error: 'Device is already reserved or completed.' });
      }

      const finalPrice =
        offer.offerStatus === 'COUNTERED' && offer.counterPrice ? offer.counterPrice : offer.proposedPrice;

      const [updatedOffer] = await db
        .update(offers)
        .set({ offerStatus: 'ACCEPTED', updatedAt: new Date() })
        .where(eq(offers.id, offerId))
        .returning();

      await db
        .update(devices)
        .set({ listingStatus: 'RESERVED', updatedAt: new Date() })
        .where(eq(devices.id, device.id));

      const [createdTx] = await db
        .insert(transactions)
        .values({
          deviceId: device.id,
          ownerId: device.ownerId,
          shopId: offer.shopId,
          acceptedOfferId: offer.id,
          transactionType: 'SALE',
          agreedPrice: finalPrice,
          transactionStatus: 'REQUESTED',
          collectionMethod: offer.collectionMethod,
          collectionScheduledAt: offer.proposedCollectionDate || null,
        })
        .returning();

      await db.insert(transactionEvents).values({
        transactionId: createdTx.id,
        actorId: req.dbUser!.id,
        previousStatus: 'NONE',
        newStatus: 'REQUESTED',
        eventDescription: `Offer of ₹${finalPrice.toLocaleString('en-IN')} accepted. Transaction initiated and device reserved.`,
      });

      const notifyUserId = req.dbUser!.id === device.ownerId && shop ? shop.userId : device.ownerId;
      await createNotification({
        userId: notifyUserId,
        notificationType: 'OFFER_ACCEPTED',
        title: `Offer Accepted: ₹${finalPrice.toLocaleString('en-IN')}`,
        message: `Offer for ${device.title} (${device.listingCode}) was accepted. Proceed to Collection Management.`,
        relatedDeviceId: device.id,
        relatedTransactionId: createdTx.id,
      });

      return res.json({ offer: updatedOffer, transaction: createdTx });
    }

    if (action === 'REJECT') {
      const [updatedOffer] = await db
        .update(offers)
        .set({ offerStatus: 'REJECTED', updatedAt: new Date() })
        .where(eq(offers.id, offerId))
        .returning();

      const notifyUserId = req.dbUser!.id === device.ownerId && shop ? shop.userId : device.ownerId;
      await createNotification({
        userId: notifyUserId,
        notificationType: 'OFFER_REJECTED',
        title: `Offer Declined (${device.listingCode})`,
        message: `The offer for ${device.title} was declined.`,
        relatedDeviceId: device.id,
      });

      return res.json({ offer: updatedOffer });
    }

    res.status(400).json({ error: 'Invalid offer action' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update offer' });
  }
});

// ============================================================================
// TRANSACTIONS & COLLECTION MANAGEMENT ENDPOINTS
// ============================================================================

async function enrichTransactions(txRows: Array<typeof transactions.$inferSelect>) {
  const allDevices = await db.select().from(devices);
  const allShops = await db.select().from(shops);
  const allUsers = await db.select().from(users);
  const allEvents = await db.select().from(transactionEvents).orderBy(asc(transactionEvents.createdAt));
  const allImages = await db.select().from(deviceImages);

  return txRows.map((tx) => {
    const dev = allDevices.find((d) => d.id === tx.deviceId);
    const shop = allShops.find((s) => s.id === tx.shopId);
    const owner = allUsers.find((u) => u.id === tx.ownerId);
    const events = allEvents.filter((e) => e.transactionId === tx.id);
    const imgs = allImages.filter((i) => i.deviceId === tx.deviceId);

    return {
      ...tx,
      device: dev ? { ...dev, primaryImage: imgs[0]?.storageKey || null } : null,
      shop: shop || null,
      owner: owner
        ? {
            id: owner.id,
            fullName: owner.fullName,
            phone: owner.phone,
            email: owner.email,
          }
        : null,
      events,
    };
  });
}

app.get('/api/users/me/transactions', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(transactions)
      .where(eq(transactions.ownerId, req.dbUser!.id))
      .orderBy(desc(transactions.updatedAt));
    const enriched = await enrichTransactions(rows);
    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load user transactions' });
  }
});

app.get('/api/shops/me/transactions', requireAuth, requireRole('SHOP'), async (req: AuthRequest, res) => {
  try {
    const [shop] = await db.select().from(shops).where(eq(shops.userId, req.dbUser!.id)).limit(1);
    if (!shop) return res.json([]);
    const rows = await db
      .select()
      .from(transactions)
      .where(eq(transactions.shopId, shop.id))
      .orderBy(desc(transactions.updatedAt));
    const enriched = await enrichTransactions(rows);
    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load shop transactions' });
  }
});

app.get('/api/transactions/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const txId = Number(req.params.id);
    const [tx] = await db.select().from(transactions).where(eq(transactions.id, txId)).limit(1);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    const [shop] = await db.select().from(shops).where(eq(shops.id, tx.shopId)).limit(1);
    const isParticipant =
      tx.ownerId === req.dbUser!.id || shop?.userId === req.dbUser!.id || req.dbUser!.role === 'ADMIN';
    if (!isParticipant) {
      return res.status(403).json({ error: 'Not authorized to view this transaction.' });
    }

    const [enriched] = await enrichTransactions([tx]);
    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load transaction details' });
  }
});

app.post('/api/transactions/:id/schedule-collection', requireAuth, async (req: AuthRequest, res) => {
  try {
    const txId = Number(req.params.id);
    const [tx] = await db.select().from(transactions).where(eq(transactions.id, txId)).limit(1);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    const [shop] = await db.select().from(shops).where(eq(shops.id, tx.shopId)).limit(1);
    if (tx.ownerId !== req.dbUser!.id && shop?.userId !== req.dbUser!.id) {
      return res.status(403).json({ error: 'Unauthorized participant' });
    }

    const { collectionMethod, collectionScheduledAt, collectionLocationNotes, collectionInstructions } = req.body;
    if (!collectionScheduledAt) {
      return res.status(400).json({ error: 'Proposed collection date and time are required.' });
    }

    const [updated] = await db
      .update(transactions)
      .set({
        collectionMethod: collectionMethod || tx.collectionMethod,
        collectionScheduledAt: String(collectionScheduledAt),
        collectionLocationNotes:
          collectionLocationNotes !== undefined ? String(collectionLocationNotes) : tx.collectionLocationNotes,
        collectionInstructions:
          collectionInstructions !== undefined ? String(collectionInstructions) : tx.collectionInstructions,
        transactionStatus: 'SCHEDULED',
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, txId))
      .returning();

    await db.insert(transactionEvents).values({
      transactionId: tx.id,
      actorId: req.dbUser!.id,
      previousStatus: tx.transactionStatus,
      newStatus: 'SCHEDULED',
      eventDescription: `Collection scheduled for ${collectionScheduledAt} (${collectionMethod || tx.collectionMethod}).`,
    });

    const targetNotifyId = req.dbUser!.id === tx.ownerId && shop ? shop.userId : tx.ownerId;
    await createNotification({
      userId: targetNotifyId,
      notificationType: 'COLLECTION_SCHEDULED',
      title: 'Collection Date Scheduled',
      message: `Collection has been scheduled for ${collectionScheduledAt}.`,
      relatedDeviceId: tx.deviceId,
      relatedTransactionId: tx.id,
    });

    const [enriched] = await enrichTransactions([updated]);
    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to schedule collection' });
  }
});

app.post('/api/transactions/:id/confirm-collection', requireAuth, async (req: AuthRequest, res) => {
  try {
    const txId = Number(req.params.id);
    const [tx] = await db.select().from(transactions).where(eq(transactions.id, txId)).limit(1);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    const [shop] = await db.select().from(shops).where(eq(shops.id, tx.shopId)).limit(1);
    if (tx.ownerId !== req.dbUser!.id && shop?.userId !== req.dbUser!.id) {
      return res.status(403).json({ error: 'Unauthorized participant' });
    }

    const now = new Date();
    const [updated] = await db
      .update(transactions)
      .set({
        transactionStatus: 'COLLECTED',
        collectedAt: now,
        updatedAt: now,
      })
      .where(eq(transactions.id, txId))
      .returning();

    await db
      .update(devices)
      .set({ listingStatus: 'COLLECTED', updatedAt: now })
      .where(eq(devices.id, tx.deviceId));

    await db.insert(transactionEvents).values({
      transactionId: tx.id,
      actorId: req.dbUser!.id,
      previousStatus: tx.transactionStatus,
      newStatus: 'COLLECTED',
      eventDescription: `Device physical handover / collection confirmed by ${req.dbUser!.fullName}.`,
    });

    const targetNotifyId = req.dbUser!.id === tx.ownerId && shop ? shop.userId : tx.ownerId;
    await createNotification({
      userId: targetNotifyId,
      notificationType: 'COLLECTION_CONFIRMED',
      title: 'Device Collection Confirmed',
      message: 'Device collection has been recorded. Please complete final handover confirmation.',
      relatedDeviceId: tx.deviceId,
      relatedTransactionId: tx.id,
    });

    const [enriched] = await enrichTransactions([updated]);
    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to confirm collection' });
  }
});

app.post('/api/transactions/:id/complete', requireAuth, async (req: AuthRequest, res) => {
  try {
    const txId = Number(req.params.id);
    const [tx] = await db.select().from(transactions).where(eq(transactions.id, txId)).limit(1);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    const [shop] = await db.select().from(shops).where(eq(shops.id, tx.shopId)).limit(1);
    if (tx.ownerId !== req.dbUser!.id && shop?.userId !== req.dbUser!.id) {
      return res.status(403).json({ error: 'Unauthorized participant' });
    }

    const { handoverChecklistConfirmed, shopNextAction, shopHandlingNotes } = req.body;
    const now = new Date();

    const [updated] = await db
      .update(transactions)
      .set({
        transactionStatus: 'COMPLETED',
        handoverChecklistConfirmed:
          handoverChecklistConfirmed !== undefined
            ? Boolean(handoverChecklistConfirmed)
            : tx.handoverChecklistConfirmed,
        shopNextAction: shopNextAction || tx.shopNextAction || 'REFURBISH',
        shopHandlingNotes: shopHandlingNotes !== undefined ? String(shopHandlingNotes) : tx.shopHandlingNotes,
        collectedAt: tx.collectedAt || now,
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(transactions.id, txId))
      .returning();

    await db
      .update(devices)
      .set({ listingStatus: 'COMPLETED', updatedAt: now })
      .where(eq(devices.id, tx.deviceId));

    await db.insert(transactionEvents).values({
      transactionId: tx.id,
      actorId: req.dbUser!.id,
      previousStatus: tx.transactionStatus,
      newStatus: 'COMPLETED',
      eventDescription: `Transaction marked COMPLETED after Safe Device Handover checklist verification.`,
    });

    const targetNotifyId = req.dbUser!.id === tx.ownerId && shop ? shop.userId : tx.ownerId;
    await createNotification({
      userId: targetNotifyId,
      notificationType: 'TRANSACTION_COMPLETED',
      title: 'Transaction Completed!',
      message: 'Your electronics handover and transaction have been officially completed on ReCircuit.',
      relatedDeviceId: tx.deviceId,
      relatedTransactionId: tx.id,
    });

    const [enriched] = await enrichTransactions([updated]);
    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to complete transaction' });
  }
});

app.post('/api/transactions/:id/cancel', requireAuth, async (req: AuthRequest, res) => {
  try {
    const txId = Number(req.params.id);
    const { reason } = req.body;
    const [tx] = await db.select().from(transactions).where(eq(transactions.id, txId)).limit(1);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    const [shop] = await db.select().from(shops).where(eq(shops.id, tx.shopId)).limit(1);
    if (tx.ownerId !== req.dbUser!.id && shop?.userId !== req.dbUser!.id && req.dbUser!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized participant' });
    }

    if (tx.transactionStatus === 'COMPLETED') {
      return res.status(400).json({ error: 'Completed transactions cannot be cancelled.' });
    }

    const now = new Date();
    const [updated] = await db
      .update(transactions)
      .set({ transactionStatus: 'CANCELLED', updatedAt: now })
      .where(eq(transactions.id, txId))
      .returning();

    await db
      .update(devices)
      .set({ listingStatus: 'AVAILABLE', updatedAt: now })
      .where(eq(devices.id, tx.deviceId));

    await db.insert(transactionEvents).values({
      transactionId: tx.id,
      actorId: req.dbUser!.id,
      previousStatus: tx.transactionStatus,
      newStatus: 'CANCELLED',
      eventDescription: `Transaction cancelled (${reason || 'By participant'}). Device returned to AVAILABLE status.`,
    });

    const [enriched] = await enrichTransactions([updated]);
    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to cancel transaction' });
  }
});

app.patch('/api/transactions/:id/shop-handling', requireAuth, requireRole('SHOP'), async (req: AuthRequest, res) => {
  try {
    const txId = Number(req.params.id);
    const { shopNextAction, shopHandlingNotes } = req.body;
    const [tx] = await db.select().from(transactions).where(eq(transactions.id, txId)).limit(1);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    const [shop] = await db.select().from(shops).where(eq(shops.id, tx.shopId)).limit(1);
    if (!shop || shop.userId !== req.dbUser!.id) {
      return res.status(403).json({ error: 'Only the acquiring shop can record post-acquisition handling.' });
    }

    const [updated] = await db
      .update(transactions)
      .set({
        shopNextAction,
        shopHandlingNotes: shopHandlingNotes || '',
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, txId))
      .returning();

    await db.insert(transactionEvents).values({
      transactionId: tx.id,
      actorId: req.dbUser!.id,
      previousStatus: tx.transactionStatus,
      newStatus: tx.transactionStatus,
      eventDescription: `Shop recorded post-acquisition handling: ${shopNextAction} — ${shopHandlingNotes || 'Updated lifecycle record'}.`,
    });

    const [enriched] = await enrichTransactions([updated]);
    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update handling action' });
  }
});

// ============================================================================
// MESSAGING & CONVERSATIONS ENDPOINTS
// ============================================================================

app.get('/api/conversations', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.dbUser!.id;
    const myParticipations = await db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));

    const convIds = myParticipations.map((p) => p.conversationId);
    if (convIds.length === 0) return res.json([]);

    const convs = await db
      .select()
      .from(conversations)
      .where(inArray(conversations.id, convIds))
      .orderBy(desc(conversations.updatedAt));

    const allParticipants = await db
      .select()
      .from(conversationParticipants)
      .where(inArray(conversationParticipants.conversationId, convIds));
    const allUsers = await db.select().from(users);
    const allShops = await db.select().from(shops);
    const allDevices = await db.select().from(devices);
    const allMessages = await db
      .select()
      .from(messages)
      .where(inArray(messages.conversationId, convIds))
      .orderBy(asc(messages.createdAt));

    const result = convs.map((conv) => {
      const partIds = allParticipants.filter((p) => p.conversationId === conv.id).map((p) => p.userId);
      const otherUserId = partIds.find((id) => id !== userId) || userId;
      const otherUser = allUsers.find((u) => u.id === otherUserId);
      const otherShop = allShops.find((s) => s.userId === otherUserId);
      const device = conv.deviceId ? allDevices.find((d) => d.id === conv.deviceId) : null;
      const convMsgs = allMessages.filter((m) => m.conversationId === conv.id);
      const lastMessage = convMsgs[convMsgs.length - 1] || null;
      const unreadCount = convMsgs.filter((m) => m.senderId !== userId && !m.readAt).length;

      return {
        ...conv,
        otherParticipant: {
          id: otherUser?.id,
          displayName: otherShop ? otherShop.shopName : otherUser?.fullName || 'Participant',
          role: otherUser?.role || 'USER',
          isVerifiedShop: otherShop?.verificationStatus === 'APPROVED',
        },
        device: device
          ? {
              id: device.id,
              title: device.title,
              listingCode: device.listingCode,
              listingStatus: device.listingStatus,
            }
          : null,
        lastMessage,
        unreadCount,
      };
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load conversations' });
  }
});

app.post('/api/conversations', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { recipientUserId, deviceId, initialMessage } = req.body;
    let targetUserId = Number(recipientUserId);

    if (deviceId && !targetUserId) {
      const [dev] = await db.select().from(devices).where(eq(devices.id, Number(deviceId))).limit(1);
      if (!dev) return res.status(404).json({ error: 'Device not found' });
      targetUserId = dev.ownerId;
    }

    if (!targetUserId || targetUserId === req.dbUser!.id) {
      return res.status(400).json({ error: 'Valid recipient is required.' });
    }

    if (req.dbUser!.role === 'SHOP') {
      const [shop] = await db.select().from(shops).where(eq(shops.userId, req.dbUser!.id)).limit(1);
      if (!shop || shop.verificationStatus !== 'APPROVED') {
        return res.status(403).json({ error: 'Only verified shops can initiate conversations with device owners.' });
      }
    }

    const conv = await ensureConversation(req.dbUser!.id, targetUserId, deviceId ? Number(deviceId) : null, null);

    if (initialMessage && String(initialMessage).trim() !== '') {
      await db.insert(messages).values({
        conversationId: conv.id,
        senderId: req.dbUser!.id,
        messageText: String(initialMessage).trim(),
      });
      await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conv.id));

      await createNotification({
        userId: targetUserId,
        notificationType: 'NEW_MESSAGE',
        title: `New Message from ${req.dbUser!.fullName}`,
        message: String(initialMessage).slice(0, 100),
        relatedDeviceId: deviceId ? Number(deviceId) : null,
      });
    }

    res.status(201).json(conv);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to start conversation' });
  }
});

app.get('/api/conversations/:id/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const convId = Number(req.params.id);
    const parts = await db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, convId));

    if (!parts.some((p) => p.userId === req.dbUser!.id) && req.dbUser!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: You are not a participant in this conversation.' });
    }

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(asc(messages.createdAt));

    res.json(msgs);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load messages' });
  }
});

app.post('/api/conversations/:id/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const convId = Number(req.params.id);
    const { messageText, attachmentKey } = req.body;
    if (!messageText || String(messageText).trim() === '') {
      return res.status(400).json({ error: 'Message text cannot be empty.' });
    }

    const parts = await db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, convId));

    if (!parts.some((p) => p.userId === req.dbUser!.id)) {
      return res.status(403).json({ error: 'Forbidden: You are not a participant in this conversation.' });
    }

    const [created] = await db
      .insert(messages)
      .values({
        conversationId: convId,
        senderId: req.dbUser!.id,
        messageText: String(messageText).trim(),
        attachmentKey: attachmentKey || null,
      })
      .returning();

    await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, convId));

    const otherPart = parts.find((p) => p.userId !== req.dbUser!.id);
    if (otherPart) {
      const [conv] = await db.select().from(conversations).where(eq(conversations.id, convId)).limit(1);
      await createNotification({
        userId: otherPart.userId,
        notificationType: 'NEW_MESSAGE',
        title: `New Message from ${req.dbUser!.fullName}`,
        message: String(messageText).slice(0, 100),
        relatedDeviceId: conv?.deviceId || null,
        relatedTransactionId: conv?.transactionId || null,
      });
    }

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

app.post('/api/conversations/:id/read', requireAuth, async (req: AuthRequest, res) => {
  try {
    const convId = Number(req.params.id);
    const convMsgs = await db.select().from(messages).where(eq(messages.conversationId, convId));
    const unreadIds = convMsgs.filter((m) => m.senderId !== req.dbUser!.id && !m.readAt).map((m) => m.id);
    if (unreadIds.length > 0) {
      await db.update(messages).set({ readAt: new Date() }).where(inArray(messages.id, unreadIds));
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to mark messages as read' });
  }
});

// ============================================================================
// NOTIFICATIONS ENDPOINTS
// ============================================================================

app.get('/api/notifications', requireAuth, async (req: AuthRequest, res) => {
  try {
    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.dbUser!.id))
      .orderBy(desc(notifications.createdAt));
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch notifications' });
  }
});

app.patch('/api/notifications/:id/read', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, req.dbUser!.id)));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to mark notification read' });
  }
});

app.post('/api/notifications/read-all', requireAuth, async (req: AuthRequest, res) => {
  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, req.dbUser!.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to mark notifications read' });
  }
});

// ============================================================================
// REPORTS & SUPPORT ENDPOINTS
// ============================================================================

app.post('/api/reports', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { reportedUserId, deviceId, transactionId, reportType, description } = req.body;
    if (!reportType || !description) {
      return res.status(400).json({ error: 'Report type and detailed description are required.' });
    }
    const [created] = await db
      .insert(reports)
      .values({
        reporterId: req.dbUser!.id,
        reportedUserId: reportedUserId ? Number(reportedUserId) : null,
        deviceId: deviceId ? Number(deviceId) : null,
        transactionId: transactionId ? Number(transactionId) : null,
        reportType: String(reportType),
        description: String(description).trim(),
        reportStatus: 'OPEN',
      })
      .returning();

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to submit report' });
  }
});

app.get('/api/users/me/reports', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(reports)
      .where(eq(reports.reporterId, req.dbUser!.id))
      .orderBy(desc(reports.createdAt));
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load reports' });
  }
});

app.post('/api/support', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Name, email, subject, and message are required.' });
    }
    const [created] = await db
      .insert(supportRequests)
      .values({
        userId: req.dbUser?.id || null,
        name: String(name).trim(),
        email: String(email).trim(),
        subject: String(subject).trim(),
        message: String(message).trim(),
        status: 'OPEN',
      })
      .returning();
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to submit support request' });
  }
});

app.get('/api/users/me/support-requests', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(supportRequests)
      .where(eq(supportRequests.userId, req.dbUser!.id))
      .orderBy(desc(supportRequests.createdAt));
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch support requests' });
  }
});

// ============================================================================
// ADMIN DASHBOARD ENDPOINTS
// ============================================================================

app.get('/api/admin/dashboard', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  try {
    const allUsers = await db.select().from(users);
    const allShops = await db.select().from(shops);
    const allDevices = await db.select().from(devices);
    const allTransactions = await db.select().from(transactions);
    const allReports = await db.select().from(reports);
    const allSupport = await db.select().from(supportRequests);

    res.json({
      registeredUsers: allUsers.filter((u) => u.role === 'USER').length,
      registeredShops: allShops.length,
      shopsPendingVerification: allShops.filter((s) => s.verificationStatus === 'PENDING_VERIFICATION').length,
      verifiedShops: allShops.filter((s) => s.verificationStatus === 'APPROVED').length,
      totalDeviceListings: allDevices.length,
      availableDevices: allDevices.filter((d) => ['AVAILABLE', 'INTERESTED', 'NEGOTIATING'].includes(d.listingStatus))
        .length,
      completedTransactions: allTransactions.filter((t) => t.transactionStatus === 'COMPLETED').length,
      reportedListings: allReports.filter((r) => r.reportStatus === 'OPEN').length,
      openDisputes: allTransactions.filter((t) => t.transactionStatus === 'DISPUTED').length,
      openSupportRequests: allSupport.filter((s) => s.status === 'OPEN').length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load admin overview' });
  }
});

app.get('/api/admin/users', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  try {
    const rows = await db.select().from(users).orderBy(desc(users.createdAt));
    const safeRows = rows.map(({ passwordHash: _pw, ...u }) => u);
    res.json(safeRows);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load users' });
  }
});

app.patch('/api/admin/users/:id/status', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const targetId = Number(req.params.id);
    const { accountStatus } = req.body;
    const [updated] = await db
      .update(users)
      .set({ accountStatus, updatedAt: new Date() })
      .where(eq(users.id, targetId))
      .returning();

    await db.insert(auditLogs).values({
      actorId: req.dbUser!.id,
      action: `USER_STATUS_${accountStatus}`,
      entityType: 'USER',
      entityId: String(targetId),
      metadata: JSON.stringify({ email: updated.email, accountStatus }),
    });

    const { passwordHash: _pw, ...safeUser } = updated;
    res.json(safeUser);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update user status' });
  }
});

app.get('/api/admin/shops', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  try {
    const allShops = await db.select().from(shops).orderBy(desc(shops.createdAt));
    const allDocs = await db.select().from(shopVerificationDocuments);
    const allUsers = await db.select().from(users);

    const enriched = allShops.map((shop) => {
      const user = allUsers.find((u) => u.id === shop.userId);
      const docs = allDocs.filter((d) => d.shopId === shop.id);
      return {
        ...shop,
        email: user?.email || '',
        phone: user?.phone || '',
        documents: docs,
      };
    });

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load shops' });
  }
});

app.patch('/api/admin/shops/:id/verification', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const shopId = Number(req.params.id);
    const { verificationStatus, verificationNotes } = req.body; // 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED' | 'SUSPENDED'
    if (!verificationStatus) {
      return res.status(400).json({ error: 'Verification status is required.' });
    }

    const now = new Date();
    const [updatedShop] = await db
      .update(shops)
      .set({
        verificationStatus,
        verificationNotes: verificationNotes || '',
        updatedAt: now,
      })
      .where(eq(shops.id, shopId))
      .returning();

    await db
      .update(shopVerificationDocuments)
      .set({
        reviewStatus: verificationStatus === 'APPROVED' ? 'APPROVED' : verificationStatus,
        reviewedBy: req.dbUser!.id,
        reviewedAt: now,
      })
      .where(eq(shopVerificationDocuments.shopId, shopId));

    await db.insert(auditLogs).values({
      actorId: req.dbUser!.id,
      action: `SHOP_VERIFICATION_${verificationStatus}`,
      entityType: 'SHOP',
      entityId: String(shopId),
      metadata: JSON.stringify({
        shopName: updatedShop.shopName,
        verificationStatus,
        verificationNotes,
      }),
    });

    await createNotification({
      userId: updatedShop.userId,
      notificationType: 'SHOP_VERIFICATION_UPDATE',
      title: `Shop Verification: ${verificationStatus.replace(/_/g, ' ')}`,
      message:
        verificationNotes ||
        `Your shop ${updatedShop.shopName} verification status has been updated to ${verificationStatus}.`,
    });

    res.json(updatedShop);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update shop verification' });
  }
});

app.get('/api/admin/devices', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  try {
    const allDevs = await db.select().from(devices).orderBy(desc(devices.createdAt));
    const allUsers = await db.select().from(users);
    const enriched = allDevs.map((d) => ({
      ...d,
      ownerName: allUsers.find((u) => u.id === d.ownerId)?.fullName || 'Unknown',
      ownerEmail: allUsers.find((u) => u.id === d.ownerId)?.email || '',
    }));
    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load devices' });
  }
});

app.patch('/api/admin/devices/:id/moderation', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const deviceId = Number(req.params.id);
    const { listingStatus, reason } = req.body;
    const [updated] = await db
      .update(devices)
      .set({
        listingStatus,
        isPublic: listingStatus === 'AVAILABLE',
        updatedAt: new Date(),
      })
      .where(eq(devices.id, deviceId))
      .returning();

    await db.insert(auditLogs).values({
      actorId: req.dbUser!.id,
      action: `DEVICE_MODERATION_${listingStatus}`,
      entityType: 'DEVICE',
      entityId: String(deviceId),
      metadata: JSON.stringify({ listingCode: updated.listingCode, listingStatus, reason }),
    });

    await createNotification({
      userId: updated.ownerId,
      notificationType: 'DEVICE_MODERATION',
      title: `Listing Moderation Update (${updated.listingCode})`,
      message: `Your listing "${updated.title}" status was updated to ${listingStatus}. ${reason ? `Note: ${reason}` : ''}`,
      relatedDeviceId: updated.id,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to moderate device' });
  }
});

app.get('/api/admin/reports', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  try {
    const rows = await db.select().from(reports).orderBy(desc(reports.createdAt));
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load reports' });
  }
});

app.patch('/api/admin/reports/:id', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const reportId = Number(req.params.id);
    const { reportStatus, resolutionNotes } = req.body;
    const [updated] = await db
      .update(reports)
      .set({
        reportStatus,
        resolutionNotes: resolutionNotes || '',
        reviewedBy: req.dbUser!.id,
        reviewedAt: new Date(),
      })
      .where(eq(reports.id, reportId))
      .returning();

    await db.insert(auditLogs).values({
      actorId: req.dbUser!.id,
      action: `REPORT_${reportStatus}`,
      entityType: 'REPORT',
      entityId: String(reportId),
      metadata: JSON.stringify({ reportStatus, resolutionNotes }),
    });

    await createNotification({
      userId: updated.reporterId,
      notificationType: 'REPORT_UPDATE',
      title: `Report #${updated.id} Status: ${reportStatus}`,
      message: resolutionNotes || `An administrator reviewed your report (#${updated.id}).`,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update report' });
  }
});

app.get('/api/admin/transactions', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  try {
    const rows = await db.select().from(transactions).orderBy(desc(transactions.createdAt));
    const enriched = await enrichTransactions(rows);
    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load transactions' });
  }
});

app.get('/api/admin/support-requests', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  try {
    const rows = await db.select().from(supportRequests).orderBy(desc(supportRequests.createdAt));
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load support requests' });
  }
});

app.patch('/api/admin/support-requests/:id', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    const [updated] = await db
      .update(supportRequests)
      .set({ status, updatedAt: new Date() })
      .where(eq(supportRequests.id, id))
      .returning();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update support request' });
  }
});

app.get('/api/admin/analytics', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  try {
    const allDevices = await db.select().from(devices);
    const allTransactions = await db.select().from(transactions);

    const byCategoryMap: Record<string, number> = {};
    const byConditionMap: Record<string, number> = {};
    const byCityMap: Record<string, number> = {};
    const byDisposalMap: Record<string, number> = {};

    for (const d of allDevices) {
      byCategoryMap[d.category] = (byCategoryMap[d.category] || 0) + 1;
      byConditionMap[d.condition] = (byConditionMap[d.condition] || 0) + 1;
      byCityMap[d.city] = (byCityMap[d.city] || 0) + 1;
      byDisposalMap[d.disposalPreference] = (byDisposalMap[d.disposalPreference] || 0) + 1;
    }

    res.json({
      byCategory: Object.entries(byCategoryMap).map(([name, count]) => ({ name, count })),
      byCondition: Object.entries(byConditionMap).map(([name, count]) => ({ name, count })),
      byCity: Object.entries(byCityMap).map(([name, count]) => ({ name, count })),
      byDisposal: Object.entries(byDisposalMap).map(([name, count]) => ({ name, count })),
      lifecycleBreakdown: [
        { stage: 'Registered Devices', count: allDevices.length },
        {
          stage: 'Collected by Partner Shops',
          count: allTransactions.filter((t) => ['COLLECTED', 'COMPLETED'].includes(t.transactionStatus)).length,
        },
        {
          stage: 'Completed Reuse / Refurbish',
          count: allTransactions.filter(
            (t) => t.transactionStatus === 'COMPLETED' && t.transactionType !== 'RECYCLING'
          ).length,
        },
        {
          stage: 'Verified End-of-Life Recycling',
          count: allTransactions.filter(
            (t) =>
              t.transactionStatus === 'COMPLETED' &&
              (t.transactionType === 'RECYCLING' || t.shopNextAction === 'SEND_TO_RECYCLER')
          ).length,
        },
      ],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to compute analytics' });
  }
});

app.get('/api/admin/audit-logs', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  try {
    const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
    const allUsers = await db.select().from(users);
    const enriched = logs.map((l) => ({
      ...l,
      actorName: allUsers.find((u) => u.id === l.actorId)?.fullName || 'System / Admin',
    }));
    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load audit logs' });
  }
});

// ============================================================================
// VITE DEV MIDDLEWARE / STATIC ASSETS
// ============================================================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ReCircuit Full-Stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
