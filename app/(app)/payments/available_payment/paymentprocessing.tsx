// src/screens/payments/PaymentProcessing.tsx
import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, SafeAreaView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

interface PaymentProcessingParams {
  transaction_id?: string;
  amount?: string;
}

const PaymentProcessing = () => {
  // const router = useRouter();
  const params = useLocalSearchParams<PaymentProcessingParams>();
  const [dots, setDots] = useState("");

  const { transaction_id = "", amount = "0" } = params;

  useEffect(() => {
    // Animate dots
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-blue-50">
      <View className="flex-1 items-center justify-center p-6">
        {/* Processing Animation */}
        <View className="mb-8">
          <View className="w-40 h-40 bg-blue-100 rounded-full items-center justify-center">
            <ActivityIndicator size="large" color="#3b82f6" />
            <MaterialIcons
              name="payment"
              size={60}
              color="#3b82f6"
              style={{ position: "absolute" }}
            />
          </View>
        </View>

        {/* Processing Message */}
        <Text className="text-2xl font-bold text-blue-700 mb-4 text-center">
          Processing Payment{dots}
        </Text>

        <Text className="text-lg text-blue-600 mb-6 text-center">
          Please do not close the app or press the back button
        </Text>

        {/* Transaction Info */}
        <View className="w-full bg-white rounded-2xl p-6 shadow-sm border border-blue-200 mb-6">
          <Text className="text-xl font-bold text-gray-800 mb-4 text-center">
            Payment Details
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

            <View className="flex-row justify-between items-center py-2">
              <Text className="text-gray-600 font-medium">Amount</Text>
              <Text className="text-2xl font-bold text-green-600">
                ৳{" "}
                {parseFloat(amount).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Tips */}
        <View className="w-full p-4 bg-blue-50 rounded-xl border border-blue-200">
          <Text className="text-blue-700 text-center">
            This may take a few moments. Your transaction is secure and
            encrypted.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default PaymentProcessing;
