import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Smartphone,
  PlusCircle,
  Store,
  Tag,
  MessageSquare,
  Bell,
  CheckCircle2,
  UserCheck,
  HelpCircle,
  LogOut,
  ShieldCheck,
  Grid,
  List,
  Pause,
  Play,
  Trash2,
  Eye,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  DeviceListing,
  DeviceInterestItem,
  OfferItem,
  TransactionItem,
  DEVICE_CATEGORIES,
  DEVICE_CONDITIONS,
  DISPOSAL_PREFERENCES,
  formatLabel,
  formatCurrency,
} from '../types';
import { PageRoute } from './Navbar';
import { DeviceImageFrame, SafeHandoverPage, ContactSupportPage } from './PublicPages';
import { MessagingPanel, NotificationsPanel } from './MessagingAndNotifications';

interface UserDashboardProps {
  initialTab?: string;
  onNavigate: (page: PageRoute, params?: { deviceId?: number }) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ initialTab = 'overview', onNavigate }) => {
  const { user, apiFetch, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(initialTab || 'overview');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const [myDevices, setMyDevices] = useState<DeviceListing[]>([]);
  const [interests, setInterests] = useState<DeviceInterestItem[]>([]);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // My Devices Filter & View Mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deviceSearch, setDeviceSearch] = useState('');
  const [deviceStatusFilter, setDeviceStatusFilter] = useState('ALL');

  // Counteroffer Modal State
  const [counterOfferId, setCounterOfferId] = useState<number | null>(null);
  const [counterPriceInput, setCounterPriceInput] = useState('');

  // Handover Checklist Modal before Transaction Completion
  const [completingTx, setCompletingTx] = useState<TransactionItem | null>(null);
  const [handoverChecks, setHandoverChecks] = useState({
    backedUp: false,
    signedOut: false,
    simRemoved: false,
    factoryReset: false,
  });

  // 6-Step Device Registration Wizard State
  const [regStep, setRegStep] = useState<number>(1);
  const [publishedConfirmation, setPublishedConfirmation] = useState<DeviceListing | null>(null);
  const [regForm, setRegForm] = useState({
    category: 'Smartphones',
    brand: '',
    model: '',
    purchaseYear: '2023',
    description: '',
    condition: 'GOOD',
    powersOn: true,
    screenFunctional: true,
    batteryCondition: 'WORKING',
    originalChargerIncluded: true,
    hasPhysicalDamage: false,
    knownDamage: '',
    conditionNotes: '',
    accessoriesText: 'USB-C Cable, Original Box',
    images: [] as Array<{ storageKey: string; imageType: string; name: string }>,
    disposalPreference: 'SELL',
    askingPrice: '15000',
    priceNegotiable: true,
    disposalDetails: '',
    city: user?.profile?.city || 'Coimbatore',
    state: user?.profile?.state || 'Tamil Nadu',
    pinCode: user?.profile?.pinCode || '641012',
    approximateLocality: user?.profile?.approximateLocality || 'RS Puram',
    contactMethod: 'MESSAGING',
    preferredCollectionMethod: 'SHOP_PICKUP',
    phoneRevealPolicy: 'AFTER_ACCEPTANCE',
    confirmRightToTransfer: false,
    confirmAccurateDescription: false,
    confirmDataErasure: false,
  });

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    city: user?.profile?.city || 'Coimbatore',
    state: user?.profile?.state || 'Tamil Nadu',
    pinCode: user?.profile?.pinCode || '641012',
    approximateLocality: user?.profile?.approximateLocality || 'RS Puram',
    preferredContactMethod: user?.profile?.preferredContactMethod || 'MESSAGING',
    phoneDisclosurePreference: user?.profile?.phoneDisclosurePreference || 'AFTER_ACCEPTANCE',
    emailNotifications: user?.profile?.emailNotifications ?? true,
  });

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [devs, ints, offs, txs] = await Promise.all([
        apiFetch<DeviceListing[]>('/api/users/me/devices'),
        apiFetch<DeviceInterestItem[]>('/api/users/me/interests'),
        apiFetch<OfferItem[]>('/api/users/me/offers'),
        apiFetch<TransactionItem[]>('/api/users/me/transactions'),
      ]);
      setMyDevices(devs);
      setInterests(ints);
      setOffers(offs);
      setTransactions(txs);
    } catch (err: any) {
      console.error('Error loading user dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Photo Upload Handler for Step 3
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, imageType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setBanner({ type: 'error', text: 'Unsupported file type. Please upload JPEG, PNG, or WebP images.' });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setBanner({ type: 'error', text: 'File exceeds 3 MB limit. Please choose a smaller photograph.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRegForm((prev) => ({
        ...prev,
        images: [
          ...prev.images.filter((img) => img.imageType !== imageType),
          { storageKey: String(reader.result), imageType, name: file.name },
        ],
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreateListing = async (saveAsDraft: boolean) => {
    setBanner(null);
    if (!saveAsDraft) {
      if (!regForm.confirmRightToTransfer || !regForm.confirmAccurateDescription || !regForm.confirmDataErasure) {
        setBanner({
          type: 'error',
          text: 'Please confirm all three ownership, accuracy, and data erasure declarations before publishing.',
        });
        return;
      }
    }

    try {
      const accessories = regForm.accessoriesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const created = await apiFetch<DeviceListing>('/api/devices', {
        method: 'POST',
        body: JSON.stringify({
          ...regForm,
          accessories,
          saveAsDraft,
        }),
      });

      setPublishedConfirmation(created);
      await loadDashboardData();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message || 'Failed to register device' });
    }
  };

  const handleDeviceStatusAction = async (deviceId: number, action: 'pause' | 'resume' | 'publish' | 'delete') => {
    try {
      if (action === 'delete') {
        await apiFetch(`/api/devices/${deviceId}`, { method: 'DELETE' });
        setBanner({ type: 'success', text: 'Device listing removed.' });
      } else {
        await apiFetch(`/api/devices/${deviceId}/${action}`, { method: 'POST' });
        setBanner({ type: 'success', text: `Listing status updated (${action}).` });
      }
      await loadDashboardData();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleInterestDecision = async (interestId: number, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      await apiFetch(`/api/interests/${interestId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setBanner({
        type: 'success',
        text:
          status === 'ACCEPTED'
            ? 'Shop request accepted! Device is now RESERVED and a Transaction has been created.'
            : 'Shop request declined.',
      });
      await loadDashboardData();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleOfferDecision = async (offerId: number, action: 'ACCEPT' | 'REJECT' | 'COUNTER', counterPrice?: number) => {
    try {
      await apiFetch(`/api/offers/${offerId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action, counterPrice }),
      });
      setCounterOfferId(null);
      setBanner({
        type: 'success',
        text:
          action === 'ACCEPT'
            ? 'Offer accepted! Transaction created in Collection Management.'
            : action === 'COUNTER'
            ? 'Counteroffer sent to shop.'
            : 'Offer declined.',
      });
      await loadDashboardData();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleCompleteTransactionWithChecklist = async () => {
    if (!completingTx) return;
    if (
      !handoverChecks.backedUp ||
      !handoverChecks.signedOut ||
      !handoverChecks.simRemoved ||
      !handoverChecks.factoryReset
    ) {
      setBanner({
        type: 'error',
        text: 'Please confirm all Safe Device Handover checklist items before marking the transaction completed.',
      });
      return;
    }
    try {
      await apiFetch(`/api/transactions/${completingTx.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ handoverChecklistConfirmed: true }),
      });
      setCompletingTx(null);
      setBanner({ type: 'success', text: 'Transaction marked COMPLETED!' });
      await loadDashboardData();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify(profileForm),
      });
      await refreshUser();
      setBanner({ type: 'success', text: 'Profile and privacy preferences updated.' });
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const filteredDevices = myDevices.filter((d) => {
    if (deviceStatusFilter !== 'ALL' && d.listingStatus !== deviceStatusFilter) return false;
    if (deviceSearch.trim()) {
      const q = deviceSearch.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        d.brand.toLowerCase().includes(q) ||
        d.model.toLowerCase().includes(q) ||
        d.listingCode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'my-devices', label: 'My Devices', icon: Smartphone },
    { id: 'register-device', label: 'Register Device', icon: PlusCircle },
    { id: 'shop-interest', label: `Shop Interest (${interests.length})`, icon: Store },
    { id: 'offers', label: `Offers & Requests (${offers.length})`, icon: Tag },
    { id: 'transactions', label: `Transactions (${transactions.length})`, icon: CheckCircle2 },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'safe-handover', label: 'Safe Device Handover', icon: ShieldCheck },
    { id: 'profile', label: 'Profile & Settings', icon: UserCheck },
    { id: 'support', label: 'Help & Support', icon: HelpCircle },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Sidebar Navigation */}
      <aside className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <div className="px-3 py-2 border-b border-slate-100">
          <div className="text-xs text-slate-400">Device Owner Account</div>
          <div className="text-sm font-bold text-slate-900 truncate">{user?.fullName}</div>
          <div className="text-xs text-slate-500 truncate">{user?.email}</div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setBanner(null);
                  setPublishedConfirmation(null);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  active ? 'bg-[#137C5A] text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={async () => {
              await logout();
              onNavigate('home');
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      {/* Main Content Viewport */}
      <main className="lg:col-span-9 space-y-6">
        {banner && (
          <div
            className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between ${
              banner.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <span>{banner.text}</span>
            <button type="button" onClick={() => setBanner(null)} className="underline ml-4 cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* 6.1 OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">Welcome back, {user?.fullName}</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage your registered electronics, review verified shop offers, and coordinate safe handovers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('register-device')}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-[#137C5A] rounded-lg hover:bg-[#0f6347] whitespace-nowrap shrink-0 cursor-pointer"
              >
                + Register a New Device
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">{myDevices.length}</div>
                <div className="text-xs text-slate-500 mt-1">Total Registered</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-2xl font-extrabold text-[#137C5A] font-mono tabular-nums">
                  {myDevices.filter((d) => ['AVAILABLE', 'INTERESTED', 'NEGOTIATING'].includes(d.listingStatus)).length}
                </div>
                <div className="text-xs text-slate-500 mt-1">Available Listings</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">{interests.length}</div>
                <div className="text-xs text-slate-500 mt-1">Shop Interests</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-2xl font-extrabold text-amber-600 font-mono tabular-nums">
                  {offers.filter((o) => o.offerStatus === 'PENDING').length}
                </div>
                <div className="text-xs text-slate-500 mt-1">Pending Offers</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-2xl font-extrabold text-[#172B4D] font-mono tabular-nums">
                  {transactions.filter((t) => t.transactionStatus === 'COMPLETED').length}
                </div>
                <div className="text-xs text-slate-500 mt-1">Completed Handovers</div>
              </div>
            </div>

            {/* Recent Devices & Activity */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Recently Updated Devices</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('my-devices')}
                  className="text-xs font-semibold text-[#137C5A] hover:underline cursor-pointer"
                >
                  View All My Devices →
                </button>
              </div>

              {loading ? (
                <div className="h-32 animate-pulse bg-slate-100 rounded-lg" />
              ) : myDevices.length === 0 ? (
                <div className="p-8 text-center space-y-3 bg-[#F8FAF8] rounded-lg border border-slate-200/80">
                  <div className="text-sm font-bold text-slate-800">You have not registered any devices yet</div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Register an unused smartphone, laptop, tablet, monitor, or electronic appliance to receive offers
                    from verified shops in your city.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('register-device')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#137C5A] rounded-lg cursor-pointer"
                  >
                    Register Your First Device
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {myDevices.slice(0, 4).map((dev) => (
                    <div key={dev.id} className="py-3.5 flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-slate-900">{dev.title}</div>
                        <div className="text-xs text-slate-500">
                          <span className="font-mono">{dev.listingCode}</span> · {formatLabel(dev.condition)} ·{' '}
                          {formatLabel(dev.disposalPreference)} · Status:{' '}
                          <strong className="text-[#137C5A]">{formatLabel(dev.listingStatus)}</strong>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-500 font-mono">
                          {dev.interestCount || 0} shops interested
                        </span>
                        <button
                          type="button"
                          onClick={() => onNavigate('device-details', { deviceId: dev.id })}
                          className="px-3 py-1.5 font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 cursor-pointer"
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6.2 REGISTER A DEVICE (6-STEP WIZARD) */}
        {activeTab === 'register-device' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6">
            {publishedConfirmation ? (
              <div className="p-8 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-[#137C5A] mx-auto" />
                <h2 className="text-2xl font-extrabold text-slate-900">
                  {publishedConfirmation.listingStatus === 'DRAFT'
                    ? 'Device Saved as Draft!'
                    : 'Device Successfully Published!'}
                </h2>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Your unique listing code is{' '}
                  <strong className="font-mono text-slate-900">{publishedConfirmation.listingCode}</strong>. Verified
                  shops in {publishedConfirmation.city} can now discover your device.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('device-details', { deviceId: publishedConfirmation.id })}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-[#137C5A] rounded-lg cursor-pointer"
                  >
                    View Published Listing
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPublishedConfirmation(null);
                      setActiveTab('my-devices');
                    }}
                    className="px-5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Go to My Devices
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Register an Electronic Device</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Step {regStep} of 6 · Honest condition and privacy-conscious location matching
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5, 6].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRegStep(s)}
                        className={`w-7 h-7 rounded-md text-xs font-mono font-bold transition-colors cursor-pointer ${
                          regStep === s
                            ? 'bg-[#137C5A] text-white'
                            : regStep > s
                            ? 'bg-emerald-100 text-[#137C5A]'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* STEP 1: BASIC INFORMATION */}
                {regStep === 1 && (
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900">Step 1: Basic Device Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Device Category *</label>
                        <select
                          value={regForm.category}
                          onChange={(e) => setRegForm({ ...regForm, category: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                        >
                          {DEVICE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Brand *</label>
                        <input
                          type="text"
                          required
                          value={regForm.brand}
                          onChange={(e) => setRegForm({ ...regForm, brand: e.target.value })}
                          placeholder="e.g. Samsung, Apple, Dell, Lenovo, HP"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Model Name *</label>
                        <input
                          type="text"
                          required
                          value={regForm.model}
                          onChange={(e) => setRegForm({ ...regForm, model: e.target.value })}
                          placeholder="e.g. Galaxy S21 FE 5G / ThinkPad T490"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Approximate Purchase Year
                        </label>
                        <input
                          type="number"
                          min={2000}
                          max={2026}
                          value={regForm.purchaseYear}
                          onChange={(e) => setRegForm({ ...regForm, purchaseYear: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Device Description *</label>
                      <textarea
                        rows={3}
                        required
                        value={regForm.description}
                        onChange={(e) => setRegForm({ ...regForm, description: e.target.value })}
                        placeholder="Provide storage capacity, specifications, usage history, and why you are parting with it..."
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!regForm.brand.trim() || !regForm.model.trim() || !regForm.description.trim()) {
                            setBanner({ type: 'error', text: 'Please fill in Brand, Model Name, and Description.' });
                            return;
                          }
                          setBanner(null);
                          setRegStep(2);
                        }}
                        className="px-5 py-2.5 text-xs font-semibold text-white bg-[#137C5A] rounded-lg cursor-pointer"
                      >
                        Next: Device Condition →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: DEVICE CONDITION */}
                {regStep === 2 && (
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900">Step 2: Device Condition & Functional Status</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Overall Condition *</label>
                        <select
                          value={regForm.condition}
                          onChange={(e) => setRegForm({ ...regForm, condition: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                        >
                          {DEVICE_CONDITIONS.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Battery Condition</label>
                        <select
                          value={regForm.batteryCondition}
                          onChange={(e) => setRegForm({ ...regForm, batteryCondition: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="WORKING">Working / Holds Charge</option>
                          <option value="WEAK">Weak / Needs Replacement</option>
                          <option value="DEAD_OR_SWOLLEN">Not Working / Damaged Battery</option>
                          <option value="NOT_APPLICABLE">Not Applicable (Plug-in Device)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[#F8FAF8] border border-slate-200 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={regForm.powersOn}
                          onChange={(e) => setRegForm({ ...regForm, powersOn: e.target.checked })}
                          className="rounded text-[#137C5A]"
                        />
                        <span>The device powers on</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={regForm.screenFunctional}
                          onChange={(e) => setRegForm({ ...regForm, screenFunctional: e.target.checked })}
                          className="rounded text-[#137C5A]"
                        />
                        <span>The screen / display works properly</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={regForm.originalChargerIncluded}
                          onChange={(e) => setRegForm({ ...regForm, originalChargerIncluded: e.target.checked })}
                          className="rounded text-[#137C5A]"
                        />
                        <span>Original charger is available</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={regForm.hasPhysicalDamage}
                          onChange={(e) => setRegForm({ ...regForm, hasPhysicalDamage: e.target.checked })}
                          className="rounded text-[#137C5A]"
                        />
                        <span>Device has physical damage (cracks, dents)</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Included Accessories (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={regForm.accessoriesText}
                        onChange={(e) => setRegForm({ ...regForm, accessoriesText: e.target.value })}
                        placeholder="e.g. Original Box, Power Adapter, Protective Case"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Known Functional Problems or Physical Damage Details
                      </label>
                      <textarea
                        rows={2}
                        value={regForm.knownDamage}
                        onChange={(e) => setRegForm({ ...regForm, knownDamage: e.target.value })}
                        placeholder="Describe any scratches, broken ports, speaker issues, or error codes..."
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div className="flex justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setRegStep(1)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                      >
                        ← Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegStep(3)}
                        className="px-5 py-2.5 text-xs font-semibold text-white bg-[#137C5A] rounded-lg cursor-pointer"
                      >
                        Next: Device Photographs →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: DEVICE PHOTOGRAPHS */}
                {regStep === 3 && (
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900">Step 3: Device Photographs</h3>
                    <p className="text-xs text-slate-500">
                      Upload clear photos of Front View, Back View, Side View, Visible Damage, or Accessories (Max 3 MB per image). If you skip uploading photos during testing, a high-contrast technical illustration will be generated automatically.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { type: 'FRONT', label: 'Front View' },
                        { type: 'BACK', label: 'Back View' },
                        { type: 'SIDE', label: 'Side Profile' },
                        { type: 'DAMAGE', label: 'Visible Damage' },
                        { type: 'ACCESSORIES', label: 'Included Accessories' },
                      ].map((slot) => {
                        const existing = regForm.images.find((i) => i.imageType === slot.type);
                        return (
                          <div key={slot.type} className="p-4 rounded-xl border border-slate-200 bg-[#F8FAF8] space-y-2">
                            <div className="text-xs font-bold text-slate-800">{slot.label}</div>
                            {existing ? (
                              <div className="space-y-2">
                                <img
                                  src={existing.storageKey}
                                  alt={slot.label}
                                  className="w-full h-28 object-cover rounded-lg border border-slate-200"
                                />
                                <div className="text-[11px] text-emerald-700 truncate">{existing.name}</div>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center h-28 border border-dashed border-slate-300 rounded-lg bg-white hover:border-[#137C5A] cursor-pointer text-xs text-slate-500">
                                <Upload className="w-4 h-4 mb-1 text-slate-400" />
                                <span>Select Image</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handlePhotoUpload(e, slot.type)}
                                  className="hidden"
                                />
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setRegStep(2)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                      >
                        ← Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegStep(4)}
                        className="px-5 py-2.5 text-xs font-semibold text-white bg-[#137C5A] rounded-lg cursor-pointer"
                      >
                        Next: Disposal Preference →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: DISPOSAL PREFERENCE */}
                {regStep === 4 && (
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900">Step 4: Disposal Preference</h3>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        How would you like to dispose of this device? *
                      </label>
                      <select
                        value={regForm.disposalPreference}
                        onChange={(e) => setRegForm({ ...regForm, disposalPreference: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                      >
                        {DISPOSAL_PREFERENCES.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {(regForm.disposalPreference === 'SELL' || regForm.disposalPreference === 'OPEN_TO_MULTIPLE') && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#F8FAF8] border border-slate-200">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Asking Price (₹)</label>
                          <input
                            type="number"
                            min={0}
                            value={regForm.askingPrice}
                            onChange={(e) => setRegForm({ ...regForm, askingPrice: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono bg-white"
                          />
                        </div>
                        <div className="flex items-end pb-2">
                          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={regForm.priceNegotiable}
                              onChange={(e) => setRegForm({ ...regForm, priceNegotiable: e.target.checked })}
                              className="rounded text-[#137C5A]"
                            />
                            <span>Price is negotiable with verified shops</span>
                          </label>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {regForm.disposalPreference === 'EXCHANGE'
                          ? 'Describe Acceptable Exchange Options'
                          : regForm.disposalPreference === 'DONATE'
                          ? 'Donation & Collection Requirement Notes'
                          : regForm.disposalPreference === 'REPAIR_OR_REFURBISH'
                          ? 'Specify Whether Offering for Repair Buyback or Looking for Refurbishment'
                          : regForm.disposalPreference === 'RECYCLE_RESPONSIBLY'
                          ? 'Specify Whether Doorstep Collection is Required or Drop-Off is Possible'
                          : 'Additional Disposal Notes'}
                      </label>
                      <textarea
                        rows={2}
                        value={regForm.disposalDetails}
                        onChange={(e) => setRegForm({ ...regForm, disposalDetails: e.target.value })}
                        placeholder="Provide specifics for interested partner shops..."
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div className="flex justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setRegStep(3)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                      >
                        ← Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegStep(5)}
                        className="px-5 py-2.5 text-xs font-semibold text-white bg-[#137C5A] rounded-lg cursor-pointer"
                      >
                        Next: Location & Privacy →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 5: LOCATION & CONTACT PREFERENCES */}
                {regStep === 5 && (
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900">Step 5: Location & Privacy-Conscious Contact</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                        <input
                          type="text"
                          required
                          value={regForm.city}
                          onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code *</label>
                        <input
                          type="text"
                          required
                          value={regForm.pinCode}
                          onChange={(e) => setRegForm({ ...regForm, pinCode: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Approximate Locality / Area *
                        </label>
                        <input
                          type="text"
                          required
                          value={regForm.approximateLocality}
                          onChange={(e) => setRegForm({ ...regForm, approximateLocality: e.target.value })}
                          placeholder="e.g. RS Puram / Gandhipuram (No house number)"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Preferred Contact Method
                        </label>
                        <select
                          value={regForm.contactMethod}
                          onChange={(e) => setRegForm({ ...regForm, contactMethod: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="MESSAGING">In-Platform Messaging</option>
                          <option value="PHONE">Phone Call (Verified Shops)</option>
                          <option value="EMAIL">Email</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Preferred Collection Method
                        </label>
                        <select
                          value={regForm.preferredCollectionMethod}
                          onChange={(e) => setRegForm({ ...regForm, preferredCollectionMethod: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="SHOP_PICKUP">Shop Pickup</option>
                          <option value="USER_DROPOFF">User Drop-off at Shop</option>
                          <option value="THIRD_PARTY_COLLECTION">Third-party Collection</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Phone Number Disclosure Rule
                        </label>
                        <select
                          value={regForm.phoneRevealPolicy}
                          onChange={(e) => setRegForm({ ...regForm, phoneRevealPolicy: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="AFTER_ACCEPTANCE">Only After I Accept a Shop Request</option>
                          <option value="VERIFIED_SHOPS">Visible to All Approved Verified Shops</option>
                          <option value="NEVER">Never Reveal Phone (Messaging Only)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setRegStep(4)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                      >
                        ← Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegStep(6)}
                        className="px-5 py-2.5 text-xs font-semibold text-white bg-[#137C5A] rounded-lg cursor-pointer"
                      >
                        Next: Review & Publish →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 6: REVIEW AND PUBLISH */}
                {regStep === 6 && (
                  <div className="space-y-5">
                    <h3 className="text-base font-bold text-slate-900">Step 6: Review Listing & Confirm Declarations</h3>
                    <div className="p-5 rounded-xl bg-[#F8FAF8] border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block">Device:</span>
                        <strong className="text-slate-900 text-sm">
                          {regForm.brand} {regForm.model} ({regForm.category})
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Condition & Diagnostics:</span>
                        <strong className="text-slate-900">
                          {formatLabel(regForm.condition)} · Powers On: {regForm.powersOn ? 'Yes' : 'No'} · Screen:{' '}
                          {regForm.screenFunctional ? 'Working' : 'Damaged'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Disposal Option & Price:</span>
                        <strong className="text-slate-900">
                          {formatLabel(regForm.disposalPreference)}{' '}
                          {regForm.disposalPreference === 'SELL' ? `— ₹${regForm.askingPrice}` : ''}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Locality & Privacy:</span>
                        <strong className="text-slate-900">
                          {regForm.approximateLocality}, {regForm.city} ({regForm.pinCode}) · Phone:{' '}
                          {formatLabel(regForm.phoneRevealPolicy)}
                        </strong>
                      </div>
                    </div>

                    <div className="space-y-2.5 text-xs text-slate-700">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={regForm.confirmRightToTransfer}
                          onChange={(e) => setRegForm({ ...regForm, confirmRightToTransfer: e.target.checked })}
                          className="mt-0.5 rounded text-[#137C5A]"
                        />
                        <span>I confirm that I am the lawful owner or have the right to transfer this electronic device.</span>
                      </label>
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={regForm.confirmAccurateDescription}
                          onChange={(e) => setRegForm({ ...regForm, confirmAccurateDescription: e.target.checked })}
                          className="mt-0.5 rounded text-[#137C5A]"
                        />
                        <span>The functional condition and damage description is accurate to the best of my knowledge.</span>
                      </label>
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={regForm.confirmDataErasure}
                          onChange={(e) => setRegForm({ ...regForm, confirmDataErasure: e.target.checked })}
                          className="mt-0.5 rounded text-[#137C5A]"
                        />
                        <span>
                          I understand the importance of backing up and erasing personal data before handing over the device.
                        </span>
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setRegStep(5)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                      >
                        ← Back
                      </button>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveTab('my-devices')}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCreateListing(true)}
                          className="px-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 cursor-pointer"
                        >
                          Save as Draft
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCreateListing(false)}
                          className="px-6 py-2.5 text-xs font-semibold text-white bg-[#137C5A] rounded-lg hover:bg-[#0f6347] cursor-pointer"
                        >
                          Publish Device
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 6.3 MY DEVICES TAB */}
        {activeTab === 'my-devices' && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">My Registered Devices ({filteredDevices.length})</h2>
                <p className="text-xs text-slate-500">
                  Manage availability, pause or resume listings, or inspect shop interest.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={deviceSearch}
                  onChange={(e) => setDeviceSearch(e.target.value)}
                  placeholder="Search my devices..."
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
                <select
                  value={deviceStatusFilter}
                  onChange={(e) => setDeviceStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="INTERESTED">Interested</option>
                  <option value="NEGOTIATING">Negotiating</option>
                  <option value="RESERVED">Reserved</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PAUSED">Paused</option>
                  <option value="DRAFT">Draft</option>
                </select>
                <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-xs' : 'text-slate-500'}`}
                  >
                    <Grid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-xs' : 'text-slate-500'}`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {filteredDevices.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-3">
                <div className="text-sm font-bold text-slate-800">No devices match your filter</div>
                <button
                  type="button"
                  onClick={() => setActiveTab('register-device')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#137C5A] rounded-lg cursor-pointer"
                >
                  Register New Device
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredDevices.map((dev) => (
                  <div key={dev.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col justify-between">
                    <div>
                      <DeviceImageFrame src={dev.primaryImage} alt={dev.title} category={dev.category} className="w-full h-44" />
                      <div className="p-5 space-y-2">
                        <div className="text-xs text-slate-500 font-mono">
                          {dev.listingCode} · Status: <strong className="text-[#137C5A]">{formatLabel(dev.listingStatus)}</strong>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 line-clamp-1">{dev.title}</h3>
                        <div className="text-xs text-slate-500">
                          {formatLabel(dev.condition)} · {formatLabel(dev.disposalPreference)} ·{' '}
                          {dev.interestCount || 0} shop requests
                        </div>
                      </div>
                    </div>
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => onNavigate('device-details', { deviceId: dev.id })}
                        className="font-semibold text-[#137C5A] flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </button>
                      <div className="flex items-center gap-2">
                        {dev.listingStatus === 'DRAFT' && (
                          <button
                            type="button"
                            onClick={() => handleDeviceStatusAction(dev.id, 'publish')}
                            className="px-2.5 py-1 bg-[#137C5A] text-white rounded font-semibold cursor-pointer"
                          >
                            Publish
                          </button>
                        )}
                        {dev.listingStatus === 'AVAILABLE' && (
                          <button
                            type="button"
                            onClick={() => handleDeviceStatusAction(dev.id, 'pause')}
                            className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded flex items-center gap-1 cursor-pointer"
                          >
                            <Pause className="w-3 h-3" />
                            <span>Pause</span>
                          </button>
                        )}
                        {dev.listingStatus === 'PAUSED' && (
                          <button
                            type="button"
                            onClick={() => handleDeviceStatusAction(dev.id, 'resume')}
                            className="px-2.5 py-1 bg-emerald-100 text-[#137C5A] rounded flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3 h-3" />
                            <span>Resume</span>
                          </button>
                        )}
                        {!['RESERVED', 'COLLECTED', 'COMPLETED'].includes(dev.listingStatus) && (
                          <button
                            type="button"
                            onClick={() => handleDeviceStatusAction(dev.id, 'delete')}
                            className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                            title="Delete Listing"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {filteredDevices.map((dev) => (
                  <div key={dev.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{dev.title}</div>
                      <div className="text-xs text-slate-500 font-mono">
                        {dev.listingCode} · {formatLabel(dev.listingStatus)} · {dev.interestCount || 0} Interested Shops
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => onNavigate('device-details', { deviceId: dev.id })}
                        className="px-3 py-1.5 bg-slate-100 rounded-md font-semibold cursor-pointer"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 6.4 SHOP INTEREST TAB */}
        {activeTab === 'shop-interest' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Interested Partner Shops ({interests.length})</h2>
              <p className="text-xs text-slate-500">
                Review verified shops that have expressed interest in acquiring, repairing, or recycling your devices.
              </p>
            </div>

            {interests.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No shop interest requests received yet.
              </div>
            ) : (
              <div className="space-y-4">
                {interests.map((item) => (
                  <div key={item.id} className="p-5 rounded-xl bg-[#F8FAF8] border border-slate-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {item.shop?.shopName} ·{' '}
                          <span className="text-xs font-medium text-[#137C5A]">
                            Verified {item.shop?.businessType} ({item.shop?.city})
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          Device: {item.device?.title} ({item.device?.listingCode}) · Intended:{' '}
                          {formatLabel(item.intendedAction)} · Collection: {formatLabel(item.collectionMethod)}
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-700">
                        Status: {item.requestStatus}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200/80">
                      "{item.interestMessage}"
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                      <div className="text-slate-500 font-mono">
                        {item.proposedPrice ? `Proposed Price: ${formatCurrency(item.proposedPrice)} · ` : ''}
                        Proposed Date: {item.proposedCollectionDate || 'Flexible'}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab('messages')}
                          className="px-3 py-1.5 font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg cursor-pointer"
                        >
                          Message Shop
                        </button>
                        {item.requestStatus === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleInterestDecision(item.id, 'REJECTED')}
                              className="px-3 py-1.5 font-semibold text-red-700 bg-red-50 rounded-lg cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInterestDecision(item.id, 'ACCEPTED')}
                              className="px-4 py-1.5 font-semibold text-white bg-[#137C5A] rounded-lg cursor-pointer"
                            >
                              Accept Request
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 6.5 OFFERS AND REQUESTS TAB */}
        {activeTab === 'offers' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Purchase Offers & Counteroffers ({offers.length})</h2>
              <p className="text-xs text-slate-500">
                Accept, reject, or send a counteroffer to verified electronics shops.
              </p>
            </div>

            {offers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No purchase offers received yet.</div>
            ) : (
              <div className="space-y-4">
                {offers.map((off) => (
                  <div key={off.id} className="p-5 rounded-xl bg-[#F8FAF8] border border-slate-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {off.shop?.shopName} offered{' '}
                          <span className="text-[#137C5A] font-mono">{formatCurrency(off.proposedPrice)}</span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          Device: {off.device?.title} ({off.device?.listingCode}) · Collection:{' '}
                          {formatLabel(off.collectionMethod)}
                        </div>
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-800">
                        Status: {off.offerStatus}
                        {off.counterPrice ? ` (Countered: ${formatCurrency(off.counterPrice)})` : ''}
                      </div>
                    </div>

                    {off.message && (
                      <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200/80">
                        "{off.message}"
                      </p>
                    )}

                    {off.offerStatus === 'PENDING' && (
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        {counterOfferId === off.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={counterPriceInput}
                              onChange={(e) => setCounterPriceInput(e.target.value)}
                              placeholder="Counter ₹"
                              className="w-32 px-2.5 py-1.5 text-xs border border-slate-300 rounded font-mono bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleOfferDecision(off.id, 'COUNTER', Number(counterPriceInput))}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#172B4D] rounded cursor-pointer"
                            >
                              Send Counter
                            </button>
                            <button
                              type="button"
                              onClick={() => setCounterOfferId(null)}
                              className="text-xs text-slate-500"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setCounterOfferId(off.id);
                                setCounterPriceInput(String(off.proposedPrice + 1500));
                              }}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg cursor-pointer"
                            >
                              Counteroffer
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOfferDecision(off.id, 'REJECT')}
                              className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded-lg cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOfferDecision(off.id, 'ACCEPT')}
                              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#137C5A] rounded-lg cursor-pointer"
                            >
                              Accept Offer
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TRANSACTIONS & COLLECTION TIMELINE TAB */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Transactions & Handover Timeline ({transactions.length})</h2>
              <p className="text-xs text-slate-500">
                Track scheduled collections, confirm physical handover, and complete transactions after verifying your Safe Handover Checklist.
              </p>
            </div>

            {transactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No active or completed transactions yet. Accept a shop interest request or offer to start a transaction.
              </div>
            ) : (
              <div className="space-y-5">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-5 rounded-xl bg-[#F8FAF8] border border-slate-200 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {tx.device?.title} ({tx.device?.listingCode})
                        </div>
                        <div className="text-xs text-slate-500">
                          Partner Shop: <strong>{tx.shop?.shopName}</strong> · Type: {formatLabel(tx.transactionType)} ·
                          Agreed Value: <span className="font-mono">{formatCurrency(tx.agreedPrice)}</span>
                        </div>
                      </div>
                      <div className="text-xs font-mono font-bold text-[#137C5A]">
                        Status: {formatLabel(tx.transactionStatus)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                      <div>
                        <span className="text-slate-500 block">Collection Method & Schedule:</span>
                        <strong>
                          {formatLabel(tx.collectionMethod)} · {tx.collectionScheduledAt || 'Awaiting schedule'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Handover Notes:</span>
                        <span>{tx.collectionLocationNotes || 'Coordinate exact pickup point in Messages'}</span>
                      </div>
                    </div>

                    {/* Audit Timeline */}
                    {tx.events && tx.events.length > 0 && (
                      <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 space-y-2">
                        <div className="text-[11px] font-bold text-slate-700">Transaction Audit Timeline</div>
                        {tx.events.map((ev) => (
                          <div key={ev.id} className="text-[11px] text-slate-600 flex items-center justify-between gap-2">
                            <span>
                              <strong className="font-mono text-slate-800">{ev.newStatus}:</strong> {ev.eventDescription}
                            </span>
                            <span className="font-mono text-slate-400 shrink-0">
                              {new Date(ev.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    {!['COMPLETED', 'CANCELLED'].includes(tx.transactionStatus) && (
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCompletingTx(tx);
                            setHandoverChecks({
                              backedUp: false,
                              signedOut: false,
                              simRemoved: false,
                              factoryReset: false,
                            });
                          }}
                          className="px-4 py-2 text-xs font-semibold text-white bg-[#137C5A] rounded-lg hover:bg-[#0f6347] cursor-pointer"
                        >
                          Verify Handover Checklist & Complete Transaction
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MESSAGES, NOTIFICATIONS, SAFE HANDOVER, SUPPORT TABS */}
        {activeTab === 'messages' && (
          <MessagingPanel onOpenDevice={(id) => onNavigate('device-details', { deviceId: id })} />
        )}
        {activeTab === 'notifications' && (
          <NotificationsPanel
            onOpenDevice={(id) => onNavigate('device-details', { deviceId: id })}
            onOpenTransactions={() => setActiveTab('transactions')}
          />
        )}
        {activeTab === 'safe-handover' && <SafeHandoverPage onNavigate={onNavigate} />}
        {activeTab === 'support' && <ContactSupportPage />}

        {/* 6.6 PROFILE & SETTINGS TAB */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">User Profile & Privacy Controls</h2>
              <p className="text-xs text-slate-500">
                Manage your contact details and control when approved partner shops can view your phone number.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number (Private)</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={profileForm.state}
                    onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code</label>
                  <input
                    type="text"
                    value={profileForm.pinCode}
                    onChange={(e) => setProfileForm({ ...profileForm, pinCode: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Phone Disclosure Preference
                  </label>
                  <select
                    value={profileForm.phoneDisclosurePreference}
                    onChange={(e) => setProfileForm({ ...profileForm, phoneDisclosurePreference: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="AFTER_ACCEPTANCE">Reveal Only After I Accept a Shop Request</option>
                    <option value="VERIFIED_SHOPS">Visible to Verified Partner Shops</option>
                    <option value="NEVER">Never Reveal Phone Number</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Contact Channel</label>
                  <select
                    value={profileForm.preferredContactMethod}
                    onChange={(e) => setProfileForm({ ...profileForm, preferredContactMethod: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="MESSAGING">In-Platform Messaging</option>
                    <option value="PHONE">Phone Call</option>
                    <option value="EMAIL">Email</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#137C5A] rounded-lg hover:bg-[#0f6347] cursor-pointer"
              >
                Save Profile Settings
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Mandatory Safe Handover Checklist Modal Before Completing Transaction */}
      {completingTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-[#137C5A] font-bold text-base">
              <ShieldCheck className="w-5 h-5" />
              <span>Mandatory Safe Device Handover Checklist</span>
            </div>
            <p className="text-xs text-slate-600">
              Before marking <strong>{completingTx.device?.title}</strong> as Completed with{' '}
              <strong>{completingTx.shop?.shopName}</strong>, please confirm you have completed these essential data
              safety steps:
            </p>

            <div className="space-y-2.5 text-xs text-slate-800 bg-[#F8FAF8] p-4 rounded-lg border border-slate-200">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={handoverChecks.backedUp}
                  onChange={(e) => setHandoverChecks({ ...handoverChecks, backedUp: e.target.checked })}
                  className="mt-0.5 rounded text-[#137C5A]"
                />
                <span>I have backed up all personal files, photos, and documents from the device.</span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={handoverChecks.signedOut}
                  onChange={(e) => setHandoverChecks({ ...handoverChecks, signedOut: e.target.checked })}
                  className="mt-0.5 rounded text-[#137C5A]"
                />
                <span>I have signed out of all personal accounts (Google, iCloud, Microsoft) and removed activation locks.</span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={handoverChecks.simRemoved}
                  onChange={(e) => setHandoverChecks({ ...handoverChecks, simRemoved: e.target.checked })}
                  className="mt-0.5 rounded text-[#137C5A]"
                />
                <span>I have removed any physical SIM cards and external memory / SD cards.</span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={handoverChecks.factoryReset}
                  onChange={(e) => setHandoverChecks({ ...handoverChecks, factoryReset: e.target.checked })}
                  className="mt-0.5 rounded text-[#137C5A]"
                />
                <span>I have performed a Factory Reset (or confirmed data destruction for non-working electronics) and handed over the device.</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCompletingTx(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteTransactionWithChecklist}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#137C5A] rounded-lg hover:bg-[#0f6347] cursor-pointer"
              >
                Confirm Handover & Complete Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
