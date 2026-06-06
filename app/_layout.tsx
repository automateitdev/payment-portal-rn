import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "@/redux/store";
import { Stack } from "expo-router";
import "../global.css";
import Toast from "react-native-toast-message";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { startIdleLogoutListener } from "@/redux/feature/idleLogout";
import { toastConfig } from "@/components/shared/ToastConfig/ToastConfig";
import { startTokenExpirationListener } from "@/redux/feature/tokenExpired";
import * as Updates from "expo-updates";
import * as NavigationBar from "expo-navigation-bar";

import { useEffect } from "react";
import { Alert, AppState, Platform } from "react-native";
import { useColorScheme } from "nativewind";
import { useAppSelector } from "@/redux/hook";
import RichToast from "@/components/shared/CustomToast/RichToast";
import { setRichToastRef } from "@/components/shared/CustomToast/message";

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === "web") {
      document.title = "Payment Portal";
    }
  }, []);
  useEffect(() => {
    const initializeUpdates = async () => {
      try {
        console.log("📱 App starting - checking for updates...");

        // Check for updates silently
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          console.log("🎯 Update found! Downloading...");

          // Download in background
          await Updates.fetchUpdateAsync();

          // Show subtle notification (not intrusive)
          Alert.alert(
            "Update Ready",
            "App has been updated. Restart to see improvements?",
            [
              {
                text: "Continue",
                style: "cancel",
                onPress: () => {
                  // Mark that we showed the notification
                  console.log("User deferred update restart");
                },
              },
              {
                text: "Restart Now",
                onPress: () => {
                  console.log("User chose to restart with update");
                  Updates.reloadAsync();
                },
              },
            ],
          );
        } else {
          console.log("✅ App is up to date");
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.warn("⚠️ Update check failed:", error.message);
        } else {
          console.warn("⚠️ Update check failed with unknown error");
        }
      }
    };

    // Run on app start
    initializeUpdates();

    // Also run when app comes to foreground
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        initializeUpdates();
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <PersistGate
          persistor={persistor}
          onBeforeLift={() => {
            startTokenExpirationListener();
            startIdleLogoutListener();
          }}
        >
          <ThemeWatcher>
            <SafeAreaView
              style={{ flex: 1 }}
              className="bg-slate-50 dark:bg-slate-950"
              edges={["top", "left", "right"]}
            >
              <Stack screenOptions={{ headerShown: false }} />
              <Toast config={toastConfig} />
              <RichToast ref={(ref) => setRichToastRef(ref)} />
            </SafeAreaView>
          </ThemeWatcher>
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
}

function ThemeWatcher({ children }: { children: React.ReactNode }) {
  const mode = useAppSelector((state) => state.theme.mode);
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(mode);
    if (Platform.OS === "android") {
      NavigationBar.setBackgroundColorAsync(
        mode === "dark" ? "#020617" : "#ffffff",
      );
      NavigationBar.setButtonStyleAsync(mode === "dark" ? "light" : "dark");
    }
  }, [mode]);

  return <>{children}</>;
}
