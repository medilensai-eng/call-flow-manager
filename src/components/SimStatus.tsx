import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Wifi, WifiOff, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePhoneConnection } from '@/hooks/usePhoneConnection';

interface SimStatusProps {
  className?: string;
}

export const SimStatus = ({ className }: SimStatusProps) => {
  const { isConnected, isLoading } = usePhoneConnection();
  const isOnline = navigator.onLine;

  const getStatus = () => {
    if (!isOnline) {
      return {
        status: 'offline',
        label: 'No Internet',
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        icon: WifiOff,
      };
    }
    
    if (isConnected) {
      return {
        status: 'connected',
        label: 'Phone Connected',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        icon: Smartphone,
      };
    }
    
    return {
      status: 'waiting',
      label: 'Scan QR to Connect',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      icon: QrCode,
    };
  };

  const statusInfo = getStatus();
  const StatusIcon = statusInfo.icon;

  if (isLoading) {
    return (
      <Card className={cn("shadow-card", className)}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            <div className="flex-1">
              <div className="h-3 w-20 bg-muted rounded animate-pulse mb-1" />
              <div className="h-2 w-16 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("shadow-card", className)}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
            statusInfo.bgColor
          )}>
            <StatusIcon className={cn("w-5 h-5", statusInfo.color)} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn("font-medium text-sm", statusInfo.color)}>
                {statusInfo.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {isConnected ? 'Ready for calls' : 'Connect phone to call'}
            </p>
          </div>

          <Badge 
            variant="outline" 
            className={cn(
              "text-xs shrink-0",
              isConnected && "border-green-500 text-green-500"
            )}
          >
            {isConnected ? (
              <>
                <Wifi className="w-3 h-3 mr-1" />
                Ready
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 mr-1" />
                Waiting
              </>
            )}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
