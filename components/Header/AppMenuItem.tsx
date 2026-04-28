// AppMenuItem.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MenuItemProps {
  item: any;
  index: number;
  root?: boolean;
  parentKey?: string;
  activeKey: string | null;
  setActiveKey: (key: string | null) => void;
  onMenuPress?: () => void;
}

const AppMenuItem = ({
  item,
  index,
  root = false,
  parentKey,
  activeKey,
  setActiveKey,
  onMenuPress,
}: MenuItemProps) => {
  const pathname = usePathname();
  const router = useRouter();

  const itemKey = parentKey ? `${parentKey}-${index}` : `${index}`;
  const isOpen = activeKey === itemKey || activeKey?.startsWith(`${itemKey}-`);
  const isActiveRoute = item.to && pathname === item.to;

  // For nested items we highlight if any child is active
  const isGroupActive = activeKey?.startsWith(`${itemKey}-`);

  // const handlePress = () => {
  //   if (item.disabled) return;

  //   if (item.items) {
  //     LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  //     setActiveKey(isOpen ? (parentKey ?? null) : itemKey);
  //   } else {
  //     if (item.command) item.command();
  //     if (item.to) router.replace(item.to); // or push — replace is often better for sidebar nav
  //     // You can add: if on small screen → close drawer logic here
  //   }
  // };

  const handlePress = () => {
    if (item.disabled) return;

    // Submenu → toggle only
    if (item.items) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setActiveKey(isOpen ? (parentKey ?? null) : itemKey);
      return;
    }

    // Command (logout etc.)
    if (item.command) {
      item.command();
    }

    // Navigation
    if (item.to) {
      router.replace(item.to); // replace is better for sidebar
    }

    // ✅ ALWAYS close sidebar after click
    onMenuPress?.();
  };

  return (
    <View className={`${root ? "mt-3" : "mt-0.5"}`}>
      {/* Section Header (only for root level with label) */}
      {root && item.label && (
        <Text className="px-5 pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          {item.label}
        </Text>
      )}

      {/* Menu Row */}
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.75}
        className={`
          flex-row items-center px-4 py-3 mx-2 rounded-xl
          ${
            isActiveRoute || isGroupActive
              ? "bg-green-50 border-l-4 border-green-600"
              : "hover:bg-gray-100/60 active:bg-gray-200/70"
          }
        `}
      >
        {item.icon && (
          <Ionicons
            name={item.icon}
            size={22}
            color={isActiveRoute || isGroupActive ? "#15803d" : "#6b7280"}
            style={{ opacity: item.disabled ? 0.4 : 1 }}
          />
        )}

        <Text
          className={`
            flex-1 ml-3 text-[15px] font-medium
            ${
              isActiveRoute || isGroupActive
                ? "text-green-800 font-semibold"
                : "text-gray-700"
            }
            ${item.disabled && "opacity-50"}
          `}
        >
          {item.label}
        </Text>

        {item.items && (
          <Ionicons
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color={isOpen ? "#4b5563" : "#9ca3af"}
          />
        )}
      </TouchableOpacity>

      {/* Submenu */}
      {item.items && isOpen && (
        <View className="mt-1 mb-1">
          {item.items.map((child: any, i: number) => (
            <AppMenuItem
              key={`${itemKey}-${i}`}
              item={child}
              index={i}
              root={false}
              parentKey={itemKey}
              activeKey={activeKey}
              setActiveKey={setActiveKey}
              onMenuPress={onMenuPress}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default AppMenuItem;
