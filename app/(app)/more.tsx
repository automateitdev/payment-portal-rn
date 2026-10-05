import { useAppDispatch, useAppSelector } from "@/redux/hook";
import { RootState } from "@/redux/store";
import { logout } from "@/redux/feature/authSlice";
import { toggleTheme } from "@/redux/feature/themeSlice";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface MenuItem {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  route: string;
}

const MORE_MENU_ITEMS: MenuItem[] = [
  // {
  //   title: "Apply Leave",
  //   subtitle: "Submit absence & leave applications",
  //   icon: "calendar",
  //   color: "#059669",
  //   bgColor: "#ecfdf5",
  //   route: "/apply-leave",
  // },
  {
    title: "Invoices",
    subtitle: "View payment history & receipts",
    icon: "receipt",
    color: "#d97706",
    bgColor: "#fffbeb",
    route: "/payments/invoices/invoices",
  },
  {
    title: "Open Payment",
    subtitle: "Quick fee payment without login",
    icon: "card",
    color: "#2563eb",
    bgColor: "#eff6ff",
    route: "/open-payment",
  },
  {
    title: "Online Admission",
    subtitle: "Student admission forms & status",
    icon: "school",
    color: "#7c3aed",
    bgColor: "#f5f3ff",
    route: "/onlineadmission",
  },
];

export default function MoreScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === "dark";
  const user = useAppSelector((state: RootState) => state.auth.user) as any;
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const handleNavigate = (route: string) => {
    router.push(route as any);
  };

  return (
    <SafeAreaView
      edges={["bottom"]}
      className="flex-1 bg-slate-50 dark:bg-slate-950"
    >
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 40,
          maxWidth: 720,
          width: "100%",
          alignSelf: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View className="mb-6">
          <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            More Services
          </Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Access additional portal features and settings
          </Text>
        </View>

        {/* Menu Items Grid */}
        <View className="gap-3">
          {MORE_MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.route}
              onPress={() => handleNavigate(item.route)}
              activeOpacity={0.75}
              style={[
                styles.itemCard,
                {
                  backgroundColor: isDark ? "#0f172a" : "#ffffff",
                  borderColor: isDark ? "#1e293b" : "#e2e8f0",
                },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isDark
                      ? `${item.color}25`
                      : item.bgColor,
                  },
                ]}
              >
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>

              <View className="flex-1 ml-3.5">
                <Text
                  style={[
                    styles.itemTitle,
                    { color: isDark ? "#f8fafc" : "#0f172a" },
                  ]}
                >
                  {item.title}
                </Text>
                <Text
                  style={[
                    styles.itemSubtitle,
                    { color: isDark ? "#94a3b8" : "#64748b" },
                  ]}
                >
                  {item.subtitle}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={isDark ? "#475569" : "#94a3b8"}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Preferences / Logout */}
        <View className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 gap-3">
          {/* Theme Toggle */}
          <TouchableOpacity
            onPress={() => dispatch(toggleTheme())}
            activeOpacity={0.75}
            style={[
              styles.itemCard,
              {
                backgroundColor: isDark ? "#0f172a" : "#ffffff",
                borderColor: isDark ? "#1e293b" : "#e2e8f0",
              },
            ]}
          >
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: isDark ? "#334155" : "#f1f5f9",
                },
              ]}
            >
              <Ionicons
                name={isDark ? "sunny-outline" : "moon-outline"}
                size={20}
                color={isDark ? "#facc15" : "#1e293b"}
              />
            </View>
            <View className="flex-1 ml-3.5">
              <Text
                style={[
                  styles.itemTitle,
                  { color: isDark ? "#f8fafc" : "#0f172a" },
                ]}
              >
                {isDark ? "Light Mode" : "Dark Mode"}
              </Text>
              <Text
                style={[
                  styles.itemSubtitle,
                  { color: isDark ? "#94a3b8" : "#64748b" },
                ]}
              >
                Switch application appearance
              </Text>
            </View>
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity
            onPress={() => dispatch(logout())}
            activeOpacity={0.75}
            style={[
              styles.itemCard,
              {
                backgroundColor: isDark ? "#0f172a" : "#ffffff",
                borderColor: isDark ? "#1e293b" : "#e2e8f0",
              },
            ]}
          >
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: "#fee2e2",
                },
              ]}
            >
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            </View>
            <View className="flex-1 ml-3.5">
              <Text style={[styles.itemTitle, { color: "#ef4444" }]}>
                Log Out
              </Text>
              <Text
                style={[
                  styles.itemSubtitle,
                  { color: isDark ? "#94a3b8" : "#64748b" },
                ]}
              >
                Sign out of student account
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  itemSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
