import Toast from "react-native-toast-message";

type ToastType = "success" | "error" | "info";

export const showToast = (type: ToastType, title: string, message?: string) => {
  Toast.show({
    type,
    text1: title,
    text2: message,
    position: "top",
    topOffset: 60,
    visibilityTime: 3000,
  });
};
