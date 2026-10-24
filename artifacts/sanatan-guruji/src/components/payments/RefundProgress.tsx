import type { CustomerRefundProgress } from "@workspace/api-client-react";

type RefundStatusView = {
  title: string;
  detail: string;
  color: string;
};

function refundStatusView(refund: CustomerRefundProgress): RefundStatusView {
  if (refund.status === "pending") {
    return {
      title: "Awaiting admin review",
      detail: "The Sanatan Guruji support team is reviewing your refund.",
      color: "border-amber-300 bg-amber-50 text-amber-950",
    };
  }

  if (refund.status === "processing") {
    return {
      title: "Stripe refund processing",
      detail: "The refund is being returned to the original payment method.",
      color: "border-blue-300 bg-blue-50 text-blue-950",
    };
  }

  if (refund.status === "manual_pending") {
    return {
      title: refund.sourceKind === "mixed"
        ? "Stripe refund completed · manual payout pending"
        : "Manual payout pending",
      detail: "The support team will pay the manual portion outside this app and record it after settlement.",
      color: "border-amber-300 bg-amber-50 text-amber-950",
    };
  }

  if (refund.status === "paid") {
    const title = refund.sourceKind === "manual"
      ? "Manual payout paid"
      : refund.sourceKind === "mixed"
        ? "Stripe refund completed · manual payout paid"
        : "Stripe refund completed";
    return {
      title,
      detail: refund.manualReference ? `Payout reference: ${refund.manualReference}` : "Your refund is complete.",
      color: "border-green-300 bg-green-50 text-green-950",
    };
  }

  return {
    title: "Refund failed",
    detail: "The support team has been notified. Contact the Sanatan Guruji support team if you need help.",
    color: "border-red-300 bg-red-50 text-red-950",
  };
}

export default function RefundProgress({
  refund,
  testId,
}: {
  refund: CustomerRefundProgress;
  testId: string;
}) {
  const view = refundStatusView(refund);
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid={testId}
      className={`rounded-md border p-3 text-sm ${view.color}`}
    >
      <p className="font-semibold">Refund status: {view.title}</p>
      <p className="mt-1">{view.detail}</p>
    </div>
  );
}
