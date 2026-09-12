import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

export type TabVariant = "pills" | "underline" | "segmented" | "boxed";
export type TabSize = "xs" | "sm" | "md" | "lg";
export type TabAlign = "start" | "center" | "end" | "stretch";

export interface TabItem {
  /** Unique identifier */
  key: string;
  /** Display label */
  label: string;
  /** Optional left icon */
  icon?: React.ReactNode;
  /** Optional badge (count / status) on the right */
  badge?: string | number;
  /** Disable interaction */
  disabled?: boolean;
  /** Custom JSX label (overrides label/icon/badge layout) */
  customLabel?: React.ReactNode;
  /** Optional content — used if `renderContent` is true */
  content?: React.ReactNode;
}

export interface ReusableTabProps {
  /** Tab items */
  tabs: TabItem[];
  /** Currently active tab key */
  activeKey: string;
  /** Change handler */
  onChange: (key: string) => void;

  /** Visual style preset */
  variant?: TabVariant;
  /** Size preset */
  size?: TabSize;
  /** Tab list alignment */
  align?: TabAlign;
  /** Horizontally scrollable when overflow (default: true) */
  scrollable?: boolean;

  /** Render the active tab's `content` below the tab list */
  renderContent?: boolean;

  /** Primary/active color (default navy `#1e3a8a`) */
  activeColor?: string;

  /** Tailwind override on the list container (outer card) */
  containerClassName?: string;
  /** Tailwind override on the inner tab list row */
  className?: string;
  /** Tailwind override on every tab item */
  tabClassName?: string;
  /** Extra Tailwind classes when a tab is active */
  activeTabClassName?: string;
  /** Tab label text classes */
  textClassName?: string;
  /** Extra label text classes when active */
  activeTextClassName?: string;
  /** Badge wrapper classes */
  badgeClassName?: string;
  /** Content area classes (when `renderContent`) */
  contentClassName?: string;

  /** Manual style overrides */
  style?: ViewStyle;
  tabStyle?: ViewStyle;
  textStyle?: TextStyle;
}

/* ---------- preset size ---------- */
const sizeStyles: Record<
  TabSize,
  { padX: string; padY: string; text: string; gap: string; badge: string }
> = {
  xs: {
    padX: "px-2.5",
    padY: "py-1",
    text: "text-[11px]",
    gap: "gap-1",
    badge: "text-[9px] px-1 py-0",
  },
  sm: {
    padX: "px-3.5",
    padY: "py-1.5",
    text: "text-xs",
    gap: "gap-1.5",
    badge: "text-[10px] px-1.5 py-0",
  },
  md: {
    padX: "px-4",
    padY: "py-2",
    text: "text-sm",
    gap: "gap-2",
    badge: "text-[11px] px-1.5 py-0.5",
  },
  lg: {
    padX: "px-5",
    padY: "py-3",
    text: "text-base",
    gap: "gap-2",
    badge: "text-xs px-2 py-0.5",
  },
};

const alignClass: Record<TabAlign, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  stretch: "",
};

/* ---------- single tab button (own animated value for independent bounce) ---------- */
interface TabButtonProps {
  item: TabItem;
  isActive: boolean;
  wrapperClassName: string;
  textClassName: string;
  extraStyle: ViewStyle;
  activeInlineTextColor?: { color: string };
  tabStyle?: ViewStyle;
  textStyle?: TextStyle;
  badgeClassName?: string;
  badgeSizeClass: string;
  onPress: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({
  item,
  isActive,
  wrapperClassName,
  textClassName,
  extraStyle,
  activeInlineTextColor,
  tabStyle,
  textStyle,
  badgeClassName,
  badgeSizeClass,
  onPress,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (item.disabled) return;
    Animated.spring(scale, {
      toValue: 0.93,
      useNativeDriver: true,
      speed: 50,
      bounciness: 6,
    }).start();
  };
  const handlePressOut = () => {
    if (item.disabled) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 10,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={item.disabled}
        className={wrapperClassName}
        style={[extraStyle, tabStyle]}
      >
        {item.customLabel ? (
          item.customLabel
        ) : (
          <>
            {item.icon && <View>{item.icon}</View>}
            <Text
              className={textClassName}
              style={[activeInlineTextColor, textStyle]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
            {item.badge !== undefined && item.badge !== null && (
              <View
                className={`rounded-full ${badgeSizeClass} ${
                  isActive ? "bg-white/25" : "bg-slate-200"
                } ${badgeClassName ?? ""}`}
              >
                <Text
                  className={`font-bold ${
                    isActive ? "text-white" : "text-slate-600"
                  }`}
                >
                  {item.badge}
                </Text>
              </View>
            )}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
};

const ReusableTab: React.FC<ReusableTabProps> = ({
  tabs,
  activeKey,
  onChange,
  variant = "pills",
  size = "sm",
  align = "start",
  scrollable = true,
  renderContent = false,
  activeColor = "#345DFF",
  containerClassName,
  className,
  tabClassName,
  activeTabClassName,
  textClassName,
  activeTextClassName,
  badgeClassName,
  contentClassName,
  style,
  tabStyle,
  textStyle,
}) => {
  const sz = sizeStyles[size];

  /* ---------- per-variant styles ---------- */
  const buildTabStyles = (item: TabItem, isActive: boolean) => {
    const isDisabled = item.disabled;

    // Base shared
    let wrapper = `flex-row items-center ${sz.padX} ${sz.padY} ${sz.gap}`;
    let textCls = `font-semibold ${sz.text}`;
    let extraTabStyle: ViewStyle = {};

    if (align === "stretch") wrapper += " flex-1 justify-center";

    switch (variant) {
      case "pills": {
        wrapper += ` rounded-lg ${isActive ? "" : "bg-transparent"}`;
        if (isActive) {
          extraTabStyle = {
            backgroundColor: activeColor,
            shadowColor: activeColor,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 3,
          };
          textCls += " text-white";
        } else {
          textCls += " text-surface-500";
        }
        break;
      }
      case "underline": {
        wrapper += ` rounded-none border-b-2 ${
          isActive ? "" : "border-transparent"
        }`;
        if (isActive) {
          extraTabStyle = { borderBottomColor: activeColor };
          textCls += "";
          // active text color via inline style
        } else {
          textCls += " text-surface-500";
        }
        break;
      }
      case "segmented": {
        wrapper += ` rounded-md ${isActive ? "bg-white" : "bg-transparent"}`;
        if (isActive) {
          extraTabStyle = {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2,
          };
          textCls += "";
        } else {
          textCls += " text-surface-500";
        }
        break;
      }
      case "boxed": {
        wrapper += ` rounded-lg border ${isActive ? "border-transparent" : "border-surface-border bg-surface-card"}`;
        if (isActive) {
          extraTabStyle = {
            backgroundColor: activeColor,
            shadowColor: activeColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 8,
            elevation: 3,
          };
          textCls += " text-white";
        } else {
          textCls += " text-surface-600";
        }
        break;
      }
    }

    if (isDisabled) wrapper += " opacity-40";

    return {
      wrapper: `${wrapper} ${tabClassName ?? ""} ${
        isActive ? (activeTabClassName ?? "") : ""
      }`,
      text: `${textCls} ${textClassName ?? ""} ${
        isActive ? (activeTextClassName ?? "") : ""
      }`,
      extraStyle: extraTabStyle,
    };
  };

  /* ---------- tab list container styles per variant ---------- */
  const containerVariantClass = (() => {
    switch (variant) {
      case "pills":
        return "rounded-xl bg-surface-card p-1 shadow-sm";
      case "underline":
        return "border-b border-surface-border";
      case "segmented":
        return "rounded-lg bg-surface-50 p-1";
      case "boxed":
        return "";
      default:
        return "";
    }
  })();

  /* ---------- per-variant gap between tabs ---------- */
  const tabRowGap =
    variant === "boxed" ? "gap-2" : variant === "underline" ? "gap-1" : "gap-1";

  /* ---------- render one tab ---------- */
  const renderTab = (item: TabItem) => {
    const isActive = item.key === activeKey;
    const styles = buildTabStyles(item, isActive);

    // Active text color for underline/segmented (uses activeColor inline)
    const activeInlineTextColor =
      (variant === "underline" || variant === "segmented") && isActive
        ? { color: activeColor }
        : undefined;

    return (
      <TabButton
        key={item.key}
        item={item}
        isActive={isActive}
        wrapperClassName={styles.wrapper}
        textClassName={styles.text}
        extraStyle={styles.extraStyle}
        activeInlineTextColor={activeInlineTextColor}
        tabStyle={tabStyle}
        textStyle={textStyle}
        badgeClassName={badgeClassName}
        badgeSizeClass={sz.badge}
        onPress={() => !item.disabled && onChange(item.key)}
      />
    );
  };

  /* ---------- render tab list ---------- */
  const listInner = (
    <View
      className={`flex-row items-center ${tabRowGap} ${alignClass[align]} ${className ?? ""}`}
      style={style}
    >
      {tabs.map(renderTab)}
    </View>
  );

  /* ---------- active content ---------- */
  const activeContent = tabs.find((t) => t.key === activeKey)?.content;

  return (
    <View>
      <View className={`${containerVariantClass} ${containerClassName ?? ""}`}>
        {scrollable ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={
              align === "stretch" ? { flexGrow: 1 } : undefined
            }
          >
            {listInner}
          </ScrollView>
        ) : (
          listInner
        )}
      </View>

      {renderContent && activeContent !== undefined && (
        <View className={`mt-4 ${contentClassName ?? ""}`}>
          {activeContent}
        </View>
      )}
    </View>
  );
};

export default ReusableTab;
