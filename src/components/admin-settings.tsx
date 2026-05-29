'use client';

import { useUser } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const upiIdRegex = new RegExp(/^[\w.-]+@[\w.-]+$/);

const settingsSchema = z.object({
  upiId: z.string().refine(val => val === '' || upiIdRegex.test(val), {
    message: 'Please enter a valid UPI ID (e.g., your-name@oksbi) or leave it blank.',
  }),
  profileName: z.string().min(1, "Admin name is required"),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export function AdminSettings() {
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      upiId: '',
      profileName: '',
    }
  });

  useEffect(() => {
    if (user) {
      const fetchSettings = async () => {
        setLoading(true);
        const userDocRef = doc(db, 'users', user.uid);
        try {
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const data = userDoc.data();
              reset({
                upiId: data.upiId || '',
                profileName: data.profileName || '',
              });
              setLocations(data.locations || []);
            }
        } catch (error) {
            console.error("Error fetching admin settings:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load settings. Please check console for details.' });
        } finally {
            setLoading(false);
        }
      };
      fetchSettings();
    }
  }, [user, reset, toast]);

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

  const onSubmit = async (data: SettingsFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You are not logged in.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { 
        upiId: data.upiId || '',
        profileName: data.profileName,
        locations: locations,
      });
      toast({ title: 'Success', description: 'Settings updated successfully.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to update settings: ${error.message}` });
      console.error("Error updating settings:", error);
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
        <CardTitle>Admin Settings</CardTitle>
        <CardDescription>Manage your profile and payment information.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
           <div className="space-y-2">
            <Label htmlFor="profileName">Admin Name</Label>
            <Input id="profileName" {...register('profileName')} placeholder="Your Name" />
            {errors.profileName && <p className="text-sm text-red-500 mt-1">{errors.profileName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="upiId">Your UPI ID</Label>
            <Input id="upiId" {...register('upiId')} placeholder="your-name@oksbi" />
            {errors.upiId && <p className="text-sm text-red-500 mt-1">{errors.upiId.message}</p>}
            <p className="text-xs text-muted-foreground pt-1">Set your UPI ID here to accept online payments. Leave it blank to disable.</p>
          </div>
          
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-1">
              <Label className="text-base font-semibold">Configure Shop Locations</Label>
              <p className="text-xs text-muted-foreground">Add locations here. These will be available as options for shops in their profile settings.</p>
            </div>
            
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
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2 border rounded-md p-3 bg-gray-50/50">
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
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
