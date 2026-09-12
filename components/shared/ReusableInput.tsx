import FormField from "@/components/ui/FormField";
import { colors } from "@/theme/colors";
import React, { forwardRef, ReactNode, useState } from "react";
import {
  DimensionValue,
  StyleProp,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";

interface ReusableInputProps extends TextInputProps {
  width?: DimensionValue;
  height?: DimensionValue;
  containerClass?: string;
  inputClass?: string;
  inputType?: "text" | "number" | "password" | "email";
  containerStyle?: StyleProp<ViewStyle>;
  error?: boolean;
  /** Field label — rendered through the shared FormField shell so it lines up
      with SearchableSelect / CustomDatePicker in the same row. */
  label?: string;
  /** Validation message shown under the input (also set `error` for the red border). */
  errorText?: string;
  disabled?: boolean;
  activeColor?: string; // Color when focused
  inactiveColor?: string; // Border color when not focused (default is neutral)
  leftIcon?: ReactNode; // Allow adding vector icons on the left
  rightIcon?: ReactNode; // Allow adding vector icons on the right
}

const ReusableInput = forwardRef<TextInput, ReusableInputProps>(
  (
    {
      width = "100%",
      height = 44,
      placeholder = "Enter text...",
      containerClass = "",
      inputClass = "",
      inputType = "text",
      keyboardType,
      secureTextEntry,
      onFocus,
      onBlur,
      onChangeText,
      style,
      containerStyle,
      error,
      label,
      errorText,
      disabled = false,
      activeColor = colors.primary.DEFAULT, // focus border from active vendor theme
      inactiveColor = "#b9ddd5", // surface-border (matches the Edufee web theme)
      leftIcon,
      rightIcon,
      ...rest
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const getKeyboardType = () => {
      if (keyboardType) return keyboardType;
      switch (inputType) {
        case "number":
          return "numeric";
        case "email":
          return "email-address";
        default:
          return "default";
      }
    };

    const handleFocus = (e: any) => {
      if (disabled) return;
      setIsFocused(true);
      if (onFocus) onFocus(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      if (onBlur) onBlur(e);
    };

    const handleTextChange = (text: string) => {
      if (disabled) return;
      let filteredText = text;
      if (inputType === "number") {
        filteredText = text.replace(/[^0-9.]/g, "");
      }
      if (onChangeText) {
        onChangeText(filteredText);
      }
    };

    const borderColor = error
      ? "#ef4444" // red-500
      : isFocused
        ? activeColor
        : inactiveColor;

    const hasFieldShell = Boolean(label || errorText);

    const inputBox = (
      <View
        className={`rounded-lg px-3 flex-row items-center ${
          hasFieldShell ? "" : `my-1 ${containerClass}`
        }`}
        style={[
          {
            width,
            height,
            borderColor: disabled ? "#e2e8f0" : borderColor,
            borderWidth: 1,
            backgroundColor: disabled ? "#f1f5f9" : "#ffffff",
            overflow: "hidden",
          },
          isFocused
            ? {
                shadowColor: activeColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.15,
                shadowRadius: 5,
                elevation: 2,
              }
            : {
                shadowColor: "#12121780",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              },
          containerStyle,
        ]}
      >
        {leftIcon && <View className="mr-2">{leftIcon}</View>}
        <TextInput
          ref={ref}
          className={`flex-1 text-sm h-full ${inputClass} ${
            disabled ? "text-slate-400" : ""
          }`}
          placeholderTextColor="#94a3b8"
          placeholder={placeholder}
          keyboardType={getKeyboardType()}
          secureTextEntry={inputType === "password" || secureTextEntry}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChangeText={handleTextChange}
          editable={!disabled && rest.editable !== false}
          style={[
            {
              outlineStyle: "none",
              color: disabled ? "#94a3b8" : "#12343a",
            } as any,
            style,
          ]}
          {...rest}
        />
        {rightIcon && <View className="ml-2">{rightIcon}</View>}
      </View>
    );

    if (hasFieldShell) {
      return (
        <FormField label={label} error={errorText} className={containerClass}>
          {inputBox}
        </FormField>
      );
    }

    return inputBox;
  },
);

ReusableInput.displayName = "ReusableInput";

export default ReusableInput;
