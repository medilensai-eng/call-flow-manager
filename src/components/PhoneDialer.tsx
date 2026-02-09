import React from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Phone, 
  User,
  ExternalLink,
} from 'lucide-react';

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
      <DialogContent className="sm:max-w-[320px] p-0 overflow-hidden">
        {/* Gradient Header */}
        <div className="gradient-primary p-6 pb-8 text-center text-primary-foreground">
          <div className="w-20 h-20 mx-auto rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-4 ring-white/20 mb-4">
            <User className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold font-display">{customerName}</h3>
          <p className="text-sm opacity-90 font-mono mt-1">{phoneNumber}</p>
        </div>

        {/* Actions */}
        <div className="p-6 -mt-4 space-y-3">
          <Button
            size="lg"
            className="w-full h-14 bg-green-500 hover:bg-green-600 text-white font-bold text-base rounded-xl shadow-lg"
            onClick={handleCallNow}
          >
            <Phone className="w-5 h-5 mr-2" />
            Call Now
            <ExternalLink className="w-3.5 h-3.5 ml-2 opacity-70" />
          </Button>

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={onClose}
          >
            Cancel
          </Button>
          
          <p className="text-[11px] text-muted-foreground text-center">
            Opens your device's native phone dialer
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
