
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CreditCard } from 'lucide-react';
import { useMemo } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const statusColors: { [key: string]: string } = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Confirmed: 'bg-blue-100 text-blue-800',
  Delivered: 'bg-green-100 text-green-800',
};

const paymentStatusColors: { [key: string]: string } = {
  Pending: 'text-yellow-600',
  Paid: 'text-green-600',
};


export function OrderHistory({ orders = [], loading }: { orders: any[], loading: boolean }) {
  
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      }
      return 0;
    });
  }, [orders]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Order History</CardTitle>
      </CardHeader>
      <CardContent>
         {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : sortedOrders.length > 0 ? (
          <Accordion type="single" collapsible className="w-full space-y-4">
            {sortedOrders.map((order) => {
              const totalAmount = order.items.reduce((acc: any, item: any) => acc + (item.quantity * (item.rate || 0)), 0);
              return (
              <AccordionItem value={order.id} key={order.id} className="border-0 rounded-lg bg-white shadow-sm">
                <AccordionTrigger className="p-4 hover:no-underline rounded-lg border">
                   <div className="flex w-full items-center justify-between pr-4">
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-left w-full">
                        <div>
                            <div className="font-semibold text-gray-500">Order ID</div>
                            <div className="font-mono text-xs">{order.id.substring(0, 8)}</div>
                        </div>
                        <div>
                            <div className="font-semibold text-gray-500">Date</div>
                            <div>{order.createdAt ? new Date(order.createdAt.toMillis()).toLocaleDateString() : 'N/A'}</div>
                        </div>
                        <div>
                            <div className="font-semibold text-gray-500">Total Amount</div>
                            <div className="font-bold">{totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</div>
                        </div>
                         <div className="text-left">
                            <div className="font-semibold text-gray-500">Status</div>
                            <div>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[order.status]}`}>
                                {order.status}
                                </span>
                            </div>
                        </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 border border-t-0 rounded-b-lg bg-gray-50/50">
                    <div className='flex items-center gap-2 mb-4 text-sm'>
                        <CreditCard className="h-4 w-4" />
                        <span className="font-semibold">Payment:</span>
                        <span>{order.paymentMethod} - </span>
                        <span className={`font-bold ${paymentStatusColors[order.paymentStatus]}`}>{order.paymentStatus}</span>
                    </div>
                  <h4 className="font-semibold mb-2">Order Items</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead className="text-center">Quantity</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((item: any, index: number) => (
                        <TableRow key={`${item.id}-${index}`}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.size}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">{item.rate?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) ?? 'N/A'}</TableCell>
                          <TableCell className="text-right font-medium">{(item.quantity * (item.rate || 0)).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            )})}
          </Accordion>
        ) : (
            <p className='text-center text-muted-foreground py-10'>You have no orders yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
