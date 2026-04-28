import React from "react";
import { View, Platform, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/redux/hook";
import { logout } from "@/redux/feature/authSlice";
import { toggleTheme } from "@/redux/feature/themeSlice";
import { RootState } from "@/redux/store";

const menuItems = [
  { label: "Dashboard", icon: "grid", to: "/" },
  { label: "Available Pay", icon: "wallet", to: "/payments/available_payment/available_payment" },
  { label: "Invoices", icon: "receipt", to: "/payments/invoices/invoices" },
  { label: "Exams", icon: "school", to: "/semester_exam/semester_exam/semester_exam" },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === "dark";

  return (
    <View className="w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 h-full py-8 px-4">
      {/* Brand Logo */}
      <View className="flex-row items-center px-4 mb-10">
        <View className="bg-emerald-500 p-2.5 rounded-2xl shadow-lg shadow-emerald-200">
          <Ionicons name="wallet" size={24} color="white" />
        </View>
        <Text className="ml-3 text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Edumate</Text>
      </View>

 

      {/* Navigation Links */}
      <View className="flex-1 space-y-2">
        <Text className="text-slate-400 text-[10px] font-black uppercase tracking-[2px] px-4 mb-4">Main Menu</Text>
        {menuItems.map((item) => {
          // Logic for active path
          const isActive = pathname === item.to || (item.to === "/" && pathname === "/");
          
          return (
            <TouchableOpacity
              key={item.label}
              onPress={() => router.push(item.to as any)}
              activeOpacity={0.7}
              className={`flex-row items-center p-4 rounded-2xl mb-1 ${
                isActive 
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20' 
                  : 'border border-transparent'
              }`}
            >
              <View className={`${isActive ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-slate-800'} p-1.5 rounded-lg mr-3`}>
                <Ionicons 
                  name={(isActive ? item.icon : `${item.icon}-outline`) as any} 
                  size={18} 
                  color={isActive ? "white" : "#94a3b8"} 
                />
              </View>
              <Text className={`font-bold text-sm ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {item.label}
              </Text>
              {isActive && (
                <View className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </TouchableOpacity>
          );
        })}
      {/* Theme Toggle */}
      <TouchableOpacity 
        onPress={() => dispatch(toggleTheme())}
        activeOpacity={0.7}
        className="flex-row items-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 mb-4"
      >
        <View className={`${isDark ? 'bg-amber-500/10' : 'bg-indigo-50'} p-2 rounded-xl mr-3`}>
          <Ionicons 
            name={isDark ? "sunny" : "moon"} 
            size={18} 
            color={isDark ? "#f59e0b" : "#6366f1"} 
          />
        </View>
        <Text className="font-bold text-slate-700 dark:text-slate-300">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </Text>
      </TouchableOpacity>
      </View>

      {/* Logout Action */}
      <TouchableOpacity 
        onPress={() => dispatch(logout())}
        className="flex-row items-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
      >
        <View className="bg-rose-100 dark:bg-rose-500/20 p-2 rounded-xl mr-3">
          <Ionicons name="log-out-outline" size={18} color="#f43f5e" />
        </View>
        <Text className="font-bold text-slate-700 dark:text-slate-300">Log out</Text>
      </TouchableOpacity>
    </View>
  );
}
