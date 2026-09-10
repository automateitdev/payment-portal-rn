import GradientFill from "@/components/ui/GradientFill";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Control, FieldValues, Path, useController } from "react-hook-form";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import { useDebounce } from "@/hooks/useDebounce";
import { normalizeForSearch } from "@/utils/searchNormalize";
import FormField from "./FormField";

/* -------------------------------- TYPES -------------------------------- */

type Option = {
  label: string;
  value: string;
};

interface Props<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  options: Option[];
  label?: string;
  placeholder?: string;
  debounceDelay?: number;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
  containerClassName?: string;
  containerStyle?: ViewStyle;
  triggerClassName?: string;
  textClassName?: string;
}

/* -------------------------------- CONSTANTS ----------------------------- */

const DROPDOWN_HEIGHT = 280;
const SCREEN_HEIGHT = Dimensions.get("window").height;

/* Single FlatList (no more platform-forked ScrollView) so long option
   lists get windowed/virtualized rendering on web too, not just native. */
const LIST_PERF_PROPS = {
  initialNumToRender: 20,
  maxToRenderPerBatch: 20,
  windowSize: 8,
  removeClippedSubviews: Platform.OS !== "web",
} as const;

const keyExtractor = (item: Option) => item.value;

/* ------------------------------ OPTION ROW ------------------------------ */
/* Memoized: a row only re-renders when its own `selected` flag flips, not
   on every keystroke in the search box or every open/close of the modal.
   Requires `onSelect` to stay referentially stable — see `handleSelect`. */
const SelectRow = React.memo(function SelectRow({
  item,
  selected,
  onSelect,
  textClassName,
}: {
  item: Option;
  selected: boolean;
  onSelect: (value: string) => void;
  textClassName?: string;
}) {
  const handlePress = () => onSelect(item.value);
  return (
    <Pressable
      onPress={handlePress}
      className={`flex-row items-center px-3.5 py-3 mx-2 my-[3px] rounded-xl overflow-hidden ${
        selected ? "" : "hover:bg-primary-50 active:bg-primary-100"
      }`}
    >
      {selected && (
        <GradientFill
          colors={[colors.primary[700], colors.primary[500]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          radius={12}
        />
      )}
      <Text
        className={`flex-1 text-[15px] ${
          selected ? "text-white font-semibold" : "text-[#334155] font-medium"
        } ${textClassName ?? ""}`}
      >
        {item.label}
      </Text>
      {selected && (
        <View className="h-5 w-5 items-center justify-center rounded-full bg-white/25">
          <Ionicons name="checkmark" size={13} color="#ffffff" />
        </View>
      )}
    </Pressable>
  );
});

const EmptyResults = () => (
  <View className="py-10 items-center">
    <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-100">
      <Ionicons name="search" size={22} color="#94a3b8" />
    </View>
    <Text className="mt-3 text-center text-slate-500 text-sm font-medium">
      No results found
    </Text>
    <Text className="mt-0.5 text-center text-slate-400 text-xs">
      Try a different keyword
    </Text>
  </View>
);

/* ------------------------------ COMPONENT ------------------------------ */

export function SearchableSelect<T extends FieldValues>({
  name,
  control,
  options,
  label,
  placeholder = "Select",
  debounceDelay = 300,
  disabled = false,
  onValueChange,
  containerClassName = "",
  containerStyle,
  triggerClassName = "",
  textClassName = "",
}: Props<T>) {
  const triggerRef = useRef<View>(null);
  const searchInputRef = useRef<TextInput>(null);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [layout, setLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  /* PrimeVue-style connected-overlay entrance: quick fade + slight rise +
     subtle scale-up when the panel opens. Purely visual — driven off `open`. */
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

  const {
    field: { value, onChange },
    fieldState,
  } = useController<T>({ name, control });

  const debouncedSearch = useDebounce(search, debounceDelay);

  /* ------------------------------ FILTER ------------------------------- */

  const filteredOptions = useMemo(() => {
    if (!debouncedSearch) return options;
    const query = normalizeForSearch(debouncedSearch);
    return options.filter((o) => normalizeForSearch(o.label).includes(query));
  }, [debouncedSearch, options]);

  /* ------------------------------ OPEN -------------------------------- */

  const openDropdown = useCallback(() => {
    if (disabled) return;
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setLayout({ x, y, width, height });
      /* Android won't reliably show a new native Modal window if another
         one just closed in the same tick — give it a beat to finish
         tearing down, otherwise the first tap only registers in JS state
         but nothing appears on screen until a second tap. */
      if (Platform.OS === "android") {
        setTimeout(() => setOpen(true), 100);
      } else {
        setOpen(true);
      }
    });
  }, [disabled]);

  const closeDropdown = useCallback(() => {
    /* The search TextInput stays mounted inside <Modal> even while
       visible={false} — if it still holds focus from before, the very
       next tap anywhere on screen (any field, not just this one) gets
       eaten just blurring it instead of doing anything. Blur it
       explicitly on close so no stale focus is left behind. */
    searchInputRef.current?.blur();
    Keyboard.dismiss();
    setOpen(false);
    setSearch("");
  }, []);

  const handleSelect = useCallback(
    (val: string) => {
      onChange(val);
      onValueChange?.(val);
      closeDropdown();
    },
    [onChange, onValueChange, closeDropdown],
  );

  const renderItem = useCallback(
    ({ item }: { item: Option }) => (
      <SelectRow
        item={item}
        selected={value === item.value}
        onSelect={handleSelect}
        textClassName={textClassName}
      />
    ),
    [value, handleSelect, textClassName],
  );

  /* ------------------------------ POSITION ------------------------------ */

  const dropdownTop =
    layout.y + layout.height + DROPDOWN_HEIGHT > SCREEN_HEIGHT
      ? Math.max(8, layout.y - DROPDOWN_HEIGHT)
      : layout.y + layout.height + 4;

  /* ------------------------------ RENDER ------------------------------- */

  return (
    <FormField
      label={label}
      error={fieldState.error?.message as string | undefined}
      className={containerClassName}
      style={containerStyle}
    >
      {/* ================= TRIGGER ================= */}
      <Pressable
        ref={triggerRef}
        onPress={openDropdown}
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
        ]}
        className={`h-[46px] rounded-xl border-[1.5px] bg-white pl-4 pr-2 py-2 flex-row items-center justify-between ${
          open
            ? "border-primary"
            : fieldState.error
              ? "border-red-500"
              : "border-[#CBD5E1] hover:border-slate-400"
        } ${disabled ? "bg-slate-50 opacity-60" : ""} ${triggerClassName}`}
      >
        <Text
          numberOfLines={1}
          className={`text-[15px] flex-1 ${value ? "font-medium" : ""} ${textClassName}`}
          style={{ color: value ? colors.text : colors.textSecondary }}
        >
          {options.find((o) => o.value === value)?.label || placeholder}
        </Text>

        {value ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onChange("");
              onValueChange?.("");
            }}
            hitSlop={6}
            className="ml-2 mr-1 rounded-full"
          >
            <Ionicons
              name="close-circle"
              size={16}
              color={colors.textSecondary}
            />
          </Pressable>
        ) : null}

        <View
          className={`ml-1 h-7 w-7 items-center justify-center rounded-lg ${open ? "bg-primary" : "bg-slate-100"}`}
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

      {/* ================= DROPDOWN ================= */}
      <Modal transparent visible={open} animationType="none">
        <View style={{ flex: 1 }}>
          <Pressable
            onPress={closeDropdown}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
            }}
          />

          <Animated.View
            style={{
              position: "absolute",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#e2e8f0",
              backgroundColor: "#ffffff",
              overflow: "hidden",
              top: dropdownTop,
              left: layout.x,
              width: layout.width,
              height: DROPDOWN_HEIGHT,
              opacity: panelAnim,
              transform: [
                {
                  translateY: panelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-8, 0],
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
            }}
          >
            {/* ================= SEARCH ================= */}
            <View className="px-3 pt-3.5 pb-3.5 overflow-hidden">
              <GradientFill
                colors={[colors.primary[700], colors.primary[900]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Pressable
                onPress={() => searchInputRef.current?.focus()}
                className={`flex-row items-center border-[1.5px] rounded-xl px-4 h-[44px] overflow-hidden ${
                  searchFocused ? "border-white/70" : "border-white/20"
                }`}
                style={
                  searchFocused
                    ? {
                        shadowColor: colors.primary.DEFAULT,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.15,
                        shadowRadius: 6,
                        elevation: 2,
                      }
                    : undefined
                }
              >
                <GradientFill
                  colors={[colors.primary[600], colors.primary[800]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  radius={12}
                />
                <TextInput
                  ref={searchInputRef}
                  value={search}
                  onChangeText={setSearch}
                  autoFocus={Platform.OS === "web"}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Search"
                  placeholderTextColor={colors.surface[200]}
                  selectionColor={colors.surface[200]}
                  className="flex-1 h-full text-[14px]"
                  style={{
                    color: colors.surface[0],
                    zIndex: 1,
                    ...(Platform.OS === "web"
                      ? ({ outline: "none", outlineStyle: "none" } as any)
                      : {}),
                  }}
                />
                {search ? (
                  <Pressable
                    onPress={() => setSearch("")}
                    hitSlop={8}
                    style={{ marginRight: 8 }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color={colors.surface[200]}
                    />
                  </Pressable>
                ) : null}
                <Ionicons name="search-outline" size={18} color="#ffffff" />
              </Pressable>
            </View>

            {/* ================= LIST ================= */}
            <View style={{ flex: 1 }}>
              <FlatList
                data={filteredOptions}
                keyExtractor={keyExtractor}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingTop: 6, paddingBottom: 10 }}
                renderItem={renderItem}
                ListEmptyComponent={EmptyResults}
                {...LIST_PERF_PROPS}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </FormField>
  );
}
