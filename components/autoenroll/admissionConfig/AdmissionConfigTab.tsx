import Legend from "@/components/shared/Legend/Legend";
import ReusableButton from "@/components/shared/Button/ReusableButton";
import ReusableTable, {
  TableColumn,
} from "@/components/shared/Table/ReusableTable";
import { CustomDateTimePicker } from "@/components/ui/CustomDateTimePicker";
import ReusableInput from "@/components/ui/ReusableInput";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  FullMapAdmissionFeeConfigRow,
  useDownloadAdmissionConfigExcelMutation,
  useFetchAdmissionFeeConfigGroupBasedQuery,
  useStoreAdmissionConfigurationMutation,
} from "@/redux/api/autoenroll/admissionFeeConfigApi";
import { normalizeApiError } from "@/utils/errorNormalizer";
import { showMessage } from "@/utils/message";
import { Ionicons } from "@expo/vector-icons";
import { skipToken } from "@reduxjs/toolkit/query";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Platform, Switch, Text, TouchableOpacity, View } from "react-native";
import { AdmissionRowState } from "./types";

interface FilterForm {
  academic_year_id: string;
  department_id: string;
  class_id: string;
  shift_id: string;
  fee_head_id: string;
}

interface GroupRow {
  group_id: string;
  group_name: string;
  admission_fee_config_id: number;
  fee_amount?: string;
}

interface Props {
  feeMap: FullMapAdmissionFeeConfigRow[];
  isLoadingMap?: boolean;
}

const emptyRowState = (): AdmissionRowState => ({
  selected: false,
  file: null,
  startDate: undefined,
  endDate: undefined,
  rollAuto: true,
  rollStart: "",
  customStudentId: false,
  studentIdPrefix: "",
  studentIdStart: "",
  examEnabled: false,
  examDate: undefined,
});

const formatDateTimeForSQL = (date?: Date) => {
  if (!date) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
};

const AdmissionConfigTab: React.FC<Props> = ({ feeMap, isLoadingMap }) => {
  const { control, watch, setValue } = useForm<FilterForm>({
    defaultValues: {
      academic_year_id: "",
      department_id: "",
      class_id: "",
      shift_id: "",
      fee_head_id: "",
    },
  });

  const academicYearId = watch("academic_year_id");
  const departmentId = watch("department_id");
  const classId = watch("class_id");
  const shiftId = watch("shift_id");
  const feeHeadId = watch("fee_head_id");

  const [rowState, setRowState] = useState<Record<string, AdmissionRowState>>(
    {},
  );
  const [storeConfig, { isLoading: isSubmitting }] =
    useStoreAdmissionConfigurationMutation();
  const [downloadExcel, { isLoading: isDownloadingTemplate }] =
    useDownloadAdmissionConfigExcelMutation();

  /* ---- cascading options: Academic Year -> Department -> Class -> Shift -> Fee Head ---- */
  const academicYearOptions = useMemo(() => {
    const seen = new Map<string, string>();
    (feeMap ?? []).forEach((r) =>
      seen.set(
        String(r.academic_year_id),
        r.academic_year?.coresubcategories?.core_subcategory_name ??
          String(r.academic_year_id),
      ),
    );
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [feeMap]);

  const departmentOptions = useMemo(() => {
    if (!academicYearId) return [];
    const seen = new Map<string, string>();
    (feeMap ?? [])
      .filter((r) => String(r.academic_year_id) === academicYearId)
      .forEach((r) =>
        seen.set(
          String(r.department_id),
          r.department?.name ?? String(r.department_id),
        ),
      );
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [feeMap, academicYearId]);

  const classOptions = useMemo(() => {
    if (!academicYearId || !departmentId) return [];
    const seen = new Map<string, string>();
    (feeMap ?? [])
      .filter(
        (r) =>
          String(r.academic_year_id) === academicYearId &&
          String(r.department_id) === departmentId,
      )
      .forEach((r) =>
        seen.set(
          String(r.class_id),
          r.class?.core_subcategory_name ?? String(r.class_id),
        ),
      );
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [feeMap, academicYearId, departmentId]);

  const shiftOptions = useMemo(() => {
    if (!academicYearId || !departmentId || !classId) return [];
    const seen = new Map<string, string>();
    (feeMap ?? [])
      .filter(
        (r) =>
          String(r.academic_year_id) === academicYearId &&
          String(r.department_id) === departmentId &&
          String(r.class_id) === classId,
      )
      .forEach((r) =>
        seen.set(
          String(r.shift_id),
          r.shift?.core_subcategory_name ?? String(r.shift_id),
        ),
      );
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [feeMap, academicYearId, departmentId, classId]);

  const feeHeadOptions = useMemo(() => {
    if (!academicYearId || !departmentId || !classId || !shiftId) return [];
    const seen = new Map<string, string>();
    (feeMap ?? [])
      .filter(
        (r) =>
          String(r.academic_year_id) === academicYearId &&
          String(r.department_id) === departmentId &&
          String(r.class_id) === classId &&
          String(r.shift_id) === shiftId,
      )
      .forEach((r) =>
        seen.set(
          String(r.fee_head_id),
          r.feehead?.name ?? String(r.fee_head_id),
        ),
      );
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [feeMap, academicYearId, departmentId, classId, shiftId]);

  /* ---- table rows: GET /admission-fee-config — only on the Search button,
     never auto on select ---- */
  const [searchParams, setSearchParams] = useState<{
    academic_year_id: string;
    department_id: string;
    class_id: string;
    shift_id: string;
    fee_head_id: string;
  } | null>(null);

  const { data: groupConfigData, isFetching: isLoadingGroups } =
    useFetchAdmissionFeeConfigGroupBasedQuery(searchParams ?? skipToken);

  const handleSearch = () => {
    if (!academicYearId || !departmentId || !classId || !shiftId || !feeHeadId) {
      showMessage(
        "warning",
        "Required",
        "Select Academic Year, Department, Class, Shift and Fee Head first.",
      );
      return;
    }
    setSearchParams({
      academic_year_id: academicYearId,
      department_id: departmentId,
      class_id: classId,
      shift_id: shiftId,
      fee_head_id: feeHeadId,
    });
  };

  const groupRows: GroupRow[] = useMemo(
    () =>
      (groupConfigData ?? []).map((g) => ({
        group_id: String(g.group_id),
        group_name: g.group_name,
        admission_fee_config_id: g.admission_fee_config_id,
        fee_amount: g.fee_heads?.[0]?.fee_amount,
      })),
    [groupConfigData],
  );

  // Reset downstream selections whenever an upstream filter changes.
  useEffect(() => setValue("department_id", ""), [academicYearId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setValue("class_id", ""), [departmentId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setValue("shift_id", ""), [classId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setValue("fee_head_id", ""), [shiftId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setRowState({}), [groupConfigData]);
  // Any filter change clears the last search result until Search is pressed again.
  useEffect(() => setSearchParams(null), [academicYearId, departmentId, classId, shiftId, feeHeadId]);

  const patchRow = (groupId: string, patch: Partial<AdmissionRowState>) => {
    setRowState((prev) => ({
      ...prev,
      [groupId]: { ...(prev[groupId] ?? emptyRowState()), ...patch },
    }));
  };

  const selectedRows = groupRows.filter((g) => rowState[g.group_id]?.selected);
  const allSelected =
    groupRows.length > 0 && selectedRows.length === groupRows.length;

  const toggleSelectAll = () => {
    const next = !allSelected;
    setRowState((prev) => {
      const copy = { ...prev };
      groupRows.forEach((g) => {
        copy[g.group_id] = {
          ...(copy[g.group_id] ?? emptyRowState()),
          selected: next,
        };
      });
      return copy;
    });
  };

  const pickFile = async (groupId: string) => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.[0]) return;
      patchRow(groupId, { file: res.assets[0] });
    } catch {
      showMessage("error", "Failed", "Could not pick the file.");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await downloadExcel().unwrap();
      const fileUrl = res?.download_url;
      if (!fileUrl) {
        showMessage("error", "Error", "No download link available");
        return;
      }
      const fileName = `Admission_Student_Template_${Date.now()}.xlsx`;

      if (Platform.OS === "web") {
        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showMessage("success", "Success", "Download started");
      } else {
        const downloadResumable = FileSystem.createDownloadResumable(
          fileUrl,
          (FileSystem as any).documentDirectory + fileName,
          {},
        );
        const downloadResult = await downloadResumable.downloadAsync();
        const uri = downloadResult?.uri;

        if (uri && (await Sharing.isAvailableAsync())) {
          await Sharing.shareAsync(uri, {
            mimeType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            dialogTitle: "Save Excel File",
            UTI: "com.microsoft.excel.xlsx",
          });
        } else if (uri) {
          showMessage("success", "Success", `File downloaded to: ${uri}`);
        }
      }
    } catch (err) {
      const error = normalizeApiError(err);
      showMessage(
        "error",
        "Error",
        error.message || "Failed to download template.",
      );
    }
  };

  const handleApply = async () => {
    if (selectedRows.length === 0) {
      showMessage("warning", "Attention", "Select at least one group.");
      return;
    }

    const formData = new FormData();
    formData.append("academic_year_id", academicYearId);
    formData.append("department_id", departmentId);
    formData.append("class_id", classId);
    formData.append("shift_id", shiftId);

    await Promise.all(
      selectedRows.map(async (g, i) => {
        const rs = rowState[g.group_id] ?? emptyRowState();
        formData.append(
          `admission_fee_config_id[${i}]`,
          String(g.admission_fee_config_id),
        );
        formData.append(`group_id[${i}]`, g.group_id);
        formData.append(
          `start_date_time[${i}]`,
          formatDateTimeForSQL(rs.startDate),
        );
        formData.append(
          `end_date_time[${i}]`,
          formatDateTimeForSQL(rs.endDate),
        );
        formData.append(
          `exam_date_time[${i}]`,
          rs.examEnabled ? formatDateTimeForSQL(rs.examDate) : "",
        );
        formData.append(`exam_enabled[${i}]`, rs.examEnabled ? "YES" : "NO");
        // manual roll → send the number; AUTO → omit the key
        if (!rs.rollAuto && rs.rollStart) {
          formData.append(`roll_start[${i}]`, rs.rollStart);
        }
        // custom student id ON → send prefix + start; OFF → omit
        if (rs.customStudentId) {
          formData.append(`student_id_prefix[${i}]`, rs.studentIdPrefix || "");
          formData.append(`student_id_start[${i}]`, rs.studentIdStart || "");
        }
        if (rs.file) {
          if (Platform.OS === "web") {
            const blob = await (await fetch(rs.file.uri)).blob();
            formData.append(`file[${i}]`, blob, rs.file.name);
          } else {
            formData.append(`file[${i}]`, {
              uri: rs.file.uri,
              type: rs.file.mimeType ?? "application/octet-stream",
              name: rs.file.name,
            } as any);
          }
        }
      }),
    );

    try {
      const res = await storeConfig(formData).unwrap();
      showMessage(
        "success",
        "Success",
        res?.payload?.data?.message ?? "Admission config applied.",
      );
      // storeAdmissionConfiguration invalidates the "FeeAmount" tag, which
      // fetchAdmissionConfiguration (Configured tab) also subscribes to, so
      // that tab refetches on its own — no local hand-off needed here.
      setRowState({});
    } catch (err) {
      const error = normalizeApiError(err);
      showMessage("error", "Error", error.message);
    }
  };

  const columns: TableColumn<GroupRow>[] = [
    {
      id: "select",
      name: "",
      width: 50,
      textAlign: "center",
      cellClassName: "justify-center items-center",
      headerRender: () => (
        <TouchableOpacity
          onPress={toggleSelectAll}
          disabled={groupRows.length === 0}
          className={`w-5 h-5 rounded border-2 items-center justify-center ${allSelected ? "bg-white border-white" : "border-white/70"}`}
        >
          {allSelected && (
            <Ionicons name="checkmark" size={12} color="#1e3a8a" />
          )}
        </TouchableOpacity>
      ),
      render: (item) => {
        const checked = !!rowState[item.group_id]?.selected;
        return (
          <TouchableOpacity
            onPress={() => patchRow(item.group_id, { selected: !checked })}
            className={`w-5 h-5 rounded border-2 items-center justify-center ${checked ? "bg-[#1e3a8a] border-[#1e3a8a]" : "border-slate-300 bg-white"}`}
          >
            {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
          </TouchableOpacity>
        );
      },
    },
    {
      id: "group_name",
      name: "Groups",
      minWidth: 130,
      flex: 1,
      cellClassName: "justify-center",
      render: (item) => (
        <Text className="capitalize text-gray-700">{item.group_name}</Text>
      ),
    },
    {
      id: "file",
      name: "Attach File",
      minWidth: 190,
      flex: 1.4,
      cellClassName: "justify-center",
      render: (item) => {
        const rs = rowState[item.group_id];
        const disabled = !rs?.selected;
        return (
          <TouchableOpacity
            onPress={() => pickFile(item.group_id)}
            disabled={disabled}
            className={`flex-row items-center border border-dashed rounded-lg px-3 h-9 ${disabled ? "border-slate-200 bg-slate-50 opacity-60" : "border-slate-300 bg-white"}`}
          >
            <Ionicons name="cloud-upload-outline" size={16} color="#64748b" />
            <Text
              className="ml-1.5 text-xs text-gray-500 flex-1"
              numberOfLines={1}
            >
              {rs?.file ? rs.file.name : "Choose File"}
            </Text>
          </TouchableOpacity>
        );
      },
    },
    {
      id: "start",
      name: "Start Datetime",
      minWidth: 245,
      flex: 2,
      cellClassName: "justify-center",
      render: (item) => {
        const rs = rowState[item.group_id];
        return (
          <CustomDateTimePicker
            mode="datetime"
            value={rs?.startDate}
            onChange={(d) => patchRow(item.group_id, { startDate: d })}
            placeholder="Start Date"
            disabled={!rs?.selected}
            textClassName="text-[11px]"
          />
        );
      },
    },
    {
      id: "end",
      name: "End Datetime",
      minWidth: 245,
      flex: 2,
      cellClassName: "justify-center",
      render: (item) => {
        const rs = rowState[item.group_id];
        return (
          <CustomDateTimePicker
            mode="datetime"
            value={rs?.endDate}
            onChange={(d) => patchRow(item.group_id, { endDate: d })}
            placeholder="End Date"
            disabled={!rs?.selected}
            textClassName="text-[11px]"
          />
        );
      },
    },
    {
      id: "roll_toggle",
      name: "Roll Start",
      width: 110,
      textAlign: "center",
      cellClassName: "justify-center items-center",
      render: (item) => {
        const rs = rowState[item.group_id];
        const auto = rs?.rollAuto ?? true;
        return (
          <View className="flex-row items-center gap-2">
            <Switch
              value={!auto}
              onValueChange={(v) => patchRow(item.group_id, { rollAuto: !v })}
              disabled={!rs?.selected}
            />
            <Text className="text-[11px] font-semibold text-gray-500">
              {auto ? "AUTO" : "MANUAL"}
            </Text>
          </View>
        );
      },
    },
    {
      id: "roll_start_no",
      name: "Roll Start No",
      minWidth: 150,
      flex: 1.1,
      cellClassName: "justify-center",
      render: (item) => {
        const rs = rowState[item.group_id];
        if (rs?.rollAuto ?? true)
          return <Text className="text-center text-gray-400">Auto</Text>;
        return (
          <ReusableInput
            value={rs?.rollStart ?? ""}
            onChangeText={(t) =>
              patchRow(item.group_id, { rollStart: t.replace(/[^0-9]/g, "") })
            }
            keyboardType="numeric"
            placeholder="Starting Roll"
            disabled={!rs?.selected}
            containerClass="mb-0"
          />
        );
      },
    },
    {
      id: "custom_student_id",
      name: "Custom Student ID",
      width: 130,
      textAlign: "center",
      cellClassName: "justify-center items-center",
      render: (item) => {
        const rs = rowState[item.group_id];
        const on = !!rs?.customStudentId;
        return (
          <View className="flex-row items-center gap-2">
            <Switch
              value={on}
              onValueChange={(v) =>
                patchRow(item.group_id, { customStudentId: v })
              }
              disabled={!rs?.selected}
            />
            <Text className="text-[11px] font-semibold text-gray-500">
              {on ? "ON" : "OFF"}
            </Text>
          </View>
        );
      },
    },
    {
      id: "student_id_prefix",
      name: "Student ID Prefix",
      minWidth: 150,
      flex: 1.1,
      cellClassName: "justify-center",
      render: (item) => {
        const rs = rowState[item.group_id];
        if (!rs?.customStudentId)
          return <Text className="text-center text-gray-400">Auto</Text>;
        return (
          <ReusableInput
            value={rs?.studentIdPrefix ?? ""}
            onChangeText={(t) =>
              patchRow(item.group_id, { studentIdPrefix: t })
            }
            placeholder="Student ID Prefix"
            disabled={!rs?.selected}
            containerClass="mb-0"
          />
        );
      },
    },
    {
      id: "student_id_start",
      name: "Student ID Start",
      minWidth: 150,
      flex: 1.1,
      cellClassName: "justify-center",
      render: (item) => {
        const rs = rowState[item.group_id];
        if (!rs?.customStudentId)
          return <Text className="text-center text-gray-400">Auto</Text>;
        return (
          <ReusableInput
            value={rs?.studentIdStart ?? ""}
            onChangeText={(t) =>
              patchRow(item.group_id, {
                studentIdStart: t.replace(/[^0-9]/g, ""),
              })
            }
            keyboardType="numeric"
            placeholder="Student ID Start"
            disabled={!rs?.selected}
            containerClass="mb-0"
          />
        );
      },
    },
    {
      id: "exam",
      name: "Exam",
      width: 110,
      textAlign: "center",
      cellClassName: "justify-center items-center",
      render: (item) => {
        const rs = rowState[item.group_id];
        return (
          <View className="flex-row items-center gap-2">
            <Switch
              value={!!rs?.examEnabled}
              onValueChange={(v) => patchRow(item.group_id, { examEnabled: v })}
              disabled={!rs?.selected}
            />
            <Text className="text-[11px] font-semibold text-gray-500">
              {rs?.examEnabled ? "YES" : "NO"}
            </Text>
          </View>
        );
      },
    },
    {
      id: "exam_date",
      name: "Exam Datetime",
      minWidth: 245,
      flex: 2,
      cellClassName: "justify-center",
      render: (item) => {
        const rs = rowState[item.group_id];
        if (!rs?.examEnabled)
          return <Text className="text-center text-gray-400">N/A</Text>;
        return (
          <CustomDateTimePicker
            mode="datetime"
            value={rs?.examDate}
            onChange={(d) => patchRow(item.group_id, { examDate: d })}
            placeholder="Exam Datetime"
            disabled={!rs?.selected}
            textClassName="text-[11px]"
          />
        );
      },
    },
  ];

  return (
    <View className="gap-4">
      <Legend title="Filter">
        <View className="flex-row flex-wrap gap-3">
          <View className="w-full sm:w-[calc(33.333%-8px)]">
            <SearchableSelect
              name="academic_year_id"
              control={control}
              label="Academic Year"
              options={academicYearOptions}
              placeholder={isLoadingMap ? "Loading..." : "Academic Year"}
              disabled={isLoadingMap}
              containerClassName="mb-0"
              textClassName="capitalize"
            />
          </View>
          <View className="w-full sm:w-[calc(33.333%-8px)]">
            <SearchableSelect
              name="department_id"
              control={control}
              label="Department"
              options={departmentOptions}
              placeholder="Department"
              disabled={!academicYearId}
              containerClassName="mb-0"
              textClassName="capitalize"
            />
          </View>
          <View className="w-full sm:w-[calc(33.333%-8px)]">
            <SearchableSelect
              name="class_id"
              control={control}
              label="Class"
              options={classOptions}
              placeholder="Class"
              disabled={!departmentId}
              containerClassName="mb-0"
              textClassName="capitalize"
            />
          </View>
          <View className="w-full sm:w-[calc(33.333%-8px)]">
            <SearchableSelect
              name="shift_id"
              control={control}
              label="Shift"
              options={shiftOptions}
              placeholder="Shift"
              disabled={!classId}
              containerClassName="mb-0"
              textClassName="capitalize"
            />
          </View>
          <View className="w-full sm:w-[calc(33.333%-8px)]">
            <SearchableSelect
              name="fee_head_id"
              control={control}
              label="Fee Head"
              options={feeHeadOptions}
              placeholder="Fee Head"
              disabled={!shiftId}
              containerClassName="mb-0"
              textClassName="capitalize"
            />
          </View>
          <View className="w-full sm:w-[calc(33.333%-8px)]">
            <Text className="mb-1.5 text-[13px] font-medium text-transparent">
              Search
            </Text>
            <ReusableButton
              title="Search"
              leftIcon={<Ionicons name="search-outline" size={16} color="#fff" />}
              isLoading={isLoadingGroups}
              onPress={handleSearch}
            />
          </View>
        </View>
      </Legend>

      <Legend title="Group Wise Apply">
        <View className="flex-row items-center justify-between mb-3">
          <ReusableButton
            title="Student Template"
            variant="primary"
            leftIcon={
              <Ionicons
                name="document-text-outline"
                size={16}
                color="#fff"
              />
            }
            isLoading={isDownloadingTemplate}
            onPress={handleDownloadTemplate}
          />
          <ReusableButton
            title="Apply"
            leftIcon={
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color="#fff"
              />
            }
            isLoading={isSubmitting}
            disabled={selectedRows.length === 0}
            onPress={handleApply}
          />
        </View>

        <ReusableTable
          columns={columns}
          data={groupRows}
          loading={isLoadingGroups}
          emptyMessage="Select Academic Year, Department, Class, Shift and Fee Head to see groups"
          showZebra
          showGridLines
          embedded
          extraData={rowState}
        />
      </Legend>
    </View>
  );
};

export default AdmissionConfigTab;
