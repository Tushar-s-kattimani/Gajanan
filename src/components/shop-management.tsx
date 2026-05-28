'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, User as UserIcon } from 'lucide-react';
import Image from 'next/image';

export function ShopManagement({ users = [], loading }: { users: any[], loading: boolean }) {
  const shopUsers = users.filter(user => user.role === 'shop');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shop Management</CardTitle>
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
                <TableHead>Date Joined</TableHead>
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
                  <TableCell>{user.createdAt ? new Date(user.createdAt.toMillis()).toLocaleDateString() : 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
