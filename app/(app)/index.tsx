import { useGetInstituteInfoQuery } from "@/redux/allApi/authApi/authApi";
import { useAppSelector } from "@/redux/hook";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const themeMode = useAppSelector((state) => state.theme.mode);
  const isDark = themeMode === "dark";
  const isWeb = Platform.OS === "web";
  const isDesktop = width >= 1180;

  const contentWidth = isWeb ? Math.min(width - 48, 1160) : width;

  const { data, isLoading, isFetching, error, refetch } =
    useGetInstituteInfoQuery({}, { refetchOnMountOrArgChange: true });

  const user = data?.payload?.data?.user || {};

  if (isLoading || isFetching) {
    return (
      <View className="flex-1 bg-white dark:bg-slate-900 items-center justify-center">
        <ActivityIndicator size="small" color="#4f46e5" />
      </View>
    );
  }

  if (error || !user?.student_name) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900 items-center justify-center px-10">
        <Ionicons
          name="cloud-offline"
          size={40}
          color={isDark ? "#475569" : "#cbd5e1"}
        />
        <Text className="mt-4 text-slate-800 dark:text-slate-200 font-bold text-center">
          Connection Failed
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          className="mt-4 bg-indigo-600 px-6 py-2 rounded-xl"
        >
          <Text className="text-white font-bold">Retry Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F8FAFC] dark:bg-slate-950">
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 32,
          paddingTop: isWeb ? 24 : 12,
          paddingHorizontal: isWeb ? 24 : 0,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            colors={["#4f46e5"]}
            tintColor="#4f46e5"
          />
        }
      >
        <View
          style={{
            width: "100%",
            maxWidth: contentWidth,
            alignSelf: "center",
          }}
        >
          <View
            className="bg-white dark:bg-slate-900 rounded-[28px] p-5 relative overflow-hidden border border-slate-200/80 dark:border-slate-800"
            style={styles.heroCard}
          >
            <View className="absolute -top-10 -right-6 w-32 h-32 bg-emerald-100/70 dark:bg-emerald-500/10 rounded-full" />
            <View className="absolute -bottom-12 left-6 w-40 h-40 bg-amber-100/80 dark:bg-amber-400/10 rounded-full" />

            <View
              style={{
                flexDirection: "column",
                gap: 16,
              }}
            >
              <View className="flex-row items-start">
                <View className="bg-white/95 dark:bg-slate-800 p-1.5 rounded-2xl">
                  {user?.institute_logo ? (
                    <Image
                      source={{ uri: user?.institute_logo }}
                      className="w-12 h-12 rounded-xl"
                      resizeMode="contain"
                    />
                  ) : (
                    <View className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/50 rounded-xl items-center justify-center">
                      <Text className="text-indigo-700 dark:text-indigo-300 font-black text-lg">
                        {user?.institute_name?.charAt(0) || "E"}
                      </Text>
                    </View>
                  )}
                </View>

                <View className="ml-4 flex-1">
                  <Text className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-[2px]">
                    Student Dashboard
                  </Text>
                  <Text
                    className="text-slate-900 dark:text-white text-2xl font-black leading-tight mt-1"
                    selectable
                  >
                    {user?.student_name}
                  </Text>
                  <Text
                    className="text-slate-600 dark:text-slate-300 text-sm font-semibold mt-1"
                    selectable
                  >
                    {user?.institute_name}
                  </Text>

                  <View className="flex-row items-center mt-3">
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color="#94a3b8"
                    />
                    <Text
                      className="text-slate-500 dark:text-slate-400 text-xs font-medium ml-2 flex-1"
                      selectable
                    >
                      {user?.institute_address || "Dhaka, Bangladesh"}
                    </Text>
                  </View>

                  <View className="flex-row items-center mt-2">
                    <Ionicons
                      name="id-card-outline"
                      size={14}
                      color="#94a3b8"
                    />
                    <Text
                      className="text-slate-500 dark:text-slate-400 text-xs font-medium ml-2 flex-1"
                      selectable
                    >
                      Institute ID: {user?.institute_id || "N/A"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View
            className="mt-4"
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginHorizontal: isWeb ? -6 : 0,
            }}
          >
            <StatBox
              label="Roll"
              value={user?.roll}
              icon="ribbon-outline"
              tint="#6366f1"
              isDesktop={isDesktop}
            />
            <StatBox
              label="Class"
              value={user?.class_name}
              icon="school-outline"
              tint="#f59e0b"
              isDesktop={isDesktop}
            />
            <StatBox
              label="Section"
              value={user?.section}
              icon="grid-outline"
              tint="#10b981"
              isDesktop={isDesktop}
            />
            <StatBox
              label="Shift"
              value={user?.shift}
              icon="time-outline"
              tint="#ec4899"
              isDesktop={isDesktop}
            />
          </View>

          <View
            className="mt-5"
            style={{
              flexDirection: isDesktop ? "row" : "column",
              gap: 16,
            }}
          >
            <View style={{ flex: 1 }}>
              <Section title="Personal Profile" icon="person-outline">
                <Row label="Full Name" value={user?.student_name} />
                <Row label="Student ID" value={user?.student_id} />
                <Row label="Category" value={user?.category} isLast />
              </Section>
            </View>

            <View style={{ flex: 1 }}>
              <Section title="Academic Details" icon="library-outline">
                <Row label="Department" value={user?.department_name} />
                <Row label="Group" value={user?.group} />
                <Row label="Academic Year" value={user?.academic_year} />
                <Row label="Session" value={user?.academic_session} isLast />
              </Section>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function StatBox({
  label,
  value,
  icon,
  tint,
  isDesktop,
}: {
  label: string;
  value?: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  isDesktop: boolean;
}) {
  return (
    <View
      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
      style={{
        width: isDesktop ? "25%" : "50%",
        paddingHorizontal: 6,
        marginBottom: 12,
      }}
    >
      <View className="items-center py-4 px-3">
        <View
          className="w-11 h-11 rounded-2xl items-center justify-center"
          style={{ backgroundColor: `${tint}18` }}
        >
          <Ionicons name={icon} size={18} color={tint} />
        </View>
        <Text
          className="text-slate-900 dark:text-slate-100 text-sm font-black mt-3 capitalize"
          numberOfLines={1}
          selectable
          adjustsFontSizeToFit
        >
          {value || "N/A"}
        </Text>
        <Text className="text-slate-400 dark:text-slate-500 text-[11px] font-bold capitalize tracking-tight text-center mt-1">
          {label}
        </Text>
      </View>
    </View>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4">
      <View className="flex-row items-center mb-2 ml-1">
        <View className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center">
          <Ionicons name={icon} size={16} color="#64748b" />
        </View>
        <Text className="text-slate-500 dark:text-slate-400 font-black text-xs uppercase tracking-[2px] ml-2.5">
          {title}
        </Text>
      </View>
      <View className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {children}
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  isLast,
}: {
  label: string;
  value?: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row justify-between items-center py-4 px-4 ${!isLast ? "border-b border-slate-50 dark:border-slate-800" : ""}`}
    >
      <Text className="text-slate-400 dark:text-slate-500 text-sm font-medium">
        {label}
      </Text>
      <View className="bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-xl border border-slate-100 dark:border-slate-700">
        <Text
          className="text-slate-800 dark:text-slate-200 text-sm font-bold capitalize"
          selectable
        >
          {value || "N/A"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
});
