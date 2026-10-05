import { useAppSelector } from "@/redux/hook";
import { RootState } from "@/redux/store";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type OptionValue = string | number;

export interface SelectOption {
  label: string;
  value: OptionValue;
}

type Props = {
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  onChange?: (value: OptionValue) => void;
  value?: OptionValue | null;
  icon?: React.ReactNode;
};

export const CustomSelect = ({
  options,
  placeholder = "Select an option",
  label,
  disabled = false,
  error,
  helperText,
  className = "",
  value,
  onChange,
  icon,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<View>(null);
  const themeMode = useAppSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === "dark";
  const selectedValue = value;

  const selectedOption = useMemo(
    () => options.find((option) => option.value === selectedValue),
    [options, selectedValue],
  );

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      triggerRef.current?.measureInWindow((x, y, width, height) => {
        setMenuPosition({
          top: y + height + 6,
          left: x,
          width: width,
        });
        setIsOpen(true);
      });
    }
  };

  const handleSelect = (nextValue: OptionValue) => {
    onChange?.(nextValue);
    setIsOpen(false);
  };

  return (
    <View className={`w-full ${className}`}>
      {label ? (
        <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </Text>
      ) : null}

      <TouchableOpacity
        ref={triggerRef}
        activeOpacity={0.8}
        disabled={disabled}
        onPress={handleToggle}
        className={`h-[52px] rounded-2xl border px-3.5 flex-row items-center justify-between transition-all ${
          disabled
            ? "border-gray-200 bg-gray-50 dark:bg-gray-900/40 dark:border-gray-800 opacity-60"
            : isOpen
              ? "border-emerald-500 bg-white dark:bg-[#111C35] ring-2 ring-emerald-500/20"
              : error
                ? "border-rose-400 bg-rose-50/30 dark:bg-rose-950/20"
                : "border-gray-200/90 bg-gray-50/70 hover:bg-white hover:border-gray-300 dark:bg-[#0B1120]/60 dark:border-gray-800 dark:hover:border-gray-700"
        }`}
      >
        <View className="flex-row items-center flex-1 pr-2 min-w-0">
          {icon ? <View className="mr-2.5 items-center justify-center">{icon}</View> : null}
          <Text
            numberOfLines={1}
            className={`text-sm ${
              selectedOption
                ? "font-bold text-gray-950 dark:text-white"
                : "font-medium text-gray-400 dark:text-gray-500"
            }`}
          >
            {selectedOption?.label || placeholder}
          </Text>
        </View>

        <View
          className={`h-7 w-7 rounded-lg items-center justify-center ${
            isOpen
              ? "bg-emerald-100 dark:bg-emerald-950"
              : "bg-gray-200/60 dark:bg-gray-800/80"
          }`}
        >
          <Ionicons
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={15}
            color={isOpen ? "#059669" : (isDark ? "#9CA3AF" : "#6B7280")}
          />
        </View>
      </TouchableOpacity>

      {error ? (
        <Text className="mt-1.5 text-xs text-rose-500 font-medium">{error}</Text>
      ) : helperText ? (
        <Text className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{helperText}</Text>
      ) : null}

      <Modal
        transparent
        visible={isOpen}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "transparent" }}
          onPress={() => setIsOpen(false)}
        >
          <View
            style={{
              position: "absolute",
              top: menuPosition.top,
              left: menuPosition.left,
              width: Math.max(menuPosition.width, 220),
              maxHeight: 280,
              backgroundColor: isDark ? "#111C35" : "#FFFFFF",
              borderRadius: 18,
              borderWidth: 1,
              borderColor: isDark ? "#1E293B" : "#E2E8F0",
              padding: 6,
             
              elevation: 16,
              zIndex: 1000,
            }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={true}
              className="w-full"
            >
              {options.map((item) => {
                const isSelected = item.value === selectedValue;

                return (
                  <TouchableOpacity
                    key={String(item.value)}
                    activeOpacity={0.7}
                    onPress={() => handleSelect(item.value)}
                    className={`px-3.5 py-3 flex-row items-center justify-between rounded-xl mb-1 ${
                      isSelected
                        ? (isDark ? "bg-emerald-950/60 border border-emerald-500/30" : "bg-emerald-50 border border-emerald-200")
                        : (isDark ? "hover:bg-gray-800/50" : "hover:bg-gray-50")
                    }`}
                  >
                    <Text
                      numberOfLines={1}
                      className={`text-sm flex-1 mr-2 ${
                        isSelected
                          ? "font-bold text-emerald-700 dark:text-emerald-400"
                          : "font-medium text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {item.label}
                    </Text>

                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#059669"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};
