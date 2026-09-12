import FormField from "@/components/ui/FormField";
import GradientFill from "@/components/ui/GradientFill";
import { useDebounce } from "@/hooks/useDebounce";
import { colors } from "@/theme/colors";
import { normalizeForSearch } from "@/utils/searchNormalize";
import { Ionicons } from "@expo/vector-icons";
import CheckBox from "expo-checkbox";
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
} from "react-native";

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
  containerClassName?: string;
  triggerClassName?: string;
  textClassName?: string;
}

const DROPDOWN_HEIGHT = 300;
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
/* Memoized: a row only re-renders when its own `checked` flag flips, not
   on every keystroke or on every other row's toggle. `onToggle` must stay
   referentially stable (see `toggle` below, which reads the latest
   selection through a ref instead of closing over `value` directly) for
   this to actually skip work instead of just re-creating cheap elements. */
const MultiSelectRow = React.memo(function MultiSelectRow({
  item,
  checked,
  highlighted,
  onToggle,
  textClassName,
}: {
  item: Option;
  checked: boolean;
  highlighted: boolean;
  onToggle: (item: Option) => void;
  textClassName?: string;
}) {
  const handleToggle = () => onToggle(item);
  return (
    <Pressable
      onPress={handleToggle}
      className={`flex-row items-center mx-2 my-[3px] px-3.5 py-3 rounded-xl overflow-hidden ${
        checked
          ? ""
          : highlighted
            ? "bg-primary-100"
            : "hover:bg-primary-50 active:bg-primary-100"
      }`}
    >
      {checked && (
        <GradientFill
          colors={[colors.primary[700], colors.primary[500]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          radius={12}
        />
      )}
      <CheckBox
        value={checked}
        onValueChange={handleToggle}
        color={checked ? colors.primary[900] : undefined}
      />
      <Text
        className={`flex-1 ml-3 text-[15px] ${
          checked ? "text-white font-semibold" : "text-[#334155] font-medium"
        } ${textClassName ?? ""}`}
      >
        {item.label}
      </Text>
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

export function SearchableMultiSelect<T extends FieldValues>({
  name,
  control,
  options,
  label,
  placeholder = "Select",
  debounceDelay = 300,
  disabled = false,
  containerClassName = "",
  triggerClassName = "",
  textClassName = "",
}: Props<T>) {
  const triggerRef = useRef<View>(null);
  const searchInputRef = useRef<TextInput>(null);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const flatListRef = useRef<FlatList<Option>>(null);
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
    field: { value: rawValue, onChange },
    fieldState,
  } = useController<T>({ name, control });
  const value: Option[] = rawValue ?? [];

  /* Latest-value ref so `toggle` can stay referentially stable (for
     MultiSelectRow's memo to work) while always acting on the current
     selection, never a stale one. */
  const valueRef = useRef(value);
  valueRef.current = value;

  const debouncedSearch = useDebounce(search, debounceDelay);

  /* ================= FILTER ================= */
  const filteredOptions = useMemo(() => {
    if (!debouncedSearch) return options;
    const query = normalizeForSearch(debouncedSearch);
    return options.filter((o) => normalizeForSearch(o.label).includes(query));
  }, [debouncedSearch, options]);

  // Reset active index when filtered list changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [filteredOptions]);

  /* ================= OPEN ================= */
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
    searchInputRef.current?.blur();
    Keyboard.dismiss();
    setOpen(false);
    setSearch("");
    setActiveIndex(-1);
  }, []);

  /* ================= TOGGLE ================= */
  const toggle = useCallback(
    (option: Option) => {
      const current = valueRef.current;
      const exists = current.some((v) => v.value === option.value);
      onChange(
        exists
          ? current.filter((v) => v.value !== option.value)
          : [...current, option],
      );
    },
    [onChange],
  );

  const removeItem = useCallback(
    (item: Option) => {
      onChange(valueRef.current.filter((v) => v.value !== item.value));
    },
    [onChange],
  );

  const clearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  /* ================= SELECT ALL ================= */
  const allFilteredSelected =
    filteredOptions.length > 0 &&
    filteredOptions.every((opt) => value.some((v) => v.value === opt.value));

  const toggleSelectAll = useCallback(() => {
    const current = valueRef.current;
    const allSelected =
      filteredOptions.length > 0 &&
      filteredOptions.every((opt) =>
        current.some((v) => v.value === opt.value),
      );
    if (allSelected) {
      onChange(
        current.filter(
          (v) => !filteredOptions.some((o) => o.value === v.value),
        ),
      );
    } else {
      const toAdd = filteredOptions.filter(
        (opt) => !current.some((v) => v.value === opt.value),
      );
      onChange([...current, ...toAdd]);
    }
  }, [filteredOptions, onChange]);

  const handleKeyDown = useCallback(
    (e: any) => {
      const key = e.nativeEvent?.key;
      if (key === "ArrowDown") {
        e.preventDefault?.();
        setActiveIndex((prev) => {
          const next = Math.min(prev + 1, filteredOptions.length - 1);
          flatListRef.current?.scrollToIndex({
            index: next,
            animated: true,
            viewPosition: 0.5,
          });
          return next;
        });
      } else if (key === "ArrowUp") {
        e.preventDefault?.();
        setActiveIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          flatListRef.current?.scrollToIndex({
            index: next,
            animated: true,
            viewPosition: 0.5,
          });
          return next;
        });
      } else if (key === "Enter") {
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          toggle(filteredOptions[activeIndex]);
        }
      } else if (key === "Escape") {
        closeDropdown();
      }
    },
    [filteredOptions, activeIndex, toggle, closeDropdown],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Option; index: number }) => (
      <MultiSelectRow
        item={item}
        checked={value.some((v) => v.value === item.value)}
        highlighted={index === activeIndex}
        onToggle={toggle}
        textClassName={textClassName}
      />
    ),
    [value, activeIndex, toggle, textClassName],
  );

  /* ================= POSITION ================= */
  const dropdownTop =
    layout.y + layout.height + DROPDOWN_HEIGHT > SCREEN_HEIGHT
      ? Math.max(8, layout.y - DROPDOWN_HEIGHT)
      : layout.y + layout.height + 4;

  return (
    <FormField
      label={label}
      error={fieldState.error?.message as string | undefined}
      className={containerClassName}
    >
      {/* TRIGGER */}
      <Pressable
        ref={triggerRef}
        onPress={openDropdown}
        disabled={disabled}
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
        className={`min-h-[46px] rounded-xl border-[1.5px] px-4 py-2 flex-row flex-wrap gap-1.5 items-center
          ${
            disabled
              ? "bg-slate-50 border-slate-200 opacity-60"
              : open
                ? "border-primary bg-white"
                : fieldState.error
                  ? "border-red-500 bg-white"
                  : "border-[#CBD5E1] bg-white hover:border-slate-400"
          } ${triggerClassName}`}
      >
        {value.length === 0 && (
          <Text
            className={`flex-1 text-[15px] ${
              disabled ? "text-slate-300" : "text-slate-400"
            } ${textClassName}`}
          >
            {placeholder}
          </Text>
        )}

        {value.map((item: Option) => (
          <View
            key={item.value}
            className="flex-row items-center pl-3 pr-1.5 py-1 rounded-md overflow-hidden"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <GradientFill
              colors={[colors.primary[700], colors.primary[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              radius={6}
            />
            <Text
              className={`text-[13px] font-medium mr-2 ${textClassName}`}
              style={{ color: colors.primaryText }}
              numberOfLines={1}
            >
              {item.label}
            </Text>
            <Pressable
              onPress={() => removeItem(item)}
              hitSlop={6}
              className="h-5 w-5 items-center justify-center"
            >
              <Ionicons
                name="close-circle"
                size={16}
                color={colors.primary[200]}
              />
            </Pressable>
          </View>
        ))}

        <View className="ml-auto flex-row items-center gap-1.5">
          {value.length > 0 && (
            <>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  clearAll();
                }}
                hitSlop={8}
                className="h-7 w-7 items-center justify-center rounded-full"
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>
              <View className="h-5 w-px bg-slate-200" />
            </>
          )}
          <View
            className={`h-7 w-7 items-center justify-center rounded-lg ${open ? "bg-primary" : "bg-slate-100"}`}
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
        </View>
      </Pressable>

      {/* DROPDOWN */}
      <Modal transparent visible={open} animationType="none">
        <View style={{ flex: 1 }}>
          {/* OVERLAY */}
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

          {/* PANEL */}
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
            {/* SEARCH + SELECT ALL */}
            <View className="px-3 pt-4 pb-4 flex-row items-center gap-2 overflow-hidden">
              <GradientFill
                colors={[colors.primary[700], colors.primary[900]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Pressable
                onPress={toggleSelectAll}
                disabled={filteredOptions.length === 0}
                hitSlop={8}
                className="h-[42px] w-[32px] items-center justify-center"
              >
                <CheckBox
                  value={allFilteredSelected}
                  onValueChange={toggleSelectAll}
                  disabled={filteredOptions.length === 0}
                  color={
                    allFilteredSelected ? colors.primary.DEFAULT : undefined
                  }
                />
              </Pressable>
              <Pressable
                onPress={() => searchInputRef.current?.focus()}
                className={`flex-1 flex-row items-center border-[1.5px] rounded-xl px-4 h-[44px] overflow-hidden ${
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
                  placeholder="Search"
                  placeholderTextColor={colors.surface[200]}
                  selectionColor={colors.surface[200]}
                  autoFocus={Platform.OS === "web"}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  onKeyPress={handleKeyDown}
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
              <Pressable
                onPress={closeDropdown}
                onPressIn={Platform.OS !== "web" ? closeDropdown : undefined}
                hitSlop={8}
                className="h-[42px] w-[32px] items-center justify-center"
              >
                <Ionicons name="close" size={18} color={colors.surface[200]} />
              </Pressable>
            </View>

            {/* LIST */}
            <View style={{ flex: 1 }}>
              <FlatList
                ref={flatListRef}
                data={filteredOptions}
                keyExtractor={keyExtractor}
                keyboardShouldPersistTaps="handled"
                renderItem={renderItem}
                ListEmptyComponent={EmptyResults}
                onScrollToIndexFailed={() => {}}
                {...LIST_PERF_PROPS}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </FormField>
  );
}
