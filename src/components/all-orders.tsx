'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, User, Download, Calendar, Clock, Info, Filter, Phone, CreditCard } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const statusColors: { [key: string]: string } = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Confirmed: 'bg-blue-100 text-blue-800',
  Delivered: 'bg-green-100 text-green-800',
};

const paymentStatusColors: { [key: string]: string } = {
  Pending: 'text-yellow-600',
  Paid: 'text-green-600',
};

export function AllOrders({ orders: initialOrders = [], users = [], loading }: { orders: any[], users: any[], loading: boolean }) {
  const { toast } = useToast();
  const [orders, setOrders] = useState(initialOrders);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pending'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  const locations = useMemo(() => {
    const adminUser = users.find(u => u.role === 'admin');
    if (adminUser && adminUser.locations && Array.isArray(adminUser.locations)) {
      return adminUser.locations.filter(Boolean);
    }
    const locSet = new Set<string>();
    users.forEach(u => {
      if (u.role === 'shop' && u.location) {
        locSet.add(u.location.trim());
      }
    });
    return Array.from(locSet).filter(Boolean).sort();
  }, [users]);

  useEffect(() => {
    setOrders(initialOrders.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
  }, [initialOrders]);


  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const orderRef = doc(db, 'orders', orderId);
    try {
      await updateDoc(orderRef, { status: newStatus });
      setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? {...o, status: newStatus} : o));
      toast({ title: 'Success', description: 'Order status updated.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to update status: ${error.message}` });
    }
  };

  const usersMap = useMemo(() => {
    const map = new Map();
    users.forEach(user => map.set(user.id, user));
    return map;
  }, [users]);
  
  const filteredOrdersList = useMemo(() => {
    let list = statusFilter === 'all' 
      ? orders 
      : orders.filter(order => order.status === 'Pending');

    if (locationFilter !== 'all') {
      list = list.filter(order => {
        const shopInfo = usersMap.get(order.shopId);
        return shopInfo && shopInfo.location === locationFilter;
      });
    }
    return list;
  }, [orders, usersMap, statusFilter, locationFilter]);

  const ordersByDate = useMemo(() => {
    const groupedByDate: { [key: string]: any[] } = {};
    filteredOrdersList.forEach(order => {
        if (!order.createdAt?.toDate) return;
        const dateStr = order.createdAt.toDate().toLocaleDateString('en-CA'); // YYYY-MM-DD
        if (!groupedByDate[dateStr]) {
            groupedByDate[dateStr] = [];
        }
        groupedByDate[dateStr].push(order);
    });

    const processedData = Object.entries(groupedByDate).map(([date, dateOrders]) => {
      const hasPendingOrdersOnDate = dateOrders.some(order => order.status === 'Pending');

      const ordersByShop = dateOrders.reduce((acc, order) => {
        const shopInfo = usersMap.get(order.shopId);
        if (!shopInfo) {
          return acc;
        }
        if (!acc[order.shopId]) {
          acc[order.shopId] = {
            shopInfo: shopInfo,
            orders: [],
          };
        }
        acc[order.shopId].orders.push(order);
        return acc;
      }, {} as any);

      return {
        date,
        totalOrders: dateOrders.length,
        hasPending: hasPendingOrdersOnDate,
        shops: Object.values(ordersByShop).map((shopData: any) => ({
            ...shopData,
            orders: shopData.orders.sort((a: any, b: any) => b.createdAt?.toMillis() - a.createdAt?.toMillis()),
        })),
      };
    });

    return processedData.sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredOrdersList, usersMap]);

  const handleDownload = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Order ID,Shop Name,Phone Number,Location,Product Name,Size,Quantity,Rate,Amount,Status,Payment Method,Payment Status\r\n";

    filteredOrdersList.forEach((order) => {
        const shopInfo = usersMap.get(order.shopId);
        if(!shopInfo) return;
        order.items.forEach((item: any) => {
             const row = [
                `"${order.createdAt?.toDate().toLocaleDateString()}"`,
                `"${order.id}"`,
                `"${shopInfo.shopName || ''}"`,
                `"${shopInfo.phoneNumber || ''}"`,
                `"${shopInfo.location || ''}"`,
                `"${item.name}"`,
                `"${item.size}"`,
                item.quantity,
                item.rate,
                item.quantity * (item.rate || 0),
                order.status,
                order.paymentMethod || 'N/A',
                order.paymentStatus || 'N/A',
            ].join(',');
            csvContent += row + "\r\n";
        });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "orders_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    
    const title = `Customer Orders Report${locationFilter !== 'all' ? ` - ${locationFilter}` : ''}${statusFilter !== 'all' ? ` (${statusFilter})` : ''}`;
      
    doc.text(title, 14, 15);

    const tableBody = filteredOrdersList.flatMap(order => {
      const shopInfo = usersMap.get(order.shopId);
      const shopName = shopInfo ? shopInfo.shopName : 'N/A';
      const location = shopInfo ? shopInfo.location : 'N/A';
      const orderDate = order.createdAt?.toDate().toLocaleDateString('en-GB') || 'N/A';
      const totalAmount = order.items.reduce((acc: number, item: any) => acc + (item.quantity * (item.rate || 0)), 0);
      
      const mainRow: any[] = [
        orderDate,
        `${shopName} (${location})`,
        `ID: ${order.id.substring(0, 8)}`,
        `INR ${totalAmount.toLocaleString('en-IN')}`,
        order.status
      ];

      const itemRows = order.items.map((item: any) => [
        '',
        `  - ${item.name} (${item.size})`,
        `Qty: ${item.quantity} @ INR ${item.rate}`,
        `INR ${(item.quantity * (item.rate || 0)).toLocaleString('en-IN')}`,
        ''
      ]);

      return [mainRow, ...itemRows];
    });

    (doc as any).autoTable({
      startY: 20,
      head: [['Date', 'Shop (Location)', 'Details', 'Amount', 'Status']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] },
    });

    const fileDate = new Date().toLocaleDateString('en-CA');
    doc.save(`orders_report_${fileDate}.pdf`);
  };


  return (
    <Card className='print-only-card'>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 no-print">
        <CardTitle>All Customer Orders</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
            <Select onValueChange={(value) => setLocationFilter(value)} value={locationFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((loc: string) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
                onClick={() => setStatusFilter('all')} 
                variant={statusFilter === 'all' ? 'default' : 'outline'} 
                size="sm"
            >
                All Orders
            </Button>
            <Button 
                onClick={() => setStatusFilter('Pending')} 
                variant={statusFilter === 'Pending' ? 'default' : 'outline'} 
                size="sm"
            >
                <Filter className="mr-2 h-4 w-4" />
                Pending
            </Button>
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Report
            </Button>
            <Button onClick={handleDownloadPdf} variant="outline" size="sm" disabled={filteredOrdersList.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                PDF
            </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {loading && initialOrders.length === 0 ? (
            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <Accordion type="multiple" className="w-full space-y-4 min-w-[600px] md:min-w-full">
            {ordersByDate.map(({ date, totalOrders, shops, hasPending }) => (
              <AccordionItem value={date} key={date} className="border-0 rounded-lg bg-white shadow-sm">
                <AccordionTrigger className="p-4 hover:no-underline no-print rounded-t-lg border-b">
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-gray-600" />
                        <span className="text-lg font-semibold text-left">{new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                         {hasPending && (
                            <span className="ml-2 inline-flex items-center gap-1.5 animate-blink text-red-600 font-bold">
                                <Clock className="h-4 w-4" />
                                Pending
                            </span>
                          )}
                    </div>
                    <span className="px-3 py-1 text-sm font-bold text-primary bg-primary/10 rounded-full hidden sm:inline-block">{totalOrders} orders</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-0">
                  <Accordion type="multiple" className="w-full">
                    {shops.map(({ shopInfo, orders }) => {
                      const hasPending = orders.some((order: any) => order.status === 'Pending');
                      return (
                      <AccordionItem value={shopInfo.id} key={shopInfo.id} className="border-t">
                         <div className="flex items-center p-4">
                          <AccordionTrigger className="p-0 hover:no-underline flex-grow">
                              <div className="flex justify-between w-full items-center pr-4">
                                  <div className='flex items-center gap-3'>
                                      <User className="h-5 w-5 text-gray-500" />
                                      <div className="text-left">
                                          <div className="font-semibold text-base">
                                            {shopInfo.shopName}
                                             {hasPending && (
                                              <span className="ml-2 inline-flex items-center gap-1.5 animate-blink text-red-600 font-bold">
                                                  <Clock className="h-4 w-4" />
                                                  Pending
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                              <span>{shopInfo.location}</span>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="px-2 py-1 text-xs font-bold text-green-800 bg-green-100 rounded-full inline-block">{orders.length} order(s)</div>
                              </div>
                          </AccordionTrigger>
                           {shopInfo.phoneNumber && (
                                <a href={`tel:${shopInfo.phoneNumber}`} className="ml-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <Button variant="outline" size="icon" className="h-8 w-8">
                                        <Phone className="h-4 w-4" />
                                        <span className="sr-only">Call {shopInfo.shopName}</span>
                                    </Button>
                                </a>
                            )}
                        </div>
                        <AccordionContent className="pb-2 px-4 bg-gray-50/50">
                            {orders.map((order: any) => {
                                const totalAmount = order.items.reduce((acc: number, item: any) => acc + (item.quantity * (item.rate || 0)), 0);
                                return (
                                <div key={order.id} className="mb-4 border rounded-lg p-4 bg-white mt-2">
                                    <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                                        <div>
                                            <div className='flex items-center gap-2'>
                                                <Info className="h-4 w-4" />
                                                <span className="font-bold text-sm">Order ID:</span>
                                                <span className="font-mono text-xs">{order.id.substring(0,8)}</span>
                                            </div>
                                             <div className='flex items-center gap-2 mt-1 text-xs text-muted-foreground'>
                                                <Clock className="h-3 w-3" />
                                                <span>{order.createdAt?.toDate().toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                         <div className="text-right">
                                             <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[order.status]}`}>
                                                {order.status}
                                             </span>
                                              <div className='flex items-center justify-end gap-2 mt-2 text-xs'>
                                                <CreditCard className="h-3 w-3" />
                                                <span>{order.paymentMethod} - </span>
                                                <span className={`font-semibold ${paymentStatusColors[order.paymentStatus]}`}>{order.paymentStatus}</span>
                                            </div>
                                         </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Product</TableHead>
                                                <TableHead>Size</TableHead>
                                                <TableHead className='text-center'>Qty</TableHead>
                                                <TableHead className='text-right'>Rate</TableHead>
                                                <TableHead className='text-right'>Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {order.items.map((item: any, index: number) => (
                                            <TableRow key={`${item.id}-${item.size}-${index}`}>
                                                <TableCell>{item.name}</TableCell>
                                                <TableCell>{item.size}</TableCell>
                                                <TableCell className='text-center'>{item.quantity}</TableCell>
                                                <TableCell className='text-right'>{item.rate?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) ?? 'N/A'}</TableCell>
                                                <TableCell className='text-right font-semibold'>{(item.quantity * (item.rate || 0)).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</TableCell>
                                            </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    </div>
                                    <div className="flex justify-between items-center mt-4 border-t pt-3 flex-wrap gap-2">
                                        <div className="font-bold text-lg">
                                            Total: {totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                        </div>
                                        <div className="flex items-center gap-2 no-print">
                                            <Select onValueChange={(value) => handleStatusChange(order.id, value)} defaultValue={order.status}>
                                                <SelectTrigger className="w-[120px] h-9">
                                                <SelectValue placeholder="Status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                <SelectItem value="Pending">Pending</SelectItem>
                                                <SelectItem value="Confirmed">Confirmed</SelectItem>
                                                <SelectItem value="Delivered">Delivered</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            )})}
                        </AccordionContent>
                      </AccordionItem>
                    )})}
                  </Accordion>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
