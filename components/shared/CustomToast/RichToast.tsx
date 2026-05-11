import { Ionicons } from "@expo/vector-icons";
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export type MessageType = "success" | "error" | "info" | "warning";
export type MessagePosition = "top" | "left" | "right";

interface MessageData {
  type: MessageType;
  title: string;
  message: string;
  position: MessagePosition;
}

export interface RichToastRef {
  show: (data: MessageData) => void;
}

const getStyles = (type: MessageType) => {
  switch (type) {
    case "success":
      return {
        icon: "checkmark-circle" as const,
        color: "#10b981",
        bgColor: "#f0fdf4",
        borderColor: "#d1fae5",
      };
    case "error":
      return {
        icon: "close-circle" as const,
        color: "#ef4444",
        bgColor: "#fef2f2",
        borderColor: "#fee2e2",
      };
    case "warning":
      return {
        icon: "warning" as const,
        color: "#f59e0b",
        bgColor: "#fffbeb",
        borderColor: "#fef3c7",
      };
    case "info":
    default:
      return {
        icon: "information-circle" as const,
        color: "#3b82f6",
        bgColor: "#eff6ff",
        borderColor: "#dbeafe",
      };
  }
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const RichToast = forwardRef<RichToastRef>((_, ref) => {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<MessageData | null>(null);
  const [animValue] = useState(new Animated.Value(0));
  const [progressValue] = useState(new Animated.Value(0));

  const hide = useCallback(() => {
    Animated.timing(animValue, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      progressValue.setValue(0);
    });
  }, [animValue, progressValue]);

  useImperativeHandle(ref, () => ({
    show: (showData) => {
      setData(showData);
      setVisible(true);
      progressValue.setValue(0);

      // Slide in animation (High performance)
      Animated.spring(animValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }).start();

      // Progress bar animation (Width doesn't support native driver)
      Animated.timing(progressValue, {
        toValue: 1,
        duration: 5000,
        useNativeDriver: false,
      }).start();

      // Auto hide
      setTimeout(hide, 5000);
    },
  }));

  if (!visible || !data) return null;

  const isWeb = Platform.OS === "web";
  const styles = getStyles(data.type);

  // Animation mapping based on position
  const getTransform = () => {
    switch (data.position) {
      case "left":
        return {
          translateX: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [-SCREEN_WIDTH, 0],
          }),
        };
      case "right":
        return {
          translateX: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [SCREEN_WIDTH, 0],
          }),
        };
      case "top":
      default:
        return {
          translateY: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [-200, 0],
          }),
        };
    }
  };

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 70,
          left:
            data.position === "left"
              ? 20
              : data.position === "right"
                ? undefined
                : isWeb
                  ? "50%"
                  : 20,
          right:
            data.position === "right"
              ? 20
              : data.position === "left"
                ? undefined
                : isWeb
                  ? undefined
                  : 20,
          marginLeft: isWeb && data.position === "top" ? -250 : 0,
          width: isWeb ? 500 : SCREEN_WIDTH - 40,
          zIndex: 9999,
          transform: [getTransform()],
        },
      ]}
    >
      <View
        style={{
          backgroundColor: styles.bgColor,
          borderColor: styles.borderColor,
          shadowColor: styles.color,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 25,
          elevation: 10,
        }}
        className="rounded-[30px] border-[1.5px] p-5 overflow-hidden"
      >
        <View className="flex-row gap-5">
          {/* Icon Section with Soft Backdrop */}
          <View
            style={{ backgroundColor: "rgba(255,255,255,0.7)" }}
            className="w-14 h-14 rounded-2xl items-center justify-center shadow-sm"
          >
            <Ionicons name={styles.icon} size={32} color={styles.color} />
          </View>

          {/* Content Section */}
          <View className="flex-1 justify-center">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-gray-900 font-extrabold text-[17px] tracking-tight">
                {data.title}
              </Text>
              <TouchableOpacity
                onPress={hide}
                className="w-8 h-8 rounded-full bg-white/50 items-center justify-center"
              >
                <Ionicons name="close" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ maxHeight: 150 }}>
              <ScrollView showsVerticalScrollIndicator={true} className="pr-2">
                <Text className="text-gray-500 font-bold leading-6 text-[14px]">
                  {data.message}
                </Text>
              </ScrollView>
            </View>
          </View>
        </View>

        {/* Improved Progress Line */}
        <View className="mt-5 h-[4px] bg-gray-100/50 rounded-full overflow-hidden">
          <Animated.View
            style={{
              height: "100%",
              backgroundColor: styles.color,
              width: progressValue.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            }}
          />
        </View>
      </View>
    </Animated.View>
  );
});

RichToast.displayName = "RichToast";
export default RichToast;
