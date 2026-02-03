import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Wifi, WifiOff, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SimStatusProps {
  className?: string;
}

type ConnectionType = 'sim' | 'wifi' | 'none';

export const SimStatus = ({ className }: SimStatusProps) => {
  const [connectionType, setConnectionType] = useState<ConnectionType>('none');
  const [isChecking, setIsChecking] = useState(false);
  const [wifiConnected, setWifiConnected] = useState(false);

  const checkConnectivity = async () => {
    setIsChecking(true);
    
    // Simulate system scan for SIM detection
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check network connection type
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      const type = connection.effectiveType || connection.type;
      // Check if it's cellular/mobile data (indicates SIM)
      if (connection.type === 'cellular' || type === '4g' || type === '3g' || type === '2g') {
        setConnectionType('sim');
      } else if (navigator.onLine) {
        // Online but not cellular - likely WiFi
        setConnectionType('wifi');
        setWifiConnected(true);
      } else {
        setConnectionType('none');
      }
    } else {
      // Fallback: just check if online
      if (navigator.onLine) {
        // Simulate SIM check - in real app this would use native APIs
        // For demo, randomly determine if SIM is present
        const hasSim = Math.random() > 0.5;
        if (hasSim) {
          setConnectionType('sim');
        } else {
          setConnectionType('wifi');
          setWifiConnected(true);
        }
      } else {
        setConnectionType('none');
      }
    }
    
    setIsChecking(false);
  };

  const connectWifiCalling = async () => {
    setIsChecking(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (navigator.onLine) {
      setWifiConnected(true);
      setConnectionType('wifi');
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

  const isConnected = connectionType !== 'none';

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
              {connectionType === 'sim' ? (
                <Smartphone className="w-4 h-4 text-green-500" />
              ) : connectionType === 'wifi' ? (
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
                  {connectionType === 'sim' && 'SIM Connected'}
                  {connectionType === 'wifi' && 'WiFi Calling'}
                  {connectionType === 'none' && 'Not Connected'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* WiFi Calling Button - show when no SIM */}
            {connectionType !== 'sim' && !wifiConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={connectWifiCalling}
                disabled={isChecking}
                className="h-7 text-xs px-2"
              >
                <Wifi className="w-3 h-3 mr-1" />
                WiFi Call
              </Button>
            )}

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
        </div>
      </CardContent>
    </Card>
  );
};
