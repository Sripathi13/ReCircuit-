import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull().default(''),
  passwordHash: text('password_hash').notNull().default(''),
  role: text('role').notNull().default('USER'), // 'USER' | 'SHOP' | 'ADMIN'
  emailVerifiedAt: timestamp('email_verified_at'),
  accountStatus: text('account_status').notNull().default('ACTIVE'), // 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  city: text('city').notNull().default(''),
  state: text('state').notNull().default(''),
  pinCode: text('pin_code').notNull().default(''),
  approximateLocality: text('approximate_locality').notNull().default(''),
  profileImageUrl: text('profile_image_url'),
  preferredContactMethod: text('preferred_contact_method').notNull().default('MESSAGING'),
  phoneDisclosurePreference: text('phone_disclosure_preference').notNull().default('AFTER_ACCEPTANCE'),
  emailNotifications: boolean('email_notifications').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const shops = pgTable('shops', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  shopName: text('shop_name').notNull(),
  ownerName: text('owner_name').notNull(),
  businessType: text('business_type').notNull(),
  description: text('description').notNull(),
  businessRegistrationNumber: text('business_registration_number').notNull().default(''),
  addressPrivate: text('address_private').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  pinCode: text('pin_code').notNull(),
  verificationStatus: text('verification_status').notNull().default('PENDING_VERIFICATION'), // 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED' | 'SUSPENDED'
  verificationNotes: text('verification_notes'),
  acceptedCategories: text('accepted_categories').notNull().default('[]'),
  collectionPreferences: text('collection_preferences').notNull().default('[]'),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const shopVerificationDocuments = pgTable('shop_verification_documents', {
  id: serial('id').primaryKey(),
  shopId: integer('shop_id')
    .references(() => shops.id, { onDelete: 'cascade' })
    .notNull(),
  documentType: text('document_type').notNull(),
  fileName: text('file_name').notNull(),
  privateStorageKey: text('private_storage_key').notNull(),
  reviewStatus: text('review_status').notNull().default('PENDING'),
  reviewedBy: integer('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const devices = pgTable('devices', {
  id: serial('id').primaryKey(),
  listingCode: text('listing_code').notNull().unique(),
  ownerId: integer('owner_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  purchaseYear: integer('purchase_year'),
  description: text('description').notNull(),
  condition: text('condition').notNull(), // 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'DAMAGED' | 'NOT_WORKING' | 'FOR_PARTS_ONLY'
  powersOn: boolean('powers_on').notNull().default(true),
  screenFunctional: boolean('screen_functional').notNull().default(true),
  batteryCondition: text('battery_condition').notNull().default('WORKING'),
  accessories: text('accessories').notNull().default('[]'),
  originalChargerIncluded: boolean('original_charger_included').notNull().default(false),
  hasPhysicalDamage: boolean('has_physical_damage').notNull().default(false),
  knownDamage: text('known_damage').notNull().default(''),
  conditionNotes: text('condition_notes').notNull().default(''),
  disposalPreference: text('disposal_preference').notNull(), // 'SELL' | 'DONATE' | 'EXCHANGE' | 'REPAIR_OR_REFURBISH' | 'RECYCLE_RESPONSIBLY' | 'OPEN_TO_MULTIPLE'
  disposalDetails: text('disposal_details').notNull().default(''),
  askingPrice: integer('asking_price'),
  priceNegotiable: boolean('price_negotiable').notNull().default(true),
  city: text('city').notNull(),
  state: text('state').notNull().default(''),
  pinCode: text('pin_code').notNull(),
  approximateLocality: text('approximate_locality').notNull(),
  contactMethod: text('contact_method').notNull().default('MESSAGING'),
  preferredCollectionMethod: text('preferred_collection_method').notNull().default('SHOP_PICKUP'),
  phoneRevealPolicy: text('phone_reveal_policy').notNull().default('AFTER_ACCEPTANCE'),
  isPublic: boolean('is_public').notNull().default(true),
  listingStatus: text('listing_status').notNull().default('AVAILABLE'), // 'DRAFT' | 'PENDING_REVIEW' | 'AVAILABLE' | 'INTERESTED' | 'REQUEST_PENDING' | 'NEGOTIATING' | 'RESERVED' | 'COLLECTED' | 'COMPLETED' | 'PAUSED' | 'UNAVAILABLE' | 'CANCELLED' | 'REPORTED'
  isDemo: boolean('is_demo').notNull().default(false),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const deviceImages = pgTable('device_images', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id')
    .references(() => devices.id, { onDelete: 'cascade' })
    .notNull(),
  storageKey: text('storage_key').notNull(),
  imageType: text('image_type').notNull().default('FRONT'),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const savedDevices = pgTable('saved_devices', {
  id: serial('id').primaryKey(),
  shopId: integer('shop_id')
    .references(() => shops.id, { onDelete: 'cascade' })
    .notNull(),
  deviceId: integer('device_id')
    .references(() => devices.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const deviceInterests = pgTable('device_interests', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id')
    .references(() => devices.id, { onDelete: 'cascade' })
    .notNull(),
  shopId: integer('shop_id')
    .references(() => shops.id, { onDelete: 'cascade' })
    .notNull(),
  interestMessage: text('interest_message').notNull(),
  intendedAction: text('intended_action').notNull(), // 'PURCHASE' | 'DONATION_COLLECTION' | 'EXCHANGE' | 'REPAIR_OR_REFURBISHMENT' | 'RESPONSIBLE_RECYCLING'
  proposedPrice: integer('proposed_price'),
  collectionMethod: text('collection_method').notNull(),
  proposedCollectionDate: text('proposed_collection_date'),
  additionalNotes: text('additional_notes'),
  requestStatus: text('request_status').notNull().default('PENDING'), // 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const offers = pgTable('offers', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id')
    .references(() => devices.id, { onDelete: 'cascade' })
    .notNull(),
  shopId: integer('shop_id')
    .references(() => shops.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  proposedPrice: integer('proposed_price').notNull(),
  counterPrice: integer('counter_price'),
  currency: text('currency').notNull().default('INR'),
  collectionMethod: text('collection_method').notNull().default('SHOP_PICKUP'),
  proposedCollectionDate: text('proposed_collection_date'),
  message: text('message'),
  offerStatus: text('offer_status').notNull().default('PENDING'), // 'PENDING' | 'COUNTERED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
  expiresAt: text('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id')
    .references(() => devices.id)
    .notNull(),
  ownerId: integer('owner_id')
    .references(() => users.id)
    .notNull(),
  shopId: integer('shop_id')
    .references(() => shops.id)
    .notNull(),
  acceptedOfferId: integer('accepted_offer_id'),
  acceptedInterestId: integer('accepted_interest_id'),
  transactionType: text('transaction_type').notNull(), // 'SALE' | 'DONATION' | 'EXCHANGE' | 'REFURBISHMENT' | 'RECYCLING'
  agreedPrice: integer('agreed_price'),
  transactionStatus: text('transaction_status').notNull().default('REQUESTED'), // 'REQUESTED' | 'AWAITING_CONFIRMATION' | 'SCHEDULED' | 'READY_FOR_HANDOVER' | 'COLLECTED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED'
  collectionMethod: text('collection_method').notNull().default('SHOP_PICKUP'),
  collectionScheduledAt: text('collection_scheduled_at'),
  collectionLocationNotes: text('collection_location_notes'),
  collectionInstructions: text('collection_instructions'),
  handoverChecklistConfirmed: boolean('handover_checklist_confirmed').notNull().default(false),
  shopNextAction: text('shop_next_action'), // 'REPAIR' | 'REFURBISH' | 'RESELL' | 'DONATE' | 'HARVEST_PARTS' | 'SEND_TO_RECYCLER'
  shopHandlingNotes: text('shop_handling_notes'),
  collectedAt: timestamp('collected_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const transactionEvents = pgTable('transaction_events', {
  id: serial('id').primaryKey(),
  transactionId: integer('transaction_id')
    .references(() => transactions.id, { onDelete: 'cascade' })
    .notNull(),
  actorId: integer('actor_id')
    .references(() => users.id)
    .notNull(),
  previousStatus: text('previous_status'),
  newStatus: text('new_status').notNull(),
  eventDescription: text('event_description').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id').references(() => devices.id, { onDelete: 'set null' }),
  transactionId: integer('transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const conversationParticipants = pgTable('conversation_participants', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id')
    .references(() => conversations.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id')
    .references(() => conversations.id, { onDelete: 'cascade' })
    .notNull(),
  senderId: integer('sender_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  messageText: text('message_text').notNull(),
  attachmentKey: text('attachment_key'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  notificationType: text('notification_type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  relatedDeviceId: integer('related_device_id'),
  relatedTransactionId: integer('related_transaction_id'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  reporterId: integer('reporter_id')
    .references(() => users.id)
    .notNull(),
  reportedUserId: integer('reported_user_id').references(() => users.id),
  deviceId: integer('device_id').references(() => devices.id),
  transactionId: integer('transaction_id').references(() => transactions.id),
  reportType: text('report_type').notNull(),
  description: text('description').notNull(),
  reportStatus: text('report_status').notNull().default('OPEN'), // 'OPEN' | 'UNDER_REVIEW' | 'ACTION_REQUIRED' | 'RESOLVED' | 'CLOSED'
  resolutionNotes: text('resolution_notes'),
  reviewedBy: integer('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const supportRequests = pgTable('support_requests', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull().default('OPEN'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorId: integer('actor_id').references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  shop: one(shops, {
    fields: [users.id],
    references: [shops.userId],
  }),
  devices: many(devices),
  notifications: many(notifications),
}));
