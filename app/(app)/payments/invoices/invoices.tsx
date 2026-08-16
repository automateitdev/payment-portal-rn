import { useGetInstituteInfoQuery } from "@/redux/allApi/authApi/authApi";
import { useFetchInvoicesQuery } from "@/redux/allApi/invoices/invoicesApi";
import { useAppSelector } from "@/redux/hook";
import { RootState } from "@/redux/store";
import { showToast } from "@/utils/toast";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  ScrollView as HorizontalScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

type InvoiceDetail = {
  id: number;
  invoice: string;
  pay_invoice_id: number;
  payapplies_id: number;
  payapplies_status: string | null;
  base_payable_amount: string | null;
  fine_paid_amount: string | null;
  waiver_amount: string | null;
  total_calculated_amount: string | null;
  payment_amount: string;
  previously_paid: string | null;
  due_amount: string | null;
  student_id: number;
  institute_details_id: number;
  academic_detail_id: number;
  fee_head: string;
  fee_head_id: number;
  fee_subhead: string;
  fee_subhead_id: number;
  academic_year: string;
  academic_year_id: number;
  academic_session: string;
  academic_session_id: number;
  department: string;
  department_id: number;
  class: string;
  institute_class_map_id: number;
  shift: string;
  shift_id: number;
  section: string;
  section_id: number;
  group: string;
  group_id: number;
  student_category: string;
  student_category_id: number;
  custom_student_id: string;
  student_name: string;
  student_gender: string;
  student_religion: string;
  student_type: string;
  residential_type: string;
  student_absent_fine_history_id?: number | null;
  created_at: string;
  updated_at: string;
};

type InvoiceItem = {
  id: number;
  invoice: string;
  payment_date: string;
  payment_state: string;
  payment_method: string;
  pay_amount: string;
  trx_id: string | null;
  trx_no?: string | null;
  transaction_date?: string | null;
  session_token?: string | null;
  pay_mode?: string | null;
  br_code?: string | null;
  applicant_name?: string | null;
  applicant_no?: string | null;
  payee_info?: string | null;
  vat?: string | null;
  commission?: string | null;
  scroll_no?: string | null;
  portal?: string | null;
  institute_details_id?: number;
  collected_by?: number | null;
  created_at?: string;
  updated_at?: string;
  message?: string | null;
  status?: string | null;
  pay_invoice_details: InvoiceDetail[];
};

type PayeeInfo = {
  student_id?: number;
  custom_student_id?: string;
  academic_detail_id?: number;
  academic_year?: string;
  academic_session?: string;
  class_roll?: number | string;
  name?: string;
  department?: string;
  class?: string;
  shift?: string;
  section?: string;
  group?: string;
  contact?: string;
  "class-shift-section"?: string;
};

type ReceiptRow = {
  academicYear: string;
  feeHead: string;
  feeSubHead: string;
  feeAmount: number;
  paidFine: number;
  waiver: number;
  previouslyPaid: number;
  paidAmount: number;
  dueAmount: number;
};

type ReceiptData = {
  instituteName: string;
  instituteAddress: string;
  invoiceNo: string;
  studentId: string;
  studentName: string;
  phone: string;
  department: string;
  classShiftSection: string;
  studentRoll: string;
  academicYearSession: string;
  paymentDate: string;
  paymentMethod: string;
  collectedBy: string;
  paymentStatus: string;
  totalAmount: number;
  amountInWords: string;
  rows: ReceiptRow[];
  absentFine: number;
};

const MONEY_RECEIPT_FILENAME_PREFIX = "Money_Receipt";

const numberToWords = (value: number): string => {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const convertHundreds = (num: number): string => {
    if (num < 20) return ones[num];
    if (num < 100) {
      return `${tens[Math.floor(num / 10)]}${num % 10 ? ` ${ones[num % 10]}` : ""}`.trim();
    }
    return `${ones[Math.floor(num / 100)]} Hundred${num % 100 ? ` ${convertHundreds(num % 100)}` : ""}`.trim();
  };

  if (value === 0) return "Zero";
  if (value < 1000) return convertHundreds(value);
  if (value < 1000000) {
    const thousand = Math.floor(value / 1000);
    const rest = value % 1000;
    return `${convertHundreds(thousand)} Thousand${rest ? ` ${convertHundreds(rest)}` : ""}`.trim();
  }
  const million = Math.floor(value / 1000000);
  const rest = value % 1000000;
  const thousandPart = Math.floor(rest / 1000);
  const hundredPart = rest % 1000;
  return `${convertHundreds(million)} Million${thousandPart ? ` ${convertHundreds(thousandPart)} Thousand` : ""}${hundredPart ? ` ${convertHundreds(hundredPart)}` : ""}`.trim();
};

const getAmountInWords = (amount: number) => {
  const whole = Math.floor(amount);
  const fraction = Math.round((amount - whole) * 100);
  if (!fraction) {
    return `${numberToWords(whole)} Taka Only`;
  }
  return `${numberToWords(whole)} Taka and ${numberToWords(fraction)} Paisa Only`;
};

// Horizontal-scroll container for the table.
// On web, RN's ScrollView doesn't react to the mouse wheel, so we use a native
// scrollable <div> and translate vertical wheel into horizontal scroll.
const HScrollTable = ({
  minWidth,
  children,
}: {
  minWidth: number;
  children: React.ReactNode;
}) => {
  if (Platform.OS === "web") {
    return (
      <div
        style={{ overflowX: "auto", overflowY: "hidden", width: "100%" }}
        onWheel={(e) => {
          if (e.deltaY !== 0) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
      >
        <div style={{ minWidth }}>{children as React.ReactNode}</div>
      </div>
    );
  }
  return (
    <HorizontalScrollView horizontal showsHorizontalScrollIndicator>
      <View style={{ minWidth }}>{children}</View>
    </HorizontalScrollView>
  );
};

const Invoices = () => {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;
  const isWeb = Platform.OS === "web";
  const isDesktop = width >= 1024;
  // Full-width flex table only fits when the viewport is wide enough.
  // Narrow web windows & all mobile devices use the horizontal-scroll table.
  const useFlexLayout = isWeb && width >= 768;

  const themeMode = useAppSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === "dark";

  const { data: instituteData } = useGetInstituteInfoQuery({});
  const userData = useMemo(
    () => instituteData?.payload?.data?.user || {},
    [instituteData],
  );
  const {
    data: invoicesResponse,
    isLoading,
    error,
    refetch,
  } = useFetchInvoicesQuery(
    { custom_student_id: userData.student_id },
    { skip: !userData.student_id },
  );

  const invoices: InvoiceItem[] = Array.isArray(invoicesResponse)
    ? invoicesResponse
    : invoicesResponse?.payload?.data?.enlistment_list?.data ||
      invoicesResponse?.payload?.data ||
      invoicesResponse?.data ||
      [];

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(
    null,
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (refreshError) {
      console.error("Refresh error:", refreshError);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (value?: number | string | null) => {
    const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
    return Number.isNaN(num)
      ? "0.00"
      : num.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  };

  const toNumber = (value?: string | number | null) => {
    const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
    return Number.isNaN(num) ? 0 : num;
  };

  const parsePayeeInfo = (raw?: string | null): PayeeInfo => {
    if (!raw) return {};
    try {
      return JSON.parse(raw) as PayeeInfo;
    } catch {
      return {};
    }
  };

  const getStatusLabel = (state?: string | null) => {
    const normalizedState = state?.toUpperCase() || "";
    if (normalizedState === "COMPLETED") return "Paid";
    if (normalizedState === "PAID") return "Paid";
    if (normalizedState === "CANCELED") return "Canceled";
    if (normalizedState === "PENDING") return "Pending";
    if (normalizedState === "DUE") return "Due";
    if (normalizedState === "INTENDED") return "Requested";
    return normalizedState || "-";
  };

  const getStatusStyle = (state?: string | null) => {
    const normalizedState = state?.toUpperCase() || "";
    if (normalizedState === "COMPLETED" || normalizedState === "PAID") {
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        icon: "check-circle" as const,
      };
    }
    if (normalizedState === "CANCELED") {
      return {
        bg: "bg-rose-50",
        text: "text-rose-700",
        border: "border-rose-200",
        icon: "cancel" as const,
      };
    }
    if (normalizedState === "PENDING") {
      return {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        icon: "pending" as const,
      };
    }
    if (normalizedState === "DUE") {
      return {
        bg: "bg-rose-50",
        text: "text-rose-700",
        border: "border-rose-200",
        icon: "error" as const,
      };
    }
    return {
      bg: "bg-gray-50",
      text: "text-gray-700",
      border: "border-gray-200",
      icon: "help" as const,
    };
  };

  const buildReceiptData = useCallback(
    (invoice: InvoiceItem): ReceiptData => {
      const firstDetail = invoice?.pay_invoice_details?.[0];
      const payee = parsePayeeInfo(invoice?.payee_info);
      const receiptRows: ReceiptRow[] = (
        invoice?.pay_invoice_details ?? []
      ).map((detail) => ({
        academicYear: detail?.academic_year || "-",
        feeHead: detail?.fee_head || "-",
        feeSubHead: detail?.fee_subhead || "-",
        feeAmount: toNumber(detail.base_payable_amount),
        paidFine: toNumber(detail.fine_paid_amount),
        waiver: toNumber(detail.waiver_amount),
        previouslyPaid: toNumber(detail.previously_paid),
        paidAmount: toNumber(detail.payment_amount),
        dueAmount: toNumber(detail.due_amount),
      }));

      const classShiftSection =
        payee["class-shift-section"] ||
        [
          payee.class || firstDetail?.class || userData.class_name || "-",
          payee.shift || firstDetail?.shift || userData.shift || "-",
          payee.section || firstDetail?.section || userData.section || "-",
        ].join(" / ");

      const totalAmount = toNumber(invoice.pay_amount);
      const hasAbsentFine = (invoice?.pay_invoice_details ?? []).some(
        (detail) => !!detail.student_absent_fine_history_id,
      );
      const paidFromRows = receiptRows.reduce(
        (sum, row) => sum + row.paidAmount,
        0,
      );
      const absentFine =
        hasAbsentFine && totalAmount > paidFromRows
          ? totalAmount - paidFromRows
          : 0;
      const academicYear =
        firstDetail?.academic_year ||
        payee.academic_year ||
        userData.academic_year ||
        "-";
      const academicSession =
        firstDetail?.academic_session ||
        payee.academic_session ||
        userData.academic_session ||
        "-";

      return {
        instituteName: userData.institute_name || "Institute",
        instituteAddress: userData.institute_address || "",
        invoiceNo: invoice.invoice || "-",
        studentId:
          payee.custom_student_id ||
          firstDetail?.custom_student_id ||
          userData.student_id ||
          "-",
        studentName:
          payee.name ||
          firstDetail?.student_name ||
          userData.student_name ||
          "-",
        phone: payee.contact || userData.phone || "-",
        department:
          payee.department ||
          firstDetail?.department ||
          userData.department_name ||
          "-",
        classShiftSection,
        studentRoll: String(payee.class_roll || userData.roll || "-"),
        academicYearSession: `${academicYear} / ${academicSession}`,
        paymentDate: formatDate(invoice.payment_date),
        paymentMethod:
          invoice.payment_method?.toUpperCase() === "QC"
            ? "Manual"
            : invoice.payment_method || "-",
        collectedBy:
          invoice.applicant_name ||
          (invoice.collected_by ? String(invoice.collected_by) : "-"),
        paymentStatus: getStatusLabel(invoice.payment_state),
        totalAmount,
        amountInWords: getAmountInWords(totalAmount),
        rows: receiptRows,
        absentFine,
      };
    },
    [userData],
  );

  const escapeHtml = (value?: string | number | null) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const getReceiptHtml = useCallback((receipt: ReceiptData) => {
    const rowsHtml = receipt.rows
      .map(
        (row) => `
            <tr>
              <td>${escapeHtml(row.academicYear)}</td>
              <td>${escapeHtml(row.feeHead)}</td>
              <td>${escapeHtml(row.feeSubHead)}</td>
              <td class="numeric">${escapeHtml(formatCurrency(row.feeAmount))}</td>
              <td class="numeric">${escapeHtml(formatCurrency(row.paidFine))}</td>
              <td class="numeric">${escapeHtml(formatCurrency(row.waiver))}</td>
              <td class="numeric">${escapeHtml(formatCurrency(row.previouslyPaid))}</td>
              <td class="numeric">${escapeHtml(formatCurrency(row.paidAmount))}</td>
              <td class="numeric">${escapeHtml(formatCurrency(row.dueAmount))}</td>
            </tr>
          `,
      )
      .join("");

    return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <style>
              @page {
                size: A5 portrait;
                margin: 8mm;
              }
              * {
                box-sizing: border-box;
              }
              html, body {
                width: 132mm;
                min-height: 194mm;
                margin: 0;
                padding: 0;
                overflow: hidden;
              }
              body {
                font-family: Arial, sans-serif;
                background: #ffffff;
                margin: 0;
                color: #111827;
              }
              .sheet {
                border: 2px solid #2f2f2f;
                width: 100%;
                min-height: 100%;
                padding: 10px;
              }
              .institute {
                font-size: 12px;
                font-weight: 700;
                text-transform: uppercase;
                margin-bottom: 2px;
              }
              .address {
                font-size: 9px;
                margin-bottom: 8px;
              }
              .title {
                font-size: 12px;
                font-weight: 700;
                text-align: center;
                text-decoration: underline;
                margin-bottom: 8px;
              }
              .meta {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 8px;
              }
              .meta td {
                font-size: 8.5px;
                padding: 1px 3px;
                vertical-align: top;
                line-height: 1.25;
              }
              .label {
                width: 92px;
              }
              .value {
                width: 120px;
              }
              .details {
                width: 100%;
                border-collapse: collapse;
                margin-top: 6px;
                table-layout: fixed;
              }
              .details th,
              .details td {
                border: 1px solid #1f2937;
                padding: 3px 4px;
                font-size: 7.5px;
                line-height: 1.2;
                word-break: break-word;
              }
              .details th {
                background: #f8fafc;
                text-align: center;
                font-weight: 700;
              }
              .numeric {
                text-align: right;
              }
              .totals-label {
                font-weight: 700;
                text-align: right;
              }
              .remarks-row td {
                font-size: 7.5px;
              }
              .footer {
                margin-top: 24px;
                padding-top: 6px;
                border-top: 1px solid #d1d5db;
                display: flex;
                justify-content: space-between;
                gap: 10px;
                font-size: 7.5px;
                color: #4b5563;
              }
              .footer strong {
                color: #374151;
              }
              .footer > div {
                flex: 1;
              }
            </style>
          </head>
          <body>
            <div class="sheet">
              <div class="institute">${escapeHtml(receipt.instituteName)}</div>
              <div class="address">${escapeHtml(receipt.instituteAddress)}</div>
              <div class="title">Money Receipt</div>

              <table class="meta">
                <tr>
                  <td class="label">Student ID</td>
                  <td class="value">: ${escapeHtml(receipt.studentId)}</td>
                  <td class="label">Academic Year and Session</td>
                  <td>: ${escapeHtml(receipt.academicYearSession)}</td>
                </tr>
                <tr>
                  <td class="label">Name</td>
                  <td class="value">: ${escapeHtml(receipt.studentName)}</td>
                  <td class="label">Invoice No</td>
                  <td>: ${escapeHtml(receipt.invoiceNo)}</td>
                </tr>
                <tr>
                  <td class="label">Phone</td>
                  <td class="value">: ${escapeHtml(receipt.phone)}</td>
                  <td class="label">Payment Date</td>
                  <td>: ${escapeHtml(receipt.paymentDate)}</td>
                </tr>
                <tr>
                  <td class="label">Department</td>
                  <td class="value">: ${escapeHtml(receipt.department)}</td>
                  <td class="label">Payment Method</td>
                  <td>: ${escapeHtml(receipt.paymentMethod)}</td>
                </tr>
                <tr>
                  <td class="label">Class-Shift-Section</td>
                  <td class="value">: ${escapeHtml(receipt.classShiftSection)}</td>
                  <td class="label">Collected By</td>
                  <td>: ${escapeHtml(receipt.collectedBy)}</td>
                </tr>
                <tr>
                  <td class="label">Student Roll</td>
                  <td class="value">: ${escapeHtml(receipt.studentRoll)}</td>
                  <td class="label">Payment Status</td>
                  <td>: ${escapeHtml(receipt.paymentStatus)}</td>
                </tr>
              </table>

              <table class="details">
                <thead>
                  <tr>
                    <th>Academic Year</th>
                    <th>Fee Head</th>
                    <th>Fee Sub Head</th>
                    <th>Fee Amount</th>
                    <th>Paid Fine</th>
                    <th>Waiver</th>
                    <th>Previously Paid</th>
                    <th>Paid Amount</th>
                    <th>Due Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                  <tr>
                    <td colspan="3" class="totals-label">Totals:</td>
                    <td class="numeric"><strong>${escapeHtml(formatCurrency(receipt?.rows?.reduce((sum, row) => sum + row.feeAmount, 0)))}</strong></td>
                    <td class="numeric"><strong>${escapeHtml(formatCurrency(receipt?.rows?.reduce((sum, row) => sum + row.paidFine, 0)))}</strong></td>
                    <td class="numeric"><strong>${escapeHtml(formatCurrency(receipt?.rows?.reduce((sum, row) => sum + row.waiver, 0)))}</strong></td>
                    <td class="numeric"><strong>${escapeHtml(formatCurrency(receipt?.rows?.reduce((sum, row) => sum + row.previouslyPaid, 0)))}</strong></td>
                    <td class="numeric"><strong>${escapeHtml(formatCurrency(receipt?.rows?.reduce((sum, row) => sum + row.paidAmount, 0)))}</strong></td>
                    <td class="numeric"><strong>${escapeHtml(formatCurrency(receipt?.rows?.reduce((sum, row) => sum + row.dueAmount, 0)))}</strong></td>
                  </tr>
                  ${
                    receipt.absentFine > 0
                      ? `
                  <tr>
                    <td colspan="7" class="totals-label">Absent Fine</td>
                    <td class="numeric"><strong>${escapeHtml(formatCurrency(receipt.absentFine))}</strong></td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colspan="7" class="totals-label">Grand Total</td>
                    <td class="numeric"><strong>${escapeHtml(formatCurrency(receipt.totalAmount))}</strong></td>
                    <td></td>
                  </tr>
                  `
                      : ""
                  }
                  <tr class="remarks-row">
                    <td><strong>In Word:</strong></td>
                    <td colspan="2">${escapeHtml(receipt?.amountInWords)}</td>
                    <td><strong>Remarks</strong></td>
                    <td colspan="5"></td>
                  </tr>
                </tbody>
              </table>

              <div class="footer">
                <div><strong>Powered By:</strong> Academy-Institute Management System</div>
                <div><strong>Note:</strong> This Money Receipt was created on a software.</div>
              </div>
            </div>
          </body>
        </html>
      `;
  }, []);

  const downloadPdfOnWeb = async (invoice: InvoiceItem, html: string) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute(
      "title",
      `${MONEY_RECEIPT_FILENAME_PREFIX}_${invoice.invoice}`,
    );

    document.body.appendChild(iframe);

    const cleanup = () => {
      window.setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    };

    const printFrame = () => {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        cleanup();
        throw new Error("Could not open print frame");
      }

      frameWindow.focus();
      frameWindow.print();
      cleanup();
      showToast(
        "success",
        "Print dialog opened. Choose Save as PDF to download.",
      );
    };

    const frameDocument =
      iframe.contentDocument || iframe.contentWindow?.document;

    if (!frameDocument) {
      cleanup();
      throw new Error("Could not create print document");
    }

    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();

    if (iframe.contentWindow?.document.readyState === "complete") {
      printFrame();
      return;
    }

    iframe.onload = () => {
      printFrame();
    };
  };

  const downloadPdfOnAndroid = async (
    invoice: InvoiceItem,
    pdfBase64: string,
  ) => {
    const downloadRootUri =
      FileSystem.StorageAccessFramework.getUriForDirectoryInRoot("Download");
    const permissions =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
        downloadRootUri,
      );

    if (!permissions.granted) {
      showToast("error", "Download folder permission was not granted.");
      return;
    }

    const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      `${MONEY_RECEIPT_FILENAME_PREFIX}_${invoice.invoice}_${Date.now()}`,
      "application/pdf",
    );

    await FileSystem.StorageAccessFramework.writeAsStringAsync(
      fileUri,
      pdfBase64,
      { encoding: FileSystem.EncodingType.Base64 },
    );

    showToast("success", "PDF saved to your selected Downloads folder.");
  };

  const generatePDF = useCallback(
    async (invoice: InvoiceItem) => {
      try {
        setDownloadingId(invoice.id);
        const receipt = buildReceiptData(invoice);
        const html = getReceiptHtml(receipt);

        if (Platform.OS === "web") {
          await downloadPdfOnWeb(invoice, html);
          return;
        }

        const result = await Print.printToFileAsync({
          html,
          base64: true,
          width: 420,
          height: 595,
        });

        if (Platform.OS === "android" && result.base64) {
          await downloadPdfOnAndroid(invoice, result.base64);
          return;
        }

        const safeInvoice = invoice.invoice.replace(/[^a-zA-Z0-9-]/g, "_");
        const fileName = `${MONEY_RECEIPT_FILENAME_PREFIX}_${safeInvoice}_${Date.now()}.pdf`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;

        await FileSystem.copyAsync({
          from: result.uri,
          to: fileUri,
        });

        showToast("success", "PDF saved inside app documents.");
        Alert.alert("PDF Saved", `Saved to:\n${fileUri}`);
      } catch (pdfError: unknown) {
        console.error("PDF error:", pdfError);
        Alert.alert(
          "Error",
          `Failed to generate PDF: ${pdfError instanceof Error ? pdfError.message : "Unknown error"}`,
        );
      } finally {
        setDownloadingId(null);
      }
    },
    [buildReceiptData, getReceiptHtml],
  );

  const selectedReceipt = useMemo(
    () => (selectedInvoice ? buildReceiptData(selectedInvoice) : null),
    [buildReceiptData, selectedInvoice],
  );

  const hasAnyPaid = invoices.some((invoice) => {
    const state = invoice.payment_state?.toUpperCase();
    return state === "COMPLETED" || state === "PAID";
  });

  const openReceipt = (invoice: InvoiceItem) => {
    setSelectedInvoice(invoice);
    setModalVisible(true);
  };

  const StatusChip = ({ state }: { state?: string | null }) => {
    const style = getStatusStyle(state);
    return (
      <View
        className={`px-2 ${isSmallScreen ? "px-1" : "px-3"} py-1 rounded-full ${isDark ? "bg-slate-800" : style.bg} border ${isDark ? "border-slate-700" : style.border} flex-row items-center gap-1`}
      >
        <MaterialIcons
          name={style.icon}
          size={isSmallScreen ? 12 : 14}
          color={isDark ? "#94a3b8" : style.text.replace("text-", "#")}
        />
        <Text
          className={`text-xs ${isSmallScreen ? "text-[10px]" : "text-xs"} font-semibold uppercase ${isDark ? "text-slate-300" : style.text}`}
        >
          {getStatusLabel(state)}
        </Text>
      </View>
    );
  };

  const columnStyle = (
    mobileWidth: number,
    flex: number,
    extraStyle: Record<string, unknown> = {},
  ) => ({
    ...(useFlexLayout ? { flex, minWidth: 0 } : { width: mobileWidth }),
    ...extraStyle,
  });

  const TableHeader = () => (
    <View
      className="flex-row bg-slate-50 dark:bg-slate-800/80 py-3 border border-slate-200 dark:border-slate-700"
      style={
        useFlexLayout ? { width: "100%" } : { minWidth: hasAnyPaid ? 650 : 550 }
      }
    >
      <View
        style={columnStyle(150, 2.6, {
          paddingLeft: 16,
          borderRightWidth: 1,
          borderRightColor: isDark ? "#334155" : "#e2e8f0",
        })}
      >
        <Text className="font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
          Invoice No
        </Text>
      </View>
      <View
        style={columnStyle(100, 1.7, {
          paddingHorizontal: 8,
          borderRightWidth: 1,
          borderRightColor: isDark ? "#334155" : "#e2e8f0",
        })}
      >
        <Text className="font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
          Date
        </Text>
      </View>
      <View
        style={columnStyle(100, 1.7, {
          paddingHorizontal: 8,
          borderRightWidth: 1,
          borderRightColor: isDark ? "#334155" : "#e2e8f0",
        })}
      >
        <Text className="font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider text-right">
          Amount
        </Text>
      </View>
      <View
        style={columnStyle(120, 1.9, {
          paddingHorizontal: 8,
          borderRightWidth: 1,
          borderRightColor: isDark ? "#334155" : "#e2e8f0",
        })}
      >
        <Text className="font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider text-right">
          Method
        </Text>
      </View>
      <View
        style={columnStyle(100, 1.6, {
          paddingHorizontal: 8,
          alignItems: "center",
          borderRightWidth: hasAnyPaid ? 1 : 0,
          borderRightColor: isDark ? "#334155" : "#e2e8f0",
        })}
      >
        <Text className="font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
          Status
        </Text>
      </View>
      {hasAnyPaid && (
        <View
          style={columnStyle(80, 1.1, {
            paddingRight: 16,
          })}
        >
          <Text className="font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider text-center">
            Actions
          </Text>
        </View>
      )}
    </View>
  );

  const InvoiceRow = ({ item }: { item: InvoiceItem }) => {
    const isDownloading = downloadingId === item.id;
    const isPaid =
      item.payment_state?.toUpperCase() === "COMPLETED" ||
      item.payment_state?.toUpperCase() === "PAID";

    return (
      <View
        className={`flex-row py-4 border-b border-l border-r border-slate-100 dark:border-slate-800 ${isSmallScreen ? "py-3" : ""}`}
        style={
          useFlexLayout
            ? { width: "100%" }
            : { minWidth: hasAnyPaid ? 650 : 550 }
        }
      >
        <View
          style={columnStyle(150, 2.6, {
            paddingLeft: 16,
            justifyContent: "center",
            borderRightWidth: 1,
            borderRightColor: isDark ? "#1e293b" : "#f1f5f9",
          })}
        >
          <Text
            className={`font-bold text-slate-900 dark:text-slate-100 ${isSmallScreen ? "text-xs" : "text-sm"}`}
            numberOfLines={2}
            style={{ flexWrap: "wrap" }}
            selectable
          >
            {item.invoice}
          </Text>
        </View>
        <View
          style={columnStyle(100, 1.7, {
            paddingHorizontal: 8,
            justifyContent: "center",
            borderRightWidth: 1,
            borderRightColor: isDark ? "#1e293b" : "#f1f5f9",
          })}
        >
          <Text
            className={`text-slate-600 dark:text-slate-400 font-medium ${isSmallScreen ? "text-xs" : "text-sm"}`}
            numberOfLines={2}
            style={{ flexWrap: "wrap" }}
          >
            {formatDate(item.payment_date)}
          </Text>
        </View>
        <View
          style={columnStyle(100, 1.7, {
            paddingHorizontal: 8,
            justifyContent: "center",
            borderRightWidth: 1,
            borderRightColor: isDark ? "#1e293b" : "#f1f5f9",
          })}
        >
          <Text
            className={`text-right font-black text-slate-900 dark:text-white ${isSmallScreen ? "text-xs" : "text-sm"}`}
          >
            Tk {formatCurrency(item.pay_amount)}
          </Text>
        </View>
        <View
          style={columnStyle(120, 1.9, {
            paddingHorizontal: 8,
            justifyContent: "center",
            borderRightWidth: 1,
            borderRightColor: isDark ? "#1e293b" : "#f1f5f9",
          })}
        >
          <Text
            className={`text-right text-slate-500 dark:text-slate-400 font-semibold ${isSmallScreen ? "text-xs" : "text-sm"}`}
            numberOfLines={1}
          >
            {item.payment_method || "-"}
          </Text>
        </View>
        <View
          style={columnStyle(100, 1.6, {
            paddingHorizontal: 8,
            alignItems: "center",
            justifyContent: "center",
            borderRightWidth: hasAnyPaid ? 1 : 0,
            borderRightColor: isDark ? "#1e293b" : "#f1f5f9",
          })}
        >
          <StatusChip state={item.payment_state} />
        </View>
        {hasAnyPaid && (
          <View
            style={columnStyle(80, 1.1, {
              paddingRight: 16,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 12,
            })}
          >
            {isPaid && (
              <>
                <TouchableOpacity
                  onPress={() => openReceipt(item)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="eye" size={18} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => generatePDF(item)}
                  disabled={isDownloading}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#10b981" />
                  ) : (
                    <Feather name="download" size={18} color="#10b981" />
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600 dark:text-slate-400">
          Loading invoices...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-slate-950">
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#3b82f6"]}
            tintColor={isDark ? "#60a5fa" : "#3b82f6"}
          />
        }
      >
        <View
          className={`mx-4 mt-8 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 ${isSmallScreen ? "p-4 mx-3" : ""}`}
        >
          <Text
            className={`text-xl font-bold text-blue-700 dark:text-blue-400 mb-3 ${isSmallScreen ? "text-lg" : ""}`}
          >
            {userData.student_name}{" "}
            <Text className="text-gray-600 dark:text-slate-400 text-base">
              (SID: {userData.student_id || "-"})
            </Text>
          </Text>
          <View className="flex-row flex-wrap justify-between gap-4">
            <View className="flex-1 min-w-[45%]">
              <Text
                className={`text-gray-600 dark:text-slate-400 ${isSmallScreen ? "text-xs" : "text-sm"} mb-1`}
              >
                Academic Year: {userData.academic_year || "-"}
              </Text>
              <Text
                className={`text-gray-600 dark:text-slate-400 ${isSmallScreen ? "text-xs" : "text-sm"} mb-1`}
              >
                Department: {userData.department_name || "-"}
              </Text>
              <Text
                className={`text-gray-600 dark:text-slate-400 ${isSmallScreen ? "text-xs" : "text-sm"}`}
              >
                Class: {userData.class_name || "-"} - {userData.shift || "-"} -{" "}
                {userData.section || "-"}
              </Text>
            </View>
            <View className="flex-1 min-w-[45%]">
              <Text
                className={`text-gray-600 dark:text-slate-400 ${isSmallScreen ? "text-xs" : "text-sm"} mb-1`}
              >
                Group: {userData.group || "-"}
              </Text>
              <Text
                className={`text-gray-600 dark:text-slate-400 ${isSmallScreen ? "text-xs" : "text-sm"} mb-1`}
              >
                Roll: {userData.roll || "-"}
              </Text>
            </View>
          </View>
        </View>

        {error ? (
          <View
            className={`mx-4 mt-6 bg-white dark:bg-slate-900 p-10 rounded-2xl items-center shadow-sm border border-gray-100 dark:border-slate-800 ${isSmallScreen ? "p-6 mx-3" : ""}`}
          >
            <MaterialIcons
              name="error-outline"
              size={isSmallScreen ? 48 : 64}
              color="#ef4444"
            />
            <Text
              className={`mt-4 text-xl font-semibold text-gray-800 dark:text-slate-100 ${isSmallScreen ? "text-lg" : ""}`}
            >
              Failed to load invoices
            </Text>
            <TouchableOpacity
              onPress={() => refetch()}
              className="mt-6 bg-blue-600 px-8 py-3 rounded-xl"
            >
              <Text className="text-white font-medium">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : invoices.length === 0 ? (
          <View
            className={`mx-4 mt-6 bg-white dark:bg-slate-900 p-10 rounded-2xl items-center shadow-sm border border-gray-100 dark:border-slate-800 ${isSmallScreen ? "p-6 mx-3" : ""}`}
          >
            <Feather
              name="file-text"
              size={isSmallScreen ? 36 : 48}
              color="#9ca3af"
            />
            <Text
              className={`mt-4 text-gray-600 dark:text-slate-400 font-medium ${isSmallScreen ? "text-sm" : ""}`}
            >
              No invoices found
            </Text>
            <Text
              className={`text-gray-500 dark:text-slate-500 text-sm mt-2 text-center ${isSmallScreen ? "text-xs" : ""}`}
            >
              There are no payment records for the current academic year
            </Text>
            <TouchableOpacity
              onPress={() => refetch()}
              className="mt-6 bg-blue-600 px-8 py-3 rounded-xl"
            >
              <Text className="text-white font-medium">Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View
            className={`mx-4 mt-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden ${isSmallScreen ? "mx-3" : ""}`}
          >
            {useFlexLayout ? (
              <View style={{ width: "100%" }}>
                <TableHeader />
                <FlatList
                  data={invoices}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => <InvoiceRow item={item} />}
                  scrollEnabled={false}
                />
              </View>
            ) : (
              <HScrollTable minWidth={hasAnyPaid ? 650 : 550}>
                <TableHeader />
                <FlatList
                  data={invoices}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => <InvoiceRow item={item} />}
                  scrollEnabled={false}
                />
              </HScrollTable>
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType={isWeb ? "fade" : "slide"}
        onRequestClose={() => setModalVisible(false)}
      >
        {selectedInvoice && selectedReceipt && (
          <View className="flex-1 bg-black/30 justify-center px-3 py-4">
            <View
              className={`bg-white dark:bg-slate-900 rounded-[24px] self-center overflow-hidden border border-slate-200 dark:border-slate-800 ${isDesktop ? "w-[92%]" : "w-full"}`}
              style={{ maxWidth: 1140, maxHeight: "96%" as never }}
            >
              <View className="flex-row items-center justify-between px-5 py-5 border-b border-slate-200 dark:border-slate-800">
                <Text className="text-slate-900 dark:text-slate-100 text-xl font-black flex-1">
                  Invoice: {selectedInvoice.invoice}
                </Text>
                <View className="flex-row items-center gap-3">
                  {(selectedInvoice.payment_state?.toUpperCase() ===
                    "COMPLETED" ||
                    selectedInvoice.payment_state?.toUpperCase() ===
                      "PAID") && (
                    <TouchableOpacity
                      onPress={() => generatePDF(selectedInvoice)}
                      disabled={downloadingId === selectedInvoice.id}
                      className="bg-emerald-500 px-4 py-3 rounded-xl flex-row items-center"
                    >
                      {downloadingId === selectedInvoice.id ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Feather name="download" size={18} color="#ffffff" />
                          <Text className="text-white font-bold ml-2">
                            Download
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    className="w-10 h-10 items-center justify-center"
                  >
                    <Ionicons
                      name="close"
                      size={24}
                      color={isDark ? "#cbd5e1" : "#64748b"}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 16 }}
              >
                <ReceiptPreview
                  receipt={selectedReceipt}
                  formatCurrency={formatCurrency}
                  isMobile={!isDesktop}
                />
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
};

function ReceiptPreview({
  receipt,
  formatCurrency,
  isMobile,
}: {
  receipt: ReceiptData;
  formatCurrency: (value?: number | string | null) => string;
  isMobile: boolean;
}) {
  const totals = receipt.rows.reduce(
    (acc, row) => ({
      feeAmount: acc.feeAmount + row.feeAmount,
      paidFine: acc.paidFine + row.paidFine,
      waiver: acc.waiver + row.waiver,
      previouslyPaid: acc.previouslyPaid + row.previouslyPaid,
      paidAmount: acc.paidAmount + row.paidAmount,
      dueAmount: acc.dueAmount + row.dueAmount,
    }),
    {
      feeAmount: 0,
      paidFine: 0,
      waiver: 0,
      previouslyPaid: 0,
      paidAmount: 0,
      dueAmount: 0,
    },
  );

  return (
    <View className="bg-slate-50 p-4 rounded-xl">
      <View className="bg-white border-2 border-slate-700 px-4 py-4">
        <Text className="text-slate-900 text-xl font-black uppercase">
          {receipt.instituteName}
        </Text>
        <Text className="text-slate-600 text-xs mt-1">
          {receipt.instituteAddress}
        </Text>

        <Text className="text-center text-lg font-black underline mt-4 mb-4">
          Money Receipt
        </Text>

        <View
          style={{
            flexDirection: isMobile ? "column" : "row",
            gap: 24,
          }}
        >
          <View style={{ flex: 1 }}>
            <MetaLine label="Student ID" value={receipt.studentId} />
            <MetaLine label="Name" value={receipt.studentName} />
            <MetaLine label="Phone" value={receipt.phone} />
            <MetaLine label="Department" value={receipt.department} />
            <MetaLine
              label="Class-Shift-Section"
              value={receipt.classShiftSection}
            />
            <MetaLine label="Student Roll" value={receipt.studentRoll} />
          </View>
          <View style={{ flex: 1 }}>
            <MetaLine
              label="Academic Year and Session"
              value={receipt.academicYearSession}
            />
            <MetaLine label="Invoice No" value={receipt.invoiceNo} />
            <MetaLine label="Payment Date" value={receipt.paymentDate} />
            <MetaLine label="Payment Method" value={receipt.paymentMethod} />
            <MetaLine label="Collected By" value={receipt.collectedBy} />
            <MetaLine label="Payment Status" value={receipt.paymentStatus} />
          </View>
        </View>

        <HorizontalScrollView horizontal showsHorizontalScrollIndicator>
          <View className="mt-4" style={{ minWidth: isMobile ? 980 : 980 }}>
            <ReceiptTableHeader />

            {receipt.rows.map((row, index) => (
              <View
                key={`${row.feeHead}-${row.feeSubHead}-${index}`}
                className="flex-row border-x border-b border-slate-800"
              >
                <ReceiptCell text={row.academicYear} width={90} />
                <ReceiptCell text={row.feeHead} width={125} />
                <ReceiptCell text={row.feeSubHead} width={125} />
                <ReceiptCell
                  text={formatCurrency(row.feeAmount)}
                  width={110}
                  align="right"
                />
                <ReceiptCell
                  text={formatCurrency(row.paidFine)}
                  width={85}
                  align="right"
                />
                <ReceiptCell
                  text={formatCurrency(row.waiver)}
                  width={80}
                  align="right"
                />
                <ReceiptCell
                  text={formatCurrency(row.previouslyPaid)}
                  width={120}
                  align="right"
                />
                <ReceiptCell
                  text={formatCurrency(row.paidAmount)}
                  width={105}
                  align="right"
                />
                <ReceiptCell
                  text={formatCurrency(row.dueAmount)}
                  width={105}
                  align="right"
                  isLast
                />
              </View>
            ))}

            <View className="flex-row border-x border-b border-slate-800">
              <ReceiptCell text="Totals:" width={340} align="right" bold />
              <ReceiptCell
                text={formatCurrency(totals.feeAmount)}
                width={110}
                align="right"
                bold
              />
              <ReceiptCell
                text={formatCurrency(totals.paidFine)}
                width={85}
                align="right"
                bold
              />
              <ReceiptCell
                text={formatCurrency(totals.waiver)}
                width={80}
                align="right"
                bold
              />
              <ReceiptCell
                text={formatCurrency(totals.previouslyPaid)}
                width={120}
                align="right"
                bold
              />
              <ReceiptCell
                text={formatCurrency(totals.paidAmount)}
                width={105}
                align="right"
                bold
              />
              <ReceiptCell
                text={formatCurrency(totals.dueAmount)}
                width={105}
                align="right"
                bold
                isLast
              />
            </View>

            {receipt.absentFine > 0 && (
              <>
                <View className="flex-row border-x border-b border-slate-800">
                  <ReceiptCell
                    text="Absent Fine"
                    width={735}
                    align="right"
                    bold
                  />
                  <ReceiptCell
                    text={formatCurrency(receipt.absentFine)}
                    width={105}
                    align="right"
                    bold
                  />
                  <ReceiptCell text="" width={105} isLast />
                </View>
                <View className="flex-row border-x border-b border-slate-800">
                  <ReceiptCell
                    text="Grand Total"
                    width={735}
                    align="right"
                    bold
                  />
                  <ReceiptCell
                    text={formatCurrency(receipt.totalAmount)}
                    width={105}
                    align="right"
                    bold
                  />
                  <ReceiptCell text="" width={105} isLast />
                </View>
              </>
            )}

            <View className="flex-row border-x border-b border-slate-800">
              <ReceiptCell text="In Word:" width={90} bold />
              <ReceiptCell text={receipt.amountInWords} width={250} />
              <ReceiptCell text="Remarks" width={110} bold />
              <ReceiptCell text="" width={605} isLast />
            </View>
          </View>
        </HorizontalScrollView>

        <View
          className="mt-20 pt-3 border-t border-slate-300"
          style={{
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            gap: isMobile ? 8 : 16,
          }}
        >
          <Text className="text-[11px] text-slate-500">
            <Text className="font-bold text-slate-700">Powered By:</Text>{" "}
            Academy-Institute Management System
          </Text>
          <Text className="text-[11px] text-slate-500">
            <Text className="font-bold text-slate-700">Note:</Text> This Money
            Receipt was created on a software.
          </Text>
        </View>
      </View>
    </View>
  );
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row mb-2 items-start">
      <Text
        className="text-slate-700 text-xs"
        style={{ width: 145, lineHeight: 18 }}
      >
        {label}
      </Text>
      <Text
        className="text-slate-900 text-xs flex-1"
        style={{ lineHeight: 18 }}
      >
        : {value || "-"}
      </Text>
    </View>
  );
}

function ReceiptTableHeader() {
  return (
    <View className="flex-row border border-slate-800 bg-slate-100">
      <ReceiptCell text="Academic Year" width={90} header />
      <ReceiptCell text="Fee Head" width={125} header />
      <ReceiptCell text="Fee Sub Head" width={125} header />
      <ReceiptCell text="Fee Amount" width={110} header />
      <ReceiptCell text="Paid Fine" width={85} header />
      <ReceiptCell text="Waiver" width={80} header />
      <ReceiptCell text="Previously Paid" width={120} header />
      <ReceiptCell text="Paid Amount" width={105} header />
      <ReceiptCell text="Due Amount" width={105} header isLast />
    </View>
  );
}

function ReceiptCell({
  text,
  width,
  header,
  align = "left",
  bold,
  isLast,
}: {
  text: string;
  width: number;
  header?: boolean;
  align?: "left" | "right" | "center";
  bold?: boolean;
  isLast?: boolean;
}) {
  return (
    <View
      style={{
        width,
        paddingHorizontal: 6,
        paddingVertical: header ? 7 : 6,
        borderRightWidth: isLast ? 0 : 1,
        borderRightColor: "#1e293b",
      }}
    >
      <Text
        className={`text-[11px] ${header || bold ? "font-bold" : "font-medium"} text-slate-900`}
        style={{ textAlign: align }}
      >
        {text}
      </Text>
    </View>
  );
}

export default Invoices;
