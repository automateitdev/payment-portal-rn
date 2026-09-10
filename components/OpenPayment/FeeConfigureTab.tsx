import ReusableBadge from "@/components/shared/Badge/ReusableBadge";
import ReusableButton from "@/components/shared/Button/ReusableButton";
import ReusableModal from "@/components/shared/Modal/ReusableModal";
import ReusableInput from "@/components/ui/ReusableInput";
import { CustomDateTimePicker } from "@/components/ui/CustomDateTimePicker";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useGetGatewayListQuery } from "@/redux/api/accountmanagement/feesmanagement/feeMappingApi";
import {
  useCreateOpenPaymentSetupMutation,
  useGetFeesStartupQuery,
  useGetOpenPaymentRulesQuery,
} from "@/redux/api/openpayment/openPaymentApi";
import { normalizeApiError } from "@/utils/errorNormalizer";
import { showMessage } from "@/utils/message";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React, { useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import * as XLSX from "xlsx";

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

// Columns for the Fixed-Id student list template.
const STUDENT_TEMPLATE_COLUMNS = [
  "Student ID",
  "Name",
  "Mobile No.",
  "Academic Year",
  "Session",
  "Department",
  "Class",
  "Shift",
  "Group",
  "Note",
  "Fee (comma separated)",
];

type AmountItem = { amount: string; tag: string };

const FieldLabel = ({
  text,
  required,
}: {
  text: string;
  required?: boolean;
}) => (
  <Text className="mb-1.5 text-[13px] font-medium text-[#334155]">
    {text}
    {required && <Text className="text-red-500"> *</Text>}
  </Text>
);

const FeeConfigureTab = () => {
  const { control, watch, setValue } = useForm({
    defaultValues: {
      academic_year: "",
      rule_id: "",
      fee_head: "",
      note: "",
      ledger_id: "",
      fund_id: "",
      gateways: [{ gateway: "", account: "" }],
    },
  });

  const { fields: gatewayFields, append: appendGateway, remove: removeGateway } =
    useFieldArray({ control: control as any, name: "gateways" });

  const watchedGateways = watch("gateways" as any) as Array<{
    gateway: string;
    account: string;
  }>;

  const [startAt, setStartAt] = useState<Date | undefined>();
  const [endAt, setEndAt] = useState<Date | undefined>();
  const [amounts, setAmounts] = useState<AmountItem[]>([]);
  const [amountInput, setAmountInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [amountModalOpen, setAmountModalOpen] = useState(false);
  const [notice, setNotice] = useState<DocumentPicker.DocumentPickerAsset | null>(
    null,
  );
  const [studentList, setStudentList] = useState<any[]>([]);
  const [studentFileName, setStudentFileName] = useState<string>("");

  const rule_id = watch("rule_id");
  const academic_year = watch("academic_year");
  const fee_head = watch("fee_head");

  const isGatewayEnabled = !!academic_year && !!rule_id && !!fee_head?.trim();

  /* ------------------------------ data sources ------------------------------ */
  const { data: rulesRes } = useGetOpenPaymentRulesQuery();
  const { data: startupRes } = useGetFeesStartupQuery();
  const startup = startupRes?.payload?.data;

  const academicYearOptions = useMemo(
    () =>
      (startup?.academicYears || []).map((a: any) => ({
        label: a.core_subcategory_name,
        value: String(a.id),
      })),
    [startup],
  );
  const ruleOptions = useMemo(
    () =>
      (rulesRes?.payload?.data?.data || []).map((r: any) => ({
        label: r.title,
        value: String(r.id),
      })),
    [rulesRes],
  );
  const ledgerOptions = useMemo(
    () =>
      (startup?.ledger || [])
        .filter((l: any) => l.account_category?.name === "Income")
        .map((l: any) => ({
          label: l.name,
          value: String(l.id),
        })),
    [startup],
  );
  const fundOptions = useMemo(
    () =>
      (startup?.fund || []).map((f: any) => ({
        label: f.name,
        value: String(f.id),
      })),
    [startup],
  );

  const [createSetup, { isLoading: isSaving }] = useCreateOpenPaymentSetupMutation();

  const { data: gatewayRes } = useGetGatewayListQuery();
  const gatewayList: any[] = gatewayRes?.payload?.data?.gatewayList || [];

  const getGatewayOptions = (currentIndex: number) => {
    const usedElsewhere = (watchedGateways || [])
      .map((g, i) => (i !== currentIndex ? g.gateway : null))
      .filter(Boolean) as string[];
    return gatewayList
      .filter((g) => !usedElsewhere.includes(g.name))
      .map((g) => ({ label: g.name, value: g.name }));
  };

  const allGatewaysUsed =
    gatewayList.length > 0 && gatewayFields.length >= gatewayList.length;

  const getAccountOptions = (gatewayName: string) => {
    const gw = gatewayList.find((g) => g.name === gatewayName);
    return (gw?.accounts || []).map((a: any) => ({
      label: a.account_name,
      value: a.account_no,
    }));
  };

  // Whether the chosen rule needs an uploaded student list (e.g. Fixed Id).
  const requiresStudentList = useMemo(() => {
    const rule = (rulesRes?.payload?.data?.data || []).find(
      (r: any) => String(r.id) === rule_id,
    );
    return !!rule?.requires_student_list;
  }, [rulesRes, rule_id]);

  /* -------------------------------- handlers -------------------------------- */
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
      await FileSystem.writeAsStringAsync(uri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Sharing.shareAsync(uri, {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: "Student List Template",
      });
    } catch {
      showMessage("error", "Failed", "Could not generate the template.");
    }
  };

  const handleUploadExcel = async () => {
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
      const file = res.assets[0];

      let workbook: XLSX.WorkBook;
      if (Platform.OS === "web") {
        const buf = await (await fetch(file.uri)).arrayBuffer();
        workbook = XLSX.read(buf, { type: "array" });
      } else {
        const base64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        workbook = XLSX.read(base64, { type: "base64" });
      }

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
      if (rows.length === 0) {
        showMessage("warning", "Empty", "The uploaded file has no rows.");
        return;
      }
      setStudentList(rows);
      setStudentFileName(file.name);
      showMessage("success", "Uploaded", `${rows.length} students loaded.`);
    } catch {
      showMessage("error", "Failed", "Could not read the Excel file.");
    }
  };

  const openAmountModal = () => {
    setAmountInput("");
    setTagInput("");
    setAmountModalOpen(true);
  };

  const addAmount = () => {
    const amt = amountInput.trim();
    if (!amt || isNaN(Number(amt))) {
      showMessage("warning", "Attention", "Enter a valid amount.");
      return;
    }
    setAmounts((prev) => [...prev, { amount: amt, tag: tagInput.trim() }]);
    setAmountInput("");
    setTagInput("");
    setAmountModalOpen(false);
  };

  const removeAmount = (idx: number) =>
    setAmounts((prev) => prev.filter((_, i) => i !== idx));

  const pickNotice = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "application/pdf"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const file = res.assets[0];
      if (file.size && file.size > MAX_FILE_BYTES) {
        showMessage("error", "Too Large", "File must be 2 MB or smaller.");
        return;
      }
      setNotice(file);
    } catch {
      showMessage("error", "Failed", "Could not pick the file.");
    }
  };

  const formatDateTime = (date: Date) => {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
  };

  const handleSave = async () => {
    const values = watch();
    const yearLabel = academicYearOptions.find(
      (o) => o.value === values.academic_year,
    )?.label ?? values.academic_year;

    const disbursements = (watchedGateways || [])
      .filter((g) => g.gateway && g.account)
      .map((g) => {
        const gw = gatewayList.find((gl) => gl.name === g.gateway);
        const acc = (gw?.accounts || []).find(
          (a: any) => a.account_no === g.account,
        );
        return {
          gateway: gw?.type ?? g.gateway,
          account_ref: g.account,
          account_name: acc?.account_name ?? "",
          account_no: g.account,
        };
      });

    const formData = new FormData();
    formData.append("academic_year", yearLabel);
    formData.append("rule_type", values.rule_id);
    formData.append("fee_head", values.fee_head);
    formData.append("note", values.note);
    formData.append("ledger_id", values.ledger_id);
    formData.append("fund_id", values.fund_id);
    if (startAt) formData.append("start_at", formatDateTime(startAt));
    if (endAt) formData.append("end_at", formatDateTime(endAt));
    formData.append("amounts", JSON.stringify(
      amounts.map((a) => ({ amount: Number(a.amount), tag: a.tag })),
    ));
    formData.append("disbursements", JSON.stringify(disbursements));
    if (notice) {
      if (Platform.OS === "web") {
        const blob = await (await fetch(notice.uri)).blob();
        formData.append("guideline_doc", blob, notice.name);
      } else {
        formData.append("guideline_doc", {
          uri: notice.uri,
          type: notice.mimeType ?? "application/octet-stream",
          name: notice.name,
        } as any);
      }
    }

    try {
      const res = await createSetup(formData).unwrap();
      showMessage(
        "success",
        "Success",
        res?.payload?.data?.message ?? "Setup created successfully.",
      );
    } catch (err) {
      const error = normalizeApiError(err);
      showMessage("error", "Error", error.message);
    }
  };

  return (
    <View className="gap-5">
      {/* ───────── Fee Configure ───────── */}
      <View className="bg-white p-5 rounded-2xl border border-gray-100">
        <Text className="text-base font-black text-gray-800 mb-4">
          Fee Configure
        </Text>

        <View className="flex-col sm:flex-row gap-4">
          <View className="w-full sm:flex-1">
            <SearchableSelect
              name="academic_year"
              control={control}
              label="Academic Year *"
              options={academicYearOptions}
              placeholder="Select Academic Year"
            />
          </View>
          <View className="w-full sm:flex-1">
            <SearchableSelect
              name="rule_id"
              control={control}
              label="Rules *"
              options={ruleOptions}
              placeholder="Select Rule"
            />
          </View>
        </View>

        <View className="flex-col sm:flex-row gap-4 mt-1">
          <View className="w-full sm:flex-1">
            <FieldLabel text="Start at (Date and Time)" />
            <CustomDateTimePicker
              mode="datetime"
              value={startAt}
              onChange={setStartAt}
              placeholder="Select start date & time"
            />
          </View>
          <View className="w-full sm:flex-1">
            <FieldLabel text="End at (Date and Time)" />
            <CustomDateTimePicker
              mode="datetime"
              value={endAt}
              onChange={setEndAt}
              placeholder="Select end date & time"
            />
          </View>
        </View>

        {/* Student list (only when the rule requires it, e.g. Fixed Id) */}
        {requiresStudentList && (
          <View className="mt-2 border border-dashed border-emerald-300 bg-emerald-50/60 rounded-2xl p-4">
            <View className="flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color="#059669"
                  />
                  <Text className="ml-2 text-[15px] font-black text-emerald-700">
                    Student List (Excel)
                    <Text className="text-red-500"> *</Text>
                  </Text>
                </View>
                <Text className="text-xs text-gray-500 mt-1">
                  Download the template, fill student data and comma-separated
                  fees, then upload.
                </Text>
              </View>
              <ReusableButton
                title="Download Template"
                variant="outline"
                onPress={handleDownloadTemplate}
                className="border-emerald-500"
                textClassName="text-emerald-700"
                leftIcon={
                  <Ionicons name="download-outline" size={16} color="#047857" />
                }
              />
            </View>

            <View className="flex-row items-center gap-3 mt-3">
              <ReusableButton
                title="Upload Excel"
                variant="primary"
                onPress={handleUploadExcel}
                leftIcon={
                  <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                }
              />
              {studentFileName ? (
                <View className="flex-row items-center flex-1">
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color="#16a34a"
                  />
                  <Text
                    className="ml-1.5 text-[13px] text-gray-600 flex-1"
                    numberOfLines={1}
                  >
                    {studentFileName} ({studentList.length})
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
      </View>

      {/* ───────── Fee Head ───────── */}
      <View className="bg-white p-5 rounded-2xl border border-gray-100">
        <Text className="text-base font-black text-gray-800 mb-4">Fee Head</Text>

        <View className="flex-col sm:flex-row gap-4">
          <View className="w-full sm:flex-1">
            <FieldLabel text="Fee Head" required />
            <Controller
              control={control}
              name="fee_head"
              render={({ field: { value, onChange } }) => (
                <ReusableInput
                  value={value}
                  onChangeText={onChange}
                  placeholder="Fee Head"
                />
              )}
            />
          </View>
          <View className="w-full sm:flex-1">
            <FieldLabel text="Note" />
            <Controller
              control={control}
              name="note"
              render={({ field: { value, onChange } }) => (
                <ReusableInput
                  value={value}
                  onChangeText={onChange}
                  placeholder="Note"
                />
              )}
            />
          </View>
        </View>

        {/* Notice file */}
        <View className="mt-3">
          <FieldLabel text="Notice (optional: jpg, png, pdf · max 2MB)" />
          <TouchableOpacity
            onPress={pickNotice}
            className="flex-row items-center border border-dashed border-gray-300 rounded-lg px-4 h-[45px] bg-gray-50"
          >
            <Ionicons name="cloud-upload-outline" size={18} color="#64748b" />
            <Text className="ml-2 text-sm text-gray-500 flex-1" numberOfLines={1}>
              {notice ? notice.name : "Choose File"}
            </Text>
            {notice && (
              <TouchableOpacity onPress={() => setNotice(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

        {/* Amounts */}
        <View className="mt-3">
          <FieldLabel text="Amounts" />
          <ReusableButton
            title="Add Amount"
            variant="outline"
            onPress={openAmountModal}
            className="h-[45px]"
            leftIcon={<Ionicons name="add" size={16} color="#1e3a8a" />}
          />

          {amounts.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mt-3">
              {amounts.map((a, idx) => (
                <ReusableBadge
                  key={`${a.amount}-${idx}`}
                  variant="success"
                  appearance="soft"
                  size="md"
                  label={`${a.amount}${a.tag ? ` · ${a.tag}` : ""}`}
                  rightIcon={
                    <TouchableOpacity
                      onPress={() => removeAmount(idx)}
                      hitSlop={6}
                    >
                      <Ionicons name="close-circle" size={16} color="#059669" />
                    </TouchableOpacity>
                  }
                />
              ))}
            </View>
          )}
        </View>

        {/* Ledger + Fund */}
        <View className="flex-col sm:flex-row gap-4 mt-3">
          <View className="w-full sm:flex-1">
            <SearchableSelect
              name="ledger_id"
              control={control}
              label="Ledger"
              options={ledgerOptions}
              placeholder="Select Ledger"
            />
          </View>
          <View className="w-full sm:flex-1">
            <SearchableSelect
              name="fund_id"
              control={control}
              label="Fund"
              options={fundOptions}
              placeholder="Select Fund"
            />
          </View>
        </View>
      </View>

      {/* Add amount modal */}
      <ReusableModal
        visible={amountModalOpen}
        onClose={() => setAmountModalOpen(false)}
        title="Add Amount"
        size="xs"
        cancelButton={{
          label: "Cancel",
          variant: "ghost",
          onPress: () => setAmountModalOpen(false),
        }}
        confirmButton={{
          label: "Add",
          onPress: addAmount,
          className: "bg-lime-600 rounded-lg px-4 py-2 min-w-0",
          leftIcon: <Ionicons name="add" size={16} color="#ffffff" />,
        }}
      >
        <View className="gap-3">
          <View>
            <FieldLabel text="Amount" required />
            <ReusableInput
              value={amountInput}
              onChangeText={(t) => setAmountInput(t.replace(/[^0-9.]/g, ""))}
              inputType="number"
              placeholder="Amount"
            />
          </View>
          <View>
            <FieldLabel text="Tag" />
            <ReusableInput
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="Tag (e.g. Sub)"
            />
          </View>
        </View>
      </ReusableModal>

      {/* ───────── Gateway Configuration ───────── */}
      <View className="bg-white p-5 rounded-2xl border border-gray-100">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-base font-black text-gray-800">
            Gateway Configuration
            <Text className="text-red-500"> *</Text>
          </Text>
          <TouchableOpacity
            onPress={() => appendGateway({ gateway: "", account: "" } as any)}
            disabled={!isGatewayEnabled || allGatewaysUsed}
            className={`flex-row items-center border rounded-lg px-3 py-1.5 ${
              !isGatewayEnabled || allGatewaysUsed
                ? "border-slate-300 opacity-40"
                : "border-lime-600"
            }`}
          >
            <Ionicons
              name="add"
              size={14}
              color={!isGatewayEnabled || allGatewaysUsed ? "#94a3b8" : "#65a30d"}
            />
            <Text
              className={`ml-1 text-[13px] font-medium ${
                !isGatewayEnabled || allGatewaysUsed ? "text-slate-400" : "text-lime-700"
              }`}
            >
              Add New
            </Text>
          </TouchableOpacity>
        </View>

        <View className="gap-3">
          {gatewayFields?.map((field, index) => {
            const selectedGateway = watchedGateways?.[index]?.gateway ?? "";
            const accountOptions = getAccountOptions(selectedGateway);

            return (
              <View
                key={field.id}
                className="flex-col sm:flex-row gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100"
              >
                <View className="flex-1">
                  <SearchableSelect
                    name={`gateways.${index}.gateway` as any}
                    control={control as any}
                    label="Select Gateway *"
                    options={getGatewayOptions(index)}
                    placeholder="Select Gateway"
                    containerClassName="mb-0"
                    disabled={!isGatewayEnabled}
                    onValueChange={() =>
                      setValue(`gateways.${index}.account` as any, "")
                    }
                  />
                </View>
                <View className="flex-1">
                  <SearchableSelect
                    name={`gateways.${index}.account` as any}
                    control={control as any}
                    label="Select Gateway Account *"
                    options={accountOptions}
                    placeholder="Select Account"
                    containerClassName="mb-0"
                    disabled={!isGatewayEnabled || !selectedGateway}
                  />
                </View>
                {gatewayFields.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeGateway(index)}
                    className="self-end pb-1 pl-1"
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* ───────── Save ───────── */}
      <ReusableButton
        title={isSaving ? "Saving..." : "Save"}
        variant="primary"
        onPress={handleSave}
        disabled={isSaving}
        className="self-start"
        leftIcon={<Ionicons name="save-outline" size={16} color="#fff" />}
      />
    </View>
  );
};

export default FeeConfigureTab;
