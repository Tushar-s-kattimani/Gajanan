'use client';

import { Bar, Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IndianRupee, Package, Users, Loader2, Clock, CheckCircle, Truck, ShoppingCart, Calendar, Sun, AlertCircle, PackageX } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, Title, Tooltip, Legend, PointElement } from 'chart.js';
import { useMemo } from 'react';
import { PendingOrders } from './pending-orders';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, Title, Tooltip, Legend, PointElement);

export function AdminOverview({ orders = [], products = [], users = [], loading }: { orders: any[], products: any[], users: any[], loading: boolean }) {

  const { chartData, totalItemsSold, dailyItemsSold, monthlyItemsSold } = useMemo(() => {
    const dailySales: { [key: string]: number } = {};
    const productSales: { [key: string]: number } = {};
    let totalItemsSold = 0;
    let dailyItemsSold = 0;
    let monthlyItemsSold = 0;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const deliveredOrders = orders.filter(o => o.status === 'Delivered' && o.createdAt?.toDate);
    
    deliveredOrders.forEach(order => {
      const orderDate = order.createdAt.toDate();
      const itemsInOrder = order.items.reduce((acc: number, item: any) => acc + item.quantity, 0);
      
      totalItemsSold += itemsInOrder;

      if (orderDate >= todayStart && orderDate <= todayEnd) {
        dailyItemsSold += itemsInOrder;
      }

      if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
        monthlyItemsSold += itemsInOrder;
      }

      const day = orderDate.toLocaleDateString('en-CA');
      dailySales[day] = (dailySales[day] || 0) + itemsInOrder;

      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
        });
      }
    });

    const salesLabels = Object.keys(dailySales).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
    const salesValues = salesLabels.map(label => dailySales[label]);

    const sortedProducts = Object.entries(productSales).sort(([, a], [, b]) => b - a).slice(0, 5);
    const topProductLabels = sortedProducts.map(([name]) => name);
    const topProductValues = sortedProducts.map(([, quantity]) => quantity);

    return {
      chartData: {
        salesData: {
          labels: salesLabels.map(d => new Date(d+'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })),
          datasets: [{
            label: 'Daily Items Sold (Delivered)',
            data: salesValues,
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1,
            tension: 0.4,
          }],
        },
        productSalesData: {
          labels: topProductLabels,
          datasets: [{
            label: 'Units Sold',
            data: topProductValues,
            backgroundColor: 'rgba(234, 179, 8, 0.5)',
            borderColor: 'rgba(234, 179, 8, 1)',
            borderWidth: 1,
          }],
        },
      },
      totalItemsSold,
      dailyItemsSold,
      monthlyItemsSold
    };
  }, [orders]);


  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const totalProducts = products.length;
  const totalShops = users.filter(u => u.role === 'shop').length;
  
  const pendingOrdersCount = orders.filter(o => o.status === 'Pending').length;
  const confirmedOrders = orders.filter(o => o.status === 'Confirmed').length;
  const deliveredOrdersCount = orders.filter(o => o.status === 'Delivered').length;

  const outOfStockItems = products.filter(p => p.stock === 0).length;
  const lowStockItems = products.filter(p => p.stock > 0 && p.stock <= 100).length;

  return (
    <div className="space-y-6 md:space-y-8">
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items Sold</CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">{totalItemsSold.toLocaleString()}</div>
             <p className="text-xs text-muted-foreground">From all delivered orders</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month's Items Sold</CardTitle>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">{monthlyItemsSold.toLocaleString()}</div>
             <p className="text-xs text-muted-foreground">Items for the current month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Items Sold</CardTitle>
            <Sun className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">{dailyItemsSold.toLocaleString()}</div>
             <p className="text-xs text-muted-foreground">Items for today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shops</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">{totalShops}</div>
            <p className="text-xs text-muted-foreground">Registered</p>
          </CardContent>
        </Card>
         <Card className="bg-red-50 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-800">Out of Stock</CardTitle>
                <PackageX className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl md:text-3xl font-bold text-red-800">{outOfStockItems}</div>
                <p className="text-xs text-red-700">Items</p>
            </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-yellow-800">Low Stock</CardTitle>
                <AlertCircle className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl md:text-3xl font-bold text-yellow-800">{lowStockItems}</div>
                <p className="text-xs text-yellow-700">Items (≤100)</p>
            </CardContent>
        </Card>
        <Card className="sm:col-span-2">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl md:text-3xl font-bold">{orders.length}</div>
                <p className="text-xs text-muted-foreground">Across all statuses</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-8">
        <div className="lg:col-span-3 grid grid-cols-1 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Order Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                    <div className="flex flex-col items-center space-y-2 rounded-lg bg-yellow-50 p-4">
                        <Clock className="h-8 w-8 text-yellow-500" />
                        <span className="text-2xl font-bold">{pendingOrdersCount}</span>
                        <span className="text-sm font-medium">Pending</span>
                    </div>
                    <div className="flex flex-col items-center space-y-2 rounded-lg bg-blue-50 p-4">
                        <CheckCircle className="h-8 w-8 text-blue-500" />
                         <span className="text-2xl font-bold">{confirmedOrders}</span>
                        <span className="text-sm font-medium">Confirmed</span>
                    </div>
                    <div className="flex flex-col items-center space-y-2 rounded-lg bg-green-50 p-4">
                        <Truck className="h-8 w-8 text-green-500" />
                        <span className="text-2xl font-bold">{deliveredOrdersCount}</span>
                        <span className="text-sm font-medium">Delivered</span>
                    </div>
                </CardContent>
            </Card>
             <PendingOrders orders={orders} users={users} />
        </div>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Products by Units Sold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[24rem] sm:h-[28.5rem]">
              {chartData.productSalesData.labels.length > 0 ? (
                <Bar data={chartData.productSalesData} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y' }} />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">No product sales data available.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-1 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 sm:h-96">
              {chartData.salesData.labels.length > 0 ? (
                <Line data={chartData.salesData} options={{ responsive: true, maintainAspectRatio: false }} />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">No sales data available.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
