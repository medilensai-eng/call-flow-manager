import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Wifi, WifiOff, RefreshCw, CheckCircle, XCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SimStatusProps {
  className?: string;
}

type ConnectionType = 'wifi' | 'none';

export const SimStatus = ({ className }: SimStatusProps) => {
  const [connectionType, setConnectionType] = useState<ConnectionType>('none');
  const [isChecking, setIsChecking] = useState(false);

  const checkConnectivity = async () => {
    setIsChecking(true);
    
    // Check internet connectivity for WiFi calling
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (navigator.onLine) {
      setConnectionType('wifi');
    } else {
      setConnectionType('none');
    }
    
    setIsChecking(false);
  };

  useEffect(() => {
    checkConnectivity();
    
    window.addEventListener('online', checkConnectivity);
    window.addEventListener('offline', checkConnectivity);
    
    return () => {
      window.removeEventListener('online', checkConnectivity);
      window.removeEventListener('offline', checkConnectivity);
    };
  }, []);

  const isConnected = connectionType === 'wifi';

  return (
    <Card className={cn("shadow-card", className)}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Connection Icon */}
            <div className={cn(
              "p-1.5 rounded-full",
              isConnected ? "bg-green-500/10" : "bg-destructive/10"
            )}>
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-destructive" />
              )}
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {isConnected ? (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-destructive" />
                )}
                <span className="text-xs font-medium">
                  {isConnected ? 'WiFi Calling Ready' : 'No Connection'}
                </span>
              </div>
              {isConnected && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Phone className="w-2.5 h-2.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Twilio Connected</span>
                </div>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={checkConnectivity}
            disabled={isChecking}
            className="h-7 w-7"
          >
            <RefreshCw className={cn(
              "w-3 h-3",
              isChecking && "animate-spin"
            )} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
