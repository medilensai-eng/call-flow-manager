import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimStatusProps {
  className?: string;
}

export const SimStatus = ({ className }: SimStatusProps) => {
  const isOnline = navigator.onLine;

  return (
    <Card className={cn("shadow-card", className)}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
            isOnline ? "bg-green-500/10" : "bg-destructive/10"
          )}>
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-destructive" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <span className={cn("font-medium text-sm", isOnline ? "text-green-500" : "text-destructive")}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
            <p className="text-xs text-muted-foreground">
              {isOnline ? 'Ready for calls' : 'No internet connection'}
            </p>
          </div>

          <Badge 
            variant="outline" 
            className={cn("text-xs shrink-0", isOnline && "border-green-500 text-green-500")}
          >
            {isOnline ? <><Wifi className="w-3 h-3 mr-1" /> Ready</> : <><WifiOff className="w-3 h-3 mr-1" /> Offline</>}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
