import AdmissionEditModal from "@/components/autoenroll/AdmissionEditModal";

import { useFetchFullMapAdmissionFeeConfigQuery } from "@/redux/allApi/autoenroll/admissionFeeConfigApi";
import {
  useGetAdmissionDataQuery,
  useGetAdmissionPreviewQuery,
} from "@/redux/allApi/autoenroll/admissionDataApi";
import {
  useGetAdmissionPaymentInvoiceQuery,
  useLazyGetAdmissionPaymentInvoiceQuery,
  useSendAdmissionPaymentMutation,
} from "@/redux/allApi/autoenroll/admissionPaymentApi";

import { usePaymentGateway } from "@/utils/payment/usePaymentGateway";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { showMessage } from "@/components/shared/CustomToast/message";
import { generateAdmissionApplicationPdf } from "@/utils/admissionApplicationPdfGenerator";
import { generateAdmissionMoneyReceiptPdf } from "@/utils/admissionMoneyReceiptPdfGenerator";
import ReusableNotice from "@/utils/ReusableNotice";
import ReusableButton from "@/components/shared/Button/ReusableButton";
import ReusableModal from "@/components/Modal/ReusableModal";

// Best-effort parse — present_/permanent_ division/district/upozilla come
// back from the API as JSON-encoded strings (mirrors how they were stored
// on submit), so a bad/empty string should degrade to "not available"
// rather than crash the screen.
const parseJson = <T,>(value: string | null | undefined): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

interface GeoPlace {
  name?: string;
  bn_name?: string;
}

interface EduInfoPreviewRow {
  exam?: string;
  board?: string;
  institute?: string;
  group?: string;
  roll?: string | number;
  registration?: string | number;
  gpa?: string;
  passingYear?: string;
}

/* ------------------------------ bordered "table" primitives ------------------------------ */
// React Native has no <table>, so a bordered grid of label/value cells is
// built from flex rows instead — mirrors the web preview's table layout
// (label cell shaded, value cell plain, borders between every cell).

const TableCaption = ({ children }: { children: React.ReactNode }) => (
  <Text className="text-[13px] font-bold text-primary mb-1.5">{children}</Text>
);

const DataTable = ({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) => (
  <View className="mb-5">
    <TableCaption>{caption}</TableCaption>
    <View className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      {children}
    </View>
  </View>
);

interface Cell {
  label: string;
  value: React.ReactNode;
  flexValue?: number;
}

// One row of alternating label/value cell pairs, all equal width by default.
const TableRow = ({
  cells,
  last = false,
}: {
  cells: Cell[];
  last?: boolean;
}) => (
  <View
    className={`flex-row flex-wrap ${last ? "" : "border-b border-slate-200"}`}
  >
    {cells.map((c, i) => (
      <React.Fragment key={i}>
        <View
          className="bg-slate-50 border-r border-t border-slate-200 px-2 py-1.5 justify-center"
          style={{ flexBasis: 90, flexGrow: 0.6 }}
        >
          <Text
            className="text-[10px] font-bold text-slate-600 uppercase"
            numberOfLines={2}
          >
            {c.label}
          </Text>
        </View>
        <View
          className={`px-2 py-1.5 border-t border-slate-200 justify-center ${i < cells.length - 1 ? "border-r" : ""}`}
          style={{ flexBasis: 110, flexGrow: c.flexValue ?? 1 }}
        >
          {typeof c.value === "string" || typeof c.value === "number" ? (
            <Text className="text-[12px] text-slate-800" numberOfLines={2}>
              {c.value || c.value === 0 ? String(c.value) : "—"}
            </Text>
          ) : (
            c.value
          )}
        </View>
      </React.Fragment>
    ))}
  </View>
);

// A single label + full-width value row (paragraph-style, e.g. an address).
const TableFullRow = ({
  label,
  value,
  last = false,
}: {
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) => (
  <View className={`flex-row ${last ? "" : "border-b border-slate-200"}`}>
    <View
      className="bg-slate-50 border-r border-slate-200 px-2 py-1.5 justify-center"
      style={{ width: 90 }}
    >
      <Text className="text-[10px] font-bold text-slate-600 uppercase">
        {label}
      </Text>
    </View>
    <View className="px-2 py-1.5 flex-1 justify-center">
      {typeof value === "string" ? (
        <Text className="text-[12px] text-slate-800">{value || "—"}</Text>
      ) : (
        value
      )}
    </View>
  </View>
);

const SubjectChipLine = ({
  label,
  subjects,
}: {
  label: string;
  subjects?: { subject_code: string; subject_name: string }[];
}) => {
  if (!subjects?.length) return null;
  const text = subjects
    .map((s) => `${s.subject_code}: ${s.subject_name}`)
    .join(", ");
  return (
    <Text className="text-[12px] text-slate-800 mb-1">
      <Text className="font-bold">{label}: </Text>
      {text}
    </Text>
  );
};

const AttachmentCell = ({
  present,
  url,
}: {
  present?: string | null;
  url?: string | null;
}) => (
  <View className="flex-row items-center">
    <Ionicons
      name={present ? "checkmark-circle" : "close-circle"}
      size={14}
      color={present ? "#059669" : "#dc2626"}
    />
    {!!present && !!url && (
      <Text
        className="ml-1.5 text-[12px] text-primary font-semibold"
        onPress={() => Linking.openURL(url)}
      >
        View
      </Text>
    )}
  </View>
);

const AdmissionPreview = () => {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const redirectToGateway = usePaymentGateway();

  const {
    data: preview,
    isLoading,
    refetch,
    isFetching,
  } = useGetAdmissionPreviewQuery(key, { skip: !key });
  const studentData = preview?.student_data;

  const { data: invoice } = useGetAdmissionPaymentInvoiceQuery(key, {
    skip: !key,
  });
  const [sendPayment, { isLoading: paying }] =
    useSendAdmissionPaymentMutation();
  const [fetchSlipInvoice, { isFetching: loadingSlip }] =
    useLazyGetAdmissionPaymentInvoiceQuery();

  const [paymentConfirmVisible, setPaymentConfirmVisible] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Only fetched once the Edit dialog is actually opened — same admission
  // config + fee-config map the Apply Online form uses, so the dialog's
  // dropdown options match the institute's real setup.
  const instituteId = studentData?.institute_detail?.institute_id;
  const { data: admissionConfig } = useGetAdmissionDataQuery(
    instituteId ?? "",
    { skip: !instituteId || !editModalVisible },
  );
  const { data: feeMap } = useFetchFullMapAdmissionFeeConfigQuery(
    instituteId ?? "",
    { skip: !instituteId || !editModalVisible },
  );

  const presentDivision = useMemo(
    () => parseJson<GeoPlace>(studentData?.present_division),
    [studentData],
  );
  const presentDistrict = useMemo(
    () => parseJson<GeoPlace>(studentData?.present_district),
    [studentData],
  );
  const presentUpozilla = useMemo(
    () => parseJson<GeoPlace>(studentData?.present_upozilla),
    [studentData],
  );
  const permanentDivision = useMemo(
    () => parseJson<GeoPlace>(studentData?.permanent_division),
    [studentData],
  );
  const permanentDistrict = useMemo(
    () => parseJson<GeoPlace>(studentData?.permanent_district),
    [studentData],
  );
  const permanentUpozilla = useMemo(
    () => parseJson<GeoPlace>(studentData?.permanent_upozilla),
    [studentData],
  );
  const eduInformation = useMemo(
    () => parseJson<EduInfoPreviewRow[]>(studentData?.edu_information) ?? [],
    [studentData],
  );

  // Public URL this application's QR points at — <BASE_URL>/autoenroll/admission/preview/<key>
  const applicationUrl = useMemo(() => {
    const base = (process.env.EXPO_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
    return `${base}/autoenroll/admission/preview/${key ?? ""}`;
  }, [key]);

  const gateways = preview?.gateways ?? [];
  const isPaid = studentData?.approval_status === "Success";
  const isDeadlinePassed = preview?.deadline_status === "passed";

  const openPaymentConfirm = () => {
    setSelectedGateway(gateways.length === 1 ? gateways[0].type : null);
    setPaymentConfirmVisible(true);
  };

  const handlePayNow = async () => {
    if (!key) return;
    try {
      const result = await sendPayment({
        unique_number: key,
        gateway: selectedGateway,
        admission_fee: preview?.admission_fee ?? null,
        software_fee: preview?.software_fee ?? null,
        url: null,
      }).unwrap();
      if (result.status === "success" && result.payment_url) {
        setPaymentConfirmVisible(false);
        redirectToGateway({
          payment_url: result.payment_url,
          transaction_id: key,
        });
      } else {
        showMessage(
          "error",
          "Failed",
          result.message || "Could not start the payment.",
        );
      }
    } catch {
      showMessage("error", "Failed", "Could not start the payment.");
    }
  };

  const handleCopyId = () => {
    if (!studentData?.unique_number) return;
    if (
      Platform.OS === "web" &&
      typeof navigator !== "undefined" &&
      navigator.clipboard
    ) {
      navigator.clipboard.writeText(studentData.unique_number);
      showMessage("success", "Copied", "Application ID copied to clipboard.");
    } else {
      showMessage(
        "info",
        "Application ID",
        `${studentData.unique_number} — long-press the ID above to copy.`,
      );
    }
  };

  const handlePrint = () => {
    if (!studentData || !preview) return;
    generateAdmissionApplicationPdf(
      studentData,
      preview,
      "Admission_Application",
    );
  };

  const handleEdit = () => setEditModalVisible(true);

  const handlePaymentSlip = async () => {
    if (!key) return;
    try {
      const result = await fetchSlipInvoice(key).unwrap();
      if (!result?.invoice_data) {
        showMessage("error", "Not found", "Could not load the payment slip.");
        return;
      }
      await generateAdmissionMoneyReceiptPdf(result);
    } catch {
      showMessage("error", "Failed", "Could not generate the payment slip.");
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  if (!studentData) {
    return (
      <View className="flex-1 bg-gray-50 p-4 items-center">
        <View className="mt-8" style={{ maxWidth: 700, width: "100%" }}>
          <ReusableNotice
            message="Invalid request — no application found for this ID."
            icon="alert-circle-outline"
            containerClassName="bg-red-50 border border-red-200 rounded-xl px-4 py-3"
            textClassName="text-red-800"
          />
        </View>
      </View>
    );
  }

  const instituteDetail = studentData.institute_detail;
  const preferredSubjects = studentData.preferred_subjects;

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      <View
        className="px-4 pt-4"
        style={{ maxWidth: 900, width: "100%", alignSelf: "center" }}
      >
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center self-start mb-2"
        >
          <Ionicons name="arrow-back" size={16} color="#1e3a8a" />
          <Text className="ml-1 text-[13px] text-primary font-semibold">
            Application
          </Text>
        </Pressable>

        {/* ================= APPLICATION ID PILL ================= */}
        <Pressable
          onPress={handleCopyId}
          className="self-center flex-row items-center bg-violet-600 rounded-full px-5 py-2.5 mb-3"
        >
          <Text selectable className="text-white font-bold text-[13px] mr-2">
            Application ID: {studentData.unique_number}
          </Text>
          <Ionicons name="copy-outline" size={15} color="#ffffff" />
        </Pressable>

        <ReusableNotice
          message="আপনার অ্যাপ্লিকেশন আইডি (Application ID) সংরক্ষণ করুন। ফি পরিশোধের পূর্বে তথ্য যাচাই এ সংশোধন করুন, ফি পরিশোধের পর কোন প্রকার তথ্য সংশোধন করা যাবে না।"
          icon="information-circle-outline"
          containerClassName="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3"
          textClassName="text-amber-800"
        />

        <View className="flex-row flex-wrap gap-2 mb-5">
          <ReusableButton
            title="Refresh"
            variant="secondary"
            onPress={() => refetch()}
            isLoading={isFetching}
            leftIcon={<Ionicons name="refresh" size={16} color="#1e293b" />}
          />
          <ReusableButton
            title="Print"
            variant="secondary"
            onPress={handlePrint}
            leftIcon={
              <Ionicons name="print-outline" size={16} color="#1e293b" />
            }
          />
          {!isPaid && !isDeadlinePassed && (
            <ReusableButton
              title="Edit"
              variant="secondary"
              onPress={handleEdit}
              leftIcon={
                <Ionicons name="create-outline" size={16} color="#1e293b" />
              }
            />
          )}
          {isPaid ? (
            <>
              <ReusableButton
                title="Paid"
                variant="secondary"
                disabled
                onPress={() => {}}
                leftIcon={
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={16}
                    color="#1e293b"
                  />
                }
              />
              <ReusableButton
                title="Payment Slip"
                variant="primary"
                isLoading={loadingSlip}
                onPress={handlePaymentSlip}
                leftIcon={
                  <Ionicons name="receipt-outline" size={16} color="#ffffff" />
                }
              />
            </>
          ) : isDeadlinePassed ? (
            <ReusableButton
              title="Deadline Passed"
              variant="secondary"
              disabled
              onPress={() => {}}
              leftIcon={
                <Ionicons
                  name="close-circle-outline"
                  size={16}
                  color="#1e293b"
                />
              }
            />
          ) : (
            <ReusableButton
              title="Payment"
              variant="primary"
              onPress={openPaymentConfirm}
              leftIcon={
                <Ionicons name="cash-outline" size={16} color="#ffffff" />
              }
            />
          )}
        </View>

        {/* ================= HEADER ================= */}
        <View className="flex-row items-start justify-between mb-5">
          {/* Left — student photo */}
          {studentData.student_pic_url ? (
            <Image
              source={{ uri: studentData.student_pic_url }}
              style={{ width: 56, height: 68, borderRadius: 6 }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ width: 56, height: 68 }} />
          )}

          {/* Center — logo + institute name + address */}
          <View className="flex-1 items-center px-3">
            {!!instituteDetail?.logo_url && (
              <Image
                source={{ uri: instituteDetail.logo_url }}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 8,
                  marginBottom: 6,
                }}
                resizeMode="contain"
              />
            )}
            <Text className="text-base font-black text-slate-800 text-center">
              {instituteDetail?.institute_name}
            </Text>
            {!!instituteDetail?.institute_address && (
              <Text className="text-[12px] text-slate-500 mt-0.5 text-center">
                {instituteDetail.institute_address}
              </Text>
            )}
          </View>

          {/* Right — QR that opens this application */}
          <View className="items-center" style={{ width: 84 }}>
            <View className="bg-white p-1 rounded border border-slate-100">
              <QRCode value={applicationUrl} size={64} />
            </View>
            <Text
              className="text-[10px] font-semibold text-center mt-1"
              style={{ color: "#0b7369" }}
            >
              Scan to open this application
            </Text>
          </View>
        </View>

        <Text className="text-center font-black text-[15px] text-emerald-700 mb-3">
          Admission Information
        </Text>

        {/* ================= APPLICATION STATUS ================= */}
        <DataTable caption="Application Status">
          <TableRow
            last
            cells={[
              { label: "Payment Status", value: studentData.approval_status },
              {
                label: "Payable Amount",
                flexValue: 1.6,
                value: (
                  <View>
                    <Text className="text-[16px] ">
                      ৳{" "}
                      {Number(preview?.admission_fee ?? 0) +
                        Number(preview?.software_fee ?? 0)}
                    </Text>
                    {(preview?.admission_fee != null ||
                      preview?.software_fee != null) && (
                      <Text className="text-[12px]  mt-0.5">
                        Admission Fee: ৳{preview?.admission_fee ?? 0}, Software
                        fee: ৳{preview?.software_fee ?? 0}
                      </Text>
                    )}
                  </View>
                ),
              },
              {
                label: "Assigned Roll",
                value: studentData.assigned_roll ?? "N/A",
              },
              {
                label: "Student ID",
                value: invoice?.custom_student_id ?? "N/A",
              },
            ]}
          />
        </DataTable>

        {/* ================= ACADEMIC INFORMATION ================= */}
        <DataTable caption="Academic Information">
          <TableRow
            cells={[
              {
                label: "Year/session",
                value:
                  studentData.academic_year?.coresubcategories
                    ?.core_subcategory_name,
              },
              { label: "Class", value: studentData.class?.class_name },
              {
                label: "Group",
                value: studentData.group?.groups?.core_subcategory_name,
              },
              {
                label: "Shift",
                value: studentData.shift?.shifts?.core_subcategory_name,
              },
            ]}
          />
          {preview?.subject && preferredSubjects && (
            <TableFullRow
              last
              label="Subject set"
              value={
                <View>
                  <SubjectChipLine
                    label="Compulsory"
                    subjects={preferredSubjects.compulsory}
                  />
                  <SubjectChipLine
                    label="Group Base"
                    subjects={preferredSubjects.group_base}
                  />
                  <SubjectChipLine
                    label="Optional"
                    subjects={preferredSubjects.choosable}
                  />
                  <SubjectChipLine
                    label="Uncountable"
                    subjects={preferredSubjects.uncountable}
                  />
                </View>
              }
            />
          )}
        </DataTable>

        {/* ================= STUDENT INFORMATION ================= */}
        <DataTable caption="Student Information">
          <TableRow
            cells={[
              { label: "Application ID", value: studentData.unique_number },
              { label: "Application Date", value: studentData.date },
              { label: "Student's Contact", value: studentData.student_mobile },
            ]}
          />
          <TableRow
            cells={[
              {
                label: "Name (Bangla)",
                value: studentData.student_name_bangla,
              },
              {
                label: "Name (English)",
                value: studentData.student_name_english,
              },
              { label: "Nationality", value: studentData.nationality },
            ]}
          />
          <TableRow
            cells={[
              {
                label: "NID/Birth Cert. No.",
                value: studentData.student_nid_or_birth_no,
              },
              { label: "Blood Group", value: studentData.blood_group },
              { label: "Date of Birth", value: studentData.date_of_birth },
            ]}
          />
          <TableRow
            cells={[
              { label: "Gender", value: studentData.gender },
              { label: "Marital Status", value: studentData.marital_status },
              { label: "Religion", value: studentData.religion },
            ]}
          />
          <TableRow
            cells={[
              {
                label: "Father's Name (English)",
                value: studentData.father_name_english,
              },
              {
                label: "Father's Name (Bangla)",
                value: studentData.father_name_bangla,
              },
              { label: "Father's National ID", value: studentData.father_nid },
            ]}
          />
          <TableRow
            cells={[
              {
                label: "Mother's Name (English)",
                value: studentData.mother_name_english,
              },
              {
                label: "Mother's Name (Bangla)",
                value: studentData.mother_name_bangla,
              },
              { label: "Mother's National ID", value: studentData.mother_nid },
            ]}
          />
          <TableRow
            cells={[
              { label: "Father's Contact", value: studentData.father_mobile },
              { label: "Mother's Contact", value: studentData.mother_mobile },
            ]}
          />
          <TableRow
            cells={[
              {
                label: "Father's Occupation",
                value: studentData.father_occupation,
              },
              { label: "Father's Income", value: studentData.father_income },
            ]}
          />
          <TableRow
            last
            cells={[
              {
                label: "Mother's Occupation",
                value: studentData.mother_occupation,
              },
              { label: "Mother's Income", value: studentData.mother_income },
            ]}
          />
        </DataTable>

        {/* ================= PRESENT ADDRESS ================= */}
        <DataTable caption="Present Address">
          <TableFullRow label="Address" value={studentData.present_address} />
          <TableRow
            cells={[
              { label: "Division", value: presentDivision?.name },
              { label: "District", value: presentDistrict?.name },
              { label: "Upazila", value: presentUpozilla?.name },
            ]}
          />
          <TableRow
            last
            cells={[
              { label: "Post Office", value: studentData.present_post_office },
              { label: "Post Code", value: studentData.present_post_code },
            ]}
          />
        </DataTable>

        {/* ================= PERMANENT ADDRESS ================= */}
        <DataTable caption="Permanent Address">
          <TableFullRow label="Address" value={studentData.permanent_address} />
          <TableRow
            cells={[
              { label: "Division", value: permanentDivision?.name },
              { label: "District", value: permanentDistrict?.name },
              { label: "Upazila", value: permanentUpozilla?.name },
            ]}
          />
          <TableRow
            last
            cells={[
              {
                label: "Post Office",
                value: studentData.permanent_post_office,
              },
              { label: "Post Code", value: studentData.permanent_post_code },
            ]}
          />
        </DataTable>

        {/* ================= EDUCATIONAL QUALIFICATIONS ================= */}
        {eduInformation.length > 0 && (
          <DataTable caption="Educational Qualifications">
            {eduInformation.map((row, i) => (
              <TableRow
                key={`${row.exam}-${i}`}
                last={i === eduInformation.length - 1}
                cells={[
                  { label: "Exam", value: row.exam },
                  { label: "Institute", value: row.institute },
                  { label: "Board", value: row.board },
                  { label: "Group", value: row.group },
                  { label: "Roll No.", value: row.roll },
                  { label: "Reg. No.", value: row.registration },
                  { label: "GPA", value: row.gpa },
                  { label: "Passing Year", value: row.passingYear },
                ]}
              />
            ))}
          </DataTable>
        )}

        {/* ================= GUARDIAN INFORMATION ================= */}
        {(studentData.guardian_name || studentData.guardian_mobile) && (
          <DataTable caption="Guardian Information">
            <TableRow
              cells={[
                {
                  label: "Name & Relationship",
                  flexValue: 1.4,
                  value: `${studentData.guardian_name ?? ""}${
                    studentData.guardian_relation
                      ? ` (${studentData.guardian_relation})`
                      : ""
                  }`,
                },
                { label: "Mobile", value: studentData.guardian_mobile },
                { label: "Occupation", value: studentData.guardian_occupation },
                {
                  label: "Yearly Income",
                  value: studentData.guardian_yearly_income,
                },
              ]}
            />
            <TableFullRow
              last
              label="Land Property of Parents"
              value={studentData.guardian_property || "—"}
            />
          </DataTable>
        )}

        {/* ================= COVID-19 VACCINE INFORMATION ================= */}
        {!!studentData.vaccine && (
          <DataTable caption="Covid-19 Vaccine Information">
            <TableRow
              last
              cells={[
                { label: "Vaccinated?", value: studentData.vaccine },
                { label: "Vaccine Name", value: studentData.vaccine_name },
              ]}
            />
          </DataTable>
        )}

        {/* ================= QUOTA INFORMATION ================= */}
        {!!studentData.quota && (
          <DataTable caption="Quota Information">
            <TableRow
              last
              cells={[
                { label: "Quota?", value: "Yes" },
                { label: "Quota Name", value: studentData.quota },
              ]}
            />
          </DataTable>
        )}

        {/* ================= ATTACHMENTS ================= */}
        <DataTable caption="Attachments">
          <TableRow
            last
            cells={[
              {
                label: "Student Photo",
                value: (
                  <AttachmentCell
                    present={studentData.student_pic}
                    url={studentData.student_pic_url}
                  />
                ),
              },
              {
                label: "Vaccine Certificate",
                value: (
                  <AttachmentCell
                    present={studentData.vaccine_certificate}
                    url={studentData.vaccine_certificate_url}
                  />
                ),
              },
              {
                label: "Birth Certificate/NID",
                value: (
                  <AttachmentCell
                    present={studentData.student_birth_nid_file}
                    url={studentData.student_birth_nid_file_url}
                  />
                ),
              },
              {
                label: "Optional",
                value: (
                  <AttachmentCell
                    present={studentData.other_file}
                    url={studentData.other_file_url}
                  />
                ),
              },
            ]}
          />
        </DataTable>

        {/* ================= DECLARATION ================= */}
        <View className="mb-6">
          <TableCaption>Declaration</TableCaption>
          <Text className="text-[12px] text-slate-600 leading-5 text-justify">
            I,{" "}
            <Text className="font-bold">
              {studentData.student_name_english}
            </Text>
            , hereby declare that the above-mentioned information and photo are
            correct. If any information provided by me is found to be false,{" "}
            <Text className="font-bold">
              {instituteDetail?.institute_name}
              {instituteDetail?.institute_address
                ? `, ${instituteDetail.institute_address}`
                : ""}
            </Text>{" "}
            reserves the right to cancel my admission. I shall be obliged to
            obey the rules and regulations of the relevant Education
            Board/University as well as{" "}
            <Text className="font-bold">
              {instituteDetail?.institute_name}
              {instituteDetail?.institute_address
                ? `, ${instituteDetail.institute_address}`
                : ""}
            </Text>{" "}
            and to pay all the required fees.
          </Text>

          {/* Fixed 3-column grid (not `justify-between`) so a row with fewer
              than 3 items — Provost/Registrar — lines up under the same
              columns as the row above instead of stretching to fill the
              width. Mirrors the PDF's `.signatures td { width: 33.33% }`. */}
          <View
            className="flex-row flex-wrap mt-16"
            style={{ columnGap: 16, rowGap: 40 }}
          >
            {[
              "Student Signature",
              "Signature of Convener / Department Head",
              "Signature of Principal",
            ].map((label) => (
              <View
                key={label}
                className="items-center"
                style={{ flexBasis: "30%", minWidth: 140 }}
              >
                <View className="w-full border-t border-dotted border-slate-400 mb-1" />
                <Text className="text-[11px] font-bold text-slate-500 text-center">
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ================= PAYMENT CONFIRMATION MODAL ================= */}
        <ReusableModal
          visible={paymentConfirmVisible}
          onClose={() => setPaymentConfirmVisible(false)}
          title="Confirm Payment"
          size="sm"
          scrollable={false}
          footerSlot={
            <View className="flex-row justify-end gap-2 w-full">
              <ReusableButton
                title="Cancel"
                variant="secondary"
                onPress={() => setPaymentConfirmVisible(false)}
              />
              <ReusableButton
                title={paying ? "Processing..." : "Pay Now"}
                variant="primary"
                isLoading={paying}
                disabled={gateways.length > 1 && !selectedGateway}
                onPress={handlePayNow}
                leftIcon={
                  <Ionicons
                    name="arrow-forward-circle-outline"
                    size={16}
                    color="#ffffff"
                  />
                }
              />
            </View>
          }
        >
          <ReusableNotice
            message={`Admission fee: ${preview?.admission_fee ?? "N/A"}${invoice?.invoice_data?.amount ? ` (Total: ${invoice.invoice_data.amount})` : ""}`}
            icon="cash-outline"
            containerClassName="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3"
            textClassName="text-blue-800"
          />
          {gateways.length > 1 && (
            <View>
              <Text className="text-[13px] font-bold text-slate-700 mb-2">
                Payment Method
              </Text>
              {gateways.map((gw) => (
                <Text
                  key={gw.type}
                  onPress={() => setSelectedGateway(gw.type)}
                  className={`mb-2 px-3 py-2 rounded-lg border ${selectedGateway === gw.type ? "border-primary bg-blue-50 text-primary font-semibold" : "border-slate-200 text-slate-700"}`}
                >
                  {gw.name}
                </Text>
              ))}
            </View>
          )}
        </ReusableModal>

        {/* ================= EDIT APPLICATION MODAL ================= */}
        <AdmissionEditModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          studentData={studentData}
          admissionConfig={admissionConfig}
          feeMap={feeMap}
          onUpdated={refetch}
        />
      </View>
    </ScrollView>
  );
};

export default AdmissionPreview;
