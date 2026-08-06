import { toastConfig } from "@/components/shared/ToastConfig/ToastConfig";
import { startIdleLogoutListener } from "@/redux/feature/idleLogout";
import { startTokenExpirationListener } from "@/redux/feature/tokenExpired";
import { persistor, store } from "@/redux/store";
import * as NavigationBar from "expo-navigation-bar";
import { Stack } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import "../global.css";

import { setRichToastRef } from "@/components/shared/CustomToast/message";
import RichToast from "@/components/shared/CustomToast/RichToast";
import UpdateBanner from "@/components/UpdateBanner/UpdateBanner";
import { useAppSelector } from "@/redux/hook";
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import { Platform } from "react-native";

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === "web") {
      document.title = "Payment Portal";
    }
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
              <UpdateBanner />
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
      NavigationBar.setStyle(mode === "dark" ? "light" : "dark");
    }
  }, [mode]);

  return <>{children}</>;
}
