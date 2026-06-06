import { logout } from "@/redux/feature/authSlice";
import { toggleTheme } from "@/redux/feature/themeSlice";
import { useAppDispatch, useAppSelector } from "@/redux/hook";
import { RootState } from "@/redux/store";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

type Props = {
  onMenuPress?: () => void;
  onMorePress?: () => void;
};

const Head: React.FC<Props> = ({ onMorePress }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === "dark";

  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    dispatch(logout());
    setProfileOpen(false);
  };

  return (
    <View className="flex-row items-center justify-between px-4 py-1.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 z-50">
      {/* LEFT - Just Logo */}
      <View className="flex-row items-center">
        <Text className="text-2xl font-black tracking-tighter text-slate-950 dark:text-white">
          Auto<Text className="text-green-600">Pay</Text>
        </Text>
      </View>

      {/* RIGHT */}
      <View className="flex-row items-center gap-2">
        {/* Theme Toggle Button */}
        <TouchableOpacity
          onPress={() => dispatch(toggleTheme())}
          className="bg-gray-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700"
        >
          <Ionicons
            name={isDark ? "sunny-outline" : "moon-outline"}
            size={20}
            color={isDark ? "#facc15" : "#1e293b"}
          />
        </TouchableOpacity>

        <TouchableOpacity className="bg-gray-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
          <Ionicons
            name="notifications-outline"
            size={20}
            color={isDark ? "#e2e8f0" : "#1e293b"}
          />
        </TouchableOpacity>

        {isMobile ? (
          <TouchableOpacity
            onPress={onMorePress}
            className="w-10 h-10 items-center justify-center rounded-full bg-gray-50 dark:bg-slate-800 active:bg-gray-100"
          >
            <Ionicons
              name="person"
              size={20}
              color={isDark ? "#10b981" : "#064e3b"}
            />
          </TouchableOpacity>
        ) : (
          <>
            {/* PROFILE CLICK */}
            <TouchableOpacity
              onPress={() => setProfileOpen(true)}
              className="flex-row items-center gap-2 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-full"
            >
              <Ionicons
                name="person-circle"
                size={24}
                color={isDark ? "#10b981" : "#064e3b"}
              />
              <Text className="text-sm font-medium text-gray-700 dark:text-slate-200">
                Account
              </Text>
            </TouchableOpacity>

            {/* PROFILE MODAL */}
            <Modal transparent animationType="fade" visible={profileOpen}>
              <TouchableOpacity
                className="flex-1 bg-black/20"
                onPress={() => setProfileOpen(false)}
                activeOpacity={1}
              >
                <View className="absolute right-4 top-14 bg-white dark:bg-slate-900 rounded-lg shadow-lg w-44 overflow-hidden border border-gray-100 dark:border-slate-800">
                  <TouchableOpacity
                    onPress={handleLogout}
                    className="px-4 py-3 flex-row items-center"
                  >
                    <Ionicons
                      name="log-out-outline"
                      size={18}
                      color="#ef4444"
                    />
                    <Text className="ml-2 text-red-600 font-medium">
                      Logout
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>
          </>
        )}
      </View>
    </View>
  );
};

export default Head;
