import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Signal, SignalZero, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SimStatusProps {
  className?: string;
}

export const SimStatus = ({ className }: SimStatusProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [signalStrength, setSignalStrength] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnectivity = async () => {
    setIsChecking(true);
    
    // Simulate connectivity check
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Check network status
    const online = navigator.onLine;
    setIsConnected(online);
    
    // Simulate signal strength (1-4 bars)
    if (online) {
      setSignalStrength(Math.floor(Math.random() * 3) + 2); // 2-4 bars
    } else {
      setSignalStrength(0);
    }
    
    setIsChecking(false);
  };

  useEffect(() => {
    checkConnectivity();
    
    // Listen for online/offline events
    window.addEventListener('online', checkConnectivity);
    window.addEventListener('offline', checkConnectivity);
    
    return () => {
      window.removeEventListener('online', checkConnectivity);
      window.removeEventListener('offline', checkConnectivity);
    };
  }, []);

  const getSignalBars = () => {
    const bars = [];
    for (let i = 1; i <= 4; i++) {
      bars.push(
        <div
          key={i}
          className={cn(
            "w-1 rounded-sm transition-colors",
            i <= signalStrength ? "bg-green-500" : "bg-muted",
            i === 1 && "h-1",
            i === 2 && "h-2",
            i === 3 && "h-3",
            i === 4 && "h-4"
          )}
        />
      );
    }
    return bars;
  };

  return (
    <Card className={cn("shadow-card", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full",
              isConnected ? "bg-green-500/10" : "bg-destructive/10"
            )}>
              <Smartphone className={cn(
                "w-5 h-5",
                isConnected ? "text-green-500" : "text-destructive"
              )} />
            </div>
            
            <div>
              <p className="font-medium text-sm">SIM Status</p>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={isConnected ? "default" : "destructive"}
                  className={cn(
                    "text-xs",
                    isConnected && "bg-green-500 hover:bg-green-600"
                  )}
                >
                  {isConnected ? "Connected" : "Not Connected"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Signal Strength Indicator */}
            <div className="flex items-end gap-0.5 h-4">
              {isConnected ? getSignalBars() : (
                <SignalZero className="w-4 h-4 text-destructive" />
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={checkConnectivity}
              disabled={isChecking}
              className="h-8 w-8"
            >
              <RefreshCw className={cn(
                "w-4 h-4",
                isChecking && "animate-spin"
              )} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
