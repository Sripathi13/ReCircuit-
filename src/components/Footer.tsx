import React from 'react';
import { PageRoute } from './Navbar';

interface FooterProps {
  onNavigate: (page: PageRoute, params?: { authTab?: string }) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#172B4D] text-slate-300 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="space-y-3">
          <div className="text-xl font-extrabold tracking-tight text-white">ReCircuit</div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Give Your Electronics a Second Life. Connecting individual device owners with verified local repair shops,
            refurbishers, and authorized e-waste recyclers.
          </p>
        </div>

        <div className="space-y-2.5 text-sm">
          <div className="font-semibold text-white">Platform</div>
          <ul className="space-y-2 text-slate-400">
            <li>
              <button type="button" onClick={() => onNavigate('explore')} className="hover:text-white cursor-pointer">
                Explore Available Devices
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('how-it-works')}
                className="hover:text-white cursor-pointer"
              >
                How It Works
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('for-shops')} className="hover:text-white cursor-pointer">
                For Electronics Shops
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('auth', { authTab: 'register-shop' })}
                className="hover:text-white cursor-pointer"
              >
                Partner Shop Registration
              </button>
            </li>
          </ul>
        </div>

        <div className="space-y-2.5 text-sm">
          <div className="font-semibold text-white">Safety & E-Waste Guidance</div>
          <ul className="space-y-2 text-slate-400">
            <li>
              <button
                type="button"
                onClick={() => onNavigate('safe-handover')}
                className="hover:text-white cursor-pointer"
              >
                Responsible E-Waste Disposal
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('safe-handover')}
                className="hover:text-white cursor-pointer"
              >
                Safe Device Handover Checklist
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('about')} className="hover:text-white cursor-pointer">
                About ReCircuit
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('contact')} className="hover:text-white cursor-pointer">
                Frequently Asked Questions
              </button>
            </li>
          </ul>
        </div>

        <div className="space-y-2.5 text-sm">
          <div className="font-semibold text-white">Support & Governance</div>
          <ul className="space-y-2 text-slate-400">
            <li>
              <button type="button" onClick={() => onNavigate('contact')} className="hover:text-white cursor-pointer">
                Contact & Support
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('contact')} className="hover:text-white cursor-pointer">
                Report a Problem
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('privacy')} className="hover:text-white cursor-pointer">
                Privacy Policy
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('terms')} className="hover:text-white cursor-pointer">
                Terms and Conditions
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800/80 px-6 py-5 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} ReCircuit Marketplace. Every unused electronic device is an opportunity for reuse or safe recovery.</p>
          <p>Privacy-First Locality Matching · Verified Shop Access Control</p>
        </div>
      </div>
    </footer>
  );
};
