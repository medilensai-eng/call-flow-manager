import React, { useState, useEffect, useRef } from 'react';
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
  User,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DialerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  customerName: string;
}

type CallState = 'idle' | 'connecting' | 'ringing' | 'connected' | 'ended' | 'failed';

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
  const [callSid, setCallSid] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCallState('idle');
      setCallDuration(0);
      setIsMuted(false);
      setIsSpeakerOn(false);
      setCallSid(null);
      setErrorMessage(null);
    }
    
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
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

  // Poll call status
  useEffect(() => {
    if (callSid && (callState === 'connecting' || callState === 'ringing' || callState === 'connected')) {
      statusCheckInterval.current = setInterval(async () => {
        try {
          const { data, error } = await supabase.functions.invoke('twilio-call', {
            body: { action: 'get_status', callSid }
          });

          if (error) {
            console.error('Status check error:', error);
            return;
          }

          if (data.success) {
            console.log('Call status:', data.status);
            
            if (data.status === 'in-progress') {
              setCallState('connected');
            } else if (data.status === 'ringing') {
              setCallState('ringing');
            } else if (data.status === 'completed' || data.status === 'busy' || 
                       data.status === 'no-answer' || data.status === 'canceled' || 
                       data.status === 'failed') {
              setCallState('ended');
              if (statusCheckInterval.current) {
                clearInterval(statusCheckInterval.current);
              }
            }
          }
        } catch (err) {
          console.error('Error checking call status:', err);
        }
      }, 2000);
    }

    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, [callSid, callState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCall = async () => {
    setCallState('connecting');
    setErrorMessage(null);

    try {
      // Format phone number for international calling (add country code if needed)
      let formattedNumber = phoneNumber.replace(/\s+/g, '');
      if (!formattedNumber.startsWith('+')) {
        // Assume India if no country code
        formattedNumber = '+91' + formattedNumber.replace(/^0/, '');
      }

      console.log('Initiating call to:', formattedNumber);

      const { data, error } = await supabase.functions.invoke('twilio-call', {
        body: { 
          action: 'make_call',
          to: formattedNumber
        }
      });

      if (error) {
        console.error('Call initiation error:', error);
        setCallState('failed');
        setErrorMessage(error.message || 'Failed to connect call');
        toast.error('Failed to initiate call');
        return;
      }

      if (data.success) {
        console.log('Call initiated:', data);
        setCallSid(data.callSid);
        setCallState('ringing');
        toast.success('Call initiated!');
      } else {
        setCallState('failed');
        setErrorMessage(data.error || 'Failed to connect call');
        toast.error(data.error || 'Failed to initiate call');
      }
    } catch (err) {
      console.error('Call error:', err);
      setCallState('failed');
      setErrorMessage('Connection error');
      toast.error('Failed to connect');
    }
  };

  const handleEndCall = async () => {
    if (!callSid) {
      setCallState('ended');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('twilio-call', {
        body: { 
          action: 'end_call',
          callSid 
        }
      });

      if (error) {
        console.error('End call error:', error);
      }

      setCallState('ended');
      toast.info('Call ended');
    } catch (err) {
      console.error('Error ending call:', err);
      setCallState('ended');
    }

    setTimeout(() => {
      setCallState('idle');
      setCallDuration(0);
      setCallSid(null);
    }, 2000);
  };

  const getCallStateText = () => {
    switch (callState) {
      case 'connecting': return 'Connecting...';
      case 'ringing': return 'Ringing...';
      case 'connected': return formatDuration(callDuration);
      case 'ended': return 'Call Ended';
      case 'failed': return errorMessage || 'Call Failed';
      default: return 'Tap to call';
    }
  };

  const getCallStateColor = () => {
    switch (callState) {
      case 'connecting':
      case 'ringing': return 'text-yellow-500';
      case 'connected': return 'text-green-500';
      case 'ended': return 'text-muted-foreground';
      case 'failed': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const isCallActive = callState === 'connecting' || callState === 'ringing' || callState === 'connected';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && isCallActive) {
        // Don't close while call is active
        return;
      }
      onClose();
    }}>
      <DialogContent className="sm:max-w-[280px] p-4">
        <div className="flex flex-col items-center space-y-4">
          {/* Customer Avatar */}
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-all",
            callState === 'connected' 
              ? "bg-green-500/20 ring-4 ring-green-500/30" 
              : callState === 'connecting' || callState === 'ringing'
              ? "bg-yellow-500/20 ring-4 ring-yellow-500/30"
              : callState === 'failed'
              ? "bg-destructive/20"
              : "bg-primary/10"
          )}>
            {callState === 'connecting' ? (
              <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
            ) : (
              <User className={cn(
                "w-8 h-8",
                callState === 'connected' ? "text-green-500" : 
                callState === 'failed' ? "text-destructive" : "text-primary"
              )} />
            )}
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
            {callState === 'idle' || callState === 'ended' || callState === 'failed' ? (
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
          {isCallActive && (
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

          {/* WiFi Calling indicator */}
          <p className="text-[10px] text-muted-foreground">
            WiFi Calling via Twilio
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
