import { showMessage } from "@/components/shared/CustomToast/message";
import { useAppSelector } from "@/redux/hook";
import { RootState } from "@/redux/store";
import { colors, gradients } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type OptionMode = "navigate" | "soon";

type Option = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  tintSoft: string;
  mode: OptionMode;
  route?: "/login" | "/open-payment" | "/onlineadmission";
};

const OPTIONS: Option[] = [
  {
    key: "fees",
    title: "Fees Payment",
    subtitle: "Log in with Institute & Student ID",
    icon: "wallet-outline",
    tint: colors.primary[600],
    tintSoft: "rgba(16,185,129,0.12)",
    mode: "navigate",
    route: "/login",
  },
  {
    key: "open",
    title: "Open Payment",
    subtitle: "Pay without logging in",
    icon: "card-outline",
    tint: "#2563EB",
    tintSoft: "rgba(37,99,235,0.12)",
    mode: "navigate",
    route: "/open-payment",
  },
  {
    key: "admission",
    title: "Online Admission",
    subtitle: "Apply with your Institute ID",
    icon: "school-outline",
    tint: "#7C3AED",
    tintSoft: "rgba(124,58,237,0.12)",
    mode: "navigate",
    route: "/onlineadmission",
  },
];

const LandingScreen = () => {
  const { user, token } = useAppSelector((state: RootState) => state.auth);
  const themeMode = useAppSelector((state: RootState) => state.theme.mode);
  const router = useRouter();
  const { width } = useWindowDimensions();

  // A logged-in user has already made this choice — send them to their portal.
  if (user && token) {
    return <Redirect href="/(app)" />;
  }

  const isDark = themeMode === "dark";
  const isWide = width >= 768;

  const bgColors = isDark ? gradients.pageDark : gradients.page;

  const handlePress = (option: Option) => {
    if (option.mode === "navigate" && option.route) {
      router.push(option.route);
      return;
    }
    showMessage(
      "info",
      "Coming soon",
      `${option.title} will be available in an upcoming update.`,
    );
  };

  return (
    <View className="flex-1 bg-[#F5F3FF] dark:bg-[#0B1120]">
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <LinearGradient
        colors={bgColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        {/* soft decorative orbs */}
        <View
          pointerEvents="none"
          className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-primary-300/25 dark:bg-primary-500/10"
        />
        <View
          pointerEvents="none"
          className="absolute top-1/3 -left-20 w-64 h-64 rounded-full bg-sky-300/25 dark:bg-sky-500/10"
        />

        <SafeAreaView className="flex-1" edges={["bottom"]}>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: isWide ? "center" : "flex-start",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingVertical: isWide ? 32 : 28,
            }}
            showsVerticalScrollIndicator={false}
          >
            <View className="w-full" style={{ maxWidth: 460 }}>
              {/* Brand */}
              <View className="items-center mb-8">
                <LinearGradient
                  colors={gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: colors.primary[600],
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.35,
                    shadowRadius: 16,
                    elevation: 6,
                  }}
                >
                  <Ionicons name="wallet" size={28} color="#ffffff" />
                </LinearGradient>

                <Text className="mt-5 text-[26px] font-black text-primary-700 dark:text-primary-400 tracking-tight">
                  Payment Portal
                </Text>
                <Text className="mt-2 text-[13.5px] text-slate-500 dark:text-slate-400 text-center leading-5">
                  Choose how you&apos;d like to continue
                </Text>
              </View>

              {/* Options */}
              <View className="gap-3.5">
                {OPTIONS.map((option) => {
                  const isSoon = option.mode === "soon";

                  return (
                    <Pressable
                      key={option.key}
                      onPress={() => handlePress(option)}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.92 : 1,
                        transform: [{ scale: pressed ? 0.985 : 1 }],
                      })}
                    >
                      <View
                        className="bg-white/95 dark:bg-slate-800/90 rounded-3xl p-5 border border-white/70 dark:border-slate-700/70"
                        style={{
                          shadowColor: "#0F172A",
                          shadowOffset: { width: 0, height: 10 },
                          shadowOpacity: isDark ? 0.3 : 0.08,
                          shadowRadius: 20,
                          elevation: 4,
                        }}
                      >
                        <View className="flex-row items-start justify-between">
                          <View
                            className="w-12 h-12 rounded-2xl items-center justify-center"
                            style={{ backgroundColor: option.tintSoft }}
                          >
                            <Ionicons
                              name={option.icon}
                              size={22}
                              color={option.tint}
                            />
                          </View>

                          {isSoon ? (
                            <View className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-500/15 mt-1">
                              <Text className="text-[10px] font-extrabold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                                Soon
                              </Text>
                            </View>
                          ) : (
                            <View className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 items-center justify-center mt-1">
                              <Ionicons
                                name="arrow-forward"
                                size={16}
                                color={isDark ? "#cbd5e1" : "#475569"}
                              />
                            </View>
                          )}
                        </View>

                        <Text
                          className={`mt-4 text-[16px] font-extrabold ${
                            isSoon
                              ? "text-slate-500 dark:text-slate-400"
                              : "text-slate-900 dark:text-white"
                          }`}
                        >
                          {option.title}
                        </Text>
                        <Text className="mt-1 text-[12.5px] text-slate-500 dark:text-slate-400 leading-5">
                          {option.subtitle}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Footer */}
              <View className="flex-row items-center justify-center mt-8 gap-1.5">
                <Ionicons
                  name="shield-checkmark"
                  size={13}
                  color={isDark ? "#64748b" : "#94a3b8"}
                />
                <Text className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  Secured by Academy Institute Management System
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

export default LandingScreen;
