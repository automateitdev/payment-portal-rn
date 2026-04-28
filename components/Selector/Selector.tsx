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
          top: y + height + 5,
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
    <View className={`mb-4 ${className}`}>
      {label ? (
        <Text className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </Text>
      ) : null}

      <TouchableOpacity
        ref={triggerRef}
        activeOpacity={0.85}
        disabled={disabled}
        onPress={handleToggle}
        className={`min-h-[56px] rounded-2xl border px-4 py-3 flex-row items-center justify-between ${
          disabled
            ? "border-slate-200 bg-slate-100 dark:bg-slate-900 dark:border-slate-800"
            : isOpen
              ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-500/10"
              : error
                ? "border-rose-300 bg-rose-50/60 dark:bg-rose-500/10"
                : "border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800"
        }`}
      >
        <View className="flex-1 pr-3">
          <Text
            numberOfLines={1}
            className={`text-[15px] ${
              selectedOption 
                ? "font-semibold text-slate-900 dark:text-slate-100" 
                : "text-slate-400 dark:text-slate-500"
            }`}
          >
            {selectedOption?.label || placeholder}
          </Text>
          {selectedOption ? (
            <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Tap to change selection
            </Text>
          ) : null}
        </View>

        <View
          className={`h-9 w-9 rounded-xl items-center justify-center ${
            disabled ? "bg-slate-200 dark:bg-slate-800" : "bg-slate-100 dark:bg-slate-800"
          }`}
        >
          <Ionicons
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color={disabled ? (isDark ? "#475569" : "#94a3b8") : (isDark ? "#94a3b8" : "#475569")}
          />
        </View>
      </TouchableOpacity>

      {error ? (
        <Text className="mt-2 text-xs text-rose-500">{error}</Text>
      ) : helperText ? (
        <Text className="mt-2 text-xs text-slate-500 dark:text-slate-400">{helperText}</Text>
      ) : null}

      <Modal
        transparent
        visible={isOpen}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          className="flex-1 bg-transparent"
          onPress={() => setIsOpen(false)}
        >
          <View
            style={{
              position: "absolute",
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: 300,
              backgroundColor: isDark ? "#1e293b" : "white",
              borderRadius: 20,
              borderWidth: 1,
              borderColor: isDark ? "#334155" : "#f1f5f9",
              padding: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDark ? 0.3 : 0.12,
              shadowRadius: 24,
              elevation: 12,
              zIndex: 1000,
            }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={true}
              className="w-full"
            >
              {options.map((item, index) => {
                const isSelected = item.value === selectedValue;

                return (
                  <TouchableOpacity
                    key={String(item.value)}
                    activeOpacity={0.6}
                    onPress={() => handleSelect(item.value)}
                    className={`px-4 py-4 flex-row items-center justify-between rounded-2xl mb-1 ${
                      isSelected
                        ? (isDark ? "bg-emerald-500/20" : "bg-emerald-50/80")
                        : "bg-transparent"
                    }`}
                  >
                    <View className="flex-1">
                      <Text
                        numberOfLines={1}
                        className={`text-[15px] ${
                          isSelected
                            ? "font-bold text-emerald-700 dark:text-emerald-400"
                            : "font-medium text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {item.label}
                      </Text>
                      {isSelected && (
                        <Text className={`text-[10px] mt-0.5 ${isDark ? 'text-emerald-400/60' : 'text-emerald-600/60'}`}>
                          Currently Selected
                        </Text>
                      )}
                    </View>
                    
                    {isSelected && (
                      <View className="h-6 w-6 rounded-full bg-emerald-500 items-center justify-center">
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color="white"
                        />
                      </View>
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
