import FormField from "@/components/ui/FormField";
import GradientFill from "@/components/ui/GradientFill";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { memo, useEffect, useRef, useState } from "react";
import { Control, Controller, FieldValues, Path } from "react-hook-form";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Modal,
  Platform,
  Pressable,
  Text,
  UIManager,
  View,
  findNodeHandle,
} from "react-native";

/* -------------------------------- TYPES -------------------------------- */

export type Option = {
  label: string;
  value: string;
};

type BaseProps = {
  label?: string;
  options: Option[];
  placeholder?: string;
  maxHeight?: number;
  containerStyle?: any;
  hideMargin?: boolean;
  disabled?: boolean;
};

/** RHF mode */
type RHFProps<T extends FieldValues> = {
  name: Path<T>;
  control: Control<T>;
  value?: never;
  onChange?: never;
};

/** Controlled mode */
type ControlledProps = {
  value: string;
  onChange: (value: string) => void;
  name?: never;
  control?: never;
};

type Props<T extends FieldValues> = BaseProps & (ControlledProps | RHFProps<T>);

/* ------------------------- TYPE GUARD ----------------------------- */

function isControlledProps<T extends FieldValues>(
  props: Props<T>,
): props is BaseProps & ControlledProps {
  return "value" in props && "onChange" in props;
}

/* --------------------- DROPDOWN RENDERER -------------------------- */

type DropdownRendererProps = {
  label?: string;
  options: Option[];
  placeholder: string;
  maxHeight: number;
  value: string;
  onChange: (value: string) => void;
  containerStyle?: any;
  hideMargin?: boolean;
  disabled?: boolean;
};

const DropdownRenderer = memo<DropdownRendererProps>(
  ({
    label,
    options,
    placeholder,
    maxHeight,
    value,
    onChange,
    containerStyle,
    hideMargin,
    disabled,
  }) => {
    const triggerRef = useRef<View>(null);
    const selectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      return () => {
        if (selectTimeoutRef.current) clearTimeout(selectTimeoutRef.current);
      };
    }, []);

    const [open, setOpen] = useState(false);
    const [openAbove, setOpenAbove] = useState(false);
    const [position, setPosition] = useState({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });

    const selected = options.find((o) => o.value === value);

    /* PrimeVue-style panel entrance: fade + slight rise + subtle scale-up. */
    const panelAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      if (!open) return;
      panelAnim.setValue(0);
      const id = requestAnimationFrame(() => {
        Animated.timing(panelAnim, {
          toValue: 1,
          duration: 140,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
      return () => cancelAnimationFrame(id);
    }, [open, panelAnim]);

    /* --------------------------- OPEN DROPDOWN ---------------------------- */

    const openDropdown = () => {
      if (!triggerRef.current) return;

      const screenHeight = Dimensions.get("window").height;

      if (Platform.OS === "web") {
        const rect = (
          triggerRef.current as unknown as HTMLElement
        ).getBoundingClientRect();

        const spaceBelow = screenHeight - (rect.top + rect.height);
        const shouldOpenAbove = spaceBelow < maxHeight && rect.top > maxHeight;

        setPosition({
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        });
        setOpenAbove(shouldOpenAbove);
        setOpen(true);
        return;
      }

      const node = findNodeHandle(triggerRef.current);
      if (!node) return;

      UIManager.measureInWindow(node, (x, y, width, height) => {
        const spaceBelow = screenHeight - (y + height);
        const shouldOpenAbove = spaceBelow < maxHeight && y > maxHeight;
        setPosition({ x, y, width, height });
        setOpenAbove(shouldOpenAbove);
        setOpen(true);
      });
    };

    /* ------------------------------ UI -------------------------------- */

    return (
      <FormField label={label} noGutter={hideMargin}>
        <View>
          <Pressable
            ref={triggerRef}
            onPress={disabled ? undefined : openDropdown}
            style={[
              open
                ? {
                    shadowColor: colors.primary.DEFAULT,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.15,
                    shadowRadius: 6,
                    elevation: 2,
                  }
                : null,
              Platform.OS === "web"
                ? ({ outline: "none", outlineStyle: "none" } as any)
                : null,
              disabled ? { backgroundColor: "#f8fafc", opacity: 0.7 } : null,
              containerStyle,
            ]}
            className={`h-[46px] rounded-xl border-[1.5px] bg-white pl-4 pr-2 py-2 flex-row items-center justify-between ${
              open
                ? "border-primary"
                : "border-[#CBD5E1] hover:border-slate-400"
            } ${disabled ? "border-slate-200" : ""}`}
          >
            <Text
              numberOfLines={1}
              className={`text-[15px] flex-1 ${value ? "font-medium" : ""}`}
              style={{ color: value ? colors.text : colors.textSecondary }}
            >
              {selected?.label || placeholder}
            </Text>

            <View
              className={`ml-1 h-7 w-7 items-center justify-center rounded-lg ${
                open ? "bg-primary" : "bg-slate-100"
              }`}
              style={{
                transform: [{ rotate: open ? "180deg" : "0deg" }],
              }}
            >
              <Ionicons
                name="chevron-down"
                size={15}
                color={open ? "#ffffff" : "#475569"}
              />
            </View>
          </Pressable>
        </View>

        <Modal transparent visible={open} animationType="none">
          <Pressable className="flex-1" onPress={() => setOpen(false)}>
            <Animated.View
              style={[
                {
                  position: "absolute",
                  left: position.x,
                  width: position.width,
                  maxHeight,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                  backgroundColor: "#ffffff",
                  overflow: "hidden",
                  opacity: panelAnim,
                  transform: [
                    {
                      translateY: panelAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [openAbove ? 8 : -8, 0],
                      }),
                    },
                    {
                      scale: panelAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.97, 1],
                      }),
                    },
                  ],
                  ...Platform.select({
                    ios: {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.15,
                      shadowRadius: 18,
                    },
                    android: { elevation: 12 },
                    web: {
                      boxShadow:
                        "0 12px 32px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.06)",
                    } as any,
                  }),
                },
                openAbove
                  ? { bottom: Dimensions.get("window").height - position.y + 4 }
                  : { top: position.y + position.height + 4 },
              ]}
            >
              <FlatList
                data={options}
                keyExtractor={(item) => item.value}
                contentContainerStyle={{ paddingTop: 6, paddingBottom: 10 }}
                ListEmptyComponent={
                  <View className="py-10 items-center">
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                      <Ionicons name="search" size={22} color="#94a3b8" />
                    </View>
                    <Text className="mt-3 text-center text-slate-500 text-sm font-medium">
                      No options
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isSelected = value === item.value;

                  return (
                    <Pressable
                      onPress={() => {
                        setOpen(false);
                        // On Android, closing this Modal and opening another
                        // one (e.g. a confirmation dialog triggered by
                        // onChange) in the same tick can leave the new
                        // Modal's touch targets unresponsive until something
                        // else re-renders. Deferring onChange lets this
                        // Modal fully tear down first. Web has no such
                        // native window stacking, so it fires instantly.
                        if (Platform.OS === "web") {
                          onChange(item.value);
                        } else {
                          selectTimeoutRef.current = setTimeout(
                            () => onChange(item.value),
                            50,
                          );
                        }
                      }}
                      className={`flex-row items-center px-3.5 py-3 mx-2 my-[3px] rounded-xl overflow-hidden ${
                        isSelected
                          ? ""
                          : "hover:bg-primary-50 active:bg-primary-100"
                      }`}
                    >
                      {isSelected && (
                        <GradientFill
                          colors={[colors.primary[700], colors.primary[500]]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          radius={12}
                        />
                      )}
                      <Text
                        className={`flex-1 text-[15px] ${
                          isSelected
                            ? "text-white font-semibold"
                            : "text-[#334155] font-medium"
                        }`}
                      >
                        {item.label}
                      </Text>
                      {isSelected && (
                        <View className="h-5 w-5 items-center justify-center rounded-full bg-white/25">
                          <Ionicons name="checkmark" size={13} color="#ffffff" />
                        </View>
                      )}
                    </Pressable>
                  );
                }}
              />
            </Animated.View>
          </Pressable>
        </Modal>
      </FormField>
    );
  },
);

DropdownRenderer.displayName = "DropdownRenderer";

/* ------------------------------ MAIN COMPONENT ------------------------------- */

const SelectDropdown = <T extends FieldValues>(props: Props<T>) => {
  const {
    label,
    options,
    placeholder = "Select",
    maxHeight = 200,
    containerStyle,
    hideMargin,
    disabled,
  } = props;

  return isControlledProps(props) ? (
    <DropdownRenderer
      label={label}
      options={options}
      placeholder={placeholder}
      maxHeight={maxHeight}
      value={props.value}
      onChange={props.onChange}
      containerStyle={containerStyle}
      hideMargin={hideMargin}
      disabled={disabled}
    />
  ) : (
    <Controller
      name={props.name}
      control={props.control}
      render={({ field }) => (
        <DropdownRenderer
          label={label}
          options={options}
          placeholder={placeholder}
          maxHeight={maxHeight}
          value={field.value ?? ""}
          onChange={field.onChange}
          containerStyle={containerStyle}
          hideMargin={hideMargin}
          disabled={disabled}
        />
      )}
    />
  );
};

SelectDropdown.displayName = "SelectDropdown";

export default SelectDropdown;
