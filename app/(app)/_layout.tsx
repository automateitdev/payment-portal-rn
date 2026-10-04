import Header from "@/components/Header/Header";
import Sidebar from "@/components/Sidebar/Sidebar";
import MoreBottomSheet from "@/components/shared/MoreBottomSheet";
import { useAppSelector } from "@/redux/hook";

import { RootState } from "@/redux/store";
import { APP_NAME } from "@/utils/vendor";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Slot, Tabs, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import {
  ColorValue,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TabIcon = ({
  name,
  focused,
  color,
  size,
  tint,
  bgLight,
  bgDark,
}: {
  name: any;
  focused: boolean;
  color: ColorValue;
  size: number;
  tint?: string;
  bgLight?: string;
  bgDark?: string;
}) => {
  const isDark = useAppSelector((state: RootState) => state.theme.mode === "dark");
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.08 : 1, {
      damping: 14,
      stiffness: 140,
    });
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconColor = focused && tint ? tint : (color as string);

  return (
    <Animated.View
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 28,
          borderRadius: 14,
          backgroundColor:
            focused && (bgLight || bgDark)
              ? isDark
                ? bgDark
                : bgLight
              : "transparent",
        },
        animatedStyle,
      ]}
    >
      <Ionicons name={name} size={19} color={iconColor} />
    </Animated.View>
  );
};

const AppLayout = () => {
  const { user, token } = useAppSelector((state: RootState) => state.auth);
  const themeMode = useAppSelector((state: RootState) => state.theme.mode);
  const pathname = usePathname();
  const isDark = themeMode === "dark";
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS === "web") {
      const root = document.documentElement;
      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, [isDark]);

  if (!user || !token) {
    // Open Payment / Online Admission are "no login required" flows — let
    // guests through to those routes only, rendered bare (no tab bar /
    // sidebar).
    if (
      pathname?.startsWith("/open-payment") ||
      pathname?.startsWith("/onlineadmission") ||
      pathname?.startsWith("/payments/available_payment")
    ) {
      return <Slot />;
    }
    return <Redirect href="/landing" />;
  }

  // Web Layout
  if (Platform.OS === "web") {
    const webTabs = (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
        }}
      >
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen
          name="payments/available_payment/available_payment"
          options={{ href: null }}
        />
        <Tabs.Screen name="open-payment/index" options={{ href: null }} />
        <Tabs.Screen
          name="open-payment/[instituteId]"
          options={{ href: null }}
        />
        <Tabs.Screen name="onlineadmission/index" options={{ href: null }} />
        <Tabs.Screen
          name="onlineadmission/[instituteId]"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="payments/invoices/invoices"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="semester_exam/semester_exam/semester_exam"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="payments/available_payment/fail"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="payments/available_payment/paymentprocessing"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="payments/available_payment/paymentwebview"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="payments/available_payment/success"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="apply-leave/index"
          options={{ href: null }}
        />
        <Tabs.Screen name="more" options={{ href: null }} />
      </Tabs>
    );

    // Compact (mobile-width) web: hamburger menu + slide-in drawer
    if (isCompact) {
      return (
        <View className="flex-1 bg-white dark:bg-slate-900">
          {/* Top bar with hamburger */}
          <View className="flex-row items-center px-4 h-14 border-b border-slate-100 dark:border-slate-800">
            <TouchableOpacity
              onPress={() => setSidebarOpen(true)}
              activeOpacity={0.7}
              className="p-2 -ml-2"
            >
              <Ionicons
                name="menu"
                size={26}
                color={isDark ? "#e2e8f0" : "#0f172a"}
              />
            </TouchableOpacity>
            <View className="flex-row items-center ml-2">
              <View className="bg-emerald-500 p-1.5 rounded-xl">
                <Ionicons name="wallet" size={18} color="white" />
              </View>
              <Text className="ml-2 text-lg font-black text-slate-900 dark:text-white tracking-tighter">
                {APP_NAME}
              </Text>
            </View>
          </View>

          {/* Content */}
          <View className="flex-1">{webTabs}</View>

          {/* Drawer overlay */}
          {sidebarOpen && (
            <View className="absolute inset-0 flex-row z-50">
              <View className="w-64 h-full shadow-2xl">
                <Sidebar onNavigate={() => setSidebarOpen(false)} />
              </View>
              <Pressable
                className="flex-1 h-full bg-black/40"
                onPress={() => setSidebarOpen(false)}
              />
            </View>
          )}
        </View>
      );
    }

    // Wide web: persistent sidebar
    return (
      <View className="flex-1 flex-row bg-white dark:bg-slate-900">
        <Sidebar />
        <View className="flex-1">{webTabs}</View>
      </View>
    );
  }

  // Mobile Layout (Exact Original)
  return (
    <View className="flex-1 bg-white dark:bg-slate-900">
      <Header />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#10b981",
          tabBarInactiveTintColor: isDark ? "#94a3b8" : "#64748b",
          tabBarStyle: {
            backgroundColor: isDark ? "#1e293b" : "#ffffff",
            borderTopWidth: 1,
            borderTopColor: isDark ? "#334155" : "#f1f5f9",
            height: 60 + insets.bottom,
            paddingBottom: 6 + insets.bottom,
            paddingTop: 6,
            elevation: 8,
            shadowColor: isDark ? "#000" : "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: isDark ? 0.2 : 0.05,
            shadowRadius: 8,
          },
          tabBarItemStyle: {
            paddingHorizontal: 0,
            paddingVertical: 2,
          },
          tabBarLabelStyle: {
            fontSize: 9.5,
            fontWeight: "600",
            letterSpacing: -0.2,
            marginBottom: 3,
          },
          // Added cool screen transition
          animation: "shift",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarActiveTintColor: "#2563eb",
            tabBarIcon: ({ color, size, focused }) => (
              <TabIcon
                name={focused ? "grid" : "grid-outline"}
                size={size}
                color={color}
                focused={focused}
                tint="#2563eb"
                bgLight="#eff6ff"
                bgDark="rgba(37, 99, 235, 0.2)"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="payments/available_payment/available_payment"
          options={{
            title: "Available Pay",
            tabBarActiveTintColor: "#059669",
            tabBarIcon: ({ color, size, focused }) => (
              <TabIcon
                name={focused ? "wallet" : "wallet-outline"}
                size={size}
                color={color}
                focused={focused}
                tint="#059669"
                bgLight="#ecfdf5"
                bgDark="rgba(5, 150, 105, 0.2)"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="payments/invoices/invoices"
          options={{
            title: "Invoices",
            tabBarActiveTintColor: "#d97706",
            tabBarIcon: ({ color, size, focused }) => (
              <TabIcon
                name={focused ? "receipt" : "receipt-outline"}
                size={size}
                color={color}
                focused={focused}
                tint="#d97706"
                bgLight="#fffbeb"
                bgDark="rgba(217, 119, 6, 0.2)"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="semester_exam/semester_exam/semester_exam"
          options={{
            title: "Exams",
            tabBarActiveTintColor: "#7c3aed",
            tabBarIcon: ({ color, size, focused }) => (
              <TabIcon
                name={focused ? "document-text" : "document-text-outline"}
                size={size}
                color={color}
                focused={focused}
                tint="#7c3aed"
                bgLight="#f5f3ff"
                bgDark="rgba(124, 58, 237, 0.2)"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: "More",
            tabBarActiveTintColor: "#db2777",
            tabBarIcon: ({ color, size, focused }) => (
              <TabIcon
                name={moreSheetOpen ? "apps" : "apps-outline"}
                size={size}
                color={color}
                focused={focused || moreSheetOpen}
                tint="#db2777"
                bgLight="#fdf2f8"
                bgDark="rgba(219, 39, 119, 0.2)"
              />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setMoreSheetOpen(true);
            },
          }}
        />

        {/* Hide extra routes from the tab bar */}
        <Tabs.Screen
          name="open-payment/index"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="open-payment/[instituteId]"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="onlineadmission/index"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="onlineadmission/[instituteId]"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="onlineadmission/preview/[key]"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="apply-leave/index"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="payments/available_payment/fail"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="payments/available_payment/paymentprocessing"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="payments/available_payment/paymentwebview"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="payments/available_payment/success"
          options={{ href: null }}
        />
      </Tabs>

      {/* Bottom Sheet for More menu on mobile */}
      <MoreBottomSheet
        visible={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
      />
    </View>
  );
};

export default AppLayout;
