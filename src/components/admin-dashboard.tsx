'use client';

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { AdminOverview } from '@/components/admin-overview';
import { ProductManagement } from '@/components/product-management';
import { AllOrders } from '@/components/all-orders';
import { ShopManagement } from '@/components/shop-management';
import { ShopRevenue } from '@/components/shop-revenue';
import { StockReport } from '@/components/stock-report';
import { query, collection, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { MobileSidebar } from './mobile-sidebar';
import { AdminSettings } from './admin-settings';

export function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const ordersQuery = useMemo(() => query(collection(db, 'orders'), orderBy('createdAt', 'desc')), []);
  
  const { data: orders, loading: ordersLoading } = useCollection(ordersQuery);
  const { data: products, loading: productsLoading } = useCollection('products');
  const { data: users, loading: usersLoading } = useCollection('users');

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <AdminOverview orders={orders || []} products={products || []} users={users || []} loading={ordersLoading || productsLoading || usersLoading} />;
      case 'products':
        return <ProductManagement />;
      case 'orders':
        return <AllOrders orders={orders || []} users={users || []} loading={ordersLoading || usersLoading} />;
       case 'shops':
        return <ShopManagement users={users || []} loading={usersLoading} />;
      case 'shop-revenue':
        return <ShopRevenue orders={orders || []} users={users || []} loading={ordersLoading || usersLoading} />;
      case 'stock-report':
        return <StockReport products={products || []} loading={productsLoading} />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <AdminOverview orders={orders || []} products={products || []} users={users || []} loading={ordersLoading || productsLoading || usersLoading} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar role="admin" activeSection={activeSection} setActiveSection={setActiveSection} />
       <MobileSidebar
        role="admin"
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isOpen={mobileMenuOpen}
        setIsOpen={setMobileMenuOpen}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 printable-area">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
