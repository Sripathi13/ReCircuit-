import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  Store,
  ShieldCheck,
  Smartphone,
  Flag,
  CheckCircle2,
  HelpCircle,
  BarChart3,
  FileText,
  LogOut,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import {
  ShopData,
  DeviceListing,
  TransactionItem,
  formatLabel,
  formatCurrency,
} from '../types';
import { PageRoute } from './Navbar';

interface AdminDashboardProps {
  onNavigate: (page: PageRoute, params?: { deviceId?: number }) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { user, apiFetch, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('overview');

  const [overview, setOverview] = useState<Record<string, number> | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allShops, setAllShops] = useState<ShopData[]>([]);
  const [allDevices, setAllDevices] = useState<DeviceListing[]>([]);
  const [allReports, setAllReports] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<TransactionItem[]>([]);
  const [allSupport, setAllSupport] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Shop review notes input per shop
  const [shopNotes, setShopNotes] = useState<Record<number, string>>({});
  // Report resolution notes per report
  const [reportNotes, setReportNotes] = useState<Record<number, string>>({});

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, usrs, shps, devs, rpts, txs, sup, anl, logs] = await Promise.all([
        apiFetch('/api/admin/dashboard'),
        apiFetch('/api/admin/users'),
        apiFetch('/api/admin/shops'),
        apiFetch('/api/admin/devices'),
        apiFetch('/api/admin/reports'),
        apiFetch('/api/admin/transactions'),
        apiFetch('/api/admin/support-requests'),
        apiFetch('/api/admin/analytics'),
        apiFetch('/api/admin/audit-logs'),
      ]);
      setOverview(ov);
      setAllUsers(usrs);
      setAllShops(shps);
      setAllDevices(devs);
      setAllReports(rpts);
      setAllTransactions(txs);
      setAllSupport(sup);
      setAnalytics(anl);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load admin console:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleShopVerification = async (
    shopId: number,
    verificationStatus: 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED' | 'SUSPENDED'
  ) => {
    try {
      await apiFetch(`/api/admin/shops/${shopId}/verification`, {
        method: 'PATCH',
        body: JSON.stringify({
          verificationStatus,
          verificationNotes:
            shopNotes[shopId] ||
            (verificationStatus === 'APPROVED'
              ? 'Approved by Platform Administrator after document inspection.'
              : 'Updated by Platform Administrator.'),
        }),
      });
      setBanner({
        type: 'success',
        text: `Shop #${shopId} status updated to ${verificationStatus} and recorded in Audit Logs.`,
      });
      await loadAdminData();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleUserStatus = async (userId: number, accountStatus: 'ACTIVE' | 'SUSPENDED') => {
    try {
      await apiFetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ accountStatus }),
      });
      setBanner({ type: 'success', text: `User #${userId} status updated to ${accountStatus}.` });
      await loadAdminData();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleDeviceModeration = async (deviceId: number, listingStatus: string) => {
    try {
      await apiFetch(`/api/admin/devices/${deviceId}/moderation`, {
        method: 'PATCH',
        body: JSON.stringify({
          listingStatus,
          reason: `Administrator moderation set status to ${listingStatus}`,
        }),
      });
      setBanner({ type: 'success', text: `Device #${deviceId} status updated to ${listingStatus}.` });
      await loadAdminData();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleReportUpdate = async (reportId: number, reportStatus: string) => {
    try {
      await apiFetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          reportStatus,
          resolutionNotes: reportNotes[reportId] || `Marked ${reportStatus} by Administrator.`,
        }),
      });
      setBanner({ type: 'success', text: `Report #${reportId} updated to ${reportStatus}.` });
      await loadAdminData();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleSupportStatus = async (supportId: number, status: string) => {
    try {
      await apiFetch(`/api/admin/support-requests/${supportId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setBanner({ type: 'success', text: `Support ticket #${supportId} marked ${status}.` });
      await loadAdminData();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    {
      id: 'shop-verification',
      label: `Shop Verification (${allShops.filter((s) => s.verificationStatus === 'PENDING_VERIFICATION').length})`,
      icon: ShieldCheck,
    },
    { id: 'shops', label: `All Shops (${allShops.length})`, icon: Store },
    { id: 'devices', label: `Device Listings (${allDevices.length})`, icon: Smartphone },
    { id: 'users', label: `Users (${allUsers.length})`, icon: Users },
    { id: 'reports', label: `Reports & Disputes (${allReports.length})`, icon: Flag },
    { id: 'transactions', label: `Transactions (${allTransactions.length})`, icon: CheckCircle2 },
    { id: 'support', label: `Support Requests (${allSupport.length})`, icon: HelpCircle },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'audit-logs', label: `Audit Logs (${auditLogs.length})`, icon: FileText },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Sidebar */}
      <aside className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <div className="px-3 py-2 border-b border-slate-100">
          <div className="text-xs font-semibold text-[#137C5A]">Administrator Console</div>
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

        {/* 10.1 OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900">Platform Governance & Operations Overview</h1>
                <p className="text-xs text-slate-500">
                  Real-time PostgreSQL metrics for users, shop verifications, marketplace listings, and circular transactions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('shop-verification')}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#137C5A] rounded-lg cursor-pointer"
              >
                Review Shop Applications ({overview?.shopsPendingVerification ?? 0})
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                    {overview?.registeredUsers ?? 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Registered Individual Users</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                    {overview?.registeredShops ?? 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Registered Partner Shops</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="text-2xl font-extrabold text-amber-600 font-mono tabular-nums">
                    {overview?.shopsPendingVerification ?? 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Shops Pending Verification</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="text-2xl font-extrabold text-[#137C5A] font-mono tabular-nums">
                    {overview?.totalDeviceListings ?? 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Total Device Listings</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="text-2xl font-extrabold text-[#137C5A] font-mono tabular-nums">
                    {overview?.availableDevices ?? 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Available Marketplace Devices</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="text-2xl font-extrabold text-[#172B4D] font-mono tabular-nums">
                    {overview?.completedTransactions ?? 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Completed Transactions</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="text-2xl font-extrabold text-red-600 font-mono tabular-nums">
                    {overview?.reportedListings ?? 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Open Reports</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                    {overview?.openSupportRequests ?? 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Open Support Tickets</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 10.2 SHOP VERIFICATION & ALL SHOPS */}
        {(activeTab === 'shop-verification' || activeTab === 'shops') && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {activeTab === 'shop-verification'
                  ? 'Shop Verification Queue & Applications'
                  : 'All Registered Partner Shops'}
              </h2>
              <p className="text-xs text-slate-500">
                Inspect business registration details and private verification documents. Approving a shop grants Verified Partner status and logs an Audit Event.
              </p>
            </div>

            <div className="space-y-4">
              {allShops.map((shop) => (
                <div key={shop.id} className="p-5 rounded-xl bg-[#F8FAF8] border border-slate-200 space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {shop.shopName} · <span className="text-[#137C5A]">{shop.businessType}</span>
                      </div>
                      <div className="text-slate-500">
                        Owner: {shop.ownerName} · {shop.email} · {shop.phone} · {shop.city}, {shop.state} ({shop.pinCode})
                      </div>
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      Status: {formatLabel(shop.verificationStatus)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-200/80">
                    <div>
                      <span className="text-slate-500 block">Registration / License Number:</span>
                      <strong className="font-mono">{shop.businessRegistrationNumber || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Private Street Address:</span>
                      <span>{shop.addressPrivate}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 block">Submitted Verification Documents:</span>
                      {shop.documents && shop.documents.length > 0 ? (
                        shop.documents.map((d) => (
                          <div key={d.id} className="font-mono text-slate-800 mt-0.5">
                            {d.documentType}: {d.fileName} ({d.reviewStatus})
                          </div>
                        ))
                      ) : (
                        <span>No document records</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <input
                      type="text"
                      value={shopNotes[shop.id] ?? shop.verificationNotes ?? ''}
                      onChange={(e) => setShopNotes({ ...shopNotes, [shop.id]: e.target.value })}
                      placeholder="Verification review note or rejection reason..."
                      className="flex-1 min-w-[220px] px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleShopVerification(shop.id, 'APPROVED')}
                        className="px-3.5 py-1.5 font-semibold text-white bg-[#137C5A] rounded-lg cursor-pointer"
                      >
                        Approve Shop
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShopVerification(shop.id, 'INFO_REQUESTED')}
                        className="px-3 py-1.5 font-semibold text-amber-900 bg-amber-100 rounded-lg cursor-pointer"
                      >
                        Request Info
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShopVerification(shop.id, 'REJECTED')}
                        className="px-3 py-1.5 font-semibold text-red-700 bg-red-50 rounded-lg cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShopVerification(shop.id, 'SUSPENDED')}
                        className="px-3 py-1.5 font-semibold text-slate-700 bg-slate-200 rounded-lg cursor-pointer"
                      >
                        Suspend
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 10.3 DEVICE MODERATION */}
        {activeTab === 'devices' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Device Listings & Moderation ({allDevices.length})</h2>
              <p className="text-xs text-slate-500">
                Review marketplace listings, pause suspicious listings, or restore verified listings without altering user descriptions or prices.
              </p>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {allDevices.map((dev) => (
                <div key={dev.id} className="py-3.5 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-slate-900">
                      {dev.title} · <span className="font-mono text-xs text-slate-500">{dev.listingCode}</span>
                    </div>
                    <div className="text-slate-500">
                      Owner: {dev.ownerName} ({dev.ownerEmail}) · {dev.city} · Price:{' '}
                      <span className="font-mono">{formatCurrency(dev.askingPrice)}</span> · Status:{' '}
                      <strong className="text-[#137C5A]">{dev.listingStatus}</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigate('device-details', { deviceId: dev.id })}
                      className="px-2.5 py-1.5 bg-slate-100 rounded font-semibold cursor-pointer"
                    >
                      Inspect
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeviceModeration(dev.id, 'AVAILABLE')}
                      className="px-2.5 py-1.5 bg-emerald-50 text-[#137C5A] rounded font-semibold cursor-pointer"
                    >
                      Restore Available
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeviceModeration(dev.id, 'UNAVAILABLE')}
                      className="px-2.5 py-1.5 bg-red-50 text-red-700 rounded font-semibold cursor-pointer"
                    >
                      Remove / Unavailable
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USERS MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Registered Accounts ({allUsers.length})</h2>
            <div className="divide-y divide-slate-100 text-xs">
              {allUsers.map((u) => (
                <div key={u.id} className="py-3 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <strong className="text-slate-900">{u.fullName}</strong> ·{' '}
                    <span className="font-mono text-slate-500">{u.email}</span>
                    <div className="text-slate-500 mt-0.5">
                      Role: <strong className="font-mono">{u.role}</strong> · Status:{' '}
                      <strong className="font-mono">{u.accountStatus}</strong>
                    </div>
                  </div>
                  {u.role !== 'ADMIN' && (
                    <div className="flex items-center gap-2">
                      {u.accountStatus === 'ACTIVE' ? (
                        <button
                          type="button"
                          onClick={() => handleUserStatus(u.id, 'SUSPENDED')}
                          className="px-3 py-1 bg-red-50 text-red-700 rounded font-semibold cursor-pointer"
                        >
                          Suspend Account
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUserStatus(u.id, 'ACTIVE')}
                          className="px-3 py-1 bg-emerald-50 text-[#137C5A] rounded font-semibold cursor-pointer"
                        >
                          Reactivate Account
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 10.4 REPORTS & DISPUTES */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">User & Shop Reports ({allReports.length})</h2>
            {allReports.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No open or historical reports.</div>
            ) : (
              <div className="space-y-3 text-xs">
                {allReports.map((r) => (
                  <div key={r.id} className="p-4 rounded-xl bg-[#F8FAF8] border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <strong>
                        Report #{r.id} · {formatLabel(r.reportType)}
                      </strong>
                      <span className="font-mono font-bold text-slate-800">{r.reportStatus}</span>
                    </div>
                    <p className="text-slate-700">{r.description}</p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={reportNotes[r.id] ?? r.resolutionNotes ?? ''}
                        onChange={(e) => setReportNotes({ ...reportNotes, [r.id]: e.target.value })}
                        placeholder="Resolution notes..."
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded"
                      />
                      <button
                        type="button"
                        onClick={() => handleReportUpdate(r.id, 'UNDER_REVIEW')}
                        className="px-3 py-1.5 bg-amber-100 text-amber-900 rounded font-semibold cursor-pointer"
                      >
                        Under Review
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReportUpdate(r.id, 'RESOLVED')}
                        className="px-3 py-1.5 bg-[#137C5A] text-white rounded font-semibold cursor-pointer"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Platform Transactions ({allTransactions.length})</h2>
            <div className="space-y-3 text-xs">
              {allTransactions.map((tx) => (
                <div key={tx.id} className="p-4 rounded-xl bg-[#F8FAF8] border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <strong>
                      Tx #{tx.id} · {tx.device?.title} ({tx.device?.listingCode})
                    </strong>
                    <span className="font-mono font-bold text-[#137C5A]">{tx.transactionStatus}</span>
                  </div>
                  <div className="text-slate-600">
                    Owner: {tx.owner?.fullName} → Partner Shop: {tx.shop?.shopName} · Type: {tx.transactionType} ·
                    Post-Acquisition Handling: <strong>{formatLabel(tx.shopNextAction || 'Not Recorded')}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUPPORT REQUESTS */}
        {activeTab === 'support' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Support Tickets ({allSupport.length})</h2>
            {allSupport.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No support requests submitted yet.</div>
            ) : (
              <div className="space-y-3 text-xs">
                {allSupport.map((s) => (
                  <div key={s.id} className="p-4 rounded-xl bg-[#F8FAF8] border border-slate-200 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900">
                        #{s.id} · {s.subject} ({s.name} — {s.email})
                      </div>
                      <p className="text-slate-600">{s.message}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold">{s.status}</span>
                      {s.status === 'OPEN' && (
                        <button
                          type="button"
                          onClick={() => handleSupportStatus(s.id, 'RESOLVED')}
                          className="px-3 py-1.5 bg-[#137C5A] text-white rounded font-semibold cursor-pointer"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 10.5 ANALYTICS (RECHARTS) */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-2">
              <h2 className="text-lg font-bold text-slate-900">Platform Analytics & Verified Lifecycle Metrics</h2>
              <p className="text-xs text-slate-500">
                Clearly distinguishing between registered devices, collected devices, and verified end-of-life recycling. No unverified environmental impact claims are extrapolated solely from registrations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Registered vs Collected vs Verified Recycling</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.lifecycleBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#137C5A" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Listings by Device Category</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.byCategory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#172B4D" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Device Condition Distribution</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.byCondition}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0F766E" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Disposal Preference Distribution</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.byDisposal}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#334155" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AUDIT LOGS */}
        {activeTab === 'audit-logs' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Administrative Audit Logs ({auditLogs.length})</h2>
              <p className="text-xs text-slate-500">
                Immutable database record of shop approvals, rejections, device moderation, and account status changes.
              </p>
            </div>
            <div className="divide-y divide-slate-100 text-xs font-mono">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong className="text-slate-900">{log.action}</strong> on {log.entityType} #{log.entityId} by{' '}
                    <span className="text-[#137C5A]">{log.actorName}</span>
                    {log.metadata && <div className="text-slate-500 text-[11px] mt-0.5">{log.metadata}</div>}
                  </div>
                  <span className="text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
