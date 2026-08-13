'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AdminDashboard } from '@/components/admin-dashboard';
import { ShopDashboard } from '@/components/shop-dashboard';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading, role, status } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !role) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-gray-700 dark:text-gray-300">Authenticating and fetching role...</p>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="flex flex-col items-center gap-6 text-center max-w-md bg-white dark:bg-gray-800 p-8 rounded-xl shadow-xl">
           <div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
             <Loader2 className="h-10 w-10 animate-spin" />
           </div>
           <h2 className="text-2xl font-bold">Account Pending Approval</h2>
           <p className="text-muted-foreground">Your account has been created and is waiting for administrator approval. Once approved, you will automatically be granted access.</p>
        </div>
      </div>
    );
  }

  if (role === 'admin') {
    return <AdminDashboard />;
  }

  if (role === 'shop') {
    return <ShopDashboard />;
  }

  // This is a fallback that should ideally not be reached if roles are assigned correctly
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900">
       <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-gray-700 dark:text-gray-300">Verifying user role...</p>
        </div>
    </div>
  );
}
