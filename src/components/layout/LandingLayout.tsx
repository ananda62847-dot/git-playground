import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/layout/MobileBottomNav';

/**
 * Persistent app shell for citizen-facing routes.
 * Header, Footer and MobileBottomNav mount ONCE and stay mounted across
 * client-side navigations (no re-render on route change).
 */
const LandingLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Header />
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default LandingLayout;
