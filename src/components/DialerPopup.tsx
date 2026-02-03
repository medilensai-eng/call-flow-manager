import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
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
  User
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
  const [callState, setCallState] = useState<CallState>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCallState('idle');
      setCallDuration(0);
      setIsMuted(false);
      setIsSpeakerOn(false);
    }
  }, [isOpen]);

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

  const getCallStateText = () => {
    switch (callState) {
      case 'dialing': return 'Dialing...';
      case 'ringing': return 'Ringing...';
      case 'connected': return formatDuration(callDuration);
      case 'ended': return 'Call Ended';
      default: return 'Tap to call';
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
      <DialogContent className="sm:max-w-[280px] p-4">
        <div className="flex flex-col items-center space-y-4">
          {/* Customer Avatar */}
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-all",
            callState === 'connected' 
              ? "bg-green-500/20 ring-4 ring-green-500/30 animate-pulse" 
              : callState === 'dialing' || callState === 'ringing'
              ? "bg-yellow-500/20 ring-4 ring-yellow-500/30 animate-pulse"
              : "bg-primary/10"
          )}>
            <User className={cn(
              "w-8 h-8",
              callState === 'connected' ? "text-green-500" : "text-primary"
            )} />
          </div>

          {/* Customer Info */}
          <div className="text-center">
            <p className="font-semibold text-lg">{customerName}</p>
            <p className="text-sm text-muted-foreground font-mono">{phoneNumber}</p>
            <p className={cn("text-sm mt-1 font-medium", getCallStateColor())}>
              {getCallStateText()}
            </p>
          </div>

          {/* Call Controls - Only show when connected */}
          {callState === 'connected' && (
            <div className="flex items-center justify-center gap-6">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-full h-10 w-10",
                  isMuted && "bg-destructive/10 text-destructive"
                )}
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-full h-10 w-10",
                  isSpeakerOn && "bg-primary/10 text-primary"
                )}
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              >
                {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>
            </div>
          )}

          {/* Call/End Call Button */}
          <div className="pt-2">
            {callState === 'idle' || callState === 'ended' ? (
              <Button
                size="lg"
                className="rounded-full h-14 w-14 bg-green-500 hover:bg-green-600 shadow-lg"
                onClick={handleCall}
                disabled={callState === 'ended'}
              >
                <Phone className="w-6 h-6" />
              </Button>
            ) : (
              <Button
                size="lg"
                variant="destructive"
                className="rounded-full h-14 w-14 shadow-lg"
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
                "text-xs",
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
