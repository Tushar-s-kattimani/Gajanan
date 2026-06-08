'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2, Download, Banknote, ChevronDown, ShoppingBag, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


export function ShopRevenue({ orders = [], users = [], loading }: { orders: any[], users: any[], loading: boolean }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [showSummary, setShowSummary] = useState(false);

  const locations = useMemo(() => {
    const adminUser = users.find(u => u.role === 'admin');
    if (adminUser && adminUser.locations && Array.isArray(adminUser.locations)) {
      return adminUser.locations.filter(Boolean);
    }
    return [];
  }, [users]);

  const shopRevenueData = useMemo(() => {
    if (loading || !orders.length || !users.length) return [];
    
    const usersMap = new Map();
    users.forEach(user => usersMap.set(user.id, user));

    let deliveredOrders = orders
      .filter(order => order.status === 'Delivered' && order.createdAt?.toDate)
      .map(order => {
        const shopInfo = usersMap.get(order.shopId);
        return {
          ...order,
          shopInfo: shopInfo || null,
        };
      })
      .filter(order => order.shopInfo !== null);

    if (selectedDate) {
      const startOfDay = new Date(selectedDate + 'T00:00:00');
      const endOfDay = new Date(selectedDate + 'T23:59:59.999');
      
      deliveredOrders = deliveredOrders.filter(order => {
        const orderDate = order.createdAt.toDate();
        return orderDate >= startOfDay && orderDate <= endOfDay;
      });
    }

    if (locationFilter !== 'all') {
      deliveredOrders = deliveredOrders.filter(order => order.shopInfo?.location === locationFilter);
    }

    return deliveredOrders.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }, [orders, users, loading, selectedDate, locationFilter]);

  const totalItemsForDate = useMemo(() => {
    return shopRevenueData.reduce((sum, order) => sum + order.items.reduce((itemSum: any, item: any) => itemSum + item.quantity, 0), 0);
  }, [shopRevenueData]);
  
  const productSummary = useMemo(() => {
    const summary: { [key: string]: number } = {};
    shopRevenueData.forEach(order => {
      order.items.forEach((item: any) => {
        const productKey = `${item.name} (${item.size})`;
        summary[productKey] = (summary[productKey] || 0) + item.quantity;
      });
    });
    return Object.entries(summary).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  }, [shopRevenueData]);

  const handleDownloadPdf = () => {
    const doc = new jsPDF('landscape');
    
    const title = selectedDate 
      ? `Shop Revenue for ${new Date(selectedDate+'T00:00:00').toLocaleDateString('en-GB')}`
      : 'Shop Revenue from All Delivered Orders';
      
    doc.text(title, 14, 15);

    const tableBody = shopRevenueData.flatMap(order => {
      const date = order.createdAt.toDate().toLocaleString('en-GB');
      const shopName = order.shopInfo.shopName || 'N/A';
      const location = order.shopInfo.location || 'N/A';
      
      const rows = order.items.map((item: any, index: number) => [
        index === 0 ? date : '',
        index === 0 ? shopName : '',
        index === 0 ? location : '',
        item.name,
        item.size,
        item.quantity,
        (item.rate || 0).toLocaleString('en-IN'),
        (item.quantity * (item.rate || 0)).toLocaleString('en-IN')
      ]);
      
      // Order Subtotal row
      const orderTotalQty = order.items.reduce((sum: any, item: any) => sum + item.quantity, 0);
      const orderTotalAmount = order.items.reduce((sum: any, item: any) => sum + (item.quantity * (item.rate || 0)), 0);
      
      rows.push([
        '', '', '', 'Order Total', '', 
        orderTotalQty.toString(), 
        '', 
        orderTotalAmount.toLocaleString('en-IN')
      ]);
      
      return rows;
    });


    (doc as any).autoTable({
      startY: 20,
      head: [['Date & Time', 'Shop Name', 'Location', 'Product', 'Size', 'Qty', 'Rate (Rs)', 'Amount (Rs)']],
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 8, valign: 'middle' },
      didParseCell: function(data: any) {
        if (data.row.raw[3] === 'Order Total') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [245, 245, 245];
        }
      }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY;

    // Add summary table
    doc.text("Product Summary", 14, finalY + 10);
    (doc as any).autoTable({
      startY: finalY + 12,
      head: [['Product', 'Total Quantity']],
      body: productSummary,
      foot: [['Overall Total Items', totalItemsForDate.toLocaleString()]],
      footStyles: { fontStyle: 'bold', fillColor: [230, 230, 230], textColor: 0 },
    });

    const finalY2 = (doc as any).lastAutoTable.finalY;

    const shopSummaryMap = new Map();
    let overallTotalAmount = 0;
    
    shopRevenueData.forEach(order => {
      const shopName = order.shopInfo.shopName || 'N/A';
      const orderAmount = order.items.reduce((sum: any, item: any) => sum + (item.quantity * (item.rate || 0)), 0);
      overallTotalAmount += orderAmount;
      
      shopSummaryMap.set(shopName, (shopSummaryMap.get(shopName) || 0) + orderAmount);
    });

    const shopSummaryBody = Array.from(shopSummaryMap.entries()).map(([shopName, amount]) => [
        shopName,
        `Rs. ${amount.toLocaleString('en-IN')}`
    ]);

    doc.text("Shop Revenue Summary", 14, finalY2 + 10);
    (doc as any).autoTable({
      startY: finalY2 + 12,
      head: [['Shop Name', 'Total Amount']],
      body: shopSummaryBody,
      foot: [['Overall Total Amount', `Rs. ${overallTotalAmount.toLocaleString('en-IN')}`]],
      footStyles: { fontStyle: 'bold', fillColor: [230, 230, 230], textColor: 0 },
    });


    doc.save('shop_revenue_report.pdf');
  }

  return (
    <Card className="printable-area">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between no-print rounded-t-lg bg-gray-50/50 border-b p-4">
        <div className="flex items-center gap-3">
          <Banknote className="w-6 h-6 md:w-8 md:h-8 text-gray-600" />
          <CardTitle className='text-xl md:text-2xl font-bold tracking-tight'>Shop Revenue</CardTitle>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          <Select onValueChange={(value) => setLocationFilter(value)} value={locationFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-10 bg-white">
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
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full sm:w-auto bg-white"
          />
          <Button variant="outline" onClick={() => setSelectedDate('')} disabled={!selectedDate} className='bg-white w-full sm:w-auto'>Clear</Button>
          <Button onClick={() => setShowSummary(!showSummary)} variant="outline" className='bg-white w-full sm:w-auto'>
              <Eye className="mr-2 h-4 w-4" />
              {showSummary ? 'Hide' : 'View'} Summary
          </Button>
           <Button onClick={handleDownloadPdf} disabled={shopRevenueData.length === 0} className='w-full sm:w-auto'>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className='p-0 overflow-x-auto'>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : shopRevenueData.length > 0 ? (
          <Accordion type="single" collapsible className="w-full min-w-[700px]">
            {shopRevenueData.map((order) => (
               <AccordionItem value={order.id} key={order.id} className="border-b">
                 <AccordionTrigger className="p-4 hover:no-underline [&[data-state=open]>svg]:text-primary">
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-left w-full items-center">
                     <div className="font-medium truncate">{order.createdAt.toDate().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                     <div className="font-medium truncate">{order.shopInfo.shopName || 'N/A'}</div>
                     <div className="text-muted-foreground hidden md:block truncate">{order.shopInfo.location || 'N/A'}</div>
                     <div className="font-bold text-right pr-4">{order.items.reduce((itemSum: any, item: any) => itemSum + item.quantity, 0)} items</div>
                   </div>
                 </AccordionTrigger>
                 <AccordionContent className="p-4 bg-gray-50">
                    <h4 className="font-semibold mb-2 text-sm">Order Details</h4>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {order.items.map((item: any, index: number) => (
                                <TableRow key={index}>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell>{item.size}</TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 </AccordionContent>
               </AccordionItem>
            ))}
          </Accordion>
        ) : (
            <div className="text-center py-16 text-muted-foreground">
              {selectedDate ? 'No delivered orders on this date.' : 'No delivered orders yet.'}
            </div>
        )}
      </CardContent>
       {showSummary && shopRevenueData.length > 0 && (
         <CardFooter className="flex-col items-start gap-4 p-4 border-t bg-gray-50">
           <div className='w-full overflow-x-auto'>
              <h3 className="text-lg font-bold flex items-center gap-2 mb-3">
                <ShoppingBag className='h-5 w-5' />
                Total Product Summary
              </h3>
              <Table className="min-w-[400px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Total Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productSummary.map(([productKey, quantity]) => (
                    <TableRow key={productKey}>
                      <TableCell className="font-medium">{productKey}</TableCell>
                      <TableCell className="text-right font-bold">{quantity.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
           </div>
           <div className="flex justify-end items-center p-4 bg-gray-100 font-bold text-base border-t w-full rounded-md mt-4">
                <div className='mr-4'>Overall Total Items:</div>
                <div>{totalItemsForDate.toLocaleString()}</div>
            </div>
         </CardFooter>
      )}
    </Card>
  );
}
