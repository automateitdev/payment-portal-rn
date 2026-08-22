import { Platform } from "react-native";
import QRCode from "qrcode";

export type MoneyReceiptRow = {
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

export type MoneyReceiptData = {
  instituteName: string;
  instituteAddress: string;
  instituteLogoUrl?: string | null;
  invoiceNo: string;
  studentId: string;
  studentName: string;
  phone: string;
  department: string;
  group: string;
  classShiftSection: string;
  studentRoll: string;
  academicYear: string;
  academicYearSession: string;
  paymentDate: string;
  paymentMethod: string;
  collectedBy: string;
  paymentStatus: string;
  totalAmount: number;
  softwareCharge: number;
  amountInWords: string;
  rows: MoneyReceiptRow[];
  absentFine: number;
};

// The four "Payment Portal Receipt Type" general-config options. Each maps to
// one of two content templates ("simple" for v1-single, "rich" for the
// v2/double family) laid out on either one or two copies per page.
type ReceiptLayout = {
  paperSize: "A4" | "A5";
  copies: 1 | 2;
  template: "simple" | "rich";
  showQr: boolean;
  dashedCopyBox: boolean;
};

const LAYOUTS: Record<string, ReceiptLayout> = {
  "a5 single v1": {
    paperSize: "A5",
    copies: 1,
    template: "simple",
    showQr: true,
    dashedCopyBox: false,
  },
  "a5 single v2": {
    paperSize: "A5",
    copies: 1,
    template: "rich",
    showQr: true,
    dashedCopyBox: false,
  },
  "a4 double v1": {
    paperSize: "A4",
    copies: 2,
    template: "simple",
    showQr: true,
    dashedCopyBox: false,
  },
  "a4 double v2": {
    paperSize: "A4",
    copies: 2,
    template: "rich",
    showQr: true,
    dashedCopyBox: true,
  },
};

const DEFAULT_LAYOUT_KEY = "a5 single v2";

const normalizeReceiptType = (value?: string | null) =>
  (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const resolveLayout = (receiptType?: string | null): ReceiptLayout =>
  LAYOUTS[normalizeReceiptType(receiptType)] || LAYOUTS[DEFAULT_LAYOUT_KEY];

// Lets other renderers (e.g. the on-screen preview modal) branch between the
// "simple" (A5 Single v1) and "rich" (A5 Single v2 / A4 Double) content sets
// without duplicating the config-string parsing logic.
export const getReceiptTemplateKind = (
  receiptType?: string | null,
): "simple" | "rich" => resolveLayout(receiptType).template;

// expo-print's printToFileAsync wants an explicit width/height (in points,
// 72pt/inch) matching the @page size declared in the HTML below.
export const getReceiptPrintDimensions = (receiptType?: string | null) => {
  const layout = resolveLayout(receiptType);
  if (layout.paperSize === "A4" && layout.copies === 2) {
    return { width: 842, height: 595 }; // A4 landscape
  }
  return { width: 420, height: 595 }; // A5 portrait
};

const escapeHtml = (value?: string | number | null) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatCurrency = (value?: number | string | null) => {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return Number.isNaN(num)
    ? "0.00"
    : num.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
};

const sumRows = (rows: MoneyReceiptRow[], key: keyof MoneyReceiptRow) =>
  rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);

const IMAGE_FETCH_TIMEOUT_MS = 8000;

// Fetches a remote image and inlines it as a base64 data URI. The PDF/print
// step (expo-print on native, window.print() on web) takes its snapshot as
// soon as the document is "ready" without actually waiting for remote <img>
// requests to finish, so a plain remote <img src="..."> intermittently
// renders blank depending on network speed. Inlining removes that race
// entirely — by the time the HTML is handed to the print engine, the image
// bytes are already embedded, no network fetch needed.
const fetchImageAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      IMAGE_FETCH_TIMEOUT_MS,
    );
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) return null;

    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onerror = () => resolve(null);
      reader.onload = () =>
        resolve(typeof reader.result === "string" ? reader.result : null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const getLogoHtml = async (receipt: MoneyReceiptData) => {
  if (receipt.instituteLogoUrl) {
    const dataUrl = await fetchImageAsDataUrl(receipt.instituteLogoUrl);
    if (dataUrl) {
      return `<img src="${dataUrl}" alt="Institute Logo" class="logo" />`;
    }
  }
  return `<div class="logo logo-fallback">${escapeHtml(receipt.instituteName.charAt(0))}</div>`;
};

const getQrCodeHtml = async (receipt: MoneyReceiptData) => {
  const qrData = buildQrData(receipt);

  try {
    if (Platform.OS === "web") {
      const qrCodeUrl = await QRCode.toDataURL(qrData, {
        margin: 1,
        width: 200,
        color: { dark: "#111827", light: "#ffffff" },
      });
      return `<img src="${qrCodeUrl}" alt="QR Code" class="qr-code" />`;
    }
    const svgString = await QRCode.toString(qrData, {
      type: "svg",
      margin: 1,
      color: { dark: "#111827", light: "#ffffff" },
    });
    const svgDataUrl =
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
    return `<img src="${svgDataUrl}" alt="QR Code" class="qr-code" />`;
  } catch {
    const fallbackUrl = `https://quickchart.io/qr?size=200&text=${encodeURIComponent(qrData)}&margin=1`;
    return `<img src="${fallbackUrl}" alt="QR Code" class="qr-code" />`;
  }
};

const buildQrData = (receipt: MoneyReceiptData) => {
  const payable = sumRows(receipt.rows, "feeAmount");
  const due = sumRows(receipt.rows, "dueAmount");

  return [
    `ID: ${receipt.studentId}`,
    `Name: ${receipt.studentName}`,
    `Class-Shift-Section: ${receipt.classShiftSection}`,
    `Roll: ${receipt.studentRoll}`,
    `Academic Year: ${receipt.academicYear}`,
    `Payable: ${formatCurrency(payable)}`,
    `Paid: ${formatCurrency(receipt.totalAmount)}`,
    `Due: ${formatCurrency(due)}`,
  ].join("\n");
};

// A plain image URL (works with a plain RN <Image>, no canvas/SVG support
// needed) for the on-screen preview modal. The PDF/print HTML uses the
// higher-quality local QRCode generation in getQrCodeHtml instead.
export const getReceiptQrImageUrl = (receipt: MoneyReceiptData) =>
  `https://quickchart.io/qr?size=200&text=${encodeURIComponent(buildQrData(receipt))}&margin=1`;

const copyLabelHtml = (label: string, dashed: boolean) =>
  `<div class="copy-label ${dashed ? "dashed" : ""}">${escapeHtml(label)}</div>`;

const copyLabelCenteredHtml = (label: string, dashed: boolean) =>
  `<div class="copy-label-center-wrap"><div class="copy-label ${dashed ? "dashed" : ""}">${escapeHtml(label)}</div></div>`;

// ---- "simple" content template: A5 Single v1 ----
const buildSimpleBlock = (
  receipt: MoneyReceiptData,
  qrHtml: string,
  logoHtml: string,
  copyLabel?: string,
) => {
  const rowsHtml = receipt.rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.academicYear)}</td>
          <td>${escapeHtml(row.feeHead)}</td>
          <td>${escapeHtml(row.feeSubHead)}</td>
          <td class="numeric">${escapeHtml(formatCurrency(row.waiver))}</td>
          <td class="numeric">${escapeHtml(formatCurrency(row.paidFine))}</td>
          <td class="numeric">${escapeHtml(formatCurrency(row.feeAmount))}</td>
        </tr>
      `,
    )
    .join("");

  const totalPayable = sumRows(receipt.rows, "feeAmount");
  const dueAmount = sumRows(receipt.rows, "dueAmount");

  return `
    <div class="sheet simple-sheet">
      ${copyLabel ? copyLabelHtml(copyLabel, false) : ""}
      <div class="simple-header">
        ${logoHtml}
        <div class="simple-institute">
          <div class="institute-name">${escapeHtml(receipt.instituteName)}</div>
          <div class="institute-address">${escapeHtml(receipt.instituteAddress)}</div>
        </div>
        <div class="simple-qr">${qrHtml}</div>
      </div>
      <div class="title">Money Receipt</div>

      <table class="simple-meta">
        <tr><td class="label">Student ID</td><td>: ${escapeHtml(receipt.studentId)}</td></tr>
        <tr><td class="label">Name</td><td>: ${escapeHtml(receipt.studentName)}</td></tr>
        <tr><td class="label">Group</td><td>: ${escapeHtml(receipt.group)}</td></tr>
        <tr><td class="label">Class-Shift-Section</td><td>: ${escapeHtml(receipt.classShiftSection)}</td></tr>
        <tr><td class="label">Roll No</td><td>: ${escapeHtml(receipt.studentRoll)}</td></tr>
        <tr><td class="label">Mobile No</td><td>: ${escapeHtml(receipt.phone)}</td></tr>
      </table>

      <table class="simple-details">
        <thead>
          <tr>
            <th>Acad. Year</th>
            <th>Fee Head</th>
            <th>Fee Sub Heads</th>
            <th>Waiver</th>
            <th>Fine</th>
            <th>Payable</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr>
            <td colspan="3" rowspan="3" class="note-cell">Note:</td>
            <td colspan="2" class="totals-label">Total Payable</td>
            <td class="numeric"><strong>${escapeHtml(formatCurrency(totalPayable))}</strong></td>
          </tr>
          <tr>
            <td colspan="2" class="totals-label">Paid Amount</td>
            <td class="numeric"><strong>${escapeHtml(formatCurrency(receipt.totalAmount))}</strong></td>
          </tr>
          <tr>
            <td colspan="2" class="totals-label">Due Amount</td>
            <td class="numeric">${escapeHtml(formatCurrency(dueAmount))}</td>
          </tr>
        </tbody>
      </table>

      <div class="simple-word"><strong>Paid In Word:</strong> ${escapeHtml(receipt.amountInWords)}</div>
      <div class="simple-charge"><strong>Software Charge</strong> : ${escapeHtml(formatCurrency(receipt.softwareCharge))}</div>

      <table class="simple-footer-meta">
        <tr><td class="label">Invoice ID</td><td>: ${escapeHtml(receipt.invoiceNo)}</td><td></td></tr>
        <tr><td class="label">Academic Year</td><td>: ${escapeHtml(receipt.academicYear)}</td><td></td></tr>
        <tr><td class="label">Payment Date</td><td>: ${escapeHtml(receipt.paymentDate)}</td><td></td></tr>
        <tr><td class="label">Collected By</td><td>: ${escapeHtml(receipt.collectedBy)}</td><td class="no-sign">No need to sign</td></tr>
      </table>

      <div class="simple-powered">Powered By: Academy-Institute Management System</div>
    </div>
  `;
};

// ---- "rich" content template: A5 Single v2 (base) + A4 Double v1/v2 ----
const buildRichBlock = (
  receipt: MoneyReceiptData,
  qrHtml: string,
  copyLabel: string | undefined,
  dashedCopyBox: boolean,
) => {
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
    <div class="sheet rich-sheet">
      <div class="rich-header">
        <div class="rich-header-text">
          <div class="institute">${escapeHtml(receipt.instituteName)}</div>
          <div class="address">${escapeHtml(receipt.instituteAddress)}</div>
        </div>
        ${qrHtml ? `<div class="rich-header-side">${qrHtml}</div>` : ""}
      </div>
      <div class="title">Money Receipt</div>
      ${copyLabel ? copyLabelCenteredHtml(copyLabel, dashedCopyBox) : ""}

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
            <td class="numeric"><strong>${escapeHtml(formatCurrency(sumRows(receipt.rows, "feeAmount")))}</strong></td>
            <td class="numeric"><strong>${escapeHtml(formatCurrency(sumRows(receipt.rows, "paidFine")))}</strong></td>
            <td class="numeric"><strong>${escapeHtml(formatCurrency(sumRows(receipt.rows, "waiver")))}</strong></td>
            <td class="numeric"><strong>${escapeHtml(formatCurrency(sumRows(receipt.rows, "previouslyPaid")))}</strong></td>
            <td class="numeric"><strong>${escapeHtml(formatCurrency(sumRows(receipt.rows, "paidAmount")))}</strong></td>
            <td class="numeric"><strong>${escapeHtml(formatCurrency(sumRows(receipt.rows, "dueAmount")))}</strong></td>
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
            <td colspan="2">${escapeHtml(receipt.amountInWords)}</td>
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
  `;
};

const SHARED_STYLES = `
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #ffffff; color: #111827; }

  .page { display: flex; flex-direction: row; width: 100%; height: 100%; }
  .page.single { justify-content: center; }
  .page.double { align-items: stretch; }

  .sheet { border: 2px solid #2f2f2f; padding: 10px; position: relative; flex: 1; }
  .page.single .sheet { width: 100%; min-height: 100%; }
  .page.double .sheet { width: 50%; }
  .page.double .sheet:first-child { border-right-style: dashed; border-right-width: 1px; }

  .copy-label { font-size: 8.5px; font-weight: 700; text-transform: uppercase; color: #374151; margin-bottom: 4px; align-self: flex-end; }
  .copy-label.dashed { border: 1px dashed #6b7280; padding: 2px 8px; border-radius: 3px; }
  .copy-label-center-wrap { margin-bottom: 8px; }
  .copy-label-center-wrap .copy-label { margin-bottom: 0; text-align: center; }
  .copy-label-center-wrap .copy-label.dashed { display: block; width: 100%; padding: 4px 8px; border-radius: 0; }

  .title { font-size: 12px; font-weight: 700; text-align: center; text-decoration: underline; margin-bottom: 8px; }

  .numeric { text-align: right; }
  .totals-label { font-weight: 700; text-align: right; }

  /* rich template */
  .rich-header { display: flex; flex-direction: row; justify-content: space-between; align-items: flex-start; gap: 10px; }
  .rich-header-text { flex: 1; min-width: 0; }
  .rich-header-side { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
  .rich-sheet .institute { font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 2px; }
  .rich-sheet .address { font-size: 9px; margin-bottom: 8px; }
  .qr-code { width: 56px; height: 56px; display: block; }
  .meta { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  .meta td { font-size: 8.5px; padding: 1px 3px; vertical-align: top; line-height: 1.25; }
  .meta .label { width: 92px; }
  .meta .value { width: 120px; }
  .details { width: 100%; border-collapse: collapse; margin-top: 6px; table-layout: fixed; }
  .details th, .details td { border: 1px solid #1f2937; padding: 3px 4px; font-size: 7.5px; line-height: 1.2; word-break: break-word; }
  .details th { background: #f8fafc; text-align: center; font-weight: 700; }
  .remarks-row td { font-size: 7.5px; }
  .rich-sheet .footer { margin-top: 24px; padding-top: 6px; border-top: 1px solid #d1d5db; display: flex; justify-content: space-between; gap: 10px; font-size: 7.5px; color: #4b5563; }
  .rich-sheet .footer strong { color: #374151; }
  .rich-sheet .footer > div { flex: 1; }

  /* simple template */
  .simple-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .logo { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
  .logo-fallback { display: flex; align-items: center; justify-content: center; background: #e2e8f0; color: #334155; font-weight: 700; font-size: 16px; }
  .simple-institute { flex: 1; }
  .simple-institute .institute-name { font-size: 11px; font-weight: 700; text-transform: uppercase; }
  .simple-institute .institute-address { font-size: 8px; color: #4b5563; }
  .simple-meta { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  .simple-meta td { font-size: 8.5px; padding: 1px 3px; line-height: 1.3; }
  .simple-meta .label { width: 120px; font-weight: 600; }
  .simple-details { width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed; }
  .simple-details th, .simple-details td { border: 1px solid #1f2937; padding: 3px 4px; font-size: 7.5px; line-height: 1.2; word-break: break-word; }
  .simple-details th { background: #f8fafc; text-align: center; font-weight: 700; }
  .note-cell { vertical-align: top; text-align: left; font-weight: 700; }
  .simple-word, .simple-charge { font-size: 8.5px; margin-top: 6px; }
  .simple-footer-meta { width: 100%; border-collapse: collapse; margin-top: 8px; padding-top: 4px; border-top: 1px solid #d1d5db; }
  .simple-footer-meta td { font-size: 8px; padding: 1px 3px; }
  .simple-footer-meta .label { width: 100px; font-weight: 600; }
  .simple-footer-meta .no-sign { color: #dc2626; font-weight: 700; text-align: right; }
  .simple-powered { margin-top: 6px; font-size: 7.5px; color: #4b5563; }
`;

export const generateMoneyReceiptHtml = async (
  receipt: MoneyReceiptData,
  receiptType?: string | null,
) => {
  const layout = resolveLayout(receiptType);
  const qrHtml = layout.showQr ? await getQrCodeHtml(receipt) : "";
  const logoHtml =
    layout.template === "simple" ? await getLogoHtml(receipt) : "";

  const pageStyle =
    layout.copies === 2
      ? `@page { size: A4 landscape; margin: 6mm; } html, body { width: 285mm; min-height: 195mm; }`
      : `@page { size: A5 portrait; margin: 8mm; } html, body { width: 132mm; min-height: 194mm; }`;

  const bodyHtml =
    layout.copies === 2
      ? `<div class="page double">
          ${
            layout.template === "simple"
              ? buildSimpleBlock(receipt, qrHtml, logoHtml, "Institute Copy") +
                buildSimpleBlock(receipt, qrHtml, logoHtml, "Student Copy")
              : buildRichBlock(
                  receipt,
                  qrHtml,
                  "Institute Copy",
                  layout.dashedCopyBox,
                ) +
                buildRichBlock(
                  receipt,
                  qrHtml,
                  "Student Copy",
                  layout.dashedCopyBox,
                )
          }
        </div>`
      : `<div class="page single">
          ${
            layout.template === "simple"
              ? buildSimpleBlock(receipt, qrHtml, logoHtml)
              : buildRichBlock(receipt, qrHtml, undefined, false)
          }
        </div>`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          ${pageStyle}
          ${SHARED_STYLES}
        </style>
      </head>
      <body>
        ${bodyHtml}
      </body>
    </html>
  `;
};
