import React from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Phone, 
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhoneDialerProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  customerName: string;
}

export const PhoneDialer = ({ 
  isOpen, 
  onClose, 
  phoneNumber, 
  customerName,
}: PhoneDialerProps) => {

  const getFormattedTelLink = () => {
    let num = phoneNumber.replace(/\s+/g, '');
    if (!num.startsWith('+')) {
      num = '+91' + num.replace(/^0/, '');
    }
    return `tel:${num}`;
  };

  const handleCallNow = () => {
    window.open(getFormattedTelLink(), '_self');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[280px] p-4">
        <div className="flex flex-col items-center space-y-4">
          {/* Customer Avatar */}
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-primary/10">
            <User className="w-8 h-8 text-primary" />
          </div>

          {/* Customer Info */}
          <div className="text-center">
            <p className="font-semibold text-lg">{customerName}</p>
            <p className="text-sm text-muted-foreground font-mono">{phoneNumber}</p>
          </div>

          {/* Call Button */}
          <Button
            size="lg"
            className="rounded-full h-14 w-14 bg-green-500 hover:bg-green-600 shadow-lg"
            onClick={handleCallNow}
          >
            <Phone className="w-6 h-6" />
          </Button>

          <p className="text-[10px] text-muted-foreground">
            Opens your phone dialer directly
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
