import GradientFill from "@/components/ui/GradientFill";
import { colors, primaryColor } from "@/theme/colors";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  TouchableOpacityProps,
  View,
} from "react-native";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "success"
  | "warning"
  | "info"
  | "outline"
  | "ghost"
  | "copy"
  | "green"
  | "glass"
  | "header"
  | "gradient-primary"
  | "gradient-info"
  | "gradient-help"
  | "gradient-warning"
  | "gradient-danger"
  | "gradient-success"
  | "gradient-amber";

/** 135deg PrimeVue-style gradients: [from, to]. */
const GRADIENTS: Record<string, [string, string]> = {
  "gradient-primary": [colors.primary.DEFAULT, colors.primary[700]],
  "gradient-info": ["#1889a7", "#0e687f"],
  "gradient-help": ["#6f4cc3", "#56369d"],
  "gradient-warning": ["#f59e0b", "#c2410c"],
  "gradient-danger": ["#ef4444", "#b91c1c"],
  "gradient-success": ["#22a06b", "#146c43"],
  // Gold/amber used by the live app's row action (delete) buttons.
  "gradient-amber": ["#c48612", "#9a6410"],
};

/** Gradient variants that also carry a 1px border in the web reference. */
const GRADIENT_BORDERS: Record<string, string> = {
  "gradient-amber": "#9a6410",
};

export type ButtonSize = "sm" | "md" | "lg";
export type ButtonPosition = "start" | "center" | "end" | "stretch";

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
  /** Custom loading indicator (e.g. the app's SpinnerIcon) instead of the stock spinner. */
  loadingIcon?: React.ReactNode;
  /** Optional alternate text while loading (defaults to `title`) */
  loadingText?: string;
  /** Disable presses + visually dim */
  disabled?: boolean;

  /** Visual style preset (PrimeVue inspired) */
  variant?: ButtonVariant;
  /** Size preset (sm: 32px, md: 38px, lg: 44px) */
  size?: ButtonSize;

  /** Render as an icon-only square button without text padding */
  iconOnly?: boolean;
  /** Notification badge counter or node at top-right */
  badge?: number | string | React.ReactNode;

  /** Tailwind classes on the button wrapper — wins over default */
  className?: string;
  /** Tailwind classes on the text — wins over default */
  textClassName?: string;
  /** Inline style on the text (e.g. fontWeight) */
  textStyle?: any;
  /** Tailwind classes on an outer wrapper view (for alignment, margin, etc.) */
  containerClassName?: string;
  /** Inline styles on an outer wrapper view */
  containerStyle?: any;

  /** Self alignment when placed in a flex parent — start | center | end | stretch */
  position?: ButtonPosition;

  /** Optional fixed sizes */
  width?: number | string;
  height?: number | string;
  style?: any;

  /** Spinner color override */
  spinnerColor?: string;
}

const positionClass: Record<ButtonPosition, string> = {
  start: "self-start",
  center: "self-center",
  end: "self-end",
  stretch: "self-stretch",
};

/**
 * PrimeVue-style size metrics
 */
const sizeConfig: Record<
  ButtonSize,
  {
    minHeight: number;
    px: number;
    py: number;
    fontSize: number;
    iconSize: number;
    gap: number;
    radius: number;
  }
> = {
  sm: {
    minHeight: 32,
    px: 12,
    py: 6,
    fontSize: 12.5,
    iconSize: 14,
    gap: 6,
    radius: 8,
  },
  md: {
    minHeight: 38,
    px: 16,
    py: 8,
    fontSize: 13.5,
    iconSize: 16,
    gap: 8,
    radius: 10,
  },
  lg: {
    minHeight: 44,
    px: 20,
    py: 10,
    fontSize: 15,
    iconSize: 18,
    gap: 10,
    radius: 12,
  },
};

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
    return num;
  }

  if (value === "px") return 1;
  const num = parseFloat(value);
  if (Number.isNaN(num)) return null;
  return num * 4;
};

const extractMinHeight = (className?: string) => {
  if (!className) return { cleanedClassName: "", minHeight: undefined };
  let minHeight: number | undefined;
  const tokens = className
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => {
      const parsed = parseHeightToken(token);
      if (parsed === null) return true;
      minHeight = parsed;
      return false;
    });
  return { cleanedClassName: tokens.join(" "), minHeight };
};

const ReusableButton = React.forwardRef<any, ReusableButtonProps>(
  function ReusableButton(
    {
      title,
      children,
      leftIcon,
      rightIcon,
      isLoading = false,
      loadingIcon,
      loadingText,
      disabled = false,
      variant = "primary",
      size = "md",
      iconOnly,
      badge,
      className,
      textClassName,
      textStyle,
      containerClassName,
      containerStyle,
      position,
      width,
      height,
      spinnerColor,
      onPress,
      style,
      ...rest
    },
    ref,
  ) {
    const isDisabled = disabled || isLoading;
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);

    const { cleanedClassName, minHeight: classMinHeight } = React.useMemo(
      () => extractMinHeight(className),
      [className],
    );

    const gradient = GRADIENTS[variant];
    // Gradient buttons follow the web reference metrics: 43px, radius 8, 14px/600.
    const currentSize = gradient
      ? {
        minHeight: 43,
        px: 14,
        py: 7,
        fontSize: 14,
        iconSize: 16,
        gap: 8,
        radius: 8,
      }
      : sizeConfig[size] || sizeConfig.md;

    const isIconOnly = Boolean(
      iconOnly ||
      (!title &&
        !children &&
        !loadingText &&
        (Boolean(leftIcon) || Boolean(rightIcon) || isLoading)),
    );

    // PrimeVue Palette & Elevation Configuration
    const variantConfig = React.useMemo(() => {
      if (gradient) {
        return {
          // Solid fallback under the SVG gradient (before first layout).
          bg: gradient[0],
          textColor: "#FFFFFF",
          borderColor: GRADIENT_BORDERS[variant],
          borderWidth: GRADIENT_BORDERS[variant] ? 1 : 0,
          shadow: undefined,
        };
      }
      switch (variant) {
        case "primary":
          return {
            bg: isPressed
              ? `${primaryColor}E6`
              : isHovered
                ? `${primaryColor}F2`
                : primaryColor,
            textColor: "#FFFFFF",
            borderColor: undefined,
            borderWidth: 0,
            shadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
          };
        case "secondary":
          return {
            bg: isPressed ? "#E2E8F0" : isHovered ? "#F1F5F9" : "#F8FAFC",
            textColor: "#334155",
            borderColor: "#CBD5E1",
            borderWidth: 1,
            shadow: "0 1px 2px rgba(0,0,0,0.05)",
          };
        case "danger":
          return {
            bg: isPressed ? "#B91C1C" : isHovered ? "#DC2626" : "#EF4444",
            textColor: "#FFFFFF",
            borderColor: undefined,
            borderWidth: 0,
            shadow:
              "0 1px 3px rgba(220,38,38,0.25), 0 1px 2px rgba(220,38,38,0.15)",
          };
        case "success":
        case "green":
          return {
            bg: isPressed ? "#047857" : isHovered ? "#059669" : "#10B981",
            textColor: "#FFFFFF",
            borderColor: undefined,
            borderWidth: 0,
            shadow:
              "0 1px 3px rgba(16,185,129,0.25), 0 1px 2px rgba(16,185,129,0.15)",
          };
        case "warning":
        case "copy":
          return {
            bg: isPressed ? "#B45309" : isHovered ? "#D97706" : "#F59E0B",
            textColor: "#FFFFFF",
            borderColor: undefined,
            borderWidth: 0,
            shadow:
              "0 1px 3px rgba(245,158,11,0.25), 0 1px 2px rgba(245,158,11,0.15)",
          };
        case "info":
          return {
            bg: isPressed ? "#0369A1" : isHovered ? "#0284C7" : "#0EA5E9",
            textColor: "#FFFFFF",
            borderColor: undefined,
            borderWidth: 0,
            shadow:
              "0 1px 3px rgba(14,165,233,0.25), 0 1px 2px rgba(14,165,233,0.15)",
          };
        case "outline":
          return {
            bg: isPressed
              ? `${primaryColor}15`
              : isHovered
                ? `${primaryColor}0D`
                : "transparent",
            textColor: primaryColor,
            borderColor: isHovered ? primaryColor : `${primaryColor}99`,
            borderWidth: 1,
            shadow: undefined,
          };
        case "ghost":
          return {
            bg: isPressed ? "#E2E8F0" : isHovered ? "#F1F5F9" : "transparent",
            textColor: primaryColor,
            borderColor: undefined,
            borderWidth: 0,
            shadow: undefined,
          };
        case "glass":
        case "header":
          return {
            bg: isPressed
              ? "rgba(255, 255, 255, 0.24)"
              : isHovered
                ? "rgba(255, 255, 255, 0.18)"
                : "rgba(255, 255, 255, 0.12)",
            textColor: "#FFFFFF",
            borderColor: isHovered
              ? "rgba(255, 255, 255, 0.35)"
              : "rgba(255, 255, 255, 0.22)",
            borderWidth: 1,
            shadow: "0 1px 2px rgba(0,0,0,0.08)",
          };
        default:
          return {
            bg: primaryColor,
            textColor: "#FFFFFF",
            borderColor: undefined,
            borderWidth: 0,
            shadow: undefined,
          };
      }
    }, [variant, isHovered, isPressed]);

    const isFlex = Boolean(
      className?.includes("flex-1") ||
      containerClassName?.includes("flex-1") ||
      (style && typeof style === "object" && "flex" in style) ||
      (containerStyle &&
        typeof containerStyle === "object" &&
        "flex" in containerStyle),
    );

    const isStretch = position === "stretch" || width === "100%" || isFlex;

    const resolvedMinHeight =
      height !== undefined
        ? (height as any)
        : classMinHeight !== undefined
          ? classMinHeight
          : currentSize.minHeight;

    const resolvedWidth =
      width !== undefined
        ? (width as any)
        : isIconOnly
          ? resolvedMinHeight
          : undefined;

    const content = (
      <>
        {isLoading && loadingIcon ? (
          <View
            style={{
              marginRight:
                title || children || loadingText ? currentSize.gap : 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {loadingIcon}
          </View>
        ) : null}

        {isLoading && !loadingIcon && (
          <ActivityIndicator
            size="small"
            color={
              spinnerColor ??
              (variant === "outline" || variant === "ghost"
                ? primaryColor
                : "#FFFFFF")
            }
            style={{
              marginRight:
                title || children || loadingText ? currentSize.gap : 0,
            }}
          />
        )}

        {!isLoading && leftIcon ? (
          <View
            style={{
              marginRight: title || children ? currentSize.gap : 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {leftIcon}
          </View>
        ) : null}

        {children ? (
          children
        ) : Boolean(isLoading ? (loadingText ?? title) : title) ? (
          <Text
            className={`font-semibold ${gradient ? "" : "tracking-wide"} ${textClassName ?? ""}`}
            style={[
              {
                color: variantConfig.textColor,
                fontSize: currentSize.fontSize,
                lineHeight: currentSize.fontSize * 1.3,
              },
              textStyle,
            ]}
            numberOfLines={1}
          >
            {isLoading ? (loadingText ?? title) : title}
          </Text>
        ) : null}

        {!isLoading && rightIcon ? (
          <View
            style={{
              marginLeft: title || children ? currentSize.gap : 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {rightIcon}
          </View>
        ) : null}
      </>
    );

    const button = (
      <View
        className={`${isFlex ? "flex-1" : position ? positionClass[position] : "self-start"
          } ${isStretch ? "w-full self-stretch" : ""}`}
        style={containerStyle}
      >
        <Pressable
          ref={ref}
          disabled={isDisabled}
          onPress={isDisabled ? undefined : onPress}
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
          {...(Platform.OS === "web"
            ? {
              onHoverIn: () => setIsHovered(true),
              onHoverOut: () => {
                setIsHovered(false);
                setIsPressed(false);
              },
            }
            : {})}
          pointerEvents={isDisabled ? "none" : "auto"}
          className={`relative flex-row items-center justify-center ${isStretch
            ? "w-full self-stretch"
            : isFlex
              ? "w-full"
              : position
                ? positionClass[position]
                : "self-start"
            } ${cleanedClassName}`}
          style={[
            {
              opacity: gradient ? (disabled ? 0.6 : 1) : isDisabled ? 0.55 : 1,
              ...(gradient ? { overflow: "hidden" as const } : {}),
              backgroundColor: variantConfig.bg,
              borderWidth: variantConfig.borderWidth,
              borderColor: variantConfig.borderColor,
              borderRadius: currentSize.radius,
              paddingHorizontal: isIconOnly ? 0 : currentSize.px,
              paddingVertical: isIconOnly ? 0 : currentSize.py,
              minHeight: resolvedMinHeight,
              ...(resolvedWidth !== undefined
                ? { width: resolvedWidth, minWidth: 0 }
                : {}),
              transform: [{ scale: isPressed && !isDisabled ? 0.985 : 1 }],
              ...(Platform.OS === "web"
                ? {
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: isDisabled ? "none" : variantConfig.shadow,
                  userSelect: "none",
                }
                : {
                  // Same rule as web: only variants that define a shadow get
                  // one — ghost/outline/gradient buttons stay flat.
                  elevation: isDisabled || !variantConfig.shadow ? 0 : 2,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity:
                    isDisabled || !variantConfig.shadow ? 0 : 0.12,
                  shadowRadius: 2,
                }),
            },
            style,
          ]}
          {...(rest as any)}
        >
          {badge !== undefined && badge !== null && badge !== "" && (
            <View
              className="absolute -top-1.5 -right-1.5 bg-rose-500 rounded-full px-1 items-center justify-center border border-primary-900 pointer-events-none"
              style={{ minWidth: 16, height: 16, zIndex: 10 }}
            >
              {typeof badge === "string" || typeof badge === "number" ? (
                <Text className="text-[9px] font-black text-white leading-none text-center">
                  {badge}
                </Text>
              ) : (
                badge
              )}
            </View>
          )}

          {gradient ? <GradientFill colors={[...gradient]} /> : null}

          {/* zIndex/elevation keep the label above the gradient layer on native. */}
          {gradient ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1,
                elevation: 1,
              }}
            >
              {content}
            </View>
          ) : (
            content
          )}
        </Pressable>
      </View>
    );

    if (containerClassName) {
      return <View className={containerClassName}>{button}</View>;
    }
    return button;
  },
);

export default ReusableButton;
