'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle, CheckCircle, PackageSearch } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function StockReport({ products = [], loading }: { products: any[], loading: boolean }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        const nameMatch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const statusMatch =
          statusFilter === 'all' ||
          (statusFilter === 'in_stock' && p.stock > 100) ||
          (statusFilter === 'low_stock' && p.stock > 0 && p.stock <= 100) ||
          (statusFilter === 'out_of_stock' && p.stock === 0);
        return nameMatch && statusMatch;
      })
      .sort((a, b) => a.stock - b.stock);
  }, [products, searchTerm, statusFilter]);

  const getStatus = (stock: number) => {
    if (stock === 0) return { text: 'Out of Stock', color: 'text-red-600', icon: <AlertCircle className="h-4 w-4" /> };
    if (stock <= 100) return { text: 'Low Stock', color: 'text-yellow-600', icon: <AlertCircle className="h-4 w-4" /> };
    return { text: 'In Stock', color: 'text-green-600', icon: <CheckCircle className="h-4 w-4" /> };
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <CardTitle>Inventory Stock Report</CardTitle>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          <div className="relative w-full sm:w-auto">
             <PackageSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 w-full sm:w-auto"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="in_stock">In Stock</SelectItem>
              <SelectItem value="low_stock">Low Stock</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Stock Level</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map(product => {
                  const status = getStatus(product.stock);
                  const progressValue = Math.min((product.stock / 50) * 100, 100); // Assuming 50 is a 'healthy' stock level for progress bar visualization
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.size}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="w-8 font-semibold">{product.stock}</span>
                          <Progress value={progressValue} className="w-[100px]" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-2 font-medium ${status.color}`}>
                          {status.icon}
                          {status.text}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    No products found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
