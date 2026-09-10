import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import SelectDropdown from "../ui/SelectDropdown";

export interface PageSizeOption {
  label: string;
  value: string | number;
}

// Shared press-bounce wrapper — same spring feel as ReusableButton/ReusableTab,
// so pagination controls feel consistent with the rest of the design system.
interface BounceProps {
  onPress: () => void;
  disabled?: boolean;
  className: string;
  style?: object;
  children: React.ReactNode;
}

const Bounce: React.FC<BounceProps> = ({
  onPress,
  disabled,
  className,
  style,
  children,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 50,
      bounciness: 6,
    }).start();
  };
  const handlePressOut = () => {
    if (disabled) return;
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
        disabled={disabled}
        className={className}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

interface ReusablePaginationProps {
  currentPage: number;
  totalRecords: number;
  pageSize: number;
  from: number;
  to: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  rowsPerPageOptions?: number[];
}

const ReusablePagination: React.FC<ReusablePaginationProps> = ({
  currentPage,
  totalRecords,
  pageSize,
  from,
  to,
  totalPages,
  onPageChange,
  onPageSizeChange,
  rowsPerPageOptions = [15, 25, 50, 100],
}) => {
  const { width } = useWindowDimensions();
  // Use the compact (stacked) layout on any narrow viewport — small web
  // windows included — and the single-row layout only when there's room.
  const isCompact = width < 768;

  const pageSizeOptions: PageSizeOption[] = rowsPerPageOptions.map((val) => ({
    label: val.toString(),
    value: val.toString(),
  }));

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers: number[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
      return pageNumbers;
    }

    pageNumbers.push(1);
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) endPage = Math.min(5, totalPages - 1);
    if (currentPage >= totalPages - 2) startPage = Math.max(totalPages - 4, 2);

    for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);
    if (totalPages > 1) pageNumbers.push(totalPages);

    return Array.from(new Set(pageNumbers)).sort((a, b) => a - b);
  };

  const pageNumbers = getPageNumbers();

  const renderPaginationButtons = () => {
    const navBtn = (
      name: keyof typeof Ionicons.glyphMap,
      onPress: () => void,
      isDisabled: boolean,
    ) => (
      <Bounce
        onPress={onPress}
        disabled={isDisabled}
        className={`h-9 w-9 items-center justify-center rounded-xl border border-surface-200 bg-surface-card ${
          isDisabled ? "opacity-30" : "active:bg-surface-100"
        }`}
      >
        <Ionicons name={name} size={15} color={colors.primary.DEFAULT} />
      </Bounce>
    );

    return (
      <View className="flex-row items-center" style={{ gap: 6 }}>
        {navBtn("play-back", () => onPageChange(1), currentPage === 1)}
        {navBtn(
          "chevron-back",
          () => onPageChange(currentPage - 1),
          currentPage === 1,
        )}

        {pageNumbers.map((pageNum, index) => {
          const showLeftEllipsis = index === 1 && pageNum > 2;
          const showRightEllipsis =
            index === pageNumbers.length - 2 && pageNum < totalPages - 1;
          const active = currentPage === pageNum;

          return (
            <React.Fragment key={index}>
              {showLeftEllipsis && (
                <View className="w-6 h-9 items-center justify-center">
                  <Text className="text-surface-400">...</Text>
                </View>
              )}
              <Bounce
                onPress={() => onPageChange(pageNum)}
                className={`h-9 min-w-[36px] px-1.5 items-center justify-center rounded-xl border ${
                  active
                    ? "bg-primary border-primary"
                    : "bg-surface-card border-surface-200 active:bg-surface-100"
                }`}
                style={
                  active
                    ? {
                        shadowColor: colors.primary.DEFAULT,
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.3,
                        shadowRadius: 6,
                        elevation: 3,
                      }
                    : undefined
                }
              >
                <Text
                  className={`text-sm ${
                    active
                      ? "text-surface-0 font-bold"
                      : "text-surface-600 font-medium"
                  }`}
                >
                  {pageNum}
                </Text>
              </Bounce>
              {showRightEllipsis && (
                <View className="w-6 h-9 items-center justify-center">
                  <Text className="text-surface-400">...</Text>
                </View>
              )}
            </React.Fragment>
          );
        })}

        {navBtn(
          "chevron-forward",
          () => onPageChange(currentPage + 1),
          currentPage === totalPages,
        )}
        {navBtn(
          "play-forward",
          () => onPageChange(totalPages),
          currentPage === totalPages,
        )}
      </View>
    );
  };

  const pageSizeSelect = (width: number) => (
    <View style={{ width }}>
      <SelectDropdown
        label=""
        hideMargin
        maxHeight={260}
        options={pageSizeOptions.map((opt) => ({
          ...opt,
          value: opt.value.toString(),
        }))}
        value={pageSize.toString()}
        onChange={(val) => onPageSizeChange(parseInt(val))}
      />
    </View>
  );

  if (isCompact) {
    return (
      <View className="bg-surface-ground border-t border-surface-200 px-4 py-3">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Text className="text-xs font-semibold text-surface-500">Rows</Text>
            {pageSizeSelect(120)}
          </View>
          <Text className="text-xs font-semibold text-surface-500">
            {from}-{to} of {totalRecords}
          </Text>
        </View>
        <View className="flex-row items-center justify-center">
          {renderPaginationButtons()}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-row items-center justify-center p-2 bg-surface-ground border-t border-surface-200">
      <View className="flex-row items-center">
        <View className="mr-4">{pageSizeSelect(120)}</View>

        {renderPaginationButtons()}

        <Text className="text-sm text-surface-600 ml-6">
          Showing {from} to {to} of {totalRecords}
        </Text>
      </View>
    </View>
  );
};

export default ReusablePagination;
