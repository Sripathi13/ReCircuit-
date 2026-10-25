export type UserRole = 'USER' | 'SHOP' | 'ADMIN';

export interface UserProfileData {
  id: number;
  userId: number;
  city: string;
  state: string;
  pinCode: string;
  approximateLocality: string;
  profileImageUrl?: string | null;
  preferredContactMethod: string;
  phoneDisclosurePreference: string;
  emailNotifications: boolean;
}

export interface ShopVerificationDoc {
  id: number;
  shopId: number;
  documentType: string;
  fileName: string;
  privateStorageKey: string;
  reviewStatus: string;
  reviewedBy?: number | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface ShopData {
  id: number;
  userId: number;
  shopName: string;
  ownerName: string;
  businessType: string;
  description: string;
  businessRegistrationNumber: string;
  addressPrivate: string;
  city: string;
  state: string;
  pinCode: string;
  verificationStatus: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED' | 'SUSPENDED';
  verificationNotes?: string | null;
  acceptedCategories: string;
  collectionPreferences: string;
  isDemo: boolean;
  createdAt: string;
  documents?: ShopVerificationDoc[];
  email?: string;
  phone?: string;
}

export interface AuthUser {
  id: number;
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  emailVerifiedAt?: string | null;
  accountStatus: string;
  isDemo: boolean;
  createdAt: string;
  profile?: UserProfileData | null;
  shop?: ShopData | null;
}

export interface DeviceImage {
  id: number;
  deviceId: number;
  storageKey: string;
  imageType: string;
  displayOrder: number;
}

export interface DeviceListing {
  id: number;
  listingCode: string;
  ownerId: number;
  title: string;
  category: string;
  brand: string;
  model: string;
  purchaseYear?: number | null;
  description: string;
  condition: string;
  powersOn: boolean;
  screenFunctional: boolean;
  batteryCondition: string;
  accessories: string;
  originalChargerIncluded: boolean;
  hasPhysicalDamage: boolean;
  knownDamage: string;
  conditionNotes: string;
  disposalPreference: string;
  disposalDetails: string;
  askingPrice?: number | null;
  priceNegotiable: boolean;
  city: string;
  state: string;
  pinCode: string;
  approximateLocality: string;
  contactMethod: string;
  preferredCollectionMethod: string;
  phoneRevealPolicy: string;
  isPublic: boolean;
  listingStatus: string;
  isDemo: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  images?: DeviceImage[];
  primaryImage?: string | null;
  interestCount?: number;
  offerCount?: number;
  ownerName?: string;
  ownerEmail?: string;
  ownerInfo?: {
    id: number;
    displayName: string;
    preferredContactMethod: string;
    phoneRevealPolicy: string;
    phone?: string | null;
    email?: string | null;
    canContact: boolean;
  };
  viewerContext?: {
    isOwner: boolean;
    isAdmin: boolean;
    isVerifiedShop: boolean;
    shopVerificationStatus?: string | null;
    hasExistingInterest: boolean;
    hasExistingOffer: boolean;
  };
}

export interface DeviceInterestItem {
  id: number;
  deviceId: number;
  shopId: number;
  interestMessage: string;
  intendedAction: string;
  proposedPrice?: number | null;
  collectionMethod: string;
  proposedCollectionDate?: string | null;
  additionalNotes?: string | null;
  requestStatus: string;
  createdAt: string;
  device?: DeviceListing | null;
  shop?: {
    id: number;
    userId: number;
    shopName: string;
    businessType: string;
    city: string;
    state: string;
    verificationStatus: string;
    description: string;
  } | null;
}

export interface OfferItem {
  id: number;
  deviceId: number;
  shopId: number;
  userId: number;
  proposedPrice: number;
  counterPrice?: number | null;
  currency: string;
  collectionMethod: string;
  proposedCollectionDate?: string | null;
  message?: string | null;
  offerStatus: string;
  expiresAt?: string | null;
  createdAt: string;
  device?: DeviceListing | null;
  shop?: ShopData | null;
}

export interface TransactionEventItem {
  id: number;
  transactionId: number;
  actorId: number;
  previousStatus?: string | null;
  newStatus: string;
  eventDescription: string;
  createdAt: string;
}

export interface TransactionItem {
  id: number;
  deviceId: number;
  ownerId: number;
  shopId: number;
  acceptedOfferId?: number | null;
  acceptedInterestId?: number | null;
  transactionType: string;
  agreedPrice?: number | null;
  transactionStatus: string;
  collectionMethod: string;
  collectionScheduledAt?: string | null;
  collectionLocationNotes?: string | null;
  collectionInstructions?: string | null;
  handoverChecklistConfirmed: boolean;
  shopNextAction?: string | null;
  shopHandlingNotes?: string | null;
  collectedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  device?: DeviceListing | null;
  shop?: ShopData | null;
  owner?: {
    id: number;
    fullName: string;
    phone: string;
    email: string;
  } | null;
  events?: TransactionEventItem[];
}

export interface MessageItem {
  id: number;
  conversationId: number;
  senderId: number;
  messageText: string;
  attachmentKey?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface ConversationItem {
  id: number;
  deviceId?: number | null;
  transactionId?: number | null;
  createdAt: string;
  updatedAt: string;
  otherParticipant: {
    id: number;
    displayName: string;
    role: string;
    isVerifiedShop: boolean;
  };
  device?: {
    id: number;
    title: string;
    listingCode: string;
    listingStatus: string;
  } | null;
  lastMessage?: MessageItem | null;
  unreadCount: number;
}

export interface NotificationItem {
  id: number;
  userId: number;
  notificationType: string;
  title: string;
  message: string;
  relatedDeviceId?: number | null;
  relatedTransactionId?: number | null;
  isRead: boolean;
  createdAt: string;
}

export interface PlatformStats {
  devicesRegistered: number;
  devicesReused: number;
  devicesRecycled: number;
  verifiedShops: number;
}

export const DEVICE_CATEGORIES = [
  'Smartphones',
  'Tablets',
  'Laptops',
  'Desktop computers',
  'Monitors',
  'Smartwatches',
  'Televisions',
  'Cameras',
  'Printers',
  'Routers',
  'Gaming consoles',
  'Audio equipment',
  'Small electronic appliances',
  'Other electronics',
];

export const DEVICE_CONDITIONS = [
  { value: 'LIKE_NEW', label: 'Like New' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'NOT_WORKING', label: 'Not Working' },
  { value: 'FOR_PARTS_ONLY', label: 'For Parts Only' },
];

export const DISPOSAL_PREFERENCES = [
  { value: 'SELL', label: 'Sell' },
  { value: 'DONATE', label: 'Donate' },
  { value: 'EXCHANGE', label: 'Exchange' },
  { value: 'REPAIR_OR_REFURBISH', label: 'Repair or Refurbish' },
  { value: 'RECYCLE_RESPONSIBLY', label: 'Recycle Responsibly' },
  { value: 'OPEN_TO_MULTIPLE', label: 'Open to Multiple Options' },
];

export const SHOP_BUSINESS_TYPES = [
  'Mobile phone shop',
  'Laptop and computer shop',
  'Electronics repair shop',
  'Refurbishment business',
  'Second-hand electronics dealer',
  'Authorized e-waste recycler',
  'Other electronics-related business',
];

export function formatLabel(val?: string | null): string {
  if (!val) return '—';
  return val
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatCurrency(amount?: number | null): string {
  if (amount === undefined || amount === null) return '—';
  if (amount === 0) return 'Free / No Charge';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}
