// src/screens/payments/PaymentWebView.tsx
import React, { useRef, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

// The WebView sees the gateway's terminal redirect URL (e.g.
// "paymentportal://payments/available_payment/fail?status=400&invoice=ACM...")
// directly as `navState.url` — even when the OS itself can't "open" that
// custom scheme (react-native-webview's own Linking.openURL fallback fails
// with "Can't open url" for non-http schemes). We don't need that fallback
// to succeed; we just read the query params straight off the URL string.
const parseQueryParams = (url: string): Record<string, string> => {
  const queryIndex = url.indexOf("?");
  if (queryIndex === -1) return {};
  const query = url.slice(queryIndex + 1);
  const result: Record<string, string> = {};
  query.split("&").forEach((pair) => {
    if (!pair) return;
    const [key, value = ""] = pair.split("=");
    if (!key) return;
    try {
      result[decodeURIComponent(key)] = decodeURIComponent(
        value.replace(/\+/g, " "),
      );
    } catch {
      result[key] = value;
    }
  });
  return result;
};

const PaymentWebView = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    payment_url: string;
    transaction_id: string;
    amount: string;
  }>();

  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [_canGoBack, setCanGoBack] = useState(false);
  const hasNavigatedRef = useRef(false);

  const { payment_url, transaction_id, amount } = params;

  // Check payment status periodically if needed
  // const { data: paymentStatus, refetch } = useCheckPaymentStatusQuery(
  //   { transaction_id },
  //   { skip: !transaction_id, pollingInterval: 10000 }, // Poll every 10 seconds
  // );

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);

    // onNavigationStateChange fires repeatedly (load start, redirects, load
    // end) for the same terminal URL — only act on the first match so we
    // don't call router.replace multiple times for one outcome.
    if (hasNavigatedRef.current) {
      setLoading(navState.loading);
      return;
    }

    const currentUrl = navState.url;
    const lowerUrl = currentUrl.toLowerCase();
    const queryParams = parseQueryParams(currentUrl);

    // These are example URLs - adjust based on your payment gateway
    if (lowerUrl.includes("success") || lowerUrl.includes("approved")) {
      // Payment successful
      hasNavigatedRef.current = true;
      router.replace({
        pathname: "/payments/available_payment/success",
        params: {
          transaction_id: queryParams.transaction_id || transaction_id,
          invoice_no: queryParams.invoice || "",
          amount_paid: queryParams.amount || amount,
          payment_date: new Date().toISOString(),
          message: "Payment completed successfully via payment gateway",
        },
      });
    } else if (lowerUrl.includes("fail") || lowerUrl.includes("cancel")) {
      // Payment failed or cancelled
      hasNavigatedRef.current = true;
      router.replace({
        pathname: "/payments/available_payment/fail",
        params: {
          status: queryParams.status || "",
          invoice: queryParams.invoice || "",
          transaction_id: queryParams.transaction_id || transaction_id,
          amount: queryParams.amount || amount,
          error_message: "Payment was cancelled or failed",
        },
      });
    }

    setLoading(navState.loading);
  };
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* WebView */}
      <View className="flex-1">
        <WebView
          ref={webViewRef}
          source={{ uri: payment_url }}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={(error) => {
            console.error("WebView error:", error);
            Alert.alert(
              "Connection Error",
              "Failed to load payment gateway. Please check your internet connection.",
              [
                {
                  text: "Try Again",
                  onPress: () => webViewRef.current?.reload(),
                },
                {
                  text: "Cancel",
                  onPress: () => router.back(),
                  style: "cancel",
                },
              ],
            );
          }}
          injectedJavaScript={`
            // Prevent zooming on mobile
            const meta = document.createElement('meta');
            meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
            meta.setAttribute('name', 'viewport');
            document.getElementsByTagName('head')[0].appendChild(meta);
          `}
        />
      </View>

      {/* Loading Overlay */}
      {loading && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center">
          <View className="bg-white rounded-xl p-6 items-center">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="mt-4 text-gray-700 font-medium">
              Loading payment gateway...
            </Text>
            <Text className="text-sm text-gray-500 mt-2">
              Please wait while we connect to the secure payment portal
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default PaymentWebView;
