import { MessagePosition, MessageType, RichToastRef } from "./RichToast";

let toastRef: RichToastRef | null = null;

export const setRichToastRef = (ref: RichToastRef | null) => {
  toastRef = ref;
};

/**
 * showMessage Utility
 * @param type 'success' | 'error' | 'info' | 'warning'
 * @param title Bold heading string
 * @param message Main body text (scrollable if long)
 * @param position 'top' | 'left' | 'right' (default 'top')
 */
export const showMessage = (
  type: MessageType = "info",
  title: string,
  message: string = "",
  position: MessagePosition = "top",
) => {
  if (toastRef) {
    toastRef.show({ type, title, message, position });
  } else {
    console.warn(
      "RichToast ref is not set. Mount <RichToast /> in your root layout.",
    );
  }
};
