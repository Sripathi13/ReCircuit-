import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  SlidersHorizontal,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Bookmark,
  MessageSquare,
  Send,
  Flag,
  CheckCircle2,
  MapPin,
  Phone,
  Lock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  DeviceListing,
  PlatformStats,
  DEVICE_CATEGORIES,
  DEVICE_CONDITIONS,
  DISPOSAL_PREFERENCES,
  formatLabel,
  formatCurrency,
} from '../types';
import { PageRoute } from './Navbar';

interface PublicPageProps {
  onNavigate: (page: PageRoute, params?: { deviceId?: number; authTab?: string; dashboardTab?: string }) => void;
}

// Resilient Device Image Component (Zero-Broken-Image Policy)
export const DeviceImageFrame: React.FC<{
  src?: string | null;
  alt: string;
  category?: string;
  className?: string;
}> = ({ src, alt, category, className = 'w-full h-56' }) => {
  const [imgError, setImgError] = useState(false);

  if (!src || imgError) {
    return (
      <div
        className={`${className} bg-gradient-to-br from-slate-100 to-emerald-50/60 flex flex-col items-center justify-center p-6 text-center border-b border-slate-200/80`}
      >
        <svg className="w-14 h-14 text-[#137C5A] mb-2 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <line x1="8" y1="17" x2="16" y2="17" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
        <span className="text-xs font-medium text-slate-600 line-clamp-1">{alt}</span>
        {category && <span className="text-[11px] text-slate-400 mt-0.5">{category}</span>}
      </div>
    );
  }

  return (
    <div className={`${className} bg-[#F1F5F3] overflow-hidden relative border-b border-slate-200/70`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
};

// ============================================================================
// 4.1 LANDING PAGE
// ============================================================================
export const LandingPage: React.FC<PublicPageProps> = ({ onNavigate }) => {
  const { user, apiFetch } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [featuredDevices, setFeaturedDevices] = useState<DeviceListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<PlatformStats>('/api/stats').catch(() => null),
      apiFetch<DeviceListing[]>('/api/devices?onlyAvailable=true').catch(() => []),
    ]).then(([st, devs]) => {
      if (!active) return;
      if (st) setStats(st);
      setFeaturedDevices((devs || []).slice(0, 6));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [apiFetch]);

  const handleRegisterCTA = () => {
    if (!user) onNavigate('auth', { authTab: 'register-user' });
    else if (user.role === 'USER') onNavigate('user-dashboard', { dashboardTab: 'register-device' });
    else if (user.role === 'SHOP') onNavigate('shop-dashboard');
    else onNavigate('admin-dashboard');
  };

  return (
    <div className="space-y-20 pb-12">
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            <div className="text-xs font-medium text-[#137C5A] tracking-wide">
              Give Your Electronics a Second Life · Smart Reuse & Responsible E-Waste Marketplace
            </div>
            <h1
              className="text-slate-900 font-extrabold tracking-tight leading-[1.12]"
              style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', textWrap: 'balance' }}
            >
              Your Unused Electronics Deserve a Second Life.
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              Connect with trusted local shops to sell, donate, refurbish, or responsibly recycle the electronics you no
              longer use. Every unused device is an opportunity for reuse, repair, or safe recovery.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={handleRegisterCTA}
                className="px-6 py-3 text-sm font-semibold text-white bg-[#137C5A] rounded-lg hover:bg-[#0f6347] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Register a Device</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('explore')}
                className="px-6 py-3 text-sm font-semibold text-[#172B4D] bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200/70 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Explore Available Devices
              </button>
            </div>
            <div className="pt-2 text-xs text-slate-500 flex flex-wrap items-center gap-2">
              <span>Privacy-protected locality listings</span>
              <span aria-hidden="true">·</span>
              <span>Admin-verified partner shops</span>
              <span aria-hidden="true">·</span>
              <span>Guided safe handover checklist</span>
            </div>
          </div>

          {/* Hero Visual Workbench Illustration */}
          <div className="lg:col-span-5 flex items-stretch">
            <div className="w-full rounded-xl bg-[#172B4D] p-6 text-white flex flex-col justify-between border border-slate-800">
              <svg viewBox="0 0 560 360" className="w-full h-auto rounded-lg bg-[#0F1E36]" role="img" aria-label="Smartphones, laptops, and tablets being reused and refurbished">
                <rect width="560" height="360" rx="12" fill="#0F1E36" />
                <circle cx="460" cy="70" r="110" fill="#137C5A" opacity="0.18" />
                <circle cx="90" cy="290" r="120" fill="#A3E635" opacity="0.08" />
                {/* Laptop */}
                <rect x="70" y="75" width="240" height="150" rx="10" fill="#1E293B" stroke="#137C5A" strokeWidth="3" />
                <rect x="82" y="87" width="216" height="126" rx="5" fill="#0F172A" />
                <path d="M45 225 L335 225 L320 243 L60 243 Z" fill="#334155" />
                <rect x="105" y="112" width="110" height="10" rx="5" fill="#137C5A" />
                <rect x="105" y="132" width="160" height="8" rx="4" fill="#475569" />
                <rect x="105" y="148" width="135" height="8" rx="4" fill="#475569" />
                <rect x="105" y="172" width="70" height="20" rx="4" fill="#A3E635" opacity="0.9" />
                {/* Smartphone */}
                <rect x="355" y="65" width="125" height="215" rx="18" fill="#1E293B" stroke="#A3E635" strokeWidth="2.5" />
                <rect x="365" y="80" width="105" height="185" rx="10" fill="#0F172A" />
                <circle cx="417" cy="155" r="28" fill="#137C5A" opacity="0.25" stroke="#A3E635" strokeWidth="2" />
                <path d="M407 155 L415 163 L430 147" stroke="#A3E635" strokeWidth="3" fill="none" strokeLinecap="round" />
                <rect x="382" y="205" width="70" height="8" rx="4" fill="#64748B" />
                {/* Tablet */}
                <rect x="165" y="195" width="175" height="120" rx="12" fill="#1E293B" stroke="#38BDF8" strokeWidth="2.5" />
                <rect x="175" y="205" width="155" height="100" rx="6" fill="#0F172A" />
                <rect x="195" y="225" width="90" height="8" rx="4" fill="#38BDF8" />
                <rect x="195" y="242" width="115" height="6" rx="3" fill="#334155" />
                <rect x="195" y="256" width="80" height="6" rx="3" fill="#334155" />
              </svg>
              <div className="pt-5 flex items-center justify-between text-xs text-slate-300 border-t border-slate-700/70 mt-4">
                <span>Circular Lifecycle: Register → Inspect → Refurbish or Recycle</span>
                <span className="font-mono text-[#A3E635]">VERIFIED CHANNELS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width Database-Backed Platform Statistics Strip */}
        <div className="border-t border-slate-200 bg-[#F8FAF8]">
          <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
                {loading ? '—' : stats?.devicesRegistered ?? 0}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-1">Devices Registered on Platform</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#137C5A] font-mono tabular-nums">
                {loading ? '—' : stats?.devicesReused ?? 0}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-1">Devices Successfully Reused</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#172B4D] font-mono tabular-nums">
                {loading ? '—' : stats?.devicesRecycled ?? 0}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-1">Devices Collected for Recycling</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
                {loading ? '—' : stats?.verifiedShops ?? 0}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-1">Verified Partner Shops</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Public Listings Section */}
      <section className="max-w-7xl mx-auto px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Recently Registered Devices</h2>
            <p className="text-sm text-slate-600 mt-1">
              Real listings from database records. Verified shops can express interest, submit offers, or schedule collection.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('explore')}
            className="text-sm font-semibold text-[#137C5A] hover:underline flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Browse All Marketplace Listings</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-xl border border-slate-200 h-80 animate-pulse p-5" />
            ))}
          </div>
        ) : featuredDevices.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-3">
            <div className="text-base font-semibold text-slate-800">No active public listings yet</div>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Be the first household or individual to register an unused smartphone, laptop, tablet, or appliance.
            </p>
            <button
              type="button"
              onClick={handleRegisterCTA}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#137C5A] rounded-lg hover:bg-[#0f6347] cursor-pointer"
            >
              Register First Device
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredDevices.map((dev) => (
              <div
                key={dev.id}
                onClick={() => onNavigate('device-details', { deviceId: dev.id })}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <DeviceImageFrame src={dev.primaryImage} alt={dev.title} category={dev.category} className="w-full h-52" />
                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span>{dev.brand}</span>
                      <span aria-hidden="true">·</span>
                      <span>{dev.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatLabel(dev.condition)}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 line-clamp-1">{dev.title}</h3>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <span>
                        {dev.approximateLocality}, {dev.city} ({dev.pinCode})
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{dev.listingCode}</span>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500">{formatLabel(dev.disposalPreference)}</span>
                    <div className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                      {dev.disposalPreference === 'SELL'
                        ? formatCurrency(dev.askingPrice)
                        : formatLabel(dev.disposalPreference)}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#137C5A] whitespace-nowrap shrink-0">
                    View Details →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* How It Works 4-Step Section */}
      <section className="bg-white border-y border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-6 space-y-10">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-slate-900">How ReCircuit Works</h2>
            <p className="text-sm text-slate-600 mt-1">
              A transparent four-stage workflow designed to protect user privacy while connecting devices with qualified local businesses.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01. Register Your Device',
                desc: 'Document the device brand, model, honest functional condition, photographs, and whether you want to sell, donate, exchange, refurbish, or recycle.',
              },
              {
                step: '02. Connect with a Verified Shop',
                desc: 'Administrator-verified local repair shops, refurbishers, and authorized recyclers discover your listing and submit interest or purchase offers.',
              },
              {
                step: '03. Arrange Collection or Handover',
                desc: 'Communicate via private in-platform messaging without exposing your home address or phone number publicly, and agree on pickup or drop-off.',
              },
              {
                step: '04. Give the Device a Second Life',
                desc: 'Complete the Safe Device Handover checklist to wipe personal data, confirm collection, and track the completed transaction.',
              },
            ].map((item) => (
              <div key={item.step} className="p-6 rounded-xl bg-[#F8FAF8] border border-slate-200 space-y-3">
                <h3 className="text-base font-bold text-[#172B4D]">{item.step}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Four Stakeholder Groups & Benefits */}
      <section className="max-w-7xl mx-auto px-6 space-y-10">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-slate-900">Built for Every Participant in the Circular Economy</h2>
          <p className="text-sm text-slate-600 mt-1">
            Tailored tools and verification controls for device owners and specialized electronics businesses.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
            <div className="text-xs font-semibold text-[#137C5A]">For Individuals & Households</div>
            <h3 className="text-lg font-bold text-slate-900">Declutter Responsibly with Full Privacy Control</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              List working smartphones, older laptops, broken monitors, or dead printers in minutes. Choose whether to sell,
              donate, exchange, or request certified e-waste collection—without posting your phone number on public classifieds.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
            <div className="text-xs font-semibold text-[#137C5A]">For Local Electronics & Repair Shops</div>
            <h3 className="text-lg font-bold text-slate-900">Source Local Inventory with Diagnostic Transparency</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Filter local listings by category, PIN code, power-on status, screen health, and battery condition. Submit direct
              purchase offers or repair/refurbishment proposals to device owners in your city.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
            <div className="text-xs font-semibold text-[#137C5A]">For Refurbishers & Second-Hand Dealers</div>
            <h3 className="text-lg font-bold text-slate-900">Extend Hardware Lifespans & Track Post-Acquisition Handling</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Acquire corporate and consumer notebooks, tablets, and displays directly from verified owners and maintain a
              complete audit trail of refurbishment or part recovery.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
            <div className="text-xs font-semibold text-[#137C5A]">For Authorized Recycling Partners</div>
            <h3 className="text-lg font-bold text-slate-900">Coordinate Safe E-Waste Collection</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Identify non-working electronics and appliances marked for responsible recycling, schedule neighborhood pickups,
              and record authorized end-of-life material recovery.
            </p>
          </div>
        </div>

        {/* Call to Action Banner for Shop Registration */}
        <div className="bg-[#172B4D] text-white rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h3 className="text-xl font-bold">Operate an Electronics Shop, Repair Center, or Authorized Recycler?</h3>
            <p className="text-sm text-slate-300">
              Apply for a Verified Partner Shop badge on ReCircuit to access device owner contact channels, submit purchase
              offers, and coordinate local device collections.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('auth', { authTab: 'register-shop' })}
            className="px-6 py-3 text-sm font-semibold text-slate-950 bg-[#A3E635] rounded-lg hover:bg-[#8fd125] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Register as a Partner Shop
          </button>
        </div>
      </section>
    </div>
  );
};

// ============================================================================
// 4.2 EXPLORE DEVICES (MARKETPLACE)
// ============================================================================
export const ExploreDevicesPage: React.FC<PublicPageProps> = ({ onNavigate }) => {
  const { apiFetch } = useAuth();
  const [devices, setDevices] = useState<DeviceListing[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [condition, setCondition] = useState('ALL');
  const [disposalPreference, setDisposalPreference] = useState('ALL');
  const [city, setCity] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_asc' | 'price_desc'>('newest');

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('search', search.trim());
      if (category !== 'ALL') qs.set('category', category);
      if (condition !== 'ALL') qs.set('condition', condition);
      if (disposalPreference !== 'ALL') qs.set('disposalPreference', disposalPreference);
      if (city.trim()) qs.set('city', city.trim());
      if (pinCode.trim()) qs.set('pinCode', pinCode.trim());
      if (maxPrice.trim()) qs.set('maxPrice', maxPrice.trim());
      if (onlyAvailable) qs.set('onlyAvailable', 'true');
      qs.set('sortBy', sortBy);

      const data = await apiFetch<DeviceListing[]>(`/api/devices?${qs.toString()}`);
      setDevices(data);
    } catch (err) {
      console.error('Failed to load marketplace:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, search, category, condition, disposalPreference, city, pinCode, maxPrice, onlyAvailable, sortBy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchListings();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchListings]);

  const handleResetFilters = () => {
    setSearch('');
    setCategory('ALL');
    setCondition('ALL');
    setDisposalPreference('ALL');
    setCity('');
    setPinCode('');
    setMaxPrice('');
    setOnlyAvailable(false);
    setSortBy('newest');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Explore Marketplace Devices</h1>
          <p className="text-sm text-slate-600 mt-1">
            Browse public electronics listings available for purchase, donation collection, refurbishment, or authorized recycling.
          </p>
        </div>
        <div className="text-xs text-slate-500 font-mono tabular-nums">
          Showing {devices.length} {devices.length === 1 ? 'listing' : 'listings'}
        </div>
      </div>

      {/* Search and Combined Filter Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by device name, brand, model, city, or ID..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#137C5A]"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Filter by Category"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#137C5A]"
            >
              <option value="ALL">All Categories</option>
              {DEVICE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              aria-label="Filter by Condition"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#137C5A]"
            >
              <option value="ALL">All Conditions</option>
              {DEVICE_CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sort Listings"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#137C5A]"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 pt-2 border-t border-slate-100 items-center">
          <div className="md:col-span-3">
            <select
              value={disposalPreference}
              onChange={(e) => setDisposalPreference(e.target.value)}
              aria-label="Disposal Method"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">All Disposal Methods</option>
              {DISPOSAL_PREFERENCES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City (e.g. Coimbatore)"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div className="md:col-span-2">
            <input
              type="text"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              placeholder="PIN Code (e.g. 641012)"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
            />
          </div>

          <div className="md:col-span-2">
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max Price (₹)"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
            />
          </div>

          <div className="md:col-span-3 flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="rounded border-slate-300 text-[#137C5A] focus:ring-[#137C5A]"
              />
              <span>Available Only</span>
            </label>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 underline cursor-pointer whitespace-nowrap shrink-0"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 h-80 animate-pulse p-5" />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <SlidersHorizontal className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="text-base font-bold text-slate-800">No devices match your current filter criteria</div>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Try clearing your city, PIN code, or price ceiling to view all available electronics listings.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#137C5A] rounded-lg hover:bg-[#0f6347] cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((dev) => (
            <div
              key={dev.id}
              onClick={() => onNavigate('device-details', { deviceId: dev.id })}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <DeviceImageFrame src={dev.primaryImage} alt={dev.title} category={dev.category} className="w-full h-52" />
                <div className="p-5 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span>{dev.brand}</span>
                    <span aria-hidden="true">·</span>
                    <span>{dev.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatLabel(dev.condition)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatLabel(dev.listingStatus)}</span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 line-clamp-1">{dev.title}</h2>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{dev.description}</p>
                  <div className="pt-1 text-xs text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {dev.approximateLocality}, {dev.city} — {dev.pinCode}
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500">
                    {formatLabel(dev.disposalPreference)} · Listed {new Date(dev.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                    {dev.askingPrice && dev.askingPrice > 0
                      ? `${formatCurrency(dev.askingPrice)}${dev.priceNegotiable ? ' (Negotiable)' : ''}`
                      : formatLabel(dev.disposalPreference)}
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#137C5A] whitespace-nowrap shrink-0">
                  Inspect Listing →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 7.3 DEVICE DETAILS PAGE (PUBLIC & VERIFIED SHOP ACTIONS)
// ============================================================================
export const DeviceDetailsPage: React.FC<{
  deviceId: number;
  onNavigate: PublicPageProps['onNavigate'];
}> = ({ deviceId, onNavigate }) => {
  const { user, apiFetch } = useAuth();
  const [device, setDevice] = useState<DeviceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals: 'interest' | 'offer' | 'message' | 'report' | null
  const [activeModal, setActiveModal] = useState<'interest' | 'offer' | 'message' | 'report' | null>(null);

  // Express Interest Form State
  const [interestAction, setInterestAction] = useState('PURCHASE');
  const [interestCollection, setInterestCollection] = useState('SHOP_PICKUP');
  const [interestDate, setInterestDate] = useState('2026-10-30');
  const [interestPrice, setInterestPrice] = useState('');
  const [interestMessage, setInterestMessage] = useState('');
  const [interestNotes, setInterestNotes] = useState('');

  // Make Offer Form State
  const [offerPrice, setOfferPrice] = useState('');
  const [offerCollection, setOfferCollection] = useState('SHOP_PICKUP');
  const [offerDate, setOfferDate] = useState('2026-10-30');
  const [offerExpiry, setOfferExpiry] = useState('2026-11-05');
  const [offerMessage, setOfferMessage] = useState('');

  // Direct Message Form State
  const [directMessage, setDirectMessage] = useState('');

  // Report Form State
  const [reportType, setReportType] = useState('INCORRECT_DESCRIPTION');
  const [reportDesc, setReportDesc] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const loadDevice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<DeviceListing>(`/api/devices/${deviceId}`);
      setDevice(data);
      if (data.askingPrice) {
        setOfferPrice(String(data.askingPrice));
        setInterestPrice(String(data.askingPrice));
      }
    } catch (err: any) {
      setError(err.message || 'Could not load device details');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, deviceId]);

  useEffect(() => {
    loadDevice();
  }, [loadDevice]);

  const handleToggleSave = async () => {
    if (!user || user.role !== 'SHOP') return;
    try {
      const res = await apiFetch<{ saved: boolean }>(`/api/shops/me/saved-devices/${deviceId}`, {
        method: 'POST',
      });
      setSaved(res.saved);
      setFeedbackBanner({
        type: 'success',
        text: res.saved ? 'Device saved to your Shop Saved Devices list.' : 'Device removed from Saved Devices.',
      });
    } catch (err: any) {
      setFeedbackBanner({ type: 'error', text: err.message });
    }
  };

  const handleSubmitInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedbackBanner(null);
    try {
      await apiFetch(`/api/devices/${deviceId}/interests`, {
        method: 'POST',
        body: JSON.stringify({
          intendedAction: interestAction,
          collectionMethod: interestCollection,
          proposedCollectionDate: interestDate,
          proposedPrice: interestPrice ? Number(interestPrice) : null,
          interestMessage,
          additionalNotes: interestNotes,
        }),
      });
      setActiveModal(null);
      setFeedbackBanner({
        type: 'success',
        text: 'Interest request submitted! The device owner has been notified and a conversation thread has been created.',
      });
      await loadDevice();
    } catch (err: any) {
      setFeedbackBanner({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedbackBanner(null);
    try {
      await apiFetch(`/api/devices/${deviceId}/offers`, {
        method: 'POST',
        body: JSON.stringify({
          proposedPrice: Number(offerPrice),
          collectionMethod: offerCollection,
          proposedCollectionDate: offerDate,
          expiresAt: offerExpiry,
          message: offerMessage,
        }),
      });
      setActiveModal(null);
      setFeedbackBanner({
        type: 'success',
        text: `Formal purchase offer of ₹${Number(offerPrice).toLocaleString('en-IN')} sent to the owner.`,
      });
      await loadDevice();
    } catch (err: any) {
      setFeedbackBanner({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedbackBanner(null);
    try {
      await apiFetch('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({
          deviceId,
          initialMessage: directMessage,
        }),
      });
      setActiveModal(null);
      setDirectMessage('');
      setFeedbackBanner({
        type: 'success',
        text: 'Message sent to device owner! You can continue chatting in your Messages tab.',
      });
    } catch (err: any) {
      setFeedbackBanner({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          deviceId,
          reportType,
          description: reportDesc,
        }),
      });
      setActiveModal(null);
      setReportDesc('');
      setFeedbackBanner({
        type: 'success',
        text: 'Report submitted to ReCircuit Administrators for review.',
      });
    } catch (err: any) {
      setFeedbackBanner({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="bg-white rounded-xl border border-slate-200 h-96 animate-pulse p-8" />
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4">
          <div className="text-lg font-bold text-slate-900">{error || 'Listing not found'}</div>
          <button
            type="button"
            onClick={() => onNavigate('explore')}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#137C5A] rounded-lg cursor-pointer"
          >
            Back to Explore Devices
          </button>
        </div>
      </div>
    );
  }

  let parsedAccessories: string[] = [];
  try {
    parsedAccessories = JSON.parse(device.accessories || '[]');
  } catch {
    parsedAccessories = [];
  }

  const canAcceptRequests = ['AVAILABLE', 'INTERESTED', 'NEGOTIATING'].includes(device.listingStatus);
  const isVerifiedShop = Boolean(device.viewerContext?.isVerifiedShop);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('explore')}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          ← Back to Marketplace Listings
        </button>
        <div className="text-xs text-slate-500 font-mono">
          Listing ID: <strong className="text-slate-900">{device.listingCode}</strong> · Status:{' '}
          <strong className="text-[#137C5A]">{formatLabel(device.listingStatus)}</strong>
        </div>
      </div>

      {feedbackBanner && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <span>{feedbackBanner.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-xs underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Gallery + Detailed Diagnostic Specifications */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <DeviceImageFrame
              src={device.primaryImage}
              alt={device.title}
              category={device.category}
              className="w-full h-80 sm:h-96"
            />
            {device.images && device.images.length > 1 && (
              <div className="p-4 grid grid-cols-4 gap-3 bg-slate-50">
                {device.images.map((img) => (
                  <div key={img.id} className="rounded-lg overflow-hidden border border-slate-200 h-20">
                    <img src={img.storageKey} alt={img.imageType} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Honest Condition & Diagnostic Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <h2 className="text-lg font-bold text-slate-900">Hardware Diagnostics & Condition Report</h2>
            <p className="text-sm text-slate-700 leading-relaxed">{device.description}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 text-sm">
              <div>
                <div className="text-xs text-slate-500">Declared Condition</div>
                <div className="font-semibold text-slate-900 mt-0.5">{formatLabel(device.condition)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Powers On</div>
                <div className="font-semibold text-slate-900 mt-0.5">{device.powersOn ? 'Yes — Boots' : 'No — Does Not Power On'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Screen Functional</div>
                <div className="font-semibold text-slate-900 mt-0.5">{device.screenFunctional ? 'Yes — Working' : 'No / Damaged Display'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Battery Status</div>
                <div className="font-semibold text-slate-900 mt-0.5">{formatLabel(device.batteryCondition)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Original Charger</div>
                <div className="font-semibold text-slate-900 mt-0.5">{device.originalChargerIncluded ? 'Included' : 'Not Included'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Purchase Year</div>
                <div className="font-semibold text-slate-900 font-mono tabular-nums mt-0.5">
                  {device.purchaseYear || 'Not specified'}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Known Physical or Functional Issues:</span>
                <p className="text-slate-800 mt-0.5">{device.knownDamage || 'None reported by owner.'}</p>
              </div>
              {device.conditionNotes && (
                <div>
                  <span className="text-xs text-slate-500 block">Additional Condition Notes:</span>
                  <p className="text-slate-800 mt-0.5">{device.conditionNotes}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-slate-500 block">Included Accessories:</span>
                <p className="text-slate-800 mt-0.5">
                  {parsedAccessories.length > 0 ? parsedAccessories.join(' · ') : 'Device only (no extra accessories)'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Contiguous Acquisition / Action Module & Privacy-Protected Owner Info */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <div className="space-y-2">
              <div className="text-xs text-slate-500">
                {device.brand} · {device.model} · {device.category}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{device.title}</h1>
            </div>

            <div className="p-4 rounded-lg bg-[#F8FAF8] border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">Preferred Disposal Method</div>
                <div className="text-sm font-bold text-[#172B4D] mt-0.5">{formatLabel(device.disposalPreference)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Asking Price</div>
                <div className="text-xl font-extrabold text-[#137C5A] font-mono tabular-nums">
                  {device.askingPrice && device.askingPrice > 0
                    ? formatCurrency(device.askingPrice)
                    : formatLabel(device.disposalPreference)}
                </div>
              </div>
            </div>

            {device.disposalDetails && (
              <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
                <strong className="text-slate-800">Owner Disposal Note:</strong> {device.disposalDetails}
              </div>
            )}

            {/* Approximate Locality & Privacy Notice */}
            <div className="space-y-2 pt-2 border-t border-slate-100 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Approximate Locality:</span>
                <span className="font-semibold text-slate-900">
                  {device.approximateLocality}, {device.city}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">PIN Code / State:</span>
                <span className="font-mono text-slate-900">
                  {device.pinCode} · {device.state}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Preferred Handover:</span>
                <span className="text-slate-900">{formatLabel(device.preferredCollectionMethod)}</span>
              </div>
              <div className="text-[11px] text-slate-500 pt-1">
                Exact home address is never displayed publicly. Handover coordinates are shared only after a request is accepted.
              </div>
            </div>

            {/* Owner Information & Role-Based Action Controls */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="text-xs font-semibold text-slate-800">Owner Contact & Verification Gate</div>

              {isVerifiedShop ? (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-[#137C5A]">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verified Partner Shop Access Enabled</span>
                    </div>
                    <div className="text-slate-700">
                      Owner: <strong>{device.ownerInfo?.displayName}</strong> · Preferred Contact:{' '}
                      <strong>{formatLabel(device.ownerInfo?.preferredContactMethod)}</strong>
                    </div>
                    {device.ownerInfo?.phone ? (
                      <div className="flex items-center gap-1.5 text-slate-900 font-mono pt-1">
                        <Phone className="w-3.5 h-3.5 text-[#137C5A]" />
                        <span>Permitted Owner Phone: {device.ownerInfo.phone}</span>
                      </div>
                    ) : (
                      <div className="text-slate-500">
                        Phone number is set to reveal after you submit a request and the owner accepts it.
                      </div>
                    )}
                  </div>

                  {canAcceptRequests ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveModal('interest')}
                        className="px-4 py-2.5 text-xs font-semibold text-white bg-[#137C5A] rounded-lg hover:bg-[#0f6347] transition-colors cursor-pointer"
                      >
                        Express Interest / Request Collection
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveModal('offer')}
                        className="px-4 py-2.5 text-xs font-semibold text-white bg-[#172B4D] rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Make a Purchase Offer
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveModal('message')}
                        className="px-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Message Owner</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleToggleSave}
                        className="px-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>{saved ? 'Saved in Shop List' : 'Save Listing'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                      This device is currently <strong>{formatLabel(device.listingStatus)}</strong> and is no longer accepting new shop requests.
                    </div>
                  )}
                </div>
              ) : user?.role === 'SHOP' ? (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-2 text-xs text-amber-900">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Shop Verification Pending ({formatLabel(device.viewerContext?.shopVerificationStatus)})</span>
                  </div>
                  <p>
                    Only administrator-approved shops can view owner contact information, express interest, or initiate collection requests.
                  </p>
                </div>
              ) : device.viewerContext?.isOwner ? (
                <div className="p-4 rounded-lg bg-slate-100 border border-slate-200 space-y-3 text-xs">
                  <div className="font-semibold text-slate-900">You are the owner of this device listing.</div>
                  <button
                    type="button"
                    onClick={() => onNavigate('user-dashboard', { dashboardTab: 'my-devices' })}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#137C5A] rounded-lg cursor-pointer"
                  >
                    Manage Listing in My Devices
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <Lock className="w-4 h-4 text-[#137C5A]" />
                    <span>Protected Owner Contact Details</span>
                  </div>
                  <p>
                    To prevent spam and protect household privacy, only verified electronics shops, refurbishers, and
                    authorized recyclers may contact the device owner or submit collection offers.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onNavigate('auth', { authTab: 'login' })}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#137C5A] rounded-lg cursor-pointer"
                    >
                      Sign In as Verified Shop
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('auth', { authTab: 'register-shop' })}
                      className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg cursor-pointer"
                    >
                      Apply for Shop Verification
                    </button>
                  </div>
                </div>
              )}

              {user && !device.viewerContext?.isOwner && (
                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveModal('report')}
                    className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 cursor-pointer"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report Listing</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODALS FOR EXPRESS INTEREST, MAKE OFFER, MESSAGE OWNER, REPORT       */}
      {/* ==================================================================== */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 space-y-5 shadow-xl">
            {activeModal === 'interest' && (
              <form onSubmit={handleSubmitInterest} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">Express Interest / Request Collection</h3>
                  <button type="button" onClick={() => setActiveModal(null)} className="text-xs text-slate-500">
                    Close
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Intended Action</label>
                  <select
                    value={interestAction}
                    onChange={(e) => setInterestAction(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="PURCHASE">Purchase</option>
                    <option value="DONATION_COLLECTION">Donation Collection</option>
                    <option value="EXCHANGE">Exchange</option>
                    <option value="REPAIR_OR_REFURBISHMENT">Repair or Refurbishment</option>
                    <option value="RESPONSIBLE_RECYCLING">Responsible Recycling</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Proposed Collection Method</label>
                    <select
                      value={interestCollection}
                      onChange={(e) => setInterestCollection(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="SHOP_PICKUP">Shop Pickup</option>
                      <option value="USER_DROPOFF">User Drop-off at Shop</option>
                      <option value="THIRD_PARTY_COLLECTION">Third-party Collection</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Proposed Collection Date</label>
                    <input
                      type="date"
                      value={interestDate}
                      onChange={(e) => setInterestDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Proposed Price (₹, optional or 0 for donation/recycling)
                  </label>
                  <input
                    type="number"
                    value={interestPrice}
                    onChange={(e) => setInterestPrice(e.target.value)}
                    placeholder="e.g. 18000"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Message to Device Owner *</label>
                  <textarea
                    required
                    rows={3}
                    value={interestMessage}
                    onChange={(e) => setInterestMessage(e.target.value)}
                    placeholder="Explain how your shop will inspect, collect, refurbish, or recycle this device..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Additional Notes</label>
                  <input
                    type="text"
                    value={interestNotes}
                    onChange={(e) => setInterestNotes(e.target.value)}
                    placeholder="Pickup window, diagnostic terms, or recycling certificate info"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#137C5A] rounded-lg hover:bg-[#0f6347] cursor-pointer"
                  >
                    {submitting ? 'Submitting...' : 'Submit Interest Request'}
                  </button>
                </div>
              </form>
            )}

            {activeModal === 'offer' && (
              <form onSubmit={handleSubmitOffer} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">Submit Purchase Offer</h3>
                  <button type="button" onClick={() => setActiveModal(null)} className="text-xs text-slate-500">
                    Close
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Proposed Purchase Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Collection Method</label>
                    <select
                      value={offerCollection}
                      onChange={(e) => setOfferCollection(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="SHOP_PICKUP">Shop Pickup</option>
                      <option value="USER_DROPOFF">User Drop-off</option>
                      <option value="THIRD_PARTY_COLLECTION">Third-party Collection</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Proposed Collection Date</label>
                    <input
                      type="date"
                      value={offerDate}
                      onChange={(e) => setOfferDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Offer Expiry Date</label>
                  <input
                    type="date"
                    value={offerExpiry}
                    onChange={(e) => setOfferExpiry(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Message to Owner</label>
                  <textarea
                    rows={3}
                    value={offerMessage}
                    onChange={(e) => setOfferMessage(e.target.value)}
                    placeholder="Include inspection details or pickup convenience notes..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#172B4D] rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    {submitting ? 'Sending Offer...' : 'Send Purchase Offer'}
                  </button>
                </div>
              </form>
            )}

            {activeModal === 'message' && (
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">Message Device Owner</h3>
                  <button type="button" onClick={() => setActiveModal(null)} className="text-xs text-slate-500">
                    Close
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Start an authorized in-platform conversation regarding <strong>{device.title}</strong> ({device.listingCode}).
                </p>
                <textarea
                  required
                  rows={4}
                  value={directMessage}
                  onChange={(e) => setDirectMessage(e.target.value)}
                  placeholder="Ask about device condition, battery cycles, or convenient handover timings..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#137C5A] rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Sending...' : 'Send Message'}</span>
                  </button>
                </div>
              </form>
            )}

            {activeModal === 'report' && (
              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">Report Listing ({device.listingCode})</h3>
                  <button type="button" onClick={() => setActiveModal(null)} className="text-xs text-slate-500">
                    Close
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Report</label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="FRAUDULENT_LISTING">Fraudulent or Stolen Device Listing</option>
                    <option value="INCORRECT_DESCRIPTION">Misleading or Incorrect Condition Description</option>
                    <option value="UNSAFE_COLLECTION">Unsafe Battery or Hazardous Item</option>
                    <option value="HARASSMENT">Inappropriate Content or Harassment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Details *</label>
                  <textarea
                    required
                    rows={3}
                    value={reportDesc}
                    onChange={(e) => setReportDesc(e.target.value)}
                    placeholder="Provide details for our moderation team..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer"
                  >
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 4.3 HOW IT WORKS & FOR SHOPS PAGES
// ============================================================================
export const HowItWorksPage: React.FC<PublicPageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-14">
      <div className="max-w-3xl space-y-3">
        <h1 className="text-3xl font-extrabold text-slate-900">How ReCircuit Works</h1>
        <p className="text-base text-slate-600 leading-relaxed">
          ReCircuit bridges the gap between households with unused electronics and verified local repair shops,
          refurbishers, and authorized e-waste recyclers.
        </p>
      </div>

      {/* Visual Process Comparison: Users vs Shops */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-slate-200 p-7 space-y-5">
          <div className="text-xs font-semibold text-[#137C5A]">Workflow for Individual Device Owners</div>
          <h2 className="text-xl font-bold text-slate-900">From Unused Drawer Clutter to Responsible Reuse</h2>
          <ol className="space-y-4 text-sm text-slate-700">
            <li className="p-4 rounded-lg bg-[#F8FAF8] border border-slate-200/80">
              <strong className="text-slate-900 block">1. Create a Verified User Account</strong>
              Register with your city and PIN code. Your exact street address and personal phone number remain private.
            </li>
            <li className="p-4 rounded-lg bg-[#F8FAF8] border border-slate-200/80">
              <strong className="text-slate-900 block">2. Complete the 6-Step Device Registration</strong>
              Provide honest condition diagnostics (whether it powers on, screen status, battery status) and select
              Sell, Donate, Exchange, Refurbish, or Recycle Responsibly.
            </li>
            <li className="p-4 rounded-lg bg-[#F8FAF8] border border-slate-200/80">
              <strong className="text-slate-900 block">3. Review Verified Shop Offers & Requests</strong>
              Compare interest requests and purchase offers from administrator-verified shops in your city.
            </li>
            <li className="p-4 rounded-lg bg-[#F8FAF8] border border-slate-200/80">
              <strong className="text-slate-900 block">4. Wipe Data & Complete Handover</strong>
              Follow the Safe Device Handover checklist to back up and factory-reset your device before confirming collection.
            </li>
          </ol>
          <button
            type="button"
            onClick={() => onNavigate('auth', { authTab: 'register-user' })}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-[#137C5A] rounded-lg hover:bg-[#0f6347] cursor-pointer"
          >
            Register as a Device Owner
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-7 space-y-5">
          <div className="text-xs font-semibold text-[#172B4D]">Workflow for Electronics Shops & Recyclers</div>
          <h2 className="text-xl font-bold text-slate-900">Acquire Local Devices & Record Circular Outcomes</h2>
          <ol className="space-y-4 text-sm text-slate-700">
            <li className="p-4 rounded-lg bg-[#F8FAF8] border border-slate-200/80">
              <strong className="text-slate-900 block">1. Submit Business Verification Details</strong>
              Register your repair shop, refurbishment center, or authorized e-waste facility along with registration documents.
            </li>
            <li className="p-4 rounded-lg bg-[#F8FAF8] border border-slate-200/80">
              <strong className="text-slate-900 block">2. Administrator Review & Approval Badge</strong>
              Once approved by an administrator, your shop receives the Verified Partner badge and unlocks owner contact channels.
            </li>
            <li className="p-4 rounded-lg bg-[#F8FAF8] border border-slate-200/80">
              <strong className="text-slate-900 block">3. Filter Marketplace & Submit Offers</strong>
              Search by category, brand, condition, and PIN code. Express interest, negotiate offers, and message owners.
            </li>
            <li className="p-4 rounded-lg bg-[#F8FAF8] border border-slate-200/80">
              <strong className="text-slate-900 block">4. Coordinate Collection & Log Handling</strong>
              Schedule pickup or shop drop-off, confirm collection, and log whether the device was repaired, refurbished, or sent to recycling.
            </li>
          </ol>
          <button
            type="button"
            onClick={() => onNavigate('auth', { authTab: 'register-shop' })}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-[#172B4D] rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            Apply as a Partner Shop
          </button>
        </div>
      </div>

      {/* Safety Tips & FAQ */}
      <div className="bg-white rounded-xl border border-slate-200 p-7 space-y-6">
        <h2 className="text-xl font-bold text-slate-900">Frequently Asked Questions & Safety Guidelines</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-900">Are my phone number and home address visible publicly?</h3>
            <p className="text-slate-600">
              Never. Public marketplace cards show only your city, PIN code, and approximate locality (e.g., RS Puram).
              Your phone number is disclosed only to verified shops according to your chosen disclosure policy.
            </p>
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-900">Can I list broken or non-working electronics?</h3>
            <p className="text-slate-600">
              Yes. You can mark devices as Damaged, Not Working, or For Parts Only. Repair shops acquire damaged devices
              for parts recovery, while authorized e-waste recyclers collect non-working units.
            </p>
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-900">How are partner shops verified?</h3>
            <p className="text-slate-600">
              Every shop application starts in PENDING_VERIFICATION status. Administrators review business registration
              numbers and uploaded verification documents before granting marketplace contact privileges.
            </p>
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-900">What should I do before handing over my smartphone or laptop?</h3>
            <p className="text-slate-600">
              Always back up your files, sign out of cloud accounts (Google / iCloud), remove SIM and SD cards, and
              perform a full factory reset. View our{' '}
              <button
                type="button"
                onClick={() => onNavigate('safe-handover')}
                className="text-[#137C5A] font-semibold underline cursor-pointer"
              >
                Safe Device Handover Guide
              </button>{' '}
              for step-by-step instructions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 14. SAFE DEVICE HANDOVER & RESPONSIBLE E-WASTE DISPOSAL PAGE
// ============================================================================
export const SafeHandoverPage: React.FC<PublicPageProps> = ({ onNavigate }) => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const checklist = [
    'Back up important personal files, photos, and documents to cloud or external storage.',
    'Sign out of personal cloud and OEM accounts (Google Account, Apple iCloud, Samsung Account, Microsoft Account).',
    'Disable device-tracking and activation locks (Find My iPhone / Find My Device / BitLocker).',
    'Remove screen locks, biometric fingerprints, and PIN codes when handing over for testing or reuse.',
    'Remove physical SIM cards, eSIM profiles, and external microSD / memory cards.',
    'Perform a full Factory Reset using the manufacturer’s recommended settings menu.',
    'Verify after reboot that personal data and accounts have been completely erased.',
    'Confirm the verified shop identity and agreed transaction or collection terms on ReCircuit.',
    'Record the handover confirmation in your ReCircuit Transaction Timeline.',
  ];

  const toggleItem = (item: string) => {
    setCheckedItems((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
      <div className="space-y-3">
        <div className="text-xs font-semibold text-[#137C5A]">Data Privacy & Physical Safety Protocol</div>
        <h1 className="text-3xl font-extrabold text-slate-900">Safe Device Handover & Responsible E-Waste Guide</h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Before handing over any smartphone, tablet, computer, or electronic appliance to a shop or collection partner,
          follow these practical recommendations to protect your personal data and handle batteries safely.
        </p>
      </div>

      {/* Interactive Pre-Handover Checklist */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Interactive Pre-Handover Checklist</h2>
          <span className="text-xs font-mono text-slate-500">
            {Object.values(checkedItems).filter(Boolean).length} / {checklist.length} Checked
          </span>
        </div>
        <div className="space-y-2.5">
          {checklist.map((item) => (
            <label
              key={item}
              className="flex items-start gap-3 p-3 rounded-lg bg-[#F8FAF8] border border-slate-200/80 cursor-pointer hover:border-[#137C5A]/50 transition-colors text-sm text-slate-800"
            >
              <input
                type="checkbox"
                checked={Boolean(checkedItems[item])}
                onChange={() => toggleItem(item)}
                className="mt-1 rounded border-slate-300 text-[#137C5A] focus:ring-[#137C5A]"
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Laptop & Desktop Storage Media Erasure */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
          <h3 className="text-base font-bold text-slate-900">Laptops, Desktops & Storage Media Erasure</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Simply deleting files or emptying the Recycle Bin does not remove recoverable data from SSDs or hard drives.
          </p>
          <ul className="space-y-2 text-xs text-slate-700 list-disc pl-4">
            <li>
              <strong>Windows PCs:</strong> Use <em>Settings → System → Recovery → Reset this PC → Remove everything → Clean data</em>.
            </li>
            <li>
              <strong>macOS Computers:</strong> Use <em>Erase Assistant</em> (System Settings → General → Transfer or Reset → Erase All Content and Settings).
            </li>
            <li>
              <strong>Non-booting Computers:</strong> Inform the verified shop if you could not wipe the drive so Secure ATA Erase can be performed upon arrival.
            </li>
          </ul>
        </div>

        {/* Lithium-Ion & Damaged Battery Warnings */}
        <div className="bg-amber-50/90 rounded-xl border border-amber-200 p-6 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-base">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Damaged or Swollen Lithium-Ion Battery Warning</span>
          </div>
          <p className="text-sm text-amber-900/90 leading-relaxed">
            Do not attempt to dismantle devices containing built-in, swollen, leaking, or visibly damaged lithium-ion batteries yourself.
          </p>
          <ul className="space-y-2 text-xs text-amber-900 list-disc pl-4">
            <li>Never plug in, charge, puncture, or compress a swollen battery or bulging smartphone/laptop chassis.</li>
            <li>Store the device in a cool, dry, ventilated area away from flammable materials.</li>
            <li>Do not ship swollen batteries through regular courier mail; arrange direct qualified local collection.</li>
          </ul>
        </div>
      </div>

      {/* Authorized Recycling Distinction */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
        <h3 className="text-base font-bold text-slate-900">Choosing Authorized E-Waste Recyclers</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          When a device is beyond repair and intended for end-of-life material recovery, always prefer verified businesses
          registered under the <strong>Authorized e-waste recycler</strong> category. ReCircuit never labels an ordinary
          second-hand dealer as an authorized recycler unless their pollution control / e-waste authorization credentials
          have been reviewed and approved by an administrator.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => onNavigate('explore')}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#137C5A] rounded-lg cursor-pointer"
          >
            Browse Marketplace
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4.4 ABOUT US & 4.5 CONTACT / SUPPORT PAGES
// ============================================================================
export const AboutUsPage: React.FC<PublicPageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
      <div className="space-y-3">
        <div className="text-xs font-semibold text-[#137C5A]">About ReCircuit</div>
        <h1 className="text-3xl font-extrabold text-slate-900">Extending the Useful Life of Consumer Electronics</h1>
        <p className="text-base text-slate-600 leading-relaxed">
          Millions of smartphones, laptops, tablets, monitors, and small appliances sit unused in household drawers or
          enter informal waste streams because owners lack a convenient, privacy-conscious way to connect with trustworthy
          local repairers, refurbishers, and authorized recyclers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-2">
          <h2 className="text-base font-bold text-slate-900">Reuse & Repair First</h2>
          <p className="text-sm text-slate-600">
            Keeping a functional or repairable device in circulation through verified local shops reduces premature hardware disposal.
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-2">
          <h2 className="text-base font-bold text-slate-900">Verified Business Access</h2>
          <p className="text-sm text-slate-600">
            Shops undergo administrator verification before accessing owner contact channels or initiating collection requests.
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-2">
          <h2 className="text-base font-bold text-slate-900">Honest Lifecycle Tracking</h2>
          <p className="text-sm text-slate-600">
            We distinguish clearly between registered listings, collected devices, refurbished items, and verified end-of-life recycling.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900">Ready to put an unused device back into circulation?</h3>
          <p className="text-sm text-slate-600">Register your device or apply as an electronics business partner today.</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onNavigate('auth', { authTab: 'register-user' })}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#137C5A] rounded-lg cursor-pointer"
          >
            Register Device
          </button>
          <button
            type="button"
            onClick={() => onNavigate('contact')}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};

export const ContactSupportPage: React.FC = () => {
  const { user, apiFetch } = useAuth();
  const [name, setName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiFetch<{ id: number }>('/api/support', {
        method: 'POST',
        body: JSON.stringify({ name, email, subject, message }),
      });
      setSubmittedTicket(created.id);
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit support request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900">Contact & Support</h1>
        <p className="text-sm text-slate-600">
          Have a question about device registration, shop verification, or safe handover? Submit a request below—all tickets are persisted in our PostgreSQL database for administrator response.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-lg font-bold text-slate-900">Submit a Support Request</h2>

          {submittedTicket && (
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#137C5A] shrink-0" />
              <span>
                Support Request <strong>#{submittedTicket}</strong> has been saved to the database. Our support team will respond shortly.
              </span>
            </div>
          )}

          {error && <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Your Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Shop verification document question / Handover assistance"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Message *</label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe how we can help..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-[#137C5A] rounded-lg hover:bg-[#0f6347] cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'Submit Support Request'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Support FAQ</h2>
          <div className="space-y-4 text-xs text-slate-600">
            <div>
              <strong className="text-slate-900 block">How long does Shop Verification take?</strong>
              Administrators review uploaded business certificates in the Admin Console under Shop Verification.
            </div>
            <div>
              <strong className="text-slate-900 block">How do I report an inaccurate device listing or dispute?</strong>
              Open any device listing and click "Report Listing", or raise a dispute directly from your Transactions tab.
            </div>
            <div>
              <strong className="text-slate-900 block">Can I pause or remove my device listing?</strong>
              Yes. As long as a listing is not already reserved or completed in an active handover, you can pause, resume, edit, or delete it from My Devices.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
