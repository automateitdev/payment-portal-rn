import ReusableButton from "@/components/shared/Button/ReusableButton";
import Legend from "@/components/shared/Legend/Legend";
import ReusableModal from "@/components/shared/Modal/ReusableModal";
import ReusableTable, { TableColumn } from "@/components/shared/Table/ReusableTable";
import { CustomDateTimePicker } from "@/components/ui/CustomDateTimePicker";
import ReusableInput from "@/components/ui/ReusableInput";
import {
  AdmissionConfigurationRow,
  useBatchUpdateAdmissionConfigurationMutation,
  useFetchAdmissionConfigurationQuery,
} from "@/redux/api/autoenroll/admissionFeeConfigApi";
import { normalizeApiError } from "@/utils/errorNormalizer";
import { showMessage } from "@/utils/message";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Switch, Text, TouchableOpacity, View } from "react-native";

const FieldLabel = ({ text }: { text: string }) => (
  <Text className="mb-1 text-[12px] font-medium text-[#334155]">{text}</Text>
);

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const formatDisplayDateTime = (raw?: string | null) => {
  if (!raw) return "N/A";
  const d = new Date(raw.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return raw;
  let hours = d.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} At ${hours}:${minutes} ${ampm}`;
};

const formatDateTimeForSQL = (date?: Date) => {
  if (!date) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
};

const parseSQLDate = (raw?: string | null) => (raw ? new Date(raw.replace(" ", "T")) : undefined);

const ConfiguredTab: React.FC = () => {
  const { data, isFetching } = useFetchAdmissionConfigurationQuery();
  const [batchUpdate, { isLoading: isSaving }] = useBatchUpdateAdmissionConfigurationMutation();

  const [editing, setEditing] = useState<AdmissionConfigurationRow | null>(null);
  const [editStartDate, setEditStartDate] = useState<Date | undefined>();
  const [editEndDate, setEditEndDate] = useState<Date | undefined>();
  const [editRollStart, setEditRollStart] = useState("");
  const [editExamEnabled, setEditExamEnabled] = useState(false);
  const [editExamDate, setEditExamDate] = useState<Date | undefined>();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const openEdit = (item: AdmissionConfigurationRow) => {
    setEditing(item);
    setEditStartDate(parseSQLDate(item.start_date_time));
    setEditEndDate(parseSQLDate(item.end_date_time));
    setEditRollStart(item.roll_start ?? "");
    setEditExamEnabled(item.exam_enabled);
    setEditExamDate(parseSQLDate(item.exam_date_time));
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      const res = await batchUpdate({
        start_date_time: formatDateTimeForSQL(editStartDate),
        end_date_time: formatDateTimeForSQL(editEndDate),
        roll_start: editRollStart,
        exam_enabled: editExamEnabled,
        exam_date_time: editExamEnabled ? formatDateTimeForSQL(editExamDate) : null,
        payment_ids: editing.payment_ids,
      }).unwrap();
      showMessage("success", "Success", res?.payload?.data?.message ?? "Admission config updated.");
      setEditing(null);
    } catch (err) {
      const error = normalizeApiError(err);
      showMessage("error", "Error", error.message);
      setEditing(null);
    }
  };

  const columns: TableColumn<AdmissionConfigurationRow>[] = [
    {
      id: "edit",
      name: "Edit",
      width: 60,
      textAlign: "center",
      cellClassName: "justify-center items-center",
      render: (item) => (
        <TouchableOpacity onPress={() => openEdit(item)} className="h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
          <Ionicons name="create-outline" size={16} color="#1e3a8a" />
        </TouchableOpacity>
      ),
    },
    {
      id: "academic_year",
      name: "Academic Year",
      minWidth: 150,
      flex: 1,
      cellClassName: "justify-center",
      render: (i) => <Text className="capitalize text-gray-700">{i.academic_year}</Text>,
    },
    {
      id: "department",
      name: "Department",
      minWidth: 150,
      flex: 1,
      cellClassName: "justify-center",
      render: (i) => <Text className="capitalize text-gray-700">{i.department}</Text>,
    },
    {
      id: "class",
      name: "Class",
      minWidth: 130,
      flex: 0.9,
      cellClassName: "justify-center",
      render: (i) => <Text className="capitalize text-gray-700">{i.class}</Text>,
    },
    {
      id: "shift",
      name: "Shift",
      minWidth: 130,
      flex: 0.9,
      cellClassName: "justify-center",
      render: (i) => <Text className="capitalize text-gray-700">{i.shift}</Text>,
    },
    {
      id: "group",
      name: "Group",
      minWidth: 150,
      flex: 1,
      cellClassName: "justify-center",
      render: (i) => <Text className="capitalize text-gray-700">{i.group}</Text>,
    },
    {
      id: "start",
      name: "Start Date Time",
      minWidth: 200,
      flex: 1.4,
      cellClassName: "justify-center",
      render: (i) => <Text className="text-gray-700">{formatDisplayDateTime(i.start_date_time)}</Text>,
    },
    {
      id: "end",
      name: "End Date Time",
      minWidth: 200,
      flex: 1.4,
      cellClassName: "justify-center",
      render: (i) => <Text className="text-gray-700">{formatDisplayDateTime(i.end_date_time)}</Text>,
    },
    {
      id: "roll",
      name: "Roll Start At",
      minWidth: 140,
      flex: 1,
      cellClassName: "justify-center",
      render: (i) => <Text className="text-gray-700">{i.roll_start || "N/A"}</Text>,
    },
    {
      id: "exam",
      name: "Exam",
      width: 80,
      textAlign: "center",
      cellClassName: "justify-center items-center",
      render: (i) => <Text className="text-gray-700">{i.exam_enabled ? "YES" : "NO"}</Text>,
    },
    {
      id: "exam_date",
      name: "Exam Date Time",
      minWidth: 200,
      flex: 1.4,
      cellClassName: "justify-center",
      render: (i) => <Text className="text-gray-700">{i.exam_enabled ? formatDisplayDateTime(i.exam_date_time) : "N/A"}</Text>,
    },
  ];

  return (
    <Legend title="Configured">
      <ReusableTable
        columns={columns}
        data={data ?? []}
        loading={isFetching}
        emptyMessage="No Data Found"
        showZebra
        showGridLines
        embedded
        pagination={{
          currentPage,
          pageSize,
          onPageChange: setCurrentPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setCurrentPage(1);
          },
          rowsPerPageOptions: [15, 25, 50, 100],
        }}
      />

      <ReusableModal
        visible={!!editing}
        onClose={() => setEditing(null)}
        title="Update Admission Config"
        size="md"
        footerSlot={
          <View className="flex-row gap-2 justify-end w-full">
            <ReusableButton title="Cancel" variant="secondary" onPress={() => setEditing(null)} className="rounded-lg px-4 py-2 min-w-0" />
            <ReusableButton
              title="Save"
              leftIcon={<Ionicons name="save-outline" size={14} color="#fff" />}
              isLoading={isSaving}
              onPress={handleSave}
              className="rounded-lg px-4 py-2 min-w-0"
            />
          </View>
        }
      >
        {editing && (
          <View className="gap-3">
            <View className="flex-row flex-wrap gap-3">
              <View className="flex-1 min-w-[110px]">
                <FieldLabel text="Department" />
                <ReusableInput value={editing.department} disabled containerClass="mb-0" inputClass="capitalize" />
              </View>
              <View className="flex-1 min-w-[110px]">
                <FieldLabel text="Class" />
                <ReusableInput value={editing.class} disabled containerClass="mb-0" inputClass="capitalize" />
              </View>
              <View className="flex-1 min-w-[110px]">
                <FieldLabel text="Shift" />
                <ReusableInput value={editing.shift} disabled containerClass="mb-0" inputClass="capitalize" />
              </View>
            </View>
            <View className="flex-row flex-wrap gap-3">
              <View className="flex-1 min-w-[130px]">
                <FieldLabel text="Group" />
                <ReusableInput value={editing.group} disabled containerClass="mb-0" inputClass="capitalize" />
              </View>
              <View className="flex-1 min-w-[130px]">
                <FieldLabel text="Academic Year" />
                <ReusableInput value={editing.academic_year} disabled containerClass="mb-0" />
              </View>
            </View>

            <View>
              <FieldLabel text="Start Date Time" />
              <CustomDateTimePicker mode="datetime" value={editStartDate} onChange={setEditStartDate} placeholder="Start Date Time" />
            </View>
            <View>
              <FieldLabel text="End Date Time" />
              <CustomDateTimePicker mode="datetime" value={editEndDate} onChange={setEditEndDate} placeholder="End Date Time" />
            </View>
            <View>
              <FieldLabel text="Roll Start" />
              <ReusableInput
                value={editRollStart}
                onChangeText={(t) => setEditRollStart(t.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                containerClass="mb-0"
              />
            </View>
            <View className="flex-row items-center justify-between">
              <FieldLabel text="Is Exam Required?" />
              <Switch value={editExamEnabled} onValueChange={setEditExamEnabled} />
            </View>
            {editExamEnabled && (
              <View>
                <FieldLabel text="Exam Date Time" />
                <CustomDateTimePicker mode="datetime" value={editExamDate} onChange={setEditExamDate} placeholder="Exam Date Time" />
              </View>
            )}
          </View>
        )}
      </ReusableModal>
    </Legend>
  );
};

export default ConfiguredTab;
