'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Loader2, Users, MonitorSmartphone, Clock } from 'lucide-react';

export function VisitorAnalytics() {
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'visitors'),
      orderBy('timestamp', 'desc'),
      limit(200)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVisitors(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Calculate metrics
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayVisits = visitors.filter(v => v.timestamp && v.timestamp.toDate() >= todayStart).length;
  
  // Calculate unique devices/users today
  const uniqueSignatures = new Set(
    visitors
      .filter(v => v.timestamp && v.timestamp.toDate() >= todayStart)
      .map(v => `${v.userDetails}-${v.browser}-${v.os}`)
  );
  const uniqueVisitorsToday = uniqueSignatures.size;

  const loggedInVisitsToday = visitors.filter(v => 
    v.timestamp && 
    v.timestamp.toDate() >= todayStart && 
    v.userDetails !== 'Anonymous'
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : todayVisits}</div>
            <p className="text-xs text-muted-foreground">Page views logged today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Unique Devices</CardTitle>
            <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : uniqueVisitorsToday}</div>
            <p className="text-xs text-muted-foreground">Distinct browser signatures today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logged-In Visits Today</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : loggedInVisitsToday}</div>
            <p className="text-xs text-muted-foreground">Visits from registered shops today</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Visitor Log</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : visitors.length === 0 ? (
             <div className="text-center py-10 text-gray-500">No visitors logged yet. The tracker is now active.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User Details</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>OS</TableHead>
                    <TableHead>Browser</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visitors.map((visitor) => (
                    <TableRow key={visitor.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {visitor.timestamp 
                          ? visitor.timestamp.toDate().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) 
                          : 'Just now'}
                      </TableCell>
                      <TableCell>
                        {visitor.userDetails === 'Anonymous' ? (
                          <span className="text-gray-500 italic">Anonymous Visitor</span>
                        ) : (
                          <span className="font-semibold text-blue-600">{visitor.userDetails}</span>
                        )}
                      </TableCell>
                      <TableCell>{visitor.deviceType || 'Unknown'}</TableCell>
                      <TableCell>{visitor.os || 'Unknown'}</TableCell>
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
