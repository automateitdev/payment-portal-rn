import ReusableButton from "@/components/shared/Button/ReusableButton";
import Legend from "@/components/shared/Legend/Legend";
import ReusableModal from "@/components/shared/Modal/ReusableModal";
import ReusableTable, { TableColumn } from "@/components/shared/Table/ReusableTable";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  EnlistmentListItem,
  FullMapAdmissionFeeConfigRow,
  useDeleteEnlistmentListMutation,
  useFetchEnlistmentListQuery,
} from "@/redux/api/autoenroll/admissionFeeConfigApi";
import { normalizeApiError } from "@/utils/errorNormalizer";
import { showMessage } from "@/utils/message";
import { Ionicons } from "@expo/vector-icons";
import { skipToken } from "@reduxjs/toolkit/query";
import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Text, TouchableOpacity, View } from "react-native";

interface FilterForm {
  academic_year_id: string;
  department_id: string;
  class_id: string;
}

const EMPTY_DT_FILTERS = {
  academic_year: { value: "", matchMode: "contains" },
  department: { value: "", matchMode: "contains" },
  class: { value: "", matchMode: "contains" },
  shift: { value: "", matchMode: "contains" },
  group: { value: "", matchMode: "contains" },
  roll_start: { value: "", matchMode: "contains" },
  start_date_time: { value: "", matchMode: "contains" },
  end_date_time: { value: "", matchMode: "contains" },
  exam_enabled: { value: "", matchMode: "contains" },
  exam_date_time: { value: "", matchMode: "contains" },
};

interface Props {
  feeMap: FullMapAdmissionFeeConfigRow[];
}

const EnlistmentTab: React.FC<Props> = ({ feeMap }) => {
  const { control, watch, setValue } = useForm<FilterForm>({
    defaultValues: { academic_year_id: "", department_id: "", class_id: "" },
  });

  const academicYearId = watch("academic_year_id");
  const departmentId = watch("department_id");
  const classId = watch("class_id");

  const [searched, setSearched] = useState(false);
  const [searchParams, setSearchParams] = useState<{
    academic_year_id: string;
    department_id: string;
    class_id: string;
  } | null>(null);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmVisible, setConfirmVisible] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const academicYearOptions = useMemo(() => {
    const seen = new Map<string, string>();
    (feeMap ?? []).forEach((r) =>
      seen.set(String(r.academic_year_id), r.academic_year?.coresubcategories?.core_subcategory_name ?? String(r.academic_year_id)),
    );
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [feeMap]);

  const departmentOptions = useMemo(() => {
    if (!academicYearId) return [];
    const seen = new Map<string, string>();
    (feeMap ?? [])
      .filter((r) => String(r.academic_year_id) === academicYearId)
      .forEach((r) => seen.set(String(r.department_id), r.department?.name ?? String(r.department_id)));
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [feeMap, academicYearId]);

  const classOptions = useMemo(() => {
    if (!academicYearId || !departmentId) return [];
    const seen = new Map<string, string>();
    (feeMap ?? [])
      .filter((r) => String(r.academic_year_id) === academicYearId && String(r.department_id) === departmentId)
      .forEach((r) => seen.set(String(r.class_id), r.class?.core_subcategory_name ?? String(r.class_id)));
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [feeMap, academicYearId, departmentId]);

  const queryArgs = searchParams
    ? {
        academic_year_id: searchParams.academic_year_id,
        department_id: searchParams.department_id,
        class_id: searchParams.class_id,
        dt_params: {
          first: (currentPage - 1) * pageSize,
          rows: pageSize,
          sortField: null,
          sortOrder: null,
          filters: EMPTY_DT_FILTERS,
        },
      }
    : skipToken;

  const { data, isFetching } = useFetchEnlistmentListQuery(queryArgs);
  const [deleteEnlistment, { isLoading: isDeleting }] = useDeleteEnlistmentListMutation();

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  const toggleRow = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => {
    setSelected((prev) => {
      if (allChecked) {
        const next = new Set(prev);
        rows.forEach((r) => next.delete(r.id));
        return next;
      }
      const next = new Set(prev);
      rows.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const handleSearch = () => {
    setSearchParams({ academic_year_id: academicYearId, department_id: departmentId, class_id: classId });
    setCurrentPage(1);
    setSelected(new Set());
    setSearched(true);
  };

  const handleDelete = async () => {
    try {
      const formData = new FormData();
      Array.from(selected).forEach((id) => formData.append("ids[]", String(id)));
      const res = await deleteEnlistment(formData).unwrap();
      showMessage("success", "Success", res?.payload?.data?.message ?? "Selected records deleted.");
      setSelected(new Set());
      setConfirmVisible(false);
    } catch (err) {
      const error = normalizeApiError(err);
      showMessage("error", "Error", error.message);
      setConfirmVisible(false);
    }
  };

  const columns: TableColumn<EnlistmentListItem>[] = [
    {
      id: "select",
      name: "",
      width: 50,
      textAlign: "center",
      cellClassName: "justify-center items-center",
      headerRender: () => (
        <TouchableOpacity
          onPress={toggleAll}
          disabled={rows.length === 0}
          className={`w-5 h-5 rounded border-2 items-center justify-center ${allChecked ? "bg-white border-white" : "border-white/70"}`}
        >
          {allChecked && <Ionicons name="checkmark" size={12} color="#1e3a8a" />}
        </TouchableOpacity>
      ),
      render: (item) => {
        const checked = selected.has(item.id);
        return (
          <TouchableOpacity
            onPress={() => toggleRow(item.id)}
            className={`w-5 h-5 rounded border-2 items-center justify-center ${checked ? "bg-[#1e3a8a] border-[#1e3a8a]" : "border-slate-300 bg-white"}`}
          >
            {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
          </TouchableOpacity>
        );
      },
    },
    {
      id: "name",
      name: "Name",
      minWidth: 180,
      flex: 1.4,
      cellClassName: "justify-center",
      render: (i) => <Text className="capitalize text-gray-700">{i.name}</Text>,
    },
    {
      id: "board_application_id",
      name: "Application ID",
      minWidth: 150,
      flex: 1,
      cellClassName: "justify-center",
      render: (i) => <Text className="text-gray-700">{i.board_application_id}</Text>,
    },
    {
      id: "status",
      name: "Status",
      minWidth: 120,
      flex: 1,
      cellClassName: "justify-center",
      render: (i) => <Text className="capitalize text-gray-700">{i.status}</Text>,
    },
  ];

  return (
    <Legend title="Enlistment">
      <View className="flex-col sm:flex-row gap-3 items-start sm:items-end mb-3">
        <View className="w-full sm:flex-1">
          <SearchableSelect
            name="academic_year_id"
            control={control}
            label="Academic Year"
            options={academicYearOptions}
            placeholder="Academic Year"
            containerClassName="mb-0"
            textClassName="capitalize"
            onValueChange={() => {
              setValue("department_id", "");
              setValue("class_id", "");
            }}
          />
        </View>
        <View className="w-full sm:flex-1">
          <SearchableSelect
            name="department_id"
            control={control}
            label="Department"
            options={departmentOptions}
            placeholder="Department"
            disabled={!academicYearId}
            containerClassName="mb-0"
            textClassName="capitalize"
            onValueChange={() => setValue("class_id", "")}
          />
        </View>
        <View className="w-full sm:flex-1">
          <SearchableSelect name="class_id" control={control} label="Class" options={classOptions} placeholder="Class" disabled={!departmentId} containerClassName="mb-0" textClassName="capitalize" />
        </View>
        <ReusableButton
          title="Search"
          leftIcon={<Ionicons name="search" size={16} color="#fff" />}
          disabled={!academicYearId || !departmentId || !classId}
          isLoading={isFetching}
          onPress={handleSearch}
        />
      </View>

      <View className="flex-row justify-end mb-3">
        <ReusableButton
          title="Delete Selected"
          variant="danger"
          leftIcon={<Ionicons name="trash-outline" size={16} color="#fff" />}
          disabled={selected.size === 0}
          onPress={() => setConfirmVisible(true)}
        />
      </View>

      <ReusableTable
        columns={columns}
        data={rows}
        loading={isFetching}
        emptyMessage={searched ? "No Data!" : "Select Academic Year, Department and Class, then Search"}
        showZebra
        showGridLines
        embedded
        pagination={{
          currentPage,
          pageSize,
          totalRecords: total,
          onPageChange: setCurrentPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setCurrentPage(1);
          },
          rowsPerPageOptions: [25, 50, 100],
        }}
      />

      <ReusableModal
        visible={confirmVisible}
        onClose={() => setConfirmVisible(false)}
        title="Confirm Delete"
        size="sm"
        footerSlot={
          <View className="flex-row gap-3 justify-end w-full">
            <ReusableButton title="Cancel" variant="secondary" onPress={() => setConfirmVisible(false)} className="rounded-lg px-4 py-2 min-w-0" />
            <ReusableButton title="Yes, Delete" variant="danger" isLoading={isDeleting} onPress={handleDelete} className="rounded-lg px-4 py-2 min-w-0" />
          </View>
        }
      >
        <View className="items-center py-4">
          <Ionicons name="warning-outline" size={32} color="#ef4444" />
          <Text className="font-bold text-slate-800 mt-2">Delete {selected.size} selected record(s)?</Text>
        </View>
      </ReusableModal>
    </Legend>
  );
};

export default EnlistmentTab;
