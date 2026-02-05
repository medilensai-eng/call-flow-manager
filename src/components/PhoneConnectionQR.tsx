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
    // Use the published URL for phone access (works from any network)
    // Fallback to current origin for development
    const publishedUrl = 'https://tele-glide-app.lovable.app';
    const baseUrl = window.location.hostname.includes('localhost') 
      ? window.location.origin 
      : publishedUrl;
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
                Scan this QR code with your phone to connect
              </p>
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
              <span className="text-muted-foreground">Connection Code:</span>
              <code className="bg-muted px-2 py-1 rounded font-mono font-bold tracking-wider">
                {connection?.connection_code}
              </code>
            </div>

            <Badge variant="outline" className="w-full justify-center py-2">
              <WifiOff className="w-4 h-4 mr-2" />
              Waiting for phone connection...
            </Badge>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleRegenerate}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Generate New Code
            </Button>

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
          </div>
        )}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            {isConnected 
              ? 'Make calls using your connected phone. Calls will be recorded.'
              : 'Open the link on your phone to enable calling from your device.'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
