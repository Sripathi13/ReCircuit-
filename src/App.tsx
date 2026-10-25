/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { Navbar, PageRoute } from './components/Navbar';
import { Footer } from './components/Footer';
import {
  LandingPage,
  ExploreDevicesPage,
  DeviceDetailsPage,
  HowItWorksPage,
  SafeHandoverPage,
  AboutUsPage,
  ContactSupportPage,
} from './components/PublicPages';
import { AuthPages } from './components/AuthPages';
import { UserDashboard } from './components/UserDashboard';
import { ShopDashboard } from './components/ShopDashboard';
import { AdminDashboard } from './components/AdminDashboard';

function ReCircuitMain() {
  const [currentPage, setCurrentPage] = useState<PageRoute>('home');
  const [selectedDeviceId, setSelectedDeviceId] = useState<number>(1);
  const [authTab, setAuthTab] = useState<string>('login');
  const [dashboardTab, setDashboardTab] = useState<string>('overview');

  const handleNavigate = (
    page: PageRoute,
    params?: { deviceId?: number; authTab?: string; dashboardTab?: string }
  ) => {
    if (params?.deviceId !== undefined) setSelectedDeviceId(params.deviceId);
    if (params?.authTab !== undefined) setAuthTab(params.authTab);
    if (params?.dashboardTab !== undefined) setDashboardTab(params.dashboardTab);
    else setDashboardTab('overview');
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF8] text-slate-900">
      <Navbar currentPage={currentPage} onNavigate={handleNavigate} />

      <div className="flex-1">
        {currentPage === 'home' && <LandingPage onNavigate={handleNavigate} />}
        {currentPage === 'explore' && <ExploreDevicesPage onNavigate={handleNavigate} />}
        {currentPage === 'device-details' && (
          <DeviceDetailsPage deviceId={selectedDeviceId} onNavigate={handleNavigate} />
        )}
        {(currentPage === 'how-it-works' || currentPage === 'for-shops') && (
          <HowItWorksPage onNavigate={handleNavigate} />
        )}
        {currentPage === 'safe-handover' && <SafeHandoverPage onNavigate={handleNavigate} />}
        {currentPage === 'about' && <AboutUsPage onNavigate={handleNavigate} />}
        {currentPage === 'contact' && <ContactSupportPage />}
        {currentPage === 'auth' && <AuthPages initialTab={authTab} onNavigate={handleNavigate} />}
        {currentPage === 'user-dashboard' && (
          <UserDashboard initialTab={dashboardTab} onNavigate={handleNavigate} />
        )}
        {currentPage === 'shop-dashboard' && (
          <ShopDashboard initialTab={dashboardTab} onNavigate={handleNavigate} />
        )}
        {currentPage === 'admin-dashboard' && <AdminDashboard onNavigate={handleNavigate} />}

        {currentPage === 'privacy' && (
          <div className="max-w-4xl mx-auto px-6 py-12 space-y-4">
            <h1 className="text-2xl font-extrabold text-slate-900">Privacy Policy</h1>
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 text-sm text-slate-700 leading-relaxed">
              <p>
                ReCircuit is designed with privacy-by-default architecture. Exact home street addresses, personal phone
                numbers, and email addresses are never published on public marketplace device cards.
              </p>
              <p>
                Only shops whose business registration credentials have been reviewed and set to{' '}
                <strong>APPROVED</strong> by a ReCircuit Administrator may initiate contact with device owners. Device
                owners control whether their phone number is revealed to verified shops or kept strictly private until a
                collection request is accepted.
              </p>
            </div>
          </div>
        )}

        {currentPage === 'terms' && (
          <div className="max-w-4xl mx-auto px-6 py-12 space-y-4">
            <h1 className="text-2xl font-extrabold text-slate-900">Terms and Conditions</h1>
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 text-sm text-slate-700 leading-relaxed">
              <p>
                1. <strong>Ownership & Accurate Descriptions:</strong> Users registering devices must have the legal
                right to transfer the equipment and must provide honest functional and physical damage descriptions.
              </p>
              <p>
                2. <strong>Data Erasure Responsibility:</strong> Device owners are responsible for backing up and
                performing a factory reset on personal storage media prior to physical handover.
              </p>
              <p>
                3. <strong>Partner Shop Verification:</strong> Electronics shops, refurbishers, and e-waste recyclers
                must maintain accurate registration documentation and record truthful post-acquisition handling outcomes.
              </p>
            </div>
          </div>
        )}
      </div>

      <Footer onNavigate={handleNavigate} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ReCircuitMain />
    </AuthProvider>
  );
}
