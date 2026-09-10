import { useRouter } from "expo-router";
import { Platform } from "react-native";

export interface GatewayRedirectOptions {
  /** The gateway URL returned by the backend (e.g. SPG landing url). */
  payment_url?: string;
  /** Self-submitting HTML form, for gateways that return markup instead of a URL. */
  html?: string;
  /** Optional amount shown on the webview header / result screens. */
  amount?: string | number;
  /** Optional transaction/token identifier carried to result screens. */
  transaction_id?: string;
  /** Where to send the user after success/fail (defaults to home "/"). */
  returnPath?: string;
}

/**
 * Reusable payment-gateway redirect.
 *
 * - Web: redirects the whole window to the gateway URL.
 * - Native: opens the shared in-app WebView screen which detects
 *   success/failure and routes to `/payment/success` or `/payment/fail`.
 *
 * Keep this the single entry point for sending a user to a gateway so any
 * screen (open payment, student portal, etc.) behaves identically.
 */
export function usePaymentGateway() {
  const router = useRouter();

  return (opts: GatewayRedirectOptions) => {
    const { payment_url, html } = opts;
    if (!payment_url && !html) return;

    if (Platform.OS === "web") {
      // Prefer a direct URL; otherwise write the self-submitting form into
      // the document so it auto-posts to the gateway.
      if (payment_url) {
        window.location.href = payment_url;
      } else if (html) {
        document.open();
        document.write(html);
        document.close();
      }
      return;
    }

    router.push({
      pathname: "../payment/webview",
      params: {
        payment_url: payment_url ?? "",
        html: html ?? "",
        amount: opts.amount != null ? String(opts.amount) : "",
        transaction_id: opts.transaction_id ?? "",
        returnPath: opts.returnPath ?? "/",
      },
    });
  };
}
