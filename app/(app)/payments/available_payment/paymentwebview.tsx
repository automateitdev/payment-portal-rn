// src/screens/payments/PaymentWebView.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, WebViewNavigation } from "react-native-webview";

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
    ("FROM CURRENT URL ()", currentUrl);
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

// import React, { useState, useRef, useEffect } from "react";
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   SafeAreaView,
//   Alert,
//   BackHandler,
//   Platform,
//   Linking,
// } from "react-native";
// import { WebView, WebViewNavigation } from "react-native-webview";
// import { useLocalSearchParams, useRouter, Stack } from "expo-router";
// import { MaterialIcons, Ionicons } from "@expo/vector-icons";

// const PaymentWebView = () => {
//   const router = useRouter();
//   const params = useLocalSearchParams<{
//     payment_url: string;
//     transaction_id: string;
//     amount: string;
//   }>();

//   const webViewRef = useRef<WebView>(null);
//   const [loading, setLoading] = useState(true);
//   const [canGoBack, setCanGoBack] = useState(false);
//   const [paymentCompleted, setPaymentCompleted] = useState(false);
//   const [currentStage, setCurrentStage] = useState<
//     "initial" | "bank_page" | "otp" | "complete"
//   >("initial");

//   const { payment_url, transaction_id, amount } = params;

//   // SPG Web specific domains
//   const SPG_DOMAINS = [
//     "spgw.", // SPG Web gateway
//     "spgwebbuat.", // SPG Web UAT
//     "spgwebuat.",
//     "sonalibank.com",
//     "sonalibank.com.bd",
//     "sonalibankbd.com",
//     "merchant.spg.com.bd",
//     "payment.spg.com.bd",
//   ];

//   // SPG Web success indicators
//   const SPG_SUCCESS_INDICATORS = [
//     // URL patterns
//     "success",
//     "successful",
//     "approved",
//     "completed",
//     "thank",
//     "transactionid=",
//     "trxid=",
//     "status=success",
//     "response=success",

//     // Page content indicators (Bangla/English)
//     "ট্রানজেকশন সফল",
//     "অনুমোদিত",
//     "সফলভাবে সম্পন্ন",
//     "পেমেন্ট সফল",
//     "Payment Successful",
//     "Transaction Successful",
//     "Approved",
//     "Your payment was successful",
//   ];

//   const SPG_FAILURE_INDICATORS = [
//     // URL patterns
//     "fail",
//     "failed",
//     "error",
//     "cancel",
//     "cancelled",
//     "declined",
//     "rejected",
//     "status=fail",
//     "status=error",

//     // Page content indicators
//     "ব্যর্থ",
//     "বাতিল",
//     "অনুমোদন করা হয়নি",
//     "পেমেন্ট ব্যর্থ",
//     "Payment Failed",
//     "Transaction Failed",
//     "Declined",
//     "Cancelled",
//     "Your payment was not successful",
//   ];

//   useEffect(() => {
//     // Handle Android back button
//     const backHandler = BackHandler.addEventListener(
//       "hardwareBackPress",
//       () => {
//         if (canGoBack) {
//           webViewRef.current?.goBack();
//           return true;
//         } else {
//           Alert.alert(
//             "Exit Payment",
//             "Are you sure you want to exit? Your payment may not be completed.",
//             [
//               { text: "Continue Payment", style: "cancel" },
//               {
//                 text: "Exit Payment",
//                 style: "destructive",
//                 onPress: () => router.back(),
//               },
//             ],
//           );
//           return true;
//         }
//       },
//     );

//     return () => backHandler.remove();
//   }, [canGoBack, router]);

//   const handleNavigationStateChange = (navState: WebViewNavigation) => {
//     setCanGoBack(navState.canGoBack);
//     setLoading(navState.loading);

//     const currentUrl = navState.url.toLowerCase();
//     const currentTitle = navState.title?.toLowerCase() || "";

//     ("🔗 Current URL:", currentUrl);
//     ("📝 Current Title:", currentTitle);

//     // Detect which stage we're in
//     detectPaymentStage(currentUrl, currentTitle);

//     // Check if this is a payment completion page
//     checkForPaymentCompletion(currentUrl, currentTitle);
//   };

//   const detectPaymentStage = (url: string, title: string) => {
//     // Check if we're on SPG Web gateway
//     if (SPG_DOMAINS.some((domain) => url.includes(domain))) {
//       // Bank selection page
//       if (
//         url.includes("bank") ||
//         title.includes("bank") ||
//         title.includes("select")
//       ) {
//         setCurrentStage("bank_page");
//         ("🏦 Bank selection page");
//       }
//       // OTP/Verification page
//       else if (
//         url.includes("otp") ||
//         url.includes("verify") ||
//         title.includes("otp") ||
//         title.includes("verification")
//       ) {
//         setCurrentStage("otp");
//         ("🔐 OTP/Verification page");
//       }
//       // Completion page
//       else if (
//         url.includes("complete") ||
//         url.includes("response") ||
//         title.includes("complete") ||
//         title.includes("response")
//       ) {
//         setCurrentStage("complete");
//         ("✅ Payment completion page");
//       }
//     }
//   };

//   const checkForPaymentCompletion = (url: string, title: string) => {
//     // Don't check if payment already completed
//     if (paymentCompleted) return;

//     // Combine URL and title for checking
//     const content = `${url} ${title}`.toLowerCase();

//     // Check for SUCCESS indicators
//     const isSuccess = SPG_SUCCESS_INDICATORS.some((indicator) =>
//       content.includes(indicator.toLowerCase()),
//     );

//     // Check for FAILURE indicators
//     const isFailure = SPG_FAILURE_INDICATORS.some((indicator) =>
//       content.includes(indicator.toLowerCase()),
//     );

//     if (isSuccess) {
//       ("✅ SUCCESS detected!");
//       handlePaymentSuccess();
//     } else if (isFailure) {
//       ("❌ FAILURE detected!");
//       handlePaymentFailure();
//     }
//   };

//   const handlePaymentSuccess = () => {
//     if (paymentCompleted) return;

//     setPaymentCompleted(true);

//     // Stop the WebView
//     webViewRef.current?.stopLoading();

//     // Show success message
//     Alert.alert(
//       "Payment Successful!",
//       "Your payment has been processed successfully.",
//       [
//         {
//           text: "View Receipt",
//           onPress: () => {
//             router.replace({
//               pathname: "/payments/available_payment/success",
//               params: {
//                 transaction_id: transaction_id || `SPG_${Date.now()}`,
//                 amount_paid: amount,
//                 payment_date: new Date().toISOString(),
//                 message: "Payment completed via Sonali Bank SPG Web",
//                 bank: "Sonali Bank",
//                 payment_method: "Card/Bank Transfer",
//               },
//             });
//           },
//         },
//       ],
//       { cancelable: false },
//     );
//   };

//   const handlePaymentFailure = () => {
//     if (paymentCompleted) return;

//     setPaymentCompleted(true);

//     webViewRef.current?.stopLoading();

//     Alert.alert(
//       "Payment Failed",
//       "The payment was not completed. Please try again.",
//       [
//         {
//           text: "Try Again",
//           onPress: () => router.back(),
//         },
//         {
//           text: "Cancel",
//           onPress: () => {
//             router.replace({
//               pathname: "/payments/available_payment/fail",
//               params: {
//                 amount: amount,
//                 error_message: "Payment failed via Sonali Bank SPG Web",
//                 bank: "Sonali Bank",
//               },
//             });
//           },
//           style: "cancel",
//         },
//       ],
//     );
//   };

//   const injectedJavaScript = `
//     // Monitor page changes for SPG Web
//     (function() {
//       // 1. Monitor URL changes
//       const originalPushState = history.pushState;
//       const originalReplaceState = history.replaceState;

//       history.pushState = function() {
//         originalPushState.apply(this, arguments);
//         window.ReactNativeWebView.postMessage(
//           JSON.stringify({
//             type: 'URL_CHANGE',
//             url: window.location.href,
//             method: 'pushState'
//           })
//         );
//       };

//       history.replaceState = function() {
//         originalReplaceState.apply(this, arguments);
//         window.ReactNativeWebView.postMessage(
//           JSON.stringify({
//             type: 'URL_CHANGE',
//             url: window.location.href,
//             method: 'replaceState'
//           })
//         );
//       };

//       // 2. Monitor form submissions (common in SPG Web)
//       document.addEventListener('submit', function(e) {
//         const form = e.target;
//         window.ReactNativeWebView.postMessage(
//           JSON.stringify({
//             type: 'FORM_SUBMIT',
//             action: form.action,
//             method: form.method,
//             data: Array.from(new FormData(form).entries())
//           })
//         );
//       }, true);

//       // 3. Look for success/failure messages in page
//       function checkPageContent() {
//         const bodyText = document.body.innerText.toLowerCase();

//         // SPG Web success messages (Bangla/English)
//         const successMessages = [
//           'transaction successful',
//           'payment successful',
//           'approved',
//           'completed',
//           'সফল',
//           'অনুমোদিত',
//           'ট্রানজেকশন সফল',
//           'পেমেন্ট সফল'
//         ];

//         const failureMessages = [
//           'failed',
//           'declined',
//           'cancelled',
//           'error',
//           'ব্যর্থ',
//           'বাতিল',
//           'অনুমোদন করা হয়নি'
//         ];

//         // Check for messages
//         successMessages.forEach(msg => {
//           if (bodyText.includes(msg)) {
//             window.ReactNativeWebView.postMessage(
//               JSON.stringify({
//                 type: 'SUCCESS_MESSAGE',
//                 message: msg,
//                 fullText: bodyText.substring(0, 500)
//               })
//             );
//           }
//         });

//         failureMessages.forEach(msg => {
//           if (bodyText.includes(msg)) {
//             window.ReactNativeWebView.postMessage(
//               JSON.stringify({
//                 type: 'FAILURE_MESSAGE',
//                 message: msg,
//                 fullText: bodyText.substring(0, 500)
//               })
//             );
//           }
//         });

//         // Look for transaction ID
//         const transactionIdMatch = bodyText.match(/transaction[\\s-]*(id|no)[\\s:]*([a-z0-9-]+)/i);
//         if (transactionIdMatch) {
//           window.ReactNativeWebView.postMessage(
//             JSON.stringify({
//               type: 'TRANSACTION_ID',
//               id: transactionIdMatch[2]
//             })
//           );
//         }
//       }

//       // Run content check on page load
//       checkPageContent();

//       // Also check when DOM changes (SPG Web uses dynamic content)
//       const observer = new MutationObserver(checkPageContent);
//       observer.observe(document.body, {
//         childList: true,
//         subtree: true,
//         characterData: true
//       });

//       // Check every 2 seconds as well
//       setInterval(checkPageContent, 2000);

//       ('SPG Web monitoring initialized');
//     })();
//     true;
//   `;

//   const handleMessage = (event: any) => {
//     try {
//       const data = JSON.parse(event.nativeEvent.data);
//       ("📨 WebView Message:", data.type);

//       switch (data.type) {
//         case "SUCCESS_MESSAGE":
//           ("✅ Success message found:", data.message);
//           handlePaymentSuccess();
//           break;

//         case "FAILURE_MESSAGE":
//           ("❌ Failure message found:", data.message);
//           handlePaymentFailure();
//           break;

//         case "TRANSACTION_ID":
//           ("💰 Transaction ID found:", data.id);
//           break;

//         case "URL_CHANGE":
//           ("🔗 URL changed to:", data.url);
//           break;
//       }
//     } catch (error) {
//       ("Message parse error:", error);
//     }
//   };

//   const handleRefresh = () => {
//     webViewRef.current?.reload();
//   };

//   const handleOpenInBrowser = () => {
//     Linking.openURL(payment_url).catch((err) => {
//       Alert.alert("Error", "Could not open in browser");
//     });
//   };

//   return (
//     <SafeAreaView className="flex-1 bg-white">
//       <Stack.Screen
//         options={{
//           headerShown: false,
//         }}
//       />

//       {/* Custom Header */}
//       <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
//         <TouchableOpacity
//           onPress={() => {
//             if (paymentCompleted) {
//               router.back();
//             } else {
//               Alert.alert(
//                 "Exit Payment",
//                 "Are you sure you want to exit? Your payment may not be completed.",
//                 [
//                   { text: "Continue Payment", style: "cancel" },
//                   {
//                     text: "Exit",
//                     style: "destructive",
//                     onPress: () => router.back(),
//                   },
//                 ],
//               );
//             }
//           }}
//           className="p-2"
//         >
//           <Ionicons name="arrow-back" size={24} color="#374151" />
//         </TouchableOpacity>

//         <View className="flex-1 items-center">
//           <Text className="text-lg font-semibold text-gray-800">
//             Sonali Bank SPG Web
//           </Text>
//           <Text className="text-sm text-gray-600">
//             Amount: ৳ {parseFloat(amount || "0").toLocaleString()}
//           </Text>
//           {currentStage !== "initial" && (
//             <Text className="text-xs text-blue-600 mt-1">
//               {currentStage === "bank_page"
//                 ? "Select Bank"
//                 : currentStage === "otp"
//                   ? "Enter OTP"
//                   : currentStage === "complete"
//                     ? "Processing..."
//                     : ""}
//             </Text>
//           )}
//         </View>

//         <View className="flex-row items-center space-x-2">
//           <TouchableOpacity onPress={handleRefresh} className="p-2">
//             <Ionicons name="refresh" size={20} color="#374151" />
//           </TouchableOpacity>

//           <TouchableOpacity onPress={handleOpenInBrowser} className="p-2">
//             <Ionicons name="open-outline" size={20} color="#374151" />
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* WebView Container */}
//       <View className="flex-1 relative">
//         <WebView
//           ref={webViewRef}
//           source={{
//             uri: payment_url,
//             headers: {
//               Accept:
//                 "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
//               "Accept-Language": "en-US,en;q=0.9,bn;q=0.8",
//               "Cache-Control": "no-cache",
//             },
//           }}
//           onNavigationStateChange={handleNavigationStateChange}
//           onLoadStart={() => setLoading(true)}
//           onLoadEnd={() => setLoading(false)}
//           onLoadProgress={({ nativeEvent }) => {
//             if (nativeEvent.progress === 1) {
//               setLoading(false);
//             }
//           }}
//           onError={(syntheticEvent) => {
//             const { nativeEvent } = syntheticEvent;
//             console.error("WebView error:", nativeEvent);

//             if (!paymentCompleted) {
//               Alert.alert(
//                 "Connection Error",
//                 "Failed to connect to payment gateway. Please check your internet connection.",
//                 [
//                   {
//                     text: "Try Again",
//                     onPress: () => webViewRef.current?.reload(),
//                   },
//                   {
//                     text: "Cancel",
//                     onPress: () => router.back(),
//                     style: "cancel",
//                   },
//                 ],
//               );
//             }
//           }}
//           injectedJavaScript={injectedJavaScript}
//           onMessage={handleMessage}
//           javaScriptEnabled={true}
//           domStorageEnabled={true}
//           startInLoadingState={true}
//           scalesPageToFit={true}
//           mixedContentMode="always"
//           userAgent={
//             Platform.OS === "ios"
//               ? "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
//               : "Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
//           }
//           setSupportMultipleWindows={false}
//         />

//         {/* Loading Overlay */}
//         {loading && !paymentCompleted && (
//           <View className="absolute inset-0 bg-black/20 items-center justify-center">
//             <View className="bg-white rounded-xl p-6 items-center shadow-lg min-w-[200px]">
//               <ActivityIndicator size="large" color="#1e40af" />
//               <Text className="mt-4 text-gray-700 font-medium">
//                 {currentStage === "bank_page"
//                   ? "Loading bank selection..."
//                   : currentStage === "otp"
//                     ? "Loading verification..."
//                     : currentStage === "complete"
//                       ? "Processing payment..."
//                       : "Connecting to Sonali Bank..."}
//               </Text>
//               <Text className="text-sm text-gray-500 mt-2 text-center">
//                 Please do not close the app
//               </Text>
//             </View>
//           </View>
//         )}
//       </View>

//       {/* Payment Status Indicator */}
//       <View className="p-3 bg-blue-50 border-t border-blue-200">
//         <View className="flex-row items-center justify-between">
//           <View className="flex-row items-center">
//             <Ionicons name="shield-checkmark" size={16} color="#1e40af" />
//             <Text className="text-xs text-blue-700 ml-2">
//               Secure Sonali Bank Payment
//             </Text>
//           </View>

//           {!paymentCompleted && (
//             <View className="flex-row items-center">
//               <View
//                 className={`w-2 h-2 rounded-full mr-1 ${currentStage === "initial" ? "bg-blue-500" : "bg-green-500"}`}
//               />
//               <View
//                 className={`w-2 h-2 rounded-full mr-1 ${currentStage === "bank_page" ? "bg-blue-500" : currentStage === "otp" || currentStage === "complete" ? "bg-green-500" : "bg-gray-300"}`}
//               />
//               <View
//                 className={`w-2 h-2 rounded-full mr-1 ${currentStage === "otp" ? "bg-blue-500" : currentStage === "complete" ? "bg-green-500" : "bg-gray-300"}`}
//               />
//               <View
//                 className={`w-2 h-2 rounded-full ${currentStage === "complete" ? "bg-blue-500" : "bg-gray-300"}`}
//               />
//             </View>
//           )}
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// };

// export default PaymentWebView;
// ===============================================================================

// import React, { useState, useRef, useEffect } from "react";
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   Alert,
//   BackHandler,
//   Platform,
//   Linking,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { WebView, WebViewNavigation } from "react-native-webview";
// import { useLocalSearchParams, useRouter, Stack } from "expo-router";
// import { Ionicons } from "@expo/vector-icons";

// const PaymentWebView = () => {
//   const router = useRouter();
//   const params = useLocalSearchParams<{
//     payment_url: string;
//     transaction_id: string;
//     amount: string;
//   }>();

//   const webViewRef = useRef<WebView>(null);
//   const [loading, setLoading] = useState(true);
//   const [canGoBack, setCanGoBack] = useState(false);
//   const [paymentCompleted, setPaymentCompleted] = useState(false);
//   const [currentStage, setCurrentStage] = useState<
//     "initial" | "bank_page" | "otp" | "complete"
//   >("initial");
//   const [lastValidUrl, setLastValidUrl] = useState("");
//   const [isExternalRedirect, setIsExternalRedirect] = useState(false);

//   const { payment_url, transaction_id, amount } = params;

//   // SPG Web specific domains
//   const SPG_DOMAINS = [
//     "spgw.", // SPG Web gateway
//     "spgwebbuat.", // SPG Web UAT
//     "spgwebuat.",
//     "sonalibank.com",
//     "sonalibank.com.bd",
//     "sonalibankbd.com",
//     "merchant.spg.com.bd",
//     "payment.spg.com.bd",
//   ];

//   // SPG Web success indicators
//   const SPG_SUCCESS_INDICATORS = [
//     // URL patterns
//     "success",
//     "successful",
//     "approved",
//     "completed",
//     "thank",
//     "transactionid=",
//     "trxid=",
//     "status=success",
//     "response=success",
//     "payment/success",
//     "payment/response",
//     "payment/complete",

//     // Page content indicators (Bangla/English)
//     "ট্রানজেকশন সফল",
//     "অনুমোদিত",
//     "সফলভাবে সম্পন্ন",
//     "পেমেন্ট সফল",
//     "Payment Successful",
//     "Transaction Successful",
//     "Approved",
//     "Your payment was successful",
//   ];

//   const SPG_FAILURE_INDICATORS = [
//     // URL patterns
//     "fail",
//     "failed",
//     "error",
//     "cancel",
//     "cancelled",
//     "declined",
//     "rejected",
//     "status=fail",
//     "status=error",
//     "payment/fail",
//     "payment/error",
//     "payment/cancel",

//     // Page content indicators
//     "ব্যর্থ",
//     "বাতিল",
//     "অনুমোদন করা হয়নি",
//     "পেমেন্ট ব্যর্থ",
//     "Payment Failed",
//     "Transaction Failed",
//     "Declined",
//     "Cancelled",
//     "Your payment was not successful",
//   ];

//   useEffect(() => {
//     // Handle Android back button
//     const backHandler = BackHandler.addEventListener(
//       "hardwareBackPress",
//       () => {
//         if (canGoBack && !paymentCompleted) {
//           webViewRef.current?.goBack();
//           return true;
//         } else {
//           Alert.alert(
//             "Exit Payment",
//             "Are you sure you want to exit? Your payment may not be completed.",
//             [
//               { text: "Continue Payment", style: "cancel" },
//               {
//                 text: "Exit Payment",
//                 style: "destructive",
//                 onPress: () => router.back(),
//               },
//             ],
//           );
//           return true;
//         }
//       },
//     );

//     return () => backHandler.remove();
//   }, [canGoBack, paymentCompleted, router]);

//   const handleNavigationStateChange = (navState: WebViewNavigation) => {
//     const currentUrl = navState.url.toLowerCase();
//     const currentTitle = navState.title?.toLowerCase() || "";

//     ("🔗 Current URL:", currentUrl);
//     ("📝 Current Title:", currentTitle);

//     setCanGoBack(navState.canGoBack);
//     setLoading(navState.loading);

//     // Check if we're still within SPG domains
//     const isSPGUrl = SPG_DOMAINS.some((domain) => currentUrl.includes(domain));

//     // Check if this is a payment result page
//     const content = `${currentUrl} ${currentTitle}`.toLowerCase();
//     const isSuccessResult = SPG_SUCCESS_INDICATORS.some((indicator) =>
//       content.includes(indicator.toLowerCase()),
//     );
//     const isFailureResult = SPG_FAILURE_INDICATORS.some((indicator) =>
//       content.includes(indicator.toLowerCase()),
//     );

//     // Store the last valid SPG URL
//     if (isSPGUrl && !isSuccessResult && !isFailureResult) {
//       setLastValidUrl(currentUrl);
//     }

//     // CRITICAL: If we're being redirected away from SPG to external site
//     if (!isSPGUrl && !paymentCompleted) {
//       ("🚫 External redirect detected:", currentUrl);

//       if (isSuccessResult || isFailureResult) {
//         // This is a payment result page on external domain
//         ("🎯 Payment result on external domain");

//         // STOP the WebView immediately
//         webViewRef.current?.stopLoading();

//         // Show result in the app, not in WebView
//         if (isSuccessResult) {
//           handlePaymentSuccess();
//         } else if (isFailureResult) {
//           handlePaymentFailure();
//         }

//         return;
//       } else {
//         // Block any other external navigation
//         ("🛑 Blocking external navigation");
//         setIsExternalRedirect(true);

//         // Go back to last valid SPG URL
//         if (lastValidUrl) {
//           setTimeout(() => {
//             webViewRef.current?.injectJavaScript(`
//               window.location.href = '${lastValidUrl}';
//             `);
//           }, 100);
//         }

//         Alert.alert(
//           "Navigation Restricted",
//           "Please complete your payment within the secure payment gateway.",
//           [{ text: "OK" }],
//         );

//         return;
//       }
//     }

//     // Detect which stage we're in
//     detectPaymentStage(currentUrl, currentTitle);

//     // Check for payment completion
//     if (!paymentCompleted && (isSuccessResult || isFailureResult)) {
//       checkForPaymentCompletion(currentUrl, currentTitle);
//     }
//   };

//   const detectPaymentStage = (url: string, title: string) => {
//     // Check if we're on SPG Web gateway
//     if (SPG_DOMAINS.some((domain) => url.includes(domain))) {
//       // Bank selection page
//       if (
//         url.includes("bank") ||
//         title.includes("bank") ||
//         title.includes("select")
//       ) {
//         setCurrentStage("bank_page");
//         ("🏦 Bank selection page");
//       }
//       // OTP/Verification page
//       else if (
//         url.includes("otp") ||
//         url.includes("verify") ||
//         title.includes("otp") ||
//         title.includes("verification")
//       ) {
//         setCurrentStage("otp");
//         ("🔐 OTP/Verification page");
//       }
//       // Completion page
//       else if (
//         url.includes("complete") ||
//         url.includes("response") ||
//         title.includes("complete") ||
//         title.includes("response")
//       ) {
//         setCurrentStage("complete");
//         ("✅ Payment completion page");
//       }
//     }
//   };

//   const checkForPaymentCompletion = (url: string, title: string) => {
//     // Don't check if payment already completed
//     if (paymentCompleted) return;

//     // Combine URL and title for checking
//     const content = `${url} ${title}`.toLowerCase();

//     // Check for SUCCESS indicators
//     const isSuccess = SPG_SUCCESS_INDICATORS.some((indicator) =>
//       content.includes(indicator.toLowerCase()),
//     );

//     // Check for FAILURE indicators
//     const isFailure = SPG_FAILURE_INDICATORS.some((indicator) =>
//       content.includes(indicator.toLowerCase()),
//     );

//     if (isSuccess) {
//       ("✅ SUCCESS detected! Closing WebView...");
//       handlePaymentSuccess();
//     } else if (isFailure) {
//       ("❌ FAILURE detected! Closing WebView...");
//       handlePaymentFailure();
//     }
//   };

//   const handlePaymentSuccess = () => {
//     if (paymentCompleted) return;

//     setPaymentCompleted(true);
//     setCurrentStage("complete");

//     // Stop the WebView completely
//     webViewRef.current?.stopLoading();
//     webViewRef.current?.injectJavaScript(`
//       document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#f0f9ff;"><div style="text-align:center;"><h2 style="color:#059669;">Payment Successful!</h2><p>Redirecting back to app...</p></div></div>';
//     `);

//     // Show success message and navigate
//     setTimeout(() => {
//       Alert.alert(
//         "Payment Successful! 🎉",
//         `Your payment of ৳${parseFloat(amount || "0").toLocaleString()} has been processed successfully.`,
//         [
//           {
//             text: "View Receipt",
//             onPress: () => {
//               router.replace({
//                 pathname: "/payments/available_payment/success",
//                 params: {
//                   transaction_id: transaction_id || `SPG_${Date.now()}`,
//                   amount_paid: amount,
//                   payment_date: new Date().toISOString(),
//                   message: "Payment completed via Sonali Bank SPG Web",
//                   bank: "Sonali Bank",
//                   payment_method: "Card/Bank Transfer",
//                 },
//               });
//             },
//           },
//         ],
//         { cancelable: false },
//       );
//     }, 500);
//   };

//   const handlePaymentFailure = () => {
//     if (paymentCompleted) return;

//     setPaymentCompleted(true);

//     // Stop the WebView completely
//     webViewRef.current?.stopLoading();
//     webViewRef.current?.injectJavaScript(`
//       document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#fef2f2;"><div style="text-align:center;"><h2 style="color:#dc2626;">Payment Failed</h2><p>Redirecting back to app...</p></div></div>';
//     `);

//     // Show failure message and navigate
//     setTimeout(() => {
//       Alert.alert(
//         "Payment Failed",
//         "The payment was not completed. Please try again.",
//         [
//           {
//             text: "Try Again",
//             onPress: () => router.back(),
//           },
//           {
//             text: "Cancel",
//             onPress: () => {
//               router.replace({
//                 pathname: "/payments/available_payment/fail",
//                 params: {
//                   amount: amount,
//                   error_message: "Payment failed via Sonali Bank SPG Web",
//                   bank: "Sonali Bank",
//                 },
//               });
//             },
//             style: "cancel",
//           },
//         ],
//       );
//     }, 500);
//   };

//   const injectedJavaScript = `
//     // Intercept all link clicks to prevent external navigation
//     (function() {
//       // 1. Block all external link clicks
//       document.addEventListener('click', function(e) {
//         let target = e.target;

//         // Find the nearest anchor tag
//         while (target && target.tagName !== 'A') {
//           target = target.parentElement;
//         }

//         if (target && target.href) {
//           const href = target.href.toLowerCase();
//           const isSPG = ${JSON.stringify(SPG_DOMAINS)}.some(domain => href.includes(domain));

//           // Check if it's a success/failure page
//           const isSuccessPage = ${JSON.stringify(SPG_SUCCESS_INDICATORS)}.some(indicator =>
//             href.includes(indicator.toLowerCase())
//           );
//           const isFailurePage = ${JSON.stringify(SPG_FAILURE_INDICATORS)}.some(indicator =>
//             href.includes(indicator.toLowerCase())
//           );

//           // Allow SPG pages and success/failure pages
//           if (isSPG || isSuccessPage || isFailurePage) {
//             return true;
//           }

//           // Block external links
//           e.preventDefault();
//           e.stopPropagation();

//           window.ReactNativeWebView.postMessage(
//             JSON.stringify({
//               type: 'EXTERNAL_LINK_BLOCKED',
//               url: target.href
//             })
//           );

//           return false;
//         }
//       }, true);

//       // 2. Block form submissions to external sites
//       document.addEventListener('submit', function(e) {
//         const form = e.target;
//         if (form.action) {
//           const actionUrl = form.action.toLowerCase();
//           const isSPG = ${JSON.stringify(SPG_DOMAINS)}.some(domain => actionUrl.includes(domain));

//           if (!isSPG) {
//             e.preventDefault();

//             window.ReactNativeWebView.postMessage(
//               JSON.stringify({
//                 type: 'EXTERNAL_FORM_BLOCKED',
//                 action: form.action
//               })
//             );

//             return false;
//           }
//         }
//       }, true);

//       // 3. Monitor page changes
//       const originalPushState = history.pushState;
//       const originalReplaceState = history.replaceState;

//       history.pushState = function() {
//         originalPushState.apply(this, arguments);
//         window.ReactNativeWebView.postMessage(
//           JSON.stringify({
//             type: 'URL_CHANGE',
//             url: window.location.href,
//             method: 'pushState'
//           })
//         );
//       };

//       history.replaceState = function() {
//         originalReplaceState.apply(this, arguments);
//         window.ReactNativeWebView.postMessage(
//           JSON.stringify({
//             type: 'URL_CHANGE',
//             url: window.location.href,
//             method: 'replaceState'
//           })
//         );
//       };

//       // 4. Look for success/failure messages
//       function checkPageContent() {
//         const bodyText = document.body.innerText.toLowerCase();

//         const successMessages = [
//           'transaction successful',
//           'payment successful',
//           'approved',
//           'completed',
//           'সফল',
//           'অনুমোদিত',
//           'ট্রানজেকশন সফল',
//           'পেমেন্ট সফল'
//         ];

//         const failureMessages = [
//           'failed',
//           'declined',
//           'cancelled',
//           'error',
//           'ব্যর্থ',
//           'বাতিল',
//           'অনুমোদন করা হয়নি'
//         ];

//         // Check for success messages
//         successMessages.forEach(msg => {
//           if (bodyText.includes(msg)) {
//             window.ReactNativeWebView.postMessage(
//               JSON.stringify({
//                 type: 'SUCCESS_MESSAGE',
//                 message: msg,
//                 fullText: bodyText.substring(0, 500)
//               })
//             );
//           }
//         });

//         // Check for failure messages
//         failureMessages.forEach(msg => {
//           if (bodyText.includes(msg)) {
//             window.ReactNativeWebView.postMessage(
//               JSON.stringify({
//                 type: 'FAILURE_MESSAGE',
//                 message: msg,
//                 fullText: bodyText.substring(0, 500)
//               })
//             );
//           }
//         });

//         // Look for transaction ID
//         const transactionIdMatch = bodyText.match(/transaction[\\s-]*(id|no)[\\s:]*([a-z0-9-]+)/i);
//         if (transactionIdMatch) {
//           window.ReactNativeWebView.postMessage(
//             JSON.stringify({
//               type: 'TRANSACTION_ID',
//               id: transactionIdMatch[2]
//             })
//           );
//         }
//       }

//       // Run content check on page load
//       checkPageContent();

//       // Monitor DOM changes
//       const observer = new MutationObserver(checkPageContent);
//       observer.observe(document.body, {
//         childList: true,
//         subtree: true,
//         characterData: true
//       });

//       // Check every 2 seconds
//       setInterval(checkPageContent, 2000);

//       ('SPG Web protection initialized');
//     })();
//     true;
//   `;

//   const handleMessage = (event: any) => {
//     try {
//       const data = JSON.parse(event.nativeEvent.data);
//       ("📨 WebView Message:", data.type);

//       switch (data.type) {
//         case "SUCCESS_MESSAGE":
//           ("✅ Success message found:", data.message);
//           handlePaymentSuccess();
//           break;

//         case "FAILURE_MESSAGE":
//           ("❌ Failure message found:", data.message);
//           handlePaymentFailure();
//           break;

//         case "TRANSACTION_ID":
//           ("💰 Transaction ID found:", data.id);
//           break;

//         case "EXTERNAL_LINK_BLOCKED":
//         case "EXTERNAL_FORM_BLOCKED":
//           ("🚫 External action blocked:", data.url || data.action);
//           Alert.alert(
//             "Navigation Blocked",
//             "Please complete the payment within the secure payment gateway.",
//             [{ text: "OK" }],
//           );
//           break;
//       }
//     } catch (error) {
//       ("Message parse error:", error);
//     }
//   };

//   const handleRefresh = () => {
//     webViewRef.current?.reload();
//   };

//   const handleOpenInBrowser = () => {
//     Linking.openURL(payment_url).catch((err) => {
//       Alert.alert("Error", "Could not open in browser");
//     });
//   };

//   const handleClose = () => {
//     if (paymentCompleted) {
//       router.back();
//     } else {
//       Alert.alert(
//         "Exit Payment",
//         "Are you sure you want to exit? Your payment may not be completed.",
//         [
//           { text: "Continue Payment", style: "cancel" },
//           {
//             text: "Exit",
//             style: "destructive",
//             onPress: () => router.back(),
//           },
//         ],
//       );
//     }
//   };

//   return (
//     <SafeAreaView className="flex-1 bg-white">
//       <Stack.Screen
//         options={{
//           headerShown: false,
//         }}
//       />

//       {/* Custom Header */}
//       <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
//         <TouchableOpacity onPress={handleClose} className="p-2">
//           <Ionicons name="arrow-back" size={24} color="#374151" />
//         </TouchableOpacity>

//         <View className="flex-1 items-center">
//           <Text className="text-lg font-semibold text-gray-800">
//             Sonali Bank SPG Web
//           </Text>
//           <Text className="text-sm text-gray-600">
//             Amount: ৳ {parseFloat(amount || "0").toLocaleString()}
//           </Text>
//           {currentStage !== "initial" && (
//             <Text className="text-xs text-blue-600 mt-1">
//               {currentStage === "bank_page"
//                 ? "Select Bank"
//                 : currentStage === "otp"
//                   ? "Enter OTP"
//                   : currentStage === "complete"
//                     ? paymentCompleted
//                       ? "Completed"
//                       : "Processing..."
//                     : ""}
//             </Text>
//           )}
//         </View>

//         <View className="flex-row items-center space-x-2">
//           <TouchableOpacity onPress={handleRefresh} className="p-2">
//             <Ionicons name="refresh" size={20} color="#374151" />
//           </TouchableOpacity>

//           <TouchableOpacity onPress={handleOpenInBrowser} className="p-2">
//             <Ionicons name="open-outline" size={20} color="#374151" />
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* WebView Container */}
//       <View className="flex-1 relative">
//         <WebView
//           ref={webViewRef}
//           source={{
//             uri: payment_url,
//             headers: {
//               Accept:
//                 "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
//               "Accept-Language": "en-US,en;q=0.9,bn;q=0.8",
//               "Cache-Control": "no-cache",
//               "X-Frame-Options": "SAMEORIGIN",
//             },
//           }}
//           onNavigationStateChange={handleNavigationStateChange}
//           onLoadStart={() => setLoading(true)}
//           onLoadEnd={() => setLoading(false)}
//           onLoadProgress={({ nativeEvent }) => {
//             if (nativeEvent.progress === 1) {
//               setLoading(false);
//             }
//           }}
//           onError={(syntheticEvent) => {
//             const { nativeEvent } = syntheticEvent;
//             console.error("WebView error:", nativeEvent);

//             if (!paymentCompleted) {
//               Alert.alert(
//                 "Connection Error",
//                 "Failed to connect to payment gateway. Please check your internet connection.",
//                 [
//                   {
//                     text: "Try Again",
//                     onPress: () => webViewRef.current?.reload(),
//                   },
//                   {
//                     text: "Cancel",
//                     onPress: () => router.back(),
//                     style: "cancel",
//                   },
//                 ],
//               );
//             }
//           }}
//           injectedJavaScript={injectedJavaScript}
//           onMessage={handleMessage}
//           javaScriptEnabled={true}
//           domStorageEnabled={true}
//           startInLoadingState={true}
//           scalesPageToFit={true}
//           mixedContentMode="always"
//           userAgent={
//             Platform.OS === "ios"
//               ? "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
//               : "Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
//           }
//           setSupportMultipleWindows={false}
//           allowsBackForwardNavigationGestures={false}
//           overScrollMode="never"
//           bounces={false}
//           incognito={true}
//         />

//         {/* Loading Overlay */}
//         {loading && !paymentCompleted && (
//           <View className="absolute inset-0 bg-black/20 items-center justify-center">
//             <View className="bg-white rounded-xl p-6 items-center shadow-lg min-w-[200px]">
//               <ActivityIndicator size="large" color="#1e40af" />
//               <Text className="mt-4 text-gray-700 font-medium">
//                 {currentStage === "bank_page"
//                   ? "Loading bank selection..."
//                   : currentStage === "otp"
//                     ? "Loading verification..."
//                     : currentStage === "complete"
//                       ? "Processing payment..."
//                       : "Connecting to Sonali Bank..."}
//               </Text>
//               <Text className="text-sm text-gray-500 mt-2 text-center">
//                 Please do not close the app
//               </Text>
//             </View>
//           </View>
//         )}

//         {/* Blocked Navigation Overlay */}
//         {isExternalRedirect && !paymentCompleted && (
//           <View className="absolute inset-0 bg-white items-center justify-center">
//             <View className="p-6 items-center">
//               <Ionicons name="warning" size={48} color="#f59e0b" />
//               <Text className="text-lg font-semibold text-gray-800 mt-4">
//                 Navigation Blocked
//               </Text>
//               <Text className="text-gray-600 text-center mt-2">
//                 Please complete your payment within the secure payment gateway.
//               </Text>
//               <TouchableOpacity
//                 onPress={() => {
//                   setIsExternalRedirect(false);
//                   if (lastValidUrl) {
//                     webViewRef.current?.injectJavaScript(`
//                       window.location.href = '${lastValidUrl}';
//                     `);
//                   }
//                 }}
//                 className="mt-6 bg-blue-600 px-6 py-3 rounded-lg"
//               >
//                 <Text className="text-white font-medium">
//                   Return to Payment
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         )}
//       </View>

//       {/* Payment Status Indicator */}
//       <View className="p-3 bg-blue-50 border-t border-blue-200">
//         <View className="flex-row items-center justify-between">
//           <View className="flex-row items-center">
//             <Ionicons
//               name={paymentCompleted ? "checkmark-circle" : "shield-checkmark"}
//               size={16}
//               color={paymentCompleted ? "#059669" : "#1e40af"}
//             />
//             <Text className="text-xs text-blue-700 ml-2">
//               {paymentCompleted
//                 ? "Payment Completed"
//                 : "Secure Sonali Bank Payment"}
//             </Text>
//           </View>

//           {!paymentCompleted && (
//             <View className="flex-row items-center">
//               <View
//                 className={`w-2 h-2 rounded-full mr-1 ${currentStage === "initial" ? "bg-blue-500" : "bg-green-500"}`}
//               />
//               <View
//                 className={`w-2 h-2 rounded-full mr-1 ${currentStage === "bank_page" ? "bg-blue-500" : currentStage === "otp" || currentStage === "complete" ? "bg-green-500" : "bg-gray-300"}`}
//               />
//               <View
//                 className={`w-2 h-2 rounded-full mr-1 ${currentStage === "otp" ? "bg-blue-500" : currentStage === "complete" ? "bg-green-500" : "bg-gray-300"}`}
//               />
//               <View
//                 className={`w-2 h-2 rounded-full ${currentStage === "complete" ? "bg-blue-500" : "bg-gray-300"}`}
//               />
//             </View>
//           )}
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// };

// export default PaymentWebView;

// ==============================================================problem is it not prevent redirect work with spg and ssl commerce both============================= it work with spg and ssl commerce===========

// import React, {
//   useState,
//   useRef,
//   useEffect,
//   useMemo,
//   useCallback,
// } from "react";
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   Alert,
//   BackHandler,
//   Platform,
//   Linking,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import {
//   WebView,
//   WebViewNavigation,
//   WebViewMessageEvent,
// } from "react-native-webview";
// import { useLocalSearchParams, useRouter, Stack } from "expo-router";
// import { Ionicons } from "@expo/vector-icons";

// const PaymentWebView = () => {
//   const router = useRouter();
//   const params = useLocalSearchParams<{
//     payment_url: string;
//     transaction_id: string;
//     amount: string;
//     html_content?: string;
//   }>();

//   const { payment_url, transaction_id, amount, html_content } = params;

//   const webViewRef = useRef<WebView>(null);

//   const [loading, setLoading] = useState(true);
//   const [canGoBack, setCanGoBack] = useState(false);
//   const [paymentCompleted, setPaymentCompleted] = useState(false);
//   const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);
//   const [gatewayType, setGatewayType] = useState<
//     "ucb" | "sslcommerz" | "bkash" | "nagad" | "spg" | "other"
//   >("other");
//   const [statusMessage, setStatusMessage] = useState(
//     "Loading payment gateway...",
//   );

//   // ────────────────────────────────────────────────
//   // Gateway detection
//   // ────────────────────────────────────────────────
//   useEffect(() => {
//     const url = (payment_url || "").toLowerCase();
//     const html = (html_content || "").toLowerCase();

//     if (
//       html.includes("ucb") ||
//       html.includes("cybersource") ||
//       url.includes("cybersource")
//     ) {
//       setGatewayType("ucb");
//       setStatusMessage("Preparing UCB payment form...");
//     } else if (
//       url.includes("sslcommerz") ||
//       url.includes("sandbox.sslcommerz")
//     ) {
//       setGatewayType("sslcommerz");
//       setStatusMessage("Redirecting to SSLCommerz...");
//     } else if (url.includes("bkash") || url.includes("app.bka.sh")) {
//       setGatewayType("bkash");
//       setStatusMessage("Opening bKash...");
//     } else if (url.includes("nagad") || url.includes("nagad.com.bd")) {
//       setGatewayType("nagad");
//       setStatusMessage("Opening Nagad...");
//     } else if (
//       url.includes("spg") ||
//       url.includes("sonali") ||
//       url.includes("e-gp")
//     ) {
//       setGatewayType("spg");
//       setStatusMessage("Redirecting to Sonali e-GP/SPG...");
//     } else {
//       setGatewayType("other");
//     }
//   }, [payment_url, html_content]);

//   // ────────────────────────────────────────────────
//   // Source for WebView
//   // ────────────────────────────────────────────────
//   const webViewSource = useMemo(() => {
//     if (html_content) return { html: html_content };
//     if (payment_url) return { uri: payment_url };
//     return { html: "<h2>Error: No payment URL or content provided</h2>" };
//   }, [payment_url, html_content]);

//   // ────────────────────────────────────────────────
//   // Hardware back button handling
//   // ────────────────────────────────────────────────
//   useEffect(() => {
//     const backHandler = BackHandler.addEventListener(
//       "hardwareBackPress",
//       () => {
//         if (paymentCompleted) {
//           router.back();
//           return true;
//         }

//         if (canGoBack) {
//           webViewRef.current?.goBack();
//           return true;
//         }

//         Alert.alert(
//           "Exit Payment",
//           "Are you sure? Payment may not be completed.",
//           [
//             { text: "Continue", style: "cancel" },
//             {
//               text: "Exit",
//               style: "destructive",
//               onPress: () => router.back(),
//             },
//           ],
//         );

//         return true;
//       },
//     );

//     return () => backHandler.remove();
//   }, [canGoBack, paymentCompleted, router]);

//   // ────────────────────────────────────────────────
//   // Timeout protection (max 8 minutes)
//   // ────────────────────────────────────────────────
//   useEffect(() => {
//     if (paymentCompleted) return;

//     const timeout = setTimeout(
//       () => {
//         if (!paymentCompleted) {
//           Alert.alert(
//             "Payment Timeout",
//             "The payment process took too long. Please try again.",
//             [{ text: "OK", onPress: () => router.back() }],
//           );
//         }
//       },
//       8 * 60 * 1000,
//     );

//     return () => clearTimeout(timeout);
//   }, [paymentCompleted]);

//   const handleNavigationStateChange = useCallback(
//     (navState: WebViewNavigation) => {
//       const url = navState.url.toLowerCase();

//       setCanGoBack(navState.canGoBack);
//       setLoading(navState.loading);

//       // ─── Deep link detection (very important for bKash/Nagad) ───
//       if (
//         url.startsWith("bkash://") ||
//         url.startsWith("nagad://") ||
//         url.startsWith("rocket://")
//       ) {
//         Linking.openURL(navState.url).catch(() => {
//           Alert.alert(
//             "App Required",
//             `Please install the ${gatewayType.toUpperCase()} app to complete payment.`,
//           );
//           router.back();
//         });
//         setPaymentCompleted(true);
//         setStatusMessage("Opening mobile payment app...");
//         return;
//       }

//       // ─── Ignore success detection on actual gateway domains ───
//       if (
//         url.includes("cybersource") ||
//         url.includes("sslcommerz") ||
//         url.includes("bkash") ||
//         url.includes("nagad") ||
//         url.includes("testsecureacceptance")
//       ) {
//         return;
//       }

//       // ─── UCB callback page special handling ───
//       if (
//         gatewayType === "ucb" &&
//         url.includes("/api/") &&
//         url.includes("reciever")
//       ) {
//         setStatusMessage("Verifying UCB payment result...");
//         // Give page time to load → then check via JS
//         setTimeout(() => {
//           webViewRef.current?.injectJavaScript(`
//           (function() {
//             const text = document.body.innerText.toLowerCase();
//             if (text.includes('success') || text.includes('completed') || text.includes('approved') || /transaction.*[0-9a-f-]{8,}/.test(text)) {
//               window.ReactNativeWebView.postMessage('UCB_SUCCESS_DETECTED');
//             } else if (text.includes('fail') || text.includes('decline') || text.includes('error')) {
//               window.ReactNativeWebView.postMessage('UCB_FAILURE_DETECTED');
//             }
//           })();
//         `);
//         }, 2500);
//       }
//     },
//     [gatewayType],
//   );

//   // ────────────────────────────────────────────────
//   // Universal injected JavaScript (auto-submit + result monitoring)
//   // ────────────────────────────────────────────────
//   const injectedJavaScript = useMemo(
//     () => `
//     (function() {
//       ('[PaymentJS] Monitoring started - ${gatewayType}');

//       // ─── UCB auto-submit form ───
//       if (document.getElementById('ucb-payment-form') || document.body.innerHTML.includes('Redirecting to UCB')) {
//         setTimeout(() => {
//           const form = document.getElementById('ucb-payment-form');
//           if (form && !window.hasSubmittedUCB) {
//             window.hasSubmittedUCB = true;
//             window.ReactNativeWebView.postMessage('UCB_FORM_AUTO_SUBMITTED');
//             form.submit();
//           }
//         }, 1200);
//       }

//       // ─── Result monitoring (only after leaving gateway domains) ───
//       function checkResult() {
//         const text = document.body.innerText.toLowerCase();
//         const loc = window.location.href.toLowerCase();

//         if (loc.includes('cybersource') || loc.includes('sslcommerz') || loc.includes('bkash') || loc.includes('nagad')) {
//           return;
//         }

//         if (/success|completed|approved|thank you|অভিনন্দন|সফল/i.test(text)) {
//           window.ReactNativeWebView.postMessage('PAYMENT_SUCCESS_DETECTED');
//         }
//         if (/fail|failed|declined|cancel|error|ব্যর্থ|অনুমোদন হয়নি/i.test(text)) {
//           window.ReactNativeWebView.postMessage('PAYMENT_FAILURE_DETECTED');
//         }
//       }

//       setTimeout(checkResult, 3000);
//       setInterval(checkResult, 6000);

//       true;
//     })();
//   `,
//     [gatewayType],
//   );

//   const handleMessage = useCallback(
//     (event: WebViewMessageEvent) => {
//       const msg = event.nativeEvent.data;
//       ("[WebView Message]", msg);

//       if (msg === "UCB_FORM_AUTO_SUBMITTED") {
//         setHasAutoSubmitted(true);
//         setStatusMessage("Form submitted — redirecting to bank...");
//       }

//       if (
//         msg === "PAYMENT_SUCCESS_DETECTED" ||
//         msg === "UCB_SUCCESS_DETECTED"
//       ) {
//         if (!paymentCompleted) handlePaymentSuccess();
//       }

//       if (
//         msg === "PAYMENT_FAILURE_DETECTED" ||
//         msg === "UCB_FAILURE_DETECTED"
//       ) {
//         if (!paymentCompleted) handlePaymentFailure();
//       }
//     },
//     [paymentCompleted],
//   );

//   const handlePaymentSuccess = useCallback(() => {
//     if (paymentCompleted) return;
//     setPaymentCompleted(true);
//     setStatusMessage("Payment successful!");
//     webViewRef.current?.stopLoading();

//     setTimeout(() => {
//       router.replace({
//         pathname: "/payments/available_payment/success",
//         params: {
//           transaction_id: transaction_id || `TX_${Date.now().toString(36)}`,
//           amount_paid: amount || "0",
//           payment_date: new Date().toISOString(),
//           gateway: gatewayType.toUpperCase(),
//         },
//       });
//     }, 1200);
//   }, [paymentCompleted, transaction_id, amount, gatewayType, router]);

//   const handlePaymentFailure = useCallback(() => {
//     if (paymentCompleted) return;
//     setPaymentCompleted(true);
//     setStatusMessage("Payment failed");
//     webViewRef.current?.stopLoading();

//     setTimeout(() => {
//       router.replace({
//         pathname: "/payments/available_payment/fail",
//         params: {
//           transaction_id: transaction_id || "",
//           amount: amount || "0",
//           error_message: "Payment could not be completed",
//           gateway: gatewayType.toUpperCase(),
//         },
//       });
//     }, 1200);
//   }, [paymentCompleted, transaction_id, amount, gatewayType, router]);

//   const handleClose = () => {
//     if (paymentCompleted) {
//       router.back();
//       return;
//     }

//     Alert.alert("Exit Payment", "Are you sure? Payment may be incomplete.", [
//       { text: "Continue", style: "cancel" },
//       { text: "Exit", style: "destructive", onPress: () => router.back() },
//     ]);
//   };

//   const handleRefresh = () => {
//     webViewRef.current?.reload();
//   };

//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
//       <Stack.Screen options={{ headerShown: false }} />

//       {/* Header */}
//       <View
//         style={{
//           flexDirection: "row",
//           alignItems: "center",
//           justifyContent: "space-between",
//           paddingHorizontal: 16,
//           paddingVertical: 12,
//           borderBottomWidth: 1,
//           borderBottomColor: "#e5e7eb",
//         }}
//       >
//         <TouchableOpacity
//           onPress={handleClose}
//           hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
//         >
//           <Ionicons name="arrow-back" size={28} color="#374151" />
//         </TouchableOpacity>

//         <View style={{ flex: 1, alignItems: "center" }}>
//           <Text style={{ fontSize: 18, fontWeight: "700", color: "#1f2937" }}>
//             {gatewayType === "ucb"
//               ? "UCB Bank"
//               : gatewayType === "sslcommerz"
//                 ? "SSLCommerz"
//                 : gatewayType === "bkash"
//                   ? "bKash"
//                   : gatewayType === "nagad"
//                     ? "Nagad"
//                     : gatewayType === "spg"
//                       ? "Sonali SPG"
//                       : "Secure Payment"}
//           </Text>
//           <Text style={{ fontSize: 15, color: "#4b5563", marginTop: 2 }}>
//             ৳{" "}
//             {Number(amount || 0).toLocaleString("bn-BD", {
//               minimumFractionDigits: 2,
//             })}
//           </Text>
//           <Text style={{ fontSize: 13, color: "#2563eb", marginTop: 4 }}>
//             {statusMessage}
//           </Text>
//         </View>

//         <TouchableOpacity
//           onPress={handleRefresh}
//           hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
//         >
//           <Ionicons name="refresh" size={24} color="#374151" />
//         </TouchableOpacity>
//       </View>

//       {/* WebView Area */}
//       <View style={{ flex: 1, position: "relative" }}>
//         <WebView
//           ref={webViewRef}
//           source={webViewSource}
//           onNavigationStateChange={handleNavigationStateChange}
//           onLoadStart={() => setLoading(true)}
//           onLoadEnd={() => setLoading(false)}
//           onError={(s) => {
//             ("WebView error:", s.nativeEvent);
//             if (!paymentCompleted) {
//               Alert.alert("Connection Error", "Cannot reach payment gateway.", [
//                 { text: "Retry", onPress: () => webViewRef.current?.reload() },
//                 {
//                   text: "Cancel",
//                   onPress: () => router.back(),
//                   style: "cancel",
//                 },
//               ]);
//             }
//           }}
//           onMessage={handleMessage}
//           injectedJavaScript={injectedJavaScript}
//           javaScriptEnabled={true}
//           domStorageEnabled={true}
//           startInLoadingState={true}
//           scalesPageToFit={true}
//           mixedContentMode="always"
//           userAgent={
//             Platform.OS === "ios"
//               ? "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
//               : "Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36"
//           }
//         />

//         {loading && !paymentCompleted && (
//           <View
//             style={{
//               position: "absolute",
//               inset: 0,
//               backgroundColor: "#fff",
//               alignItems: "center",
//               justifyContent: "center",
//             }}
//           >
//             <ActivityIndicator size="large" color="#3b82f6" />
//             <Text style={{ marginTop: 16, color: "#4b5563", fontSize: 15 }}>
//               {statusMessage}
//             </Text>
//           </View>
//         )}
//       </View>

//       {/* Footer Status */}
//       <View
//         style={{
//           padding: 12,
//           borderTopWidth: 1,
//           borderTopColor: "#e5e7eb",
//           backgroundColor: "#f9fafb",
//         }}
//       >
//         <View
//           style={{
//             flexDirection: "row",
//             alignItems: "center",
//             justifyContent: "space-between",
//           }}
//         >
//           <View style={{ flexDirection: "row", alignItems: "center" }}>
//             <Ionicons
//               name={paymentCompleted ? "checkmark-circle" : "lock-closed"}
//               size={18}
//               color={paymentCompleted ? "#10b981" : "#3b82f6"}
//             />
//             <Text style={{ marginLeft: 8, fontSize: 13, color: "#374151" }}>
//               {paymentCompleted ? "Payment processed" : "Secure connection"}
//             </Text>
//           </View>

//           <Text style={{ fontSize: 12, color: "#6b7280" }}>
//             {gatewayType.toUpperCase()}
//           </Text>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// };

// export default PaymentWebView;

// ===========================================it work perfectly with spg and also redirect within the app===================================

// import React, {
//   useState,
//   useRef,
//   useEffect,
//   useMemo,
//   useCallback,
// } from "react";
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   Alert,
//   BackHandler,
//   Platform,
//   Linking,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import {
//   WebView,
//   WebViewNavigation,
//   WebViewMessageEvent,
// } from "react-native-webview";
// import { useLocalSearchParams, useRouter, Stack } from "expo-router";
// import { Ionicons } from "@expo/vector-icons";

// const PaymentWebView = () => {
//   const router = useRouter();
//   const params = useLocalSearchParams<{
//     payment_url: string;
//     transaction_id: string;
//     amount: string;
//     html_content?: string;
//   }>();

//   const { payment_url, transaction_id, amount, html_content } = params;

//   const webViewRef = useRef<WebView>(null);

//   const [loading, setLoading] = useState(true);
//   const [canGoBack, setCanGoBack] = useState(false);
//   const [paymentCompleted, setPaymentCompleted] = useState(false);
//   const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);
//   const [gatewayType, setGatewayType] = useState<
//     "ucb" | "sslcommerz" | "bkash" | "nagad" | "spg" | "other"
//   >("other");
//   const [statusMessage, setStatusMessage] = useState(
//     "Loading payment gateway...",
//   );
//   const [lastValidUrl, setLastValidUrl] = useState(payment_url);

//   // List of allowed payment gateway domains ONLY
//   const ALLOWED_DOMAINS = [
//     "cybersource",
//     "sslcommerz",
//     "bkash",
//     "nagad",
//     "sonali",
//     "spg",
//     "ucb",
//     "testsecureacceptance",
//     "localhost",
//   ];

//   // Your backend domain for reconciliation (we'll handle it specially)
//   const BACKEND_DOMAIN = "edufee.online";

//   // ────────────────────────────────────────────────
//   // Gateway detection
//   // ────────────────────────────────────────────────
//   useEffect(() => {
//     const url = (payment_url || "").toLowerCase();
//     const html = (html_content || "").toLowerCase();

//     if (
//       html.includes("ucb") ||
//       html.includes("cybersource") ||
//       url.includes("cybersource")
//     ) {
//       setGatewayType("ucb");
//       setStatusMessage("Preparing UCB payment form...");
//     } else if (
//       url.includes("sslcommerz") ||
//       url.includes("sandbox.sslcommerz")
//     ) {
//       setGatewayType("sslcommerz");
//       setStatusMessage("Redirecting to SSLCommerz...");
//     } else if (url.includes("bkash") || url.includes("app.bka.sh")) {
//       setGatewayType("bkash");
//       setStatusMessage("Opening bKash...");
//     } else if (url.includes("nagad") || url.includes("nagad.com.bd")) {
//       setGatewayType("nagad");
//       setStatusMessage("Opening Nagad...");
//     } else if (
//       url.includes("spg") ||
//       url.includes("sonali") ||
//       url.includes("e-gp")
//     ) {
//       setGatewayType("spg");
//       setStatusMessage("Redirecting to Sonali e-GP/SPG...");
//     } else {
//       setGatewayType("other");
//     }
//   }, [payment_url, html_content]);

//   // ────────────────────────────────────────────────
//   // Source for WebView
//   // ────────────────────────────────────────────────
//   const webViewSource = useMemo(() => {
//     if (html_content) return { html: html_content };
//     if (payment_url) return { uri: payment_url };
//     return { html: "<h2>Error: No payment URL or content provided</h2>" };
//   }, [payment_url, html_content]);

//   // ────────────────────────────────────────────────
//   // Check if URL is allowed (payment gateway only)
//   // ────────────────────────────────────────────────
//   const isAllowedUrl = useCallback((url: string) => {
//     const urlLower = url.toLowerCase();
//     return ALLOWED_DOMAINS.some((domain) => urlLower.includes(domain));
//   }, []);

//   // ────────────────────────────────────────────────
//   // Check if URL is a reconciliation callback to your backend
//   // ────────────────────────────────────────────────
//   const isReconciliationUrl = useCallback((url: string) => {
//     const urlLower = url.toLowerCase();
//     return (
//       urlLower.includes(BACKEND_DOMAIN) &&
//       (urlLower.includes("/payment/reconcile") ||
//         urlLower.includes("/api/payment/callback"))
//     );
//   }, []);

//   // ────────────────────────────────────────────────
//   // Extract parameters from reconciliation URL
//   // ────────────────────────────────────────────────
//   const extractReconciliationParams = useCallback(
//     (url: string) => {
//       try {
//         const urlObj = new URL(url);
//         const status = urlObj.searchParams.get("status");
//         const invoice = urlObj.searchParams.get("invoice");
//         const transactionId =
//           urlObj.searchParams.get("transaction_id") ||
//           urlObj.searchParams.get("trxid") ||
//           urlObj.searchParams.get("tran_id");
//         const amountPaid =
//           urlObj.searchParams.get("amount") ||
//           urlObj.searchParams.get("total_amount");
//         const message =
//           urlObj.searchParams.get("message") || urlObj.searchParams.get("msg");

//         return {
//           status: status || "unknown",
//           invoice: invoice || "",
//           transactionId: transactionId || "",
//           amountPaid: amountPaid || amount || "0",
//           message: message || "",
//         };
//       } catch (error) {
//         ("Error parsing reconciliation URL:", error);
//         return {
//           status: "unknown",
//           invoice: "",
//           transactionId: "",
//           amountPaid: amount || "0",
//           message: "",
//         };
//       }
//     },
//     [amount],
//   );

//   // ────────────────────────────────────────────────
//   // Hardware back button handling
//   // ────────────────────────────────────────────────
//   useEffect(() => {
//     const backHandler = BackHandler.addEventListener(
//       "hardwareBackPress",
//       () => {
//         if (paymentCompleted) {
//           router.back();
//           return true;
//         }

//         if (canGoBack) {
//           webViewRef.current?.goBack();
//           return true;
//         }

//         Alert.alert(
//           "Exit Payment",
//           "Are you sure? Payment may not be completed.",
//           [
//             { text: "Continue", style: "cancel" },
//             {
//               text: "Exit",
//               style: "destructive",
//               onPress: () => router.back(),
//             },
//           ],
//         );

//         return true;
//       },
//     );

//     return () => backHandler.remove();
//   }, [canGoBack, paymentCompleted, router]);

//   // ────────────────────────────────────────────────
//   // Timeout protection (max 8 minutes)
//   // ────────────────────────────────────────────────
//   useEffect(() => {
//     if (paymentCompleted) return;

//     const timeout = setTimeout(
//       () => {
//         if (!paymentCompleted) {
//           Alert.alert(
//             "Payment Timeout",
//             "The payment process took too long. Please try again.",
//             [{ text: "OK", onPress: () => router.back() }],
//           );
//         }
//       },
//       8 * 60 * 1000,
//     );

//     return () => clearTimeout(timeout);
//   }, [paymentCompleted]);
//   const handlePaymentSuccess = useCallback(() => {
//     if (paymentCompleted) return;

//     setPaymentCompleted(true);
//     setStatusMessage("Payment successful!");

//     // Stop loading and clear the WebView
//     webViewRef.current?.stopLoading();
//     webViewRef.current?.injectJavaScript(`
//       document.body.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);"><div style="text-align: center; padding: 2rem;"><div style="font-size: 64px; color: #059669;">✓</div><h2 style="color: #065f46; margin-top: 1rem;">Payment Successful!</h2><p style="color: #047857; margin-top: 0.5rem;">Redirecting to receipt...</p></div></div>';
//     `);

//     setTimeout(() => {
//       router.replace({
//         pathname: "/payments/available_payment/success",
//         params: {
//           transaction_id: transaction_id || `TX_${Date.now().toString(36)}`,
//           amount_paid: amount || "0",
//           payment_date: new Date().toISOString(),
//           gateway: gatewayType.toUpperCase(),
//         },
//       });
//     }, 1200);
//   }, [paymentCompleted, transaction_id, amount, gatewayType, router]);

//   const handlePaymentFailure = useCallback(
//     (errorMessage = "Payment could not be completed") => {
//       if (paymentCompleted) return;

//       setPaymentCompleted(true);
//       setStatusMessage("Payment failed");

//       // Stop loading and clear the WebView
//       webViewRef.current?.stopLoading();
//       webViewRef.current?.injectJavaScript(`
//       document.body.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);"><div style="text-align: center; padding: 2rem;"><div style="font-size: 64px; color: #dc2626;">✗</div><h2 style="color: #991b1b; margin-top: 1rem;">Payment Failed</h2><p style="color: #b91c1c; margin-top: 0.5rem;">${errorMessage}</p><p style="color: #b91c1c;">Redirecting to app...</p></div></div>';
//     `);

//       setTimeout(() => {
//         router.replace({
//           pathname: "/payments/available_payment/fail",
//           params: {
//             transaction_id: transaction_id || "",
//             amount: amount || "0",
//             error_message: errorMessage,
//             gateway: gatewayType.toUpperCase(),
//           },
//         });
//       }, 1200);
//     },
//     [paymentCompleted, transaction_id, amount, gatewayType, router],
//   );

//   const handleNavigationStateChange = useCallback(
//     (navState: WebViewNavigation) => {
//       const url = navState.url;
//       const urlLower = url.toLowerCase();
//       const title = navState.title || "";

//       setCanGoBack(navState.canGoBack);
//       setLoading(navState.loading);

//       // ─── Store last valid URL from allowed domains ───
//       if (isAllowedUrl(url)) {
//         setLastValidUrl(url);
//       }

//       // ─── INTERCEPT reconciliation callback ───
//       if (isReconciliationUrl(url) && !paymentCompleted) {
//         ("🛑 Intercepting reconciliation callback:", url);

//         // Stop WebView from loading the reconciliation page
//         webViewRef.current?.stopLoading();

//         // Extract parameters from URL
//         const params = extractReconciliationParams(url);

//         ("📊 Reconciliation params:", params);

//         // Handle based on status
//         if (params.status === "200" || params.status === "success") {
//           ("✅ Payment reconciliation successful");

//           // Show success message in WebView and redirect to app
//           webViewRef.current?.injectJavaScript(`
//             document.body.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);"><div style="text-align: center; padding: 2rem;"><div style="font-size: 64px; color: #059669;">✓</div><h2 style="color: #065f46; margin-top: 1rem;">Payment Successful!</h2><p style="color: #047857; margin-top: 0.5rem;">Invoice: ${params.invoice}</p><p style="color: #047857;">Redirecting to receipt...</p></div></div>';
//           `);

//           setStatusMessage("Payment verified successfully!");
//           setPaymentCompleted(true);

//           // Redirect to success page after short delay
//           setTimeout(() => {
//             router.replace({
//               pathname: "/payments/available_payment/success",
//               params: {
//                 transaction_id:
//                   params.transactionId ||
//                   transaction_id ||
//                   `TX_${Date.now().toString(36)}`,
//                 amount_paid: params.amountPaid || amount || "0",
//                 payment_date: new Date().toISOString(),
//                 gateway: gatewayType.toUpperCase(),
//                 invoice: params.invoice,
//                 message: params.message || "Payment completed successfully",
//               },
//             });
//           }, 1200);
//         } else if (
//           params.status === "400" ||
//           params.status === "fail" ||
//           params.status === "error"
//         ) {
//           ("❌ Payment reconciliation failed");

//           // Show failure message in WebView and redirect to app
//           webViewRef.current?.injectJavaScript(`
//             document.body.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);"><div style="text-align: center; padding: 2rem;"><div style="font-size: 64px; color: #dc2626;">✗</div><h2 style="color: #991b1b; margin-top: 1rem;">Verification Failed</h2><p style="color: #b91c1c; margin-top: 0.5rem;">Retry scheduled</p><p style="color: #b91c1c;">Redirecting to app...</p></div></div>';
//           `);

//           setStatusMessage("Payment verification failed");
//           setPaymentCompleted(true);

//           // Redirect to failure page after short delay
//           setTimeout(() => {
//             router.replace({
//               pathname: "/payments/available_payment/fail",
//               params: {
//                 transaction_id: params.transactionId || transaction_id || "",
//                 amount: params.amountPaid || amount || "0",
//                 error_message:
//                   params.message ||
//                   "Payment verification failed. Retry scheduled.",
//                 gateway: gatewayType.toUpperCase(),
//                 invoice: params.invoice,
//               },
//             });
//           }, 1200);
//         } else {
//           ("❓ Unknown reconciliation status:", params.status);

//           // For unknown status, redirect back to payment gateway
//           if (lastValidUrl) {
//             webViewRef.current?.injectJavaScript(`
//               window.location.href = '${lastValidUrl}';
//             `);
//           }
//         }

//         return;
//       }

//       // ─── Block other external redirects ───
//       if (!isAllowedUrl(url) && !paymentCompleted) {
//         ("🚫 Blocking external redirect to:", url);

//         // Check if this might be a payment result page based on content
//         const bodyText = title.toLowerCase();
//         const isSuccess =
//           bodyText.includes("success") ||
//           bodyText.includes("completed") ||
//           bodyText.includes("approved") ||
//           bodyText.includes("সফল") ||
//           urlLower.includes("success");
//         const isFailure =
//           bodyText.includes("fail") ||
//           bodyText.includes("declined") ||
//           bodyText.includes("error") ||
//           bodyText.includes("ব্যর্থ") ||
//           urlLower.includes("fail") ||
//           urlLower.includes("error");

//         if (isSuccess) {
//           ("✅ Detected success on external page");
//           handlePaymentSuccess();
//         } else if (isFailure) {
//           ("❌ Detected failure on external page");
//           handlePaymentFailure("Payment failed on external page");
//         } else {
//           // Not a result page, block and redirect back
//           if (lastValidUrl) {
//             webViewRef.current?.injectJavaScript(`
//               window.location.href = '${lastValidUrl}';
//             `);
//           }
//         }

//         return;
//       }

//       // ─── Deep link detection (very important for bKash/Nagad) ───
//       if (
//         urlLower.startsWith("bkash://") ||
//         urlLower.startsWith("nagad://") ||
//         urlLower.startsWith("rocket://")
//       ) {
//         Linking.openURL(url).catch(() => {
//           Alert.alert(
//             "App Required",
//             `Please install the ${gatewayType.toUpperCase()} app to complete payment.`,
//           );
//           router.back();
//         });
//         setPaymentCompleted(true);
//         setStatusMessage("Opening mobile payment app...");
//         return;
//       }

//       // ─── UCB callback page special handling ───
//       if (
//         gatewayType === "ucb" &&
//         urlLower.includes("/api/") &&
//         urlLower.includes("reciever")
//       ) {
//         setStatusMessage("Verifying UCB payment result...");
//         // Give page time to load → then check via JS
//         setTimeout(() => {
//           webViewRef.current?.injectJavaScript(`
//           (function() {
//             const text = document.body.innerText.toLowerCase();
//             if (text.includes('success') || text.includes('completed') || text.includes('approved') || /transaction.*[0-9a-f-]{8,}/.test(text)) {
//               window.ReactNativeWebView.postMessage('UCB_SUCCESS_DETECTED');
//             } else if (text.includes('fail') || text.includes('decline') || text.includes('error')) {
//               window.ReactNativeWebView.postMessage('UCB_FAILURE_DETECTED');
//             }
//           })();
//         `);
//         }, 2500);
//       }
//     },
//     [
//       gatewayType,
//       paymentCompleted,
//       lastValidUrl,
//       isAllowedUrl,
//       isReconciliationUrl,
//       extractReconciliationParams,
//       router,
//       transaction_id,
//       amount,
//       handlePaymentSuccess,
//       handlePaymentFailure,
//     ],
//   );

//   // ────────────────────────────────────────────────
//   // Enhanced injected JavaScript (blocks ALL external navigation)
//   // ────────────────────────────────────────────────
//   const injectedJavaScript = useMemo(
//     () => `
//     (function() {
//       ('[PaymentJS] Monitoring started - ${gatewayType}');

//       const allowedDomains = ${JSON.stringify(ALLOWED_DOMAINS)};
//       const backendDomain = '${BACKEND_DOMAIN}';

//       // ─── Helper to check if URL is allowed (payment gateway only) ───
//       function isUrlAllowed(url) {
//         const urlLower = url.toLowerCase();
//         return allowedDomains.some(domain => urlLower.includes(domain));
//       }

//       // ─── Helper to check if URL is reconciliation callback ───
//       function isReconciliationUrl(url) {
//         const urlLower = url.toLowerCase();
//         return urlLower.includes(backendDomain) &&
//                (urlLower.includes('/payment/reconcile') ||
//                 urlLower.includes('/api/payment/callback'));
//       }

//       // ─── Intercept ALL link clicks ───
//       document.addEventListener('click', function(e) {
//         let target = e.target;
//         while (target && target.tagName !== 'A') {
//           target = target.parentElement;
//         }

//         if (target && target.href) {
//           const href = target.href;

//           // Check if it's a reconciliation URL
//           if (isReconciliationUrl(href)) {
//             e.preventDefault();
//             e.stopPropagation();
//             ('Intercepting reconciliation link:', href);

//             // Extract status from URL
//             const urlParams = new URLSearchParams(href.split('?')[1] || '');
//             const status = urlParams.get('status');

//             if (status === '200' || status === 'success') {
//               window.ReactNativeWebView.postMessage('RECONCILE_SUCCESS');
//             } else if (status === '400' || status === 'fail' || status === 'error') {
//               window.ReactNativeWebView.postMessage('RECONCILE_FAILURE');
//             }

//             return false;
//           }

//           // Check if URL is allowed (payment gateway only)
//           if (!isUrlAllowed(href)) {
//             e.preventDefault();
//             e.stopPropagation();
//             ('Blocked external link click:', href);

//             // Check if this is a success/failure redirect
//             const isSuccess = href.includes('success') || href.includes('thank') || href.includes('complete');
//             const isFailure = href.includes('fail') || href.includes('error') || href.includes('cancel');

//             if (isSuccess) {
//               window.ReactNativeWebView.postMessage('PAYMENT_SUCCESS_DETECTED');
//             } else if (isFailure) {
//               window.ReactNativeWebView.postMessage('PAYMENT_FAILURE_DETECTED');
//             }

//             return false;
//           }
//         }
//       }, true);

//       // ─── Intercept form submissions ───
//       document.addEventListener('submit', function(e) {
//         const form = e.target;
//         if (form.action) {
//           const action = form.action;

//           // Check if it's a reconciliation form
//           if (isReconciliationUrl(action)) {
//             e.preventDefault();
//             ('Intercepting reconciliation form submission:', action);

//             // You could extract form data here if needed
//             window.ReactNativeWebView.postMessage('RECONCILE_FORM_SUBMITTED');

//             return false;
//           }

//           if (!isUrlAllowed(action)) {
//             e.preventDefault();
//             ('Blocked external form submission:', action);

//             // Check form data for result indicators
//             const formData = new FormData(form);
//             const formText = Array.from(formData.entries()).toString().toLowerCase();

//             if (formText.includes('success') || formText.includes('approved')) {
//               window.ReactNativeWebView.postMessage('PAYMENT_SUCCESS_DETECTED');
//             } else if (formText.includes('fail') || formText.includes('declined')) {
//               window.ReactNativeWebView.postMessage('PAYMENT_FAILURE_DETECTED');
//             }

//             return false;
//           }
//         }
//       }, true);

//       // ─── UCB auto-submit form ───
//       if (document.getElementById('ucb-payment-form') || document.body.innerHTML.includes('Redirecting to UCB')) {
//         setTimeout(() => {
//           const form = document.getElementById('ucb-payment-form');
//           if (form && !window.hasSubmittedUCB) {
//             window.hasSubmittedUCB = true;
//             window.ReactNativeWebView.postMessage('UCB_FORM_AUTO_SUBMITTED');
//             form.submit();
//           }
//         }, 1200);
//       }

//       // ─── Result monitoring ───
//       function checkResult() {
//         const text = document.body.innerText.toLowerCase();
//         const loc = window.location.href.toLowerCase();

//         // Don't check results on gateway domains
//         const isOnGateway = isUrlAllowed(loc);

//         if (isOnGateway) return;

//         if (/success|completed|approved|thank you|অভিনন্দন|সফল/i.test(text)) {
//           window.ReactNativeWebView.postMessage('PAYMENT_SUCCESS_DETECTED');
//         }
//         if (/fail|failed|declined|cancel|error|verification failed|ব্যর্থ|অনুমোদন হয়নি/i.test(text)) {
//           window.ReactNativeWebView.postMessage('PAYMENT_FAILURE_DETECTED');
//         }
//       }

//       setTimeout(checkResult, 3000);
//       setInterval(checkResult, 6000);

//       true;
//     })();
//   `,
//     [gatewayType],
//   );

//   const handleMessage = useCallback(
//     (event: WebViewMessageEvent) => {
//       const msg = event.nativeEvent.data;
//       ("[WebView Message]", msg);

//       if (msg === "UCB_FORM_AUTO_SUBMITTED") {
//         setHasAutoSubmitted(true);
//         setStatusMessage("Form submitted — redirecting to bank...");
//       }

//       if (msg === "RECONCILE_SUCCESS") {
//         ("✅ Reconciliation success message received");
//         handlePaymentSuccess();
//       }

//       if (msg === "RECONCILE_FAILURE") {
//         ("❌ Reconciliation failure message received");
//         handlePaymentFailure("Payment verification failed");
//       }

//       if (
//         msg === "PAYMENT_SUCCESS_DETECTED" ||
//         msg === "UCB_SUCCESS_DETECTED"
//       ) {
//         if (!paymentCompleted) {
//           handlePaymentSuccess();
//         }
//       }

//       if (
//         msg === "PAYMENT_FAILURE_DETECTED" ||
//         msg === "UCB_FAILURE_DETECTED"
//       ) {
//         if (!paymentCompleted) {
//           handlePaymentFailure("Payment verification failed");
//         }
//       }
//     },
//     [paymentCompleted, handlePaymentSuccess, handlePaymentFailure],
//   );

//   const handleClose = () => {
//     if (paymentCompleted) {
//       router.back();
//       return;
//     }

//     Alert.alert("Exit Payment", "Are you sure? Payment may be incomplete.", [
//       { text: "Continue", style: "cancel" },
//       { text: "Exit", style: "destructive", onPress: () => router.back() },
//     ]);
//   };

//   const handleRefresh = () => {
//     webViewRef.current?.reload();
//   };

//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
//       <Stack.Screen options={{ headerShown: false }} />

//       {/* Header */}
//       <View
//         style={{
//           flexDirection: "row",
//           alignItems: "center",
//           justifyContent: "space-between",
//           paddingHorizontal: 16,
//           paddingVertical: 12,
//           borderBottomWidth: 1,
//           borderBottomColor: "#e5e7eb",
//         }}
//       >
//         <TouchableOpacity
//           onPress={handleClose}
//           hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
//         >
//           <Ionicons name="arrow-back" size={28} color="#374151" />
//         </TouchableOpacity>

//         <View style={{ flex: 1, alignItems: "center" }}>
//           <Text style={{ fontSize: 18, fontWeight: "700", color: "#1f2937" }}>
//             {gatewayType === "ucb"
//               ? "UCB Bank"
//               : gatewayType === "sslcommerz"
//                 ? "SSLCommerz"
//                 : gatewayType === "bkash"
//                   ? "bKash"
//                   : gatewayType === "nagad"
//                     ? "Nagad"
//                     : gatewayType === "spg"
//                       ? "Sonali SPG"
//                       : "Secure Payment"}
//           </Text>
//           <Text style={{ fontSize: 15, color: "#4b5563", marginTop: 2 }}>
//             ৳{" "}
//             {Number(amount || 0).toLocaleString("bn-BD", {
//               minimumFractionDigits: 2,
//             })}
//           </Text>
//           <Text style={{ fontSize: 13, color: "#2563eb", marginTop: 4 }}>
//             {statusMessage}
//           </Text>
//         </View>

//         <TouchableOpacity
//           onPress={handleRefresh}
//           hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
//         >
//           <Ionicons name="refresh" size={24} color="#374151" />
//         </TouchableOpacity>
//       </View>

//       {/* WebView Area */}
//       <View style={{ flex: 1, position: "relative" }}>
//         <WebView
//           ref={webViewRef}
//           source={webViewSource}
//           onNavigationStateChange={handleNavigationStateChange}
//           onLoadStart={() => setLoading(true)}
//           onLoadEnd={() => setLoading(false)}
//           onError={(s) => {
//             ("WebView error:", s.nativeEvent);
//             if (!paymentCompleted) {
//               Alert.alert("Connection Error", "Cannot reach payment gateway.", [
//                 { text: "Retry", onPress: () => webViewRef.current?.reload() },
//                 {
//                   text: "Cancel",
//                   onPress: () => router.back(),
//                   style: "cancel",
//                 },
//               ]);
//             }
//           }}
//           onMessage={handleMessage}
//           injectedJavaScript={injectedJavaScript}
//           javaScriptEnabled={true}
//           domStorageEnabled={true}
//           startInLoadingState={true}
//           scalesPageToFit={true}
//           mixedContentMode="always"
//           userAgent={
//             Platform.OS === "ios"
//               ? "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
//               : "Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36"
//           }
//           onShouldStartLoadWithRequest={(request) => {
//             // INTERCEPT reconciliation URLs - DON'T let them load
//             if (isReconciliationUrl(request.url)) {
//               (
//                 "🛑 Intercepting reconciliation request:",
//                 request.url,
//               );

//               // Extract params and handle in JavaScript instead
//               webViewRef.current?.injectJavaScript(`
//                 (function() {
//                   const url = '${request.url}';
//                   const urlParams = new URLSearchParams(url.split('?')[1] || '');
//                   const status = urlParams.get('status');

//                   if (status === '200' || status === 'success') {
//                     window.ReactNativeWebView.postMessage('RECONCILE_SUCCESS');
//                   } else if (status === '400' || status === 'fail' || status === 'error') {
//                     window.ReactNativeWebView.postMessage('RECONCILE_FAILURE');
//                   }
//                 })();
//               `);

//               return false; // BLOCK the request
//             }

//             // Block any other external navigation attempts
//             if (!isAllowedUrl(request.url) && !paymentCompleted) {
//               ("🚫 Blocked external request to:", request.url);
//               return false;
//             }
//             return true;
//           }}
//         />

//         {loading && !paymentCompleted && (
//           <View
//             style={{
//               position: "absolute",
//               inset: 0,
//               backgroundColor: "#fff",
//               alignItems: "center",
//               justifyContent: "center",
//             }}
//           >
//             <ActivityIndicator size="large" color="#3b82f6" />
//             <Text style={{ marginTop: 16, color: "#4b5563", fontSize: 15 }}>
//               {statusMessage}
//             </Text>
//           </View>
//         )}
//       </View>

//       {/* Footer Status */}
//       <View
//         style={{
//           padding: 12,
//           borderTopWidth: 1,
//           borderTopColor: "#e5e7eb",
//           backgroundColor: "#f9fafb",
//         }}
//       >
//         <View
//           style={{
//             flexDirection: "row",
//             alignItems: "center",
//             justifyContent: "space-between",
//           }}
//         >
//           <View style={{ flexDirection: "row", alignItems: "center" }}>
//             <Ionicons
//               name={paymentCompleted ? "checkmark-circle" : "lock-closed"}
//               size={18}
//               color={paymentCompleted ? "#10b981" : "#3b82f6"}
//             />
//             <Text style={{ marginLeft: 8, fontSize: 13, color: "#374151" }}>
//               {paymentCompleted ? "Payment processed" : "Secure connection"}
//             </Text>
//           </View>

//           <Text style={{ fontSize: 12, color: "#6b7280" }}>
//             {gatewayType.toUpperCase()}
//           </Text>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// };

// export default PaymentWebView;

// =========================================================== it redirect to ssl but not previe

// import { Ionicons } from "@expo/vector-icons";
// import { useLocalSearchParams, useRouter } from "expo-router";
// import React, {
//   useCallback,
//   useEffect,
//   useMemo,
//   useRef,
//   useState,
// } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   BackHandler,
//   Linking,
//   Platform,
//   Text,
//   View,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import {
//   WebView,
//   WebViewMessageEvent,
//   WebViewNavigation,
// } from "react-native-webview";

// const PaymentWebView = () => {
//   const router = useRouter();
//   const params = useLocalSearchParams<{
//     payment_url: string;
//     transaction_id: string;
//     amount: string;
//     html_content?: string;
//   }>();

//   const { payment_url, transaction_id, amount, html_content } = params;

//   const webViewRef = useRef<WebView>(null);

//   const [loading, setLoading] = useState(true);
//   const [canGoBack, setCanGoBack] = useState(false);
//   const [paymentCompleted, setPaymentCompleted] = useState(false);
//   const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);
//   const [gatewayType, setGatewayType] = useState<
//     "ucb" | "sslcommerz" | "bkash" | "nagad" | "spg" | "other"
//   >("other");
//   const [statusMessage, setStatusMessage] = useState(
//     "Loading payment gateway...",
//   );
//   const [lastValidUrl, setLastValidUrl] = useState(payment_url);

//   // List of allowed payment gateway domains ONLY
//   const ALLOWED_DOMAINS = [
//     "cybersource",
//     "sslcommerz",
//     "sandbox.sslcommerz",
//     "bkash",
//     "nagad",
//     "sonali",
//     "spg",
//     "ucb",
//     "testsecureacceptance",
//     "localhost",
//   ];

//   // Your backend domain for reconciliation (we'll handle it specially)
//   // const BACKEND_DOMAIN = "edufee.online";
//   const BACKEND_DOMAIN = "academyims.com";
//   // const BACKEND_DOMAIN = "edufee.online";

//   // ────────────────────────────────────────────────
//   // Gateway detection
//   // ────────────────────────────────────────────────
//   useEffect(() => {
//     const url = (payment_url || "").toLowerCase();
//     const html = (html_content || "").toLowerCase();

//     if (
//       html.includes("ucb") ||
//       html.includes("cybersource") ||
//       url.includes("cybersource")
//     ) {
//       setGatewayType("ucb");
//       setStatusMessage("Preparing UCB payment form...");
//     } else if (
//       url.includes("sslcommerz") ||
//       url.includes("sandbox.sslcommerz")
//     ) {
//       setGatewayType("sslcommerz");
//       setStatusMessage("Redirecting to SSLCommerz...");
//     } else if (url.includes("bkash") || url.includes("app.bka.sh")) {
//       setGatewayType("bkash");
//       setStatusMessage("Opening bKash...");
//     } else if (url.includes("nagad") || url.includes("nagad.com.bd")) {
//       setGatewayType("nagad");
//       setStatusMessage("Opening Nagad...");
//     } else if (
//       url.includes("spg") ||
//       url.includes("sonali") ||
//       url.includes("e-gp")
//     ) {
//       setGatewayType("spg");
//       setStatusMessage("Redirecting to Sonali e-GP/SPG...");
//     } else {
//       setGatewayType("other");
//     }
//   }, [payment_url, html_content]);

//   // ────────────────────────────────────────────────
//   // Source for WebView
//   // ────────────────────────────────────────────────
//   const webViewSource = useMemo(() => {
//     if (html_content) return { html: html_content };
//     if (payment_url) return { uri: payment_url };
//     return { html: "<h2>Error: No payment URL or content provided</h2>" };
//   }, [payment_url, html_content]);

//   // ────────────────────────────────────────────────
//   // Check if URL is allowed (payment gateway only)
//   // ────────────────────────────────────────────────
//   const isAllowedUrl = useCallback((url: string) => {
//     const urlLower = url.toLowerCase();
//     return ALLOWED_DOMAINS.some((domain) => urlLower.includes(domain));
//   }, []);

//   // ────────────────────────────────────────────────
//   // Check if URL is a reconciliation callback to your backend
//   // ────────────────────────────────────────────────
//   const isReconciliationUrl = useCallback((url: string) => {
//     const urlLower = url.toLowerCase();
//     return (
//       urlLower.includes(BACKEND_DOMAIN) &&
//       (urlLower.includes("/payment/reconcile") ||
//         urlLower.includes("/api/payment/callback"))
//     );
//   }, []);

//   // ────────────────────────────────────────────────
//   // Check for SSLCommerz error page content
//   // ────────────────────────────────────────────────
//   const isSSLCommerzErrorContent = useCallback((html: string) => {
//     const htmlLower = html.toLowerCase();
//     const sslErrorPatterns = [
//       "system_error",
//       "configuration missing",
//       "error status 500",
//       "data errors",
//       "field null",
//       "404 configuration",
//       "unsuccessful",
//       "payment failed",
//     ];

//     return sslErrorPatterns.some((pattern) => htmlLower.includes(pattern));
//   }, []);

//   // ────────────────────────────────────────────────
//   // Extract parameters from reconciliation URL
//   // ────────────────────────────────────────────────
//   const extractReconciliationParams = useCallback(
//     (url: string) => {
//       try {
//         const urlObj = new URL(url);
//         const status = urlObj.searchParams.get("status");
//         const invoice = urlObj.searchParams.get("invoice");
//         const transactionId =
//           urlObj.searchParams.get("transaction_id") ||
//           urlObj.searchParams.get("trxid") ||
//           urlObj.searchParams.get("tran_id");
//         const amountPaid =
//           urlObj.searchParams.get("amount") ||
//           urlObj.searchParams.get("total_amount");
//         const message =
//           urlObj.searchParams.get("message") || urlObj.searchParams.get("msg");

//         return {
//           status: status || "unknown",
//           invoice: invoice || "",
//           transactionId: transactionId || "",
//           amountPaid: amountPaid || amount || "0",
//           message: message || "",
//         };
//       } catch (error) {
//         ("Error parsing reconciliation URL:", error);
//         return {
//           status: "unknown",
//           invoice: "",
//           transactionId: "",
//           amountPaid: amount || "0",
//           message: "",
//         };
//       }
//     },
//     [amount],
//   );

//   // ────────────────────────────────────────────────
//   // Hardware back button handling
//   // ────────────────────────────────────────────────
//   useEffect(() => {
//     const backHandler = BackHandler.addEventListener(
//       "hardwareBackPress",
//       () => {
//         if (paymentCompleted) {
//           router.back();
//           return true;
//         }

//         if (canGoBack) {
//           webViewRef.current?.goBack();
//           return true;
//         }

//         Alert.alert(
//           "Exit Payment",
//           "Are you sure? Payment may not be completed.",
//           [
//             { text: "Continue", style: "cancel" },
//             {
//               text: "Exit",
//               style: "destructive",
//               onPress: () => router.back(),
//             },
//           ],
//         );

//         return true;
//       },
//     );

//     return () => backHandler.remove();
//   }, [canGoBack, paymentCompleted, router]);

//   // ────────────────────────────────────────────────
//   // Timeout protection (max 8 minutes)
//   // ────────────────────────────────────────────────
//   useEffect(() => {
//     if (paymentCompleted) return;

//     const timeout = setTimeout(
//       () => {
//         if (!paymentCompleted) {
//           Alert.alert(
//             "Payment Timeout",
//             "The payment process took too long. Please try again.",
//             [{ text: "OK", onPress: () => router.back() }],
//           );
//         }
//       },
//       8 * 60 * 1000,
//     );

//     return () => clearTimeout(timeout);
//   }, [paymentCompleted]);

//   const handlePaymentSuccess = useCallback(() => {
//     if (paymentCompleted) return;

//     setPaymentCompleted(true);
//     setStatusMessage("Payment successful!");

//     // Stop loading and clear the WebView
//     webViewRef.current?.stopLoading();
//     webViewRef.current?.injectJavaScript(`
//       document.body.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);"><div style="text-align: center; padding: 2rem;"><div style="font-size: 64px; color: #059669;">✓</div><h2 style="color: #065f46; margin-top: 1rem;">Payment Successful!</h2><p style="color: #047857; margin-top: 0.5rem;">Redirecting to receipt...</p></div></div>';
//     `);

//     setTimeout(() => {
//       router.replace({
//         pathname: "/payments/available_payment/success",
//         params: {
//           transaction_id: transaction_id || `TX_${Date.now().toString(36)}`,
//           amount_paid: amount || "0",
//           payment_date: new Date().toISOString(),
//           gateway: gatewayType.toUpperCase(),
//         },
//       });
//     }, 1200);
//   }, [paymentCompleted, transaction_id, amount, gatewayType, router]);

//   const handlePaymentFailure = useCallback(
//     (errorMessage = "Payment could not be completed") => {
//       if (paymentCompleted) return;

//       setPaymentCompleted(true);
//       setStatusMessage("Payment failed");

//       // Stop loading and clear the WebView
//       webViewRef.current?.stopLoading();
//       webViewRef.current?.injectJavaScript(`
//       document.body.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);"><div style="text-align: center; padding: 2rem;"><div style="font-size: 64px; color: #dc2626;">✗</div><h2 style="color: #991b1b; margin-top: 1rem;">Payment Failed</h2><p style="color: #b91c1c; margin-top: 0.5rem;">${errorMessage}</p><p style="color: #b91c1c;">Redirecting to app...</p></div></div>';
//     `);

//       setTimeout(() => {
//         router.replace({
//           pathname: "/payments/available_payment/fail",
//           params: {
//             transaction_id: transaction_id || "",
//             amount: amount || "0",
//             error_message: errorMessage,
//             gateway: gatewayType.toUpperCase(),
//           },
//         });
//       }, 1200);
//     },
//     [paymentCompleted, transaction_id, amount, gatewayType, router],
//   );

//   const handleNavigationStateChange = useCallback(
//     (navState: WebViewNavigation) => {
//       const url = navState.url;
//       const urlLower = url.toLowerCase();
//       const title = navState.title || "";

//       ("🔗 Navigation:", { url, title });

//       setCanGoBack(navState.canGoBack);
//       setLoading(navState.loading);

//       // ─── Store last valid URL from allowed domains ───
//       if (isAllowedUrl(url)) {
//         setLastValidUrl(url);
//       }

//       // ─── INTERCEPT reconciliation callback ───
//       if (isReconciliationUrl(url) && !paymentCompleted) {
//         ("🛑 Intercepting reconciliation callback:", url);

//         // Stop WebView from loading the reconciliation page
//         webViewRef.current?.stopLoading();

//         // Extract parameters from URL
//         const params = extractReconciliationParams(url);

//         ("📊 Reconciliation params:", params);

//         // Handle based on status
//         if (params.status === "200" || params.status === "success") {
//           ("✅ Payment reconciliation successful");

//           // Show success message in WebView and redirect to app
//           webViewRef.current?.injectJavaScript(`
//             document.body.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);"><div style="text-align: center; padding: 2rem;"><div style="font-size: 64px; color: #059669;">✓</div><h2 style="color: #065f46; margin-top: 1rem;">Payment Successful!</h2><p style="color: #047857; margin-top: 0.5rem;">Invoice: ${params.invoice}</p><p style="color: #047857;">Redirecting to receipt...</p></div></div>';
//           `);

//           setStatusMessage("Payment verified successfully!");
//           setPaymentCompleted(true);

//           // Redirect to success page after short delay
//           setTimeout(() => {
//             router.replace({
//               pathname: "/payments/available_payment/success",
//               params: {
//                 transaction_id:
//                   params.transactionId ||
//                   transaction_id ||
//                   `TX_${Date.now().toString(36)}`,
//                 amount_paid: params.amountPaid || amount || "0",
//                 payment_date: new Date().toISOString(),
//                 gateway: gatewayType.toUpperCase(),
//                 invoice: params.invoice,
//                 message: params.message || "Payment completed successfully",
//               },
//             });
//           }, 1200);
//         } else if (
//           params.status === "400" ||
//           params.status === "fail" ||
//           params.status === "error"
//         ) {
//           ("❌ Payment reconciliation failed");

//           // Show failure message in WebView and redirect to app
//           webViewRef.current?.injectJavaScript(`
//             document.body.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);"><div style="text-align: center; padding: 2rem;"><div style="font-size: 64px; color: #dc2626;">✗</div><h2 style="color: #991b1b; margin-top: 1rem;">Verification Failed</h2><p style="color: #b91c1c; margin-top: 0.5rem;">Retry scheduled</p><p style="color: #b91c1c;">Redirecting to app...</p></div></div>';
//           `);

//           setStatusMessage("Payment verification failed");
//           setPaymentCompleted(true);

//           // Redirect to failure page after short delay
//           setTimeout(() => {
//             router.replace({
//               pathname: "/payments/available_payment/fail",
//               params: {
//                 transaction_id: params.transactionId || transaction_id || "",
//                 amount: params.amountPaid || amount || "0",
//                 error_message:
//                   params.message ||
//                   "Payment verification failed. Retry scheduled.",
//                 gateway: gatewayType.toUpperCase(),
//                 invoice: params.invoice,
//               },
//             });
//           }, 1200);
//         } else {
//           ("❓ Unknown reconciliation status:", params.status);

//           // For unknown status, redirect back to payment gateway
//           if (lastValidUrl) {
//             webViewRef.current?.injectJavaScript(`
//               window.location.href = '${lastValidUrl}';
//             `);
//           }
//         }

//         return;
//       }

//       // ─── Block other external redirects ───
//       if (!isAllowedUrl(url) && !paymentCompleted) {
//         ("🚫 Blocking external redirect to:", url);

//         // Check if this might be a payment result page based on content
//         const bodyText = title.toLowerCase();
//         const isSuccess =
//           bodyText.includes("success") ||
//           bodyText.includes("completed") ||
//           bodyText.includes("approved") ||
//           bodyText.includes("সফল") ||
//           urlLower.includes("success");
//         const isFailure =
//           bodyText.includes("fail") ||
//           bodyText.includes("declined") ||
//           bodyText.includes("error") ||
//           bodyText.includes("ব্যর্থ") ||
//           urlLower.includes("fail") ||
//           urlLower.includes("error");

//         if (isSuccess) {
//           ("✅ Detected success on external page");
//           handlePaymentSuccess();
//         } else if (isFailure) {
//           ("❌ Detected failure on external page");
//           handlePaymentFailure("Payment failed on external page");
//         } else {
//           // Not a result page, block and redirect back
//           if (lastValidUrl) {
//             webViewRef.current?.injectJavaScript(`
//               window.location.href = '${lastValidUrl}';
//             `);
//           }
//         }

//         return;
//       }

//       // ─── Deep link detection (very important for bKash/Nagad) ───
//       if (
//         urlLower.startsWith("bkash://") ||
//         urlLower.startsWith("nagad://") ||
//         urlLower.startsWith("rocket://")
//       ) {
//         Linking.openURL(url).catch(() => {
//           Alert.alert(
//             "App Required",
//             `Please install the ${gatewayType.toUpperCase()} app to complete payment.`,
//           );
//           router.back();
//         });
//         setPaymentCompleted(true);
//         setStatusMessage("Opening mobile payment app...");
//         return;
//       }

//       // ─── UCB callback page special handling ───
//       if (
//         gatewayType === "ucb" &&
//         urlLower.includes("/api/") &&
//         urlLower.includes("reciever")
//       ) {
//         setStatusMessage("Verifying UCB payment result...");
//         // Give page time to load → then check via JS
//         setTimeout(() => {
//           webViewRef.current?.injectJavaScript(`
//           (function() {
//             const text = document.body.innerText.toLowerCase();
//             if (text.includes('success') || text.includes('completed') || text.includes('approved') || /transaction.*[0-9a-f-]{8,}/.test(text)) {
//               window.ReactNativeWebView.postMessage('UCB_SUCCESS_DETECTED');
//             } else if (text.includes('fail') || text.includes('decline') || text.includes('error')) {
//               window.ReactNativeWebView.postMessage('UCB_FAILURE_DETECTED');
//             }
//           })();
//         `);
//         }, 2500);
//       }
//     },
//     [
//       gatewayType,
//       paymentCompleted,
//       lastValidUrl,
//       isAllowedUrl,
//       isReconciliationUrl,
//       extractReconciliationParams,
//       router,
//       transaction_id,
//       amount,
//       handlePaymentSuccess,
//       handlePaymentFailure,
//     ],
//   );

//   // ────────────────────────────────────────────────
//   // Enhanced injected JavaScript (blocks ALL external navigation)
//   // ────────────────────────────────────────────────
//   const injectedJavaScript = useMemo(
//     () => `
//     (function() {
//       ('[PaymentJS] Monitoring started - ${gatewayType}');

//       const allowedDomains = ${JSON.stringify(ALLOWED_DOMAINS)};
//       const backendDomain = '${BACKEND_DOMAIN}';

//       // ─── Helper to check if URL is allowed (payment gateway only) ───
//       function isUrlAllowed(url) {
//         const urlLower = url.toLowerCase();
//         return allowedDomains.some(domain => urlLower.includes(domain));
//       }

//       // ─── Helper to check if URL is reconciliation callback ───
//       function isReconciliationUrl(url) {
//         const urlLower = url.toLowerCase();
//         return urlLower.includes(backendDomain) &&
//                (urlLower.includes('/payment/reconcile') ||
//                 urlLower.includes('/api/payment/callback'));
//       }

//       // ─── Intercept ALL link clicks ───
//       document.addEventListener('click', function(e) {
//         let target = e.target;
//         while (target && target.tagName !== 'A') {
//           target = target.parentElement;
//         }

//         if (target && target.href) {
//           const href = target.href;

//           // Check if it's a reconciliation URL
//           if (isReconciliationUrl(href)) {
//             e.preventDefault();
//             e.stopPropagation();
//             ('Intercepting reconciliation link:', href);

//             // Extract status from URL
//             const urlParams = new URLSearchParams(href.split('?')[1] || '');
//             const status = urlParams.get('status');

//             if (status === '200' || status === 'success') {
//               window.ReactNativeWebView.postMessage('RECONCILE_SUCCESS');
//             } else if (status === '400' || status === 'fail' || status === 'error') {
//               window.ReactNativeWebView.postMessage('RECONCILE_FAILURE');
//             }

//             return false;
//           }

//           // Check if URL is allowed (payment gateway only)
//           if (!isUrlAllowed(href)) {
//             e.preventDefault();
//             e.stopPropagation();
//             ('Blocked external link click:', href);

//             // Check if this is a success/failure redirect
//             const isSuccess = href.includes('success') || href.includes('thank') || href.includes('complete');
//             const isFailure = href.includes('fail') || href.includes('error') || href.includes('cancel');

//             if (isSuccess) {
//               window.ReactNativeWebView.postMessage('PAYMENT_SUCCESS_DETECTED');
//             } else if (isFailure) {
//               window.ReactNativeWebView.postMessage('PAYMENT_FAILURE_DETECTED');
//             }

//             return false;
//           }
//         }
//       }, true);

//       // ─── Intercept form submissions ───
//       document.addEventListener('submit', function(e) {
//         const form = e.target;
//         if (form.action) {
//           const action = form.action;

//           // Check if it's a reconciliation form
//           if (isReconciliationUrl(action)) {
//             e.preventDefault();
//             ('Intercepting reconciliation form submission:', action);

//             // You could extract form data here if needed
//             window.ReactNativeWebView.postMessage('RECONCILE_FORM_SUBMITTED');

//             return false;
//           }

//           if (!isUrlAllowed(action)) {
//             e.preventDefault();
//             ('Blocked external form submission:', action);

//             // Check form data for result indicators
//             const formData = new FormData(form);
//             const formText = Array.from(formData.entries()).toString().toLowerCase();

//             if (formText.includes('success') || formText.includes('approved')) {
//               window.ReactNativeWebView.postMessage('PAYMENT_SUCCESS_DETECTED');
//             } else if (formText.includes('fail') || formText.includes('declined')) {
//               window.ReactNativeWebView.postMessage('PAYMENT_FAILURE_DETECTED');
//             }

//             return false;
//           }
//         }
//       }, true);

//       // ─── UCB auto-submit form ───
//       if (document.getElementById('ucb-payment-form') || document.body.innerHTML.includes('Redirecting to UCB')) {
//         setTimeout(() => {
//           const form = document.getElementById('ucb-payment-form');
//           if (form && !window.hasSubmittedUCB) {
//             window.hasSubmittedUCB = true;
//             window.ReactNativeWebView.postMessage('UCB_FORM_AUTO_SUBMITTED');
//             form.submit();
//           }
//         }, 1200);
//       }

//       // ─── SSLCommerz error detection ───
//       function checkSSLCommerzErrors() {
//         if (!window.location.href.includes('sslcommerz')) return;

//         const bodyText = document.body.innerText.toLowerCase();
//         const pageHTML = document.body.innerHTML.toLowerCase();

//         // SSLCommerz specific error patterns
//         const sslErrorPatterns = [
//           'system_error',
//           'configuration missing',
//           'error status 500',
//           'data errors',
//           'field null',
//           '404 configuration',
//           'unsuccessful',
//           'payment failed',
//           'could not process',
//           'invalid request'
//         ];

//         for (const pattern of sslErrorPatterns) {
//           if (bodyText.includes(pattern) || pageHTML.includes(pattern)) {
//             let errorMessage = "SSLCommerz payment error";

//             if (pattern.includes('configuration missing') || pattern.includes('system_error')) {
//               errorMessage = "Payment gateway configuration error. Please contact support.";
//             } else if (pattern.includes('field null')) {
//               errorMessage = "Required payment information is missing or invalid.";
//             } else if (pattern.includes('404')) {
//               errorMessage = "Payment page not found. Please try again.";
//             } else if (pattern.includes('500')) {
//               errorMessage = "Internal server error. Please try again later.";
//             } else if (pattern.includes('data error')) {
//               errorMessage = "Payment data error. Please check your information.";
//             }

//             window.ReactNativeWebView.postMessage(
//               JSON.stringify({
//                 type: 'SSLCOMMERZ_ERROR',
//                 message: errorMessage,
//                 pattern: pattern
//               })
//             );
//             break;
//           }
//         }
//       }

//       // ─── Result monitoring ───
//       function checkResult() {
//         const text = document.body.innerText.toLowerCase();
//         const loc = window.location.href.toLowerCase();

//         // Check for SSLCommerz errors
//         checkSSLCommerzErrors();

//         // Don't check results on gateway domains (except for errors)
//         const isOnGateway = isUrlAllowed(loc);

//         if (isOnGateway && !loc.includes('sslcommerz')) return;

//         if (/success|completed|approved|thank you|অভিনন্দন|সফল|payment successful/i.test(text)) {
//           window.ReactNativeWebView.postMessage('PAYMENT_SUCCESS_DETECTED');
//         }
//         if (/fail|failed|declined|cancel|error|verification failed|ব্যর্থ|অনুমোদন হয়নি|unsuccessful/i.test(text)) {
//           window.ReactNativeWebView.postMessage('PAYMENT_FAILURE_DETECTED');
//         }
//       }

//       setTimeout(checkResult, 2000);
//       setInterval(checkResult, 3000);

//       true;
//     })();
//   `,
//     [gatewayType],
//   );

//   const handleMessage = useCallback(
//     (event: WebViewMessageEvent) => {
//       try {
//         const msg = event.nativeEvent.data;
//         ("[WebView Message]", msg);

//         // Try to parse as JSON first
//         try {
//           const data = JSON.parse(msg);
//           if (data.type === "SSLCOMMERZ_ERROR") {
//             ("❌ SSLCommerz error detected:", data.message);
//             handlePaymentFailure(data.message || "SSLCommerz payment error");
//             return;
//           }
//         } catch (e) {
//           // Not JSON, continue with string messages
//         }

//         if (msg === "UCB_FORM_AUTO_SUBMITTED") {
//           setHasAutoSubmitted(true);
//           setStatusMessage("Form submitted — redirecting to bank...");
//         }

//         if (msg === "RECONCILE_SUCCESS") {
//           ("✅ Reconciliation success message received");
//           handlePaymentSuccess();
//         }

//         if (msg === "RECONCILE_FAILURE") {
//           ("❌ Reconciliation failure message received");
//           handlePaymentFailure("Payment verification failed");
//         }

//         if (
//           msg === "PAYMENT_SUCCESS_DETECTED" ||
//           msg === "UCB_SUCCESS_DETECTED"
//         ) {
//           if (!paymentCompleted) {
//             handlePaymentSuccess();
//           }
//         }

//         if (
//           msg === "PAYMENT_FAILURE_DETECTED" ||
//           msg === "UCB_FAILURE_DETECTED"
//         ) {
//           if (!paymentCompleted) {
//             handlePaymentFailure("Payment verification failed");
//           }
//         }
//       } catch (error) {
//         ("Error handling WebView message:", error);
//       }
//     },
//     [paymentCompleted, handlePaymentSuccess, handlePaymentFailure],
//   );

//   const handleClose = () => {
//     if (paymentCompleted) {
//       router.back();
//       return;
//     }

//     Alert.alert("Exit Payment", "Are you sure? Payment may be incomplete.", [
//       { text: "Continue", style: "cancel" },
//       { text: "Exit", style: "destructive", onPress: () => router.back() },
//     ]);
//   };

//   const handleRefresh = () => {
//     webViewRef.current?.reload();
//   };

//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
//       {/* <Stack.Screen options={{ headerShown: false }} /> */}

//       {/* Header */}
//       {/* <View
//         style={{
//           flexDirection: "row",
//           alignItems: "center",
//           justifyContent: "space-between",
//           paddingHorizontal: 16,
//           paddingVertical: 12,
//           borderBottomWidth: 1,
//           borderBottomColor: "#e5e7eb",
//         }}
//       >
//         <TouchableOpacity
//           onPress={handleClose}
//           hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
//         >
//           <Ionicons name="arrow-back" size={28} color="#374151" />
//         </TouchableOpacity>

//         <View style={{ flex: 1, alignItems: "center" }}>
//           <Text style={{ fontSize: 18, fontWeight: "700", color: "#1f2937" }}>
//             {gatewayType === "ucb"
//               ? "UCB Bank"
//               : gatewayType === "sslcommerz"
//                 ? "SSLCommerz"
//                 : gatewayType === "bkash"
//                   ? "bKash"
//                   : gatewayType === "nagad"
//                     ? "Nagad"
//                     : gatewayType === "spg"
//                       ? "Sonali SPG"
//                       : "Secure Payment"}
//           </Text>
//           <Text style={{ fontSize: 15, color: "#4b5563", marginTop: 2 }}>
//             ৳{" "}
//             {Number(amount || 0).toLocaleString("bn-BD", {
//               minimumFractionDigits: 2,
//             })}
//           </Text>
//           <Text style={{ fontSize: 13, color: "#2563eb", marginTop: 4 }}>
//             {statusMessage}
//           </Text>
//         </View>

//         <TouchableOpacity
//           onPress={handleRefresh}
//           hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
//         >
//           <Ionicons name="refresh" size={24} color="#374151" />
//         </TouchableOpacity>
//       </View> */}

//       {/* WebView Area */}
//       <View style={{ flex: 1, position: "relative" }}>
//         <WebView
//           ref={webViewRef}
//           source={webViewSource}
//           androidLayerType="hardware" // ← very important on many Android devices
//           cacheEnabled={true}
//           cacheMode="LOAD_CACHE_ELSE_NETWORK"
//           onNavigationStateChange={handleNavigationStateChange}
//           // onLoadStart={() => setLoading(true)}
//           onLoadEnd={() => {
//             // setLoading(false);
//             // Check for SSLCommerz errors after page loads
//             if (gatewayType === "sslcommerz" && !paymentCompleted) {
//               setTimeout(() => {
//                 webViewRef.current?.injectJavaScript(`
//                   (function() {
//                     const bodyText = document.body.innerText.toLowerCase();
//                     if (bodyText.includes('system_error') ||
//                         bodyText.includes('configuration missing') ||
//                         bodyText.includes('error status 500') ||
//                         bodyText.includes('data errors') ||
//                         bodyText.includes('field null')) {
//                       window.ReactNativeWebView.postMessage(
//                         JSON.stringify({
//                           type: 'SSLCOMMERZ_ERROR',
//                           message: 'SSLCommerz configuration error. Please contact support.'
//                         })
//                       );
//                     }
//                   })();
//                 `);
//               }, 1500);
//             }
//           }}
//           onError={(s) => {
//             ("WebView error:", s.nativeEvent);
//             if (!paymentCompleted) {
//               Alert.alert("Connection Error", "Cannot reach payment gateway.", [
//                 { text: "Retry", onPress: () => webViewRef.current?.reload() },
//                 {
//                   text: "Cancel",
//                   onPress: () => router.back(),
//                   style: "cancel",
//                 },
//               ]);
//             }
//           }}
//           onMessage={handleMessage}
//           injectedJavaScript={injectedJavaScript}
//           javaScriptEnabled={true}
//           domStorageEnabled={true}
//           startInLoadingState={true}
//           scalesPageToFit={true}
//           mixedContentMode="always"
//           userAgent={
//             Platform.OS === "ios"
//               ? "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
//               : "Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36"
//           }
//           onShouldStartLoadWithRequest={(request) => {
//             // INTERCEPT reconciliation URLs - DON'T let them load
//             if (isReconciliationUrl(request.url)) {
//               (
//                 "🛑 Intercepting reconciliation request:",
//                 request.url,
//               );

//               // Extract params and handle in JavaScript instead
//               webViewRef.current?.injectJavaScript(`
//                 (function() {
//                   const url = '${request.url}';
//                   const urlParams = new URLSearchParams(url.split('?')[1] || '');
//                   const status = urlParams.get('status');

//                   if (status === '200' || status === 'success') {
//                     window.ReactNativeWebView.postMessage('RECONCILE_SUCCESS');
//                   } else if (status === '400' || status === 'fail' || status === 'error') {
//                     window.ReactNativeWebView.postMessage('RECONCILE_FAILURE');
//                   }
//                 })();
//               `);

//               return false; // BLOCK the request
//             }

//             // Block any other external navigation attempts
//             if (!isAllowedUrl(request.url) && !paymentCompleted) {
//               ("🚫 Blocked external request to:", request.url);
//               return false;
//             }
//             return true;
//           }}
//         />

//         {loading && !paymentCompleted && (
//           <View
//             style={{
//               position: "absolute",
//               inset: 0,
//               backgroundColor: "#fff",
//               alignItems: "center",
//               justifyContent: "center",
//             }}
//           >
//             <ActivityIndicator size="large" color="#3b82f6" />
//             <Text style={{ marginTop: 16, color: "#4b5563", fontSize: 15 }}>
//               {statusMessage}
//             </Text>
//           </View>
//         )}
//       </View>

//       {/* Footer Status */}
//       <View
//         style={{
//           padding: 12,
//           borderTopWidth: 1,
//           borderTopColor: "#e5e7eb",
//           backgroundColor: "#f9fafb",
//         }}
//       >
//         <View
//           style={{
//             flexDirection: "row",
//             alignItems: "center",
//             justifyContent: "space-between",
//           }}
//         >
//           <View style={{ flexDirection: "row", alignItems: "center" }}>
//             <Ionicons
//               name={paymentCompleted ? "checkmark-circle" : "lock-closed"}
//               size={18}
//               color={paymentCompleted ? "#10b981" : "#3b82f6"}
//             />
//             <Text style={{ marginLeft: 8, fontSize: 13, color: "#374151" }}>
//               {paymentCompleted ? "Payment processed" : "Secure connection"}
//             </Text>
//           </View>

//           <Text style={{ fontSize: 12, color: "#6b7280" }}>
//             {gatewayType.toUpperCase()}
//           </Text>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// };

// export default PaymentWebView;
