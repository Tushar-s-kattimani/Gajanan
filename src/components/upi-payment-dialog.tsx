'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, Copy } from 'lucide-react';

interface UpiPaymentDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    upiId: string;
    amount: number;
    onPaymentConfirm: () => void;
}

export function UpiPaymentDialog({ isOpen, setIsOpen, upiId, amount, onPaymentConfirm }: UpiPaymentDialogProps) {
    const { toast } = useToast();

    const handleCopy = () => {
        navigator.clipboard.writeText(upiId).then(() => {
            toast({ title: 'Success', description: 'UPI ID copied to clipboard.' });
        }).catch(err => {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to copy UPI ID.' });
            console.error('Copy failed', err);
        });
    };

    const handleConfirm = () => {
        onPaymentConfirm();
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center">Pay via UPI</DialogTitle>
                    <DialogDescription className="text-center">
                        Copy the UPI ID and use any payment app to complete your payment.
                    </DialogDescription>
                </DialogHeader>

                <div className="my-6 flex flex-col items-center justify-center space-y-6">
                    <div className="text-center w-full">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Admin's UPI ID:</p>
                        <div className="flex items-center justify-center gap-2 rounded-lg border bg-gray-50 p-3">
                           <p className="text-lg font-semibold text-primary break-all">{upiId}</p>
                           <Button size="icon" variant="ghost" onClick={handleCopy}>
                                <Copy className="h-5 w-5" />
                                <span className="sr-only">Copy UPI ID</span>
                           </Button>
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-medium text-muted-foreground">Amount to Pay:</p>
                        <p className="text-4xl font-bold tracking-tight">{amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</p>
                    </div>
                </div>
                
                <DialogFooter>
                    <div className="w-full space-y-2">
                        <Button
                            type="button"
                            className="w-full h-12 text-lg"
                            onClick={handleConfirm}
                        >
                            <CheckCircle className="mr-2 h-5 w-5" />
                            I Have Paid & Placed Order
                        </Button>
                        <Button type="button" variant="ghost" className="w-full" onClick={() => setIsOpen(false)}>
                           Cancel
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
