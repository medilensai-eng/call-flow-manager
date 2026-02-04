import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PhoneConnection {
  id: string;
  connection_code: string;
  is_connected: boolean;
  phone_info: Record<string, any>;
  connected_at: string | null;
  last_seen_at: string;
}

export const usePhoneConnection = () => {
  const { user } = useAuth();
  const [connection, setConnection] = useState<PhoneConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Generate a unique 6-character code
  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Create or get existing connection
  const initConnection = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);

    // Check for existing active connection
    const { data: existing } = await supabase
      .from('phone_connections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      setConnection(existing as PhoneConnection);
      setIsConnected(existing.is_connected);
    } else {
      // Create new connection
      const code = generateCode();
      const { data: newConn, error } = await supabase
        .from('phone_connections')
        .insert({
          user_id: user.id,
          connection_code: code,
        })
        .select()
        .single();

      if (!error && newConn) {
        setConnection(newConn as PhoneConnection);
      }
    }

    setIsLoading(false);
  }, [user]);

  // Regenerate connection code
  const regenerateCode = async () => {
    if (!user || !connection) return;

    const newCode = generateCode();
    const { data, error } = await supabase
      .from('phone_connections')
      .update({
        connection_code: newCode,
        is_connected: false,
        phone_info: {},
        connected_at: null,
      })
      .eq('id', connection.id)
      .select()
      .single();

    if (!error && data) {
      setConnection(data as PhoneConnection);
      setIsConnected(false);
    }
  };

  // Disconnect phone
  const disconnect = async () => {
    if (!connection) return;

    const { error } = await supabase
      .from('phone_connections')
      .update({
        is_connected: false,
        phone_info: {},
        connected_at: null,
      })
      .eq('id', connection.id);

    if (!error) {
      setIsConnected(false);
      // Notify phone to disconnect
      channelRef.current?.send({
        type: 'broadcast',
        event: 'pc-disconnect',
        payload: { connectionId: connection.id },
      });
    }
  };

  // Subscribe to realtime changes
  useEffect(() => {
    if (!connection) return;

    const channel = supabase
      .channel(`phone-connection:${connection.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'phone_connections',
          filter: `id=eq.${connection.id}`,
        },
        (payload) => {
          const updated = payload.new as PhoneConnection;
          setConnection(updated);
          setIsConnected(updated.is_connected);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connection?.id]);

  // Initialize on mount
  useEffect(() => {
    initConnection();
  }, [initConnection]);

  return {
    connection,
    isConnected,
    isLoading,
    regenerateCode,
    disconnect,
    initConnection,
  };
};
