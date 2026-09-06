'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, LineChart, Package, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function ShopInsights({ orders = [], users = [], loading }: { orders: any[], users: any[], loading: boolean }) {
  const [searchQuery, setSearchQuery] = useState('');

  const shopInsights = useMemo(() => {
    if (loading || !users.length) return [];
    
    const insights = new Map();
    
    users.forEach(user => {
      if (user.role === 'shop') {
        insights.set(user.id, {
          shopInfo: user,
          totalOrders: 0,
          totalItemsPurchased: 0,
          products: {}
        });
      }
    });

    orders.forEach(order => {
      if (order.status !== 'Delivered') return;
      if (!insights.has(order.shopId)) return;
      
      const data = insights.get(order.shopId);
      data.totalOrders += 1;
      
      order.items.forEach((item: any) => {
        const key = `${item.name} (${item.size})`;
        data.totalItemsPurchased += item.quantity;
        data.products[key] = (data.products[key] || 0) + item.quantity;
      });
    });

    return Array.from(insights.values())
      .map(data => ({
         ...data,
         sortedProducts: Object.entries(data.products).sort((a: any, b: any) => b[1] - a[1]) // Sort products by quantity desc
      }))
      .filter(data => {
         const matchesSearch = data.shopInfo.shopName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                               data.shopInfo.phoneNumber?.includes(searchQuery);
         return matchesSearch;
      })
      .sort((a, b) => b.totalItemsPurchased - a.totalItemsPurchased); // Sort shops by total items bought
  }, [orders, users, loading, searchQuery]);

  return (
    <Card className="printable-area">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-t-lg bg-gray-50/50 border-b p-4">
        <div className="flex items-center gap-3">
          <LineChart className="w-6 h-6 md:w-8 md:h-8 text-indigo-600" />
          <CardTitle className='text-xl md:text-2xl font-bold tracking-tight'>Shop Purchasing Insights</CardTitle>
        </div>
        <div className="flex items-center w-full md:w-auto relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
           <Input 
             placeholder="Search shops..." 
             className="pl-9 w-full sm:w-[250px] bg-white" 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
           />
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : shopInsights.length > 0 ? (
          <Accordion type="single" collapsible className="w-full">
            {shopInsights.map((data) => (
              <AccordionItem value={data.shopInfo.id} key={data.shopInfo.id} className="border-b">
                <AccordionTrigger className="p-4 hover:no-underline [&[data-state=open]>svg]:text-indigo-600 hover:bg-gray-50/50 transition-colors">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-left w-full items-center">
                     <div className="font-bold text-base text-gray-900 truncate pr-4">
                       {data.shopInfo.shopName || 'Unnamed Shop'}
                       <div className="text-xs font-normal text-muted-foreground mt-0.5">{data.shopInfo.location || 'No Location'}</div>
                     </div>
                     <div className="hidden md:block">
                        <span className="text-muted-foreground text-xs">Total Orders:</span>
                        <div className="font-semibold text-gray-700">{data.totalOrders}</div>
                     </div>
                     <div className="hidden md:block">
                        <span className="text-muted-foreground text-xs">Total Items Bought:</span>
                        <div className="font-bold text-indigo-600">{data.totalItemsPurchased.toLocaleString()}</div>
                     </div>
                     <div className="text-right pr-4 md:hidden">
                        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-indigo-50 text-indigo-700 border-indigo-200">
                           {data.totalItemsPurchased} Items
                        </div>
                     </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-0 bg-gray-50/80 border-t">
                   {data.sortedProducts.length > 0 ? (
                     <Table>
                        <TableHeader className="bg-gray-100/50">
                           <TableRow>
                              <TableHead className="font-semibold text-gray-700">Product (Continuous Purchases)</TableHead>
                              <TableHead className="text-right font-semibold text-gray-700">Total Quantity</TableHead>
                           </TableRow>
                        </TableHeader>
                        <TableBody>
                           {data.sortedProducts.map(([productName, quantity]: any, idx: number) => (
                              <TableRow key={idx} className="hover:bg-white transition-colors">
                                 <TableCell className="font-medium text-gray-800 flex items-center gap-2">
                                    <Package className="h-4 w-4 text-gray-400" />
                                    {productName}
                                 </TableCell>
                                 <TableCell className="text-right font-bold text-gray-900">{quantity.toLocaleString()}</TableCell>
                              </TableRow>
                           ))}
                        </TableBody>
                     </Table>
                   ) : (
                     <div className="p-6 text-center text-gray-500 text-sm">
                        This shop hasn't placed any delivered orders yet.
                     </div>
                   )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
             No shops found matching your search.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
