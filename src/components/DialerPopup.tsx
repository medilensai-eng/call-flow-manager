import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  User,
  Delete
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  customerName: string;
}

type CallState = 'idle' | 'dialing' | 'ringing' | 'connected' | 'ended';

export const DialerPopup = ({ 
  isOpen, 
  onClose, 
  phoneNumber, 
  customerName 
}: DialerPopupProps) => {
  const [dialedNumber, setDialedNumber] = useState(phoneNumber);
  const [callState, setCallState] = useState<CallState>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDialedNumber(phoneNumber);
      setCallState('idle');
      setCallDuration(0);
      setIsMuted(false);
      setIsSpeakerOn(false);
    }
  }, [isOpen, phoneNumber]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCall = () => {
    if (callState === 'idle') {
      setCallState('dialing');
      // Simulate call connection
      setTimeout(() => setCallState('ringing'), 1000);
      setTimeout(() => setCallState('connected'), 3000);
    }
  };

  const handleEndCall = () => {
    setCallState('ended');
    setTimeout(() => {
      setCallState('idle');
      setCallDuration(0);
    }, 1500);
  };

  const handleDigitPress = (digit: string) => {
    if (callState === 'idle') {
      setDialedNumber(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (callState === 'idle') {
      setDialedNumber(prev => prev.slice(0, -1));
    }
  };

  const dialPad = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#'],
  ];

  const getCallStateText = () => {
    switch (callState) {
      case 'dialing': return 'Dialing...';
      case 'ringing': return 'Ringing...';
      case 'connected': return formatDuration(callDuration);
      case 'ended': return 'Call Ended';
      default: return 'Ready to call';
    }
  };

  const getCallStateColor = () => {
    switch (callState) {
      case 'dialing':
      case 'ringing': return 'text-yellow-500';
      case 'connected': return 'text-green-500';
      case 'ended': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Phone Dialer</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4">
          {/* Customer Info */}
          <div className="flex items-center gap-3 w-full p-3 bg-muted/50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{customerName}</p>
              <p className="text-sm text-muted-foreground">{phoneNumber}</p>
            </div>
          </div>

          {/* Dialed Number Display */}
          <div className="w-full text-center py-4 bg-background border rounded-lg">
            <p className="text-2xl font-mono tracking-wider min-h-[2rem]">
              {dialedNumber || 'Enter number'}
            </p>
            <p className={cn("text-sm mt-1", getCallStateColor())}>
              {getCallStateText()}
            </p>
          </div>

          {/* Dial Pad */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-[240px]">
            {dialPad.map((row, rowIndex) => (
              row.map((digit) => (
                <Button
                  key={digit}
                  variant="outline"
                  className="h-12 text-xl font-medium"
                  onClick={() => handleDigitPress(digit)}
                  disabled={callState !== 'idle'}
                >
                  {digit}
                </Button>
              ))
            ))}
          </div>

          {/* Backspace */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackspace}
            disabled={callState !== 'idle' || !dialedNumber}
            className="text-muted-foreground"
          >
            <Delete className="w-4 h-4 mr-1" />
            Backspace
          </Button>

          {/* Call Controls */}
          {callState === 'connected' && (
            <div className="flex items-center justify-center gap-4 w-full py-2">
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "rounded-full h-12 w-12",
                  isMuted && "bg-destructive/10 border-destructive text-destructive"
                )}
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "rounded-full h-12 w-12",
                  isSpeakerOn && "bg-primary/10 border-primary text-primary"
                )}
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              >
                {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>
            </div>
          )}

          {/* Call/End Call Button */}
          <div className="flex justify-center w-full pt-2">
            {callState === 'idle' || callState === 'ended' ? (
              <Button
                size="lg"
                className="rounded-full h-14 w-14 bg-green-500 hover:bg-green-600"
                onClick={handleCall}
                disabled={!dialedNumber || callState === 'ended'}
              >
                <Phone className="w-6 h-6" />
              </Button>
            ) : (
              <Button
                size="lg"
                variant="destructive"
                className="rounded-full h-14 w-14"
                onClick={handleEndCall}
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            )}
          </div>

          {/* Status Badge */}
          {callState !== 'idle' && callState !== 'ended' && (
            <Badge 
              variant="outline" 
              className={cn(
                "animate-pulse",
                callState === 'connected' && "border-green-500 text-green-500"
              )}
            >
              {callState === 'connected' ? 'On Call' : 'Connecting...'}
            </Badge>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
