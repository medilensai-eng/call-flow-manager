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
  User,
  Loader2,
  Smartphone,
  PhoneOutgoing,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCallRecording } from '@/hooks/useCallRecording';

interface PhoneDialerProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  customerName: string;
  customerId?: string;
  connectionId: string | null;
  isPhoneConnected: boolean;
}

type CallState = 'idle' | 'connecting' | 'ringing' | 'connected' | 'ended' | 'failed';

export const PhoneDialer = ({ 
  isOpen, 
  onClose, 
  phoneNumber, 
  customerName,
  customerId,
  connectionId,
  isPhoneConnected
}: PhoneDialerProps) => {
  const [callState, setCallState] = useState<CallState>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { isRecording, duration: recordingDuration, startRecording, stopRecording } = useCallRecording();

  useEffect(() => {
    if (isOpen) {
      setCallState('idle');
      setCallDuration(0);
      setIsMuted(false);
    }
    
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isOpen]);

  // Subscribe to phone events when call starts
  useEffect(() => {
    if (!connectionId || callState === 'idle') return;

    const channel = supabase.channel(`phone-call:${connectionId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'call-ended' }, async ({ payload }) => {
        console.log('Phone ended call:', payload);
        setCallState('ended');
        
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
        }
        
        // Stop recording
        if (isRecording) {
          await stopRecording();
        }
        
        toast.success(`Call ended - Duration: ${formatDuration(payload.duration || callDuration)}`);
        
        setTimeout(() => {
          setCallState('idle');
          setCallDuration(0);
        }, 2000);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionId, callState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCall = async () => {
    if (!isPhoneConnected || !connectionId) {
      toast.error('Please connect your phone first');
      return;
    }

    setCallState('connecting');

    try {
      // Send call request to phone
      const channel = supabase.channel(`phone-call:${connectionId}`);
      
      await channel.subscribe();
      
      await channel.send({
        type: 'broadcast',
        event: 'start-call',
        payload: {
          type: 'outgoing',
          customerName,
          customerPhone: phoneNumber,
          customerId,
        },
      });

      setCallState('connected');
      toast.success('Call started on your phone!');

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      // Start recording (we'll record the PC audio for now)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        await startRecording(stream, {
          customerId,
          customerName,
          customerPhone: phoneNumber,
          callType: 'outgoing',
        });
      } catch (err) {
        console.error('Could not start recording:', err);
      }

    } catch (err) {
      console.error('Call error:', err);
      setCallState('failed');
      toast.error('Failed to initiate call');
    }
  };

  const handleEndCall = async () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    // Notify phone to end call
    if (connectionId) {
      const channel = supabase.channel(`phone-call:${connectionId}`);
      await channel.subscribe();
      await channel.send({
        type: 'broadcast',
        event: 'end-call',
        payload: {},
      });
    }

    // Stop recording
    if (isRecording) {
      await stopRecording();
    }

    setCallState('ended');
    toast.info('Call ended');

    setTimeout(() => {
      setCallState('idle');
      setCallDuration(0);
    }, 2000);
  };

  const getCallStateText = () => {
    switch (callState) {
      case 'connecting': return 'Connecting to phone...';
      case 'ringing': return 'Ringing...';
      case 'connected': return formatDuration(callDuration);
      case 'ended': return 'Call Ended';
      case 'failed': return 'Call Failed';
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
        return;
      }
      onClose();
    }}>
      <DialogContent className="sm:max-w-[300px] p-4">
        <div className="flex flex-col items-center space-y-4">
          {/* Phone Connection Status */}
          {!isPhoneConnected && (
            <div className="w-full p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              <p className="text-xs text-yellow-600">
                Connect your phone first to make calls
              </p>
            </div>
          )}

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
            ) : callState === 'connected' ? (
              <PhoneOutgoing className="w-8 h-8 text-green-500" />
            ) : (
              <User className={cn(
                "w-8 h-8",
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

          {/* Recording Badge */}
          {isRecording && (
            <Badge variant="destructive" className="animate-pulse">
              <span className="w-2 h-2 bg-white rounded-full mr-2" />
              Recording
            </Badge>
          )}

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
            </div>
          )}

          {/* Call/End Call Button */}
          <div className="pt-2">
            {callState === 'idle' || callState === 'ended' || callState === 'failed' ? (
              <Button
                size="lg"
                className={cn(
                  "rounded-full h-14 w-14 shadow-lg",
                  isPhoneConnected 
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-gray-400 cursor-not-allowed"
                )}
                onClick={handleCall}
                disabled={!isPhoneConnected || callState === 'ended'}
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
              {callState === 'connected' ? 'On Call via Phone' : 'Connecting...'}
            </Badge>
          )}

          {/* Phone indicator */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Smartphone className="w-3 h-3" />
            {isPhoneConnected ? 'Connected via QR' : 'Phone not connected'}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
