import {
  NotificationItem,
  useClearAllNotificationsMutation,
  useFetchNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@/redux/allApi/notifications/notificationsApi";
import { useGetInstituteInfoQuery } from "@/redux/allApi/authApi/authApi";
import { baseApi } from "@/redux/baseApi/baseApi";
import { logout } from "@/redux/feature/authSlice";
import { toggleTheme } from "@/redux/feature/themeSlice";
import { useAppDispatch, useAppSelector } from "@/redux/hook";
import { RootState } from "@/redux/store";
import { APP_PREFIX, APP_SUFFIX } from "@/utils/vendor";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface SidebarProps {
  onNavigate?: () => void;
}

interface MenuItem {
  label: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  to: string;
  color: string;
  bgLight: string;
  bgDark: string;
  borderLight: string;
  activeBgLight: string;
  badge?: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const MENU_SECTIONS: MenuSection[] = [
  {
    title: "OVERVIEW",
    items: [
      {
        label: "Dashboard",
        subtitle: "Analytics & live summary",
        icon: "grid",
        to: "/",
        color: "#059669", // Emerald
        bgLight: "#ECFDF5",
        bgDark: "rgba(5, 150, 105, 0.16)",
        borderLight: "#A7F3D0",
        activeBgLight: "#F0FDF4",
      },
    ],
  },
  {
    title: "ACADEMICS",
    items: [
      {
        label: "Semester Exams",
        subtitle: "Admit card & marksheets",
        icon: "document-text",
        to: "/semester_exam/semester_exam/semester_exam",
        color: "#7C3AED", // Vivid Violet/Purple
        bgLight: "#F5F3FF",
        bgDark: "rgba(124, 58, 237, 0.16)",
        borderLight: "#DDD6FE",
        activeBgLight: "#FAF5FF",
        badge: "Exam",
      },
      // {
      //   label: "Apply Leave",
      //   subtitle: "Absence applications",
      //   icon: "calendar",
      //   to: "/apply-leave",
      //   color: "#0891B2", // Cyan/Teal
      //   bgLight: "#ECFEFF",
      //   bgDark: "rgba(8, 145, 178, 0.16)",
      //   borderLight: "#A5F3FC",
      //   activeBgLight: "#F0FDFA",
      // },
    ],
  },
  {
    title: "PAYMENTS & BILLING",
    items: [
      {
        label: "Available Pay",
        subtitle: "Pending fees & dues",
        icon: "wallet",
        to: "/payments/available_payment/available_payment",
        color: "#16A34A", // Vibrant Green
        bgLight: "#DCFCE7",
        bgDark: "rgba(22, 163, 74, 0.16)",
        borderLight: "#86EFAC",
        activeBgLight: "#F0FDF4",
        badge: "Pay",
      },
      {
        label: "Invoices",
        subtitle: "Payment ledger & history",
        icon: "receipt",
        to: "/payments/invoices/invoices",
        color: "#D97706", // Warm Amber
        bgLight: "#FEF3C7",
        bgDark: "rgba(217, 119, 6, 0.16)",
        borderLight: "#FDE68A",
        activeBgLight: "#FFFBEB",
      },
      {
        label: "Open Payment",
        subtitle: "Direct fee collection",
        icon: "card",
        to: "/open-payment",
        color: "#2563EB", // Royal Blue
        bgLight: "#EFF6FF",
        bgDark: "rgba(37, 99, 235, 0.16)",
        borderLight: "#BFDBFE",
        activeBgLight: "#F0F7FF",
      },
    ],
  },
  {
    title: "ADMISSIONS",
    items: [
      {
        label: "Admission",
        subtitle: "Online student application",
        icon: "school",
        to: "/onlineadmission",
        color: "#E11D48", // Rose / Pink
        bgLight: "#FFE4E6",
        bgDark: "rgba(225, 29, 72, 0.16)",
        borderLight: "#FECDD3",
        activeBgLight: "#FFF1F2",
        badge: "Online",
      },
    ],
  },
];

export default function Sidebar({ onNavigate }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === "dark";

  // Notifications State
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: notificationsData, isFetching: isNotificationsLoading } =
    useFetchNotificationsQuery(undefined, {
      pollingInterval: 60000,
    });
  const notifications = notificationsData?.list || [];
  const unreadCount = notificationsData?.unreadCount || 0;
  const [markNotificationRead] = useMarkNotificationReadMutation();
  const [markAllNotificationsRead, { isLoading: isMarkingAllRead }] =
    useMarkAllNotificationsReadMutation();
  const [clearAllNotifications, { isLoading: isClearingAll }] =
    useClearAllNotificationsMutation();

  // Student / Institution Data
  const { data: instituteData } = useGetInstituteInfoQuery({});
  const student = instituteData?.payload?.data?.user;

  const handleLogout = () => {
    dispatch(logout());
    dispatch(baseApi.util.resetApiState());
    onNavigate?.();
  };

  const getNotificationIcon = (
    severity?: NotificationItem["data"]["severity"]
  ): { name: keyof typeof Ionicons.glyphMap; color: string } => {
    switch (severity) {
      case "error":
        return { name: "close-circle", color: "#EF4444" };
      case "warning":
        return { name: "alert-circle", color: "#F59E0B" };
      case "info":
        return { name: "information-circle", color: "#2563EB" };
      case "success":
      default:
        return { name: "checkmark-circle", color: "#10B981" };
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

  // Helper to determine if a route is active
  const isRouteActive = (route: string) => {
    if (route === "/") {
      return pathname === "/" || pathname === "";
    }
    return pathname.startsWith(route);
  };

  // Student initials for avatar fallback
  const studentInitials = student?.student_name
    ? student.student_name
        .split(" ")
        .slice(0, 2)
        .map((n: string) => n[0]?.toUpperCase())
        .join("")
    : "ST";

  return (
    <View className="w-72 bg-[#FCFCFD] dark:bg-[#0B1120] border-r border-gray-200/90 dark:border-gray-800/90 h-full flex flex-col justify-between shadow-sm">
      {/* 1. BRAND HEADER */}
      <View className="px-5 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800/80 bg-white dark:bg-[#0B1120]">
        <View className="flex-row items-center justify-between">
          {/* Logo & Portal Identity */}
          <TouchableOpacity
            onPress={() => {
              router.push("/" as any);
              onNavigate?.();
            }}
            activeOpacity={0.8}
            className="flex-row items-center flex-1"
          >
            <LinearGradient
              colors={["#10B981", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="w-11 h-11 rounded-2xl items-center justify-center shadow-md shadow-emerald-500/30"
            >
              <Ionicons name="wallet-outline" size={22} color="white" />
            </LinearGradient>
            <View className="ml-3">
              <View className="flex-row items-baseline">
                <Text className="text-2xl font-black text-gray-950 dark:text-white tracking-tight">
                  {APP_PREFIX}
                </Text>
                <Text className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {APP_SUFFIX}
                </Text>
              </View>
              <View className="flex-row items-center mt-0.5">
                <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                <Text className="text-[10.5px] font-black text-emerald-700/80 dark:text-emerald-400/90 uppercase tracking-widest">
                  STUDENT PORTAL
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Quick Header Actions */}
          <View className="flex-row items-center gap-2">
            {/* Notifications Bell */}
            <TouchableOpacity
              onPress={() => setNotifOpen(true)}
              activeOpacity={0.7}
              className="w-9 h-9 rounded-2xl bg-gray-100/90 dark:bg-gray-800 items-center justify-center relative hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200/60 dark:border-gray-700/60"
            >
              <Ionicons
                name="notifications-outline"
                size={18}
                color={isDark ? "#E2E8F0" : "#374151"}
              />
              {unreadCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-rose-500 rounded-full min-w-[17px] h-[17px] items-center justify-center px-1 border-2 border-white dark:border-[#0B1120]">
                  <Text className="text-white text-[9px] font-black leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Mobile Drawer Close Button */}
            {onNavigate && (
              <TouchableOpacity
                onPress={onNavigate}
                activeOpacity={0.7}
                className="w-9 h-9 rounded-2xl bg-gray-100 dark:bg-gray-800 items-center justify-center border border-gray-200/60 dark:border-gray-700/60"
              >
                <Ionicons
                  name="close"
                  size={19}
                  color={isDark ? "#E2E8F0" : "#374151"}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* 2. SCROLLABLE NAVIGATION MENU */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 px-3.5 py-4"
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {MENU_SECTIONS.map((section, sectionIdx) => (
          <View key={section.title} className={sectionIdx > 0 ? "mt-6" : ""}>
            {/* Section Heading */}
            <View className="px-3 mb-2.5 flex-row items-center">
              <Text className="text-[11px] font-black text-gray-400 dark:text-gray-500 tracking-[1.8px] uppercase">
                {section.title}
              </Text>
            </View>

            {/* Menu Items */}
            {section.items.map((item) => {
              const active = isRouteActive(item.to);

              return (
                <TouchableOpacity
                  key={item.to}
                  onPress={() => {
                    router.push(item.to as any);
                    onNavigate?.();
                  }}
                  activeOpacity={0.8}
                  style={
                    active
                      ? {
                          backgroundColor: isDark ? item.bgDark : item.activeBgLight,
                          borderColor: isDark ? item.color + "45" : item.borderLight,
                        }
                      : undefined
                  }
                  className={`flex-row items-center px-3 py-2.5 rounded-2xl mb-1.5 transition-all ${
                    active
                      ? "border shadow-sm"
                      : "border border-transparent hover:bg-gray-100/70 dark:hover:bg-gray-800/40"
                  }`}
                >
                  {/* Left Accent Bar on Active */}
                  {active && (
                    <View
                      className="w-1.5 h-7 rounded-full mr-2.5"
                      style={{ backgroundColor: item.color }}
                    />
                  )}

                  {/* Vibrant Colorful Icon Container */}
                  <View
                    className={`w-9 h-9 rounded-xl items-center justify-center mr-3 ${
                      active ? "shadow-md" : ""
                    }`}
                    style={{
                      backgroundColor: active
                        ? item.color
                        : isDark
                        ? item.bgDark
                        : item.bgLight,
                      shadowColor: active ? item.color : undefined,
                      shadowOpacity: active ? 0.35 : 0,
                      shadowRadius: 6,
                    }}
                  >
                    <Ionicons
                      name={
                        (active
                          ? item.icon
                          : `${item.icon}-outline`) as keyof typeof Ionicons.glyphMap
                      }
                      size={19}
                      color={active ? "#FFFFFF" : item.color}
                    />
                  </View>

                  {/* Label */}
                  <View className="flex-1 mr-1 justify-center">
                    <Text
                      className={`text-sm tracking-tight ${
                        active
                          ? "font-black text-gray-950 dark:text-white"
                          : "font-semibold text-gray-700 dark:text-gray-200"
                      }`}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                  </View>

                  {/* Badge or Active Glow Dot */}
                  {item.badge ? (
                    <View
                      className="px-2 py-0.5 rounded-full border"
                      style={{
                        backgroundColor: isDark ? item.bgDark : item.bgLight,
                        borderColor: isDark ? item.color + "50" : item.borderLight,
                      }}
                    >
                      <Text
                        className="text-[10px] font-black"
                        style={{ color: item.color }}
                      >
                        {item.badge}
                      </Text>
                    </View>
                  ) : active ? (
                    <View
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* 3. STUDENT PROFILE & FOOTER */}
      <View className="p-3.5 border-t border-gray-200/80 dark:border-gray-800/80 bg-white/90 dark:bg-[#0B1120]/95">
        {/* Student Mini Card */}
        <View className="p-3 rounded-2xl bg-gray-50/90 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/60 shadow-sm mb-3">
          <View className="flex-row items-center">
            {/* Avatar */}
            <View className="relative">
              {student?.institute_logo ? (
                <Image
                  source={{ uri: student.institute_logo }}
                  className="w-11 h-11 rounded-2xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                  resizeMode="contain"
                />
              ) : (
                <LinearGradient
                  colors={["#059669", "#047857"]}
                  className="w-11 h-11 rounded-2xl items-center justify-center shadow-sm"
                >
                  <Text className="text-white text-sm font-black tracking-wider">
                    {studentInitials}
                  </Text>
                </LinearGradient>
              )}
              {/* Online status indicator */}
              <View className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-800" />
            </View>

            {/* Student Info */}
            <View className="ml-3 flex-1 min-w-0">
              <Text
                className="text-sm font-black text-gray-950 dark:text-white"
                numberOfLines={1}
              >
                {student?.student_name || "Test Student"}
              </Text>
              <Text
                className="text-xs font-semibold text-gray-600 dark:text-gray-300 mt-0.5"
                numberOfLines={1}
              >
                {student?.institute_name || "Memorial School & College"}
              </Text>
              {student?.institute_id && (
                <View className="self-start mt-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60">
                  <Text
                    className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 tracking-wide font-mono"
                    numberOfLines={1}
                  >
                    ID: {student.institute_id}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Action Row: Theme Toggle + Logout */}
        <View className="flex-row items-center gap-2">
          {/* Theme Toggle Pill */}
          <TouchableOpacity
            onPress={() => dispatch(toggleTheme())}
            activeOpacity={0.8}
            className={`flex-1 flex-row items-center justify-center py-2.5 px-3 rounded-2xl border shadow-sm ${
              isDark
                ? "bg-indigo-950/30 border-indigo-800/60 text-indigo-300"
                : "bg-amber-50/70 border-amber-200/90 text-amber-800"
            }`}
          >
            <Ionicons
              name={isDark ? "sunny" : "moon"}
              size={16}
              color={isDark ? "#FBBF24" : "#4F46E5"}
            />
            <Text
              className={`ml-2 text-xs font-black ${
                isDark ? "text-amber-300" : "text-indigo-900"
              }`}
            >
              {isDark ? "Light Mode" : "Dark Mode"}
            </Text>
          </TouchableOpacity>

          {/* Logout Action */}
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.8}
            className="flex-row items-center justify-center py-2.5 px-3.5 rounded-2xl bg-rose-50/90 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 shadow-sm"
          >
            <Ionicons name="log-out-outline" size={16} color="#E11D48" />
            <Text className="ml-1.5 text-xs font-black text-rose-600 dark:text-rose-400">
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. NOTIFICATIONS MODAL (Web Compatible) */}
      <Modal transparent animationType="fade" visible={notifOpen}>
        <TouchableOpacity
          className="flex-1 bg-black/30"
          onPress={() => setNotifOpen(false)}
          activeOpacity={1}
        >
          <View
            className="absolute left-6 top-16 bg-white dark:bg-[#0F172A] rounded-3xl w-80 max-h-[440px] overflow-hidden border border-gray-200 dark:border-gray-800 shadow-2xl"
            style={{
              elevation: 20,
            }}
          >
            {/* Notifications Header */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <View className="flex-row items-center">
                <Ionicons
                  name="notifications"
                  size={17}
                  color={isDark ? "#34D399" : "#059669"}
                />
                <Text className="ml-2 font-black text-sm text-gray-900 dark:text-white">
                  Notifications
                </Text>
              </View>
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={() => markAllNotificationsRead()}
                  disabled={isMarkingAllRead}
                >
                  {isMarkingAllRead ? (
                    <ActivityIndicator size="small" color="#10B981" />
                  ) : (
                    <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Mark all as read
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* List Content */}
            {isNotificationsLoading && notifications.length === 0 ? (
              <View className="py-12 items-center">
                <ActivityIndicator color="#10B981" />
              </View>
            ) : notifications.length === 0 ? (
              <View className="py-12 items-center px-4">
                <View className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center mb-2">
                  <Ionicons
                    name="notifications-off-outline"
                    size={22}
                    color={isDark ? "#6B7280" : "#9CA3AF"}
                  />
                </View>
                <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold">
                  No notifications yet
                </Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 280 }}
                nestedScrollEnabled
                showsVerticalScrollIndicator
                contentContainerStyle={{ padding: 8, gap: 4 }}
                renderItem={({ item }) => {
                  const isUnread = !item.read_at;
                  const iconInfo = getNotificationIcon(item.data?.severity);
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        if (!item.read_at) {
                          markNotificationRead(item.id);
                        }
                      }}
                      className={`flex-row items-start gap-2.5 px-3 py-2.5 rounded-2xl ${
                        isUnread
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/40"
                      }`}
                    >
                      <View
                        className="w-7 h-7 rounded-xl items-center justify-center mt-0.5"
                        style={{ backgroundColor: `${iconInfo.color}20` }}
                      >
                        <Ionicons
                          name={iconInfo.name}
                          size={15}
                          color={iconInfo.color}
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          className={`text-xs leading-4 ${
                            isUnread
                              ? "text-gray-900 dark:text-gray-100 font-bold"
                              : "text-gray-600 dark:text-gray-400 font-medium"
                          }`}
                        >
                          {item.data?.message || "New notification"}
                        </Text>
                        <Text className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-1">
                          {formatNotificationTime(item.created_at)}
                        </Text>
                      </View>
                      {isUnread && (
                        <View className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            {/* Clear all footer */}
            {notifications.length > 0 && (
              <TouchableOpacity
                onPress={() => clearAllNotifications()}
                disabled={isClearingAll}
                className="py-2.5 items-center border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#0B1120]"
              >
                {isClearingAll ? (
                  <ActivityIndicator size="small" color="#10B981" />
                ) : (
                  <Text className="text-xs font-black text-rose-500 dark:text-rose-400">
                    Clear all notifications
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
