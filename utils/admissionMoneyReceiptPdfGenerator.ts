import { showMessage } from "@/components/shared/CustomToast/message";
import {
  getPdfFooterHtml,
  PDF_FOOTER_CSS,
} from "@/components/shared/pdfFooter";
import { AdmissionPaymentInvoice } from "@/redux/allApi/autoenroll/admissionPaymentApi";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import { Platform } from "react-native";

const esc = (s?: string | number | null): string => {
  if (s == null || s === "") return "&mdash;";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

const titleCase = (s?: string | null): string =>
  s ? s.replace(/\b\w/g, (c) => c.toUpperCase()) : "";

const formatDate = (raw?: string): string => {
  if (!raw) return "&mdash;";
  const d = new Date(raw.replace(" ", "T"));
  if (isNaN(d.getTime())) return esc(raw);
  return `${d.getDate()}, ${d.toLocaleString("en-US", { month: "long" })} ${d.getFullYear()}`;
};

const money = (n: number | string | undefined | null): string => {
  const v = Number(n ?? 0);
  return isNaN(v) ? "0.00" : v.toFixed(2);
};

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
    showMessage(
      "success",
      "Saved",
      "Payment slip saved to your Downloads folder.",
    );
  } catch {
    showMessage("error", "Failed", "Could not save payment slip to storage.");
  }
};

// `institute_wise_config`'s "Payment Portal Receipt Type" ("A5 Single (v2)",
// "A4 Single (v1)", ...) picks the paper size — everything else about the
// layout stays the same, it's just an A5 vs A4 @page size.
const resolvePageSize = (invoice: AdmissionPaymentInvoice): "A4" | "A5" => {
  const cfg = invoice.institute_wise_config?.find(
    (c) => c.short_name === "payment_portal_receipt_type",
  );
  return cfg?.value?.toUpperCase().includes("A4") ? "A4" : "A5";
};

function buildHtml(
  invoice: AdmissionPaymentInvoice,
  pageSize: "A4" | "A5",
): string {
  const data = invoice.invoice_data;
  const institute = invoice.institute_details;
  const funds = invoice.fund_details ?? [];

  const feeHeadGroups = new Map<
    string,
    { fundParts: string[]; amount: number }
  >();
  funds.forEach((f) => {
    const key = f.feehead_name || "Fee";
    const entry = feeHeadGroups.get(key) ?? { fundParts: [], amount: 0 };
    entry.fundParts.push(`${f.fund_name} - ${money(f.fund_amount)}`);
    entry.amount += Number(f.fund_amount || 0);
    feeHeadGroups.set(key, entry);
  });
  const totalAmount =
    Array.from(feeHeadGroups.values()).reduce((s, g) => s + g.amount, 0) ||
    Number(data?.payable_amount || 0);

  const feeRows = Array.from(feeHeadGroups.entries())
    .map(
      ([feeHead, g]) => `<tr>
        <td>${esc(feeHead)}</td>
        <td>${esc(g.fundParts.join(", "))}</td>
        <td class="amt">${money(g.amount)}</td>
      </tr>`,
    )
    .join("");

  const isSuccess =
    Number(data?.status) === 200 || invoice.status === "success";
  const qrValue = encodeURIComponent(
    data?.invoice || data?.unique_number || "",
  );
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=0&data=${qrValue}`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${esc(data?.invoice)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:Arial,sans-serif;font-size:10.5px;color:#1e293b;background:#fff;}
  @page{size:${pageSize} portrait;margin:10mm 12mm 14mm 12mm;}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}

  .hdr{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px;}
  .hdr-logo{width:44px;height:44px;border:1px solid #dde3ea;border-radius:4px;}
  .hdr-mid{flex:1;text-align:center;padding:0 10px;}
  .sch-name{font-size:14px;font-weight:700;color:#1e293b;}
  .sch-addr{font-size:9.5px;color:#64748b;margin-top:1px;}
  .receipt-title{font-size:12px;font-weight:700;text-decoration:underline;margin-top:6px;}
  .qr{width:60px;height:60px;}

  .it{width:100%;border-collapse:collapse;margin-top:8px;}
  .it td{padding:5px 9px;border:1px solid #dde3ea;font-size:10px;vertical-align:top;width:25%;}
  .it .lb{color:#64748b;font-weight:600;}
  .it .vl{color:#334155;}
  .status-ok{display:inline-block;background:#d1fae5;color:#047857;font-weight:700;font-size:9px;padding:2px 8px;border-radius:4px;}
  .status-bad{display:inline-block;background:#fee2e2;color:#b91c1c;font-weight:700;font-size:9px;padding:2px 8px;border-radius:4px;}

  .fee-tbl{width:100%;border-collapse:collapse;margin-top:10px;}
  .fee-tbl th{background:#eef2f7;color:#334155;padding:5px 9px;font-size:10px;text-align:left;border:1px solid #dde3ea;}
  .fee-tbl td{padding:5px 9px;font-size:10px;border:1px solid #dde3ea;vertical-align:top;}
  .fee-tbl .amt{text-align:right;}
  .fee-tbl .total-row td{font-weight:700;background:#f8fafc;}

  ${PDF_FOOTER_CSS}
</style>
</head>
<body>
  <div class="hdr">
    ${institute?.logo ? `<img class="hdr-logo" src="${institute.logo}" />` : `<div style="width:44px;height:44px;"></div>`}
    <div class="hdr-mid">
      <div class="sch-name">${esc(institute?.institute_name)}</div>
      ${institute?.institute_address ? `<div class="sch-addr">${esc(institute.institute_address)}</div>` : ""}
      <div class="receipt-title">Money Receipt</div>
    </div>
    <img class="qr" src="${qrUrl}" />
  </div>

  <table class="it">
    <tr>
      <td class="lb">Applicant ID</td><td class="vl">${esc(data?.unique_number)}</td>
      <td class="lb">Invoice No</td><td class="vl">${esc(data?.invoice)}</td>
    </tr>
    <tr>
      <td class="lb">Name</td><td class="vl">${esc(data?.applicant_name)}</td>
      <td class="lb">Transaction No</td><td class="vl">${esc(data?.trx_id)}</td>
    </tr>
    <tr>
      <td class="lb">Department</td><td class="vl">${esc(data?.department)}</td>
      <td class="lb">Payment Date</td><td class="vl">${formatDate(data?.transaction_date)}</td>
    </tr>
    <tr>
      <td class="lb">Faculty</td><td class="vl">${esc(data?.group)}</td>
      <td class="lb">Payment Method</td><td class="vl">Online</td>
    </tr>
    <tr>
      <td class="lb">Class-Hall</td><td class="vl">${titleCase(data?.class)} - ${titleCase(data?.shift)}</td>
      <td class="lb">Payment Status</td><td class="vl"><span class="${isSuccess ? "status-ok" : "status-bad"}">${isSuccess ? "SUCCESS" : "FAILED"}</span></td>
    </tr>
    <tr>
      <td class="lb">Student ID</td><td class="vl">${esc(data?.assigned_roll)}</td>
      <td class="lb">Session</td><td class="vl">${esc(data?.academic_year)}</td>
    </tr>
  </table>

  <table class="fee-tbl">
    <tr><th>Fee Head</th><th>Fund Distribution</th><th style="text-align:right;">Amount</th></tr>
    ${feeRows}
    <tr class="total-row"><td colspan="2" style="text-align:right;">Total Paid</td><td class="amt">${money(totalAmount)}</td></tr>
  </table>

  ${getPdfFooterHtml({ showPageDate: true })}
</body>
</html>`;
}

export async function generateAdmissionMoneyReceiptPdf(
  invoice: AdmissionPaymentInvoice,
): Promise<void> {
  const pageSize = resolvePageSize(invoice);
  const filename =
    invoice.invoice_data?.invoice ||
    invoice.invoice_data?.unique_number ||
    "Payment_Slip";
  const html = buildHtml(invoice, pageSize);

  if (Platform.OS === "web") {
    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:none;";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    await new Promise((r) => setTimeout(r, 1400));
    const oldTitle = document.title;
    document.title = filename;
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.title = oldTitle;
    }, 1500);
    setTimeout(() => document.body.removeChild(iframe), 1200);
    return;
  }

  try {
    const result = await Print.printToFileAsync({
      html,
      base64: Platform.OS === "android",
    });
    if (Platform.OS === "android" && result.base64) {
      await downloadPdfOnAndroid(filename, result.base64);
    } else {
      const fileUri = `${FileSystem.documentDirectory}${filename}.pdf`;
      await FileSystem.copyAsync({ from: result.uri, to: fileUri });
      showMessage("success", "Saved", "Payment slip generated successfully.");
    }
  } catch {
    showMessage("error", "Error", "Failed to generate payment slip");
  }
}
