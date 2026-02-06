import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Smartphone, 
  Link2, 
  Link2Off, 
  Phone, 
  PhoneOff,
  Mic,
  MicOff,
  Loader2,
  CheckCircle2,
  XCircle,
  PhoneIncoming,
  PhoneOutgoing,
  Volume2,
  PhoneMissed,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'in_call';
type CallDirection = 'incoming' | 'outgoing';
type CallStage = 'requested' | 'active';

interface CallInfo {
  type: CallDirection;
  customerName: string;
  customerPhone: string;
  customerId?: string;
}

const PhoneConnect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [manualCode, setManualCode] = useState('');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [callStage, setCallStage] = useState<CallStage>('requested');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [showDialPad, setShowDialPad] = useState(false);
  const [dialNumber, setDialNumber] = useState('');
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const keepAliveRef = useRef<NodeJS.Timeout | null>(null);

  // Call backend function (bypasses DB RLS for anonymous phone)
  const invokePhoneConnection = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('phone-connection', {
      body: payload,
    });

    if (error) {
      console.error('[phone-connect] function error:', error);
      throw error;
    }

    return data as any;
  };

  // Connect using code
  const connect = async (connectionCode: string) => {
    setConnectionStatus('connecting');

    try {
      const deviceInfo = {
        device: navigator.userAgent.includes('iPhone')
          ? 'iPhone'
          : navigator.userAgent.includes('Android')
            ? 'Android'
            : 'Mobile',
        userAgent: navigator.userAgent,
        connectedAt: new Date().toISOString(),
      };

      const res = await invokePhoneConnection({
        action: 'connect',
        code: connectionCode.toUpperCase(),
        deviceInfo,
      });

      if (!res?.ok || !res?.connectionId || !res?.userId) {
        toast.error(res?.error || 'Invalid connection code');
        setConnectionStatus('disconnected');
        return;
      }

      setConnectionId(res.connectionId);
      setUserId(res.userId);
      setConnectionStatus('connected');
      toast.success('Connected to PC!');

      // Subscribe to call events
      subscribeToEvents(res.connectionId, res.userId);

      // Start keep-alive ping immediately
      startKeepAlive(res.connectionId);

      // Request microphone access
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
      } catch (err) {
        console.error('Microphone access denied:', err);
        toast.error('Microphone access required for calls');
      }
    } catch (err) {
      console.error('Connection error:', err);
      toast.error('Connection failed');
      setConnectionStatus('disconnected');
    }
  };

  // Start keep-alive ping
  const startKeepAlive = (connId: string) => {
    // Clear any existing interval
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
    }

    // Ping every 15 seconds
    keepAliveRef.current = setInterval(async () => {
      try {
        await invokePhoneConnection({ action: 'ping', connectionId: connId });
      } catch (e) {
        console.error('[phone-connect] ping failed:', e);
      }
    }, 15000);
  };

  // Subscribe to realtime events from PC
  const subscribeToEvents = (connId: string, userId: string) => {
    const channel = supabase.channel(`phone-call:${connId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'start-call' }, ({ payload }) => {
        console.log('Received call request:', payload);

        // Vibrate to notify user
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }

        // Reset any previous timers/state; recording should start on PC only after user confirms “Call Started”.
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }

        setCallInfo({
          type: payload.type || 'outgoing',
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          customerId: payload.customerId,
        });
        setCallStage('requested');
        setConnectionStatus('in_call');
        setCallDuration(0);

        toast.info(`Call request: ${payload.customerName}`, {
          description: 'Call phone par start karo, fir “Call Started” dabao',
        });
      })
      .on('broadcast', { event: 'end-call' }, () => {
        console.log('Call ended by PC');
        endCall();
      })
      .on('broadcast', { event: 'pc-disconnect' }, () => {
        console.log('PC disconnected');
        disconnect();
      })
      .subscribe();

    channelRef.current = channel;
  };

  const stopCallTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  const startCallTimer = () => {
    stopCallTimer();
    durationIntervalRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const openNativeDialer = (phone: string) => {
    const normalized = phone.replace(/[^\d+]/g, '');
    // This will open the device dialer; user still needs to confirm the call.
    window.location.href = `tel:${normalized}`;
  };

  const notifyPcCallStarted = () => {
    if (!callInfo) return;

    channelRef.current?.send({
      type: 'broadcast',
      event: 'call-started',
      payload: {
        direction: callInfo.type,
        customerId: callInfo.customerId,
        customerName: callInfo.customerName,
        customerPhone: callInfo.customerPhone,
        startedAt: new Date().toISOString(),
      },
    });

    setCallStage('active');
    setCallDuration(0);
    startCallTimer();

    toast.success('PC ko notify kar diya (recording start ho jayegi)');
  };

  // End current call
  const endCall = () => {
    stopCallTimer();

    // Notify PC that call ended
    channelRef.current?.send({
      type: 'broadcast',
      event: 'call-ended',
      payload: {
        duration: callDuration,
        callInfo,
      },
    });

    setCallInfo(null);
    setCallStage('requested');
    setCallDuration(0);
    setConnectionStatus('connected');
  };

  // Disconnect from PC
  const disconnect = async () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
    }

    if (connectionId) {
      try {
        await invokePhoneConnection({ action: 'disconnect', connectionId });
      } catch (e) {
        console.error('[phone-connect] disconnect failed:', e);
      }
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    setConnectionStatus('disconnected');
    setConnectionId(null);
    setCallInfo(null);
    setCallStage('requested');
    setCallDuration(0);
    toast.info('Disconnected from PC');
  };

  // Initiate incoming call (from phone to PC)
  const initiateIncomingCall = (callerName: string, callerPhone: string) => {
    if (!channelRef.current) return;

    // Incoming notification (PC will open the dialer UI)
    channelRef.current.send({
      type: 'broadcast',
      event: 'incoming-call',
      payload: {
        callerName,
        callerPhone,
        direction: 'incoming',
      },
    });

    // On phone UI, move to “requested” state. PC recording should only start after user taps “Answered”.
    stopCallTimer();
    setCallInfo({
      type: 'incoming',
      customerName: callerName,
      customerPhone: callerPhone,
    });
    setCallStage('requested');
    setConnectionStatus('in_call');
    setCallDuration(0);
  };

  // Quick dial from phone
  const handleQuickDial = () => {
    if (!dialNumber.trim()) {
      toast.error('Enter a phone number');
      return;
    }
    
    initiateIncomingCall('Unknown Caller', dialNumber);
    setShowDialPad(false);
    setDialNumber('');
  };

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-connect if code is in URL
  useEffect(() => {
    if (code) {
      connect(code);
    }
  }, [code]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display">
            Phone Connection
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {connectionStatus === 'disconnected' && (
            <>
              <p className="text-center text-muted-foreground">
                Enter the connection code from your PC or scan the QR code
              </p>
              
              <div className="space-y-3">
                <Label>Connection Code</Label>
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character code"
                  className="text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                />
              </div>

              <Button 
                className="w-full" 
                onClick={() => connect(manualCode)}
                disabled={manualCode.length < 6}
              >
                <Link2 className="w-4 h-4 mr-2" />
                Connect to PC
              </Button>
            </>
          )}

          {connectionStatus === 'connecting' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-muted-foreground">Connecting to PC...</p>
            </div>
          )}

          {connectionStatus === 'connected' && (
            <div className="space-y-4">
              <div className="text-center py-6 bg-green-500/10 rounded-lg border border-green-500/30">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <h3 className="font-semibold text-green-600 text-lg">Connected to PC</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Waiting for call requests...
                </p>
              </div>

              <Badge variant="outline" className="w-full justify-center py-3">
                <Volume2 className="w-4 h-4 mr-2" />
                Microphone Ready
              </Badge>

              {/* Quick Dial Section */}
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
                <Label className="text-sm font-medium">Quick Incoming Call</Label>
                <p className="text-xs text-muted-foreground">
                  Receiving a call? Tap below to notify PC
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Caller number"
                    value={dialNumber}
                    onChange={(e) => setDialNumber(e.target.value)}
                    className="font-mono"
                  />
                  <Button 
                    size="icon"
                    onClick={handleQuickDial}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <PhoneIncoming className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button 
                variant="destructive" 
                className="w-full"
                onClick={disconnect}
              >
                <Link2Off className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            </div>
          )}

          {connectionStatus === 'in_call' && callInfo && (
            <div className="space-y-4">
              {/* Call Header */}
              <div className={cn(
                "text-center py-6 rounded-lg border",
                callInfo.type === 'outgoing' 
                  ? "bg-blue-500/10 border-blue-500/30"
                  : "bg-green-500/10 border-green-500/30"
              )}>
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-background flex items-center justify-center">
                  {callInfo.type === 'outgoing' ? (
                    <PhoneOutgoing className="w-8 h-8 text-blue-500" />
                  ) : (
                    <PhoneIncoming className="w-8 h-8 text-green-500" />
                  )}
                </div>
                <Badge className="mb-2">
                  {callInfo.type === 'outgoing' ? 'Outgoing Call' : 'Incoming Call'}
                </Badge>
                <h3 className="font-semibold text-lg">{callInfo.customerName}</h3>
                <p className="text-muted-foreground font-mono">{callInfo.customerPhone}</p>
                <p className="text-2xl font-bold mt-3 font-mono">
                  {formatDuration(callDuration)}
                </p>
              </div>

              {/* Call Stage Actions */}
              {callStage === 'requested' && (
                <div className="space-y-2">
                  {callInfo.type === 'outgoing' && (
                    <Button className="w-full" onClick={() => openNativeDialer(callInfo.customerPhone)}>
                      <Phone className="w-4 h-4 mr-2" />
                      Open Dialer
                    </Button>
                  )}

                  <Button variant="secondary" className="w-full" onClick={notifyPcCallStarted}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {callInfo.type === 'outgoing' ? 'Call Started' : 'Answered'}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    {callInfo.type === 'outgoing'
                      ? 'Phone par call start karke yahan “Call Started” dabao.'
                      : 'Call utha liya? “Answered” dabao taaki PC recording start ho.'}
                  </p>
                </div>
              )}

              {/* Call Controls (only while active) */}
              {callStage === 'active' && (
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                      "rounded-full h-14 w-14",
                      isMuted && "bg-destructive/10 text-destructive border-destructive"
                    )}
                    onClick={() => {
                      const nextMuted = !isMuted;
                      setIsMuted(nextMuted);
                      if (localStreamRef.current) {
                        localStreamRef.current.getAudioTracks().forEach((track) => {
                          track.enabled = !nextMuted;
                        });
                      }
                    }}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </Button>

                  <Button
                    variant="destructive"
                    size="icon"
                    className="rounded-full h-16 w-16"
                    onClick={endCall}
                  >
                    <PhoneOff className="w-7 h-7" />
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                      "rounded-full h-14 w-14",
                      isSpeakerOn && "bg-primary/10 text-primary border-primary"
                    )}
                    onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                  >
                    <Volume2 className="w-6 h-6" />
                  </Button>
                </div>
              )}

              <p className="text-xs text-center text-muted-foreground">
                Use your phone's native dialer app to make/receive calls. 
                Audio from your PC will be recorded.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PhoneConnect;
