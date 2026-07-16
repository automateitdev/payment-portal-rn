// AppMenu.tsx
import { logout } from "@/redux/feature/authSlice";
import { useAppDispatch } from "@/redux/hook";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import AppMenuItem from "./AppMenuItem";
import { baseApi } from "@/redux/baseApi/baseApi";
interface AppMenuProps {
  onMenuPress?: () => void;
}
const AppMenu = ({ onMenuPress }: AppMenuProps) => {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const dispatch = useAppDispatch();

  const handleLogout = () => {
    dispatch(logout());
    dispatch(baseApi.util.resetApiState());
  };
  const menuData = [
    {
      label: "Dashboard",
      icon: "grid-outline",
      to: "/",
    },

    {
      label: "Semester Exam",
      icon: "school-outline",
      to: "/semester_exam//semester_exam//semester_exam",
    },
    {
      label: "Invoices",
      icon: "receipt-outline",
      to: "/payments/invoices/invoices",
    },
    {
      label: "Available Payable",
      icon: "wallet-outline",
      to: "/payments/available_payment/available_payment",
    },
    // {
    //   label: "Payments",
    //   items: [
    //     {
    //       label: "Invoices",
    //       icon: "receipt-outline",
    //       to: "/payments/invoices/invoices",
    //     },
    //     {
    //       label: "Available Payable",
    //       icon: "wallet-outline",
    //       to: "/payments/available_payment/available_payment",
    //     },
    //   ],
    // },

    {
      label: "Logout",
      icon: "log-out-outline",
      command: handleLogout,
      danger: true,
    },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Menu Items */}
        {menuData.map((group, i) => (
          <AppMenuItem
            key={group.label || `group-${i}`}
            item={group}
            index={i}
            root={true}
            activeKey={activeKey}
            setActiveKey={setActiveKey}
            onMenuPress={onMenuPress}
          />
        ))}

        {/* Bottom spacing */}
        <View className="h-24" />
      </ScrollView>

      {/* Optional bottom actions / version */}
      <View className="border-t border-gray-200 bg-white px-5 py-4">
        <TouchableOpacity
          activeOpacity={0.7}
          className="flex-row items-center py-2"
        >
          <Ionicons name="settings-outline" size={20} color="#6b7280" />
          <Text className="ml-3 text-gray-700">Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AppMenu;
