import { AppState } from "react-native";
import { store } from "@/redux/store";
import { logout } from "./authSlice";

let idleTimer: ReturnType<typeof setTimeout> | null = null;

const IDLE_TIMEOUT = 20 * 60 * 1000; // 20 minutes

const resetTimer = () => {
  if (idleTimer) clearTimeout(idleTimer);

  idleTimer = setTimeout(() => {
    store.dispatch(logout());
  }, IDLE_TIMEOUT);
};

export const startIdleLogoutListener = () => {
  // Start timer immediately
  resetTimer();

  // App foreground / background handling
  const appStateSub = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      resetTimer();
    }
  });

  return () => {
    if (idleTimer) clearTimeout(idleTimer);
    appStateSub.remove();
  };
};
