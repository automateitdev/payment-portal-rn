import Header from "@/components/Header/Header";
import Sidebar from "@/components/Sidebar/Sidebar";
import { useAppSelector } from "@/redux/hook";

import { RootState } from "@/redux/store";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useEffect } from "react";
import { View, Platform } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const TabIcon = ({
  name,
  focused,
  color,
  size,
}: {
  name: any;
  focused: boolean;
  color: string;
  size: number;
}) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.2 : 1, {
      damping: 10,
      stiffness: 100,
    });
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name={name} size={focused ? size + 2 : size} color={color} />
    </Animated.View>
  );
};

const AppLayout = () => {
  const { user, token } = useAppSelector((state: RootState) => state.auth);
  const themeMode = useAppSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === "dark";

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
    return <Redirect href="/(auth)/login" />;
  }

  // Web Layout
  if (Platform.OS === "web") {
    return (
      <View className="flex-1 flex-row bg-white dark:bg-slate-900">
        <Sidebar />
        <View className="flex-1">
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
          </Tabs>
        </View>
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
            height: 65,
            paddingBottom: 8,
            paddingTop: 8,
            elevation: 8,
            shadowColor: isDark ? "#000" : "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: isDark ? 0.2 : 0.05,
            shadowRadius: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            marginBottom: 5,
          },
          // Added cool screen transition
          animation: "shift",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, size, focused }) => (
              <TabIcon
                name={focused ? "grid" : "grid-outline"}
                size={size}
                color={color}
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="payments/available_payment/available_payment"
          options={{
            title: "Available Pay",
            tabBarIcon: ({ color, size, focused }) => (
              <TabIcon
                name={focused ? "wallet" : "wallet-outline"}
                size={size}
                color={color}
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="payments/invoices/invoices"
          options={{
            title: "Invoices",
            tabBarIcon: ({ color, size, focused }) => (
              <TabIcon
                name={focused ? "receipt" : "receipt-outline"}
                size={size}
                color={color}
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="semester_exam/semester_exam/semester_exam"
          options={{
            title: "Exams",
            tabBarIcon: ({ color, size, focused }) => (
              <TabIcon
                name={focused ? "school" : "school-outline"}
                size={size}
                color={color}
                focused={focused}
              />
            ),
          }}
        />

        {/* Hide extra routes from the tab bar */}
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
    </View>
  );
};

export default AppLayout;
