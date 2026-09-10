import GradientFill from "@/components/ui/GradientFill";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ReusablePagination from "../ReusablePagination";
import { showMessage } from "../CustomToast/message";

export interface TableColumn<T> {
  id: string;
  name: string;
  field?: keyof T | string;
  width?: number;
  minWidth?: number;
  flex?: number;
  render?: (item: T, index: number) => React.ReactNode;
  headerRender?: () => React.ReactNode;
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "center" | "bottom";
  sortable?: boolean;

  // Per-column style overrides (Tailwind classes preferred)
  // Applied on top of the default styles, so user classes win.
  cellClassName?: string; // wrapper around each cell
  textClassName?: string; // default <Text> inside a cell (used when no `render`)
  headerCellClassName?: string; // header cell wrapper
  headerTextClassName?: string; // header <Text>
}

interface ReusableTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyComponent?: React.ReactNode;

  // Header/Footer Slots
  tableTitle?: string;
  tableHeaderComponent?: React.ReactNode;
  tableFooterComponent?: React.ReactNode;

  // Pagination Props
  pagination?: {
    currentPage: number;
    pageSize: number;
    totalRecords?: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    rowsPerPageOptions?: number[];
  };

  // Interaction
  onRowPress?: (item: T, index: number) => void;

  // Styling Toggles
  showZebra?: boolean;
  showGridLines?: boolean;

  // Styling
  containerStyle?: object;
  headerStyle?: object;
  rowStyle?: object;
  headerTextStyle?: object;
  rowTextStyle?: object;
  headerTextColor?: string;
  rowTextColor?: string;
  extraData?: any; // To trigger re-renders

  // Customization Props
  allowColumnCustomization?: boolean;
  tableId?: string;

  /**
   * When true the table sizes to its content instead of stretching with
   * `flex: 1`. Use this when embedding the table inside a scrollable container
   * (e.g. a modal body) so it can grow and let the parent handle scrolling.
   * Without this, `flex: 1` collapses to zero height inside a ScrollView.
   */
  embedded?: boolean;

  /**
   * Fixes the height of the scrollable row area (in px). The header stays
   * pinned and only the rows scroll vertically within this height. Pair with
   * `embedded` when placing the table inside a modal so the horizontal
   * scrollbar stays reachable instead of being pushed below all the rows.
   */
  bodyHeight?: number;

  // Grouping / Row-merging
  groupBy?: (item: T, index: number) => string | number;
  mergedColumns?: string[]; // column ids that should rowspan within the group
  groupHeaderRender?: (
    groupKey: string | number,
    items: T[],
  ) => React.ReactNode;

  /**
   * Column-aligned totals/summary row (e.g. "Dr 1,000" under a Debit column,
   * "Cr 900" under a Credit column). Rendered inside the same horizontally
   * scrolling container as the header/body, using each column's actual
   * width/flex, so cells line up exactly with their column — unlike
   * `tableFooterComponent`, which renders below the scroll area and isn't
   * aligned to column widths.
   */
  summaryRow?: Partial<Record<string, React.ReactNode>>;
  summaryRowStyle?: object;

  /**
   * Shows the horizontal scrollbar track/thumb even when the columns fit
   * within the visible width (RN Web always renders it once `horizontal` is
   * set on a ScrollView, regardless of overflow). Set to false for narrow
   * tables where the scrollbar is just visual noise.
   */
  showHorizontalScrollIndicator?: boolean;

  /**
   * Fluid mode: the table always fills 100% of its container and never
   * scrolls horizontally. Each column's `width`/`minWidth` becomes a *weight*
   * (proportional share of the available width) instead of a hard pixel size,
   * and cell content wraps within its column. Use this for tables that must
   * fit any screen no matter how many/wide the columns or how long the data.
   */
  fitToWidth?: boolean;
}

const ReusableTable = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = "No data found",
  emptyComponent,
  tableTitle,
  tableHeaderComponent,
  tableFooterComponent,
  pagination,
  onRowPress,
  showZebra = true,
  showGridLines = true,
  containerStyle,
  headerStyle,
  rowStyle,
  headerTextStyle,
  rowTextStyle,
  headerTextColor = colors.surface[0],
  rowTextColor,
  extraData,
  allowColumnCustomization = false,
  tableId,
  groupBy,
  mergedColumns,
  groupHeaderRender,
  embedded = false,
  bodyHeight,
  summaryRow,
  summaryRowStyle,
  showHorizontalScrollIndicator = true,
  fitToWidth = false,
}: ReusableTableProps<T>) => {
  const isWeb = Platform.OS === "web";

  /**
   * Per-column sizing.
   * Normal mode → hard pixel `width`/`minWidth`/`flex`.
   * Fluid mode → each column starts at a sensible floor (its `minWidth`, or a
   * capped share of its `width`) and the *leftover* space is shared out by
   * weight so the row fills 100%. If the floors don't fit, the row grows past
   * the container and the horizontal scroll takes over — content never
   * collapses/overlaps.
   */
  const colSizeStyle = (column: TableColumn<T>) => {
    if (!fitToWidth) {
      return {
        width: column.width,
        minWidth: column.minWidth,
        flex: column.flex,
      };
    }
    const floor = column.minWidth ?? Math.min(column.width ?? 120, 160);
    return {
      flexGrow: column.flex ?? column.width ?? column.minWidth ?? 1,
      flexShrink: 0,
      flexBasis: floor,
      minWidth: floor,
      // A cell can never spill past its column — an unbreakable token gets
      // clipped, it never overlaps the neighbouring column.
      overflow: "hidden" as const,
      // Break long unbroken strings on web instead of letting them push out.
      ...(isWeb ? ({ wordBreak: "break-word" } as any) : null),
    };
  };

  // --- Column Preferences Persistence State ---
  const storageKey = tableId ? `table_cols_pref_${tableId}` : null;
  const [preferences, setPreferences] = useState<
    Record<string, { visible: boolean; index: number }>
  >({});
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  // --- ScrollView Ref & Position tracking for swipe reordering ---
  const scrollRef = useRef<ScrollView>(null);
  const scrollXRef = useRef(0);

  const handleScroll = (event: any) => {
    scrollXRef.current = event.nativeEvent.contentOffset.x;
  };

  // Load preferences from local storage or SecureStore on mount or tableId change
  useEffect(() => {
    if (!storageKey) return;
    const loadPreferences = async () => {
      try {
        let saved: string | null = null;
        if (Platform.OS === "web") {
          saved = localStorage.getItem(storageKey);
        } else {
          const isAvailable = await SecureStore.isAvailableAsync();
          if (isAvailable) {
            saved = await SecureStore.getItemAsync(storageKey);
          }
        }
        if (saved) {
          setPreferences(JSON.parse(saved));
        }
      } catch (e) {}
    };
    loadPreferences();
  }, [storageKey]);

  // Save preferences
  const savePreferences = async (
    newPrefs: Record<string, { visible: boolean; index: number }>,
  ) => {
    setPreferences(newPrefs);
    if (!storageKey) return;
    try {
      const value = JSON.stringify(newPrefs);
      if (Platform.OS === "web") {
        localStorage.setItem(storageKey, value);
      } else {
        const isAvailable = await SecureStore.isAvailableAsync();
        if (isAvailable) {
          await SecureStore.setItemAsync(storageKey, value);
        }
      }
    } catch (e) {
      showMessage("error", "Error", "Failed to save table column preferences");
    }
  };

  // Merge columns prop with active preferences
  const activeColumns = useMemo(() => {
    if (!allowColumnCustomization) return columns;

    const mergedCols: Array<{
      col: TableColumn<T>;
      visible: boolean;
      index: number;
    }> = [];

    columns.forEach((col, defaultIndex) => {
      const pref = preferences[col.id];
      if (pref) {
        mergedCols.push({
          col,
          visible: pref.visible,
          index: pref.index,
        });
      } else {
        // No preference yet: use default values
        mergedCols.push({
          col,
          visible: true,
          index: defaultIndex,
        });
      }
    });

    // Sort by index preference
    mergedCols.sort((a, b) => a.index - b.index);

    // Return only visible ones
    return mergedCols.filter((item) => item.visible).map((item) => item.col);
  }, [columns, preferences, allowColumnCustomization]);

  // Modal helper list (includes all column mappings in order of customized index)
  const allColumnsWithPreferences = useMemo(() => {
    const merged = columns.map((col, defaultIndex) => {
      const pref = preferences[col.id];
      return {
        id: col.id,
        name: col.name || col.id,
        visible: pref ? pref.visible : true,
        index: pref ? pref.index : defaultIndex,
        rawCol: col,
      };
    });
    return merged.sort((a, b) => a.index - b.index);
  }, [columns, preferences]);

  // Change visibility
  const toggleColumnVisibility = (id: string) => {
    const defaultIdx = columns.findIndex((c) => c.id === id);
    const pref = preferences[id] || { visible: true, index: defaultIdx };
    const newPrefs = {
      ...preferences,
      [id]: {
        ...pref,
        visible: !pref.visible,
      },
    };
    savePreferences(newPrefs);
  };

  // Reorder items
  const moveColumn = (index: number, direction: "up" | "down") => {
    const newItems = [...allColumnsWithPreferences];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    // Swap
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Re-assign indices sequentially to maintain neat sorting order
    const newPrefs = { ...preferences };
    newItems.forEach((item, idx) => {
      newPrefs[item.id] = {
        visible: item.visible,
        index: idx,
      };
    });

    savePreferences(newPrefs);
  };

  // Reset preferences
  const resetToDefault = () => {
    setPreferences({});
    if (storageKey) {
      try {
        if (Platform.OS === "web") {
          localStorage.removeItem(storageKey);
        } else {
          SecureStore.deleteItemAsync(storageKey);
        }
      } catch (e) {
        showMessage(
          "error",
          "Error",
          "Failed to delete table column preferences",
        );
      }
    }
  };

  // --- Cross-Platform Header Touch & Mouse Gesture Drag System ---
  const dragIndexRef = useRef<number | null>(null);
  const startXRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null);
  const [hoverDropIndex, setHoverDropIndex] = useState<number | null>(null);

  const getPageX = (e: any) => {
    if (e.nativeEvent) {
      if (e.nativeEvent.touches && e.nativeEvent.touches.length > 0) {
        return e.nativeEvent.touches[0].pageX;
      }
      if (e.nativeEvent.pageX !== undefined) {
        return e.nativeEvent.pageX;
      }
    }
    if (e.touches && e.touches.length > 0) {
      return e.touches[0].pageX;
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      return e.changedTouches[0].pageX;
    }
    return e.pageX || e.clientX || 0;
  };

  const getClientX = (e: any) => {
    if (e.nativeEvent) {
      if (e.nativeEvent.touches && e.nativeEvent.touches.length > 0) {
        return e.nativeEvent.touches[0].clientX;
      }
      if (e.nativeEvent.locationX !== undefined) {
        return e.nativeEvent.pageX;
      }
    }
    if (e.touches && e.touches.length > 0) {
      return e.touches[0].clientX;
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      return e.changedTouches[0].clientX;
    }
    return e.clientX || 0;
  };

  const handleDragStart = (e: any, index: number) => {
    const pageX = getPageX(e);
    dragIndexRef.current = index;
    startXRef.current = pageX;
    isDraggingRef.current = true;
    setActiveDragIndex(index);
    setHoverDropIndex(index);

    if (Platform.OS === "web") {
      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("mouseup", handleGlobalMouseUp);
    }
  };

  const handleGlobalMouseMove = (e: MouseEvent) => {
    handleDragMove(e);
  };

  const handleGlobalMouseUp = () => {
    handleDragEnd();
  };

  const getHoverIndex = (diffX: number) => {
    if (activeDragIndex === null) return null;

    // Calculate col left boundaries
    const colLefts: number[] = [];
    let currentLeft = 0;
    activeColumns.forEach((col) => {
      colLefts.push(currentLeft);
      const w = col.width || col.minWidth || 120;
      currentLeft += w;
    });

    const dragContentX = colLefts[activeDragIndex] + diffX;

    // Find which column index the dragContentX belongs to
    let foundIdx = activeDragIndex;
    for (let i = 0; i < activeColumns.length; i++) {
      const start = colLefts[i];
      const width = activeColumns[i].width || activeColumns[i].minWidth || 120;
      const end = start + width;

      if (dragContentX >= start && dragContentX <= end) {
        foundIdx = i;
        break;
      }
    }

    return Math.max(0, Math.min(foundIdx, activeColumns.length - 1));
  };

  const handleDragMove = (e: any) => {
    if (
      !isDraggingRef.current ||
      dragIndexRef.current === null ||
      activeDragIndex === null
    )
      return;

    const currentX = getPageX(e);
    const diffX = currentX - startXRef.current;

    // Auto-scroll horizontally when pointer is near left/right screen edges
    const screenWidth = Dimensions.get("window").width;
    const clientX = getClientX(e);

    if (clientX) {
      if (clientX < 120) {
        // Scroll left
        scrollRef.current?.scrollTo({
          x: Math.max(0, scrollXRef.current - 20),
          animated: true,
        });
      } else if (clientX > screenWidth - 120) {
        // Scroll right
        scrollRef.current?.scrollTo({
          x: scrollXRef.current + 20,
          animated: true,
        });
      }
    }

    const hoverIdx = getHoverIndex(diffX);
    if (hoverIdx !== null) {
      setHoverDropIndex(hoverIdx);
    }
  };

  // ===========================================================================================================

  const ProfessionalLoader = ({
    message = "Automate IT Limited",
    subMessage = "Made Education System Easy",
  }) => {
    const rotation = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.8)).current;
    const [dotIndex, setDotIndex] = useState(0);
    const dots = ["", ".", "..", "..."];

    useEffect(() => {
      // Rotation animation
      Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();

      // Scale animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.2,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.8,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();

      // Dots animation
      const interval = setInterval(() => {
        setDotIndex((prev) => (prev + 1) % dots.length);
      }, 500);
      return () => clearInterval(interval);
    }, []);

    const rotateInterpolate = rotation.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"],
    });

    return (
      <View
        className="py-20 items-center justify-center bg-surface-card rounded-2xl"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        <View className="relative">
          {/* Background pulse ring */}
          <Animated.View
            className="w-20 h-20 rounded-full border-4"
            style={{
              transform: [{ scale }],
              borderColor: colors.primary.DEFAULT,
              opacity: 0.15,
            }}
          />

          {/* Spinning gradient circle */}
          <Animated.View
            className="absolute w-20 h-20 rounded-full"
            style={{
              transform: [{ rotate: rotateInterpolate }],
              borderWidth: 4,
              borderTopColor: colors.primary.DEFAULT,
              borderRightColor: colors.primary[300],
              borderBottomColor: colors.primary[200],
              borderLeftColor: "transparent",
              borderRadius: 40,
            }}
          />

          {/* Center Loading Icon - পরিবর্তন করা হয়েছে */}
          <View className="absolute inset-0 items-center justify-center">
            <View className="w-10 h-10 rounded-full bg-primary-50 items-center justify-center">
              <Animated.View
                style={{
                  transform: [{ rotate: rotateInterpolate }],
                }}
              >
                <Ionicons
                  name="reload-outline"
                  size={24}
                  color={colors.primary.DEFAULT}
                />
              </Animated.View>
            </View>
          </View>

          {/* Floating dots around the spinner */}
          {[...Array(6)].map((_, i) => (
            <Animated.View
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary-300"
              style={{
                top: "50%",
                left: "50%",
                opacity: 0.4,
                transform: [
                  { translateX: -4 },
                  { translateY: -4 },
                  {
                    rotate: `${i * 60}deg`,
                  },
                  {
                    translateX: 32,
                  },
                ],
              }}
            />
          ))}
        </View>

        <Text className="text-surface-700 font-semibold text-base mt-6">
          {message}
          {dots[dotIndex]}
        </Text>
        <Text className="text-surface-400 text-sm mt-1.5">{subMessage}</Text>

        {/* Progress bar */}
        <View className="mt-4 w-48 h-1 bg-surface-200 rounded-full overflow-hidden">
          <Animated.View
            className="h-full w-full bg-primary-500 rounded-full origin-left"
            style={{
              transform: [
                {
                  scaleX: rotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                },
              ],
            }}
          />
        </View>
      </View>
    );
  };
  // =========================================================================================================================================
  const commitColumnMove = (fromIdx: number, toIdx: number) => {
    const colA = activeColumns[fromIdx];
    const colB = activeColumns[toIdx];
    if (!colA || !colB) return;

    const newItems = [...allColumnsWithPreferences];
    const originalIdxA = newItems.findIndex((item) => item.id === colA.id);
    const originalIdxB = newItems.findIndex((item) => item.id === colB.id);

    if (originalIdxA !== -1 && originalIdxB !== -1) {
      // Shift elements in the primary sorted list
      const [movedItem] = newItems.splice(originalIdxA, 1);
      newItems.splice(originalIdxB, 0, movedItem);

      // Re-assign indices sequentially
      const newPrefs = { ...preferences };
      newItems.forEach((item, idx) => {
        newPrefs[item.id] = {
          visible: item.visible,
          index: idx,
        };
      });

      savePreferences(newPrefs);
    }
  };

  const handleDragEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    // Commit swap if dropped over a new column
    if (
      activeDragIndex !== null &&
      hoverDropIndex !== null &&
      activeDragIndex !== hoverDropIndex
    ) {
      commitColumnMove(activeDragIndex, hoverDropIndex);
    }

    dragIndexRef.current = null;
    setActiveDragIndex(null);
    setHoverDropIndex(null);

    if (Platform.OS === "web") {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    }
  };

  const renderHeader = () => (
    <View
      className={`flex-row ${fitToWidth ? "items-stretch" : "items-center"} overflow-hidden`}
      style={[
        {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 2,
          elevation: 2,
        },
        headerStyle,
      ]}
    >
      <GradientFill
        colors={[colors.primary[700], colors.primary[900]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {activeColumns.map((column, colIdx) => {
        const isActiveDrag = activeDragIndex === colIdx;

        return (
          <View
            key={column.id}
            className={`${showGridLines ? "border-r border-white/10" : ""} ${
              isActiveDrag
                ? "bg-emerald-700/40 border border-dashed border-emerald-300 opacity-70"
                : hoverDropIndex === colIdx
                  ? "bg-primary/30 border border-dashed border-primary-300"
                  : ""
            } ${column.headerCellClassName ?? ""}`}
            style={[
              {
                ...colSizeStyle(column),
                paddingHorizontal: 16,
                paddingVertical: 10,
              },
              allowColumnCustomization && isWeb
                ? ({
                    cursor: "grab" as any,
                    userSelect: "none" as any,
                  } as any)
                : {},
            ]}
            {...(allowColumnCustomization
              ? {
                  onStartShouldSetResponder: () => true,
                  onMoveShouldSetResponder: () => true,
                  onResponderGrant: (e: any) => handleDragStart(e, colIdx),
                  onResponderMove: (e: any) => handleDragMove(e),
                  onResponderRelease: handleDragEnd,
                  onResponderTerminate: handleDragEnd,
                  onResponderTerminationRequest: () => false,
                  ...(isWeb
                    ? {
                        onMouseDown: (e: any) => handleDragStart(e, colIdx),
                      }
                    : {}),
                }
              : {})}
          >
            {column.headerRender ? (
              column.headerRender()
            ) : (
              <View className="flex-row items-center w-full">
                <Text
                  className={`text-[11px] font-bold uppercase ${column.headerTextClassName ?? ""}`}
                  style={[
                    {
                      color: headerTextColor,
                      textAlign: column.textAlign || "left",
                      flex: 1,
                      letterSpacing: 0.5,
                    },
                    headerTextStyle,
                  ]}
                  numberOfLines={2}
                >
                  {column.name}
                </Text>
                {column.sortable && (
                  <View className="ml-1.5 w-5 h-5 rounded-full bg-white/10 items-center justify-center">
                    <Ionicons
                      name="swap-vertical"
                      size={12}
                      color="rgba(255,255,255,0.85)"
                    />
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );

  const renderRow = ({ item, index }: { item: T; index: number }) => {
    const RowWrapper = onRowPress ? TouchableOpacity : View;

    // Correct index for SL if pagination is active
    const globalIndex = pagination
      ? (pagination.currentPage - 1) * pagination.pageSize + index
      : index;

    return (
      <RowWrapper
        onPress={() => onRowPress?.(item, index)}
        activeOpacity={0.6}
        delayPressIn={Platform.OS === "web" ? 100 : 0}
        className={`flex-row ${fitToWidth ? "items-stretch" : "items-center"} border-b border-slate-100 hover:bg-primary-50/60 ${
          showZebra && index % 2 !== 0 ? "bg-primary-50/40" : "bg-surface-card"
        }`}
        style={[rowStyle]}
      >
        {activeColumns.map((column) => (
          <View
            key={`${column.id}-${index}`}
            className={`${showGridLines ? "border-r border-surface-100 last:border-r-0" : ""} ${column.cellClassName ?? ""}`}
            style={{
              ...colSizeStyle(column),
              paddingHorizontal: 16,
              paddingVertical: 13,
              alignItems:
                column.textAlign === "center"
                  ? "center"
                  : column.textAlign === "right"
                    ? "flex-end"
                    : "flex-start",
              justifyContent: vAlignToJustify(column.verticalAlign || "center"),
            }}
          >
            {column.render ? (
              column.render(item, globalIndex)
            ) : (
              <Text
                className={`text-[13.5px] ${column.textClassName ?? ""}`}
                style={[
                  {
                    color: rowTextColor || "black",
                    textAlign: column.textAlign || "left",
                  },
                  rowTextStyle,
                ]}
              >
                {column.field
                  ? item[column.field as string]?.toString() || ""
                  : ""}
              </Text>
            )}
          </View>
        ))}
      </RowWrapper>
    );
  };

  // Convert verticalAlign to flex justifyContent
  const vAlignToJustify = (v?: "top" | "center" | "bottom") =>
    v === "center" ? "center" : v === "bottom" ? "flex-end" : "flex-start";

  const renderCellContent = (
    column: TableColumn<T>,
    item: T,
    globalIndex: number,
  ) => {
    if (column.render) return column.render(item, globalIndex);
    return (
      <Text
        className={`text-[13.5px] ${column.textClassName ?? ""}`}
        style={[
          {
            color: rowTextColor || "black",
            textAlign: column.textAlign || "left",
          },
          rowTextStyle,
        ]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {column.field
          ? (item as any)[column.field as string]?.toString() || ""
          : ""}
      </Text>
    );
  };

  const renderGroup = (group: {
    key: string | number;
    items: T[];
    startIndex: number;
  }) => {
    const RowWrapper = onRowPress ? TouchableOpacity : View;

    return (
      <View key={`grp-${group.key}-${group.startIndex}`}>
        {groupHeaderRender && (
          <View className="border-b border-surface-100 bg-surface-100 px-4 py-2">
            {groupHeaderRender(group.key, group.items)}
          </View>
        )}
        <View
          className="flex-row items-stretch border-b border-surface-200 bg-surface-card"
          style={[rowStyle]}
        >
          {activeColumns.map((column) => {
            const isMerged =
              !!mergedColumns && mergedColumns.includes(column.id);
            const justifyContent = vAlignToJustify(
              column.verticalAlign ?? (isMerged ? "center" : "top"),
            );
            const alignItems =
              column.textAlign === "center"
                ? "center"
                : column.textAlign === "right"
                  ? "flex-end"
                  : "flex-start";

            if (isMerged) {
              return (
                <View
                  key={`${column.id}-grp`}
                  className={`${showGridLines ? "border-r border-surface-100 last:border-r-0" : ""} ${column.cellClassName ?? ""}`}
                  style={{
                    ...colSizeStyle(column),
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    justifyContent,
                    alignItems,
                  }}
                >
                  {renderCellContent(column, group.items[0], group.startIndex)}
                </View>
              );
            }

            return (
              <View
                key={`${column.id}-grp-stack`}
                className={`${showGridLines ? "border-r border-surface-100 last:border-r-0" : ""}`}
                style={colSizeStyle(column)}
              >
                {group.items.map((item, subIdx) => {
                  const globalIndex = group.startIndex + subIdx;
                  const isLast = subIdx === group.items.length - 1;
                  const isZebra = showZebra && globalIndex % 2 !== 0;
                  return (
                    <RowWrapper
                      key={`${column.id}-${globalIndex}`}
                      onPress={() => onRowPress?.(item, globalIndex)}
                      activeOpacity={0.6}
                      delayPressIn={Platform.OS === "web" ? 100 : 0}
                      className={`${isZebra ? "bg-primary-50/50" : "bg-surface-card"} ${column.cellClassName ?? ""}`}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        height: 52,
                        borderBottomWidth: isLast ? 0 : 1,
                        borderBottomColor: colors.surface[100],
                        justifyContent,
                        alignItems,
                      }}
                    >
                      {renderCellContent(column, item, globalIndex)}
                    </RowWrapper>
                  );
                })}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderSummaryRow = () => {
    if (!summaryRow) return null;
    return (
      <View
        className="flex-row items-stretch"
        style={[{ backgroundColor: "#7c83eb" }, summaryRowStyle]}
      >
        {activeColumns.map((column) => (
          <View
            key={`summary-${column.id}`}
            style={{
              ...colSizeStyle(column),
              paddingHorizontal: 16,
              paddingVertical: 12,
              alignItems:
                column.textAlign === "center"
                  ? "center"
                  : column.textAlign === "right"
                    ? "flex-end"
                    : "flex-start",
              justifyContent: "center",
            }}
          >
            {typeof summaryRow[column.id] === "string" ||
            typeof summaryRow[column.id] === "number" ? (
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: "#fff",
                  textAlign: column.textAlign || "left",
                }}
              >
                {summaryRow[column.id]}
              </Text>
            ) : (
              summaryRow[column.id]
            )}
          </View>
        ))}
      </View>
    );
  };

  const { paginatedData, paginationInfo } = useMemo(() => {
    if (!pagination) return { paginatedData: data, paginationInfo: null };

    const { currentPage, pageSize, totalRecords: manualTotal } = pagination;
    const totalRecords = manualTotal ?? data.length;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const from = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const to = Math.min(currentPage * pageSize, totalRecords);

    // If data array is larger than pageSize, we assume it's the full set and we slice it locally
    const slicedData =
      data.length > pageSize
        ? data.slice((currentPage - 1) * pageSize, currentPage * pageSize)
        : data;

    return {
      paginatedData: slicedData,
      paginationInfo: {
        currentPage,
        pageSize,
        totalRecords,
        totalPages,
        from,
        to,
      },
    };
  }, [data, pagination]);

  const content = useMemo(() => {
    if (loading) {
      return <ProfessionalLoader />;
    }

    if (paginatedData.length === 0) {
      if (emptyComponent) return emptyComponent;
      return (
        <View
          className="py-16 items-center justify-center bg-surface-card border border-slate-200"
          style={{
            borderRadius: 16,
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.1,
            shadowRadius: 24,
            elevation: 4,
          }}
        >
          <View className="h-14 w-14 rounded-full bg-slate-100 items-center justify-center mb-3">
            <Ionicons
              name="documents-outline"
              size={24}
              color={colors.surface[400]}
            />
          </View>
          <Text className="text-slate-500 text-sm font-medium">
            {emptyMessage}
          </Text>
          <Text className="text-slate-400 text-xs mt-0.5">
            There&apos;s nothing here yet.
          </Text>
        </View>
      );
    }

    return (
      <View
        className="bg-surface-card border border-slate-200 overflow-hidden"
        style={[
          {
            borderRadius: 16,
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.1,
            shadowRadius: 24,
            elevation: 4,
          },
          containerStyle,
        ]}
      >
        {/* Table Title and Header Slot */}
        {(tableTitle || tableHeaderComponent) && (
          <View className="px-5 py-4 border-b border-surface-100 bg-surface-card">
            {tableTitle && (
              <View className="flex-row items-center mb-1">
                <View className="w-1.5 h-5 bg-primary rounded-full mr-2.5" />
                <Text className="text-lg font-bold text-surface-800">
                  {tableTitle}
                </Text>
              </View>
            )}
            {tableHeaderComponent}
          </View>
        )}

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={showHorizontalScrollIndicator}
          contentContainerStyle={{ flexGrow: 1 }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          scrollEnabled={activeDragIndex === null}
          directionalLockEnabled={true}
          alwaysBounceHorizontal={true}
          {...(isWeb
            ? {
                style: {
                  overflowX: "auto",
                  WebkitOverflowScrolling: "touch",
                } as any,
              }
            : {})}
        >
          <View
            style={
              fitToWidth
                ? ({
                    minWidth: "100%",
                    flexGrow: 1,
                    flexDirection: "column",
                  } as any)
                : isWeb
                  ? ({ minWidth: "max-content", flex: 1 } as any)
                  : { minWidth: "100%" }
            }
          >
            {renderHeader()}
            {(() => {
              const body = groupBy ? (
                (() => {
                  const groups: {
                    key: string | number;
                    items: T[];
                    startIndex: number;
                  }[] = [];
                  let currentKey: string | number | null = null;
                  let currentGroup: {
                    key: string | number;
                    items: T[];
                    startIndex: number;
                  } | null = null;
                  paginatedData.forEach((item, idx) => {
                    const k = groupBy(item, idx);
                    if (k !== currentKey || !currentGroup) {
                      currentGroup = { key: k, items: [item], startIndex: idx };
                      groups.push(currentGroup);
                      currentKey = k;
                    } else {
                      currentGroup.items.push(item);
                    }
                  });
                  return groups.map((g) => renderGroup(g));
                })()
              ) : Platform.OS === "web" ? (
                <View>
                  {paginatedData.map((item, index) => (
                    <View key={`row-${index}`}>
                      {renderRow({ item, index })}
                    </View>
                  ))}
                </View>
              ) : (
                <FlatList
                  data={paginatedData}
                  renderItem={renderRow}
                  keyExtractor={(_, index) => index.toString()}
                  scrollEnabled={false}
                  extraData={extraData}
                />
              );

              // When a fixed body height is requested, scroll only the rows so
              // the header stays pinned and the horizontal scrollbar remains in
              // view (instead of being pushed below all the rows).
              return bodyHeight ? (
                <ScrollView
                  style={{ height: bodyHeight }}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                >
                  {body}
                </ScrollView>
              ) : (
                body
              );
            })()}
            {renderSummaryRow()}
          </View>
        </ScrollView>

        {/* Table Footer Slot */}
        {tableFooterComponent && (
          <View className="px-5 py-4 border-t border-surface-100 bg-surface-card">
            {tableFooterComponent}
          </View>
        )}

        {pagination && paginationInfo && (
          <ReusablePagination
            currentPage={paginationInfo.currentPage}
            totalRecords={paginationInfo.totalRecords}
            pageSize={paginationInfo.pageSize}
            from={paginationInfo.from}
            to={paginationInfo.to}
            totalPages={paginationInfo.totalPages}
            onPageChange={pagination.onPageChange}
            onPageSizeChange={pagination.onPageSizeChange}
            rowsPerPageOptions={pagination.rowsPerPageOptions}
          />
        )}
      </View>
    );
  }, [
    paginatedData,
    paginationInfo,
    loading,
    activeColumns,
    extraData,
    showZebra,
    showGridLines,
    allowColumnCustomization,
    tableTitle,
    tableHeaderComponent,
    activeDragIndex,
    hoverDropIndex,
    groupBy,
    mergedColumns,
    groupHeaderRender,
    bodyHeight,
    summaryRow,
    summaryRowStyle,
    showHorizontalScrollIndicator,
  ]);

  return (
    <View
      style={[
        embedded
          ? { flexGrow: 0, flexShrink: 0, flexBasis: "auto" }
          : { flex: 1 },
        containerStyle,
      ]}
    >
      {content}
    </View>
  );
};

export default ReusableTable;
