import { AlertCircle, IndianRupee, Scale } from 'lucide-react';

export type GurujiCommissionSnapshot = {
  percentage: number;
  bookingAmount: number;
  portalAmount: number;
  gurujiAmount: number;
  source: string;
  configured: boolean;
  categoryName?: string | null;
} | null;

type GurujiCommissionNoticeProps = {
  snapshot: GurujiCommissionSnapshot | undefined;
  className?: string;
};

const money = (value: number) =>
  `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;

/**
 * Shows only the allocation saved on this booking. A missing snapshot is
 * intentionally not inferred from the booking amount or current commission settings.
 */
export default function GurujiCommissionNotice({ snapshot, className = '' }: GurujiCommissionNoticeProps) {
  if (!snapshot) {
    return (
      <section
        className={`rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-4 ${className}`}
        aria-label="Commission information"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          <div>
            <h4 className="font-semibold text-amber-950">Commission split not recorded</h4>
            <p className="mt-1 text-sm leading-5 text-amber-900">
              This booking has no saved commission breakdown. No Guruji share can be confirmed from this record.
              Please contact the Vaidik Dhara support team. Current settings are not applied retroactively.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const isZeroRate = Number(snapshot.percentage) === 0;

  return (
    <section
      className={`rounded-xl border border-teal-200 bg-teal-50/70 p-4 ${className}`}
      aria-label="Saved booking commission breakdown"
    >
      <div className="mb-3 flex items-center gap-2">
        <Scale className="h-4 w-4 text-teal-800" aria-hidden="true" />
        <h4 className="text-sm font-semibold text-teal-950">
          {snapshot.categoryName ? `${snapshot.categoryName} · saved commission split` : 'Saved booking breakdown'}
        </h4>
        <span className="ml-auto text-[11px] font-medium uppercase tracking-wide text-teal-800">Recorded</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-lg bg-white/75 p-3">
          <p className="text-xs text-teal-900/75">Customer total</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-teal-950">{money(snapshot.bookingAmount)}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-900">
            {isZeroRate ? 'Commission · 0%' : `Commission · ${snapshot.percentage}%`}
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-amber-950">
            {money(snapshot.portalAmount)}
          </p>
          <p className="text-xs leading-4 text-amber-900">
            {isZeroRate
              ? 'Zero commission payable to Vaidik Dhara'
              : 'Payable to Vaidik Dhara'}
          </p>
        </div>
        <div className="rounded-lg border border-teal-300 bg-teal-100/80 p-3">
          <p className="text-xs font-medium text-teal-900">Your saved share</p>
          <p className="mt-1 flex items-center gap-1 text-xl font-bold tabular-nums text-teal-950">
            <IndianRupee className="h-4 w-4" aria-hidden="true" />
            {Number(snapshot.gurujiAmount).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-teal-900">Remaining for you</p>
        </div>
      </div>
      {!isZeroRate && (
        <p className="mt-3 text-sm font-medium text-teal-950">
          {snapshot.percentage}% commission ({money(snapshot.portalAmount)}) must be paid to Vaidik Dhara
          from this booking amount. Your remaining share is {money(snapshot.gurujiAmount)}.
        </p>
      )}
      <p className="mt-3 text-xs leading-5 text-teal-950/80">
        These are the amounts saved for this booking. Accepting does not make a payment or transfer.
      </p>
    </section>
  );
}
