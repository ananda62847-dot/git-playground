import React, { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { requestNotificationPermission, type TokenContext } from '@/lib/notifications';

interface Props {
  ctx: TokenContext;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'sm' | 'default' | 'lg' | 'icon';
}

// Tap-to-enable button. Required for iOS PWA (must be a user gesture)
// and for browsers where the silent on-mount request was previously dismissed.
const EnableNotificationsButton: React.FC<Props> = ({
  ctx, className, variant = 'outline', size = 'sm',
}) => {
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>('default');
  const [lastError, setLastError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPerm('unsupported');
    } else {
      setPerm(Notification.permission);
    }
  }, []);

  if (perm === 'unsupported') return null;

  const onClick = async () => {
    setLoading(true);
    try {
      const result = await requestNotificationPermission(ctx);
      const next = result.permission ?? (typeof Notification !== 'undefined' ? Notification.permission : 'default');
      setPerm(result.ok ? 'granted' : next);
      if (result.ok) {
        setLastError(null);
        toast.success('Notifications enabled on this device');
      } else {
        setLastError(result.message || 'Notifications not enabled');
        toast.error(result.message || 'Notifications not enabled');
      }
    } finally {
      setLoading(false);
    }
  };

  const Icon = loading ? Loader2 : perm === 'granted' ? BellRing : perm === 'denied' ? BellOff : lastError ? Settings : Bell;
  const label = perm === 'granted' ? 'Notifications On' : perm === 'denied' ? 'Blocked' : 'Enable Alerts';

  return (
    <Button
      onClick={onClick}
      disabled={loading || perm === 'granted'}
      variant={variant}
      size={size}
      className={className}
      title={perm === 'denied' ? 'Open browser site settings to allow notifications' : lastError || label}
    >
      <Icon className={`w-4 h-4 ${loading ? 'animate-spin' : ''} ${size !== 'icon' ? 'mr-1.5' : ''}`} />
      {size !== 'icon' && <span className="text-xs">{label}</span>}
    </Button>
  );
};

export default EnableNotificationsButton;
