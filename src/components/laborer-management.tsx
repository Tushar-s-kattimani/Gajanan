'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/components/ui/use-toast';
import { addDoc, collection, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useCollection } from '@/firebase';
import { Loader2, UserPlus, Trash } from 'lucide-react';

const laborerSchema = z.object({
  name: z.string().min(1, 'Laborer name is required'),
  trade: z.string().min(1, 'Trade/skill is required'),
});

type LaborerFormValues = z.infer<typeof laborerSchema>;

export function LaborerManagement() {
  const { data: laborers, loading } = useCollection('laborers');
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLaborer, setEditingLaborer] = useState<any | null>(null);
  const { toast } = useToast();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LaborerFormValues>({
    resolver: zodResolver(laborerSchema),
  });

  const handleOpenDialog = (laborer: any | null = null) => {
    setEditingLaborer(laborer);
    if (laborer) {
      reset({ name: laborer.name, trade: laborer.trade });
    } else {
      reset({ name: '', trade: '' });
    }
    setOpen(true);
  };
  
  const handleCloseDialog = () => {
    setOpen(false);
    setEditingLaborer(null);
  }

  const onSubmit = async (data: LaborerFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingLaborer) {
        const laborerRef = doc(db, 'laborers', editingLaborer.id);
        await updateDoc(laborerRef, data);
        toast({ title: 'Success', description: 'Laborer updated successfully.' });
      } else {
        await addDoc(collection(db, 'laborers'), data);
        toast({ title: 'Success', description: 'Laborer added successfully.' });
      }
      handleCloseDialog();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (laborerId: string) => {
    if (window.confirm('Are you sure you want to delete this laborer? This action cannot be undone.')) {
        try {
            await deleteDoc(doc(db, 'laborers', laborerId));
            toast({ title: 'Success', description: 'Laborer deleted successfully.' });
            handleCloseDialog();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: `Failed to delete laborer: ${error.message}` });
        }
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Manage Laborers</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <UserPlus className="mr-2 h-4 w-4" /> Add Laborer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLaborer ? 'Edit Laborer' : 'Add New Laborer'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">Laborer Name</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="trade">Trade / Skill</Label>
                <Input id="trade" {...register('trade')} placeholder="e.g., Electrician, Plumber"/>
                {errors.trade && <p className="text-sm text-red-500 mt-1">{errors.trade.message}</p>}
              </div>
              <DialogFooter className="sm:justify-between pt-4 flex-col sm:flex-row gap-2">
                {editingLaborer && (
                    <Button type="button" variant="destructive" onClick={() => handleDelete(editingLaborer.id)} disabled={isSubmitting} className="sm:mr-auto">
                        <Trash className="mr-2 h-4 w-4" /> Delete
                    </Button>
                )}
                <div className="flex gap-2 ml-auto">
                    <Button type="button" variant="ghost" onClick={handleCloseDialog}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {editingLaborer ? 'Update Laborer' : 'Save Laborer'}
                    </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <Table className="min-w-[500px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trade / Skill</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {laborers.map((laborer) => (
                <TableRow key={laborer.id}>
                  <TableCell className="font-medium">{laborer.name}</TableCell>
                  <TableCell>{laborer.trade}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleOpenDialog(laborer)}>Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
