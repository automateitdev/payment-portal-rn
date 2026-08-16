import { showMessage } from "@/components/shared/CustomToast/message";
import { getErrorMessage } from "@/components/utils/errorHandler";
import { useLoginUserMutation } from "@/redux/allApi/authApi/authApi";
import { baseApi } from "@/redux/baseApi/baseApi";
import { setUser } from "@/redux/feature/authSlice";
import { useAppDispatch } from "@/redux/hook";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
  StyleSheet,
  Dimensions,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import YoutubeIframe from "react-native-youtube-iframe";

type LoginForm = {
  institute_id: string;
  custom_student_id: string;
};

const { width: windowWidth } = Dimensions.get("window");

const HERO_COLORS = ["#062E1F", "#0B4A32", "#14532D"] as const;
const ACCENT_COLORS = ["#4ADE80", "#16A34A"] as const;

const LoginScreen = () => {
  const [screenWidth, setScreenWidth] = useState(windowWidth);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  const isWeb = Platform.OS === "web";
  const isLargeScreen = isWeb && screenWidth > 900;
  const videoWidth = isLargeScreen ? 300 : screenWidth - 72;
  const videoHeight = videoWidth * (9 / 16);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    defaultValues: { institute_id: "", custom_student_id: "" },
  });

  const [loginUser, { isLoading }] = useLoginUserMutation();
  const dispatch = useAppDispatch();
  const [isPlaying, setIsPlaying] = useState(false);

  const socials = [
    {
      icon: "logo-linkedin",
      url: "https://www.linkedin.com/company/automateitbd",
    },
    { icon: "logo-facebook", url: "https://www.facebook.com/automateitbd" },
    { icon: "logo-youtube", url: "https://www.youtube.com/@automateitlimited" },
    { icon: "call", url: "tel:+8809613241234" },
    { icon: "logo-whatsapp", url: "https://wa.me/+8801335127799" },
  ] as const;

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await loginUser(data).unwrap();
      const apiData = res.payload.data;
      dispatch(
        setUser({
          token: apiData.authorization.access_token,
          user: {
            instituteId: apiData.student.institute_id,
            instituteName: apiData.student.institute_name,
            academicYear: apiData.student.academic_year_list,
          },
        }),
      );
      dispatch(baseApi.util.resetApiState());
      showMessage("success", "Login Successful", "Hi,Welcome back!");
    } catch (err) {
      showMessage(
        "error",
        "Login Failed",
        getErrorMessage(err) || "Invalid credentials",
      );
    }
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => console.log("Error opening link"));
  };

  const renderForm = (variant: "light" | "dark" = "light") => (
    <View>
      <Text
        style={[styles.formLabel, variant === "dark" && styles.formLabelOnDark]}
      >
        Sign in with your institute credentials
      </Text>

      <Controller
        control={control}
        name="institute_id"
        rules={{ required: "Institute ID is required" }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View
            style={[
              styles.inputPill,
              focusedInput === "institute_id" && styles.inputPillFocused,
              errors.institute_id && styles.inputPillError,
            ]}
          >
            <View
              style={[
                styles.inputIconWrap,
                focusedInput === "institute_id" && styles.inputIconWrapActive,
              ]}
            >
              <Ionicons
                name="business"
                size={15}
                color={focusedInput === "institute_id" ? "#FFFFFF" : "#16A34A"}
              />
            </View>
            <View style={styles.inputTextWrap}>
              <Text style={styles.inputCaption}>Institute ID / EIIN</Text>
              <TextInput
                placeholder="e.g. 123456"
                placeholderTextColor="#9CA3AF"
                value={value}
                onFocus={() => setFocusedInput("institute_id")}
                onBlur={() => {
                  onBlur();
                  setFocusedInput(null);
                }}
                onChangeText={onChange}
                style={[
                  styles.inputField,
                  isWeb && ({ outlineStyle: "none" } as any),
                ]}
              />
            </View>
          </View>
        )}
      />
      {errors.institute_id && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={12} color="#F87171" />
          <Text style={styles.errorText}>{errors.institute_id.message}</Text>
        </View>
      )}

      <Controller
        control={control}
        name="custom_student_id"
        rules={{ required: "Student ID is required" }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View
            style={[
              styles.inputPill,
              focusedInput === "custom_student_id" && styles.inputPillFocused,
              errors.custom_student_id && styles.inputPillError,
            ]}
          >
            <View
              style={[
                styles.inputIconWrap,
                focusedInput === "custom_student_id" &&
                  styles.inputIconWrapActive,
              ]}
            >
              <Ionicons
                name="person"
                size={15}
                color={
                  focusedInput === "custom_student_id" ? "#FFFFFF" : "#16A34A"
                }
              />
            </View>
            <View style={styles.inputTextWrap}>
              <Text style={styles.inputCaption}>Student ID</Text>
              <TextInput
                placeholder="e.g. 20231234"
                placeholderTextColor="#9CA3AF"
                value={value}
                onFocus={() => setFocusedInput("custom_student_id")}
                onBlur={() => {
                  onBlur();
                  setFocusedInput(null);
                }}
                onChangeText={onChange}
                style={[
                  styles.inputField,
                  isWeb && ({ outlineStyle: "none" } as any),
                ]}
              />
            </View>
          </View>
        )}
      />
      {errors.custom_student_id && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={12} color="#F87171" />
          <Text style={styles.errorText}>
            {errors.custom_student_id.message}
          </Text>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}
        style={styles.ctaShadowWrap}
      >
        <LinearGradient
          colors={isLoading ? ["#86EFAC", "#4ADE80"] : ACCENT_COLORS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaButton}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Text style={styles.ctaButtonText}>Continue</Text>
              <View style={styles.ctaArrowCircle}>
                <Ionicons name="arrow-forward" size={14} color="#16A34A" />
              </View>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderVideo = (variant: "light" | "dark" = "light") => (
    <View
      style={[styles.videoCard, variant === "dark" && styles.videoCardOnDark]}
    >
      <View style={styles.videoCardHeader}>
        <View style={styles.videoPlayBadge}>
          <Ionicons name="play" size={11} color="white" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.videoCardTitle,
              variant === "dark" && styles.videoCardTitleOnDark,
            ]}
          >
            New here? Watch this
          </Text>
          <Text
            style={[
              styles.videoCardSub,
              variant === "dark" && styles.videoCardSubOnDark,
            ]}
          >
            A quick walkthrough of the payment process
          </Text>
        </View>
      </View>
      <View style={styles.videoFrame}>
        <YoutubeIframe
          height={videoHeight}
          width={videoWidth}
          play={isPlaying}
          videoId={"f3k_AE_J_kk"}
        />
      </View>
    </View>
  );

  const renderSocials = (variant: "light" | "dark" = "light") => (
    <View style={styles.socialsBlock}>
      <View style={styles.socialsDividerRow}>
        <View
          style={[
            styles.socialsDivider,
            variant === "dark" && styles.socialsDividerOnDark,
          ]}
        />
        <Text
          style={[
            styles.socialsLabel,
            variant === "dark" && styles.socialsLabelOnDark,
          ]}
        >
          Need assistance? Reach us
        </Text>
        <View
          style={[
            styles.socialsDivider,
            variant === "dark" && styles.socialsDividerOnDark,
          ]}
        />
      </View>
      <View style={styles.socialsRow}>
        {socials.map((s) => (
          <TouchableOpacity
            key={s.icon}
            onPress={() => openLink(s.url)}
            activeOpacity={0.75}
            style={[
              styles.socialPill,
              variant === "dark" && styles.socialPillOnDark,
            ]}
          >
            <Ionicons
              name={s.icon as any}
              size={16}
              color={variant === "dark" ? "#BBF7D0" : "#16A34A"}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ---------------------------------------------------------------------
  // Web / large-screen layout: dark branding rail + light form panel
  // ---------------------------------------------------------------------
  if (isLargeScreen) {
    return (
      <View style={styles.webPage}>
        <StatusBar barStyle="light-content" />
        <View style={styles.webCard}>
          <LinearGradient
            colors={HERO_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.webBrandRail}
          >
            <View style={styles.heroGlowTopRight} pointerEvents="none" />
            <View style={styles.heroGlowBottomLeft} pointerEvents="none" />

            <View style={styles.webBrandTop}>
              <View style={styles.webLogoBadge}>
                <Ionicons name="wallet" size={22} color="#052E1F" />
              </View>
              <Text style={styles.webBrandName}>ACADEMY PORTAL</Text>
            </View>

            <View style={{ marginTop: 34 }}>
              <Text style={styles.webHeroEyebrow}>Student Payments</Text>
              <Text style={styles.webHeroTitle}>
                Fee payments,{"\n"}made effortless.
              </Text>
              <Text style={styles.webHeroSubtitle}>
                Track dues, pay instantly, and keep every receipt in one secure
                place.
              </Text>
            </View>

            <View style={styles.webHeroStats}>
              <View style={styles.webHeroStatPill}>
                <Ionicons name="shield-checkmark" size={14} color="#4ADE80" />
                <Text style={styles.webHeroStatText}>Secure gateway</Text>
              </View>
              <View style={styles.webHeroStatPill}>
                <Ionicons name="flash" size={14} color="#4ADE80" />
                <Text style={styles.webHeroStatText}>Instant confirmation</Text>
              </View>
            </View>

            {renderVideo("dark")}
          </LinearGradient>

          <View style={styles.webFormPanel}>
            <View style={styles.webFormInner}>
              <Text style={styles.webFormEyebrow}>Welcome back</Text>
              <Text style={styles.webFormTitle}>Log in to continue</Text>
              <View style={{ marginTop: 28 }}>{renderForm("light")}</View>
              {renderSocials("light")}
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------
  // Mobile layout: gradient hero + overlapping sheet
  // ---------------------------------------------------------------------
  return (
    <View style={styles.mobilePage}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={HERO_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.mobileHero}
      >
        <View style={styles.heroGlowTopRight} pointerEvents="none" />
        <View style={styles.heroGlowBottomLeft} pointerEvents="none" />
        <SafeAreaView edges={["top"]}>
          <View style={styles.mobileHeroLogoRing}>
            <View style={styles.mobileHeroLogo}>
              <Ionicons name="wallet" size={24} color="#052E1F" />
            </View>
          </View>
          <Text style={styles.mobileHeroEyebrow}>ACADEMY PAYMENT PORTAL</Text>
          <Text style={styles.mobileHeroTitle}>Welcome back</Text>
          <Text style={styles.mobileHeroSubtitle}>
            Log in to manage your academic fees and payments.
          </Text>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.mobileSheet}>
        <ScrollView
          contentContainerStyle={styles.mobileScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.sheetHandle} />
            {renderForm("light")}
            <View style={{ marginTop: 24 }}>{renderVideo("light")}</View>
            {renderSocials("light")}
          </KeyboardAvoidingView>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // ---- shared / mobile ----
  mobilePage: { flex: 1, backgroundColor: "#062E1F" },
  mobileHero: {
    paddingHorizontal: 24,
    paddingBottom: 56,
    position: "relative",
    overflow: "hidden",
  },
  heroGlowTopRight: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(74, 222, 128, 0.16)",
  },
  heroGlowBottomLeft: {
    position: "absolute",
    bottom: -80,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  mobileHeroLogoRing: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 20,
  },
  mobileHeroLogo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#BBF7D0",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  mobileHeroEyebrow: {
    color: "#86EFAC",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  mobileHeroTitle: {
    color: "white",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 8,
    letterSpacing: 0.2,
  },
  mobileHeroSubtitle: {
    color: "rgba(220, 252, 231, 0.75)",
    fontSize: 13.5,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 300,
  },
  mobileSheet: {
    flex: 1,
    backgroundColor: "white",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  mobileScrollContent: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 20,
  },

  // ---- form (shared light/dark) ----
  formLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 14,
  },
  formLabelOnDark: { color: "rgba(255,255,255,0.6)" },

  inputPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 18,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  inputPillFocused: {
    borderColor: "#16A34A",
    backgroundColor: "#F0FDF4",
    ...(Platform.OS === "web"
      ? {
          shadowColor: "#16A34A",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.12,
          shadowRadius: 10,
        }
      : {}),
  },
  inputPillError: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  inputIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  inputIconWrapActive: {
    backgroundColor: "#16A34A",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  inputTextWrap: { flex: 1 },
  inputCaption: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  inputField: {
    fontSize: 15.5,
    color: "#111827",
    fontWeight: "600",
    padding: 0,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
    marginLeft: 6,
    marginTop: -4,
  },
  errorText: { color: "#EF4444", fontSize: 11.5 },

  ctaShadowWrap: {
    marginTop: 10,
    borderRadius: 18,
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaButton: {
    height: 54,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ctaButtonText: { color: "white", fontWeight: "700", fontSize: 15.5 },
  ctaArrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },

  // ---- video card ----
  videoCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 1,
  },
  videoCardOnDark: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
    marginTop: 28,
  },
  videoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  videoPlayBadge: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
  },
  videoCardTitle: { fontSize: 13.5, fontWeight: "700", color: "#111827" },
  videoCardTitleOnDark: { color: "white" },
  videoCardSub: { fontSize: 11.5, color: "#6B7280", marginTop: 1 },
  videoCardSubOnDark: { color: "rgba(255,255,255,0.55)" },
  videoFrame: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#000",
  },

  // ---- socials ----
  socialsBlock: { marginTop: 28, alignItems: "center" },
  socialsDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    marginBottom: 16,
  },
  socialsDivider: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  socialsDividerOnDark: { backgroundColor: "rgba(255,255,255,0.12)" },
  socialsLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "600",
    textAlign: "center",
  },
  socialsLabelOnDark: { color: "rgba(255,255,255,0.5)" },
  socialsRow: { flexDirection: "row", gap: 10 },
  socialPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  socialPillOnDark: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
  },

  // ---- web layout ----
  webPage: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  webCard: {
    flexDirection: "row",
    width: "100%",
    maxWidth: 940,
    minHeight: 560,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "white",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.14,
    shadowRadius: 40,
    elevation: 14,
  },
  webBrandRail: {
    flex: 1,
    padding: 40,
    position: "relative",
    overflow: "hidden",
  },
  webBrandTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  webLogoBadge: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#BBF7D0",
    justifyContent: "center",
    alignItems: "center",
  },
  webBrandName: {
    color: "white",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  webHeroEyebrow: {
    color: "#4ADE80",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  webHeroTitle: {
    color: "white",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 38,
  },
  webHeroSubtitle: {
    color: "rgba(220, 252, 231, 0.7)",
    fontSize: 13.5,
    lineHeight: 20,
    marginTop: 12,
    maxWidth: 320,
  },
  webHeroStats: { flexDirection: "row", gap: 10, marginTop: 24, flexWrap: "wrap" },
  webHeroStatPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  webHeroStatText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11.5,
    fontWeight: "600",
  },
  webFormPanel: {
    flex: 1,
    padding: 44,
    justifyContent: "center",
  },
  webFormInner: { width: "100%", maxWidth: 340, alignSelf: "center" },
  webFormEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16A34A",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  webFormTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginTop: 4,
  },
});

export default LoginScreen;
