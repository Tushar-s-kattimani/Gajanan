'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { BarChart, Package, Users, ShoppingCart, History, Home, User, Banknote, Calendar, ClipboardList, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PepsiBottleLogo } from './pepsi-logo';
import { useUser } from '@/firebase';


interface MobileSidebarProps {
  role: 'admin' | 'shop';
  activeSection: string;
  setActiveSection: (section: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const navItems = {
  admin: [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart },
    { id: 'products', name: 'Products', icon: Package },
    { id: 'orders', name: 'All Orders', icon: ShoppingCart },
    { id: 'shops', name: 'Shops', icon: Users },
    { id: 'shop-revenue', name: 'Shop Revenue', icon: Banknote },
    { id: 'stock-report', name: 'Stock Report', icon: ClipboardList },
    { id: 'settings', name: 'Settings', icon: Settings },
  ],
  shop: [
    { id: 'new_order', name: 'New Order', icon: Home },
    { id: 'order_history', name: 'My Orders', icon: History },
    { id: 'profile', name: 'Profile', icon: User },
  ],
};

export function MobileSidebar({ role, activeSection, setActiveSection, isOpen, setIsOpen }: MobileSidebarProps) {
  const items = navItems[role];
  const { signOut } = useUser();

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="left" className="p-0 w-64 bg-white">
        <div className="flex h-full flex-col">
          <SheetHeader className='p-4'>
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <div className="flex items-center gap-4 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-200 p-4 shadow-md">
                <div className="h-10 w-10 flex-shrink-0">
                <PepsiBottleLogo />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-base font-bold text-gray-800 text-shadow-md leading-tight">
                    Gajanan Enterprises
                  </h1>
                  {role === 'shop' && (
                    <span className="text-lg font-black text-indigo-700 tracking-widest drop-shadow-sm uppercase mt-0.5">
                      Ghataprabha
                    </span>
                  )}
                </div>
            </div>
          </SheetHeader>
          <nav className="flex-1 space-y-2 p-4">
            {items.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={`w-full justify-start items-center gap-3 text-base h-12 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg
                    ${isActive
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md font-bold'
                      : 'font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                  onClick={() => handleSectionClick(item.id)}
                >
                  <item.icon className={cn('h-5 w-5 transition-colors', isActive ? 'text-white' : '')} />
                  {item.name}
                </Button>
              );
            })}
          </nav>
          <div className="p-4 border-t mt-auto">
            <Button onClick={() => { setIsOpen(false); signOut(); }} variant="outline" className="w-full justify-start items-center gap-3 text-base h-12 px-4 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50">
              <LogOut className="h-5 w-5" />
              Logout
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
