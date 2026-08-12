'use client';

import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { ShoppingCart, LogOut, Menu, Loader2, Truck, Search } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/use-toast';
import { collection, serverTimestamp, doc, query, where, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useState } from 'react';

export function Header({ onMenuClick, searchQuery, setSearchQuery }: { onMenuClick?: () => void, searchQuery?: string, setSearchQuery?: (q: string) => void }) {
  const { user, signOut, role } = useUser();
  const { cart, updateQuantity, clearCart } = useCart();
  const { toast } = useToast();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const cartItems = cart;
  const cartTotal = cart.reduce((sum, item) => sum + item.quantity * item.rate, 0);

  const checkUserProfile = async () => {
    if (!user) return false;
    const userDocRef = doc(db, 'users', user.uid);
    try {
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (!userData.profileName || !userData.phoneNumber || !userData.shopName || !userData.location) {
          toast({
            variant: 'destructive',
            title: 'Incomplete Profile',
            description: 'Please complete your profile information in the Profile section before placing an order.',
            duration: 5000,
          });
          return false;
        }
        return true;
      }
      // This will be caught by the catch block below
      throw new Error('User data not found.');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `Could not verify user profile: ${error.message}` });
      return false;
    }
  };

  const placeOrder = async () => {
    if (isPlacingOrder) return;
    setIsPlacingOrder(true);

    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to place an order.' });
      setIsPlacingOrder(false);
      return;
    }

    const isProfileComplete = await checkUserProfile();
    if (!isProfileComplete) {
      setIsPlacingOrder(false);
      return;
    }
    
    const newOrderRef = doc(collection(db, 'orders'));
    const orderPayload = {
      shopId: user.uid,
      shopEmail: user.email,
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        size: item.size,
        quantity: item.quantity,
        rate: item.rate,
      })),
      status: 'Pending',
      createdAt: serverTimestamp(),
      paymentMethod: 'Cash on Delivery',
      paymentStatus: 'Pending',
    };

    try {
      await runTransaction(db, async (transaction) => {
        // Stock check
        for (const item of cart) {
          const productRef = doc(db, 'products', item.id);
          const productSnap = await transaction.get(productRef);
          if (!productSnap.exists() || (productSnap.data()?.stock ?? 0) < item.quantity) {
            throw new Error(`Insufficient stock for ${item.name}. Only ${productSnap.data()?.stock ?? 0} left.`);
          }
        }
        
        // Update stock
        for (const item of cart) {
          const productRef = doc(db, 'products', item.id);
          transaction.update(productRef, { stock: item.stock - item.quantity });
        }
  
        // Create order
        transaction.set(newOrderRef, orderPayload);
      });

      toast({ title: 'Success', description: 'Order placed successfully!' });
      clearCart();
      
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Order Failed',
            description: error.message,
            duration: 5000,
        });
        console.error("Transaction failed: ", error);
    } finally {
        setIsPlacingOrder(false);
    }
  };



  return (
    <>
    <header className="flex h-20 shrink-0 items-center justify-between border-b bg-white px-4 sm:px-6 md:px-10 no-print">
      <div className="flex items-center gap-4 overflow-hidden">
        <Button
          variant="outline"
          size="icon"
          className="md:hidden flex-shrink-0"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
         <div className="overflow-hidden">
             <div className="flex flex-col md:flex-row md:items-baseline md:gap-2">
               <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-700 text-shadow-md leading-tight truncate">
                  {role === 'admin' ? 'Admin Console' : 'Gajanan Enterprises'}
               </h1>
               {role === 'shop' && (
                  <span className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-700 text-shadow-md leading-tight mt-0.5 md:mt-0">
                    Ghataprabha
                  </span>
               )}
             </div>
            <p className="text-sm text-gray-500 mt-1 truncate hidden sm:block">
                Welcome, <span className="font-semibold">{user?.email}</span>
            </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 justify-end flex-1 ml-2 sm:ml-4">
        {setSearchQuery && role === 'shop' && (
          <div className="relative flex-1 max-w-[110px] sm:max-w-[250px] lg:max-w-md transition-all">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full pl-7 sm:pl-9 h-8 sm:h-10 bg-gray-50 border-gray-200 focus-visible:ring-[#2874f0] rounded-full shadow-sm text-xs sm:text-sm"
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
        {role === 'shop' && (
          <Sheet>
            <SheetTrigger asChild>
              <Button className="relative flex-shrink-0 h-14 w-14 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all rounded-xl hover:scale-105 border-0">
                <ShoppingCart className="h-7 w-7" />
                {cartItems.length > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#fb641b] text-xs font-bold text-white shadow-md border-2 border-white">
                    {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col sm:max-w-lg">
              <SheetHeader>
                <SheetTitle className="text-2xl font-bold">Your Cart</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto pr-4">
                {cartItems.length > 0 ? (
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 mb-2 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                          {item.imageUrl && (
                            <div className="w-12 h-12 bg-white rounded-md flex items-center justify-center border border-gray-200 overflow-hidden flex-shrink-0">
                               <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-1" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900 line-clamp-1">{item.name} ({item.size})</p>
                             <p className="text-sm text-gray-500 font-medium">{item.quantity} units &times; {item.rate.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-white rounded-md border border-gray-200 p-0.5 shadow-sm">
                          <Button size="icon" variant="ghost" className="h-6 w-6 rounded-sm text-gray-500 hover:text-gray-900" onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</Button>
                          <span className="w-5 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6 rounded-sm text-gray-500 hover:text-gray-900" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-8 text-center text-gray-500">Your cart is empty.</p>
                )}
              </div>
              {cartItems.length > 0 && (
                <SheetFooter className="mt-auto border-t pt-4">
                  <div className="w-full space-y-4">
                     <div className="flex justify-between items-center text-xl font-black text-gray-900 bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                      <span>Total Amount</span>
                      <span className="text-blue-700">{cartTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                    </div>
                    <div className="space-y-3">
                      <Button className="w-full h-14 text-lg font-bold bg-[#fb641b] hover:bg-[#e05615] text-white shadow-lg transition-all rounded-xl border border-[#fb641b]" onClick={() => placeOrder()} disabled={isPlacingOrder}>
                          {isPlacingOrder ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Truck className="mr-2 h-5 w-5" />}
                          Place Order (Cash on Delivery)
                      </Button>
                      <Button variant="ghost" className="w-full h-10 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" onClick={clearCart}>Clear Cart</Button>
                    </div>
                  </div>
                </SheetFooter>
              )}
            </SheetContent>
          </Sheet>
        )}
      </div>
    </header>
    </>
  );
}
