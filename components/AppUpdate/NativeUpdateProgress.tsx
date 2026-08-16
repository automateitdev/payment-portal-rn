import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Platform, Text, TouchableOpacity, View } from "react-native";
import type { StatusUpdateEvent } from "sp-react-native-in-app-updates";

const HERO_COLORS = ["#062E1F", "#0B4A32", "#14532D"] as const;
const ACCENT_COLORS = ["#4ADE80", "#16A34A"] as const;

// Mirrors sp-react-native-in-app-updates' AndroidInstallStatus / AndroidUpdateType
// values. Kept as local constants instead of importing the enums so this file
// never has to statically import the package (see note in the effect below).
const INSTALL_STATUS = {
  PENDING: 1,
  DOWNLOADING: 2,
  INSTALLING: 3,
  INSTALLED: 4,
  FAILED: 5,
  CANCELED: 6,
  DOWNLOADED: 11,
} as const;
const UPDATE_TYPE = { FLEXIBLE: 0, IMMEDIATE: 1 } as const;

function formatBytes(bytes: number) {
  if (!bytes || Number.isNaN(bytes)) return "0 MB";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NativeUpdateProgress() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [downloaded, setDownloaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [installing, setInstalling] = useState(false);
  const slideAnim = useRef(new Animated.Value(160)).current;
  const inAppUpdatesRef = useRef<{ installUpdate: () => void } | null>(null);

  useEffect(() => {
    if (Platform.OS !== "android" || __DEV__) return;

    let updates: any;
    let removeListener: (() => void) | null = null;

    try {
      // Required lazily (not statically imported) because this package pulls
      // in native modules (react-native-device-info, Play Core) that only
      // exist once the app has been rebuilt with them included. A static
      // import would crash the whole app on any binary built before that.
      const mod = require("sp-react-native-in-app-updates");
      const SpInAppUpdates = mod.default;
      updates = new SpInAppUpdates(false);
    } catch (err) {
      console.log("In-app update module unavailable:", err);
      return;
    }

    inAppUpdatesRef.current = updates;

    const onStatusUpdate = (event: StatusUpdateEvent) => {
      setDownloaded(event.bytesDownloaded);
      setTotal(event.totalBytesToDownload);
      setStatus(event.status);

      if (
        event.status === INSTALL_STATUS.DOWNLOADING ||
        event.status === INSTALL_STATUS.PENDING ||
        event.status === INSTALL_STATUS.DOWNLOADED
      ) {
        setDismissed(false);
        setVisible(true);
      }

      if (
        event.status === INSTALL_STATUS.FAILED ||
        event.status === INSTALL_STATUS.CANCELED
      ) {
        setVisible(false);
      }
    };

    try {
      updates.addStatusUpdateListener(onStatusUpdate);
      removeListener = () => updates.removeStatusUpdateListener(onStatusUpdate);
    } catch (err) {
      console.log("In-app update listener setup failed:", err);
      return;
    }

    (async () => {
      try {
        const result = await updates.checkNeedsUpdate();
        if (result.shouldUpdate) {
          await updates.startUpdate({ updateType: UPDATE_TYPE.FLEXIBLE });
        }
      } catch (err) {
        // Silent — e.g. app wasn't installed from Play Store, or offline.
        console.log("In-app update check failed:", err);
      }
    })();

    return () => {
      removeListener?.();
    };
  }, []);

  const show = visible && !dismissed;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: show ? 0 : 160,
      useNativeDriver: true,
      tension: 50,
      friction: 9,
    }).start();
  }, [show, slideAnim]);

  const handleInstall = useCallback(() => {
    setInstalling(true);
    inAppUpdatesRef.current?.installUpdate();
  }, []);

  if (Platform.OS !== "android") return null;

  const isDownloaded = status === INSTALL_STATUS.DOWNLOADED;
  const progress = total > 0 ? Math.min(downloaded / total, 1) : 0;

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: 20,
        left: 16,
        right: 16,
        zIndex: 9998,
        transform: [{ translateY: slideAnim }],
        shadowColor: "#062E1F",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 14,
      }}
      pointerEvents={show ? "auto" : "none"}
    >
      <LinearGradient
        colors={HERO_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 20,
          padding: 16,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -40,
            right: -30,
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: "rgba(74, 222, 128, 0.14)",
          }}
        />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: "rgba(255,255,255,0.1)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={isDownloaded ? "checkmark-circle" : "cloud-download"}
              size={22}
              color="#4ADE80"
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: "white", fontWeight: "800", fontSize: 14 }}>
              {isDownloaded ? "Update Ready" : "Downloading Update"}
            </Text>
            <Text
              style={{
                color: "rgba(220, 252, 231, 0.7)",
                fontSize: 11.5,
                marginTop: 2,
              }}
            >
              {isDownloaded
                ? "Restart to install the latest version"
                : `${formatBytes(downloaded)} of ${formatBytes(total)}`}
            </Text>
          </View>

          {!isDownloaded && (
            <TouchableOpacity
              onPress={() => setDismissed(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="close"
                size={18}
                color="rgba(255,255,255,0.5)"
              />
            </TouchableOpacity>
          )}
        </View>

        {!isDownloaded ? (
          <View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: "rgba(255,255,255,0.12)",
              marginTop: 14,
              overflow: "hidden",
            }}
          >
            <LinearGradient
              colors={ACCENT_COLORS}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                height: "100%",
                width: `${Math.max(progress * 100, 4)}%`,
                borderRadius: 3,
              }}
            />
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleInstall}
            disabled={installing}
            activeOpacity={0.9}
            style={{ marginTop: 14 }}
          >
            <LinearGradient
              colors={ACCENT_COLORS}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 12,
                paddingVertical: 11,
                alignItems: "center",
                opacity: installing ? 0.7 : 1,
              }}
            >
              <Text
                style={{ color: "white", fontWeight: "700", fontSize: 13 }}
              >
                {installing ? "Restarting..." : "Restart & Install"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </Animated.View>
  );
}
