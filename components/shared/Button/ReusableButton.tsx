import { primaryColor } from "@/theme/colors";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TouchableOpacityProps,
  View,
} from "react-native";

type Variant = "primary" | "secondary" | "danger" | "outline" | "ghost";
type Position = "start" | "center" | "end" | "stretch";

export interface ReusableButtonProps extends Omit<
  TouchableOpacityProps,
  "children"
> {
  /** Button label text */
  title?: string;
  /** Replace/extend label area with custom JSX (icons, badge, etc.) */
  children?: React.ReactNode;
  /** Icon shown before the label */
  leftIcon?: React.ReactNode;
  /** Icon shown after the label */
  rightIcon?: React.ReactNode;

  /** Show spinner. If `title` is also given, both render side-by-side. */
  isLoading?: boolean;
  /** Optional alternate text while loading (defaults to `title`) */
  loadingText?: string;
  /** Disable presses + visually dim */
  disabled?: boolean;

  /** Visual style preset */
  variant?: Variant;

  /** Tailwind classes on the button wrapper — wins over default */
  className?: string;
  /** Tailwind classes on the text — wins over default */
  textClassName?: string;
  /** Tailwind classes on an outer wrapper view (for alignment, margin, etc.) */
  containerClassName?: string;

  /** Self alignment when placed in a flex parent — start | center | end | stretch */
  position?: Position;

  /** Optional fixed sizes */
  width?: number | string;
  height?: number | string;

  /** Spinner color override */
  spinnerColor?: string;
}

/* -------- variant defaults (inline styles for vendor-dynamic primary) -------- */
const positionClass: Record<Position, string> = {
  start: "self-start",
  center: "self-center",
  end: "self-end",
  stretch: "self-stretch",
};

/**
 * A caller-supplied `h-8`/`h-10`/`h-[32px]` etc. sets a *hard* RN height.
 * Combined with this button's own vertical padding (or a larger system font
 * size from the device's accessibility text-scale setting), that hard height
 * is often smaller than what the label actually needs — the text then gets
 * squeezed/clipped instead of the button growing to fit it.
 *
 * We strip any `h-*` token out of the incoming className and re-apply its
 * value as `minHeight` instead, so a compact height is still respected when
 * the content fits, but the button can never clip a label that doesn't.
 */
const parseHeightToken = (token: string): number | null => {
  const match = token.match(/^h-(.+)$/);
  if (!match) return null;
  const value = match[1];
  if (["auto", "full", "screen", "fit"].includes(value)) return null;

  if (value.startsWith("[") && value.endsWith("]")) {
    const raw = value.slice(1, -1);
    const num = parseFloat(raw);
    if (Number.isNaN(num)) return null;
    if (raw.endsWith("rem")) return num * 16;
    return num; // px or unitless
  }

  if (value === "px") return 1;
  const num = parseFloat(value);
  if (Number.isNaN(num)) return null;
  return num * 4; // Tailwind spacing scale: 1 unit = 4px
};

const extractMinHeight = (className?: string) => {
  if (!className) return { cleanedClassName: "", minHeight: undefined };
  let minHeight: number | undefined;
  const tokens = className.split(/\s+/).filter(Boolean).filter((token) => {
    const parsed = parseHeightToken(token);
    if (parsed === null) return true;
    minHeight = parsed; // last h-* token wins, same as CSS cascade order
    return false;
  });
  return { cleanedClassName: tokens.join(" "), minHeight };
};

const ReusableButton: React.FC<ReusableButtonProps> = ({
  title,
  children,
  leftIcon,
  rightIcon,
  isLoading = false,
  loadingText,
  disabled = false,
  variant = "primary",
  className,
  textClassName,
  containerClassName,
  position,
  width,
  height,
  spinnerColor,
  onPress,
  ...rest
}) => {
  const isDisabled = disabled || isLoading;

  const { cleanedClassName, minHeight: classMinHeight } = React.useMemo(
    () => extractMinHeight(className),
    [className],
  );


  // Vendor-dynamic inline styles per variant
  const variantStyle = (() => {
    switch (variant) {
      case "primary":
        return {
          bg: primaryColor,
          textColor: "#ffffff",
          shadowColor: primaryColor,
          borderColor: undefined as string | undefined,
        };
      case "secondary":
        return {
          bg: "#e2e8f0",
          textColor: "#1e293b",
          shadowColor: undefined as string | undefined,
          borderColor: undefined as string | undefined,
        };
      case "danger":
        return {
          bg: "#dc2626",
          textColor: "#ffffff",
          shadowColor: "#dc2626",
          borderColor: undefined as string | undefined,
        };
      case "outline":
        return {
          bg: "transparent",
          textColor: primaryColor,
          shadowColor: undefined as string | undefined,
          borderColor: primaryColor,
        };
      case "ghost":
        return {
          bg: "transparent",
          textColor: primaryColor,
          shadowColor: undefined as string | undefined,
          borderColor: undefined as string | undefined,
        };
    }
  })();

  const button = (
    <View className={position ? positionClass[position] : "self-start"}>
      <Pressable
        disabled={isDisabled}
        onPress={onPress}
        className={`flex-row items-center justify-center rounded-2xl px-4 py-3 self-start ${
          isDisabled ? "opacity-60" : ""
        } ${cleanedClassName}`}
        style={{
          backgroundColor: variantStyle.bg,
          borderWidth: variantStyle.borderColor ? 1 : 0,
          borderColor: variantStyle.borderColor,
          ...(width !== undefined ? { width: width as any, minWidth: 0 } : {}),
          // `minHeight` (not `height`) — the button may still grow past a
          // caller's requested/derived height for a larger label or a
          // bigger device font-scale; it just never shrinks below it.
          ...(height !== undefined
            ? { minHeight: height as any }
            : classMinHeight !== undefined
              ? { minHeight: classMinHeight }
              : {}),
        }}
        {...(rest as any)}
      >
        {isLoading && (
          <ActivityIndicator
            size="small"
            color={
              spinnerColor ??
              (variant === "outline" || variant === "ghost"
                ? primaryColor
                : "#ffffff")
            }
            style={{ marginRight: title || children || loadingText ? 8 : 0 }}
          />
        )}

        {!isLoading && leftIcon ? (
          <View style={{ marginRight: title || children ? 8 : 0 }}>
            {leftIcon}
          </View>
        ) : null}

        {children ? (
          children
        ) : Boolean(isLoading ? (loadingText ?? title) : title) ? (
          <Text
            className={`text-sm font-semibold ${textClassName ?? ""}`}
            style={{ color: variantStyle.textColor }}
            numberOfLines={1}
          >
            {isLoading ? (loadingText ?? title) : title}
          </Text>
        ) : null}

        {!isLoading && rightIcon ? (
          <View style={{ marginLeft: title || children ? 8 : 0 }}>
            {rightIcon}
          </View>
        ) : null}
      </Pressable>
    </View>
  );

  if (containerClassName) {
    return <View className={containerClassName}>{button}</View>;
  }
  return button;
};

export default ReusableButton;
