'use client';

import { useUser } from '@/firebase';
import { collection, doc, getDoc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db, storage } from '@/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, User as UserIcon } from 'lucide-react';
import Image from 'next/image';

const profileSchema = z.object({
  profileName: z.string().min(1, 'Profile name is required'),
  phoneNumber: z.string().min(1, 'Phone number is required').max(10, 'Phone number cannot exceed 10 digits'),
  shopName: z.string().min(1, 'Shop name is required'),
  location: z.string().min(1, 'Location is required'),
  imageUrl: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const DEFAULT_LOCATIONS = [
  "Sector 1",
  "Sector 2",
  "Sector 3",
  "Sector 4",
  "Sector 5"
];

export function ShopProfile() {
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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

  const currentImageUrl = watch('imageUrl');

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
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where("role", "==", "admin"));
    
    console.log("Listening to admin locations in real-time...");
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let foundLocations: string[] = [];
      if (!querySnapshot.empty) {
        for (const doc of querySnapshot.docs) {
          const adminData = doc.data();
          if (adminData.locations && Array.isArray(adminData.locations) && adminData.locations.length > 0) {
            foundLocations = adminData.locations;
            break;
          }
        }
      }
      if (foundLocations.length > 0) {
        console.log("Real-time locations loaded from admin settings:", foundLocations);
        setLocationOptions(foundLocations);
      } else {
        console.log("No locations found in admin settings. Using defaults:", DEFAULT_LOCATIONS);
        setLocationOptions(DEFAULT_LOCATIONS);
      }
      setLoadingLocations(false);
    }, (error) => {
      console.error("Error listening to locations:", error);
      setLocationOptions(DEFAULT_LOCATIONS);
      setLoadingLocations(false);
    });

    return () => unsubscribe();
  }, []);

  const currentLocation = watch('location');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(null);
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  };
  

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You are not logged in.' });
      return;
    }
    setIsSubmitting(true);
    let finalImageUrl = currentImageUrl || '';
    
    try {
      if (imageFile) {
        finalImageUrl = await uploadFile(imageFile, `user-profiles/${user.uid}/${imageFile.name}`);
      }
      
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { ...data, imageUrl: finalImageUrl });
      
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
            <Label htmlFor="image">Profile Picture</Label>
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border">
                {imagePreview || currentImageUrl ? (
                    <Image src={imagePreview || currentImageUrl!} alt="Profile Avatar" layout="fill" objectFit="cover" />
                ) : (
                    <UserIcon className="h-10 w-10 text-gray-400" />
                )}
              </div>
              <Input id="image" type="file" onChange={handleImageChange} accept="image/*" className="max-w-xs" />
            </div>
          </div>
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
                {(() => {
                  const showLocationOptions = [...locationOptions];
                  if (currentLocation && !showLocationOptions.includes(currentLocation)) {
                    showLocationOptions.unshift(currentLocation);
                  }
                  return showLocationOptions.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ));
                })()}
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
