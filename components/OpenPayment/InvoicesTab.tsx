import ReusableButton from "@/components/shared/Button/ReusableButton";

import {
  getPdfFooterHtml,
  PDF_FOOTER_CSS,
} from "@/components/shared/pdfFooter";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { showMessage } from "../shared/CustomToast/message";
import {
  useGetOpenPaymentInfoQuery,
  useLazyGetOpenPaymentInvoicesQuery,
} from "@/redux/allApi/openpayment/openPaymentApi";
import { normalizeApiError } from "../utils/errorNormalizer";
import ReusableTable, { TableColumn } from "../shared/Table/ReusableTable";
import ReusableInput from "../shared/ReusableInput";

/* ------------------------------ number → words ------------------------------ */
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

const threeDigitToWords = (n: number): string => {
  let str = "";
  if (n >= 100) {
    str += `${ones[Math.floor(n / 100)]} Hundred`;
    n %= 100;
    if (n) str += " and ";
  }
  if (n >= 20) {
    str += tens[Math.floor(n / 10)];
    if (n % 10) str += ` ${ones[n % 10]}`;
  } else if (n > 0) {
    str += ones[n];
  }
  return str.trim();
};

const numberToWords = (value: number): string => {
  const num = Math.floor(value);
  if (num === 0) return "Zero";
  const units = [
    { v: 10000000, label: "Crore" },
    { v: 100000, label: "Lakh" },
    { v: 1000, label: "Thousand" },
    { v: 1, label: "" },
  ];
  let remaining = num;
  const parts: string[] = [];
  for (const { v, label } of units) {
    if (remaining >= v) {
      const count = Math.floor(remaining / v);
      remaining %= v;
      const chunk =
        v === 1
          ? threeDigitToWords(count)
          : `${threeDigitToWords(count)} ${label}`;
      parts.push(chunk);
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
};

const amountInWords = (value: number): string =>
  `${numberToWords(value)} Taka Only`;

/* --------------------------------- helpers ---------------------------------- */
const formatReceiptDate = (raw?: string) => {
  if (!raw) return "—";
  const d = new Date(raw.replace(" ", "T"));
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const fmt = (v: any) => Number(v || 0).toFixed(2);

const downloadPdfOnAndroid = async (fileName: string, pdfBase64: string) => {
  try {
    const downloadRootUri =
      FileSystem.StorageAccessFramework.getUriForDirectoryInRoot("Download");
    const permissions =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
        downloadRootUri,
      );
    if (!permissions.granted) {
      showMessage(
        "error",
        "Permission Denied",
        "Download folder permission was not granted.",
      );
      return;
    }
    const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      fileName,
      "application/pdf",
    );
    await FileSystem.StorageAccessFramework.writeAsStringAsync(
      fileUri,
      pdfBase64,
      { encoding: FileSystem.EncodingType.Base64 },
    );
    showMessage("success", "Saved", "Receipt saved to your Downloads folder.");
  } catch {
    showMessage("error", "Failed", "Could not save receipt to storage.");
  }
};

/* ------------------------------- receipt html ------------------------------- */
const buildReceiptHtml = (invoice: any, institute: any) => {
  const s = invoice.student || {};
  const setup = invoice.setup || {};
  const base = fmt(invoice.base_amount);
  const paid = fmt(invoice.pay_amount);
  const chargePct = Number(invoice.charge_calculation_value || 0);
  const chargeAmt = fmt(invoice.charge_amount);

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><title>${invoice.invoice}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
@page{size:A4;margin:10mm;}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#222;}
.iname{font-size:16px;font-weight:bold;}
.iaddr{font-size:11px;color:#444;margin-top:2px;}
hr.line{border:none;border-top:1px solid #222;margin:8px 0;}
.title{text-align:center;font-size:14px;font-weight:bold;text-decoration:underline;margin:6px 0 12px;}
.meta{width:100%;border-collapse:collapse;margin-bottom:12px;}
.meta td{font-size:11px;padding:2px 0;vertical-align:top;}
.meta td.lbl{width:90px;color:#222;}
.meta td.sep{width:10px;}
.meta td.val{padding-right:18px;}
.fee{width:100%;border-collapse:collapse;border:1px solid #222;}
.fee th,.fee td{border:1px solid #222;padding:6px 8px;font-size:11px;}
.fee th{text-align:left;background:#fff;}
.fee .num{text-align:right;}
.fee .feehead{font-weight:bold;vertical-align:middle;}
.fee .tot{font-weight:bold;}
.inword{border:1px solid #222;border-top:none;padding:6px 8px;font-size:11px;font-style:italic;}
.inword b{font-style:italic;}
.charge{text-align:right;font-size:9px;color:#555;font-style:italic;margin-top:6px;}
${PDF_FOOTER_CSS}
</style></head>
<body>
<div class="iname">${institute?.institute_name || ""}</div>
<div class="iaddr">${institute?.institute_address || ""}</div>
<hr class="line"/>
<div class="title">Money Receipt</div>

<table class="meta">
  <tr>
    <td class="lbl">Student ID</td><td class="sep">:</td><td class="val">${s.student_id ?? "—"}</td>
    <td class="lbl">Roll</td><td class="sep">:</td><td class="val">${s.roll ?? "—"}</td>
  </tr>
  <tr>
    <td class="lbl">Name</td><td class="sep">:</td><td class="val">${s.name ?? invoice.applicant_name ?? "—"}</td>
    <td class="lbl">Group</td><td class="sep">:</td><td class="val">${s.group ?? "—"}</td>
  </tr>
  <tr>
    <td class="lbl">Mobile</td><td class="sep">:</td><td class="val">${s.mobile ?? "—"}</td>
    <td class="lbl">Invoice No</td><td class="sep">:</td><td class="val">${invoice.invoice ?? "—"}</td>
  </tr>
  <tr>
    <td class="lbl">Academic Year</td><td class="sep">:</td><td class="val">${s.academic_year ?? setup.academic_year ?? "—"}</td>
    <td class="lbl">Payment Date</td><td class="sep">:</td><td class="val">${formatReceiptDate(invoice.payment_date)}</td>
  </tr>
  <tr>
    <td class="lbl">Session</td><td class="sep">:</td><td class="val">${s.session ?? "—"}</td>
    <td class="lbl">Payment Method</td><td class="sep">:</td><td class="val">${invoice.payment_gateway ?? "—"}</td>
  </tr>
  <tr>
    <td class="lbl">Department</td><td class="sep">:</td><td class="val">${s.department ?? "—"}</td>
    <td class="lbl">Payment Status</td><td class="sep">:</td><td class="val">${invoice.payment_state === "COMPLETED" ? "Paid" : (invoice.payment_state ?? "—")}</td>
  </tr>
  <tr>
    <td class="lbl">Class</td><td class="sep">:</td><td class="val">${s.class ?? "—"}</td>
    <td></td><td></td><td></td>
  </tr>
</table>

<table class="fee">
  <tr>
    <th style="width:55%;">Fee Head</th>
    <th style="width:22%;">Amount</th>
    <th class="num" style="width:23%;">Paid</th>
  </tr>
  <tr>
    <td class="feehead" rowspan="2">${setup.fee_head ?? "—"}</td>
    <td>${base}</td>
    <td class="num">${paid}</td>
  </tr>
  <tr>
    <td class="tot">Total</td>
    <td class="num tot">${paid}</td>
  </tr>
</table>
<div class="inword"><b>In Word:</b> ${amountInWords(Number(invoice.pay_amount || 0))}</div>
<div class="charge">* Service Charge (${chargePct}%): ${chargeAmt}</div>

${getPdfFooterHtml({ note: true, showPageDate: false })}
</body></html>`;
};

/* ------------------------------- invoices tab ------------------------------- */
const InvoicesTab = ({ instituteId }: { instituteId: string }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 25,
  });

  const { data: infoRes } = useGetOpenPaymentInfoQuery(
    { instituteId },
    { skip: !instituteId },
  );
  const institute = infoRes?.payload?.data?.institute;

  const [triggerSearch, { isFetching }] = useLazyGetOpenPaymentInvoicesQuery();

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      showMessage(
        "warning",
        "Attention",
        "Please enter an invoice no. or mobile number.",
      );
      return;
    }
    try {
      const res = await triggerSearch({
        instituteId,
        invoice_search: searchTerm.trim(),
      }).unwrap();
      const data = res?.payload?.data;
      const list = data?.invoices || [];
      setInvoices(list);
      setHasSearched(true);
      setPagination((p) => ({ ...p, currentPage: 1 }));
      if (list.length === 0) {
        showMessage("info", "No Data", "No invoices found for this search.");
      } else {
        showMessage(
          "success",
          "Success",
          data?.message || "Invoices fetched successfully",
        );
      }
    } catch (err) {
      setInvoices([]);
      setHasSearched(true);
      showMessage("error", "Error", normalizeApiError(err).message);
    }
  };

  const handleDownload = async (invoice: any) => {
    try {
      const html = buildReceiptHtml(invoice, institute);
      const fileName = String(invoice.invoice || "receipt");

      if (Platform.OS === "web") {
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        document.body.appendChild(iframe);
        const cleanup = () =>
          setTimeout(() => {
            if (document.body.contains(iframe))
              document.body.removeChild(iframe);
          }, 1000);
        const printFrame = () => {
          const frameWindow = iframe.contentWindow;
          if (!frameWindow) return cleanup();
          const oldTitle = document.title;
          document.title = fileName;
          frameWindow.focus();
          frameWindow.print();
          document.title = oldTitle;
          cleanup();
        };
        const doc = iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(html);
          doc.close();
          if (iframe.contentWindow?.document.readyState === "complete")
            printFrame();
          else iframe.onload = printFrame;
        }
        return;
      }

      const result = await Print.printToFileAsync({
        html,
        base64: Platform.OS === "android",
      });
      if (Platform.OS === "android" && result.base64) {
        await downloadPdfOnAndroid(`${fileName}.pdf`, result.base64);
      } else {
        const fileUri = `${FileSystem.documentDirectory}${fileName}.pdf`;
        await FileSystem.copyAsync({ from: result.uri, to: fileUri });
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/pdf",
          dialogTitle: "Open Receipt",
          UTI: "com.adobe.pdf",
        });
      }
    } catch {
      showMessage("error", "Failed", "Could not generate the receipt.");
    }
  };

  const columns: TableColumn<any>[] = [
    {
      id: "name",
      name: "Name",
      minWidth: 140,
      render: (item) => (
        <Text className="text-gray-700">
          {item.student?.name || item.applicant_name || "—"}
        </Text>
      ),
    },
    {
      id: "student_id",
      name: "Student ID",
      width: 120,
      render: (item) => (
        <Text className="text-gray-700">{item.student?.student_id || "—"}</Text>
      ),
    },
    {
      id: "fee_head",
      name: "Fee Head",
      minWidth: 130,
      render: (item) => (
        <Text className="text-gray-700">{item.setup?.fee_head || "—"}</Text>
      ),
    },
    {
      id: "base",
      name: "Base Amt",
      width: 100,
      textAlign: "center",
      render: (item) => (
        <Text className="text-center text-gray-700">
          {fmt(item.base_amount)}
        </Text>
      ),
    },
    {
      id: "paid",
      name: "Total Paid",
      width: 100,
      textAlign: "center",
      render: (item) => (
        <Text className="text-center font-bold text-gray-800">
          {fmt(item.pay_amount)}
        </Text>
      ),
    },
    {
      id: "gateway",
      name: "Gateway",
      width: 90,
      textAlign: "center",
      render: (item) => (
        <Text className="text-center text-gray-700">
          {item.payment_gateway || "—"}
        </Text>
      ),
    },
    {
      id: "status",
      name: "Status",
      width: 120,
      textAlign: "center",
      render: (item) => {
        const done = item.payment_state === "COMPLETED";
        return (
          <View
            className={`self-center px-2.5 py-1 rounded-full ${done ? "bg-green-100" : "bg-amber-100"}`}
          >
            <Text
              className={`text-[11px] font-bold ${done ? "text-green-700" : "text-amber-700"}`}
            >
              {item.payment_state || "—"}
            </Text>
          </View>
        );
      },
    },
    {
      id: "date",
      name: "Payment Date",
      width: 150,
      render: (item) => (
        <Text className="text-gray-700">{item.payment_date || "—"}</Text>
      ),
    },
    {
      id: "receipt",
      name: "Receipt",
      width: 80,
      textAlign: "center",
      render: (item) =>
        item.payment_state === "COMPLETED" ? (
          <TouchableOpacity
            onPress={() => handleDownload(item)}
            className="self-center h-9 w-9 items-center justify-center rounded-lg bg-lime-50"
          >
            <Ionicons name="download-outline" size={18} color="#4d7c0f" />
          </TouchableOpacity>
        ) : (
          <Text className="text-center text-gray-300">—</Text>
        ),
    },
  ];

  return (
    <View>
      {/* Invoice search */}
      <View className="flex-col sm:flex-row sm:items-end lg:flex-col lg:items-stretch gap-4 mb-5">
        <View className="w-full sm:flex-1">
          <Text className="mb-1.5 text-[13px] font-medium text-[#334155]">
            Invoice Search
          </Text>
          <ReusableInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            placeholder="Invoice no. or mobile number"
          />
        </View>
        <ReusableButton
          title="Search"
          variant="primary"
          isLoading={isFetching}
          onPress={handleSearch}
          leftIcon={<Ionicons name="search" size={16} color="#ffffff" />}
        />
      </View>

      {hasSearched && (
        <ReusableTable
          data={invoices}
          columns={columns}
          loading={isFetching}
          emptyMessage="No invoices found"
          showZebra
          pagination={{
            totalRecords: invoices.length,
            currentPage: pagination.currentPage,
            pageSize: pagination.pageSize,
            onPageChange: (page) =>
              setPagination((p) => ({ ...p, currentPage: page })),
            onPageSizeChange: (size) =>
              setPagination({ currentPage: 1, pageSize: size }),
            rowsPerPageOptions: [25, 50, 100, 200, 500, 1000],
          }}
        />
      )}
    </View>
  );
};

export default InvoicesTab;
