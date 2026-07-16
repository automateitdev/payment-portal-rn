// src/screens/payments/PaymentWebView.tsx
import React, { useState, useRef } from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

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

  const { payment_url, transaction_id, amount } = params;

  // Check payment status periodically if needed
  // const { data: paymentStatus, refetch } = useCheckPaymentStatusQuery(
  //   { transaction_id },
  //   { skip: !transaction_id, pollingInterval: 10000 }, // Poll every 10 seconds
  // );

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);

    // Check for success/failure URLs in the navigation
    const currentUrl = navState.url.toLowerCase();
    // These are example URLs - adjust based on your payment gateway
    if (currentUrl.includes("success") || currentUrl.includes("approved")) {
      // Payment successful
      router.replace({
        pathname: "/payments/available_payment/success",
        params: {
          transaction_id,
          amount_paid: amount,
          payment_date: new Date().toISOString(),
          message: "Payment completed successfully via payment gateway",
        },
      });
    } else if (currentUrl.includes("fail") || currentUrl.includes("cancel")) {
      // Payment failed or cancelled
      router.replace({
        pathname: "/payments/available_payment/fail",
        params: {
          transaction_id,
          amount,
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
