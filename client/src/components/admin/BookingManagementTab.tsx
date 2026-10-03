import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { bookingStatusLabel } from '@shared/bookingLifecycle';
import BookingProgressActions from '@/components/booking/BookingProgressActions';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, UserCheck, Send, Search, Calendar, MapPin, User, IndianRupee, RefreshCw, AlertTriangle } from 'lucide-react';
import { isUnassignedBooking } from '@shared/isUnassignedBooking';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  pending_approval: 'bg-orange-100 text-orange-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

interface BookingManagementTabProps {
  showUnassignedOnly?: boolean;
  onUnassignedFilterChange?: (show: boolean) => void;
}

export default function BookingManagementTab({
  showUnassignedOnly = false,
  onUnassignedFilterChange,
}: BookingManagementTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedGurujiId, setSelectedGurujiId] = useState<string>('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (showUnassignedOnly) setStatusFilter('all');
  }, [showUnassignedOnly]);

  const { data: bookings = [], isLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ['/api/admin/bookings'],
    queryFn: async () => {
      const res = await fetch('/api/admin/bookings', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch bookings');
      return res.json();
    },
    refetchInterval: 30000,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: verifiedGurujis = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/gurujis/verified'],
    queryFn: async () => {
      const res = await fetch('/api/admin/gurujis/verified', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: assignDialogOpen,
  });

  const assignMutation = useMutation({
    mutationFn: async ({ bookingId, gurujiId }: { bookingId: number; gurujiId: number }) => {
      return apiRequest('POST', `/api/admin/bookings/${bookingId}/assign`, { gurujiId });
    },
    onSuccess: () => {
      toast({ title: 'Request sent', description: 'The Guruji must accept before the booking is confirmed.' });
      setAssignDialogOpen(false);
      setSelectedBooking(null);
      setSelectedGurujiId('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to assign', description: err.message, variant: 'destructive' });
    },
  });

  const sendRequestsMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const response = await apiRequest('POST', `/api/admin/bookings/${bookingId}/send-requests`, {});
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({ title: 'Requests sent', description: data.message || 'Booking requests sent to eligible Gurujis in the selected location.' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to send requests', description: err.message, variant: 'destructive' });
    },
  });

  const filtered = bookings.filter((b) => {
    const matchesSearch =
      !search ||
      b.pujaName?.toLowerCase().includes(search.toLowerCase()) ||
      b.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      b.gurujiName?.toLowerCase().includes(search.toLowerCase()) ||
      String(b.id).includes(search);
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchesUnassigned = !showUnassignedOnly || isUnassignedBooking(b);
    return matchesSearch && matchesStatus && matchesUnassigned;
  }).sort((a, b) => {
    const dateDifference = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return Number.isFinite(dateDifference) && dateDifference !== 0 ? dateDifference : b.id - a.id;
  });

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => ['pending', 'pending_approval'].includes(b.status)).length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    unassigned: bookings.filter(isUnassignedBooking).length,
  };

  function openAssign(booking: any) {
    setSelectedBooking(booking);
    setSelectedGurujiId('');
    setAssignDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-700' },
          { label: 'Pending', value: stats.pending, color: 'text-yellow-600' },
          { label: 'Accepted by Guruji', value: stats.confirmed, color: 'text-blue-600' },
          { label: 'Completed', value: stats.completed, color: 'text-green-600' },
          { label: 'Active unassigned', value: stats.unassigned, color: 'text-red-600' },
        ].map((s) => (
          <Card key={s.label} className="text-center py-3 px-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bookings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Not yet accepted</SelectItem>
            <SelectItem value="pending_approval">Awaiting Guruji acceptance</SelectItem>
            <SelectItem value="confirmed">Accepted by Guruji</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant={showUnassignedOnly ? 'default' : 'outline'}
          className={showUnassignedOnly ? 'bg-amber-600 hover:bg-amber-700' : ''}
          onClick={() => onUnassignedFilterChange?.(!showUnassignedOnly)}
          aria-pressed={showUnassignedOnly}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          {showUnassignedOnly ? 'Showing unassigned' : 'Unassigned only'}
          {stats.unassigned > 0 && (
            <Badge className="ml-2 bg-red-600 text-white">{stats.unassigned}</Badge>
          )}
        </Button>
        <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : isError ? (
        <div role="alert" className="text-center py-16 text-red-700 border rounded-lg">
          Bookings could not be loaded. Please try Refresh.
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border rounded-lg">
          {bookings.length === 0 ? 'No bookings found in the system.' : 'No bookings match your search.'}
        </div>
      ) : (
        <ScrollArea className="h-[60vh]">
          <div className="space-y-3 pr-2">
            {filtered.map((booking) => (
              <Card
                key={booking.id}
                className={`hover:shadow-md transition-shadow ${isUnassignedBooking(booking) ? 'border-amber-300 bg-amber-50/40' : ''}`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    {/* Left: booking info */}
                    <div className="flex-1 space-y-2">
                      {isUnassignedBooking(booking) && (
                        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-100/70 px-3 py-2 text-sm text-amber-950">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                          <span>
                            <strong>Unassigned request.</strong> This puja still needs a Guruji. Sending a request does not mean it has been accepted.
                          </span>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm">#{booking.id}</span>
                        <span className="font-medium">{booking.pujaName}</span>
                        <Badge className={`text-xs ${STATUS_COLORS[booking.status] || 'bg-gray-100 text-gray-700'}`}>
                          {bookingStatusLabel(booking.status || '')}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 shrink-0" />
                          <span>Customer: <span className="text-foreground font-medium">{booking.customerName}</span></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="h-3.5 w-3.5 shrink-0" />
                          <span>Guruji: <span className={booking.gurujiName ? 'text-foreground font-medium' : 'text-red-500'}>
                            {booking.gurujiName || 'Not assigned'}
                          </span></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span>{booking.date ? new Date(booking.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date TBD'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>{booking.city || 'City not set'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <IndianRupee className="h-3.5 w-3.5 shrink-0" />
                          <span>₹{booking.amount || 0}</span>
                        </div>
                        {booking.requestCount > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Send className="h-3.5 w-3.5 shrink-0" />
                            <span>{booking.pendingRequestCount} pending / {booking.requestCount} requests sent</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: action buttons */}
                    <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                      <BookingProgressActions booking={booking} />
                      {['pending', 'pending_approval'].includes(booking.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-1.5 text-xs"
                        onClick={() => openAssign(booking)}
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                          Request Guruji
                      </Button>
                      )}
                      {!booking.gurujiId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1.5 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                          onClick={() => sendRequestsMutation.mutate(booking.id)}
                          disabled={sendRequestsMutation.isPending}
                        >
                          {sendRequestsMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          Send Requests
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Assign Guruji Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Guruji for Booking #{selectedBooking?.id}</DialogTitle>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <div><span className="text-muted-foreground">Puja:</span> <strong>{selectedBooking.pujaName}</strong></div>
                <div><span className="text-muted-foreground">Customer:</span> {selectedBooking.customerName}</div>
                <div><span className="text-muted-foreground">City:</span> {selectedBooking.city || 'Not set'}</div>
                <div><span className="text-muted-foreground">Date:</span> {selectedBooking.date ? new Date(selectedBooking.date).toLocaleDateString('en-IN') : 'TBD'}</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select Verified Guruji</label>
                {verifiedGurujis.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-2">No verified gurujis available.</div>
                ) : (
                  <Select value={selectedGurujiId} onValueChange={setSelectedGurujiId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a guruji..." />
                    </SelectTrigger>
                    <SelectContent>
                      {verifiedGurujis.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)}>
                          <div className="flex flex-col">
                            <span className="font-medium">{g.name}</span>
                            {g.city && <span className="text-xs text-muted-foreground">{g.city}</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={!selectedGurujiId || assignMutation.isPending}
              onClick={() => {
                if (selectedBooking && selectedGurujiId) {
                  assignMutation.mutate({ bookingId: selectedBooking.id, gurujiId: parseInt(selectedGurujiId) });
                }
              }}
            >
              {assignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
