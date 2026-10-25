import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Search,
  Bookmark,
  Send,
  Tag,
  MessageSquare,
  Truck,
  PackageCheck,
  Store,
  ShieldCheck,
  Bell,
  HelpCircle,
  LogOut,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  DeviceListing,
  DeviceInterestItem,
  OfferItem,
  TransactionItem,
  ShopData,
  formatLabel,
  formatCurrency,
} from '../types';
import { PageRoute } from './Navbar';
import { ExploreDevicesPage, ContactSupportPage } from './PublicPages';
import { MessagingPanel, NotificationsPanel } from './MessagingAndNotifications';

interface ShopDashboardProps {
  initialTab?: string;
  onNavigate: (page: PageRoute, params?: { deviceId?: number }) => void;
}

export const ShopDashboard: React.FC<ShopDashboardProps> = ({ initialTab = 'overview', onNavigate }) => {
  const { user, apiFetch, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(initialTab || 'overview');

  const [shopProfile, setShopProfile] = useState<ShopData | null>(user?.shop || null);
  const [marketplaceCount, setMarketplaceCount] = useState<number>(0);
  const [savedDevices, setSavedDevices] = useState<DeviceListing[]>([]);
  const [myRequests, setMyRequests] = useState<DeviceInterestItem[]>([]);
  const [myOffers, setMyOffers] = useState<OfferItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Schedule Collection Modal State
  const [schedulingTx, setSchedulingTx] = useState<TransactionItem | null>(null);
  const [scheduleMethod, setScheduleMethod] = useState('SHOP_PICKUP');
  const [scheduleDateTime, setScheduleDateTime] = useState('2026-10-30 11:30 AM');
  const [scheduleLocation, setScheduleLocation] = useState('');
  const [scheduleInstructions, setScheduleInstructions] = useState('');

  // Acquired Device Handling State
  const [handlingTxId, setHandlingTxId] = useState<number | null>(null);
  const [nextActionInput, setNextActionInput] = useState('REFURBISH');
  const [handlingNotesInput, setHandlingNotesInput] = useState('');

  // Shop Profile Edit Form
  const [editShopForm, setEditShopForm] = useState({
    shopName: user?.shop?.shopName || '',
    ownerName: user?.shop?.ownerName || '',
    description: user?.shop?.description || '',
    addressPrivate: user?.shop?.addressPrivate || '',
    city: user?.shop?.city || 'Coimbatore',
    state: user?.shop?.state || 'Tamil Nadu',
    pinCode: user?.shop?.pinCode || '641012',
    documentType: 'Updated Business Verification Certificate',
    documentFileName: '',
  });

  const loadShopData = useCallback(async () => {
    setLoading(true);
    try {
      const [shopData, mktDevs, saved, reqs, offs, txs] = await Promise.all([
        apiFetch<ShopData>('/api/shops/me'),
        apiFetch<DeviceListing[]>('/api/devices?onlyAvailable=true'),
        apiFetch<DeviceListing[]>('/api/shops/me/saved-devices'),
        apiFetch<DeviceInterestItem[]>('/api/shops/me/interests'),
        apiFetch<OfferItem[]>('/api/shops/me/offers'),
        apiFetch<TransactionItem[]>('/api/shops/me/transactions'),
      ]);
      setShopProfile(shopData);
      setMarketplaceCount(mktDevs.length);
      setSavedDevices(saved);
      setMyRequests(reqs);
      setMyOffers(offs);
      setTransactions(txs);
      setEditShopForm({
        shopName: shopData.shopName,
        ownerName: shopData.ownerName,
        description: shopData.description,
        addressPrivate: shopData.addressPrivate,
        city: shopData.city,
        state: shopData.state,
        pinCode: shopData.pinCode,
        documentType: 'Updated Business Verification Certificate',
        documentFileName: '',
      });
    } catch (err) {
      console.error('Error loading shop dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadShopData();
  }, [loadShopData]);

  const isVerified = shopProfile?.verificationStatus === 'APPROVED';

  const handleCounterOfferResponse = async (offerId: number, action: 'ACCEPT' | 'REJECT') => {
    try {
      await apiFetch(`/api/offers/${offerId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      setBanner({
        type: 'success',
        text:
          action === 'ACCEPT'
            ? 'Counteroffer accepted! Transaction created in Collection Management.'
            : 'Counteroffer declined.',
      });
      await loadShopData();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleScheduleCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingTx) return;
    try {
      await apiFetch(`/api/transactions/${schedulingTx.id}/schedule-collection`, {
        method: 'POST',
        body: JSON.stringify({
          collectionMethod: scheduleMethod,
          collectionScheduledAt: scheduleDateTime,
          collectionLocationNotes: scheduleLocation,
          collectionInstructions: scheduleInstructions,
        }),
      });
      setSchedulingTx(null);
      setBanner({ type: 'success', text: 'Collection date and instructions scheduled. Owner notified.' });
      await loadShopData();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleConfirmCollection = async (txId: number) => {
    try {
      await apiFetch(`/api/transactions/${txId}/confirm-collection`, { method: 'POST' });
      setBanner({ type: 'success', text: 'Device collection confirmed! Device now appears in Acquired Devices.' });
      await loadShopData();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleCompleteTransaction = async (txId: number) => {
    try {
      await apiFetch(`/api/transactions/${txId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ handoverChecklistConfirmed: true }),
      });
      setBanner({ type: 'success', text: 'Transaction marked COMPLETED!' });
      await loadShopData();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleRecordHandling = async (txId: number) => {
    try {
      await apiFetch(`/api/transactions/${txId}/shop-handling`, {
        method: 'PATCH',
        body: JSON.stringify({
          shopNextAction: nextActionInput,
          shopHandlingNotes: handlingNotesInput,
        }),
      });
      setHandlingTxId(null);
      setBanner({ type: 'success', text: 'Post-acquisition handling action recorded in traceability log.' });
      await loadShopData();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleUpdateShopProfile = async (e: React.FormEvent, resubmitVerification: boolean = false) => {
    e.preventDefault();
    try {
      await apiFetch('/api/shops/me', {
        method: 'PATCH',
        body: JSON.stringify({
          ...editShopForm,
          resubmitVerification,
        }),
      });
      await refreshUser();
      await loadShopData();
      setBanner({
        type: 'success',
        text: resubmitVerification
          ? 'Verification resubmitted for administrator review.'
          : 'Shop profile updated.',
      });
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const acquiredTransactions = transactions.filter((t) =>
    ['COLLECTED', 'COMPLETED'].includes(t.transactionStatus)
  );

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'browse', label: 'Browse Devices', icon: Search },
    { id: 'saved', label: `Saved Devices (${savedDevices.length})`, icon: Bookmark },
    { id: 'requests', label: `My Requests (${myRequests.length})`, icon: Send },
    { id: 'offers', label: `Offers (${myOffers.length})`, icon: Tag },
    { id: 'collection', label: `Collection Management (${transactions.length})`, icon: Truck },
    { id: 'acquired', label: `Acquired Devices (${acquiredTransactions.length})`, icon: PackageCheck },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'verification', label: 'Verification Status', icon: ShieldCheck },
    { id: 'profile', label: 'Shop Profile', icon: Store },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Sidebar */}
      <aside className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <div className="px-3 py-2 border-b border-slate-100 space-y-1">
          <div className="text-xs text-slate-400">Partner Business Console</div>
          <div className="text-sm font-bold text-slate-900 truncate">{shopProfile?.shopName || user?.fullName}</div>
          <div className="text-xs font-medium">
            {isVerified ? (
              <span className="text-[#137C5A] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Partner Shop</span>
              </span>
            ) : (
              <span className="text-amber-600">{formatLabel(shopProfile?.verificationStatus)}</span>
            )}
          </div>
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
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  active ? 'bg-[#172B4D] text-white' : 'text-slate-700 hover:bg-slate-100'
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

      {/* Main Content */}
      <main className="lg:col-span-9 space-y-6">
        {/* Prominent Verification Pending / Rejected Banner */}
        {shopProfile && shopProfile.verificationStatus !== 'APPROVED' && (
          <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Shop Status: {formatLabel(shopProfile.verificationStatus)}</span>
              </div>
              <p className="text-xs text-amber-900/90">
                {shopProfile.verificationNotes ||
                  'Your business verification application is under administrator review. Protected owner contact details and collection requests unlock automatically once approved.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('verification')}
              className="px-4 py-2 text-xs font-semibold text-amber-950 bg-amber-200/80 rounded-lg hover:bg-amber-300 whitespace-nowrap shrink-0 cursor-pointer"
            >
              View Verification Details
            </button>
          </div>
        )}

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

        {/* 7.1 SHOP OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{shopProfile?.shopName}</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {shopProfile?.businessType} · {shopProfile?.city}, {shopProfile?.state} ({shopProfile?.pinCode})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('browse')}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-[#137C5A] rounded-lg hover:bg-[#0f6347] whitespace-nowrap shrink-0 cursor-pointer"
              >
                Browse Available Devices
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">{marketplaceCount}</div>
                <div className="text-xs text-slate-500 mt-1">Marketplace Available</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                  {savedDevices.length}
                </div>
                <div className="text-xs text-slate-500 mt-1">Devices Saved</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-2xl font-extrabold text-[#137C5A] font-mono tabular-nums">
                  {myRequests.filter((r) => r.requestStatus === 'PENDING').length}
                </div>
                <div className="text-xs text-slate-500 mt-1">Active Requests</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-2xl font-extrabold text-amber-600 font-mono tabular-nums">
                  {myOffers.filter((o) => ['PENDING', 'COUNTERED'].includes(o.offerStatus)).length}
                </div>
                <div className="text-xs text-slate-500 mt-1">Pending Offers</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-2xl font-extrabold text-[#172B4D] font-mono tabular-nums">
                  {transactions.length}
                </div>
                <div className="text-xs text-slate-500 mt-1">Accepted Transactions</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-2xl font-extrabold text-[#137C5A] font-mono tabular-nums">
                  {acquiredTransactions.length}
                </div>
                <div className="text-xs text-slate-500 mt-1">Devices Collected</div>
              </div>
            </div>

            {/* Recent Shop Activity */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900">Recent Shop Requests & Collections</h2>
              {loading ? (
                <div className="h-28 animate-pulse bg-slate-100 rounded-lg" />
              ) : transactions.length === 0 && myRequests.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-[#F8FAF8] rounded-lg">
                  No requests or collections yet. Click "Browse Available Devices" to discover local electronics.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {transactions.slice(0, 3).map((tx) => (
                    <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <span className="font-bold text-slate-900">{tx.device?.title}</span> ·{' '}
                        <span className="font-mono text-slate-500">{tx.device?.listingCode}</span>
                        <div className="text-slate-500 mt-0.5">
                          Collection Status: <strong className="text-[#137C5A]">{tx.transactionStatus}</strong> ·
                          Scheduled: {tx.collectionScheduledAt || 'Pending'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('collection')}
                        className="px-3 py-1.5 font-semibold text-slate-700 bg-slate-100 rounded-md cursor-pointer"
                      >
                        Manage Collection
                      </button>
                    </div>
                  ))}
                  {myRequests.slice(0, 3).map((req) => (
                    <div key={req.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <span className="font-bold text-slate-900">{req.device?.title}</span> ·{' '}
                        <span className="font-mono text-slate-500">Interest ({formatLabel(req.intendedAction)})</span>
                      </div>
                      <span className="font-mono font-semibold text-slate-700">{req.requestStatus}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7.2 BROWSE AVAILABLE DEVICES */}
        {activeTab === 'browse' && <ExploreDevicesPage onNavigate={onNavigate} />}

        {/* SAVED DEVICES */}
        {activeTab === 'saved' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Saved Marketplace Devices ({savedDevices.length})</h2>
            {savedDevices.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                You have not bookmarked any device listings yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedDevices.map((dev) => (
                  <div
                    key={dev.id}
                    onClick={() => onNavigate('device-details', { deviceId: dev.id })}
                    className="p-4 rounded-xl border border-slate-200 hover:border-[#137C5A] cursor-pointer space-y-1.5"
                  >
                    <div className="text-xs text-slate-500 font-mono">
                      {dev.listingCode} · {formatLabel(dev.condition)}
                    </div>
                    <div className="text-sm font-bold text-slate-900">{dev.title}</div>
                    <div className="text-xs text-[#137C5A] font-semibold">
                      {formatCurrency(dev.askingPrice)} · Inspect Listing →
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MY REQUESTS */}
        {activeTab === 'requests' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Submitted Interest Requests ({myRequests.length})</h2>
            {myRequests.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No interest requests submitted yet.</div>
            ) : (
              <div className="space-y-3">
                {myRequests.map((r) => (
                  <div key={r.id} className="p-4 rounded-xl bg-[#F8FAF8] border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <strong className="text-sm text-slate-900">
                        {r.device?.title} ({r.device?.listingCode})
                      </strong>
                      <span className="font-mono font-bold text-[#137C5A]">{r.requestStatus}</span>
                    </div>
                    <div className="text-slate-600">
                      Intended Action: <strong>{formatLabel(r.intendedAction)}</strong> · Collection:{' '}
                      {formatLabel(r.collectionMethod)} · Proposed Date: {r.proposedCollectionDate || 'Flexible'}
                    </div>
                    <p className="text-slate-700 bg-white p-2.5 rounded border border-slate-200/80">
                      "{r.interestMessage}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 7.5 OFFERS & COUNTEROFFERS */}
        {activeTab === 'offers' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Submitted Purchase Offers ({myOffers.length})</h2>
            {myOffers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No purchase offers submitted yet.</div>
            ) : (
              <div className="space-y-3">
                {myOffers.map((o) => (
                  <div key={o.id} className="p-4 rounded-xl bg-[#F8FAF8] border border-slate-200 space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <strong className="text-sm text-slate-900">
                          {o.device?.title} ({o.device?.listingCode})
                        </strong>
                        <div className="text-slate-500 font-mono mt-0.5">
                          Your Offer: <strong>{formatCurrency(o.proposedPrice)}</strong>
                          {o.counterPrice ? ` · Owner Counteroffer: ${formatCurrency(o.counterPrice)}` : ''}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-slate-800">Status: {o.offerStatus}</span>
                    </div>

                    {o.offerStatus === 'COUNTERED' && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                        <span className="text-amber-800 font-medium mr-auto">
                          Owner proposed counteroffer of {formatCurrency(o.counterPrice)}:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCounterOfferResponse(o.id, 'REJECT')}
                          className="px-3 py-1.5 font-semibold text-red-700 bg-red-50 rounded-lg cursor-pointer"
                        >
                          Reject Counteroffer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCounterOfferResponse(o.id, 'ACCEPT')}
                          className="px-4 py-1.5 font-semibold text-white bg-[#137C5A] rounded-lg cursor-pointer"
                        >
                          Accept Counteroffer ({formatCurrency(o.counterPrice)})
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 7.6 COLLECTION MANAGEMENT */}
        {activeTab === 'collection' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Collection Management ({transactions.length})</h2>
              <p className="text-xs text-slate-500">
                Schedule pickup or user drop-off, confirm physical device handover, and inspect transaction audit timelines.
              </p>
            </div>

            {transactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No accepted transactions requiring collection coordination yet.
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-5 rounded-xl bg-[#F8FAF8] border border-slate-200 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {tx.device?.title} ({tx.device?.listingCode})
                        </div>
                        <div className="text-xs text-slate-600">
                          Owner: <strong>{tx.owner?.fullName}</strong> · Permitted Phone:{' '}
                          <span className="font-mono">{tx.owner?.phone || 'Via Messaging'}</span> · Agreed Value:{' '}
                          <span className="font-mono font-bold">{formatCurrency(tx.agreedPrice)}</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#137C5A]">
                        Status: {formatLabel(tx.transactionStatus)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block">Collection Method:</span>
                        <strong>{formatLabel(tx.collectionMethod)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Agreed Date & Time:</span>
                        <strong className="font-mono">{tx.collectionScheduledAt || 'Not scheduled yet'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Handover Location / Notes:</span>
                        <span>{tx.collectionLocationNotes || tx.device?.approximateLocality}</span>
                      </div>
                    </div>

                    {tx.events && tx.events.length > 0 && (
                      <div className="bg-white p-3 rounded-lg border border-slate-200/80 space-y-1.5 text-[11px]">
                        <div className="font-bold text-slate-700">Transaction Timeline</div>
                        {tx.events.map((ev) => (
                          <div key={ev.id} className="text-slate-600">
                            <strong className="font-mono">{ev.newStatus}:</strong> {ev.eventDescription}
                          </div>
                        ))}
                      </div>
                    )}

                    {!['COMPLETED', 'CANCELLED'].includes(tx.transactionStatus) && (
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSchedulingTx(tx);
                            setScheduleMethod(tx.collectionMethod || 'SHOP_PICKUP');
                            setScheduleDateTime(tx.collectionScheduledAt || '2026-10-30 11:00 AM');
                            setScheduleLocation(
                              tx.collectionLocationNotes || `${tx.device?.approximateLocality}, ${tx.device?.city}`
                            );
                            setScheduleInstructions(tx.collectionInstructions || '');
                          }}
                          className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg cursor-pointer"
                        >
                          Schedule / Update Collection
                        </button>
                        {tx.transactionStatus !== 'COLLECTED' && (
                          <button
                            type="button"
                            onClick={() => handleConfirmCollection(tx.id)}
                            className="px-4 py-2 text-xs font-semibold text-white bg-[#172B4D] rounded-lg cursor-pointer"
                          >
                            Confirm Physical Collection
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCompleteTransaction(tx.id)}
                          className="px-4 py-2 text-xs font-semibold text-white bg-[#137C5A] rounded-lg cursor-pointer"
                        >
                          Complete Transaction
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 7.7 ACQUIRED DEVICES (TRACEABILITY & POST-ACQUISITION HANDLING) */}
        {activeTab === 'acquired' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Acquired Devices & Circular Traceability ({acquiredTransactions.length})
              </h2>
              <p className="text-xs text-slate-500">
                Record how your shop handled each collected device (Repair, Refurbish, Resell, Donate, Harvest Parts, or Send to Authorized Recycler).
              </p>
            </div>

            {acquiredTransactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No collected or completed devices yet. Once you confirm collection in Collection Management, devices appear here for lifecycle logging.
              </div>
            ) : (
              <div className="space-y-4">
                {acquiredTransactions.map((tx) => (
                  <div key={tx.id} className="p-5 rounded-xl bg-[#F8FAF8] border border-slate-200 space-y-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {tx.device?.title} · <span className="font-mono">{tx.device?.listingCode}</span>
                        </div>
                        <div className="text-slate-500">
                          Acquisition Method: {formatLabel(tx.transactionType)} · Collected:{' '}
                          {tx.collectedAt ? new Date(tx.collectedAt).toLocaleDateString() : 'Confirmed'}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-[#137C5A]">
                        Recorded Action: {formatLabel(tx.shopNextAction || 'PENDING_LOG')}
                      </span>
                    </div>

                    {tx.shopHandlingNotes && (
                      <div className="p-3 bg-white rounded-lg border border-slate-200/80 text-slate-700">
                        <strong>Handling Log:</strong> {tx.shopHandlingNotes}
                      </div>
                    )}

                    {handlingTxId === tx.id ? (
                      <div className="p-4 bg-white rounded-lg border border-slate-300 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Post-Acquisition Action</label>
                            <select
                              value={nextActionInput}
                              onChange={(e) => setNextActionInput(e.target.value)}
                              className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                            >
                              <option value="REPAIR">Repair</option>
                              <option value="REFURBISH">Refurbish</option>
                              <option value="RESELL">Resell</option>
                              <option value="DONATE">Donate</option>
                              <option value="HARVEST_PARTS">Harvest Parts</option>
                              <option value="SEND_TO_RECYCLER">Send to Authorized Recycling Partner</option>
                            </select>
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Traceability Notes</label>
                            <input
                              type="text"
                              value={handlingNotesInput}
                              onChange={(e) => setHandlingNotesInput(e.target.value)}
                              placeholder="e.g. Replaced battery & display; ready for second life"
                              className="w-full px-3 py-1.5 border border-slate-300 rounded"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setHandlingTxId(null)}
                            className="px-3 py-1.5 text-slate-500"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRecordHandling(tx.id)}
                            className="px-4 py-1.5 font-semibold text-white bg-[#137C5A] rounded cursor-pointer"
                          >
                            Save Handling Record
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setHandlingTxId(tx.id);
                            setNextActionInput(tx.shopNextAction || 'REFURBISH');
                            setHandlingNotesInput(tx.shopHandlingNotes || '');
                          }}
                          className="px-3.5 py-1.5 font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg cursor-pointer"
                        >
                          Update Post-Acquisition Handling
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VERIFICATION STATUS TAB */}
        {activeTab === 'verification' && shopProfile && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Shop Verification Status</h2>
                <p className="text-xs text-slate-500">
                  Verification documents are stored privately and reviewed by ReCircuit Administrators.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#137C5A]">
                {formatLabel(shopProfile.verificationStatus)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAF8] border border-slate-200 space-y-2 text-xs">
              <div>
                <strong>Business Registration Number:</strong>{' '}
                <span className="font-mono">{shopProfile.businessRegistrationNumber || 'Not provided'}</span>
              </div>
              <div>
                <strong>Administrator Review Notes:</strong>{' '}
                <span>{shopProfile.verificationNotes || 'Pending initial review.'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-800">Submitted Private Verification Documents</h3>
              {shopProfile.documents && shopProfile.documents.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {shopProfile.documents.map((doc) => (
                    <div key={doc.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-slate-900">{doc.documentType}</strong> ·{' '}
                        <span className="font-mono text-slate-500">{doc.fileName}</span>
                      </div>
                      <span className="font-mono text-slate-700">{doc.reviewStatus}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500">No documents uploaded yet.</div>
              )}
            </div>

            {shopProfile.verificationStatus !== 'APPROVED' && (
              <form onSubmit={(e) => handleUpdateShopProfile(e, true)} className="pt-4 border-t border-slate-200 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Upload Additional Document & Resubmit</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={editShopForm.documentType}
                    onChange={(e) => setEditShopForm({ ...editShopForm, documentType: e.target.value })}
                    placeholder="Document Type"
                    className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                  <input
                    type="file"
                    accept=".pdf,.jpg,.png"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setEditShopForm({ ...editShopForm, documentFileName: f.name });
                    }}
                    className="text-xs text-slate-600"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#137C5A] rounded-lg cursor-pointer"
                >
                  Resubmit Verification Application
                </button>
              </form>
            )}
          </div>
        )}

        {/* SHOP PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <h2 className="text-lg font-bold text-slate-900">Edit Shop Profile</h2>
            <form onSubmit={(e) => handleUpdateShopProfile(e, false)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Shop Name</label>
                  <input
                    type="text"
                    value={editShopForm.shopName}
                    onChange={(e) => setEditShopForm({ ...editShopForm, shopName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Owner / Representative Name</label>
                  <input
                    type="text"
                    value={editShopForm.ownerName}
                    onChange={(e) => setEditShopForm({ ...editShopForm, ownerName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description of Services</label>
                <textarea
                  rows={3}
                  value={editShopForm.description}
                  onChange={(e) => setEditShopForm({ ...editShopForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={editShopForm.city}
                    onChange={(e) => setEditShopForm({ ...editShopForm, city: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={editShopForm.state}
                    onChange={(e) => setEditShopForm({ ...editShopForm, state: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code</label>
                  <input
                    type="text"
                    value={editShopForm.pinCode}
                    onChange={(e) => setEditShopForm({ ...editShopForm, pinCode: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#172B4D] rounded-lg cursor-pointer"
              >
                Save Shop Profile
              </button>
            </form>
          </div>
        )}

        {activeTab === 'messages' && (
          <MessagingPanel onOpenDevice={(id) => onNavigate('device-details', { deviceId: id })} />
        )}
        {activeTab === 'notifications' && (
          <NotificationsPanel
            onOpenDevice={(id) => onNavigate('device-details', { deviceId: id })}
            onOpenTransactions={() => setActiveTab('collection')}
          />
        )}
        {activeTab === 'support' && <ContactSupportPage />}
      </main>

      {/* Schedule Collection Modal */}
      {schedulingTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleScheduleCollectionSubmit}
            className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Coordinate Device Collection</h3>
              <button type="button" onClick={() => setSchedulingTx(null)} className="text-xs text-slate-500">
                Close
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Collection Type</label>
              <select
                value={scheduleMethod}
                onChange={(e) => setScheduleMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="SHOP_PICKUP">Shop Pickup</option>
                <option value="USER_DROPOFF">User Drop-Off at Shop</option>
                <option value="THIRD_PARTY_COLLECTION">Third-Party Collection</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Proposed Date & Time *</label>
              <input
                type="text"
                required
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
                placeholder="e.g. 2026-10-30 11:30 AM"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Collection Location Description</label>
              <input
                type="text"
                value={scheduleLocation}
                onChange={(e) => setScheduleLocation(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Collection Instructions</label>
              <textarea
                rows={2}
                value={scheduleInstructions}
                onChange={(e) => setScheduleInstructions(e.target.value)}
                placeholder="Technician contact name, ID verification note, or packaging instructions..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSchedulingTx(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-[#137C5A] rounded-lg cursor-pointer"
              >
                Save Collection Schedule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
