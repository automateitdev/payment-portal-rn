import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

export interface NoticeBannerProps {
  /** Notice body text. Defaults to the bank-closing transaction notice. */
  message?: string;
  /** Small heading shown above the message. */
  title?: string;
  /** Ionicon name for the leading icon. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Extra classes for the outer wrapper (e.g. margins). */
  className?: string;
}

const DEFAULT_TITLE = "গুরুত্বপূর্ণ নোটিশ";

const DEFAULT_MESSAGE =
  "হোয়াটসঅ্যাপ মেইনটেন্যান্স সংক্রান্ত সমস্যার কারণে আমাদের হোয়াটসঅ্যাপ সাপোর্ট সেবা সাময়িকভাবে বন্ধ রয়েছে। সেবাটি পুনরায় চালু করার জন্য প্রয়োজনীয় কার্যক্রম চলমান রয়েছে। সাময়িক অসুবিধার জন্য আমরা আন্তরিকভাবে দুঃখিত এবং আপনাদের সহযোগিতার জন্য কৃতজ্ঞ";

/**
 * Reusable notice/announcement banner.
 * Defaults to the bank-closing transaction notice but accepts custom content.
 */
export default function NoticeBanner({
  message = DEFAULT_MESSAGE,
  title = DEFAULT_TITLE,
  icon = "megaphone-outline",
  className = "",
}: NoticeBannerProps) {
  return (
    <View className={className}>
      <View className="flex-row bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4">
        <View className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-800/40 items-center justify-center mr-3">
          <Ionicons name={icon} size={18} color="#d97706" />
        </View>

        <View className="flex-1">
          {!!title && (
            <Text className="text-amber-800 dark:text-amber-300 font-bold text-sm mb-1">
              {title}
            </Text>
          )}
          <Text className="text-amber-800 dark:text-amber-200 text-[13px] leading-5">
            {message}
          </Text>
        </View>
      </View>
    </View>
  );
}
