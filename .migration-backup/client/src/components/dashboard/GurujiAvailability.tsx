import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Loader2, Plus, Trash2 } from 'lucide-react';

interface AvailabilityRule {
  id: number;
  date: string;
  startTime: string | null;
  endTime: string | null;
  isAvailable: boolean;
}

interface AvailabilityBooking {
  id: number;
  date: string;
  time: string;
  duration: number;
  status: string;
  pujaName: string;
}

interface AvailabilityResponse {
  isAvailable: boolean;
  rules: AvailabilityRule[];
  bookings: AvailabilityBooking[];
}

const IST = 'Asia/Kolkata';
const monthInIST = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  return `${parts.find(part => part.type === 'year')?.value}-${parts.find(part => part.type === 'month')?.value}`;
};

const monthLabel = (month: string) => {
  const [year, number] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: IST })
    .format(new Date(Date.UTC(year, number - 1, 1, 12)));
};

const dateLabel = (date: string, options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { ...options, timeZone: IST })
    .format(new Date(Date.UTC(year, month - 1, day, 12)));
};

const shiftMonth = (month: string, amount: number) => {
  const [year, number] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, number - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const dayString = (month: string, day: number) => `${month}-${String(day).padStart(2, '0')}`;

export default function GurujiAvailability() {
  const { toast } = useToast();
  const [month, setMonth] = useState(monthInIST);
  const [selectedDate, setSelectedDate] = useState(() => `${monthInIST()}-${new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: '2-digit' }).format(new Date())}`);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [newRuleAvailable, setNewRuleAvailable] = useState(true);

  const { data, isLoading, isError, refetch } = useQuery<AvailabilityResponse>({
    queryKey: ['/api/guruji/availability', month],
    queryFn: async () => {
      const response = await fetch(`/api/guruji/availability?month=${month}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Could not load your availability.');
      return response.json();
    },
  });

  const invalidateCalendar = () => queryClient.invalidateQueries({ queryKey: ['/api/guruji/availability'] });
  const globalMutation = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      const response = await apiRequest('PUT', '/api/guruji/availability', { isAvailable });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || 'Could not update availability.');
    },
    onSuccess: async () => { await invalidateCalendar(); toast({ title: 'Availability updated' }); },
    onError: (error: Error) => toast({ title: 'Could not update availability', description: error.message, variant: 'destructive' }),
  });

  const addRuleMutation = useMutation({
    mutationFn: async (rule: Omit<AvailabilityRule, 'id'>) => {
      const response = await apiRequest('POST', '/api/guruji/availability/rules', rule);
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || 'Could not save this time window.');
    },
    onSuccess: async () => {
      await invalidateCalendar();
      setStartTime('');
      setEndTime('');
      toast({ title: 'Calendar rule saved' });
    },
    onError: (error: Error) => toast({ title: 'Could not save rule', description: error.message, variant: 'destructive' }),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/guruji/availability/rules/${id}`);
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || 'Could not remove this rule.');
    },
    onSuccess: async () => { await invalidateCalendar(); toast({ title: 'Calendar rule removed' }); },
    onError: (error: Error) => toast({ title: 'Could not remove rule', description: error.message, variant: 'destructive' }),
  });

  const setRuleAvailability = (rule: AvailabilityRule, isAvailable: boolean) => addRuleMutation.mutate({
    date: rule.date,
    startTime: rule.startTime,
    endTime: rule.endTime,
    isAvailable,
  });

  const rules = data?.rules ?? [];
  const bookings = data?.bookings ?? [];
  const monthParts = month.split('-').map(Number);
  const daysCount = new Date(Date.UTC(monthParts[0], monthParts[1], 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(monthParts[0], monthParts[1] - 1, 1)).getUTCDay();
  const cells = useMemo(() => [
    ...Array.from({ length: (firstWeekday + 6) % 7 }, () => null),
    ...Array.from({ length: daysCount }, (_, index) => index + 1),
  ], [daysCount, firstWeekday]);
  const selectedRules = rules.filter(rule => rule.date === selectedDate);
  const selectedBookings = bookings.filter(booking => booking.date.slice(0, 10) === selectedDate && ['confirmed', 'in_progress'].includes(booking.status));
  const wholeDayRule = [...selectedRules].reverse().find(rule => !rule.startTime && !rule.endTime);
  const dayAvailable = wholeDayRule?.isAvailable ?? Boolean(data?.isAvailable);
  const today = monthInIST() === month
    ? new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: '2-digit' }).format(new Date())
    : '';

  const addRule = () => {
    if (!selectedDate) return;
    if (Boolean(startTime) !== Boolean(endTime)) {
      toast({ title: 'Complete the time window', description: 'Enter both a start and end time, or leave both blank for a whole-day rule.', variant: 'destructive' });
      return;
    }
    if (startTime && endTime <= startTime) {
      toast({ title: 'Check the time window', description: 'End time must be later than start time.', variant: 'destructive' });
      return;
    }
    addRuleMutation.mutate({
      date: selectedDate,
      startTime: startTime || null,
      endTime: endTime || null,
      isAvailable: newRuleAvailable,
    });
  };

  const toggleDay = () => addRuleMutation.mutate({
    date: selectedDate,
    startTime: null,
    endTime: null,
    isAvailable: !dayAvailable,
  });

  const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  if (isLoading) {
    return <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
      <Card><CardContent className="space-y-4 p-6"><div className="h-7 w-48 animate-pulse rounded bg-orange-100" /><div className="grid grid-cols-7 gap-2">{Array.from({ length: 35 }, (_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-orange-50" />)}</div></CardContent></Card>
      <Card><CardContent className="space-y-4 p-6"><div className="h-6 w-36 animate-pulse rounded bg-orange-100" /><div className="h-32 animate-pulse rounded-xl bg-orange-50" /></CardContent></Card>
    </div>;
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-orange-100 p-3 text-orange-800"><CalendarDays className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-orange-800">Your calendar</p>
              <h2 className="mt-1 text-xl font-semibold text-neutral-900">Set your puja availability</h2>
              <p className="mt-1 max-w-xl text-sm text-neutral-600">Choose when customers may request your services. Confirmed bookings stay reserved.</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-orange-200 bg-white/80 px-4 py-3 sm:min-w-[250px]">
            <div>
              <p className="text-sm font-semibold">Accept new bookings</p>
              <p className="text-xs text-neutral-500">{data?.isAvailable ? 'Your calendar is open' : 'Your calendar is closed'}</p>
            </div>
            <Switch checked={Boolean(data?.isAvailable)} onCheckedChange={value => globalMutation.mutate(value)} disabled={globalMutation.isPending} aria-label="Accept new bookings" />
          </div>
        </CardContent>
      </Card>

      {isError ? (
        <Card className="border-red-200"><CardContent className="flex flex-col items-center py-10 text-center">
          <AlertCircle className="mb-3 h-8 w-8 text-red-500" />
          <p className="font-semibold">Your calendar could not be loaded</p>
          <p className="mt-1 text-sm text-neutral-500">Check your connection and try again.</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>Try again</Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <Card className="border-orange-100">
            <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-orange-100 px-5 py-4">
              <div><CardTitle className="text-lg">{monthLabel(month)}</CardTitle><CardDescription>All dates use India Standard Time</CardDescription></div>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => setMonth(value => shiftMonth(value, -1))}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" aria-label="Next month" onClick={() => setMonth(value => shiftMonth(value, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-5">
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {weekdayNames.map(day => <div key={day} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{day}</div>)}
                {cells.map((day, index) => {
                  if (!day) return <div key={`blank-${index}`} />;
                  const date = dayString(month, day);
                  const dateRules = rules.filter(rule => rule.date === date);
                  const dateBookings = bookings.filter(booking => booking.date.slice(0, 10) === date && ['confirmed', 'in_progress'].includes(booking.status));
                  const wholeDay = [...dateRules].reverse().find(rule => !rule.startTime && !rule.endTime);
                  const isOpen = Boolean(data?.isAvailable) && (wholeDay?.isAvailable ?? true);
                  const isSelected = date === selectedDate;
                  return <button type="button" key={date} onClick={() => setSelectedDate(date)}
                    className={`relative min-h-[58px] rounded-lg border p-1.5 text-left transition-colors sm:min-h-[74px] sm:p-2 ${isSelected ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-300' : 'border-neutral-100 bg-white hover:border-orange-200'} ${!isOpen ? 'bg-neutral-50' : ''}`}
                    aria-pressed={isSelected} aria-label={`${dateLabel(date)}${dateBookings.length ? `, ${dateBookings.length} confirmed booking${dateBookings.length === 1 ? '' : 's'}` : ''}`}>
                    <span className={`text-sm font-semibold ${today === String(day).padStart(2, '0') ? 'text-orange-700' : 'text-neutral-800'}`}>{day}</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {dateBookings.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-blue-600" title="Confirmed booking" />}
                      {dateRules.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-orange-500" title="Availability rule" />}
                    </div>
                    <span className={`absolute bottom-1 right-1 hidden text-[9px] font-medium sm:block ${isOpen ? 'text-emerald-700' : 'text-neutral-400'}`}>{isOpen ? 'Open' : 'Off'}</span>
                  </button>;
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-blue-600" />Confirmed booking</span>
                <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-orange-500" />Custom rule</span>
                <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-emerald-600" />Accepting requests</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="border-orange-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{dateLabel(selectedDate)}</CardTitle>
                <CardDescription>Manage this date and any custom time windows.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-3">
                  <div><p className="text-sm font-medium">Available all day</p><p className="text-xs text-neutral-500">{data?.isAvailable ? (dayAvailable ? 'This date is open' : 'This date is closed') : 'Global availability is off'}</p></div>
                  <Switch checked={dayAvailable} onCheckedChange={toggleDay} disabled={!data?.isAvailable || addRuleMutation.isPending} aria-label="Toggle availability for selected day" />
                </div>

                <div className="space-y-3 rounded-lg border border-neutral-200 p-3">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-semibold">Add a time window</p><p className="text-xs text-neutral-500">Leave times blank to set the whole day.</p></div>
                    <Switch checked={newRuleAvailable} onCheckedChange={setNewRuleAvailable} aria-label="New time window available" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label htmlFor="availability-start" className="text-xs">From</Label><Input id="availability-start" type="time" value={startTime} onChange={event => setStartTime(event.target.value)} className="mt-1" /></div>
                    <div><Label htmlFor="availability-end" className="text-xs">Until</Label><Input id="availability-end" type="time" value={endTime} onChange={event => setEndTime(event.target.value)} className="mt-1" /></div>
                  </div>
                  <Button className="w-full" onClick={addRule} disabled={addRuleMutation.isPending}>
                    {addRuleMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Save calendar rule
                  </Button>
                </div>

                {selectedRules.length > 0 && <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Rules for this date</p>
                  {selectedRules.map(rule => <div key={rule.id} className="flex items-center gap-3 rounded-lg border border-neutral-100 px-3 py-2.5">
                    <div className={`rounded-md p-2 ${rule.isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}><Clock3 className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{rule.startTime && rule.endTime ? `${rule.startTime}–${rule.endTime}` : 'All day'}</p>
                      <p className="text-xs text-neutral-500">{rule.isAvailable ? 'Available' : 'Unavailable'}{!data?.isAvailable && rule.isAvailable ? ' · global calendar is off' : ''}</p>
                    </div>
                    <Switch checked={rule.isAvailable} onCheckedChange={checked => setRuleAvailability(rule, checked)} disabled={addRuleMutation.isPending} aria-label={`Set ${rule.startTime && rule.endTime ? `${rule.startTime} to ${rule.endTime}` : 'all-day'} rule ${rule.isAvailable ? 'unavailable' : 'available'}`} />
                    <Button variant="ghost" size="icon" aria-label="Remove calendar rule" onClick={() => deleteRuleMutation.mutate(rule.id)} disabled={deleteRuleMutation.isPending}>
                      {deleteRuleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>)}
                </div>}
              </CardContent>
            </Card>

            <Card className="border-blue-100">
              <CardHeader className="pb-3"><CardTitle className="text-base">Confirmed bookings</CardTitle><CardDescription>These reservations remain blocked regardless of availability rules.</CardDescription></CardHeader>
              <CardContent>
                {selectedBookings.length ? <div className="space-y-3">
                  {selectedBookings.map(booking => <div key={booking.id} className="flex items-start gap-3 border-t border-blue-50 pt-3 first:border-0 first:pt-0">
                    <div className="mt-0.5 rounded-md bg-blue-50 p-2 text-blue-700"><Check className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{booking.pujaName || 'Puja booking'}</p><p className="text-xs text-neutral-500">{booking.time} · {booking.duration} min</p></div>
                    <Badge variant="outline" className="border-blue-200 text-blue-800">Confirmed</Badge>
                  </div>)}
                </div> : <p className="rounded-lg bg-neutral-50 px-3 py-4 text-sm text-neutral-500">No confirmed bookings for this date.</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      <p className="text-xs text-neutral-500">Available exceptions can reopen a day that is otherwise closed, but cannot override your global switch or confirmed bookings.</p>
    </div>
  );
}
