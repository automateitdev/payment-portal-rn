import CustomDatePicker from "@/components/ui/CustomDatePicker";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import ReusableInput from "@/components/shared/ReusableInput";
import { showMessage } from "@/components/shared/CustomToast/message";
import { getErrorMessage } from "@/components/utils/errorHandler";
import { useGetInstituteInfoQuery } from "@/redux/allApi/authApi/authApi";
import {
  useApplyLeaveMutation,
  useGetLeaveReasonsQuery,
} from "@/redux/allApi/leaveApi/leaveApi";
import { useAppSelector } from "@/redux/hook";
import { RootState } from "@/redux/store";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface FormValues {
  leave_reason_id: string;
}

export interface SelectedAttachment {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
  base64?: string;
  blob?: Blob;
  file?: File;
}

// Helper to convert base64 to a true binary Blob (WinterCG compliant for Expo 57)
const b64Lookup = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

function base64ToBlob(
  base64: string,
  contentType: string = "application/octet-stream"
): Blob {
  const cleanBase64 = base64.replace(/[^A-Za-z0-9+/=]/g, "");

  if (typeof atob === "function") {
    try {
      const raw = atob(cleanBase64);
      const rawLength = raw.length;
      const array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
      }
      return new Blob([array], { type: contentType });
    } catch {
      // Fall through to manual decoder
    }
  }

  let bufferLength = cleanBase64.length * 0.75;
  if (cleanBase64.charAt(cleanBase64.length - 1) === "=") {
    bufferLength--;
    if (cleanBase64.charAt(cleanBase64.length - 2) === "=") {
      bufferLength--;
    }
  }

  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < cleanBase64.length; i += 4) {
    const enc1 = b64Lookup.indexOf(cleanBase64.charAt(i));
    const enc2 = b64Lookup.indexOf(cleanBase64.charAt(i + 1));
    const enc3 = b64Lookup.indexOf(cleanBase64.charAt(i + 2));
    const enc4 = b64Lookup.indexOf(cleanBase64.charAt(i + 3));

    bytes[p++] = (enc1 << 2) | (enc2 >> 4);
    if (enc3 !== 64 && enc3 !== -1) {
      bytes[p++] = ((enc2 & 15) << 4) | (enc3 >> 2);
    }
    if (enc4 !== 64 && enc4 !== -1) {
      bytes[p++] = ((enc3 & 3) << 6) | enc4;
    }
  }

  return new Blob([bytes], { type: contentType });
}

export default function ApplyLeaveScreen() {
  const { width } = useWindowDimensions();
  const themeMode = useAppSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === "dark";
  const isWeb = Platform.OS === "web";
  const isDesktop = width >= 960;
  const isTablet = width >= 640 && width < 960;

  // 1. Get user information
  const { data: instituteData, isLoading: isUserLoading } = useGetInstituteInfoQuery({});
  const authUser = useAppSelector((state: RootState) => state.auth.user) as any;
  const user = instituteData?.payload?.data?.user || authUser || {};

  // 2. Fetch leave reasons
  const { data: leaveReasons = [], isLoading: isReasonsLoading } = useGetLeaveReasonsQuery();

  const leaveReasonOptions = useMemo(() => {
    return leaveReasons.map((item) => ({
      label: item.name,
      value: String(item.id),
    }));
  }, [leaveReasons]);

  // 3. Form States & Mutation
  const [applyLeave, { isLoading: isSubmitting }] = useApplyLeaveMutation();

  const {
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      leave_reason_id: "",
    },
  });

  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [reason, setReason] = useState<string>("");
  const [attachment, setAttachment] = useState<SelectedAttachment | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  // Capitalize helper
  const capitalize = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  // Calculated Days
  const totalDays = useMemo(() => {
    if (!fromDate || !toDate) return null;
    const start = new Date(fromDate);
    const end = new Date(toDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : null;
  }, [fromDate, toDate]);

  // Format Class Info
  const formattedClassInfo = useMemo(() => {
    const parts = [
      capitalize(user?.class_name),
      capitalize(user?.group),
      capitalize(user?.shift),
      user?.section ? String(user.section).toUpperCase() : "",
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(" - ") : "—";
  }, [user]);

  // Handle Document Picker (Uses FileSystem on Mobile to ensure binary Blob)
  const handlePickFile = async () => {
    setAttachmentError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/jpg",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const maxSizeBytes = 2 * 1024 * 1024; // 2 MB

      if (asset.size && asset.size > maxSizeBytes) {
        setAttachmentError("File size exceeds 2 MB limit.");
        showMessage("error", "File too large", "Maximum file size allowed is 2 MB.");
        return;
      }

      let base64: string | undefined = undefined;
      let blob: Blob | undefined = undefined;
      const mimeType = asset.mimeType || "application/octet-stream";

      if (Platform.OS === "web") {
        if (asset.file) {
          blob = asset.file;
        } else {
          try {
            const resp = await fetch(asset.uri);
            blob = await resp.blob();
          } catch (fetchErr) {
            console.warn("Could not fetch blob on web:", fetchErr);
          }
        }
      } else {
        // Mobile / Native: Read binary via FileSystem base64, then convert to real binary Blob
        try {
          base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          if (base64) {
            blob = base64ToBlob(base64, mimeType);
          }
        } catch (fsErr) {
          console.warn("FileSystem read failed, attempting fetch blob fallback:", fsErr);
          try {
            const resp = await fetch(asset.uri);
            blob = await resp.blob();
          } catch (fetchErr) {
            console.error("Fetch blob also failed:", fetchErr);
          }
        }
      }

      setAttachment({
        uri: asset.uri,
        name: asset.name || "attachment",
        size: asset.size || 0,
        mimeType,
        base64,
        blob,
        file: asset.file,
      });
    } catch (err) {
      console.error("Error picking document:", err);
      showMessage("error", "Failed", "Could not pick file.");
    }
  };

  const handleRemoveFile = () => {
    setAttachment(null);
    setAttachmentError(null);
  };

  // Submit Handler: Submits FormData to /leave-applications
  const handleSubmit = async () => {
    const selectedReasonId = watch("leave_reason_id");

    if (!selectedReasonId) {
      showMessage("error", "Required", "Please select a leave reason.");
      return;
    }
    if (!fromDate) {
      showMessage("error", "Required", "Please select From Date.");
      return;
    }
    if (!toDate) {
      showMessage("error", "Required", "Please select To Date.");
      return;
    }
    if (new Date(toDate) < new Date(fromDate)) {
      showMessage("error", "Invalid Date", "To Date cannot be earlier than From Date.");
      return;
    }
    if (!reason.trim()) {
      showMessage("error", "Required", "Please enter leave reason details.");
      return;
    }

    const studentId = user?.student_tid ?? authUser?.student_tid;
    const academicYearId = user?.academic_year_id ?? authUser?.academic_year_id;
    const departmentId = user?.department_id ?? authUser?.department_id;
    const combinationsPivotId =
      user?.combinations_pivot_id ?? authUser?.combinations_pivot_id;
    const academicDetailsId = user?.id ?? authUser?.id;

    const formData = new FormData();
    formData.append("student_id", String(studentId ?? ""));
    formData.append("academic_year_id", String(academicYearId ?? ""));
    formData.append("department_id", String(departmentId ?? ""));
    formData.append("combinations_pivot_id", String(combinationsPivotId ?? ""));
    formData.append("academic_details_id", String(academicDetailsId ?? ""));
    formData.append("leave_reason_id", String(selectedReasonId));
    formData.append("from_date", fromDate);
    formData.append("to_date", toDate);
    formData.append("description", reason.trim());
    formData.append("status", "0");

    // Process attachment as pure binary Blob (Fixes "Unsupported FormDataPart implementation" in Expo 57)
    if (attachment) {
      let uploadBlob: Blob | File | undefined = attachment.blob || attachment.file;

      if (!uploadBlob && attachment.base64) {
        uploadBlob = base64ToBlob(attachment.base64, attachment.mimeType);
      } else if (!uploadBlob && attachment.uri) {
        try {
          const b64 = await FileSystem.readAsStringAsync(attachment.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          uploadBlob = base64ToBlob(b64, attachment.mimeType);
        } catch {
          const resp = await fetch(attachment.uri);
          uploadBlob = await resp.blob();
        }
      }

      if (uploadBlob) {
        // In Expo 57 WinterCG fetch, Blob or File with filename is the only supported format
        formData.append("attachment", uploadBlob, attachment.name);
      }
    }

    try {
      const res = await applyLeave(formData).unwrap();
      const successMsg =
        res?.payload?.data?.message ||
        res?.payload?.message ||
        res?.message ||
        "Leave application submitted successfully.";
      showMessage("success", "Success", successMsg);
      reset({ leave_reason_id: "" });
      setFromDate(null);
      setToDate(null);
      setReason("");
      setAttachment(null);
      setAttachmentError(null);
    } catch (err: any) {
      console.error("Apply leave error:", err);
      const errorMsg =
        err?.data?.payload?.data?.message ||
        err?.data?.payload?.message ||
        err?.data?.message ||
        (Array.isArray(err?.data?.errors)
          ? err?.data?.errors.join(", ")
          : typeof err?.data?.errors === "object" && err?.data?.errors
          ? Object.values(err.data.errors).flat().join(", ")
          : null) ||
        getErrorMessage(err) ||
        "Leave application submission failed.";
      showMessage("error", "Error", errorMsg);
    }
  };

  const handleResetForm = () => {
    reset({ leave_reason_id: "" });
    setFromDate(null);
    setToDate(null);
    setReason("");
    setAttachment(null);
    setAttachmentError(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const PRIMARY_COLOR = colors.primary.DEFAULT || "#059669";
  const studentInitial = (user?.student_name || "S").charAt(0).toUpperCase();

  return (
    <SafeAreaView
      edges={["bottom"]}
      className="flex-1 bg-slate-50/70 dark:bg-[#090d16]"
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: isDesktop ? 32 : 16,
          paddingVertical: 20,
          paddingBottom: 64,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageWrapper}>
          {/* Top Hero Banner */}
          <View
            style={[
              styles.heroBanner,
              {
                backgroundColor: isDark ? "#0f172a" : "#ffffff",
                borderColor: isDark ? "#1e293b" : "#e2e8f0",
              },
            ]}
          >
            <View className="flex-row items-center justify-between flex-wrap gap-4">
              <View className="flex-row items-center gap-3.5 flex-1 min-w-[260px]">
                <View
                  style={[
                    styles.heroIconBox,
                    {
                      backgroundColor: isDark
                        ? "rgba(16, 185, 129, 0.15)"
                        : "#ecfdf5",
                      borderColor: isDark
                        ? "rgba(16, 185, 129, 0.3)"
                        : "#a7f3d0",
                    },
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={26}
                    color={PRIMARY_COLOR}
                  />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 mb-0.5">
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                        backgroundColor: isDark
                          ? "rgba(16, 185, 129, 0.15)"
                          : "#d1fae5",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "800",
                          color: isDark ? "#34d399" : "#065f46",
                          letterSpacing: 0.5,
                        }}
                      >
                        LEAVE PORTAL
                      </Text>
                    </View>
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 3,
                        backgroundColor: "#10b981",
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        color: isDark ? "#94a3b8" : "#64748b",
                        fontWeight: "500",
                      }}
                    >
                      Active Session
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.heroTitle,
                      { color: isDark ? "#ffffff" : "#0f172a" },
                    ]}
                  >
                    Apply for Leave
                  </Text>
                  <Text
                    style={[
                      styles.heroSubtitle,
                      { color: isDark ? "#94a3b8" : "#64748b" },
                    ]}
                  >
                    Submit absence or medical leave requests for administrative review
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Student Profile Overview Card */}
          <View
            style={[
              styles.profileCard,
              {
                backgroundColor: isDark ? "#0f172a" : "#ffffff",
                borderColor: isDark ? "#1e293b" : "#e2e8f0",
              },
            ]}
          >
            {isUserLoading ? (
              <View className="py-4 items-center justify-center">
                <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                <Text
                  style={{
                    color: isDark ? "#94a3b8" : "#64748b",
                    fontSize: 12,
                    marginTop: 6,
                  }}
                >
                  Loading student profile...
                </Text>
              </View>
            ) : (
              <View>
                {/* Profile Header Row */}
                <View className="flex-row items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 dark:border-slate-800/80">
                  <View className="flex-row items-center gap-3">
                    <View
                      style={[
                        styles.avatarCircle,
                        {
                          backgroundColor: isDark
                            ? "rgba(16, 185, 129, 0.2)"
                            : "#d1fae5",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.avatarText,
                          { color: isDark ? "#34d399" : "#047857" },
                        ]}
                      >
                        {studentInitial}
                      </Text>
                    </View>
                    <View>
                      <View className="flex-row items-center gap-1.5">
                        <Text
                          style={[
                            styles.studentName,
                            { color: isDark ? "#f8fafc" : "#0f172a" },
                          ]}
                        >
                          {user?.student_name || "Enrolled Student"}
                        </Text>
                        <Ionicons
                          name="checkmark-circle"
                          size={15}
                          color={PRIMARY_COLOR}
                        />
                      </View>
                      <Text
                        style={[
                          styles.instituteText,
                          { color: isDark ? "#94a3b8" : "#64748b" },
                        ]}
                      >
                        {user?.institute_name || "Academic Portal"}
                      </Text>
                    </View>
                  </View>

                  {user?.roll != null && (
                    <View
                      style={[
                        styles.rollBadge,
                        {
                          backgroundColor: isDark
                            ? "rgba(16, 185, 129, 0.15)"
                            : "#ecfdf5",
                          borderColor: isDark
                            ? "rgba(16, 185, 129, 0.3)"
                            : "#a7f3d0",
                        },
                      ]}
                    >
                      <Ionicons
                        name="ribbon-outline"
                        size={13}
                        color={PRIMARY_COLOR}
                      />
                      <Text
                        style={[
                          styles.rollBadgeText,
                          { color: isDark ? "#34d399" : "#065f46" },
                        ]}
                      >
                        Roll: {user.roll}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Info Chips Grid */}
                <View style={styles.chipsContainer}>
                  <View
                    style={[
                      styles.infoChip,
                      {
                        backgroundColor: isDark ? "#1e293b" : "#f8fafc",
                        borderColor: isDark ? "#334155" : "#e2e8f0",
                      },
                    ]}
                  >
                    <Ionicons name="school-outline" size={14} color="#3b82f6" />
                    <Text
                      style={[
                        styles.chipLabel,
                        { color: isDark ? "#94a3b8" : "#64748b" },
                      ]}
                    >
                      Class:
                    </Text>
                    <Text
                      style={[
                        styles.chipValue,
                        { color: isDark ? "#f1f5f9" : "#1e293b" },
                      ]}
                    >
                      {user?.class_name ? capitalize(user.class_name) : "—"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.infoChip,
                      {
                        backgroundColor: isDark ? "#1e293b" : "#f8fafc",
                        borderColor: isDark ? "#334155" : "#e2e8f0",
                      },
                    ]}
                  >
                    <Ionicons name="grid-outline" size={14} color="#10b981" />
                    <Text
                      style={[
                        styles.chipLabel,
                        { color: isDark ? "#94a3b8" : "#64748b" },
                      ]}
                    >
                      Section:
                    </Text>
                    <Text
                      style={[
                        styles.chipValue,
                        { color: isDark ? "#f1f5f9" : "#1e293b" },
                      ]}
                    >
                      {user?.section ? String(user.section).toUpperCase() : "—"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.infoChip,
                      {
                        backgroundColor: isDark ? "#1e293b" : "#f8fafc",
                        borderColor: isDark ? "#334155" : "#e2e8f0",
                      },
                    ]}
                  >
                    <Ionicons name="time-outline" size={14} color="#ec4899" />
                    <Text
                      style={[
                        styles.chipLabel,
                        { color: isDark ? "#94a3b8" : "#64748b" },
                      ]}
                    >
                      Shift:
                    </Text>
                    <Text
                      style={[
                        styles.chipValue,
                        { color: isDark ? "#f1f5f9" : "#1e293b" },
                      ]}
                    >
                      {user?.shift ? capitalize(user.shift) : "—"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.infoChip,
                      {
                        backgroundColor: isDark ? "#1e293b" : "#f8fafc",
                        borderColor: isDark ? "#334155" : "#e2e8f0",
                      },
                    ]}
                  >
                    <Ionicons name="library-outline" size={14} color="#8b5cf6" />
                    <Text
                      style={[
                        styles.chipLabel,
                        { color: isDark ? "#94a3b8" : "#64748b" },
                      ]}
                    >
                      Dept/Group:
                    </Text>
                    <Text
                      style={[
                        styles.chipValue,
                        { color: isDark ? "#f1f5f9" : "#1e293b" },
                      ]}
                    >
                      {user?.department_name || user?.group || "General"}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Form Card */}
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: isDark ? "#0f172a" : "#ffffff",
                borderColor: isDark ? "#1e293b" : "#e2e8f0",
              },
            ]}
          >
            {/* Section Header */}
            <View className="flex-row items-center justify-between pb-3 mb-5 border-b border-slate-100 dark:border-slate-800">
              <View className="flex-row items-center gap-2">
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    backgroundColor: isDark
                      ? "rgba(16, 185, 129, 0.15)"
                      : "#ecfdf5",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={14}
                    color={PRIMARY_COLOR}
                  />
                </View>
                <Text
                  style={[
                    styles.formSectionTitle,
                    { color: isDark ? "#ffffff" : "#0f172a" },
                  ]}
                >
                  Leave Details & Duration
                </Text>
              </View>

              {totalDays !== null && (
                <View
                  style={[
                    styles.durationBanner,
                    {
                      backgroundColor: isDark
                        ? "rgba(16, 185, 129, 0.15)"
                        : "#ecfdf5",
                      borderColor: isDark
                        ? "rgba(16, 185, 129, 0.3)"
                        : "#a7f3d0",
                    },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={PRIMARY_COLOR}
                  />
                  <Text
                    style={[
                      styles.durationBannerText,
                      { color: isDark ? "#34d399" : "#047857" },
                    ]}
                  >
                    Duration: {totalDays} {totalDays === 1 ? "Day" : "Days"}
                  </Text>
                </View>
              )}
            </View>

            {/* Row 1: Leave Reason, From Date, To Date */}
            <View
              style={
                isDesktop
                  ? styles.rowThreeColumns
                  : isTablet
                  ? styles.rowThreeColumns
                  : styles.columnStack
              }
            >
              {/* Leave Type */}
              <View style={styles.flexItem}>
                <SearchableSelect
                  name="leave_reason_id"
                  control={control}
                  options={leaveReasonOptions}
                  label="Leave Type *"
                  placeholder="Select Leave Reason"
                  disabled={isReasonsLoading}
                />
              </View>

              {/* From Date */}
              <View style={styles.flexItem}>
                <CustomDatePicker
                  label="From Date *"
                  placeholder="Select From Date"
                  value={fromDate}
                  onChange={setFromDate}
                />
              </View>

              {/* To Date */}
              <View style={styles.flexItem}>
                <CustomDatePicker
                  label="To Date *"
                  placeholder="Select To Date"
                  value={toDate}
                  onChange={setToDate}
                  minDate={fromDate ? new Date(fromDate) : undefined}
                />
              </View>
            </View>

            {/* Row 2: Reason Description & Attachment Dropzone */}
            <View
              style={[
                isDesktop ? styles.rowTwoColumns : styles.columnStack,
                { marginTop: 10 },
              ]}
            >
              {/* Reason Description (Left 60% on desktop) */}
              <View style={isDesktop ? { flex: 3 } : styles.flexItem}>
                <View>
                  <ReusableInput
                    label="Reason Description *"
                    placeholder="Provide details about why you are requesting leave (e.g. medical illness, family emergency)..."
                    value={reason}
                    onChangeText={setReason}
                    multiline={true}
                    numberOfLines={4}
                    height={125}
                    style={{
                      textAlignVertical: "top",
                      paddingTop: 10,
                      lineHeight: 20,
                    }}
                  />
                  <View className="flex-row items-center justify-between mt-1 px-1">
                    <Text
                      style={{
                        fontSize: 11,
                        color: isDark ? "#64748b" : "#94a3b8",
                      }}
                    >
                      Be concise and include necessary context.
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: isDark ? "#94a3b8" : "#64748b",
                      }}
                    >
                      {reason.length} chars
                    </Text>
                  </View>
                </View>
              </View>

              {/* Attachment Dropzone (Right 40% on desktop) */}
              <View style={isDesktop ? { flex: 2 } : styles.flexItem}>
                <Text
                  style={[
                    styles.fieldLabel,
                    { color: isDark ? "#cbd5e1" : "#334155" },
                  ]}
                >
                  Supporting Document (Optional)
                </Text>

                {/* Dropzone Card */}
                {!attachment ? (
                  <TouchableOpacity
                    onPress={handlePickFile}
                    activeOpacity={0.8}
                    style={[
                      styles.dropzoneContainer,
                      {
                        backgroundColor: isDark ? "#1e293b" : "#f8fafc",
                        borderColor: isDark ? "#334155" : "#cbd5e1",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.dropzoneIconBox,
                        {
                          backgroundColor: isDark
                            ? "rgba(16, 185, 129, 0.15)"
                            : "#ecfdf5",
                        },
                      ]}
                    >
                      <Ionicons
                        name="cloud-upload-outline"
                        size={22}
                        color={PRIMARY_COLOR}
                      />
                    </View>
                    <Text
                      style={[
                        styles.dropzoneTitle,
                        { color: isDark ? "#f1f5f9" : "#0f172a" },
                      ]}
                    >
                      Tap to Choose File
                    </Text>
                    <Text
                      style={[
                        styles.dropzoneSubtitle,
                        { color: isDark ? "#94a3b8" : "#64748b" },
                      ]}
                    >
                      PDF, JPG, PNG or WEBP (Max 2 MB)
                    </Text>
                  </TouchableOpacity>
                ) : (
                  /* Selected File Preview Box */
                  <View
                    style={[
                      styles.selectedFileBox,
                      {
                        backgroundColor: isDark ? "#1e293b" : "#f0fdf4",
                        borderColor: isDark ? "#059669" : "#86efac",
                      },
                    ]}
                  >
                    <View className="flex-row items-center gap-3 flex-1 min-w-0">
                      <View
                        style={[
                          styles.fileTypeBadge,
                          {
                            backgroundColor: attachment.name
                              .toLowerCase()
                              .endsWith(".pdf")
                              ? "#fee2e2"
                              : "#e0e7ff",
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            attachment.name.toLowerCase().endsWith(".pdf")
                              ? "document-text"
                              : "image"
                          }
                          size={18}
                          color={
                            attachment.name.toLowerCase().endsWith(".pdf")
                              ? "#ef4444"
                              : "#4f46e5"
                          }
                        />
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.selectedFileName,
                            { color: isDark ? "#f1f5f9" : "#0f172a" },
                          ]}
                        >
                          {attachment.name}
                        </Text>
                        <View className="flex-row items-center gap-2 mt-0.5">
                          <Text
                            style={[
                              styles.selectedFileSize,
                              { color: isDark ? "#94a3b8" : "#64748b" },
                            ]}
                          >
                            {formatFileSize(attachment.size)}
                          </Text>
                          <View
                            style={{
                              width: 3,
                              height: 3,
                              borderRadius: 1.5,
                              backgroundColor: "#94a3b8",
                            }}
                          />
                          <Text
                            style={{
                              fontSize: 11,
                              color: PRIMARY_COLOR,
                              fontWeight: "600",
                            }}
                          >
                            Ready to upload
                          </Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={handleRemoveFile}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.removeFileBtn}
                    >
                      <Ionicons name="trash-outline" size={17} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}

                {attachmentError ? (
                  <View className="flex-row items-center gap-1.5 mt-2">
                    <Ionicons name="alert-circle" size={14} color="#ef4444" />
                    <Text style={styles.errorText}>{attachmentError}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Action Buttons: Submit & Reset */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.85}
                style={[
                  styles.submitBtn,
                  {
                    backgroundColor: PRIMARY_COLOR,
                    opacity: isSubmitting ? 0.75 : 1,
                  },
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#ffffff" />
                    <Text style={styles.submitBtnText}>Submit Application</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleResetForm}
                disabled={isSubmitting}
                activeOpacity={0.7}
                style={[
                  styles.resetBtn,
                  {
                    borderColor: isDark ? "#334155" : "#e2e8f0",
                    backgroundColor: isDark ? "#1e293b" : "#ffffff",
                  },
                ]}
              >
                <Ionicons
                  name="refresh-outline"
                  size={16}
                  color={isDark ? "#cbd5e1" : "#64748b"}
                />
                <Text
                  style={[
                    styles.resetBtnText,
                    { color: isDark ? "#cbd5e1" : "#64748b" },
                  ]}
                >
                  Reset
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Leave Guidelines / Notice Card */}
          <View
            style={[
              styles.guidelinesCard,
              {
                backgroundColor: isDark ? "#0f172a" : "#ffffff",
                borderColor: isDark ? "#1e293b" : "#e2e8f0",
              },
            ]}
          >
            <View className="flex-row items-center gap-2 mb-2.5">
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={PRIMARY_COLOR}
              />
              <Text
                style={[
                  styles.guidelinesTitle,
                  { color: isDark ? "#ffffff" : "#0f172a" },
                ]}
              >
                Important Guidelines for Leave Requests
              </Text>
            </View>
            <View className="space-y-1.5" style={{ gap: 6 }}>
              <View className="flex-row items-start gap-2">
                <Text style={{ color: PRIMARY_COLOR, fontSize: 13 }}>•</Text>
                <Text
                  style={[
                    styles.guidelinesText,
                    { color: isDark ? "#94a3b8" : "#64748b" },
                  ]}
                >
                  Please submit leave requests at least 24 hours in advance whenever possible.
                </Text>
              </View>
              <View className="flex-row items-start gap-2">
                <Text style={{ color: PRIMARY_COLOR, fontSize: 13 }}>•</Text>
                <Text
                  style={[
                    styles.guidelinesText,
                    { color: isDark ? "#94a3b8" : "#64748b" },
                  ]}
                >
                  For sick leave exceeding 2 consecutive days, attaching a medical certificate is recommended.
                </Text>
              </View>
              <View className="flex-row items-start gap-2">
                <Text style={{ color: PRIMARY_COLOR, fontSize: 13 }}>•</Text>
                <Text
                  style={[
                    styles.guidelinesText,
                    { color: isDark ? "#94a3b8" : "#64748b" },
                  ]}
                >
                  Submitted applications will be reviewed by the respective academic department authority.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pageWrapper: {
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
  },
  heroBanner: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  heroIconBox: {
    width: 52,
    height: 52,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 12.5,
    fontWeight: "500",
    marginTop: 2,
    lineHeight: 18,
  },
  profileCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
  },
  studentName: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  instituteText: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  rollBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  rollBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  chipValue: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  durationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    borderRadius: 999,
    borderWidth: 1,
  },
  durationBannerText: {
    fontSize: 12,
    fontWeight: "700",
  },
  rowThreeColumns: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
  },
  rowTwoColumns: {
    flexDirection: "row",
    gap: 20,
    alignItems: "flex-start",
  },
  columnStack: {
    flexDirection: "column",
    gap: 12,
  },
  flexItem: {
    flex: 1,
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    marginBottom: 6,
  },
  dropzoneContainer: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 125,
  },
  dropzoneIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  dropzoneTitle: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  dropzoneSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: "500",
  },
  selectedFileBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 80,
  },
  fileTypeBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedFileName: {
    fontSize: 13,
    fontWeight: "700",
  },
  selectedFileSize: {
    fontSize: 11.5,
    fontWeight: "500",
  },
  removeFileBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    marginLeft: 8,
  },
  errorText: {
    fontSize: 11,
    color: "#ef4444",
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 24,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
    height: 46,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  resetBtnText: {
    fontSize: 13.5,
    fontWeight: "600",
  },
  guidelinesCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  guidelinesTitle: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  guidelinesText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
});
