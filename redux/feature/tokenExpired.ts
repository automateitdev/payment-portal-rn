import { AppState } from "react-native";
import { store } from "@/redux/store";
import { logout } from "./authSlice";
import { jwtDecode } from "jwt-decode";
import { router } from "expo-router";
const isTokenValid = (token?: string | null): boolean => {
  if (!token) return false;

  try {
    const { exp } = jwtDecode<{ exp: number }>(token);
    return exp * 1000 > Date.now(); // exp is in seconds
  } catch {
    return false;
  }
};

export const startTokenExpirationListener = () => {
  const validateToken = () => {
    const { token } = store.getState().auth;

    if (token && !isTokenValid(token)) {
      store.dispatch(logout());
      router.replace("/login");
    }
  };

  // Run once on app start
  validateToken();

  // Run whenever app returns to foreground
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      validateToken();
    }
  });

  return () => {
    subscription.remove();
  };
};
