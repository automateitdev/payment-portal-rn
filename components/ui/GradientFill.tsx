import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View } from "react-native";

interface Props {
  /** Gradient stop colours (2+). Direction is set by `start`/`end`. */
  colors: readonly string[];
  /** Start point in 0..1 coords. Default top-left. */
  start?: { x: number; y: number };
  /** End point in 0..1 coords. Default bottom-right. */
  end?: { x: number; y: number };
  /** Corner radius to clip to (match the parent's radius). */
  radius?: number;
}

/**
 * A decorative gradient that fills its parent and sits BEHIND its siblings.
 *
 * Built on `expo-linear-gradient` (a project dependency) — no `react-native-svg`
 * required, JS-only and OTA friendly. Render it as the FIRST child of a parent
 * that has `overflow: hidden`; it is pointer-transparent so taps pass straight
 * through to the real content rendered after it.
 *
 * Colours come from the theme palette — see `theme/colors.ts` (`gradients`).
 */
export const GradientFill: React.FC<Props> = ({
  colors,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  radius = 0,
}) => {
  // expo-linear-gradient needs at least two stops.
  const stops = (
    colors.length >= 2 ? colors : [colors[0] ?? "transparent", colors[0] ?? "transparent"]
  ) as [string, string, ...string[]];

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { borderRadius: radius, overflow: "hidden" },
      ]}
    >
      <LinearGradient
        colors={stops}
        start={start}
        end={end}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
};

export default GradientFill;
