import { Link } from 'wouter';
import { Bell } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function NotificationBell({ userId }: { userId?: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: user } = useQuery<{id:number} | null>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me', {credentials:'include'});
      if (response.status === 401) return null;
      if (!response.ok) throw new Error('Unable to check account');
      return response.json();
    },
    enabled: !userId,
  });
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ['/api/notifications'], enabled: Boolean(userId || user?.id),
    refetchInterval: 10000, refetchIntervalInBackground: true,
  });
  const markAllRead = useMutation({
    mutationFn: () => apiRequest('PUT', '/api/notifications/read-all'),
    onSuccess: () => {
      queryClient.setQueryData<any[]>(['/api/notifications'], old => old?.map(n => ({...n,isRead:true})));
      queryClient.invalidateQueries({queryKey:['/api/notifications']});
    },
    onError: () => toast({title:'Could not mark notifications as read',variant:'destructive'}),
  });
  if (!userId && !user?.id) return null;
  const unread = notifications.filter(n => !n.isRead).length;
  return <Link href="/notifications">
    <Button aria-label="Open notifications and mark all as read" variant="ghost" size="icon"
      className="relative rounded-full" onClick={() => markAllRead.mutate()}>
      <Bell className="h-5 w-5" />
      {unread > 0 && <span data-testid="notification-unread-count" className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
    </Button>
  </Link>;
}
