import { Ionicons } from "@expo/vector-icons";
import * as Updates from "expo-updates";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Platform, Text, TouchableOpacity, View } from "react-native";

export default function UpdateBanner() {
  const [updateReady, setUpdateReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const slideAnim = useRef(new Animated.Value(120)).current;

  useEffect(() => {
    if (Platform.OS === "web" || __DEV__) return;

    let cancelled = false;

    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable || cancelled) return;

        const fetchResult = await Updates.fetchUpdateAsync();
        if (!cancelled && fetchResult.isNew) {
          setUpdateReady(true);
        }
      } catch {
        // throws in Expo Go and dev mode — expected
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const show = updateReady && !dismissed;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: show ? 0 : 120,
      useNativeDriver: true,
      tension: 50,
      friction: 9,
    }).start();
  }, [show]);

  const handleRestart = useCallback(async () => {
    try {
      setRestarting(true);
      await Updates.reloadAsync();
    } catch {
      setRestarting(false);
    }
  }, []);

  if (!show) return null;

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: 20,
        left: 16,
        right: 16,
        zIndex: 9999,
        transform: [{ translateY: slideAnim }],
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
        elevation: 14,
      }}
    >
      <View
        style={{
          backgroundColor: "#0f172a",
          borderRadius: 20,
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderWidth: 1,
          borderColor: "#1e293b",
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: "#22c55e1a",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "#22c55e33",
          }}
        >
          <Ionicons name="arrow-down-circle" size={24} color="#22c55e" />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: "#f8fafc",
              fontWeight: "700",
              fontSize: 14,
              letterSpacing: 0.2,
            }}
          >
            New Update Available
          </Text>
          <Text
            style={{
              color: "#94a3b8",
              fontSize: 12,
              marginTop: 2,
              lineHeight: 16,
            }}
          >
            Restart now to apply the latest changes
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setDismissed(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={18} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleRestart}
          disabled={restarting}
          style={{
            backgroundColor: "#22c55e",
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 9,
            opacity: restarting ? 0.6 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
            {restarting ? "..." : "Update"}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
