import { useEffect, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetProviderRewardsQueryKey,
  getListAdminProviderRewardsQueryKey,
  useCreateProviderRewardOffer,
  useDeactivateProviderRewardOffer,
  useGetProviderRewards,
  useIssueProviderReward,
  useListAdminProviderRewards,
  useUpdateProviderRewardOffer,
} from '@workspace/api-client-react';
import type { ProviderRewardOffer, ProviderRewardOfferInput } from '@workspace/api-client-react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Award, Banknote, CalendarDays, Check, ChevronDown, ChevronUp, Gift, Loader2,
  RefreshCw, Star, Ticket, Users,
} from 'lucide-react';

const offerFormSchema = z.object({
  title: z.string().trim().min(1, 'Enter an offer title').max(120),
  description: z.string().max(1200),
  rewardType: z.enum(['cash_bonus', 'voucher', 'gift']),
  rewardLabel: z.string().trim().min(1, 'Describe the reward').max(120),
  rewardAmount: z.string(),
  audience: z.enum(['all', 'guruji', 'other_category']),
  windowDays: z.string().refine(value => Number(value) >= 1 && Number(value) <= 365, 'Use 1–365 days'),
  minCompletedBookings: z.string().refine(value => Number(value) >= 0 && Number(value) <= 10000, 'Use 0–10,000 bookings'),
  minAverageRating: z.string(),
  minRatingCount: z.string(),
  startsAt: z.string().min(1, 'Choose a start date'),
  endsAt: z.string().min(1, 'Choose an end date'),
  isActive: z.boolean(),
}).refine(value => value.endsAt >= value.startsAt, { message: 'End date must be on or after the start date', path: ['endsAt'] })
  .refine(value => !value.rewardAmount || Number(value.rewardAmount) >= 0, { message: 'Amount cannot be negative', path: ['rewardAmount'] })
  .refine(value => value.rewardType !== 'cash_bonus' || Number(value.rewardAmount) > 0, { message: 'Enter a cash bonus amount greater than zero', path: ['rewardAmount'] })
  .refine(value => !value.minAverageRating || (Number(value.minAverageRating) >= 1 && Number(value.minAverageRating) <= 5), { message: 'Rating must be between 1 and 5', path: ['minAverageRating'] })
  .refine(value => !value.minRatingCount || (Number(value.minRatingCount) >= 1 && Number(value.minRatingCount) <= 10000), { message: 'Rating count must be between 1 and 10,000', path: ['minRatingCount'] })
  .refine(value => !!value.minAverageRating || !value.minRatingCount, { message: 'A rating count needs an average-rating target', path: ['minRatingCount'] })
  .refine(value => Number(value.minCompletedBookings) > 0 || Number(value.minAverageRating) >= 1, { message: 'Set a booking or rating target', path: ['minCompletedBookings'] });

type OfferFormValues = z.infer<typeof offerFormSchema>;
type AdminProvider = {
  profileId: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  accountType: 'guruji' | 'other_category';
  categories: string[];
  completedBookings: number;
  averageRating: number;
  ratingCount: number;
  isEligible: boolean;
  awardStatus: 'none' | 'eligible' | 'issued';
  awardId: number | null;
  eligibleAt: string | null;
  issuedAt: string | null;
  fulfillmentReference: string | null;
};

const blankOffer: OfferFormValues = {
  title: '', description: '', rewardType: 'gift', rewardLabel: '', rewardAmount: '',
  audience: 'all', windowDays: '60', minCompletedBookings: '10',
  minAverageRating: '', minRatingCount: '',
  startsAt: (() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  })(),
  endsAt: '', isActive: true,
};

function offerToForm(offer: ProviderRewardOffer): OfferFormValues {
  return {
    title: offer.title, description: offer.description, rewardType: offer.rewardType,
    rewardLabel: offer.rewardLabel, rewardAmount: offer.rewardAmount == null ? '' : String(offer.rewardAmount),
    audience: offer.audience, windowDays: String(offer.windowDays),
    minCompletedBookings: String(offer.minCompletedBookings),
    minAverageRating: offer.minAverageRating == null ? '' : String(offer.minAverageRating),
    minRatingCount: offer.minRatingCount == null ? '' : String(offer.minRatingCount),
    startsAt: offer.startsAt.slice(0, 10), endsAt: offer.endsAt.slice(0, 10), isActive: offer.isActive,
  };
}

function toOfferInput(values: OfferFormValues): ProviderRewardOfferInput {
  return {
    ...values,
    rewardAmount: values.rewardAmount.trim() ? Number(values.rewardAmount) : null,
    windowDays: Number(values.windowDays),
    minCompletedBookings: Number(values.minCompletedBookings),
    minAverageRating: values.minAverageRating.trim() ? Number(values.minAverageRating) : null,
    minRatingCount: values.minRatingCount.trim() ? Number(values.minRatingCount) : null,
  };
}

function rewardKind(type: ProviderRewardOffer['rewardType']) {
  if (type === 'cash_bonus') return { label: 'Cash bonus', icon: Banknote, tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  if (type === 'voucher') return { label: 'Voucher', icon: Ticket, tone: 'bg-sky-50 text-sky-800 border-sky-200' };
  return { label: 'Gift', icon: Gift, tone: 'bg-amber-50 text-amber-900 border-amber-200' };
}

function rewardValue(offer: ProviderRewardOffer) {
  if ((offer.rewardType === 'cash_bonus' || offer.rewardType === 'voucher') && offer.rewardAmount != null) {
    return `₹${offer.rewardAmount.toLocaleString('en-IN')} · ${offer.rewardLabel}`;
  }
  return offer.rewardLabel;
}

function dateLabel(date: string) {
  return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function OfferEditor({ offer, open, onOpenChange, onSave, saving }: {
  offer: ProviderRewardOffer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: ProviderRewardOfferInput, offerId?: number) => void;
  saving: boolean;
}) {
  const form = useForm<OfferFormValues>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: offer ? offerToForm(offer) : blankOffer,
  });
  useEffect(() => {
    if (open) form.reset(offer ? offerToForm(offer) : blankOffer);
  }, [open, offer, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{offer ? 'Edit reward offer' : 'Create a reward offer'}</DialogTitle>
          <DialogDescription>
            Use a rolling performance window. If you set both booking and rating targets, providers must meet both.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(values => onSave(toOfferInput(values), offer?.id))} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem className="sm:col-span-2"><FormLabel>Offer title</FormLabel><FormControl><Input data-testid="input-reward-title" maxLength={120} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem className="sm:col-span-2"><FormLabel>Description</FormLabel><FormControl><Textarea data-testid="input-reward-description" maxLength={1200} rows={3} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="rewardType" render={({ field }) => (
                <FormItem><FormLabel>Reward type</FormLabel><FormControl><select data-testid="select-reward-type" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" {...field}>
                  <option value="cash_bonus">Cash bonus</option><option value="voucher">Voucher</option><option value="gift">Gift</option>
                </select></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="rewardLabel" render={({ field }) => (
                <FormItem><FormLabel>Reward details</FormLabel><FormControl><Input data-testid="input-reward-label" maxLength={120} placeholder="e.g. Recognition hamper" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              {(form.watch('rewardType') === 'cash_bonus' || form.watch('rewardType') === 'voucher') && <FormField control={form.control} name="rewardAmount" render={({ field }) => (
                <FormItem><FormLabel>{form.watch('rewardType') === 'cash_bonus' ? 'Cash bonus amount (₹)' : 'Voucher value (₹, optional)'}</FormLabel><FormControl><Input data-testid="input-reward-amount" type="number" min={form.watch('rewardType') === 'cash_bonus' ? '0.01' : '0'} step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />}
              <FormField control={form.control} name="audience" render={({ field }) => (
                <FormItem><FormLabel>Provider audience</FormLabel><FormControl><select data-testid="select-reward-audience" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" {...field}>
                  <option value="all">All approved providers</option><option value="guruji">Gurujis</option><option value="other_category">Other-category providers</option>
                </select></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="windowDays" render={({ field }) => (
                <FormItem><FormLabel>Rolling performance window (days)</FormLabel><FormControl><Input data-testid="input-reward-window" type="number" min="1" max="365" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="minCompletedBookings" render={({ field }) => (
                <FormItem><FormLabel>Completed bookings required</FormLabel><FormControl><Input data-testid="input-reward-bookings" type="number" min="0" max="10000" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="minAverageRating" render={({ field }) => (
                <FormItem><FormLabel>Minimum average rating (optional)</FormLabel><FormControl><Input data-testid="input-reward-rating" type="number" min="1" max="5" step="0.1" placeholder="No rating threshold" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="minRatingCount" render={({ field }) => (
                <FormItem><FormLabel>Minimum rating count (optional)</FormLabel><FormControl><Input data-testid="input-reward-rating-count" type="number" min="1" max="10000" placeholder="No count threshold" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="startsAt" render={({ field }) => (
                <FormItem><FormLabel>Starts</FormLabel><FormControl><Input data-testid="input-reward-start" type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="endsAt" render={({ field }) => (
                <FormItem><FormLabel>Ends</FormLabel><FormControl><Input data-testid="input-reward-end" type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0 sm:col-span-2"><FormControl><input data-testid="input-reward-active" type="checkbox" checked={field.value} onChange={field.onChange} className="h-4 w-4 accent-emerald-700" /></FormControl><FormLabel className="mt-0">Make offer active</FormLabel></FormItem>
              )} />
            </div>
            <DialogFooter>
              <Button data-testid="button-cancel-reward-edit" type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button data-testid="button-save-reward" type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{offer ? 'Save changes' : 'Create offer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function IssueDialog({ offer, provider, open, onOpenChange, onSubmit, saving }: {
  offer: ProviderRewardOffer | null;
  provider: AdminProvider | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (offerId: number, data: { profileId: number; fulfillmentReference: string; note?: string }) => void;
  saving: boolean;
}) {
  const schema = z.object({ fulfillmentReference: z.string().trim().min(1, 'Enter a fulfillment reference').max(240), note: z.string().max(1000) });
  const form = useForm<{ fulfillmentReference: string; note: string }>({
    resolver: zodResolver(schema), defaultValues: { fulfillmentReference: '', note: '' },
  });
  useEffect(() => {
    if (open) form.reset({ fulfillmentReference: '', note: '' });
  }, [open, form]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Record reward delivery</DialogTitle>
          <DialogDescription>This records an admin-confirmed delivery. It does not transfer money or purchase a voucher.</DialogDescription>
        </DialogHeader>
        {provider && offer && <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-sm">
          <p className="font-semibold text-stone-900">{provider.firstName} {provider.lastName}</p>
          <p className="text-stone-600">{offer.title} · {rewardValue(offer)}</p>
        </div>}
        <Form {...form}><form onSubmit={form.handleSubmit(values => {
          if (offer && provider) onSubmit(offer.id, {
            profileId: provider.profileId, fulfillmentReference: values.fulfillmentReference,
            ...(values.note.trim() ? { note: values.note.trim() } : {}),
          });
        })} className="space-y-4">
          <FormField control={form.control} name="fulfillmentReference" render={({ field }) => (
            <FormItem><FormLabel>Fulfillment reference</FormLabel><FormControl><Input data-testid="input-fulfillment-reference" maxLength={240} placeholder="Receipt, voucher code, or delivery record" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="note" render={({ field }) => (
            <FormItem><FormLabel>Note (optional)</FormLabel><FormControl><Textarea data-testid="input-fulfillment-note" maxLength={1000} rows={3} {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <DialogFooter><Button data-testid="button-cancel-reward-issue" type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button data-testid="button-confirm-issue" type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Record delivery</Button></DialogFooter>
        </form></Form>
      </DialogContent>
    </Dialog>
  );
}

function ProgressLines({ bookings, rating, ratingCount, offer }: {
  bookings: number; rating: number; ratingCount: number; offer: ProviderRewardOffer;
}) {
  const bookGoal = offer.minCompletedBookings;
  const ratingGoal = offer.minAverageRating;
  const countGoal = offer.minRatingCount;
  const progressRow = (label: string, value: number, goal: number, display: string, key: string) => (
    <div key={key} data-testid={`progress-${key}`} className="space-y-1.5">
      <div className="flex justify-between gap-4 text-sm"><span className="text-stone-600">{label}</span><span className="font-medium tabular-nums text-stone-900">{display}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-stone-200"><div className="h-full rounded-full bg-emerald-700 transition-[width]" style={{ width: `${Math.min(100, goal ? value / goal * 100 : 100)}%` }} /></div>
    </div>
  );
  return <div className="space-y-3">
    {bookGoal > 0 && progressRow('Completed bookings', bookings, bookGoal, `${bookings} / ${bookGoal}`, 'bookings')}
    {ratingGoal != null && progressRow('Average rating', rating, ratingGoal, `${rating.toFixed(1)} / ${ratingGoal.toFixed(1)} · ${ratingCount} ratings`, 'rating')}
    {countGoal != null && progressRow('Ratings received', ratingCount, countGoal, `${ratingCount} / ${countGoal}`, 'rating-count')}
  </div>;
}

export function ProviderRewards() {
  const { data, isLoading, isError, refetch } = useGetProviderRewards({ query: { queryKey: getGetProviderRewardsQueryKey() } });
  const offers = data?.offers ?? [];
  return (
    <div className="space-y-6" data-testid="provider-rewards">
      <section className="relative overflow-hidden rounded-2xl border border-emerald-900/10 bg-[#eef3e8] px-6 py-7 sm:px-9">
        <div className="absolute right-6 top-5 hidden h-20 w-20 items-center justify-center rounded-full border border-emerald-900/10 text-emerald-800/50 sm:flex"><Award className="h-9 w-9" /></div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Vaidik Dhara · Provider recognition</p>
        <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-stone-900">Rewards &amp; offers</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">Consistent service and thoughtful customer care deserve to be recognised. Track your progress toward current provider offers here.</p>
      </section>
      {isLoading ? <div className="grid gap-4 md:grid-cols-2">{[1, 2].map(item => <div key={item} className="h-56 animate-pulse rounded-xl border bg-stone-100" />)}</div>
        : isError ? <Card className="border-rose-200"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-6"><p role="alert" className="text-sm text-rose-800">Rewards could not be loaded right now.</p><Button data-testid="button-provider-rewards-retry" variant="outline" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button></CardContent></Card>
          : offers.length === 0 ? <Card className="border-dashed bg-[#faf9f5]"><CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-800"><Award className="h-7 w-7" /></div>
            <h3 className="font-serif text-xl font-semibold text-stone-900">No active offers at the moment</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-stone-600">New recognition offers will appear here when they are available to your provider account.</p>
          </CardContent></Card>
            : <div className="grid gap-4 lg:grid-cols-2">{offers.map(progress => {
              const { offer } = progress;
              const kind = rewardKind(offer.rewardType);
              const RewardIcon = kind.icon;
              const issued = progress.awardStatus === 'issued';
              const earned = progress.awardStatus === 'eligible' || issued;
              return <Card key={offer.id} data-testid={`card-provider-offer-${offer.id}`} className="overflow-hidden border-stone-200 bg-[#fffefa] shadow-sm">
                <CardHeader className="border-b border-stone-100 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><Badge className={`mb-3 border font-medium ${kind.tone}`}><RewardIcon className="mr-1.5 h-3.5 w-3.5" />{kind.label}</Badge>
                      <CardTitle className="font-serif text-xl text-stone-900" data-testid={`text-provider-offer-title-${offer.id}`}>{offer.title}</CardTitle>
                    </div>
                    <Badge data-testid={`status-provider-offer-${offer.id}`} className={issued ? 'bg-emerald-100 text-emerald-900' : earned ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-700'}>
                      {issued ? 'Delivered' : earned ? 'Earned' : 'In progress'}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm leading-6 text-stone-600">{offer.description || 'A recognition offer for reliable provider service.'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-[#f4f2ea] p-3">
                    <div><p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Offer reward</p><p className="mt-1 font-semibold text-stone-900">{rewardValue(offer)}</p></div>
                    <CalendarDays className="h-5 w-5 shrink-0 text-stone-500" aria-hidden="true" />
                    <span className="sr-only">Valid {dateLabel(offer.startsAt)} to {dateLabel(offer.endsAt)}</span>
                  </div>
                  <p className="text-xs text-stone-500" data-testid={`text-provider-offer-dates-${offer.id}`}>Valid {dateLabel(offer.startsAt)} – {dateLabel(offer.endsAt)} · {offer.windowDays}-day performance window</p>
                  <ProgressLines bookings={progress.completedBookings} rating={progress.averageRating} ratingCount={progress.ratingCount} offer={offer} />
                  {issued ? <div data-testid={`status-provider-issued-${offer.id}`} className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-semibold">Delivery recorded</p><p className="mt-0.5 text-emerald-800">{progress.fulfillmentReference || 'Your reward delivery has been recorded'}{progress.issuedAt ? ` · ${dateLabel(progress.issuedAt)}` : ''}</p></div>
                  </div> : earned ? <div data-testid={`status-provider-earned-${offer.id}`} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                    <p className="font-semibold">You have earned this reward</p><p className="mt-1 text-amber-900">The Vaidik Dhara team will record delivery once fulfillment is confirmed.</p>
                  </div> : null}
                </CardContent>
              </Card>;
            })}</div>}
      <p className="text-xs leading-5 text-stone-500">Reward progress is calculated from completed bookings and customer ratings. Any fulfillment is confirmed and recorded by Vaidik Dhara administrators.</p>
    </div>
  );
}

export function AdminProviderRewards() {
  const { user } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin === true;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useListAdminProviderRewards({ query: { queryKey: getListAdminProviderRewardsQueryKey() } });
  const createOffer = useCreateProviderRewardOffer();
  const updateOffer = useUpdateProviderRewardOffer();
  const deactivateOffer = useDeactivateProviderRewardOffer();
  const issueReward = useIssueProviderReward();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<ProviderRewardOffer | null>(null);
  const [expandedOffer, setExpandedOffer] = useState<number | null>(null);
  const [issueTarget, setIssueTarget] = useState<{ offer: ProviderRewardOffer; provider: AdminProvider } | null>(null);
  const savingOffer = createOffer.isPending || updateOffer.isPending;
  const refreshAdmin = () => queryClient.invalidateQueries({ queryKey: getListAdminProviderRewardsQueryKey() });

  const saveOffer = (input: ProviderRewardOfferInput, offerId?: number) => {
    const onSuccess = () => {
      void refreshAdmin();
      toast({ title: offerId ? 'Offer updated' : 'Offer created', description: 'Provider reward details have been saved.' });
      setEditorOpen(false);
      setEditingOffer(null);
    };
    const onError = (error: Error) => toast({ title: 'Could not save offer', description: error.message, variant: 'destructive' });
    if (offerId) updateOffer.mutate({ offerId, data: input }, { onSuccess, onError });
    else createOffer.mutate({ data: input }, { onSuccess, onError });
  };

  const toggleOffer = (offer: ProviderRewardOffer) => {
    if (offer.isActive) {
      deactivateOffer.mutate({ offerId: offer.id }, {
        onSuccess: () => { void refreshAdmin(); toast({ title: 'Offer deactivated', description: 'Existing earned rewards remain recorded.' }); },
        onError: (error: Error) => toast({ title: 'Could not deactivate offer', description: error.message, variant: 'destructive' }),
      });
    } else {
      const input = toOfferInput(offerToForm(offer));
      input.isActive = true;
      updateOffer.mutate({ offerId: offer.id, data: input }, {
        onSuccess: () => { void refreshAdmin(); toast({ title: 'Offer activated', description: 'The offer is active for its selected audience.' }); },
        onError: (error: Error) => toast({ title: 'Could not activate offer', description: error.message, variant: 'destructive' }),
      });
    }
  };

  const submitIssue = (offerId: number, input: { profileId: number; fulfillmentReference: string; note?: string }) => {
    issueReward.mutate({ offerId, data: input }, {
      onSuccess: () => {
        void refreshAdmin();
        queryClient.invalidateQueries({ queryKey: getGetProviderRewardsQueryKey() });
        toast({ title: 'Delivery recorded', description: 'The provider reward is now marked as issued.' });
        setIssueTarget(null);
      },
      onError: (error: Error) => toast({ title: 'Could not record delivery', description: error.message, variant: 'destructive' }),
    });
  };

  const offers = data?.offers ?? [];
  const providerCount = offers.reduce((sum, item) => sum + item.providers.length, 0);
  const eligibleCount = offers.reduce((sum, item) => sum + item.providers.filter(provider => provider.awardStatus === 'eligible').length, 0);

  return <div className="space-y-6" data-testid="admin-provider-rewards">
    <section className="flex flex-col justify-between gap-5 rounded-2xl border border-emerald-900/10 bg-[#eef3e8] p-6 sm:flex-row sm:items-end sm:px-8">
      <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Provider recognition</p>
        <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-stone-900">Rewards &amp; offers</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">Set clear service and rating thresholds, then track eligible providers and confirmed fulfillment.</p>
      </div>
      <Button data-testid="button-create-reward" onClick={() => { setEditingOffer(null); setEditorOpen(true); }}><Award className="mr-2 h-4 w-4" />Create offer</Button>
    </section>
    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="bg-[#fffefa]"><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-emerald-50 p-2 text-emerald-800"><Award className="h-5 w-5" /></div><div><p className="text-xs text-stone-500">Offers</p><p className="text-xl font-semibold tabular-nums text-stone-900" data-testid="text-reward-offer-count">{offers.length}</p></div></CardContent></Card>
      <Card className="bg-[#fffefa]"><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-sky-50 p-2 text-sky-800"><Users className="h-5 w-5" /></div><div><p className="text-xs text-stone-500">Provider progress records</p><p className="text-xl font-semibold tabular-nums text-stone-900" data-testid="text-reward-provider-count">{providerCount}</p></div></CardContent></Card>
      <Card className="bg-[#fffefa]"><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-amber-50 p-2 text-amber-900"><Star className="h-5 w-5" /></div><div><p className="text-xs text-stone-500">Awaiting fulfillment record</p><p className="text-xl font-semibold tabular-nums text-stone-900" data-testid="text-reward-eligible-count">{eligibleCount}</p></div></CardContent></Card>
    </div>
    {isLoading ? <div className="space-y-3" aria-label="Loading offers">{[0, 1, 2].map(key => <div key={key} className="h-36 animate-pulse rounded-xl border bg-stone-100" />)}</div>
      : isError ? <Card className="border-rose-200"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-6"><p role="alert" className="text-sm text-rose-800">Reward offers could not be loaded.</p><Button data-testid="button-admin-rewards-retry" variant="outline" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></CardContent></Card>
        : offers.length === 0 ? <Card className="border-dashed bg-[#faf9f5]"><CardContent className="flex flex-col items-center p-10 text-center"><Award className="mb-3 h-8 w-8 text-emerald-800" /><h3 className="font-serif text-xl font-semibold">No reward offers yet</h3><p className="mt-2 max-w-md text-sm text-stone-600">Create a first offer to establish a transparent path for providers to be recognised.</p><Button data-testid="button-empty-create-reward" className="mt-5" variant="outline" onClick={() => { setEditingOffer(null); setEditorOpen(true); }}>Create first offer</Button></CardContent></Card>
          : <div className="space-y-4">{offers.map(({ offer, providers }) => {
            const kind = rewardKind(offer.rewardType);
            const RewardIcon = kind.icon;
            const isExpanded = expandedOffer === offer.id;
            return <Card key={offer.id} data-testid={`card-admin-offer-${offer.id}`} className="overflow-hidden border-stone-200 bg-[#fffefa]">
              <CardHeader className="pb-4">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="flex items-start gap-3"><div className="mt-1 rounded-lg bg-[#f1eee4] p-2 text-emerald-900"><RewardIcon className="h-5 w-5" /></div>
                    <div><div className="flex flex-wrap items-center gap-2"><CardTitle className="font-serif text-xl">{offer.title}</CardTitle><Badge className={offer.isActive ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-100 text-stone-600'}>{offer.isActive ? 'Active' : 'Inactive'}</Badge><Badge variant="outline" className={kind.tone}>{kind.label}</Badge></div>
                      <CardDescription className="mt-1 max-w-3xl">{offer.description || 'No description provided.'}</CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button data-testid={`button-edit-offer-${offer.id}`} variant="outline" size="sm" onClick={() => { setEditingOffer(offer); setEditorOpen(true); }}>Edit</Button>
                    <Button data-testid={`button-toggle-offer-${offer.id}`} variant={offer.isActive ? 'outline' : 'default'} size="sm" disabled={deactivateOffer.isPending || updateOffer.isPending} onClick={() => toggleOffer(offer)}>{offer.isActive ? 'Deactivate' : 'Activate'}</Button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 rounded-lg bg-[#f6f4ed] p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div><p className="text-xs text-stone-500">Reward</p><p className="mt-1 font-semibold text-stone-900">{rewardValue(offer)}</p></div>
                  <div><p className="text-xs text-stone-500">Audience</p><p className="mt-1 font-medium text-stone-800">{offer.audience === 'all' ? 'All providers' : offer.audience === 'guruji' ? 'Gurujis' : 'Other-category providers'}</p></div>
                   <div><p className="text-xs text-stone-500">Performance window</p><p className="mt-1 font-medium text-stone-800">{offer.windowDays} rolling days{offer.minCompletedBookings > 0 ? ` · ${offer.minCompletedBookings} completed bookings` : ''}</p></div>
                  <div><p className="text-xs text-stone-500">Offer period</p><p className="mt-1 font-medium text-stone-800">{dateLabel(offer.startsAt)} – {dateLabel(offer.endsAt)}</p></div>
                  <div className="sm:col-span-2 lg:col-span-4"><p className="text-xs text-stone-500">Rating criteria</p><p className="mt-1 font-medium text-stone-800">{offer.minAverageRating == null ? 'No minimum average' : `${offer.minAverageRating.toFixed(1)} minimum average`}{offer.minRatingCount == null ? '' : ` · ${offer.minRatingCount} ratings required`}</p></div>
                </div>
              </CardHeader>
              <CardContent className="border-t border-stone-100 pt-4">
                <Button data-testid={`button-toggle-progress-${offer.id}`} variant="ghost" className="w-full justify-between px-0 text-stone-800 hover:bg-transparent" onClick={() => setExpandedOffer(isExpanded ? null : offer.id)} aria-expanded={isExpanded}>
                  <span className="flex items-center gap-2"><Users className="h-4 w-4" />Provider progress <Badge variant="secondary">{providers.length}</Badge></span>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                {isExpanded && <div className="mt-3 space-y-3">
                  {providers.length === 0 ? <p className="rounded-lg bg-stone-50 p-4 text-sm text-stone-600">No providers currently match this offer audience.</p> : providers.map(provider => {
                    const statusText = provider.awardStatus === 'issued' ? 'Issued' : provider.awardStatus === 'eligible' ? 'Earned · awaiting delivery record' : 'In progress';
                    const statusStyle = provider.awardStatus === 'issued' ? 'bg-emerald-100 text-emerald-900' : provider.awardStatus === 'eligible' ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-700';
                    return <div data-testid={`row-provider-progress-${offer.id}-${provider.profileId}`} key={provider.profileId} className="grid gap-4 rounded-xl border border-stone-200 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(230px,1.1fr)_auto] lg:items-center">
                      <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-stone-900">{provider.firstName} {provider.lastName}</p><Badge variant="outline">{provider.accountType === 'guruji' ? 'Guruji' : 'Other category'}</Badge><Badge className={statusStyle}>{statusText}</Badge></div>
                        <p className="mt-1 text-xs text-stone-500">{provider.email}{provider.categories?.length ? ` · ${provider.categories.join(', ')}` : ''}</p>
                      </div>
                      <div className="space-y-2 text-sm">
                         {offer.minCompletedBookings > 0 && <div className="flex justify-between gap-3"><span className="text-stone-600">Completed bookings</span><span className="font-medium tabular-nums">{provider.completedBookings} / {offer.minCompletedBookings}</span></div>}
                        {offer.minAverageRating != null && <div className="flex justify-between gap-3"><span className="text-stone-600">Average rating</span><span className="font-medium tabular-nums">{provider.averageRating.toFixed(1)} / {offer.minAverageRating.toFixed(1)} · {provider.ratingCount} ratings</span></div>}
                        {offer.minRatingCount != null && <div className="flex justify-between gap-3"><span className="text-stone-600">Ratings received</span><span className="font-medium tabular-nums">{provider.ratingCount} / {offer.minRatingCount}</span></div>}
                        {provider.fulfillmentReference && <p className="text-xs text-emerald-800">Reference: {provider.fulfillmentReference}</p>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        {provider.eligibleAt && <span className="text-xs text-stone-500">Earned {dateLabel(provider.eligibleAt)}</span>}
                        {provider.issuedAt && <span className="text-xs text-stone-500">Issued {dateLabel(provider.issuedAt)}</span>}
                        {isSuperAdmin && provider.awardStatus === 'eligible' && <Button data-testid={`button-issue-reward-${offer.id}-${provider.profileId}`} size="sm" onClick={() => setIssueTarget({ offer, provider })}>Record delivery</Button>}
                      </div>
                    </div>;
                  })}
                </div>}
              </CardContent>
            </Card>;
          })}</div>}
    <p className="text-xs leading-5 text-stone-500">Delivery records confirm a reward has been fulfilled. This admin tool does not initiate a payment or purchase a voucher.</p>
    <OfferEditor key={editingOffer?.id ?? 'new'} offer={editingOffer} open={editorOpen} onOpenChange={setEditorOpen} onSave={saveOffer} saving={savingOffer} />
    <IssueDialog offer={issueTarget?.offer ?? null} provider={issueTarget?.provider ?? null} open={!!issueTarget} onOpenChange={open => { if (!open) setIssueTarget(null); }} onSubmit={submitIssue} saving={issueReward.isPending} />
  </div>;
}

