import { useAppDispatch, useAppSelector } from "@/redux/hook";
import { RootState } from "@/redux/store";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface MenuItem {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  route: string;
}

const MORE_MENU_ITEMS: MenuItem[] = [
  // {
  //   title: "Apply Leave",
  //   subtitle: "Submit absence & leave applications",
  //   icon: "calendar",
  //   color: "#059669",
  //   bgColor: "#ecfdf5",
  //   route: "/apply-leave",
  // },
  {
    title: "Invoices",
    subtitle: "Payment history & receipts",
    icon: "receipt",
    color: "#d97706",
    bgColor: "#fffbeb",
    route: "/payments/invoices/invoices",
  },
  {
    title: "Open Payment",
    subtitle: "Instant fee payment without login",
    icon: "card",
    color: "#2563eb",
    bgColor: "#eff6ff",
    route: "/open-payment",
  },
  {
    title: "Admission",
    subtitle: "Online admission application",
    icon: "school",
    color: "#7c3aed",
    bgColor: "#f5f3ff",
    route: "/onlineadmission",
  },
];

export default function MoreBottomSheet({ visible, onClose }: Props) {
  const router = useRouter();
  const themeMode = useAppSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === "dark";
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 24,
          stiffness: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 400,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSelectRoute = (route: string) => {
    onClose();
    setTimeout(() => {
      router.push(route as any);
    }, 150);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim,
              backgroundColor: isDark ? "rgba(0, 0, 0, 0.7)" : "rgba(15, 23, 42, 0.45)",
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        {/* Sliding Bottom Sheet Container */}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: isDark ? "#0f172a" : "#ffffff",
              borderTopColor: isDark ? "#1e293b" : "#e2e8f0",
              paddingBottom: Math.max(insets.bottom, 16) + 12,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Top Pill Handle */}
          <View style={styles.handleRow}>
            <View
              style={[
                styles.handlePill,
                { backgroundColor: isDark ? "#334155" : "#cbd5e1" },
              ]}
            />
          </View>

          {/* Header with Title and Close (X) button */}
          <View style={styles.headerRow}>
            <View>
              <Text
                style={[
                  styles.headerTitle,
                  { color: isDark ? "#f8fafc" : "#0f172a" },
                ]}
              >
                More Services
              </Text>
              <Text
                style={[
                  styles.headerSubtitle,
                  { color: isDark ? "#94a3b8" : "#64748b" },
                ]}
              >
                Quick access to additional features
              </Text>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={[
                styles.closeButton,
                {
                  backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
                  borderColor: isDark ? "#334155" : "#e2e8f0",
                },
              ]}
            >
              <Ionicons
                name="close"
                size={20}
                color={isDark ? "#f1f5f9" : "#334155"}
              />
            </TouchableOpacity>
          </View>

          {/* Menu Items List */}
          <View style={styles.itemsList}>
            {MORE_MENU_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.route}
                onPress={() => handleSelectRoute(item.route)}
                activeOpacity={0.75}
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: isDark ? "#1e293b" : "#f8fafc",
                    borderColor: isDark ? "#334155" : "#e2e8f0",
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: isDark
                        ? `${item.color}25`
                        : item.bgColor,
                    },
                  ]}
                >
                  <Ionicons name={item.icon} size={22} color={item.color} />
                </View>

                <View className="flex-1 ml-3.5">
                  <Text
                    style={[
                      styles.itemTitle,
                      { color: isDark ? "#f8fafc" : "#0f172a" },
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.itemSubtitle,
                      { color: isDark ? "#94a3b8" : "#64748b" },
                    ]}
                  >
                    {item.subtitle}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={isDark ? "#475569" : "#94a3b8"}
                />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  handleRow: {
    alignItems: "center",
    paddingVertical: 6,
  },
  handlePill: {
    width: 42,
    height: 4.5,
    borderRadius: 999,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  itemsList: {
    gap: 10,
    marginTop: 2,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  itemSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
