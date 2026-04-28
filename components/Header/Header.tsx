import React, { useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { logout } from "@/redux/feature/authSlice";
import { useAppDispatch } from "@/redux/hook";
import Head from "./Head";
import { baseApi } from "@/redux/baseApi/baseApi";
import { SafeAreaView } from "react-native-safe-area-context";




const Header: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const dispatch = useAppDispatch();

  const handleLogout = async () => {
    setMenuOpen(false);
    dispatch(logout());
    dispatch(baseApi.util.resetApiState());
  };

  return (
    <>
      <SafeAreaView
        edges={["top"]}
        className="bg-white dark:bg-slate-900"
      >
        {/* Top Bar - Safe Area used here or inside Head */}
        <Head onMorePress={() => setMenuOpen(true)} />
      </SafeAreaView>

      {/* User Context Menu (Dropdown style) */}
      <Modal
        transparent
        animationType="fade"
        visible={menuOpen}
        onRequestClose={() => setMenuOpen(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/20"
          onPress={() => setMenuOpen(false)}
          activeOpacity={1}
        >
          {/* Adjust pt-16 based on your header height */}
          <View className="items-end p-4 pt-14">
            <View className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-52 overflow-hidden border border-gray-100 dark:border-slate-800">
              <MenuOption
                label="Logout"
                icon="log-out-outline"
                onPress={handleLogout}
                isDestructive
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

// Internal Helper for cleaner menu items
const MenuOption = ({ label, icon, onPress, isDestructive }: any) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex-row items-center p-4 border-b border-gray-50 dark:border-slate-800 active:bg-gray-50 dark:active:bg-slate-800"
  >
    <Ionicons
      name={icon}
      size={18}
      color={isDestructive ? "#ef4444" : "#64748b"}
    />
    <Text
      className={`ml-3 text-base ${isDestructive ? "text-red-500 font-semibold" : "text-slate-700 dark:text-slate-200"}`}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

export default Header;
