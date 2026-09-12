import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import React, { JSX, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import ReusableButton from "@/components/shared/Button/ReusableButton";
import FormField from "@/components/ui/FormField";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CELL_SIZE = 36; // Fixed size for perfect 7-column grid
const DAYS_IN_ROW = 7;

/* ---- THEME (pulled from the active vendor's tokens) ---- */
const PRIMARY = colors.primary.DEFAULT;
const PRIMARY_SOFT = colors.primary[50];
const PRIMARY_TINT = colors.primary[200];
const BORDER = colors.surface[300];
const SLATE_BG = colors.surface[100];
const TEXT_COLOR = colors.text;
const MUTED = colors.surface[400];
const SLATE = colors.textSecondary;

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const CustomDatePicker: React.FC<{
  value: string | null;
  onChange: (date: string | null) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  containerStyle?: object;
  inputStyle?: object;
  modalContentStyle?: object;
}> = ({
  value,
  onChange,
  placeholder = "Select date",
  label,
  disabled = false,
  minDate,
  maxDate,
  containerStyle = {},
  inputStyle = {},
  modalContentStyle = {},
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(
    value ? new Date(value) : new Date(),
  );
  const [yearInput, setYearInput] = useState<string>(
    value
      ? new Date(value).getFullYear().toString()
      : new Date().getFullYear().toString(),
  );

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (modalVisible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 130,
          friction: 20,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [modalVisible, fadeAnim, scaleAnim]);

  const getDaysInMonth = (month: number, year: number) =>
    new Date(year, month + 1, 0).getDate();

  const updateDate = ({
    year,
    month,
    day,
  }: {
    year?: number;
    month?: number;
    day?: number;
  }) => {
    const newDate = new Date(tempDate);
    if (year !== undefined) newDate.setFullYear(year);
    if (month !== undefined) newDate.setMonth(month);
    if (day !== undefined) newDate.setDate(day);

    const daysInMonth = getDaysInMonth(
      newDate.getMonth(),
      newDate.getFullYear(),
    );
    if (newDate.getDate() > daysInMonth) newDate.setDate(daysInMonth);

    if (minDate && newDate < minDate) newDate.setTime(minDate.getTime());
    if (maxDate && newDate > maxDate) newDate.setTime(maxDate.getTime());

    setTempDate(newDate);
    setYearInput(newDate.getFullYear().toString());
  };

  const stepMonth = (delta: number) =>
    updateDate({ month: tempDate.getMonth() + delta });
  const stepYear = (delta: number) => {
    const next = tempDate.getFullYear() + delta;
    if (next >= 1971 && next <= 2099) updateDate({ year: next });
  };

  const handleOpen = () => {
    if (disabled) return;
    const initial = value ? new Date(value) : new Date();
    setTempDate(initial);
    setYearInput(initial.getFullYear().toString());
    setModalVisible(true);
  };

  const handleConfirm = () => {
    const year = tempDate.getFullYear();
    const month = String(tempDate.getMonth() + 1).padStart(2, "0");
    const day = String(tempDate.getDate()).padStart(2, "0");
    onChange(`${year}-${month}-${day}`);
    setModalVisible(false);
  };

  const handleResetToday = () => {
    const today = new Date();
    updateDate({
      year: today.getFullYear(),
      month: today.getMonth(),
      day: today.getDate(),
    });
  };

  const renderDays = () => {
    const year = tempDate.getFullYear();
    const month = tempDate.getMonth();
    const today = new Date();
    const daysInMonth = getDaysInMonth(month, year);
    const firstDay = new Date(year, month, 1).getDay();

    const cells: JSX.Element[] = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push(
        <View
          key={`empty-${i}`}
          style={{ width: CELL_SIZE, height: CELL_SIZE }}
        />,
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isSelected = date.toDateString() === tempDate.toDateString();
      const isToday = date.toDateString() === today.toDateString();
      const isDisabled =
        (minDate && date < minDate) || (maxDate && date > maxDate);

      cells.push(
        <Pressable
          key={day}
          onPress={() => !isDisabled && updateDate({ day })}
          disabled={isDisabled}
          style={{
            width: CELL_SIZE,
            height: CELL_SIZE,
            padding: 1.5,
            opacity: isDisabled ? 0.35 : 1,
          }}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              borderRadius: 10,
              backgroundColor: isSelected
                ? PRIMARY
                : isToday
                  ? PRIMARY_SOFT
                  : "transparent",
              borderWidth: isToday && !isSelected ? 1.5 : 0,
              borderColor: PRIMARY_TINT,
              ...(isSelected
                ? {
                    shadowColor: PRIMARY,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 3,
                  }
                : {}),
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: isSelected ? "white" : isToday ? PRIMARY : TEXT_COLOR,
                fontWeight: isSelected || isToday ? "700" : "500",
              }}
            >
              {day}
            </Text>
          </View>
        </Pressable>,
      );
    }

    return cells;
  };

  return (
    <>
      {/* Input Field */}
      <FormField label={label} style={containerStyle as any}>
        <Pressable
          onPress={handleOpen}
          disabled={disabled}
          style={{
            height: 46,
            borderWidth: modalVisible ? 1.5 : 1,
            borderColor: modalVisible ? PRIMARY : BORDER,
            borderRadius: 12,
            paddingLeft: 16,
            paddingRight: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: disabled ? SLATE_BG : "white",
            opacity: disabled ? 0.6 : 1,
            ...(modalVisible
              ? {
                  shadowColor: PRIMARY,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.15,
                  shadowRadius: 6,
                  elevation: 2,
                }
              : {}),
            ...inputStyle,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 15,
              color: value ? TEXT_COLOR : MUTED,
              fontWeight: value ? "600" : "400",
            }}
          >
            {value ? value : placeholder}
          </Text>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: modalVisible ? PRIMARY : SLATE_BG,
            }}
          >
            <Ionicons
              name="calendar-outline"
              size={17}
              color={modalVisible ? "#ffffff" : SLATE}
            />
          </View>
        </Pressable>
      </FormField>

      {/* Modal */}
      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1 }}>
          <Animated.View
            style={{
              flex: 1,
              backgroundColor: "rgba(15,23,42,0.55)",
              opacity: fadeAnim,
            }}
          >
            <Pressable
              style={{ flex: 1 }}
              onPress={() => setModalVisible(false)}
            />
          </Animated.View>

          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: "center",
              alignItems: "center",
              transform: [{ scale: scaleAnim }],
              paddingHorizontal: 16,
            }}
          >
            <View
              style={{
                width: Math.min(340, SCREEN_WIDTH - 32),
                backgroundColor: "white",
                borderRadius: 22,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.28,
                shadowRadius: 24,
                elevation: 24,
                ...modalContentStyle,
              }}
            >
              {/* Header */}
              <View
                style={{
                  backgroundColor: PRIMARY,
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 3,
                  }}
                >
                  <Ionicons name="calendar" size={15} color="#ffffff" />
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "800",
                      color: "#ffffff",
                      marginLeft: 6,
                      letterSpacing: 0.3,
                    }}
                  >
                    Select Date
                  </Text>
                </View>
                <Text
                  style={{
                    textAlign: "center",
                    color: PRIMARY_TINT,
                    fontSize: 11.5,
                    fontWeight: "600",
                  }}
                >
                  {tempDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </View>

              <ScrollView
                style={{ maxHeight: 480 }}
                contentContainerStyle={{ paddingBottom: 10 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Year + Month — side by side */}
                <View
                  style={{
                    flexDirection: "row",
                    paddingHorizontal: 14,
                    paddingTop: 12,
                    gap: 10,
                  }}
                >
                  {/* Year */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: MUTED,
                        marginBottom: 6,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                      }}
                    >
                      Year
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: BORDER,
                        borderRadius: 12,
                        overflow: "hidden",
                        backgroundColor: "white",
                      }}
                    >
                      <Pressable
                        onPress={() => stepYear(-1)}
                        style={{
                          width: 28,
                          height: 36,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: SLATE_BG,
                        }}
                      >
                        <Ionicons
                          name="chevron-back"
                          size={14}
                          color={PRIMARY}
                        />
                      </Pressable>
                      <TextInput
                        value={yearInput}
                        onChangeText={(t) => {
                          const num = t.replace(/[^0-9]/g, "");
                          setYearInput(num);
                          const y = parseInt(num);
                          if (!isNaN(y) && y >= 1971 && y <= 2099)
                            updateDate({ year: y });
                        }}
                        keyboardType="number-pad"
                        maxLength={4}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          height: 36,
                          textAlign: "center",
                          fontSize: 13.5,
                          fontWeight: "800",
                          color: TEXT_COLOR,
                        }}
                      />
                      <Pressable
                        onPress={() => stepYear(1)}
                        style={{
                          width: 28,
                          height: 36,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: SLATE_BG,
                        }}
                      >
                        <Ionicons
                          name="chevron-forward"
                          size={14}
                          color={PRIMARY}
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* Month */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: MUTED,
                        marginBottom: 6,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                      }}
                    >
                      Month
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: SLATE_BG,
                        borderRadius: 12,
                        padding: 3,
                      }}
                    >
                      <Pressable
                        onPress={() => stepMonth(-1)}
                        hitSlop={6}
                        style={{
                          width: 28,
                          height: 30,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons name="chevron-back" size={14} color={MUTED} />
                      </Pressable>

                      <View
                        style={{
                          flex: 1,
                          height: 30,
                          borderRadius: 9,
                          backgroundColor: PRIMARY,
                          alignItems: "center",
                          justifyContent: "center",
                          shadowColor: PRIMARY,
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: 0.35,
                          shadowRadius: 6,
                          elevation: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "800",
                            color: "white",
                            letterSpacing: 0.4,
                          }}
                        >
                          {MONTHS_SHORT[tempDate.getMonth()].toUpperCase()}
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => stepMonth(1)}
                        hitSlop={6}
                        style={{
                          width: 28,
                          height: 30,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name="chevron-forward"
                          size={14}
                          color={MUTED}
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Days Grid */}
                <View style={{ paddingHorizontal: 14, paddingTop: 14 }}>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: MUTED,
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                    }}
                  >
                    Day
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      width: CELL_SIZE * DAYS_IN_ROW,
                      alignSelf: "center",
                      marginBottom: 2,
                    }}
                  >
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (d) => (
                        <View
                          key={d}
                          style={{
                            width: CELL_SIZE,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 9.5,
                              color: MUTED,
                              fontWeight: "700",
                              textTransform: "uppercase",
                            }}
                          >
                            {d}
                          </Text>
                        </View>
                      ),
                    )}
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      width: CELL_SIZE * DAYS_IN_ROW,
                      alignSelf: "center",
                    }}
                  >
                    {renderDays()}
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View
                style={{
                  flexDirection: "row",
                  paddingHorizontal: 10,
                  paddingTop: 10,
                  paddingBottom: 14,
                  gap: 6,
                  height: 60,
                }}
              >
                <ReusableButton
                  title="Reset"
                  variant="outline"
                  className="flex-1 h-10 px-4 rounded-full"
                  textClassName="text-xs"
                  leftIcon={
                    <Ionicons name="refresh" size={13} color={PRIMARY} />
                  }
                  onPress={handleResetToday}
                />
                <ReusableButton
                  title="Cancel"
                  variant="secondary"
                  className="flex-1 h-10 px-4 rounded-full"
                  textClassName="text-xs"
                  onPress={() => setModalVisible(false)}
                />
                <ReusableButton
                  title="Confirm"
                  variant="primary"
                  className="flex-1 h-10 px-4 rounded-full"
                  //  className="h-10 px-4"
                  textClassName="text-xs"
                  leftIcon={
                    <Ionicons name="checkmark" size={14} color="#ffffff" />
                  }
                  onPress={handleConfirm}
                />
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};

export default CustomDatePicker;
