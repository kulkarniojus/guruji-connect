import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageCircle, Send, CheckCircle2, Clock, Calendar,
  MapPin, BookOpen, Loader2, User
} from 'lucide-react';

function timeAgo(dateStr: string) {
  try {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

function QueryCard({ query, onReplied }: { query: any; onReplied: () => void }) {
  const { toast } = useToast();
  const [reply, setReply] = useState('');
  const [open, setOpen] = useState(false);

  const replyMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/admin/queries/${query.id}/reply`, { reply }),
    onSuccess: () => {
      toast({ title: 'Reply sent', description: 'The customer has been notified.' });
      setReply('');
      setOpen(false);
      onReplied();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const isAnswered = query.status === 'answered';

  return (
    <Card className={`border-l-4 ${isAnswered ? 'border-l-green-400' : 'border-l-amber-400'}`}>
      <CardContent className="p-5 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">{query.customer_name || 'Customer'}</p>
              {query.customer_mobile && (
                <p className="text-xs text-neutral-500">{query.customer_mobile}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={isAnswered ? 'outline' : 'secondary'}
              className={isAnswered ? 'border-green-500 text-green-700 bg-green-50' : 'bg-amber-100 text-amber-700 border-amber-300'}>
              {isAnswered ? <><CheckCircle2 className="h-3 w-3 mr-1" />Answered</> : <><Clock className="h-3 w-3 mr-1" />Open</>}
            </Badge>
            <span className="text-xs text-neutral-400">{timeAgo(query.created_at)}</span>
          </div>
        </div>

        {/* Booking context */}
        <div className="flex flex-wrap gap-3 text-xs text-neutral-500 bg-neutral-50 rounded-md px-3 py-2">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            Booking #{query.booking_id}
            {query.puja_name && ` · ${query.puja_name}`}
          </span>
          {query.booking_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(query.booking_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
          {query.booking_city && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {query.booking_city}
            </span>
          )}
        </div>

        {/* Customer message */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
          <p className="text-xs font-medium text-blue-600 mb-1">Customer message</p>
          <p className="text-sm text-neutral-800 leading-relaxed">{query.message}</p>
        </div>

        {/* Existing reply */}
        {isAnswered && query.admin_reply && (
          <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3">
            <p className="text-xs font-medium text-green-700 mb-1">
              Your reply
              {query.replied_at && <span className="font-normal text-green-600 ml-1">· {timeAgo(query.replied_at)}</span>}
            </p>
            <p className="text-sm text-neutral-800 leading-relaxed">{query.admin_reply}</p>
          </div>
        )}

        {/* Reply box */}
        {!isAnswered && (
          <div className="space-y-2">
            {open ? (
              <>
                <Textarea
                  placeholder="Type your reply to the customer..."
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => replyMutation.mutate()}
                    disabled={!reply.trim() || replyMutation.isPending}
                  >
                    {replyMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                    Send Reply
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setReply(''); }}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <Button size="sm" variant="outline" className="text-violet-700 border-violet-300 hover:bg-violet-50" onClick={() => setOpen(true)}>
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Reply
              </Button>
            )}
          </div>
        )}

        {/* Allow editing answer for answered queries */}
        {isAnswered && (
          <div className="space-y-2">
            {open ? (
              <>
                <Textarea
                  placeholder="Update your reply..."
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => replyMutation.mutate()}
                    disabled={!reply.trim() || replyMutation.isPending}
                  >
                    {replyMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                    Update Reply
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setReply(''); }}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <Button size="sm" variant="ghost" className="text-neutral-500 text-xs h-7" onClick={() => { setOpen(true); setReply(query.admin_reply || ''); }}>
                Edit reply
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CustomerQueriesTab() {
  const { data: queries = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['/api/admin/queries'],
    queryFn: async () => {
      const res = await fetch('/api/admin/queries', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load queries');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const openQueries = queries.filter(q => q.status === 'open');
  const answeredQueries = queries.filter(q => q.status === 'answered');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (queries.length === 0) {
    return (
      <div className="text-center py-20">
        <MessageCircle className="h-14 w-14 text-neutral-200 mx-auto mb-4" />
        <p className="text-neutral-500 font-medium text-lg">No customer queries yet</p>
        <p className="text-sm text-neutral-400 mt-1">Queries submitted by customers on their bookings will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Customer Queries</h2>
          <p className="text-sm text-neutral-500">Messages sent by customers about their bookings</p>
        </div>
        <div className="flex gap-2">
          {openQueries.length > 0 && (
            <Badge className="bg-amber-100 text-amber-700 border border-amber-300">
              {openQueries.length} open
            </Badge>
          )}
          {answeredQueries.length > 0 && (
            <Badge variant="outline" className="border-green-400 text-green-700">
              {answeredQueries.length} answered
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Open
            {openQueries.length > 0 && (
              <span className="ml-1 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {openQueries.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="answered" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Answered ({answeredQueries.length})
          </TabsTrigger>
          <TabsTrigger value="all">All ({queries.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4 space-y-3">
          {openQueries.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle2 className="h-10 w-10 text-green-300 mx-auto mb-2" />
              <p className="text-neutral-500">All queries have been answered!</p>
            </div>
          ) : (
            openQueries.map(q => <QueryCard key={q.id} query={q} onReplied={refetch} />)
          )}
        </TabsContent>

        <TabsContent value="answered" className="mt-4 space-y-3">
          {answeredQueries.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-neutral-400 text-sm">No answered queries yet.</p>
            </div>
          ) : (
            answeredQueries.map(q => <QueryCard key={q.id} query={q} onReplied={refetch} />)
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4 space-y-3">
          {queries.map(q => <QueryCard key={q.id} query={q} onReplied={refetch} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
