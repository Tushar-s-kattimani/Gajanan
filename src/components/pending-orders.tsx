'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock } from 'lucide-react';

export function PendingOrders({ orders = [], users = [] }: { orders: any[], users: any[] }) {
  const usersMap = useMemo(() => {
    const map = new Map();
    users.forEach(user => map.set(user.id, user));
    return map;
  }, [users]);

  const pendingOrders = useMemo(() => {
    return orders
      .filter(order => order.status === 'Pending')
      .map(order => ({
        ...order,
        shopInfo: usersMap.get(order.shopId) || { shopName: 'Unknown Shop' }
      }))
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }, [orders, usersMap]);

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Recent Pending Orders</CardTitle>
      </CardHeader>
      <CardContent>
        {pendingOrders.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingOrders.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.shopInfo.shopName}</TableCell>
                  <TableCell>{order.createdAt.toDate().toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1.5 animate-blink text-red-600 font-bold">
                        <Clock className="h-4 w-4" />
                        Pending
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center text-gray-500 py-4">No pending orders.</p>
        )}
      </CardContent>
    </Card>
  );
}
