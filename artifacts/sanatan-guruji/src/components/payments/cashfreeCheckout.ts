type CashfreeCheckoutInstance = {
  checkout(options: { paymentSessionId: string; redirectTarget: "_self" }): Promise<unknown>;
};

declare global {
  interface Window {
    Cashfree?: (options: { mode: "sandbox" | "production" }) => CashfreeCheckoutInstance;
  }
}

let sdkLoad: Promise<void> | null = null;

async function loadCashfreeSdk() {
  if (window.Cashfree) return;
  if (!sdkLoad) {
    sdkLoad = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-cashfree-sdk="true"]');
      const script = existing ?? document.createElement("script");
      const fail = () => { sdkLoad = null; reject(new Error("Cashfree checkout could not be loaded. Please retry.")); };
      script.addEventListener("load", () => window.Cashfree ? resolve() : fail(), { once: true });
      script.addEventListener("error", fail, { once: true });
      if (!existing) {
        script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
        script.async = true;
        script.dataset.cashfreeSdk = "true";
        document.head.appendChild(script);
      }
    });
  }
  await sdkLoad;
}

export async function openCashfreeCheckout(paymentSessionId: string, mode: "test" | "live" | "unavailable") {
  if (!paymentSessionId) throw new Error("Cashfree did not provide a payment session.");
  if (mode === "unavailable") throw new Error("Cashfree checkout is not available in this environment.");
  await loadCashfreeSdk();
  const cashfree = window.Cashfree?.({ mode: mode === "live" ? "production" : "sandbox" });
  if (!cashfree) throw new Error("Cashfree checkout could not be initialized. Please retry.");
  await cashfree.checkout({ paymentSessionId, redirectTarget: "_self" });
}
