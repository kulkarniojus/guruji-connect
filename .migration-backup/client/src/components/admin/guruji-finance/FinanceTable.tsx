import { Children, type ReactNode } from 'react';

export function FinanceTable({ headers, children, empty }: { headers: string[]; children: ReactNode; empty: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-muted/45 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <tr>{headers.map(header => <th key={header} className="whitespace-nowrap px-4 py-3 font-semibold">{header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {children}
          </tbody>
        </table>
      </div>
      {Children.count(children) === 0 && <div className="p-8 text-center text-sm text-muted-foreground">{empty}</div>}
    </div>
  );
}

export function Cell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}
