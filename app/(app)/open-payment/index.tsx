import InstituteLookupForm from "@/components/OpenPayment/InstituteLookupForm";
import { useAppSelector } from "@/redux/hook";
import { RootState } from "@/redux/store";
import { colors, gradients } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STEPS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: "search-outline", text: "We verify the institute by its ID" },
  { icon: "person-outline", text: "Enter the student / reference details" },
  { icon: "shield-checkmark-outline", text: "Pay securely — no account needed" },
];

const OpenPaymentEntry = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const themeMode = useAppSelector((s: RootState) => s.theme.mode);
  const { user, token } = useAppSelector((s: RootState) => s.auth);
  const isDark = themeMode === "dark";
  const isGuest = !user || !token;
  const isWide = width >= 768;

  const bgColors = isDark ? gradients.pageDark : gradients.page;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(isGuest ? "/landing" : "/");
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

        <SafeAreaView className="flex-1" edges={isGuest ? ["bottom"] : []}>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              alignItems: "center",
              justifyContent: isWide ? "center" : "flex-start",
              paddingHorizontal: 20,
              paddingVertical: 24,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="w-full" style={{ maxWidth: 440 }}>
              {isGuest ? (
                <TouchableOpacity
                  onPress={goBack}
                  activeOpacity={0.75}
                  className="flex-row items-center self-start gap-1.5 mb-6 px-3 py-2 rounded-full bg-white/90 dark:bg-slate-800/80 border border-white/70 dark:border-slate-700"
                >
                  <Ionicons
                    name="arrow-back"
                    size={15}
                    color={isDark ? colors.primary[200] : colors.primary[600]}
                  />
                  <Text className="text-[12px] font-bold text-primary-700 dark:text-primary-300">
                    Payment Portal
                  </Text>
                </TouchableOpacity>
              ) : null}

              {/* Hero */}
              <View className="items-center mb-7">
                <LinearGradient
                  colors={gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 19,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: colors.primary[600],
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.35,
                    shadowRadius: 16,
                    elevation: 6,
                  }}
                >
                  <Ionicons name="card" size={26} color="#ffffff" />
                </LinearGradient>

                <Text className="mt-4 text-[22px] font-black text-slate-900 dark:text-white">
                  Open Payment
                </Text>
                <Text className="mt-1.5 text-[13px] text-slate-500 dark:text-slate-400 text-center leading-5">
                  Enter an Institute ID to look up and pay fees
                  {isGuest ? " — no login required" : ""}.
                </Text>
              </View>

              {/* Lookup card */}
              <View
                className="bg-white/95 dark:bg-slate-900/90 rounded-3xl p-5 border border-white/70 dark:border-slate-800"
                style={{
                  shadowColor: "#0F172A",
                  shadowOffset: { width: 0, height: 12 },
                  shadowOpacity: isDark ? 0.35 : 0.08,
                  shadowRadius: 22,
                  elevation: 4,
                }}
              >
                <InstituteLookupForm autoFocus={Platform.OS !== "web"} />
              </View>

              {/* How it works */}
              <View className="mt-6 px-1">
                <Text className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">
                  How it works
                </Text>
                <View className="gap-3">
                  {STEPS.map((step, i) => (
                    <View key={i} className="flex-row items-center gap-3">
                      <View className="w-8 h-8 rounded-xl items-center justify-center bg-primary-100/70 dark:bg-primary-500/10">
                        <Ionicons
                          name={step.icon}
                          size={15}
                          color={colors.primary[600]}
                        />
                      </View>
                      <Text className="flex-1 text-[12.5px] text-slate-600 dark:text-slate-300 leading-5">
                        {step.text}
                      </Text>
                    </View>
                  ))}
                </View>
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

export default OpenPaymentEntry;
