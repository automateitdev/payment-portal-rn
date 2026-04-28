import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

interface PaymentSuccessParams {
  amount_paid?: string;
  payment_date?: string;
  message?: string;
}

const PaymentSuccess = () => {
  const router = useRouter();
  const params = useLocalSearchParams<PaymentSuccessParams>();
  const {
    amount_paid = "0",
    payment_date = new Date().toLocaleDateString(),
    message = "Your payment has been processed successfully.",
  } = params;

  // Optional: Auto-return to dashboard after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/payments/invoices/invoices");
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <SafeAreaView className="flex-1 bg-green-50">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 items-center justify-center p-6">
          {/* Success Icon */}
          <View className="mb-6">
            <View className="w-32 h-32 bg-green-100 rounded-full items-center justify-center">
              <MaterialIcons name="check-circle" size={80} color="#10b981" />
            </View>
          </View>

          {/* Success Message */}
          <Text className="text-3xl font-bold text-green-700 mb-2 text-center">
            Payment Successful!
          </Text>

          <Text className="text-lg text-green-600 mb-6 text-center">
            {message}
          </Text>

          {/* Transaction Details Card */}
          <View className="w-full bg-white rounded-2xl p-6 shadow-sm border border-green-200 mb-6">
            <Text className="text-xl font-bold text-gray-800 mb-4 text-center">
              Transaction Details
            </Text>

            <View className="space-y-4">
              <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                <Text className="text-gray-600 font-medium">Amount Paid</Text>
                <Text className="text-2xl font-bold text-green-600">
                  ৳{" "}
                  {parseFloat(amount_paid).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>

              <View className="flex-row justify-between items-center py-2">
                <Text className="text-gray-600 font-medium">Payment Date</Text>
                <Text className="text-gray-800 font-semibold">
                  {payment_date}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="w-full space-y-4">
            <TouchableOpacity
              onPress={() => router.replace("/payments/invoices/invoices")}
              className="flex-row items-center justify-center bg-gray-800 py-4 px-6 rounded-xl"
            >
              <MaterialIcons name="home" size={24} color="white" />
              <Text className="text-white font-semibold text-lg ml-3">
                Go to Invoices
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PaymentSuccess;
