// src/screens/payments/PaymentFailure.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

interface PaymentFailureParams {
  error_code?: string;
  error_message?: string;
  transaction_id?: string;
  amount?: string;
}

const PaymentFailure = () => {
  const router = useRouter();
  const params = useLocalSearchParams<PaymentFailureParams>();

  const {
    error_code = "PAYMENT_FAILED",
    error_message = "We could not process the payment currently. Please try later!",
    transaction_id = "",
    amount = "0",
  } = params;

  const handleContactSupport = () => {
    // Implement contact support logic
    const supportEmail = "cs.edufee@gmail.com";
    const subject = `Payment Failed - Transaction ID: ${transaction_id}`;
    const body = `Transaction ID: ${transaction_id}\nError Code: ${error_code}\nAmount: ৳${amount}`;

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
              {transaction_id ? (
                <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                  <Text className="text-gray-600 font-medium">
                    Transaction ID
                  </Text>
                  <Text className="text-gray-800 font-semibold">
                    {transaction_id}
                  </Text>
                </View>
              ) : null}

              <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                <Text className="text-gray-600 font-medium">Error Code</Text>
                <Text className="text-red-600 font-semibold">{error_code}</Text>
              </View>

              {amount && amount !== "0" ? (
                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-gray-600 font-medium">Amount</Text>
                  <Text className="text-gray-800 font-semibold">
                    ৳{" "}
                    {parseFloat(amount).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
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
