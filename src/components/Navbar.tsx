import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export type PageRoute =
  | 'home'
  | 'explore'
  | 'device-details'
  | 'how-it-works'
  | 'for-shops'
  | 'about'
  | 'contact'
  | 'safe-handover'
  | 'privacy'
  | 'terms'
  | 'auth'
  | 'user-dashboard'
  | 'shop-dashboard'
  | 'admin-dashboard';

interface NavbarProps {
  currentPage: PageRoute;
  onNavigate: (page: PageRoute, params?: { deviceId?: number; authTab?: string; dashboardTab?: string }) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const { user, logout, loginWithEmail } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);

  const handleDashboardRedirect = () => {
    if (!user) {
      onNavigate('auth', { authTab: 'login' });
      return;
    }
    if (user.role === 'ADMIN') onNavigate('admin-dashboard');
    else if (user.role === 'SHOP') onNavigate('shop-dashboard');
    else onNavigate('user-dashboard');
  };

  const handleRegisterDeviceClick = () => {
    if (!user) {
      onNavigate('auth', { authTab: 'register-user' });
      return;
    }
    if (user.role === 'USER') {
      onNavigate('user-dashboard', { dashboardTab: 'register-device' });
    } else {
      handleDashboardRedirect();
    }
  };

  const handleQuickDemoSwitch = async (email: string, targetPage: PageRoute) => {
    try {
      setSwitchingRole(true);
      await loginWithEmail(email, undefined, true);
      onNavigate(targetPage);
    } catch (err) {
      console.error('Demo switch failed:', err);
    } finally {
      setSwitchingRole(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between gap-8 px-6 py-4 bg-white/95 backdrop-blur border-b border-slate-200">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="text-xl font-extrabold tracking-tight text-[#137C5A] whitespace-nowrap shrink-0 cursor-pointer text-left"
        >
          ReCircuit
        </button>

        {/* Zone 2: 5 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => onNavigate('explore')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentPage === 'explore' ? 'text-[#137C5A] font-semibold underline underline-offset-8' : ''
            }`}
          >
            Explore Devices
          </button>
          <button
            type="button"
            onClick={() => onNavigate('how-it-works')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentPage === 'how-it-works' ? 'text-[#137C5A] font-semibold underline underline-offset-8' : ''
            }`}
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => onNavigate('for-shops')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentPage === 'for-shops' ? 'text-[#137C5A] font-semibold underline underline-offset-8' : ''
            }`}
          >
            For Shops
          </button>
          <button
            type="button"
            onClick={() => onNavigate('about')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentPage === 'about' ? 'text-[#137C5A] font-semibold underline underline-offset-8' : ''
            }`}
          >
            About Us
          </button>
          {user ? (
            <button
              type="button"
              onClick={handleDashboardRedirect}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                ['user-dashboard', 'shop-dashboard', 'admin-dashboard'].includes(currentPage)
                  ? 'text-[#137C5A] font-semibold underline underline-offset-8'
                  : ''
              }`}
            >
              Dashboard
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('auth', { authTab: 'login' })}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentPage === 'auth' ? 'text-[#137C5A] font-semibold underline underline-offset-8' : ''
              }`}
            >
              Sign In
            </button>
          )}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleRegisterDeviceClick}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#137C5A] rounded-lg hover:bg-[#0f6347] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Register a Device
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Menu"
            className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Secondary Contextual Workspace / Demo Role Bar */}
      <div className="bg-[#172B4D] text-slate-200 px-6 py-2 text-xs border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400">Quick Evaluation Role Switch:</span>
            <button
              type="button"
              disabled={switchingRole}
              onClick={() => handleQuickDemoSwitch('arjun.nair@demo.recircuit.org', 'user-dashboard')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                user?.email === 'arjun.nair@demo.recircuit.org'
                  ? 'bg-[#137C5A] text-white font-semibold'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              User (Arjun)
            </button>
            <button
              type="button"
              disabled={switchingRole}
              onClick={() => handleQuickDemoSwitch('priya@covaimobilecare.demo.recircuit.org', 'shop-dashboard')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                user?.email === 'priya@covaimobilecare.demo.recircuit.org'
                  ? 'bg-[#137C5A] text-white font-semibold'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Verified Mobile Shop
            </button>
            <button
              type="button"
              disabled={switchingRole}
              onClick={() => handleQuickDemoSwitch('compliance@ecocircuitrecycle.demo.recircuit.org', 'shop-dashboard')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                user?.email === 'compliance@ecocircuitrecycle.demo.recircuit.org'
                  ? 'bg-[#137C5A] text-white font-semibold'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Authorized E-Waste Recycler
            </button>
            <button
              type="button"
              disabled={switchingRole}
              onClick={() => handleQuickDemoSwitch('rahul@metrodevices.demo.recircuit.org', 'shop-dashboard')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                user?.email === 'rahul@metrodevices.demo.recircuit.org'
                  ? 'bg-[#137C5A] text-white font-semibold'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Pending Shop
            </button>
            <button
              type="button"
              disabled={switchingRole}
              onClick={() => handleQuickDemoSwitch('admin@recircuit.org', 'admin-dashboard')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                user?.email === 'admin@recircuit.org'
                  ? 'bg-[#137C5A] text-white font-semibold'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Platform Admin
            </button>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-slate-300">
                  Signed in as <strong className="text-white">{user.fullName}</strong> ({user.role})
                </span>
                <button
                  type="button"
                  onClick={handleDashboardRedirect}
                  className="text-[#A3E635] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Open {user.role === 'ADMIN' ? 'Admin' : user.role === 'SHOP' ? 'Shop' : 'User'} Console
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    onNavigate('home');
                  }}
                  className="text-slate-400 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <span className="text-slate-400">
                Browsing as Guest ·{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('auth', { authTab: 'login' })}
                  className="text-[#A3E635] hover:underline cursor-pointer"
                >
                  Sign in or register
                </button>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-6 py-4 space-y-3">
          <div className="flex flex-col space-y-2 text-sm font-medium text-slate-700">
            <button
              type="button"
              onClick={() => {
                onNavigate('home');
                setMobileMenuOpen(false);
              }}
              className="py-2 text-left hover:text-[#137C5A]"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => {
                onNavigate('explore');
                setMobileMenuOpen(false);
              }}
              className="py-2 text-left hover:text-[#137C5A]"
            >
              Explore Devices
            </button>
            <button
              type="button"
              onClick={() => {
                onNavigate('how-it-works');
                setMobileMenuOpen(false);
              }}
              className="py-2 text-left hover:text-[#137C5A]"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => {
                onNavigate('for-shops');
                setMobileMenuOpen(false);
              }}
              className="py-2 text-left hover:text-[#137C5A]"
            >
              For Shops
            </button>
            <button
              type="button"
              onClick={() => {
                onNavigate('about');
                setMobileMenuOpen(false);
              }}
              className="py-2 text-left hover:text-[#137C5A]"
            >
              About Us
            </button>
            <button
              type="button"
              onClick={() => {
                onNavigate('contact');
                setMobileMenuOpen(false);
              }}
              className="py-2 text-left hover:text-[#137C5A]"
            >
              Contact & Support
            </button>
            {user ? (
              <button
                type="button"
                onClick={() => {
                  handleDashboardRedirect();
                  setMobileMenuOpen(false);
                }}
                className="py-2 text-left font-semibold text-[#137C5A]"
              >
                Open Dashboard ({user.role})
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onNavigate('auth', { authTab: 'login' });
                  setMobileMenuOpen(false);
                }}
                className="py-2 text-left font-semibold text-[#137C5A]"
              >
                Sign In / Create Account
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
