import { MessageSquare, Phone, Smartphone, Instagram, Facebook, Mail, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Channel } from '@/lib/mockData';

interface ChannelIconProps {
  channel: string | Channel;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const channelConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  whatsapp: {
    icon: MessageSquare,
    color: 'text-green-500',
    bg: 'bg-green-100',
    label: 'WhatsApp',
  },
  sms: {
    icon: Phone,
    color: 'text-blue-500',
    bg: 'bg-blue-100',
    label: 'SMS',
  },
  rcs: {
    icon: Smartphone,
    color: 'text-purple-500',
    bg: 'bg-purple-100',
    label: 'RCS',
  },
  email: {
    icon: Mail,
    color: 'text-orange-500',
    bg: 'bg-orange-100',
    label: 'Email', 
  },
  voicebot: {
    icon: Mic,
    color: 'text-red-500',
    bg: 'bg-red-100',
    label: 'Voice Bot',
  },
  instagram: {
    icon: Instagram,
    color: 'text-pink-500',
    bg: 'bg-pink-100',
    label: 'Instagram',
  },
  facebook: {
    icon: Facebook,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    label: 'Facebook',
  },
};

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
};

export function ChannelIcon({ channel, className, size = 'md' }: ChannelIconProps) {
  const config = channelConfig[channel] || {
    icon: MessageSquare, // Fallback icon
    color: 'text-gray-500',
    bg: 'bg-gray-100',
    label: channel,
  };
  const Icon = config.icon;

  return (
    <div className={cn('inline-flex items-center justify-center rounded-full p-1', config.bg, className)}>
      <Icon className={cn(sizeClasses[size as keyof typeof sizeClasses], config.color)} />
    </div>
  );
}

export function ChannelBadge({ channel, className }: { channel: string; className?: string }) {
  const config = channelConfig[channel] || {
    icon: MessageSquare,
    color: 'text-gray-500',
    bg: 'bg-gray-100',
    label: channel,
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
      config.bg,
      config.color,
      className
    )}>
      <ChannelIcon channel={channel as Channel} size="sm" className="p-0 bg-transparent" />
      {config.label}
    </span>
  );
}

export { channelConfig };
