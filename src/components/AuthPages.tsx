import React, { useState, useEffect } from 'react';
import { ShieldCheck, Upload, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DEVICE_CATEGORIES, SHOP_BUSINESS_TYPES } from '../types';
import { PageRoute } from './Navbar';

interface AuthPagesProps {
  initialTab?: string;
  onNavigate: (page: PageRoute, params?: { dashboardTab?: string }) => void;
}

export const AuthPages: React.FC<AuthPagesProps> = ({ initialTab = 'login', onNavigate }) => {
  const { loginWithEmail, loginWithGoogle, registerUser, registerShop, apiFetch } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register-user' | 'register-shop' | 'reset'>(
    (initialTab as any) || 'login'
  );

  useEffect(() => {
    if (initialTab && ['login', 'register-user', 'register-shop', 'reset'].includes(initialTab)) {
      setActiveTab(initialTab as any);
    }
  }, [initialTab]);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // User Registration Form
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPhone, setUPhone] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uConfirm, setUConfirm] = useState('');
  const [uCity, setUCity] = useState('Coimbatore');
  const [uState, setUState] = useState('Tamil Nadu');
  const [uPin, setUPin] = useState('641012');
  const [uConsent, setUConsent] = useState(true);

  // Shop Registration Form
  const [sName, setSName] = useState('');
  const [sOwner, setSOwner] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [sPassword, setSPassword] = useState('');
  const [sType, setSType] = useState(SHOP_BUSINESS_TYPES[0]);
  const [sRegNo, setSRegNo] = useState('');
  const [sAddress, setSAddress] = useState('');
  const [sCity, setSCity] = useState('Coimbatore');
  const [sState, setSState] = useState('Tamil Nadu');
  const [sPin, setSPin] = useState('641012');
  const [sDesc, setSDesc] = useState('');
  const [sCategories, setSCategories] = useState<string[]>(['Smartphones', 'Laptops', 'Tablets']);
  const [sCollection, setSCollection] = useState<string[]>(['SHOP_PICKUP', 'USER_DROPOFF']);
  const [sDocType, setSDocType] = useState('GST & Business Trade License');
  const [sDocName, setSDocName] = useState('business_license_verification.pdf');

  // Password Reset Form
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');

  const routeByRole = (role: string) => {
    if (role === 'ADMIN') onNavigate('admin-dashboard');
    else if (role === 'SHOP') onNavigate('shop-dashboard');
    else onNavigate('user-dashboard');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const loggedUser = await loginWithEmail(loginEmail, loginPassword, false);
      routeByRole(loggedUser.role);
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccountLogin = async (email: string) => {
    setError(null);
    setLoading(true);
    try {
      const loggedUser = await loginWithEmail(email, undefined, true);
      routeByRole(loggedUser.role);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const loggedUser = await loginWithGoogle();
      routeByRole(loggedUser.role);
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUserRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (uPassword !== uConfirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!uConsent) {
      setError('You must agree to the terms and privacy policy.');
      return;
    }
    setLoading(true);
    try {
      const created = await registerUser({
        fullName: uName,
        email: uEmail,
        phone: uPhone,
        password: uPassword,
        city: uCity,
        state: uState,
        pinCode: uPin,
      });
      routeByRole(created.role);
    } catch (err: any) {
      setError(err.message || 'User registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleShopRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const created = await registerShop({
        shopName: sName,
        ownerName: sOwner,
        email: sEmail,
        phone: sPhone,
        password: sPassword,
        businessType: sType,
        businessRegistrationNumber: sRegNo,
        addressPrivate: sAddress,
        city: sCity,
        state: sState,
        pinCode: sPin,
        description: sDesc,
        acceptedCategories: sCategories,
        collectionPreferences: sCollection,
        documentType: sDocType,
        documentFileName: sDocName,
      });
      routeByRole(created.role);
    } catch (err: any) {
      setError(err.message || 'Shop registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail, newPassword: resetNewPass }),
      });
      setMessage(res.message);
      setActiveTab('login');
      setLoginEmail(resetEmail);
    } catch (err: any) {
      setError(err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setSCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const toggleCollectionMethod = (method: string) => {
    setSCollection((prev) => (prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]));
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-8">
      {/* Segmented Role / Action Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">ReCircuit Account Portal</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Separate authentication and role-based workspaces for Device Owners, Partner Shops, and Administrators.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setError(null);
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register-user');
              setError(null);
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'register-user' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            User Registration
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register-shop');
              setError(null);
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'register-shop' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Shop Registration
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-900">{error}</div>
      )}
      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#137C5A]" />
          <span>{message}</span>
        </div>
      )}

      {/* TAB 1: SIGN IN */}
      {activeTab === 'login' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <h2 className="text-lg font-bold text-slate-900">Sign In with Email or Google</h2>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => setActiveTab('reset')}
                    className="text-xs text-[#137C5A] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-xs font-semibold text-white bg-[#137C5A] rounded-lg hover:bg-[#0f6347] transition-colors cursor-pointer"
              >
                {loading ? 'Signing In...' : 'Sign In to ReCircuit'}
              </button>
            </form>

            <div className="relative py-2">
              <div className="border-t border-slate-200" />
              <span className="bg-white px-2 text-[11px] text-slate-400 absolute left-1/2 -translate-x-1/2 -top-0.5">
                OR
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Continue with Google Account
            </button>
          </div>

          {/* Seeded Development / Evaluation Accounts Box */}
          <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#137C5A]">
              <ShieldCheck className="w-4 h-4" />
              <span>Seeded Demonstration Accounts (1-Click Sign In)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Use any of these pre-seeded PostgreSQL accounts to test the complete workflow across Individual User,
              Verified Shop, Unverified Shop, and Administrator roles (Default password: <code className="font-mono">DemoPass#2026</code>).
            </p>

            <div className="space-y-2.5">
              {[
                {
                  role: 'USER',
                  title: 'Arjun Nair — Individual Device Owner',
                  email: 'arjun.nair@demo.recircuit.org',
                  desc: 'Owns 6 sample devices in Coimbatore with active shop interests & offers.',
                },
                {
                  role: 'VERIFIED SHOP',
                  title: 'Covai Mobile Care & Refurb Hub',
                  email: 'priya@covaimobilecare.demo.recircuit.org',
                  desc: 'Approved Mobile Phone Shop in Coimbatore. Can contact owners & make offers.',
                },
                {
                  role: 'VERIFIED SHOP',
                  title: 'SiliconFix Laptop & Compute Studio',
                  email: 'karthik@siliconfix.demo.recircuit.org',
                  desc: 'Approved Laptop & Computer Refurbisher.',
                },
                {
                  role: 'AUTHORIZED RECYCLER',
                  title: 'EcoCircuit Authorized E-Waste Recyclers',
                  email: 'compliance@ecocircuitrecycle.demo.recircuit.org',
                  desc: 'Approved E-Waste Recycler with scheduled printer collection.',
                },
                {
                  role: 'PENDING SHOP',
                  title: 'Metro Second-Hand Electronics (Unverified)',
                  email: 'rahul@metrodevices.demo.recircuit.org',
                  desc: 'Shop in PENDING_VERIFICATION status to test restricted contact access.',
                },
                {
                  role: 'ADMIN',
                  title: 'Platform Administrator',
                  email: 'admin@recircuit.org',
                  desc: 'Full access to Shop Verification, Moderation, Reports, Analytics & Audit Logs.',
                },
              ].map((acc) => (
                <div
                  key={acc.email}
                  className="p-3 rounded-lg bg-[#F8FAF8] border border-slate-200 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {acc.title} · <span className="text-[#137C5A] font-mono">{acc.role}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{acc.desc}</div>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleDemoAccountLogin(acc.email)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#172B4D] rounded-md hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER REGISTRATION */}
      {activeTab === 'register-user' && (
        <div className="bg-white rounded-xl border border-slate-200 p-7 max-w-2xl mx-auto space-y-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Create an Individual User Account</h2>
            <p className="text-xs text-slate-500 mt-1">
              Register to list unused electronics for sale, donation, exchange, refurbishment, or responsible recycling.
            </p>
          </div>

          <form onSubmit={handleUserRegSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={uName}
                  onChange={(e) => setUName(e.target.value)}
                  placeholder="e.g.Kavitha Ramesh"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={uEmail}
                  onChange={(e) => setUEmail(e.target.value)}
                  placeholder="kavitha@example.com"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={uPhone}
                  onChange={(e) => setUPhone(e.target.value)}
                  placeholder="+91 98420 00000"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={uPassword}
                  onChange={(e) => setUPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={uConfirm}
                  onChange={(e) => setUConfirm(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={uCity}
                  onChange={(e) => setUCity(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">State *</label>
                <input
                  type="text"
                  required
                  value={uState}
                  onChange={(e) => setUState(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code *</label>
                <input
                  type="text"
                  required
                  value={uPin}
                  onChange={(e) => setUPin(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-slate-600 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={uConsent}
                onChange={(e) => setUConsent(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-[#137C5A]"
              />
              <span>
                I agree to the ReCircuit Terms and Conditions and Privacy Policy, and understand that my phone number is
                never displayed publicly.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-xs font-semibold text-white bg-[#137C5A] rounded-lg hover:bg-[#0f6347] cursor-pointer"
            >
              {loading ? 'Creating User Account...' : 'Create User Account'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: SHOP REGISTRATION */}
      {activeTab === 'register-shop' && (
        <div className="bg-white rounded-xl border border-slate-200 p-7 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Partner Shop & Recycler Registration</h2>
            <p className="text-xs text-slate-500 mt-1">
              New shop accounts start in <strong>PENDING_VERIFICATION</strong> status until an administrator reviews your
              business details and verification document.
            </p>
          </div>

          <form onSubmit={handleShopRegSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Shop / Business Name *</label>
                <input
                  type="text"
                  required
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  placeholder="e.g. GreenTech Mobile & Laptop Care"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Owner / Authorized Representative *
                </label>
                <input
                  type="text"
                  required
                  value={sOwner}
                  onChange={(e) => setSOwner(e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Business Type *</label>
                <select
                  value={sType}
                  onChange={(e) => setSType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {SHOP_BUSINESS_TYPES.map((bt) => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Business Email *</label>
                <input
                  type="email"
                  required
                  value={sEmail}
                  onChange={(e) => setSEmail(e.target.value)}
                  placeholder="contact@shopdomain.in"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Business Phone *</label>
                <input
                  type="tel"
                  required
                  value={sPhone}
                  onChange={(e) => setSPhone(e.target.value)}
                  placeholder="+91 94430 00000"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={sPassword}
                  onChange={(e) => setSPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Shop Street Address *</label>
                <input
                  type="text"
                  required
                  value={sAddress}
                  onChange={(e) => setSAddress(e.target.value)}
                  placeholder="Building No, Street, Commercial Area"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={sCity}
                  onChange={(e) => setSCity(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code *</label>
                <input
                  type="text"
                  required
                  value={sPin}
                  onChange={(e) => setSPin(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business Registration / GST / E-Waste Auth Number *
                </label>
                <input
                  type="text"
                  required
                  value={sRegNo}
                  onChange={(e) => setSRegNo(e.target.value)}
                  placeholder="e.g. TN-MSME-2025-4410"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">State *</label>
                <input
                  type="text"
                  required
                  value={sState}
                  onChange={(e) => setSState(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description of Services *</label>
              <textarea
                required
                rows={2}
                value={sDesc}
                onChange={(e) => setSDesc(e.target.value)}
                placeholder="Describe your repair, refurbishment, resale, or authorized recycling capabilities..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            {/* Accepted Categories */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Accepted Device Categories</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                {DEVICE_CATEGORIES.map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center gap-2 p-2 rounded border border-slate-200 bg-[#F8FAF8] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={sCategories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                      className="rounded text-[#137C5A]"
                    />
                    <span className="truncate">{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Preferred Collection Methods & Private Verification Document */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Preferred Collection Methods</label>
                <div className="space-y-2 text-xs">
                  {[
                    { id: 'SHOP_PICKUP', label: 'Shop Doorstep Pickup' },
                    { id: 'USER_DROPOFF', label: 'User Drop-Off at Shop' },
                    { id: 'THIRD_PARTY_COLLECTION', label: 'Third-Party Logistics Collection' },
                  ].map((m) => (
                    <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sCollection.includes(m.id)}
                        onChange={() => toggleCollectionMethod(m.id)}
                        className="rounded text-[#137C5A]"
                      />
                      <span>{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <Upload className="w-4 h-4 text-[#137C5A]" />
                  <span>Business Verification Document (Stored Privately)</span>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Document Type</label>
                  <select
                    value={sDocType}
                    onChange={(e) => setSDocType(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                  >
                    <option value="GST & Business Trade License">GST & Business Trade License</option>
                    <option value="Pollution Control Board E-Waste Authorization">
                      Pollution Control Board E-Waste Authorization
                    </option>
                    <option value="Municipal Shop Establishment Certificate">
                      Municipal Shop Establishment Certificate
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Upload PDF / Image Certificate</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setSDocName(f.name);
                    }}
                    className="w-full text-xs text-slate-600"
                  />
                  <div className="text-[11px] text-slate-500 mt-1">Selected: {sDocName}</div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 text-xs font-semibold text-white bg-[#172B4D] rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              {loading ? 'Submitting Shop Application...' : 'Submit Shop Application for Verification'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: PASSWORD RESET */}
      {activeTab === 'reset' && (
        <div className="bg-white rounded-xl border border-slate-200 p-7 max-w-md mx-auto space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Reset Account Password</h2>
          <p className="text-xs text-slate-500">Enter your registered email address and choose a new password.</p>
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Email</label>
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (min 6 chars)</label>
              <input
                type="password"
                required
                minLength={6}
                value={resetNewPass}
                onChange={(e) => setResetNewPass(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-xs text-slate-500 hover:underline cursor-pointer"
              >
                ← Back to Sign In
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#137C5A] rounded-lg cursor-pointer"
              >
                Update Password
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
