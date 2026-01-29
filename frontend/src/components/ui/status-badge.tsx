import { cn } from '@/lib/utils';

type StatusType = 'active' | 'paused' | 'draft' | 'open' | 'closed' | 'pending' | 'completed' | 'running' | 'scheduled' | 'connected' | 'disconnected' | 'approved' | 'rejected';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-success/10 text-success' },
  paused: { label: 'Paused', className: 'bg-warning/10 text-warning' },
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  open: { label: 'Open', className: 'bg-primary/10 text-primary' },
  closed: { label: 'Closed', className: 'bg-muted text-muted-foreground' },
  pending: { label: 'Pending', className: 'bg-warning/10 text-warning' },
  completed: { label: 'Completed', className: 'bg-success/10 text-success' },
  running: { label: 'Running', className: 'bg-primary/10 text-primary animate-pulse-subtle' },
  scheduled: { label: 'Scheduled', className: 'bg-secondary/10 text-secondary' },
  connected: { label: 'Connected', className: 'bg-success/10 text-success' },
  disconnected: { label: 'Not Connected', className: 'bg-muted text-muted-foreground' },
  approved: { label: 'Approved', className: 'bg-success/10 text-success' },
  rejected: { label: 'Rejected', className: 'bg-destructive/10 text-destructive' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
}
