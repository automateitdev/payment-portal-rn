import { Redirect, Stack } from "expo-router";
import { RootState } from "@/redux/store";
import { useAppSelector } from "@/redux/hook";

export default function AuthLayout() {
  const { user, token } = useAppSelector((state: RootState) => state.auth);
  
  if (user && token) {
    return <Redirect href="/(app)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

