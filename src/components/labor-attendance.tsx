'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollection } from '@/firebase';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/firebase/config';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';

const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

export function LaborAttendance() {
  const [selectedDate, setSelectedDate] = useState(today);
  const [attendance, setAttendance] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { data: laborers, loading: laborersLoading } = useCollection('laborers');
  const { toast } = useToast();

  const attendanceQuery = useMemo(() => {
    if (!selectedDate) return null;
    return query(collection(db, 'attendance'), where('date', '==', selectedDate));
  }, [selectedDate]);

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!attendanceQuery || laborersLoading) return;
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(attendanceQuery);
        const attendanceData: any = {};
        querySnapshot.forEach(doc => {
          const data = doc.data();
          attendanceData[data.laborerId] = { ...data, docId: doc.id };
        });
        
        // Initialize state for all laborers
        const initialAttendanceState: any = {};
        laborers.forEach(laborer => {
            initialAttendanceState[laborer.id] = attendanceData[laborer.id] || {
                laborerId: laborer.id,
                date: selectedDate,
                status: 'Absent',
                checkIn: '',
            }
        });

        setAttendance(initialAttendanceState);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch attendance data.' });
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAttendance();
    
  }, [attendanceQuery, laborers, laborersLoading, toast, selectedDate]);


  const handleAttendanceChange = (laborerId: string, field: string, value: string) => {
    setAttendance((prev: any) => ({
      ...prev,
      [laborerId]: {
        ...prev[laborerId],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const laborerId in attendance) {
        const record = attendance[laborerId];
        const { docId, ...dataToSave } = record;

        // Ensure checkIn is only saved if status is Present or Half-day
        if (dataToSave.status === 'Absent') {
            dataToSave.checkIn = '';
        }

        if (docId) { // Existing record
          const docRef = doc(db, 'attendance', docId);
          await updateDoc(docRef, dataToSave);
        } else { // New record
          if(dataToSave.status !== 'Absent' || dataToSave.checkIn) {
            await addDoc(collection(db, 'attendance'), dataToSave);
          }
        }
      }
      toast({ title: 'Success', description: 'Attendance saved successfully.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save attendance.' });
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const loading = laborersLoading || isLoading;

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <CardTitle>Labor Attendance</CardTitle>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-gray-500"/>
                <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full sm:w-auto"
                />
            </div>
            <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Attendance
            </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Laborer Name</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-in Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {laborers.map((laborer) => {
                 const currentRecord = attendance[laborer.id];
                 const isPresent = currentRecord?.status === 'Present' || currentRecord?.status === 'Half-day';
                 return (
                    <TableRow key={laborer.id}>
                        <TableCell>{laborer.name}</TableCell>
                        <TableCell>{laborer.trade}</TableCell>
                        <TableCell>
                        <Select
                            value={currentRecord?.status || 'Absent'}
                            onValueChange={(value) => handleAttendanceChange(laborer.id, 'status', value)}
                        >
                            <SelectTrigger className="w-[120px]">
                            <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                            <SelectItem value="Present">Present</SelectItem>
                            <SelectItem value="Absent">Absent</SelectItem>
                            <SelectItem value="Half-day">Half-day</SelectItem>
                            </SelectContent>
                        </Select>
                        </TableCell>
                        <TableCell>
                        <Input
                            type="time"
                            value={currentRecord?.checkIn || ''}
                            onChange={(e) => handleAttendanceChange(laborer.id, 'checkIn', e.target.value)}
                            disabled={!isPresent}
                            className="w-[120px]"
                        />
                        </TableCell>
                    </TableRow>
                 );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
