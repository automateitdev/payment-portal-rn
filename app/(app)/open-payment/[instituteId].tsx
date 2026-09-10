import InvoicesTab from "@/components/OpenPayment/InvoicesTab";
import PaymentTab from "@/components/OpenPayment/PaymentTab";
import ReusableTab from "@/components/Tab/ReusableTab";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";

const TABS = [
  { key: "payment", label: "Payment" },
  { key: "invoices", label: "Invoices" },
];

const OpenPayment = () => {
  const { instituteId } = useLocalSearchParams<{ instituteId: string }>();
  const [activeKey, setActiveKey] = useState("payment");

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="w-full max-w-3xl mx-auto p-4">
        <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <Text className="text-xl font-black text-gray-800 mb-1">
            Open Payment
          </Text>
          <Text className="text-xs text-gray-400 font-medium mb-5">
            Institute ID: {instituteId}
          </Text>

          <ReusableTab
            tabs={TABS}
            activeKey={activeKey}
            onChange={setActiveKey}
            variant="underline"
            size="md"
          />

          <View className="mt-5">
            {activeKey === "payment" ? (
              <PaymentTab instituteId={String(instituteId)} />
            ) : (
              <InvoicesTab instituteId={String(instituteId)} />
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default OpenPayment;
