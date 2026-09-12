import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

/**
 * Shared field shell for every form control (SearchableSelect,
 * SearchableMultiSelect, ReusableInput, CustomDatePicker, …).
 *
 * It owns the label, the label→control gap, the error line and the bottom
 * gutter so that any two controls dropped side by side line up automatically
 * — the same "one field primitive" pattern MUI (`FormControl`), Chakra
 * (`FormControl`/`FormLabel`) and Mantine (`Input.Wrapper`) use. Individual
 * controls only render their interactive box; they never style a label again.
 *
 * Alignment contract: label block is a fixed height (LABEL_BLOCK_HEIGHT) and
 * every control box is CONTROL_HEIGHT tall, so fields top-align in a grid and
 * bottom-align in a `flex-row items-end` row without per-screen tweaking.
 */

export const CONTROL_HEIGHT = 46;
export const LABEL_BLOCK_HEIGHT = 24; // 18 line-height + 6 margin-bottom

export interface FormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  /** Reserve the label row even when there is no label, so an unlabelled
      field still lines up with labelled neighbours in the same row. */
  reserveLabelSpace?: boolean;
  /** Drop the default bottom gutter (when a parent already spaces this field). */
  noGutter?: boolean;
  children: React.ReactNode;
  /** Tailwind classes on the outer wrapper (width / flex / margin overrides). */
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function FormField({
  label,
  error,
  required = false,
  reserveLabelSpace = false,
  noGutter = false,
  children,
  className = "",
  style,
}: FormFieldProps) {
  return (
    <View className={`${noGutter ? "" : "mb-4"} ${className}`} style={style}>
      {label ? (
        <Text style={styles.label} numberOfLines={1}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : reserveLabelSpace ? (
        <View style={{ height: LABEL_BLOCK_HEIGHT }} />
      ) : null}

      {children}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: "#334155",
    marginBottom: 6,
  },
  required: { color: "#ef4444" },
  error: {
    fontSize: 11,
    color: "#ef4444",
    marginTop: 4,
    marginLeft: 2,
  },
});

export default FormField;
