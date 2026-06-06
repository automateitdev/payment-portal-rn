import React from "react";
import { BaseToast, ToastConfig } from "react-native-toast-message";

export const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      text1Style={{ fontSize: 14, fontWeight: "600" }}
      text2Style={{ fontSize: 12 }}
    />
  ),

  error: (props) => (
    <BaseToast
      {...props}
      text1Style={{ fontSize: 14, fontWeight: "600" }}
      text2Style={{ fontSize: 12 }}
    />
  ),

  info: (props) => (
    <BaseToast
      {...props}
      text1Style={{ fontSize: 14, fontWeight: "600" }}
      text2Style={{ fontSize: 12 }}
    />
  ),
};
