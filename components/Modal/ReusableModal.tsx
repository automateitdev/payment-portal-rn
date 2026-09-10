import GradientFill from "@/components/ui/GradientFill";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  ModalProps,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import ReusableButton, {
  ReusableButtonProps,
} from "../shared/Button/ReusableButton";

export type ModalSize = "xs" | "sm" | "md" | "lg" | "xl" | "full" | "auto";

type QuickButton = {
  label: string;
  onPress?: () => void;
  isLoading?: boolean;
} & Partial<
  Pick<
    ReusableButtonProps,
    "variant" | "leftIcon" | "rightIcon" | "className" | "textClassName"
  >
>;

export interface ReusableModalProps extends Omit<
  ModalProps,
  "visible" | "children"
> {
  /** Visibility */
  visible: boolean;
  /** Close handler (backdrop / close icon / cancel) */
  onClose: () => void;

  /** Header */
  title?: string;
  subtitle?: string;
  /** Custom header JSX (overrides title/subtitle layout) */
  headerSlot?: React.ReactNode;
  /** Hide the entire header section */
  hideHeader?: boolean;
  /** Show top-right close (X) icon (default: true if header visible) */
  showCloseIcon?: boolean;

  /** Body */
  children?: React.ReactNode;
  /** Wrap body in a ScrollView (default: true) */
  scrollable?: boolean;

  /** Footer — custom JSX wins over confirm/cancel quick-buttons */
  footerSlot?: React.ReactNode;
  /** Quick confirmation button (e.g. "Remove", "Save") */
  confirmButton?: QuickButton;
  /** Quick cancel button (e.g. "Cancel") */
  cancelButton?: QuickButton;
  /** Hide the entire footer section */
  hideFooter?: boolean;

  /** Size preset */
  size?: ModalSize;
  /** Override exact width */
  width?: number | string;
  /** Override max width */
  maxWidth?: number | string;
  /** Override exact height */
  height?: number | string;
  /** Override max height */
  maxHeight?: number | string;

  /** Click backdrop to close (default true) */
  closeOnBackdrop?: boolean;
  /** Backdrop tint class (default black/50) */
  backdropClassName?: string;

  /** Tailwind overrides */
  containerClassName?: string; // outermost backdrop container
  cardClassName?: string; // modal card
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}

const sizeMap: Record<
  Exclude<ModalSize, "auto">,
  { width: string; maxWidth: number | string }
> = {
  xs: { width: "92%", maxWidth: 360 },
  sm: { width: "92%", maxWidth: 440 },
  md: { width: "94%", maxWidth: 560 },
  lg: { width: "95%", maxWidth: 760 },
  xl: { width: "96%", maxWidth: 980 },
  full: { width: "100%", maxWidth: "100%" },
};

const ReusableModal: React.FC<ReusableModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  headerSlot,
  hideHeader = false,
  showCloseIcon,
  children,
  scrollable = true,
  footerSlot,
  confirmButton,
  cancelButton,
  hideFooter = false,
  size = "sm",
  width,
  maxWidth,
  height,
  maxHeight,
  closeOnBackdrop = true,
  backdropClassName,
  containerClassName,
  cardClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  titleClassName,
  subtitleClassName,
  animationType = "fade",
  transparent = true,
  ...rest
}) => {
  const sizeStyles =
    size === "auto" ? { width: undefined, maxWidth: undefined } : sizeMap[size];

  const finalWidth = width !== undefined ? width : sizeStyles.width;
  const finalMaxWidth = maxWidth !== undefined ? maxWidth : sizeStyles.maxWidth;

  const hasHeader =
    !hideHeader && (title || subtitle || headerSlot || showCloseIcon !== false);
  const hasQuickButtons = Boolean(confirmButton || cancelButton);
  const hasFooter = !hideFooter && (footerSlot || hasQuickButtons);
  const shouldShowCloseIcon =
    showCloseIcon !== undefined ? showCloseIcon : hasHeader;

  const handleBackdropPress = () => {
    if (closeOnBackdrop) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={transparent}
      animationType={animationType}
      onRequestClose={onClose}
      {...rest}
    >
      <View
        className={`flex-1 items-center justify-center p-4 ${backdropClassName ?? "bg-black/50"} ${containerClassName ?? ""}`}
      >
        {/* Backdrop press layer (absolute, behind card) */}
        <Pressable onPress={handleBackdropPress} className="absolute inset-0" />

        {/* Card */}
        <View
          className={`bg-white rounded-2xl overflow-hidden ${cardClassName ?? ""}`}
          style={{
            width: finalWidth as any,
            maxWidth: finalMaxWidth as any,
            ...(height !== undefined ? { height: height as any } : {}),
            ...(maxHeight !== undefined ? { maxHeight: maxHeight as any } : {}),
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.18,
            shadowRadius: 24,
            elevation: 14,
          }}
        >
          {/* HEADER */}
          {hasHeader && (
            <View
              className={`flex-row items-start justify-between px-5 pt-5 pb-4 overflow-hidden border-b border-white/10 ${headerClassName ?? ""}`}
            >
              <GradientFill
                colors={[colors.primary[700], colors.primary[900]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              {headerSlot ? (
                <View className="flex-1 pr-2">{headerSlot}</View>
              ) : (
                <View className="flex-1 pr-2">
                  {title && (
                    <Text
                      className={`text-lg font-bold text-white ${titleClassName ?? ""}`}
                    >
                      {title}
                    </Text>
                  )}
                  {subtitle && (
                    <Text
                      className={`text-xs text-white/70 mt-0.5 ${subtitleClassName ?? ""}`}
                    >
                      {subtitle}
                    </Text>
                  )}
                </View>
              )}

              {shouldShowCloseIcon && (
                <Pressable
                  onPress={onClose}
                  hitSlop={8}
                  className="h-8 w-8 items-center justify-center rounded-full bg-white/15"
                >
                  <Ionicons name="close" size={16} color="#ffffff" />
                </Pressable>
              )}
            </View>
          )}

          {/* BODY */}
          {scrollable ? (
            <ScrollView
              className={`px-5 py-4 ${bodyClassName ?? ""}`}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View className={`px-5 py-4 ${bodyClassName ?? ""}`}>
              {children}
            </View>
          )}

          {/* FOOTER */}
          {hasFooter && (
            <View
              className={`flex-row items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 ${footerClassName ?? ""}`}
            >
              {footerSlot ? (
                footerSlot
              ) : (
                <>
                  {cancelButton && (
                    <ReusableButton
                      title={cancelButton.label}
                      variant={cancelButton.variant ?? "secondary"}
                      leftIcon={cancelButton.leftIcon}
                      rightIcon={cancelButton.rightIcon}
                      isLoading={cancelButton.isLoading}
                      onPress={cancelButton.onPress ?? onClose}
                      className={
                        cancelButton.className ?? "rounded-lg px-4 py-2 min-w-0"
                      }
                      textClassName={cancelButton.textClassName}
                    />
                  )}
                  {confirmButton && (
                    <ReusableButton
                      title={confirmButton.label}
                      variant={confirmButton.variant ?? "primary"}
                      leftIcon={confirmButton.leftIcon}
                      rightIcon={confirmButton.rightIcon}
                      isLoading={confirmButton.isLoading}
                      onPress={confirmButton.onPress}
                      className={
                        confirmButton.className ??
                        "rounded-lg px-4 py-2 min-w-0"
                      }
                      textClassName={confirmButton.textClassName ?? "font-bold"}
                    />
                  )}
                </>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default ReusableModal;
