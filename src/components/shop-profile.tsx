'use client';

import { useUser } from '@/firebase';
import { doc, getDoc, getDocs, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const profileSchema = z.object({
  profileName: z.string().min(1, 'Profile name is required'),
  phoneNumber: z.string().min(1, 'Phone number is required').max(10, 'Phone number cannot exceed 10 digits'),
  shopName: z.string().min(1, 'Shop name is required'),
  location: z.string().min(1, 'Location is required'),
  imageUrl: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ShopProfile() {
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
        profileName: '',
        phoneNumber: '',
        shopName: '',
        location: '',
        imageUrl: '',
    }
  });

  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        setLoading(true);
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          reset({
            profileName: data.profileName || '',
            phoneNumber: data.phoneNumber || '',
            shopName: data.shopName || '',
            location: data.location || '',
            imageUrl: data.imageUrl || '',
          });
        }
        setLoading(false);
      };
      fetchUserData();
    }
  }, [user, reset]);

  useEffect(() => {
    if (!user) return;

    let unsubscribeDoc: (() => void) | null = null;

    const setupListener = async () => {
      try {
        // Step 1: Find the admin user's UID by querying role == 'admin'
        const usersRef = collection(db, 'users');
        const adminQuery = query(usersRef, where('role', '==', 'admin'));
        const snapshot = await getDocs(adminQuery);

        if (snapshot.empty) {
          setLocationOptions([]);
          setLoadingLocations(false);
          return;
        }

        const adminDocId = snapshot.docs[0].id;

        // Step 2: Subscribe directly to that specific admin doc for real-time updates
        const adminDocRef = doc(db, 'users', adminDocId);
        unsubscribeDoc = onSnapshot(adminDocRef, (adminDoc) => {
          if (adminDoc.exists()) {
            setLocationOptions(adminDoc.data().locations || []);
          } else {
            setLocationOptions([]);
          }
          setLoadingLocations(false);
        }, (error) => {
          console.error('Error listening to admin locations:', error);
          setLocationOptions([]);
          setLoadingLocations(false);
        });
      } catch (error) {
        console.error('Error setting up location listener:', error);
        setLocationOptions([]);
        setLoadingLocations(false);
      }
    };

    setupListener();
    return () => { if (unsubscribeDoc) unsubscribeDoc(); };
  }, [user]);


  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You are not logged in.' });
      return;
    }
    setIsSubmitting(true);
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { ...data });
      
      toast({ title: 'Success', description: 'Profile updated successfully.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
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
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Manage Your Profile</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="shopName">Shop Name</Label>
            <Input id="shopName" {...register('shopName')} />
            {errors.shopName && <p className="text-sm text-red-500 mt-1">{errors.shopName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="profileName">Contact Person Name</Label>
            <Input id="profileName" {...register('profileName')} />
            {errors.profileName && <p className="text-sm text-red-500 mt-1">{errors.profileName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input id="phoneNumber" {...register('phoneNumber')} />
            {errors.phoneNumber && <p className="text-sm text-red-500 mt-1">{errors.phoneNumber.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Shop Location / Address</Label>
            {loadingLocations ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading location options...</span>
              </div>
            ) : (
              <select
                id="location"
                {...register('location')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a location</option>
                {locationOptions.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            )}
            {errors.location && <p className="text-sm text-red-500 mt-1">{errors.location.message}</p>}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Profile
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
