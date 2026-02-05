import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePhoneConnection } from '@/hooks/usePhoneConnection';
import { 
  Smartphone, 
  RefreshCw, 
  Wifi, 
  WifiOff,
  Loader2,
  Link2,
  Link2Off,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PhoneConnectionQRProps {
  className?: string;
}

export const PhoneConnectionQR = ({ className }: PhoneConnectionQRProps) => {
  const { 
    connection, 
    isConnected, 
    isLoading, 
    regenerateCode, 
    disconnect 
  } = usePhoneConnection();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    await regenerateCode();
    setIsRegenerating(false);
  };

  // Build the phone connection URL
  const getConnectionUrl = () => {
    if (!connection) return '';
    // Use the current origin - works for both preview and published URLs
    const baseUrl = window.location.origin;
    return `${baseUrl}/phone-connect?code=${connection.connection_code}`;
  };

  const copyLink = async () => {
    const url = getConnectionUrl();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied! Open it on your phone.');
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <Card className={cn("shadow-card", className)}>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("shadow-card", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Phone Connection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          // Connected State
          <div className="space-y-4">
            <div className="flex items-center justify-center p-6 bg-green-500/10 rounded-lg border border-green-500/30">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                  <Wifi className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="font-semibold text-green-600">Phone Connected!</h3>
                <p className="text-sm text-muted-foreground">
                  {connection?.phone_info?.device || 'Mobile Device'}
                </p>
              </div>
            </div>

            <Badge variant="outline" className="w-full justify-center py-2 border-green-500 text-green-600">
              <Link2 className="w-4 h-4 mr-2" />
              Connected & Ready for Calls
            </Badge>

            <Button 
              variant="destructive" 
              className="w-full"
              onClick={disconnect}
            >
              <Link2Off className="w-4 h-4 mr-2" />
              Disconnect Phone
            </Button>
          </div>
        ) : (
          // QR Code State
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Connect your phone to make calls
              </p>
            </div>

            {/* Instructions */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-xs text-blue-600 font-medium mb-2">📱 How to connect:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Copy the link below</li>
                <li>Open it in your phone's browser</li>
                <li>Enter the connection code</li>
              </ol>
            </div>

            <div className="flex justify-center p-4 bg-white rounded-lg">
              <QRCodeSVG 
                value={getConnectionUrl()} 
                size={180}
                level="M"
                includeMargin
              />
            </div>

            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-muted-foreground">Code:</span>
              <code className="bg-muted px-2 py-1 rounded font-mono font-bold tracking-wider">
                {connection?.connection_code}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={async () => {
                  await navigator.clipboard.writeText(connection?.connection_code || '');
                  toast.success('Code copied!');
                }}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>

            <Button 
              variant="secondary" 
              className="w-full"
              onClick={copyLink}
            >
              {copied ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {copied ? 'Copied!' : 'Copy Link for Phone'}
            </Button>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleRegenerate}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                New Code
              </Button>
            </div>

            <Badge variant="outline" className="w-full justify-center py-2">
              <WifiOff className="w-4 h-4 mr-2" />
              Waiting for connection...
            </Badge>
          </div>
        )}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            {isConnected 
              ? 'Make calls using your connected phone. Calls will be recorded.'
              : 'Scan QR or copy link. Open on phone browser (same WiFi network).'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
