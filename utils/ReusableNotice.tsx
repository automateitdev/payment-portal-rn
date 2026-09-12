import { Ionicons } from "@expo/vector-icons";
import { StyleProp, Text, View, ViewStyle } from "react-native";

interface ReusableNoticeProps {
  /** Notice text. Pass any message from the calling screen. */
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  textClassName?: string;
  /** Overrides the default bg/border/rounded/padding classes on the outer wrapper. */
  containerClassName?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/** Static notice banner — text wraps normally. For a scrolling marquee, use `ReusableScrollNotice`. */
export default function ReusableNotice({
  message,
  icon = "megaphone-outline",
  iconColor = "#374151",
  textClassName = "text-gray-800",
  containerClassName = "bg-amber-50 border border-amber-200 rounded-xl px-4 py-3",
  containerStyle,
}: ReusableNoticeProps) {
  return (
    <View
      className={`flex-row items-center ${containerClassName}`}
      style={containerStyle}
    >
      <Ionicons
        name={icon}
        size={18}
        color={iconColor}
        style={{ marginRight: 10 }}
      />
      <Text
        className={`flex-1 text-[13px] font-semibold ${textClassName}`}
        style={{ lineHeight: 20 }}
      >
        {message}
      </Text>
    </View>
  );
}
