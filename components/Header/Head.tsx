import {
  NotificationItem,
  useFetchNotificationsQuery,
  useMarkNotificationReadMutation,
} from "@/redux/allApi/notifications/notificationsApi";
import { logout } from "@/redux/feature/authSlice";
import { toggleTheme } from "@/redux/feature/themeSlice";
import { useAppDispatch, useAppSelector } from "@/redux/hook";
import { RootState } from "@/redux/store";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: notificationsData, isFetching: isNotificationsLoading } =
    useFetchNotificationsQuery(undefined, {
      pollingInterval: 60000,
    });
  const notifications = notificationsData?.list || [];
  const unreadCount = notificationsData?.unreadCount || 0;
  const [markNotificationRead] = useMarkNotificationReadMutation();

  const handleLogout = async () => {
    dispatch(logout());
    setProfileOpen(false);
  };

  const handleNotificationPress = (item: NotificationItem) => {
    if (!item.read_at) {
      markNotificationRead(item.id);
    }
  };

  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
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

        <TouchableOpacity
          onPress={() => setNotifOpen(true)}
          className="bg-gray-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700"
        >
          <Ionicons
            name="notifications-outline"
            size={20}
            color={isDark ? "#e2e8f0" : "#1e293b"}
          />
          {unreadCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[16px] h-4 items-center justify-center px-1">
              <Text className="text-white text-[10px] font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* NOTIFICATIONS MODAL */}
        <Modal transparent animationType="fade" visible={notifOpen}>
          <TouchableOpacity
            className="flex-1 bg-black/20"
            onPress={() => setNotifOpen(false)}
            activeOpacity={1}
          >
            <View className="absolute right-4 top-14 bg-white dark:bg-slate-900 rounded-lg shadow-lg w-80 max-h-96 overflow-hidden border border-gray-100 dark:border-slate-800">
              <View className="px-4 py-3 border-b border-gray-100 dark:border-slate-800">
                <Text className="font-bold text-slate-900 dark:text-white">
                  Notifications
                </Text>
              </View>

              {isNotificationsLoading && notifications.length === 0 ? (
                <View className="py-8 items-center">
                  <ActivityIndicator color="#10b981" />
                </View>
              ) : notifications.length === 0 ? (
                <View className="py-8 items-center">
                  <Text className="text-gray-400 dark:text-slate-500 text-sm">
                    No notifications
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={notifications}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => handleNotificationPress(item)}
                      className={`px-4 py-3 border-b border-gray-50 dark:border-slate-800 ${
                        !item.read_at ? "bg-emerald-50 dark:bg-emerald-500/10" : ""
                      }`}
                    >
                      <Text className="text-sm text-slate-700 dark:text-slate-200">
                        {item.data?.message || "New notification"}
                      </Text>
                      <Text className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                        {formatNotificationTime(item.created_at)}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </TouchableOpacity>
        </Modal>

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
