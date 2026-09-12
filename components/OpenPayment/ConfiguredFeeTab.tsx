import ReusableBadge from "@/components/shared/Badge/ReusableBadge";
import ReusableButton from "@/components/shared/Button/ReusableButton";
import ReusableModal from "@/components/shared/Modal/ReusableModal";
import ReusableTable, { TableColumn } from "@/components/shared/Table/ReusableTable";
import ReusableInput from "@/components/ui/ReusableInput";
import { CustomDateTimePicker } from "@/components/ui/CustomDateTimePicker";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  useDeleteOpenPaymentStudentsMutation,
  useGetOpenPaymentSetupListQuery,
  useUpdateOpenPaymentStudentsMutation,
  useGetFeesStartupQuery,
  useUpdateOpenPaymentSetupMutation,
  useDeleteOpenPaymentSetupMutation,
  useAddOpenPaymentStudentsMutation,
} from "@/redux/api/openpayment/openPaymentApi";
import { useGetGatewayListQuery } from "@/redux/api/accountmanagement/feesmanagement/feeMappingApi";
import { normalizeApiError } from "@/utils/errorNormalizer";
import { showMessage } from "@/utils/message";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React, { useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { Dimensions, Text, TouchableOpacity, View, Image, Linking, ScrollView, Platform } from "react-native";
import * as XLSX from "xlsx";

const { height: screenHeight } = Dimensions.get("window");

const STUDENT_EDIT_FIELDS: { key: string; label: string }[] = [
  { key: "student_id", label: "Student ID" },
  { key: "name", label: "Name" },
  { key: "mobile", label: "Mobile" },
  { key: "academic_year", label: "Academic Year" },
  { key: "session", label: "Session" },
  { key: "department", label: "Department" },
  { key: "class", label: "Class" },
  { key: "roll", label: "Roll" },
  { key: "shift", label: "Shift" },
  { key: "group", label: "Group" },
  { key: "note", label: "Note" },
];

const STUDENT_COL_WIDTHS: Record<string, number> = {
  student_id: 130,
  name: 200,
  mobile: 130,
  academic_year: 130,
  session: 130,
  department: 140,
  class: 130,
  roll: 90,
  shift: 100,
  group: 150,
  note: 220,
};

const STUDENT_TEMPLATE_COLUMNS = [
  "Student ID",
  "Name",
  "Mobile No.",
  "Department",
  "Class",
  "Roll",
  "Shift",
  "Group",
  "Note",
  "Comma Separated Amounts",
  "Comma Separated Tags",
];

const FieldLabel = ({ text, required }: { text: string; required?: boolean }) => (
  <Text className="mb-1.5 text-[13px] font-medium text-[#334155]">
    {text}
    {required && <Text className="text-red-500"> *</Text>}
  </Text>
);

const ConfiguredFeeTab = () => {
  /* -------------------------------- states -------------------------------- */
  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [selectedSetup, setSelectedSetup] = useState<any | null>(null);
  const [editingStudents, setEditingStudents] = useState<any[]>([]);
  const [selectedStudentIndices, setSelectedStudentIndices] = useState<Set<number>>(new Set());
  const [noticeModalVisible, setNoticeModalVisible] = useState(false);
  const [selectedNoticeUrl, setSelectedNoticeUrl] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingSetupId, setEditingSetupId] = useState<number | string | null>(null);
  const [editNotice, setEditNotice] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [editAmounts, setEditAmounts] = useState<any[]>([]);
  const [editStartAt, setEditStartAt] = useState<Date | undefined>();
  const [editEndAt, setEditEndAt] = useState<Date | undefined>();
  const [showExcelUploader, setShowExcelUploader] = useState(false);
  const [addStudentModalVisible, setAddStudentModalVisible] = useState(false);
  const [newStudentsPreview, setNewStudentsPreview] = useState<any[]>([]);
  const [previewSelectedIndices, setPreviewSelectedIndices] = useState<Set<number>>(new Set());
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [setupToDelete, setSetupToDelete] = useState<number | string | null>(null);
  const [amountModalVisible, setAmountModalVisible] = useState(false);
  const [amountEditIdx, setAmountEditIdx] = useState<number | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [temporaryAmounts, setTemporaryAmounts] = useState<any[]>([]);

  const { control, reset, watch, setValue } = useForm({
    defaultValues: {
      note: "",
      ledger_id: "",
      fund_id: "",
      gateways: [{ gateway: "", account: "" }],
    },
  });

  const { fields: editGatewayFields, append: appendEditGateway, remove: removeEditGateway } =
    useFieldArray({ control: control as any, name: "gateways" });

  const watchedEditGateways = watch("gateways" as any) as Array<{
    gateway: string;
    account: string;
  }>;

  /* -------------------------------- queries -------------------------------- */
  const {
    data: setupListRes,
    isLoading: isListLoading,
    refetch: refetchList,
  } = useGetOpenPaymentSetupListQuery();

  const setupList: any[] = setupListRes?.payload?.data?.data || setupListRes?.payload?.data || [];

  const [updateStudents, { isLoading: isUpdatingStudents }] = useUpdateOpenPaymentStudentsMutation();
  const [deleteStudents, { isLoading: isDeletingStudent }] = useDeleteOpenPaymentStudentsMutation();
  const [updateSetup, { isLoading: isUpdatingSetup }] = useUpdateOpenPaymentSetupMutation();
  const [deleteSetup, { isLoading: isDeletingSetup }] = useDeleteOpenPaymentSetupMutation();
  const { data: startupRes } = useGetFeesStartupQuery();
  const startup = startupRes?.payload?.data;
  const { data: gatewayRes } = useGetGatewayListQuery();
  const gatewayList: any[] = gatewayRes?.payload?.data?.gatewayList || [];

  /* -------------------------------- options -------------------------------- */
  const ledgerOptions = useMemo(
    () => (startup?.ledger || []).filter((l: any) => l.account_category?.name === "Income").map((l: any) => ({ label: l.name, value: String(l.id) })),
    [startup]
  );
  const fundOptions = useMemo(
    () => (startup?.fund || []).map((f: any) => ({ label: f.name, value: String(f.id) })),
    [startup]
  );

  // id → display name lookups for the list table (Ledger / Fund columns)
  const ledgerNameById = useMemo(() => {
    const m = new Map<string, string>();
    (startup?.ledger || []).forEach((l: any) => m.set(String(l.id), l.name));
    return m;
  }, [startup]);
  const fundNameById = useMemo(() => {
    const m = new Map<string, string>();
    (startup?.fund || []).forEach((f: any) => m.set(String(f.id), f.name));
    return m;
  }, [startup]);

  const fmtAmount = (v: any) => {
    const n = Number(v);
    if (!isFinite(n)) return String(v ?? "");
    return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  };
  const allGatewaysUsed = gatewayList.length > 0 && editGatewayFields.length >= gatewayList.length;

  const getGatewayOptions = (currentIndex: number) => {
    const usedElsewhere = (watchedEditGateways || []).map((g, i) => (i !== currentIndex ? g.gateway : null)).filter(Boolean) as string[];
    return gatewayList.filter((g) => !usedElsewhere.includes(g.name)).map((g) => ({ label: g.name, value: g.name }));
  };

  const getAccountOptions = (gatewayName: string) => {
    const gw = gatewayList.find((g) => g.name === gatewayName);
    return (gw?.accounts || []).map((a: any) => ({ label: a.account_name, value: String(a.account_no) }));
  };

  /* -------------------------------- handlers -------------------------------- */
  const toggleStudentSelection = (idx: number) => {
    setSelectedStudentIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const updateStudentField = (idx: number, key: string, val: string) => {
    const updateFn = (prev: any[]) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    };

    if (studentModalVisible) {
      setEditingStudents(updateFn);
    } else if (addStudentModalVisible) {
      setNewStudentsPreview(updateFn);
    }
  };

  const togglePreviewSelection = (idx: number) => {
    setPreviewSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleSelectAllPreview = () => {
    setPreviewSelectedIndices((prev) =>
      prev.size === newStudentsPreview.length
        ? new Set()
        : new Set(newStudentsPreview.map((_, i) => i))
    );
  };

  const openAmountModal = (idx: number | null) => {
    setAmountEditIdx(idx);
    setAmountInput("");
    setTagInput("");
    
    // Initialize temporary amounts from the correct source
    if (idx !== null) {
      const source = studentModalVisible ? editingStudents : newStudentsPreview;
      setTemporaryAmounts([...(source[idx]?.amounts || [])]);
    } else {
      // For global edit modal amounts
      setTemporaryAmounts([...editAmounts]);
    }
    
    setAmountModalVisible(true);
  };

  const handleUpdateAmount = (amt: string, tag: string) => {
    setEditAmounts(prev => [...prev, { amount: amt, tag: tag.trim() }]);
  };

  const addStudentAmount = () => {
    const amt = amountInput.trim();
    if (!amt || isNaN(Number(amt))) {
      showMessage("warning", "Attention", "Enter a valid amount.");
      return;
    }
    // Only update temporary state
    setTemporaryAmounts(prev => [...prev, { amount: amt, tag: tagInput.trim() }]);
    setAmountInput("");
    setTagInput("");
  };

  const removeStudentAmount = (amtIdx: number) => {
    setTemporaryAmounts(prev => prev.filter((_, i) => i !== amtIdx));
  };

  const handleDoneAmounts = () => {
    if (amountEditIdx !== null) {
      const updateFn = (prev: any[]) => {
        const next = [...prev];
        if (next[amountEditIdx]) {
           const student = { ...next[amountEditIdx] };
           student.amounts = [...temporaryAmounts];
           next[amountEditIdx] = student;
        }
        return next;
      };

      if (studentModalVisible) {
        setEditingStudents(updateFn);
      } else if (addStudentModalVisible) {
        setNewStudentsPreview(updateFn);
      }
    } else {
      // Global edit context
      setEditAmounts([...temporaryAmounts]);
    }
    setAmountModalVisible(false);
  };

  const openStudentModal = (item: any) => {
    setSelectedSetup(item);
    setEditingStudents([...(item.students || [])]);
    setSelectedStudentIndices(new Set());
    setStudentModalVisible(true);
  };

  const openAddStudentModal = (item: any) => {
    setSelectedSetup(item);
    setNewStudentsPreview([]);
    setPreviewSelectedIndices(new Set());
    setAddStudentModalVisible(true);
  };

  const openEditModal = (item: any) => {
    setEditingSetupId(item.id);
    setEditAmounts(item.amounts || []);
    setEditStartAt(item.start_at ? new Date(item.start_at) : undefined);
    setEditEndAt(item.end_at ? new Date(item.end_at) : undefined);
    setSelectedSetup(item);
    reset({
      note: item.note || "",
      ledger_id: item.ledger_id ? String(item.ledger_id) : "",
      fund_id: item.fund_id ? String(item.fund_id) : "",
      gateways: (item.disbursements || []).map((d: any) => {
        const gwItem = gatewayList.find((g) => g.type === d.gateway || g.name === d.gateway);
        return { gateway: gwItem ? gwItem.name : d.gateway, account: String(d.account_no || d.account_ref || "") };
      }),
    });
    setEditNotice(null);
    setEditModalVisible(true);
  };

  const pickEditNotice = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ["image/jpeg", "image/png", "application/pdf"], copyToCacheDirectory: true, multiple: false });
      if (res.canceled || !res.assets?.[0]) return;
      setEditNotice(res.assets[0]);
    } catch {
      showMessage("error", "Failed", "Could not pick the file.");
    }
  };

  const removeEditAmount = (idx: number) => {
    setEditAmounts(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateStudents = async () => {
    if (!selectedSetup) return;
    const studentsToUpdate = editingStudents.map((s) => ({
      student_id: s.student_id,
      name: s.name,
      mobile: s.mobile ?? "",
      academic_year: s.academic_year,
      session: s.session,
      department: s.department,
      class: s.class,
      roll: s.roll ?? "",
      group: s.group,
      shift: s.shift,
      note: s.note,
      amounts: (s.amounts || []).map((a: any) => ({ amount: Number(a.amount), tag: a.tag ?? "" })),
    }));
    try {
      const res = await updateStudents({ id: selectedSetup.id, students: studentsToUpdate }).unwrap();
      showMessage("success", "Success", res?.payload?.data?.message || "Student data update completed");
      setStudentModalVisible(false);
      refetchList();
    } catch (err) {
      const error = normalizeApiError(err);
      showMessage("error", "Error", error.message);
    }
  };

  const handleDeleteStudent = async (idx: number) => {
    if (!selectedSetup) return;

    if (addStudentModalVisible) {
      setNewStudentsPreview((prev) => prev.filter((_, i) => i !== idx));
      return;
    }

    const student = editingStudents[idx];
    if (!student?.student_id) {
      setEditingStudents((prev) => prev.filter((_, i) => i !== idx));
      return;
    }
    try {
      await deleteStudents({ id: selectedSetup.id, students: [{ student_id: student.student_id }] }).unwrap();
      showMessage("success", "Success", "Student deleted successfully.");
      setEditingStudents((prev) => prev.filter((_, i) => i !== idx));
      setSelectedStudentIndices(new Set());
      refetchList();
    } catch (err) {
      const error = normalizeApiError(err);
      showMessage("error", "Error", error.message);
    }
  };

  const handleRemoveSelected = async () => {
    if (!selectedSetup || selectedStudentIndices.size === 0) return;
    const studentsToDelete = editingStudents.filter((_, idx) => selectedStudentIndices.has(idx)).filter(s => !!s.student_id).map(s => ({ student_id: s.student_id }));
    if (studentsToDelete.length > 0) {
      try {
        await deleteStudents({ id: selectedSetup.id, students: studentsToDelete }).unwrap();
      } catch (err) {
        const error = normalizeApiError(err);
        showMessage("error", "Error", error.message);
        return;
      }
    }
    setEditingStudents(prev => prev.filter((_, idx) => !selectedStudentIndices.has(idx)));
    setSelectedStudentIndices(new Set());
    showMessage("success", "Removed", "Selected students removed.");
    refetchList();
  };

  const handleUpdateConfiguration = async () => {
    if (!editingSetupId || !selectedSetup) return;
    const values: any = watch();
    const disbursements = (values.gateways || []).filter((g: any) => g.gateway && g.account).map((g: any) => {
      const gw = gatewayList.find((gl) => gl.name === g.gateway || gl.type === g.gateway);
      const acc = (gw?.accounts || []).find((a: any) => a.account_no === g.account);
      return { gateway: gw?.type ?? g.gateway, account_ref: g.account, account_name: acc?.account_name ?? "", account_no: g.account };
    });
    const formatDateTime = (date: Date) => {
      const p = (n: number) => String(n).padStart(2, "0");
      return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
    };
    const payload: any = { academic_year: String(selectedSetup.academic_year || ""), fee_head: selectedSetup.fee_head || "", rule_type: Number(selectedSetup.rule_type || 1), note: values.note, ledger_id: Number(values.ledger_id), fund_id: Number(values.fund_id), start_at: editStartAt ? formatDateTime(editStartAt) : undefined, end_at: editEndAt ? formatDateTime(editEndAt) : undefined, amounts: editAmounts.map((a) => ({ amount: Number(a.amount), tag: a.tag })), disbursements: disbursements };
    try {
      const res = await updateSetup({ id: editingSetupId, body: payload }).unwrap();
      showMessage("success", "Success", res?.payload?.data?.message || "Configuration updated successfully.");
      setEditModalVisible(false);
      refetchList();
    } catch (err) {
      const error = normalizeApiError(err);
      showMessage("error", "Error", error.message);
    }
  };

  const handleDeleteSetup = async () => {
    if (!setupToDelete) return;
    try {
      const res = await deleteSetup(setupToDelete).unwrap();
      showMessage("success", "Deleted", res?.payload?.data?.message || "Setup deleted successfully.");
      setDeleteModalVisible(false);
      refetchList();
    } catch (err) {
      const error = normalizeApiError(err);
      showMessage("error", "Error", error.message);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const ws = XLSX.utils.aoa_to_sheet([STUDENT_TEMPLATE_COLUMNS]);
      ws["!cols"] = STUDENT_TEMPLATE_COLUMNS.map(() => ({ wch: 18 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Students");
      const fileName = "open-payment-student-template.xlsx";
      if (Platform.OS === "web") {
        XLSX.writeFile(wb, fileName);
        return;
      }
      const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      const uri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(uri, { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", dialogTitle: "Student List Template" });
    } catch {
      showMessage("error", "Failed", "Could not generate the template.");
    }
  };

  const handleDownloadEdited = async (data: any[], fileNamePrefix: string) => {
    if (data.length === 0) {
      showMessage("warning", "No Data", "There is no data to download.");
      return;
    }
    try {
      const rows = data.map((s) => {
        const amountsArr = Array.isArray(s.amounts) ? s.amounts : [];
        const amtStr = amountsArr.map((a: any) => a.amount).join(",");
        const tagStr = amountsArr.map((a: any) => a.tag).join(",");

        return {
          "Student ID": s.student_id || "",
          "Name": s.name || "",
          "Mobile No.": s.mobile || "",
          "Department": s.department || "",
          "Class": s.class || "",
          "Roll": s.roll || "",
          "Shift": s.shift || "",
          "Group": s.group || "",
          "Note": s.note || "",
          "Comma Separated Amounts": amtStr,
          "Comma Separated Tags": tagStr,
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Edited Students");
      const fileName = `${fileNamePrefix}-${new Date().getTime()}.xlsx`;

      if (Platform.OS === "web") {
        XLSX.writeFile(wb, fileName);
        return;
      }
      const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      const uri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(uri, { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", dialogTitle: "Download Edited Data" });
    } catch (err) {
      showMessage("error", "Failed", "Could not export the edited data.");
    }
  };

  const handleUploadExcel = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"], copyToCacheDirectory: true, multiple: false });
      if (res.canceled || !res.assets?.[0]) return;
      const file = res.assets[0];
      let workbook: XLSX.WorkBook;
      if (Platform.OS === "web") {
        const buf = await (await fetch(file.uri)).arrayBuffer();
        workbook = XLSX.read(buf, { type: "array" });
      } else {
        const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
        workbook = XLSX.read(base64, { type: "base64" });
      }
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
      if (rawRows.length === 0) {
        showMessage("warning", "Empty", "The uploaded file has no rows.");
        return;
      }
      const mapped = rawRows.map((r: any) => {
        const amounts = String(r["Comma Separated Amounts"] || "").split(",").map(a => a.trim()).filter(Boolean).map(a => ({ amount: a, tag: "" }));
        const tags = String(r["Comma Separated Tags"] || "").split(",").map(t => t.trim()).filter(Boolean);
        const finalAmounts = amounts.map((a, i) => ({ ...a, tag: tags[i] || "" }));
        return {
          student_id: String(r["Student ID"] || r["student_id"] || ""),
          name: String(r["Name"] || r["name"] || ""),
          mobile: String(r["Mobile No."] || r["mobile"] || ""),
          academic_year: String(r["Academic Year"] || r["academic_year"] || ""),
          session: String(r["Session"] || r["session"] || ""),
          department: String(r["Department"] || r["department"] || ""),
          class: String(r["Class"] || r["class"] || ""),
          roll: String(r["Roll"] || r["roll"] || ""),
          shift: String(r["Shift"] || r["shift"] || ""),
          group: String(r["Group"] || r["group"] || ""),
          note: String(r["Note"] || r["note"] || ""),
          amounts: finalAmounts,
        };
      });
      setNewStudentsPreview(mapped);
      setPreviewSelectedIndices(new Set(mapped.map((_, i) => i))); // Select all by default
      showMessage("success", "Uploaded", `${mapped.length} students loaded for preview.`);
    } catch (err) {
      showMessage("error", "Failed", "Could not read the Excel file.");
    }
  };

  const [addStudentsApi, { isLoading: isAddingStudents }] = useAddOpenPaymentStudentsMutation();

  const handleImportNewStudents = async () => {
    if (!selectedSetup || previewSelectedIndices.size === 0) return;
    
    // Only send the selected students from the preview
    const studentsToPost = newStudentsPreview
      .filter((_, idx) => previewSelectedIndices.has(idx))
      .map(s => ({
        student_id: s.student_id,
        name: s.name,
        mobile: s.mobile ?? "",
        academic_year: s.academic_year,
        session: s.session,
        department: s.department,
        class: s.class,
        roll: s.roll ?? "",
        group: s.group,
        shift: s.shift,
        note: s.note,
        amounts: (s.amounts || []).map((a: any) => ({ 
          amount: Number(a.amount), 
          tag: a.tag ?? "" 
        })),
    }));

    const payload = {
        academic_year: String(selectedSetup.academic_year || ""),
        students: studentsToPost,
    };

    try {
      const res = await addStudentsApi({ id: selectedSetup.id, body: payload }).unwrap();
      showMessage("success", "Success", res?.payload?.data?.message || "Students processed successfully");
      setAddStudentModalVisible(false);
      refetchList();
    } catch (err) {
      const error = normalizeApiError(err);
      showMessage("error", "Error", error.message);
    }
  };

  /* -------------------------------- helpers -------------------------------- */
  const BRAND = "#0f8f7f"; // Edufee primary
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  // "2026-06-01T12:10:21Z" -> "01 Jun 2026, 06:10 pm"
  const fmtDT = (raw: string | null | undefined) => {
    if (!raw) return "—";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw);
    let h = d.getHours();
    const ampm = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${String(h).padStart(2, "0")}:${mm} ${ampm}`;
  };

  /* -------------------------------- columns -------------------------------- */
  const setupColumns: TableColumn<any>[] = [
    {
      id: "academic_year",
      name: "Academic Year",
      width: 90,
      textAlign: "center",
      cellClassName: "justify-center items-center",
      render: (item) => <Text className="text-gray-700">{item.academic_year || "—"}</Text>,
    },
    {
      id: "rule_type",
      name: "Rules",
      width: 80,
      textAlign: "center",
      cellClassName: "justify-center items-center",
      render: (item) => {
        const isAny = Number(item.rule_type) === 1;
        return (
          <ReusableBadge
            variant={isAny ? "info" : "success"}
            appearance="soft"
            size="xs"
            label={isAny ? "Any ID" : "Fixed ID"}
          />
        );
      },
    },
    {
      id: "start_at",
      name: "Start At",
      width: 130,
      cellClassName: "justify-center",
      render: (item) => (
        <Text className="text-[12px] text-gray-700">{fmtDT(item.start_at)}</Text>
      ),
    },
    {
      id: "end_at",
      name: "End At",
      width: 130,
      cellClassName: "justify-center",
      render: (item) => (
        <Text className="text-[12px] text-gray-700">{fmtDT(item.end_at)}</Text>
      ),
    },
    {
      id: "fee_head",
      name: "Fee Head",
      width: 150,
      cellClassName: "justify-center",
      render: (item) => (
        <View>
          <Text className="text-gray-800 font-bold">{item.fee_head || "—"}</Text>
          {!!item.note && (
            <Text className="text-[11px] text-gray-400 mt-0.5">
              Note : {item.note}
            </Text>
          )}
        </View>
      ),
    },
    {
      id: "ledger",
      name: "Ledger",
      width: 120,
      cellClassName: "justify-center",
      render: (item) => (
        <Text className="text-[12px]" style={{ color: BRAND }}>
          {ledgerNameById.get(String(item.ledger_id)) || "—"}
        </Text>
      ),
    },
    {
      id: "fund",
      name: "Fund",
      width: 120,
      cellClassName: "justify-center",
      render: (item) => (
        <Text className="text-[12px]" style={{ color: BRAND }}>
          {fundNameById.get(String(item.fund_id)) || "—"}
        </Text>
      ),
    },
    {
      id: "disbursements",
      name: "Disbursement A/C",
      minWidth: 200,
      cellClassName: "justify-center",
      render: (item) => (
        <View className="gap-1 items-start">
          {(item.disbursements || []).map((d: any, i: number) => (
            <View
              key={i}
              className="rounded-md px-2 py-1 border"
              style={{ borderColor: "#c7d2fe", backgroundColor: "#eef2ff" }}
            >
              <Text className="text-[11px] text-indigo-700">
                <Text className="font-bold">{d.gateway}</Text> –{" "}
                {d.account_ref || d.account_no || d.account_name}
              </Text>
            </View>
          ))}
        </View>
      ),
    },
    {
      id: "amounts",
      name: "Amount",
      minWidth: 150,
      cellClassName: "justify-center",
      render: (item) => {
        const amts: any[] = item.amounts || [];
        if (!amts.length)
          return (
            <Text className="text-[11px] italic text-gray-400">
              No amounts yet
            </Text>
          );
        return (
          <View className="flex-row flex-wrap gap-1">
            {amts.map((a: any, i: number) => (
              <ReusableBadge
                key={i}
                variant="info"
                appearance="soft"
                size="xs"
                label={`${fmtAmount(a.amount)}${a.tag ? ` · ${a.tag}` : ""}`}
              />
            ))}
          </View>
        );
      },
    },
    {
      id: "students",
      name: "Enlisted Data",
      width: 170,
      textAlign: "center",
      cellClassName: "justify-center items-center",
      render: (item) => {
        if (Number(item.rule_type) === 1) {
          return <Text className="text-gray-400">—</Text>;
        }
        const count = item.students?.length ?? 0;
        return (
          <View className="gap-2 items-center py-2">
            {count > 0 && (
              <TouchableOpacity
                onPress={() => openStudentModal(item)}
                className="flex-row items-center px-3 py-1.5 rounded-md"
                style={{ backgroundColor: BRAND }}
              >
                <Ionicons name="grid-outline" size={12} color="#fff" />
                <Text className="text-[11px] font-bold text-white ml-1">
                  Show Excel Data ({count})
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => openAddStudentModal(item)}
              className="flex-row items-center px-3 py-1.5 rounded-md"
              style={{ backgroundColor: BRAND }}
            >
              <Ionicons name="add-circle-outline" size={12} color="#fff" />
              <Text className="text-[11px] font-bold text-white ml-1">
                Add Student
              </Text>
            </TouchableOpacity>
          </View>
        );
      },
    },
    {
      id: "status",
      name: "Status",
      width: 90,
      textAlign: "center",
      cellClassName: "justify-center items-center",
      render: (item) => (
        <ReusableBadge
          variant={item.status ? "success" : "warning"}
          appearance="soft"
          size="xs"
          label={item.status ? "Active" : "Inactive"}
        />
      ),
    },
    {
      id: "notice",
      name: "Notice",
      width: 70,
      textAlign: "center",
      cellClassName: "justify-center items-center",
      render: (item) =>
        item.guideline_doc_url ? (
          <TouchableOpacity
            onPress={() => {
              setSelectedNoticeUrl(item.guideline_doc_url);
              setNoticeModalVisible(true);
            }}
            className="h-8 w-8 items-center justify-center rounded-md"
            style={{ backgroundColor: "#e0f2fe" }}
          >
            <Ionicons name="document-text-outline" size={16} color="#0369a1" />
          </TouchableOpacity>
        ) : (
          <Text className="text-gray-400">—</Text>
        ),
    },
    {
      id: "action",
      name: "Action",
      width: 130,
      cellClassName: "justify-center items-center",
      render: (item) => (
        <View className="flex-row gap-1.5">
          <TouchableOpacity
            onPress={() => openEditModal(item)}
            className="flex-row items-center px-2.5 py-1.5 rounded-md"
            style={{ backgroundColor: "#0e7490" }}
          >
            <Ionicons name="create-outline" size={13} color="#fff" />
            <Text className="text-[11px] font-bold text-white ml-1">Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setSetupToDelete(item.id);
              setDeleteModalVisible(true);
            }}
            className="flex-row items-center px-2.5 py-1.5 rounded-md"
            style={{ backgroundColor: "#dc2626" }}
          >
            <Ionicons name="trash-outline" size={13} color="#fff" />
            <Text className="text-[11px] font-bold text-white ml-1">Delete</Text>
          </TouchableOpacity>
        </View>
      ),
    },
  ];

  /* ---------------- student table columns ---------------- */
  const allStudentsSelected = editingStudents.length > 0 && selectedStudentIndices.size === editingStudents.length;

  const toggleSelectAllStudents = () => {
    setSelectedStudentIndices((prev) => prev.size === editingStudents.length ? new Set() : new Set(editingStudents.map((_, i) => i)));
  };

  const studentColumns: TableColumn<any>[] = [
    {
      id: "select",
      name: "",
      width: 56,
      textAlign: "center",
      cellClassName: "justify-center items-center",
      headerRender: () => (
        <TouchableOpacity onPress={toggleSelectAllStudents} className={`w-5 h-5 rounded border-2 items-center justify-center ${allStudentsSelected ? "bg-white border-white" : "border-white/70"}`}>
          {allStudentsSelected && <Ionicons name="checkmark" size={12} color="#1e3a8a" />}
        </TouchableOpacity>
      ),
      render: (_student, idx) => {
        const isSelected = selectedStudentIndices.has(idx);
        return (
          <TouchableOpacity onPress={() => toggleStudentSelection(idx)} className={`w-5 h-5 rounded border-2 items-center justify-center ${isSelected ? "bg-[#1e3a8a] border-[#1e3a8a]" : "border-slate-300 bg-white"}`}>
            {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
          </TouchableOpacity>
        );
      },
    },
    {
      id: "sl",
      name: "SL",
      width: 50,
      textAlign: "center",
      cellClassName: "justify-center items-center",
      render: (_student, idx) => <Text className="text-center text-gray-700">{idx + 1}</Text>,
    },
    ...STUDENT_EDIT_FIELDS.map((f): TableColumn<any> => ({
      id: f.key,
      name: f.label,
      width: STUDENT_COL_WIDTHS[f.key] ?? 150,
      cellClassName: "justify-center",
      render: (student, idx) => <ReusableInput value={String(student[f.key] ?? "")} onChangeText={(val) => updateStudentField(idx, f.key, val)} placeholder={f.label} containerClass="mb-0" inputClass="text-[12px] h-8" />,
    })),
    {
      id: "amount",
      name: "Amount",
      width: 180,
      cellClassName: "justify-center",
      render: (student, idx) => {
        const amts: any[] = student.amounts || [];
        return (
          <View className="gap-1 items-start">
            <TouchableOpacity onPress={() => openAmountModal(idx)} className="flex-row items-center px-2 py-0.5 rounded border border-[#1e3a8a]">
              <Ionicons name="add" size={12} color="#1e3a8a" /><Text className="text-[10px] font-bold text-[#1e3a8a] ml-1">Add</Text>
            </TouchableOpacity>
            {amts.map((a: any, i: number) => <ReusableBadge key={i} variant="success" appearance="soft" size="xs" label={`${a.amount}${a.tag ? ` · ${a.tag}` : ""}`} />)}
          </View>
        );
      },
    },
    {
      id: "action",
      name: "Del",
      width: 50,
      textAlign: "center",
      render: (_student, idx) => <TouchableOpacity onPress={() => handleDeleteStudent(idx)} className="h-7 w-7 items-center justify-center rounded bg-red-50"><Ionicons name="trash-outline" size={16} color="#ef4444" /></TouchableOpacity>,
    },
  ];

  /* -------------------------------- render -------------------------------- */
  return (
    <View className="gap-4">
      <ReusableTable columns={setupColumns} data={setupList} loading={isListLoading} emptyMessage="No configurations found" showZebra showGridLines fitToWidth />

      {/* Configuration Edit Modal */}
      <ReusableModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        title="Edit Configuration"
        size="lg"
        footerSlot={
          <View className="flex-row gap-2 justify-end w-full">
            <ReusableButton title="Cancel" variant="secondary" onPress={() => setEditModalVisible(false)} className="rounded-lg px-4 py-2 min-w-0" />
            <ReusableButton title="Update" variant="primary" isLoading={isUpdatingSetup} onPress={handleUpdateConfiguration} className="rounded-lg px-4 py-2 min-w-0" leftIcon={<Ionicons name="save-outline" size={14} color="#fff" />} />
          </View>
        }
      >
        <ScrollView className="max-h-[500px]" showsVerticalScrollIndicator={false}>
          <View className="gap-4 py-2">
            <View><FieldLabel text="Note" /><Controller control={control} name="note" render={({ field: { value, onChange } }) => <ReusableInput value={value} onChangeText={onChange} placeholder="Note" containerClass="mb-0" />} /></View>
            <View className="flex-row gap-4">
              <View className="flex-1"><SearchableSelect name="ledger_id" control={control} label="Ledger" options={ledgerOptions} placeholder="Select Ledger" /></View>
              <View className="flex-1"><SearchableSelect name="fund_id" control={control} label="Fund" options={fundOptions} placeholder="Select Fund" /></View>
            </View>
            <View>
              <View className="flex-row items-center justify-between mb-2">
                <FieldLabel text="Gateway Configuration" required />
                <TouchableOpacity onPress={() => appendEditGateway({ gateway: "", account: "" } as any)} disabled={allGatewaysUsed} className={`flex-row items-center border rounded-lg px-2 py-1 ${allGatewaysUsed ? "border-slate-300 opacity-40" : "border-lime-600"}`}>
                  <Ionicons name="add" size={14} color={allGatewaysUsed ? "#94a3b8" : "#65a30d"} /><Text className={`ml-1 text-[12px] font-medium ${allGatewaysUsed ? "text-slate-400" : "text-lime-700"}`}>Add New</Text>
                </TouchableOpacity>
              </View>
              <View className="gap-3">
                {editGatewayFields?.map((field, index) => {
                  const selectedGateway = watchedEditGateways?.[index]?.gateway ?? "";
                  return (
                    <View key={field.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex-row gap-3">
                        <View className="flex-1"><SearchableSelect name={`gateways.${index}.gateway` as any} control={control as any} label="Gateway" options={getGatewayOptions(index)} placeholder="Gateway" onValueChange={() => setValue(`gateways.${index}.account` as any, "")} /></View>
                        <View className="flex-1"><SearchableSelect name={`gateways.${index}.account` as any} control={control as any} label="Account" options={getAccountOptions(selectedGateway)} placeholder="Account" disabled={!selectedGateway} /></View>
                        {editGatewayFields.length > 1 && <TouchableOpacity onPress={() => removeEditGateway(index)} className="self-end pb-1"><Ionicons name="trash-outline" size={18} color="#ef4444" /></TouchableOpacity>}
                    </View>
                  );
                })}
              </View>
            </View>
            <View className="flex-row gap-4">
              <View className="flex-1"><FieldLabel text="Start at" /><CustomDateTimePicker mode="datetime" value={editStartAt} onChange={setEditStartAt} placeholder="Start date" /></View>
              <View className="flex-1"><FieldLabel text="End at" /><CustomDateTimePicker mode="datetime" value={editEndAt} onChange={setEditEndAt} placeholder="End date" /></View>
            </View>
            <View>
              <View className="flex-row justify-between items-center mb-1.5"><FieldLabel text="Amounts" /><TouchableOpacity onPress={() => openAmountModal(null)} className="flex-row items-center"><Ionicons name="add-circle" size={16} color="#1e3a8a" /><Text className="text-[12px] font-bold text-[#1e3a8a] ml-1">Add</Text></TouchableOpacity></View>
              <View className="flex-row flex-wrap gap-2">{editAmounts.map((a: any, i: number) => <ReusableBadge key={i} variant="success" appearance="soft" size="md" label={`${a.amount}${a.tag ? ` · ${a.tag}` : ""}`} rightIcon={<TouchableOpacity onPress={() => removeEditAmount(i)} hitSlop={6}><Ionicons name="close-circle" size={16} color="#059669" /></TouchableOpacity>} />)}</View>
            </View>
          </View>
        </ScrollView>
      </ReusableModal>

      {/* Student List (Enlisted) Modal */}
      <ReusableModal
        visible={studentModalVisible}
        onClose={() => setStudentModalVisible(false)}
        title={`Enlisted Students (${editingStudents.length})`}
        subtitle={selectedSetup ? `Fee Head: ${selectedSetup.fee_head}` : undefined}
        size="xl"
        scrollable={false}
        footerSlot={
          <View className="flex-row items-center justify-between w-full">
            <View className="flex-row items-center gap-3">
              <Text className="text-[12px] text-slate-400">
                {selectedStudentIndices.size > 0
                  ? `${selectedStudentIndices.size} selected`
                  : "Preview & Edit Mode"}
              </Text>
              <ReusableButton
                title="Download Edited"
                variant="outline"
                onPress={() => handleDownloadEdited(editingStudents, "enlisted-students")}
                className="border-indigo-500 h-9 px-3"
                textClassName="text-indigo-700 text-xs"
                leftIcon={<Ionicons name="download-outline" size={16} color="#4338ca" />}
              />
              {selectedStudentIndices.size > 0 && (
                <ReusableButton
                  title="Remove Selected"
                  variant="outline"
                  onPress={handleRemoveSelected}
                  className="border-red-500 rounded-lg h-9 px-3"
                  textClassName="text-red-700 text-xs"
                  leftIcon={<Ionicons name="trash-outline" size={14} color="#ef4444" />}
                />
              )}
            </View>
            <View className="flex-row gap-2">
              <ReusableButton
                title="Cancel"
                variant="secondary"
                onPress={() => setStudentModalVisible(false)}
                className="rounded-lg px-4 py-2 min-w-0"
              />
              <ReusableButton
                title="Update Changes"
                variant="primary"
                isLoading={isUpdatingStudents}
                onPress={handleUpdateStudents}
                className="rounded-lg px-4 py-2 min-w-0"
                leftIcon={<Ionicons name="save-outline" size={14} color="#fff" />}
              />
            </View>
          </View>
        }
      >
        <ReusableTable
          embedded
          bodyHeight={Math.min(400, screenHeight * 0.55)}
          columns={studentColumns}
          data={editingStudents}
          emptyMessage="No students enlisted"
          showZebra
          showGridLines
          extraData={{
            students: editingStudents,
            selected: Array.from(selectedStudentIndices),
          }}
        />
      </ReusableModal>

      {/* Add More Student (Excel Upload) Modal */}
      <ReusableModal
        visible={addStudentModalVisible}
        onClose={() => setAddStudentModalVisible(false)}
        title="Add Students (Import Excel)"
        subtitle={selectedSetup ? `Fee Head: ${selectedSetup.fee_head}` : undefined}
        size="xl"
        scrollable={false}
        footerSlot={
          <View className="flex-row items-center justify-between w-full">
            <Text className="text-xs text-gray-400">
              {previewSelectedIndices.size > 0 ? `${previewSelectedIndices.size} selected for import` : "Select students to import"}
            </Text>
            <View className="flex-row gap-2">
              <ReusableButton
                title="Download Edited"
                variant="outline"
                onPress={() => handleDownloadEdited(newStudentsPreview, "new-students-import")}
                className="border-indigo-500 h-9 px-4 rounded-lg min-w-0"
                textClassName="text-indigo-700 text-xs"
                leftIcon={<Ionicons name="download-outline" size={14} color="#4338ca" />}
              />
              <ReusableButton
                title="Cancel"
                variant="secondary"
                onPress={() => setAddStudentModalVisible(false)}
                className="rounded-lg px-4 py-2 min-w-0"
              />
              <ReusableButton
                title="Import & Save"
                variant="primary"
                isLoading={isAddingStudents}
                onPress={handleImportNewStudents}
                disabled={previewSelectedIndices.size === 0}
                className="rounded-lg px-4 py-2 min-w-0 bg-emerald-600 border-0"
                leftIcon={<Ionicons name="cloud-upload-outline" size={14} color="#fff" />}
              />
            </View>
          </View>
        }
      >
        <View className="mx-4 mt-2 mb-4 border border-dashed border-emerald-300 bg-emerald-50/60 rounded-2xl p-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <View className="flex-row items-center">
                <Ionicons name="document-text-outline" size={18} color="#059669" />
                <Text className="ml-2 text-[15px] font-black text-emerald-700">Student List (Excel)</Text>
              </View>
              <Text className="text-xs text-gray-500 mt-1">First upload excel, then select students to import.</Text>
            </View>
            <ReusableButton title="Download Template" variant="outline" onPress={handleDownloadTemplate} className="border-emerald-500 h-9 px-3" textClassName="text-emerald-700 text-xs" leftIcon={<Ionicons name="download-outline" size={16} color="#047857" />} />
          </View>

          <View className="flex-row items-center gap-3 mt-3">
            <ReusableButton title="Choose Excel File" variant="primary" onPress={handleUploadExcel} className="h-9 px-4 bg-emerald-600 border-0" textClassName="text-xs" leftIcon={<Ionicons name="attach-outline" size={16} color="#fff" />} />
            {newStudentsPreview.length > 0 && (
              <TouchableOpacity onPress={() => { setNewStudentsPreview([]); setPreviewSelectedIndices(new Set()); }} className="px-2 py-1 flex-row items-center">
                <Ionicons name="refresh-outline" size={14} color="#ef4444" />
                <Text className="text-xs text-red-500 ml-1">Clear List</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {newStudentsPreview.length > 0 ? (
          <ReusableTable
            embedded
            bodyHeight={Math.min(300, screenHeight * 0.45)}
            columns={[
              {
                id: "select_preview",
                name: "",
                width: 50,
                textAlign: "center",
                headerRender: () => (
                   <TouchableOpacity 
                    onPress={toggleSelectAllPreview} 
                    className={`w-5 h-5 rounded border-2 items-center justify-center ${previewSelectedIndices.size === newStudentsPreview.length ? "bg-white border-white" : "border-white/70"}`}
                   >
                     {previewSelectedIndices.size === newStudentsPreview.length && <Ionicons name="checkmark" size={12} color="#1e3a8a" />}
                   </TouchableOpacity>
                ),
                render: (_, idx) => {
                  const isS = previewSelectedIndices.has(idx);
                  return (
                    <TouchableOpacity 
                      onPress={() => togglePreviewSelection(idx)} 
                      className={`w-5 h-5 rounded border-2 items-center justify-center ${isS ? "bg-[#1e3a8a] border-[#1e3a8a]" : "border-slate-300 bg-white"}`}
                    >
                      {isS && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </TouchableOpacity>
                  );
                }
              },
              ...studentColumns.filter(c => c.id !== 'select')
            ]}
            data={newStudentsPreview}
            emptyMessage="No data"
            showZebra
            showGridLines
          />
        ) : (
          <View className="flex-1 items-center justify-center p-10">
             <Ionicons name="cloud-upload-outline" size={48} color="#cbd5e1" />
             <Text className="text-slate-400 mt-2">Upload an Excel file to see preview and select</Text>
          </View>
        )}
      </ReusableModal>

      {/* Amount Edit Modal */}
      <ReusableModal visible={amountModalVisible} onClose={() => setAmountModalVisible(false)} title="Amounts" size="sm" footerSlot={<View className="flex-row justify-end w-full"><ReusableButton title="Done" variant="primary" onPress={handleDoneAmounts} className="rounded-lg px-4 py-2" /></View>}>
        <View className="gap-3">
          <View className="flex-row gap-2 items-end"><View className="flex-1"><Text className="text-[11px] mb-0.5">Amount</Text><ReusableInput value={amountInput} onChangeText={(t) => setAmountInput(t.replace(/[^0-9.]/g, ""))} keyboardType="numeric" placeholder="Amount" /></View><View className="flex-1"><Text className="text-[11px] mb-0.5">Tag</Text><ReusableInput value={tagInput} onChangeText={setTagInput} placeholder="Tag" /></View><ReusableButton title="Add" onPress={addStudentAmount} className="bg-lime-600 h-[42px] px-3" /></View>
          
          <View className="flex-row flex-wrap gap-2">
            {temporaryAmounts.map((a: any, i: number) => (
              <ReusableBadge 
                key={i} 
                variant="success" 
                appearance="soft" 
                size="md" 
                label={`${a.amount}${a.tag ? ` · ${a.tag}` : ""}`} 
                rightIcon={
                  <TouchableOpacity onPress={() => removeStudentAmount(i)} hitSlop={6}>
                    <Ionicons name="close-circle" size={16} color="#059669" />
                  </TouchableOpacity>
                } 
              />
            ))}
            {temporaryAmounts.length === 0 && <Text className="text-xs text-slate-400 italic">No amounts added yet</Text>}
          </View>
        </View>
      </ReusableModal>

      {/* Setup Delete Modal */}
      <ReusableModal visible={deleteModalVisible} onClose={() => setDeleteModalVisible(false)} title="Confirm Delete" size="sm" footerSlot={<View className="flex-row gap-3 justify-end w-full"><ReusableButton title="Cancel" variant="secondary" onPress={() => setDeleteModalVisible(false)} /><ReusableButton title="Delete" variant="primary" isLoading={isDeletingSetup} onPress={handleDeleteSetup} className="bg-red-600" /></View>}><View className="items-center py-4"><Ionicons name="warning-outline" size={32} color="#ef4444" /><Text className="font-bold text-slate-800 mt-2">Are you sure?</Text></View></ReusableModal>

      {/* Notice Preview Modal */}
      <ReusableModal visible={noticeModalVisible} onClose={() => setNoticeModalVisible(false)} title="Notice Guideline" size="lg">
        {selectedNoticeUrl ? (<View className="items-center"><Image source={{ uri: selectedNoticeUrl }} style={{ width: "100%", height: 350, borderRadius: 8 }} resizeMode="contain" /><TouchableOpacity onPress={() => Linking.openURL(selectedNoticeUrl)} className="mt-4"><Text className="text-indigo-700 font-bold underline">Download File</Text></TouchableOpacity></View>) : (<Text className="text-center text-gray-500">No content</Text>)}
      </ReusableModal>
    </View>
  );
};
export default ConfiguredFeeTab;
