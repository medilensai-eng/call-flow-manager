import React from 'react';
import { cn } from '@/lib/utils';

type CallStatus = 
  | 'pending'
  | 'call_not_received'
  | 'call_disconnected'
  | 'invalid_number'
  | 'no_network'
  | 'call_connected'
  | 'interested'
  | 'not_interested';

interface StatusBadgeProps {
  status: CallStatus;
  className?: string;
}

const statusConfig: Record<CallStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  call_not_received: {
    label: 'Not Received',
    className: 'bg-muted text-muted-foreground border-muted',
  },
  call_disconnected: {
    label: 'Disconnected',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  invalid_number: {
    label: 'Invalid Number',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  no_network: {
    label: 'No Network',
    className: 'bg-muted text-muted-foreground border-muted',
  },
  call_connected: {
    label: 'Connected',
    className: 'bg-info/10 text-info border-info/20',
  },
  interested: {
    label: 'Interested',
    className: 'bg-success/10 text-success border-success/20',
  },
  not_interested: {
    label: 'Not Interested',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
};
