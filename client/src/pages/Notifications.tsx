import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useIsMobile } from '@/hooks/use-mobile';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Bell, Calendar, CheckCircle, MessageCircle, CreditCard,
  Star, Trash2, Loader2, XCircle, RefreshCw, IndianRupee
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

function timeAgo(dateStr: string) {
  try {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

function getIcon(type: string) {
  switch (type) {
    case 'booking_confirmed': return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'booking_request': return <Calendar className="h-5 w-5 text-blue-500" />;
    case 'booking_cancelled':
    case 'cancellation_charge': return <XCircle className="h-5 w-5 text-red-500" />;
    case 'booking_expired':
    case 'booking_update': return <RefreshCw className="h-5 w-5 text-amber-500" />;
    case 'payment': return <IndianRupee className="h-5 w-5 text-green-500" />;
    case 'message': return <MessageCircle className="h-5 w-5 text-violet-500" />;
    case 'review': return <Star className="h-5 w-5 text-yellow-500" />;
    default: return <Bell className="h-5 w-5 text-neutral-500" />;
  }
}

function NotificationList({
  items,
  onMarkRead,
  onDelete,
  isPendingRead,
  isPendingDelete,
}: {
  items: any[];
  onMarkRead: (id: number) => void;
  onDelete: (id: number) => void;
  isPendingRead: boolean;
  isPendingDelete: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-14">
        <Bell className="h-12 w-12 text-neutral-200 mx-auto mb-3" />
        <p className="text-neutral-500 font-medium">No notifications here</p>
        <p className="text-sm text-neutral-400 mt-1">You're all caught up!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((n: any) => (
        <Card
          key={n.id}
          className={`cursor-pointer transition-colors ${!n.isRead ? 'border-l-4 border-l-primary bg-primary/5' : 'hover:bg-neutral-50'}`}
          onClick={() => !n.isRead && onMarkRead(n.id)}
        >
          <CardContent className="p-4 flex items-start gap-3">
            <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={`font-medium text-sm leading-snug ${!n.isRead ? 'text-primary' : 'text-neutral-800'}`}>
                  {n.title}
                  {!n.isRead && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-primary align-middle" />}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-neutral-400 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6 text-neutral-400 hover:text-red-500"
                    onClick={e => { e.stopPropagation(); onDelete(n.id); }}
                    disabled={isPendingDelete}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-neutral-600 mt-0.5 leading-relaxed">{n.message}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function NotificationsView({ mobile = false }: { mobile?: boolean }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('all');

  const { data: notifications = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => apiRequest('PUT', `/api/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest('PUT', '/api/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({ title: 'All notifications marked as read' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/notifications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/notifications'] }),
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const filteredList = activeTab === 'all'
    ? notifications
    : activeTab === 'unread'
    ? notifications.filter((n: any) => !n.isRead)
    : notifications.filter((n: any) => n.type?.startsWith(activeTab));

  return (
    <div className={mobile ? 'pb-14' : ''}>
      {/* Header */}
      <div className={mobile ? 'bg-primary text-white px-4 py-4' : 'flex items-center justify-between mb-6'}>
        <div className={mobile ? 'flex items-center justify-between' : ''}>
          <h1 className={`font-bold ${mobile ? 'text-xl text-white' : 'text-2xl'}`}>Notifications</h1>
          {unreadCount > 0 && (
            <Badge className={mobile ? 'bg-white text-primary ml-2' : 'ml-3 bg-primary text-white'}>
              {unreadCount} unread
            </Badge>
          )}
        </div>
        {!mobile && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => markAllReadMutation.mutate()} disabled={unreadCount === 0 || markAllReadMutation.isPending}>
              <CheckCircle className="h-4 w-4 mr-1.5" /> Mark all read
            </Button>
          </div>
        )}
      </div>

      <div className={mobile ? 'p-4' : ''}>
        {mobile && (
          <div className="flex justify-between mb-4">
            <Button variant="outline" size="sm" onClick={() => markAllReadMutation.mutate()} disabled={unreadCount === 0 || markAllReadMutation.isPending}>
              <CheckCircle className="h-4 w-4 mr-1.5" /> Mark all read
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`mb-4 ${mobile ? 'w-full grid grid-cols-3' : ''}`}>
              <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
              <TabsTrigger value="unread">
                Unread {unreadCount > 0 && <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5">{unreadCount}</span>}
              </TabsTrigger>
              <TabsTrigger value="booking">Bookings</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              <NotificationList
                items={filteredList}
                onMarkRead={(id) => markReadMutation.mutate(id)}
                onDelete={(id) => deleteMutation.mutate(id)}
                isPendingRead={markReadMutation.isPending}
                isPendingDelete={deleteMutation.isPending}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

export default function Notifications() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileLayout>
        <Helmet><title>Notifications - GurujiConnect</title></Helmet>
        <NotificationsView mobile={true} />
      </MobileLayout>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet><title>Notifications - GurujiConnect</title></Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <NotificationsView mobile={false} />
      </main>
      <Footer />
    </div>
  );
}
