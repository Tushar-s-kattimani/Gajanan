'use client';

import { useUser } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

export function AdminSettings() {
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState('');

  useEffect(() => {
    if (user) {
      const fetchSettings = async () => {
        setLoading(true);
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setLocations(data.locations || []);
          }
        } catch (error) {
          console.error('Error fetching admin settings:', error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load settings.' });
        } finally {
          setLoading(false);
        }
      };
      fetchSettings();
    }
  }, [user, toast]);

  const handleAddLocation = () => {
    const val = newLocation.trim();
    if (val && !locations.includes(val)) {
      setLocations([...locations, val]);
      setNewLocation('');
    }
  };

  const handleRemoveLocation = (locToRemove: string) => {
    setLocations(locations.filter(l => l !== locToRemove));
  };

  const handleSave = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You are not logged in.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { locations });
      toast({ title: 'Success', description: 'Locations updated successfully.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to update: ${error.message}` });
      console.error('Error updating settings:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCleanupDuplicates = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const { collection, getDocs, deleteDoc } = await import('firebase/firestore');
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      const duplicatesToDelete: string[] = [];
      const ordersByShop: Record<string, any[]> = {};
      
      orders.forEach(order => {
        if (!ordersByShop[order.shopId]) ordersByShop[order.shopId] = [];
        ordersByShop[order.shopId].push(order);
      });
      
      for (const shopId in ordersByShop) {
        const shopOrders = ordersByShop[shopId];
        shopOrders.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
        
        for (let i = 1; i < shopOrders.length; i++) {
          const prev = shopOrders[i-1];
          const curr = shopOrders[i];
          
          const timeDiff = Math.abs((curr.createdAt?.toMillis() || 0) - (prev.createdAt?.toMillis() || 0));
          
          if (timeDiff < 10000 && curr.status === prev.status) { // within 10 seconds
             const prevItemsStr = JSON.stringify(prev.items?.map((i: any) => ({id: i.id, q: i.quantity})));
             const currItemsStr = JSON.stringify(curr.items?.map((i: any) => ({id: i.id, q: i.quantity})));
             if (prevItemsStr === currItemsStr) {
                // it's a duplicate, mark the current one for deletion
                duplicatesToDelete.push(curr.id);
                // Also skip the next comparison for the deleted one by replacing curr with prev in the array 
                // so we don't accidentally keep comparing a deleted one if there are 3 duplicates
                shopOrders[i] = prev;
             }
          }
        }
      }
      
      for (const id of duplicatesToDelete) {
         await deleteDoc(doc(db, 'orders', id));
      }
      
      toast({ title: 'Cleanup Complete', description: `Removed ${duplicatesToDelete.length} duplicate orders.` });
      
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      console.error('Error cleaning duplicates:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Configure Shop Locations</CardTitle>
          <CardDescription>Add or remove locations available for shops to select in their profile settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="Enter location name (e.g., Sector 5)"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddLocation();
                }
              }}
            />
            <Button type="button" onClick={handleAddLocation}>Add</Button>
          </div>

          {locations.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 border rounded-md p-3 bg-gray-50/50">
              {locations.map((loc, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border text-sm">
                  <span className="font-medium">{loc}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 h-8 px-2"
                    onClick={() => handleRemoveLocation(loc)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No locations configured yet.</p>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Locations
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Maintenance</CardTitle>
          <CardDescription>Advanced tools for maintaining the system data.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="flex flex-col gap-2">
             <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Clean up duplicate orders</Label>
                  <p className="text-sm text-muted-foreground">Scans all orders and removes accidental duplicate submissions made within a short timeframe.</p>
                </div>
                <Button onClick={handleCleanupDuplicates} disabled={isSubmitting} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Run Cleanup
                </Button>
             </div>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
