'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { collection, query, orderBy, onSnapshot, where, Timestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Loader2, Users, MonitorSmartphone, Clock, Trash2, Wand2, MessageSquare } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

export function VisitorAnalytics() {
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartVisitors, setChartVisitors] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0] // Format: YYYY-MM-DD
  );

  useEffect(() => {
    if (!selectedDate) {
      setVisitors([]);
      return;
    }

    setLoading(true);
    
    // Calculate start and end of the selected date
    const start = new Date(selectedDate);
    if (isNaN(start.getTime())) {
      setLoading(false);
      return;
    }
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'visitors'),
      where('timestamp', '>=', Timestamp.fromDate(start)),
      where('timestamp', '<=', Timestamp.fromDate(end)),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setVisitors(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedDate]);

  useEffect(() => {
    setChartLoading(true);
    
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - 27); // Last 28 days
    start.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'visitors'),
      where('timestamp', '>=', Timestamp.fromDate(start)),
      where('timestamp', '<=', Timestamp.fromDate(end)),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setChartVisitors(data);
      setChartLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Calculate metrics based on CURRENT filtered date
  const todayVisits = visitors.length;
  
  const uniqueSignatures = new Set(
    visitors.map(v => `${v.userDetails}-${v.browser}-${v.os}`)
  );
  const uniqueVisitorsToday = uniqueSignatures.size;

  const loggedInVisitsToday = visitors.filter(v => v.userDetails !== 'Anonymous').length;

  const hourlyChartData = useMemo(() => {
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      signatures: new Set<string>()
    }));

    visitors.forEach(v => {
      if (v.timestamp) {
        const date = v.timestamp.toDate();
        const hour = date.getHours();
        const sig = `${v.userDetails}-${v.browser}-${v.os}`;
        if (hour >= 0 && hour < 24) {
          hourlyData[hour].signatures.add(sig);
        }
      }
    });

    return {
      labels: hourlyData.map(d => d.hour),
      datasets: [
        {
          label: 'Unique Visitors (Hourly)',
          data: hourlyData.map(d => d.signatures.size),
          backgroundColor: 'rgba(234, 179, 8, 0.5)',
          borderColor: 'rgba(234, 179, 8, 1)',
          borderWidth: 2,
          tension: 0.4,
        },
      ],
    };
  }, [visitors]);

  const dailyChartData = useMemo(() => {
    const days: string[] = [];
    const dailyData: Record<string, Set<string>> = {};
    
    // Generate last 7 days labels
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
      days.push(dateStr);
      dailyData[dateStr] = new Set();
    }

    chartVisitors.forEach(v => {
      if (v.timestamp) {
        const date = v.timestamp.toDate();
        const dateStr = date.toLocaleDateString('en-CA');
        const sig = `${v.userDetails}-${v.browser}-${v.os}`;
        if (dailyData[dateStr]) {
          dailyData[dateStr].add(sig);
        }
      }
    });

    return {
      labels: days.map(d => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })),
      datasets: [
        {
          label: 'Unique Visitors (Last 7 Days)',
          data: days.map(d => dailyData[d].size),
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          tension: 0.4,
        },
      ],
    };
  }, [chartVisitors]);

  const weeklyChartData = useMemo(() => {
    const weeks: string[] = [];
    const weeklyData: Record<string, Set<string>> = {};
    
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    
    for (let i = 3; i >= 0; i--) {
      const endOfWeek = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const startOfWeek = new Date(endOfWeek.getTime() - 6 * 24 * 60 * 60 * 1000);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const label = `${startOfWeek.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${endOfWeek.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
      weeks.push(label);
      weeklyData[label] = new Set();
    }

    chartVisitors.forEach(v => {
      if (v.timestamp) {
        const date = v.timestamp.toDate();
        const sig = `${v.userDetails}-${v.browser}-${v.os}`;
        
        for (let i = 3; i >= 0; i--) {
          const endOfWeek = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
          const startOfWeek = new Date(endOfWeek.getTime() - 6 * 24 * 60 * 60 * 1000);
          startOfWeek.setHours(0, 0, 0, 0);
          
          if (date >= startOfWeek && date <= endOfWeek) {
            const label = `${startOfWeek.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${endOfWeek.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
            if (weeklyData[label]) {
              weeklyData[label].add(sig);
            }
            break;
          }
        }
      }
    });

    return {
      labels: weeks,
      datasets: [
        {
          label: 'Unique Visitors (Last 4 Weeks)',
          data: weeks.map(w => weeklyData[w].size),
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 2,
          tension: 0.4,
        },
      ],
    };
  }, [chartVisitors]);

  const visitorPhoneNumbers = useMemo(() => {
    const phones = new Set<string>();
    visitors.forEach(v => {
      if (v.userDetails && v.userDetails !== 'Anonymous') {
        const match = v.userDetails.match(/\b\d{10}\b/);
        if (match) {
          phones.add(match[0]);
        }
      }
    });
    return Array.from(phones).join(',');
  }, [visitors]);

  const smsMessage = "Hi from Gajanan Enterprises (Pepsi Distributor), GHATAPRABHA! 🥤 If you have any new orders, please send the orders in the app only! 📱📦🚚";

  const handleClearLog = async () => {
    if (!window.confirm(`Are you sure you want to delete all ${visitors.length} visitor logs for ${selectedDate}?`)) {
      return;
    }
    
    setIsProcessing(true);
    try {
      // Firestore batches can handle up to 500 operations
      const batches = [];
      let batch = writeBatch(db);
      let count = 0;

      for (const visitor of visitors) {
        batch.delete(doc(db, 'visitors', visitor.id));
        count++;
        if (count === 500) {
          batches.push(batch);
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) batches.push(batch);

      for (const b of batches) {
        await b.commit();
      }
    } catch (error) {
      console.error("Error clearing logs:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveDuplicates = async () => {
    if (visitors.length === 0) return;
    setIsProcessing(true);
    
    try {
      // Sort visitors chronologically (oldest first) so we KEEP their first visit and delete the rest
      const chronological = [...visitors].reverse(); 
      const toDeleteIds = new Set<string>();
      const seenUsers = new Set<string>();

      let prevAnonId = '';
      let prevAnonTime = 0;

      for (const curr of chronological) {
        if (curr.userDetails !== 'Anonymous') {
          // Extract the phone number or use the full user details string as the unique identifier
          // If we have already seen this user/phone number today, mark this extra visit for deletion
          if (seenUsers.has(curr.userDetails)) {
            toDeleteIds.add(curr.id);
          } else {
            seenUsers.add(curr.userDetails);
          }
        } else {
          // For anonymous visitors, we'll just delete rapid consecutive clicks within 5 minutes
          const currTime = curr.timestamp ? curr.timestamp.toMillis() : 0;
          if (curr.userAgent === prevAnonId && (currTime - prevAnonTime) < 5 * 60 * 1000) {
            toDeleteIds.add(curr.id);
          } else {
            prevAnonId = curr.userAgent;
            prevAnonTime = currTime;
          }
        }
      }

      if (toDeleteIds.size === 0) {
        window.alert('No duplicate entries found!');
        setIsProcessing(false);
        return;
      }

      if (!window.confirm(`Found ${toDeleteIds.size} duplicate visits for the same users today. Do you want to remove them?`)) {
        setIsProcessing(false);
        return;
      }

      const batches = [];
      let batch = writeBatch(db);
      let count = 0;

      for (const id of Array.from(toDeleteIds)) {
        batch.delete(doc(db, 'visitors', id));
        count++;
        if (count === 500) {
          batches.push(batch);
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) batches.push(batch);

      for (const b of batches) {
        await b.commit();
      }

    } catch (error) {
      console.error("Error removing duplicates:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : todayVisits}</div>
            <p className="text-xs text-muted-foreground">Page views logged</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Unique Devices</CardTitle>
            <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : uniqueVisitorsToday}</div>
            <p className="text-xs text-muted-foreground">Distinct browser signatures</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logged-In Visits</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : loggedInVisitsToday}</div>
            <p className="text-xs text-muted-foreground">Visits from registered shops</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Hourly Trend ({selectedDate})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {visitors.length > 0 ? (
                <Line data={hourlyChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">No data available.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {chartLoading ? (
                <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : chartVisitors.length > 0 ? (
                <Line data={dailyChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">No data available.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader>
            <CardTitle>Weekly Trend (Last 4 Weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {chartLoading ? (
                <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : chartVisitors.length > 0 ? (
                <Bar data={weeklyChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">No data available.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Visitor Log</CardTitle>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-auto"
            />
            <Button 
              variant="secondary" 
              onClick={handleRemoveDuplicates}
              disabled={loading || isProcessing || visitors.length === 0}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
              Remove Duplicates
            </Button>
            {visitorPhoneNumbers && (
              <a href={`sms:${visitorPhoneNumbers}?body=${encodeURIComponent(smsMessage)}`}>
                <Button variant="default" title="Send SMS to all identified visitors">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  SMS All
                </Button>
              </a>
            )}
            <Button 
              variant="destructive" 
              onClick={handleClearLog}
              disabled={loading || isProcessing || visitors.length === 0}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Clear Log
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : visitors.length === 0 ? (
             <div className="text-center py-10 text-gray-500">No visitors found for {selectedDate}.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>User Details</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Browser</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visitors.map((visitor) => (
                    <TableRow key={visitor.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {visitor.timestamp 
                          ? visitor.timestamp.toDate().toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) 
                          : 'Just now'}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${visitor.type === 'App Reopened' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          {visitor.type || 'Page Load'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {visitor.userDetails === 'Anonymous' ? (
                          <span className="text-gray-500 italic">Anonymous Visitor</span>
                        ) : (
                          <span className="font-semibold text-blue-600">{visitor.userDetails}</span>
                        )}
                      </TableCell>
                      <TableCell>{visitor.deviceType || 'Unknown'} - {visitor.os || 'Unknown'}</TableCell>
                      <TableCell>{visitor.browser || 'Unknown'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
