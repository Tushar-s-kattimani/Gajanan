'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, User as UserIcon, MessageSquare } from 'lucide-react';
import Image from 'next/image';

export function ShopManagement({ users = [], loading }: { users: any[], loading: boolean }) {
  const [locationFilter, setLocationFilter] = useState<string>('all');

  const uniqueLocations = useMemo(() => {
    const locations = users
      .filter((user) => user.role === 'shop' && user.location)
      .map((user) => user.location);
    return Array.from(new Set(locations)) as string[];
  }, [users]);

  const shopUsers = users.filter(user => {
    if (user.role !== 'shop') return false;
    if (locationFilter && locationFilter !== 'all') {
      return user.location?.toLowerCase() === locationFilter.toLowerCase();
    }
    return true;
  });

  const allPhoneNumbers = shopUsers
    .filter(user => user.phoneNumber)
    .map(user => user.phoneNumber)
    .join(',');

  const smsMessage = "Hi from GAJANAN ENTERPRISES (PEPSI DISTRIBUTOR), GHATAPRABHA! 🥤 If you have any new orders, please send the orders in the app only! 📱📦🚚";

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0 pb-4">
        <CardTitle>Shop Management</CardTitle>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
          {allPhoneNumbers && (
            <a href={`sms:${allPhoneNumbers}?body=${encodeURIComponent(smsMessage)}`}>
              <Button variant="default" size="sm" title="Send SMS to All Filtered Shops">
                <MessageSquare className="h-4 w-4 mr-2" />
                SMS All
              </Button>
            </a>
          )}
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {uniqueLocations.map((loc) => (
                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Avatar</TableHead>
                <TableHead>Shop Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Shop Email</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shopUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="relative h-10 w-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                        {user.imageUrl ? (
                            <Image src={user.imageUrl} alt={user.shopName || 'Shop avatar'} layout="fill" objectFit="cover" />
                        ) : (
                            <UserIcon className="h-6 w-6 text-gray-400" />
                        )}
                    </div>
                  </TableCell>
                  <TableCell>{user.shopName || 'N/A'}</TableCell>
                  <TableCell>{user.profileName || 'N/A'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phoneNumber || 'N/A'}</TableCell>
                  <TableCell>{user.location || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
