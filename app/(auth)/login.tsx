import { showMessage } from "@/components/shared/CustomToast/message";
import { getErrorMessage } from "@/components/utils/errorHandler";
import { useLoginUserMutation } from "@/redux/allApi/authApi/authApi";
import { baseApi } from "@/redux/baseApi/baseApi";
import { setUser } from "@/redux/feature/authSlice";
import { useAppDispatch } from "@/redux/hook";
import { Ionicons } from "@expo/vector-icons";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import YoutubeIframe from "react-native-youtube-iframe";

type LoginForm = {
  institute_id: string;
  custom_student_id: string;
};

const { width: windowWidth } = Dimensions.get("window");

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
  const videoWidth = isLargeScreen ? 320 : screenWidth - 64;
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

  const renderForm = () => (
    <View style={styles.card}>
      <Text style={styles.label}>Institute Credentials</Text>

      <Controller
        control={control}
        name="institute_id"
        rules={{ required: "Institute ID is required" }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View
            style={[
              styles.inputContainer,
              focusedInput === "institute_id" && styles.inputFocused,
              errors.institute_id && styles.inputError,
            ]}
          >
            <Ionicons
              name="business-outline"
              size={20}
              color={focusedInput === "institute_id" ? "#16A34A" : "#9CA3AF"}
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Institute ID / EIIN"
              placeholderTextColor="#9CA3AF"
              value={value}
              onFocus={() => setFocusedInput("institute_id")}
              onBlur={() => {
                onBlur();
                setFocusedInput(null);
              }}
              onChangeText={onChange}
              style={[styles.input, isWeb && ({ outlineStyle: "none" } as any)]}
            />
          </View>
        )}
      />
      {errors.institute_id && (
        <Text style={styles.errorText}>{errors.institute_id.message}</Text>
      )}

      <Controller
        control={control}
        name="custom_student_id"
        rules={{ required: "Student ID is required" }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View
            style={[
              styles.inputContainer,
              focusedInput === "custom_student_id" && styles.inputFocused,
              errors.custom_student_id && styles.inputError,
            ]}
          >
            <Ionicons
              name="person-outline"
              size={20}
              color={
                focusedInput === "custom_student_id" ? "#16A34A" : "#9CA3AF"
              }
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Student ID"
              placeholderTextColor="#9CA3AF"
              value={value}
              onFocus={() => setFocusedInput("custom_student_id")}
              onBlur={() => {
                onBlur();
                setFocusedInput(null);
              }}
              onChangeText={onChange}
              style={[styles.input, isWeb && ({ outlineStyle: "none" } as any)]}
            />
          </View>
        )}
      />
      {errors.custom_student_id && (
        <Text style={styles.errorText}>{errors.custom_student_id.message}</Text>
      )}

      <TouchableOpacity
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}
        activeOpacity={0.8}
        style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
      >
        <Text style={styles.loginButtonText}>
          {isLoading ? "Processing..." : "Continue"}
        </Text>
        {!isLoading && (
          <Ionicons
            name="arrow-forward"
            size={18}
            color="white"
            style={{ marginLeft: 8 }}
          />
        )}
      </TouchableOpacity>
    </View>
  );

  const renderVideo = () => (
    <View style={styles.videoCard}>
      <View style={styles.videoHeader}>
        <Ionicons name="play-circle" size={18} color="#16A34A" />
        <Text style={styles.videoTitle}>Need help?</Text>
      </View>
      <Text style={styles.videoSub}>Watch our guide on how to pay.</Text>
      <View style={styles.videoWrapper}>
        <YoutubeIframe
          height={videoHeight}
          width={videoWidth}
          play={isPlaying}
          videoId={"xtFYdAGeT-k"}
        />
      </View>
    </View>
  );

  if (isLargeScreen) {
    return (
      <View style={styles.webMainContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.webContentWrapper}>
          {/* Left Side: Welcome & Video */}
          <View style={styles.webLeftSide}>
            <View style={styles.logoContainer}>
              <Ionicons name="wallet" size={32} color="#16A34A" />
            </View>
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.webTitle}>Payment Portal</Text>
            <Text style={styles.webSubtitle}>
              Manage your academic fees and payments with ease.
            </Text>
            {/* {renderVideo()} */}
          </View>

          {/* Right Side: Login Form */}
          <View style={styles.webRightSide}>
            {renderForm()}
            <View style={styles.footer}>
              <Text style={styles.footerLabel}>Connect with us</Text>
              <View style={styles.socialRow}>
                {[
                  {
                    name: "logo-facebook",
                    color: "#1877F2",
                    url: "https://facebook.com/automateitbd",
                  },
                  {
                    name: "logo-linkedin",
                    color: "#0077b5",
                    url: "https://linkedin.com/company/automateitbd",
                  },
                  { name: "call", color: "#16A34A", url: "tel:+8809613241234" },
                ].map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.socialCircle}
                    onPress={() => openLink(item.url)}
                  >
                    <Ionicons
                      name={item.name as any}
                      size={20}
                      color={item.color}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="wallet" size={40} color="#16A34A" />
            </View>
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.title}>Payment Portal</Text>
            <Text style={styles.subtitle}>
              Log in to manage your academic fees and payments.
            </Text>
          </View>

          {renderForm()}
          {/* {renderVideo()} */}

          <View style={styles.footer}>
            <Text style={styles.footerLabel}>Connect with us</Text>
            <View style={styles.socialRow}>
              {[
                {
                  name: "logo-facebook",
                  color: "#1877F2",
                  url: "https://facebook.com/automateitbd",
                },
                {
                  name: "logo-linkedin",
                  color: "#0077b5",
                  url: "https://linkedin.com/company/automateitbd",
                },
                { name: "call", color: "#16A34A", url: "tel:+8809613241234" },
              ].map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.socialCircle}
                  onPress={() => openLink(item.url)}
                >
                  <Ionicons
                    name={item.name as any}
                    size={20}
                    color={item.color}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFDFD" },
  webMainContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  webContentWrapper: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 24,
    maxWidth: 750,
    width: "100%",
    minHeight: 480,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 10,
    overflow: "hidden",
  },
  webLeftSide: {
    flex: 1.1,
    padding: 30,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
  },
  webRightSide: {
    flex: 1,
    padding: 30,
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#F1F5F9",
  },
  webTitle: { fontSize: 26, fontWeight: "900", color: "#111827", marginTop: 2 },
  webSubtitle: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 6,
    lineHeight: 18,
    marginBottom: 20,
  },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { marginTop: 40, marginBottom: 32, alignItems: "center" },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#16A34A",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: { fontSize: 32, fontWeight: "800", color: "#111827", marginTop: 4 },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 24,
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    height: 60,
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputFocused: {
    borderColor: "#16A34A",
    backgroundColor: "white",
    ...(Platform.OS === "web"
      ? {
          shadowColor: "#16A34A",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        }
      : {}),
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: "#111827", fontWeight: "500" },
  inputError: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 12,
  },
  loginButton: {
    backgroundColor: "#16A34A",
    height: 60,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonDisabled: { opacity: 0.7, shadowOpacity: 0 },
  loginButtonText: { color: "white", fontWeight: "700", fontSize: 18 },
  videoCard: {
    marginTop: 40,
    backgroundColor: "white",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  videoHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  videoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginLeft: 8,
  },
  videoSub: { fontSize: 13, color: "#6B7280", marginBottom: 16 },
  videoWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  footer: { marginTop: 40, alignItems: "center" },
  footerLabel: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 16,
    fontWeight: "600",
  },
  socialRow: { flexDirection: "row", gap: 16 },
  socialCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});

export default LoginScreen;
