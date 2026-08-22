// src/screens/payments/PaymentFailure.tsx
import { useGetInstituteInfoQuery } from "@/redux/allApi/authApi/authApi";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import {
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface PaymentFailureParams {
  // Real deep-link redirect from the payment gateway:
  // paymentportal://payments/available_payment/fail?status=400&invoice=ACM...
  // paymentwebview.tsx parses these straight off navState.url and forwards
  // them here — no OS "open URL" hand-off needed.
  status?: string;
  invoice?: string;
  // Legacy in-app navigation params (still supported as a fallback).
  error_code?: string;
  error_message?: string;
  amount?: string;
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (value?: number | string | null) => {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? NaN);
  if (Number.isNaN(num)) return null;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const PaymentFailure = () => {
  const router = useRouter();
  const params = useLocalSearchParams<PaymentFailureParams>();

  const {
    status,
    invoice,
    error_code,
    error_message = "We could not process the payment currently. Please try later!",
    amount,
  } = params;

  // Student/institute ID come from the logged-in user's own account info —
  // not from the failed payment itself. `invoice` and `amount` are forwarded
  // by paymentwebview.tsx, parsed directly off the gateway's redirect URL
  // (navState.url) rather than from any API lookup.
  const { data: instituteData } = useGetInstituteInfoQuery({});
  const userData = useMemo(
    () => instituteData?.payload?.data?.user || {},
    [instituteData],
  );

  const displayInvoiceNo = invoice || "";
  const displayAmount = formatCurrency(amount);
  const displayDate = formatDate(new Date().toISOString());
  const displayStudentId = userData.student_id || "";
  const displayInstituteId = userData.institute_id || "";
  const displayErrorCode = status || error_code || "PAYMENT_FAILED";

  const handleContactSupport = () => {
    // Implement contact support logic
    const supportEmail = "cs.edufee@gmail.com";
    const subject = `Payment Failed - ${displayInvoiceNo || displayErrorCode}`;
    const body = [
      `Invoice: ${displayInvoiceNo || "-"}`,
      `Date: ${displayDate}`,
      `Amount: ৳${displayAmount || amount || "-"}`,
      `Student ID: ${displayStudentId || "-"}`,
      `Institute ID: ${displayInstituteId || "-"}`,
      `Error Code: ${displayErrorCode}`,
      `Error Message: ${error_message}`,
    ].join("\n");

    Linking.openURL(
      `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    ).catch((err) => console.error("Failed to open email client:", err));
  };

  return (
    <SafeAreaView className="flex-1 bg-red-50">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 items-center justify-center p-6">
          {/* Failure Icon */}
          <View className="mb-6">
            <View className="w-32 h-32 bg-red-100 rounded-full items-center justify-center">
              <MaterialIcons name="error" size={80} color="#ef4444" />
            </View>
          </View>

          {/* Failure Message */}
          <Text className="text-3xl font-bold text-red-700 mb-2 text-center">
            Payment Failed!
          </Text>

          <Text className="text-lg text-red-600 mb-6 text-center">
            {error_message}
          </Text>

          {/* Error Details Card */}
          <View className="w-full bg-white rounded-2xl p-6 shadow-sm border border-red-200 mb-6">
            <Text className="text-xl font-bold text-gray-800 mb-4 text-center">
              Error Details
            </Text>

            <View className="space-y-4">
              {displayInvoiceNo ? (
                <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                  <Text className="text-gray-600 font-medium">Invoice ID</Text>
                  <Text className="text-gray-800 font-semibold" selectable>
                    {displayInvoiceNo}
                  </Text>
                </View>
              ) : null}

              <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                <Text className="text-gray-600 font-medium">Error Code</Text>
                <Text className="text-red-600 font-semibold">
                  {displayErrorCode}
                </Text>
              </View>

              {error_message ? (
                <View className="flex-row justify-between items-start py-2 border-b border-gray-100">
                  <Text className="text-gray-600 font-medium">
                    Error Message
                  </Text>
                  <Text className="text-red-600 font-semibold text-right flex-1 ml-4">
                    {error_message}
                  </Text>
                </View>
              ) : null}

              <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                <Text className="text-gray-600 font-medium">Date</Text>
                <Text className="text-gray-800 font-semibold">
                  {displayDate}
                </Text>
              </View>
            </View>

            <View className="space-y-4">
              {displayAmount ? (
                <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                  <Text className="text-gray-600 font-medium">Amount</Text>
                  <Text className="text-gray-800 font-semibold">
                    ৳ {displayAmount}
                  </Text>
                </View>
              ) : null}

              {displayStudentId ? (
                <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                  <Text className="text-gray-600 font-medium">Student ID</Text>
                  <Text className="text-gray-800 font-semibold">
                    {displayStudentId}
                  </Text>
                </View>
              ) : null}

              {displayInstituteId ? (
                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-gray-600 font-medium">
                    Institute ID
                  </Text>
                  <Text className="text-gray-800 font-semibold">
                    {displayInstituteId}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Possible Reasons */}
          <View className="w-full mb-6">
            <Text className="text-lg font-bold text-gray-800 mb-3">
              Possible Reasons:
            </Text>
            <View className="space-y-2">
              <View className="flex-row items-start">
                <MaterialIcons name="info" size={20} color="#f59e0b" />
                <Text className="text-gray-700 ml-2 flex-1">
                  Insufficient funds in your account
                </Text>
              </View>
              <View className="flex-row items-start">
                <MaterialIcons name="info" size={20} color="#f59e0b" />
                <Text className="text-gray-700 ml-2 flex-1">
                  Network connectivity issues
                </Text>
              </View>
              <View className="flex-row items-start">
                <MaterialIcons name="info" size={20} color="#f59e0b" />
                <Text className="text-gray-700 ml-2 flex-1">
                  Payment gateway timeout
                </Text>
              </View>
              <View className="flex-row items-start">
                <MaterialIcons name="info" size={20} color="#f59e0b" />
                <Text className="text-gray-700 ml-2 flex-1">
                  Incorrect payment details
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="w-full space-y-4">
            <TouchableOpacity
              onPress={handleContactSupport}
              className="flex-row items-center justify-center bg-yellow-600 py-4 px-6 rounded-xl"
            >
              <MaterialIcons name="support-agent" size={24} color="white" />
              <Text className="text-white font-semibold text-lg ml-3">
                Contact Support
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace("/")}
              className="flex-row items-center justify-center bg-gray-800 py-4 px-6 rounded-xl"
            >
              <MaterialIcons name="home" size={24} color="white" />
              <Text className="text-white font-semibold text-lg ml-3">
                Go to Home
              </Text>
            </TouchableOpacity>
          </View>

          {/* Help Text */}
          <View className="mt-8 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
            <Text className="text-yellow-700 text-center">
              যদি আপনার অ্যাকাউন্ট থেকে টাকা কেটে নেওয়া হয়ে থাকে, তাহলে
              অনুগ্রহ করে ১৫–২০ মিনিট অপেক্ষা করুন এবং আবার আপনার অ্যাকাউন্ট চেক
              করুন। এই সময়ের মধ্যে টাকা স্বয়ংক্রিয়ভাবে ফেরত চলে আসতে পারে।
              যদি এরপরও টাকা না পান, তাহলে সাপোর্টে যোগাযোগ করুন।
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PaymentFailure;
