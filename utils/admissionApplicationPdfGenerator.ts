import { showMessage } from "@/components/shared/CustomToast/message";
import { PDF_FOOTER_BRAND } from "@/components/shared/pdfFooter";
import {
  AdmissionPreviewData,
  AdmissionPreviewStudentData,
} from "@/redux/allApi/autoenroll/admissionDataApi";

import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import QRCodeLib from "qrcode";
import { Platform } from "react-native";

// Public URL this application's QR points at (same route the preview screen uses).
const buildApplicationUrl = (key?: string) => {
  const base = (process.env.EXPO_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  return `${base}/autoenroll/admission/preview/${key ?? ""}`;
};

// PNG data-URI QR (embedded, no network). Falls back to a remote QR image URL
// if the local encoder is unavailable on this platform.
const buildQrSrc = async (url: string): Promise<string> => {
  try {
    return await QRCodeLib.toDataURL(url, { margin: 1, width: 160 });
  } catch {
    return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`;
  }
};

const esc = (s?: string | number | null): string => {
  if (s == null || s === "") return "&mdash;";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

const parseJson = <T>(value: string | null | undefined): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

interface GeoPlace {
  name?: string;
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
    showMessage("success", "Saved", "PDF saved to your Downloads folder.");
  } catch {
    showMessage("error", "Failed", "Could not save PDF to storage.");
  }
};

// Generates the same admission-application PDF the Nuxt reference produces:
// A4 portrait, institute header + student photo, "Admission Information"
// title, then bordered label/value tables per section, declaration and
// signature lines at the end — matches the app's other report PDFs' shared
// helpers (PDF_FOOTER_CSS / getPdfFooterHtml) and print/share flow.
export async function generateAdmissionApplicationPdf(
  studentData: AdmissionPreviewStudentData,
  preview: AdmissionPreviewData,
  filename = "Admission_Application",
): Promise<void> {
  const appUrl = buildApplicationUrl(studentData.unique_number);
  const qrSrc = await buildQrSrc(appUrl);
  const html = buildHtml(studentData, preview, filename, qrSrc);

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
      showMessage("success", "Saved", "PDF generated successfully.");
    }
  } catch {
    showMessage("error", "Error", "Failed to generate PDF");
  }
}

function buildHtml(
  studentData: AdmissionPreviewStudentData,
  preview: AdmissionPreviewData,
  filename: string,
  qrSrc: string,
): string {
  const institute = studentData.institute_detail;
  const presentDivision = parseJson<GeoPlace>(studentData.present_division);
  const presentDistrict = parseJson<GeoPlace>(studentData.present_district);
  const presentUpozilla = parseJson<GeoPlace>(studentData.present_upozilla);
  const permanentDivision = parseJson<GeoPlace>(studentData.permanent_division);
  const permanentDistrict = parseJson<GeoPlace>(studentData.permanent_district);
  const permanentUpozilla = parseJson<GeoPlace>(studentData.permanent_upozilla);
  const eduInformation =
    parseJson<EduInfoPreviewRow[]>(studentData.edu_information) ?? [];
  const preferredSubjects = studentData.preferred_subjects;

  const secHdr = (title: string) => `<div class="sec-hdr">${title}</div>`;
  const row2 = (l1: string, v1: string, l2: string, v2: string) =>
    `<tr><td class="lb">${l1}</td><td class="vl">${v1}</td><td class="lb">${l2}</td><td class="vl">${v2}</td></tr>`;
  const row1 = (l1: string, v1: string) =>
    `<tr><td class="lb">${l1}</td><td class="vl" colspan="3">${v1}</td></tr>`;
  const row3 = (
    l1: string,
    v1: string,
    l2: string,
    v2: string,
    l3: string,
    v3: string,
  ) =>
    `<tr><td class="lb">${l1}</td><td class="vl">${v1}</td><td class="lb">${l2}</td><td class="vl">${v2}</td><td class="lb">${l3}</td><td class="vl">${v3}</td></tr>`;

  const subjectLine = (
    label: string,
    subjects?: { subject_code: string; subject_name: string }[],
  ) =>
    subjects?.length
      ? `<div class="subj-line"><b>${label}:</b> ${subjects.map((s) => `${esc(s.subject_code)}: ${esc(s.subject_name)}`).join(", ")}</div>`
      : "";

  const attachmentCell = (present?: string | null) =>
    present
      ? `<span class="att-ok">&#10003;</span> Yes`
      : `<span class="att-no">&#10007;</span> No`;

  const eduRows = eduInformation
    .map(
      (row) => `<tr>
        <td>${esc(row.exam)}</td><td>${esc(row.institute)}</td><td>${esc(row.board)}</td><td>${esc(row.group)}</td>
        <td>${esc(row.roll)}</td><td>${esc(row.registration)}</td><td>${esc(row.gpa)}</td><td>${esc(row.passingYear)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${filename}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:Arial,sans-serif;font-size:11.5px;color:#1e293b;background:#fff;}
  @page{size:A4 portrait;margin:12mm 14mm 16mm 14mm;}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}

  .top-tbl{width:100%;border-collapse:collapse;margin-bottom:6px;}
  .top-tbl td{vertical-align:top;}
  .left-cell{width:80px;}
  .stu-photo{width:56px;height:68px;object-fit:cover;border-radius:4px;border:1px solid #cbd5e1;}
  .sch-cell{text-align:center;}
  .sch-logo{width:56px;height:56px;object-fit:contain;display:block;margin:0 auto 4px;}
  .sch-name{font-size:16px;font-weight:700;color:#1e293b;}
  .sch-addr{font-size:10.5px;color:#64748b;margin-top:2px;}
  .qr-cell{width:100px;text-align:center;}
  .qr-img{width:74px;height:74px;display:block;margin:0 auto;}
  .qr-cap{font-size:8px;color:#0b7369;font-weight:600;margin-top:3px;line-height:1.25;}

  .app-id{text-align:center;margin:6px 0 10px;}
  .app-id b{background:#7c3aed;color:#fff;padding:5px 14px;border-radius:14px;font-size:11.5px;}

  .admission-title{text-align:center;font-size:13px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;}

  .sec-hdr{background:#1e3a8a;color:#fff;font-weight:700;font-size:10.5px;padding:5px 10px;text-transform:uppercase;letter-spacing:.5px;margin-top:8px;}

  .it{width:100%;border-collapse:collapse;}
  .it td{padding:5px 9px;border:1px solid #dde3ea;font-size:10.5px;vertical-align:top;}
  .lb{background:#eef2f7;font-weight:600;color:#334155;width:16%;}
  .vl{width:17.3%;}

  .subj-line{font-size:10.5px;padding:4px 9px;border:1px solid #dde3ea;border-top:none;}

  .edu-tbl{width:100%;border-collapse:collapse;}
  .edu-title{font-weight:700;font-size:10.5px;color:#1e3a8a;text-transform:uppercase;letter-spacing:.5px;margin-top:12px;margin-bottom:6px;}
  .edu-tbl th{background:#1e3a8a;color:#fff;padding:5px 6px;font-size:9.5px;border:1px solid #1e3a8a;}
  .edu-tbl td{padding:5px 6px;font-size:9.5px;border:1px solid #dde3ea;text-align:center;}

  .att-ok{color:#059669;font-weight:700;}
  .att-no{color:#dc2626;font-weight:700;}

  .declaration{margin-top:10px;font-size:10.5px;line-height:1.6;text-align:justify;}

  .signatures{width:100%;margin-top:30px;}
  .sig-row{display:flex;width:100%;padding-top:32px;justify-content:space-between;}
  .sig-row:first-child{padding-top:0;}
  .sig-col{flex:0 0 30%;max-width:30%;box-sizing:border-box;text-align:center;}
  .sig-line{display:block;padding-top:6px;border-top:1px dotted #64748b;font-size:10px;font-weight:700;color:#475569;}

  /* Static (non-fixed) footer — a fixed-position footer overlaps mid-page
     content on multi-page documents in the PDF renderer, so this sits in
     normal flow after everything else instead. */
  .doc-footer{margin-top:16px;padding-top:6px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:8.5px;color:#888;}
</style>
</head>
<body>
  <table class="top-tbl">
    <tr>
      <td class="left-cell">${studentData.student_pic_url ? `<img class="stu-photo" src="${studentData.student_pic_url}" />` : ""}</td>
      <td class="sch-cell">
        ${institute?.logo_url ? `<img class="sch-logo" src="${institute.logo_url}" />` : ""}
        <div class="sch-name">${esc(institute?.institute_name)}</div>
        ${institute?.institute_address ? `<div class="sch-addr">${esc(institute.institute_address)}</div>` : ""}
      </td>
      <td class="qr-cell">
        <img class="qr-img" src="${qrSrc}" />
        <div class="qr-cap">Scan to open this application</div>
      </td>
    </tr>
  </table>

  <div class="admission-title">Admission Information</div>
  ${secHdr("Application Status")}
  <table class="it"><tbody>
    ${row3(
      "Payment Status",
      esc(studentData.approval_status),
      "Payable Amount",
      `&#2547;${Number(preview.admission_fee ?? 0) + Number(preview.software_fee ?? 0)}` +
        `<div style="font-size:9px;color:#94a3b8;margin-top:2px;">Admission Fee: &#2547;${esc(preview.admission_fee)}, Software fee: &#2547;${esc(preview.software_fee)}</div>`,
      "Assigned Roll",
      esc(studentData.assigned_roll ?? "N/A"),
    )}
  </tbody></table>

  ${secHdr("Academic Information")}
  <table class="it"><tbody>
    ${row2(
      "Year/session",
      esc(studentData.academic_year?.coresubcategories?.core_subcategory_name),
      "Class",
      esc(studentData.class?.class_name),
    )}
    ${row2(
      "Group",
      esc(studentData.group?.groups?.core_subcategory_name),
      "Shift",
      esc(studentData.shift?.shifts?.core_subcategory_name),
    )}
  </tbody></table>
  ${
    preview.subject && preferredSubjects
      ? `${subjectLine("Compulsory", preferredSubjects.compulsory)}${subjectLine("Group Base", preferredSubjects.group_base)}${subjectLine("Optional", preferredSubjects.choosable)}${subjectLine("Uncountable", preferredSubjects.uncountable)}`
      : ""
  }

  ${secHdr("Student Information")}
  <table class="it"><tbody>
    ${row3("Application ID", esc(studentData.unique_number), "Application Date", esc(studentData.date), "Student's Contact", esc(studentData.student_mobile))}
    ${row3("Name (Bangla)", esc(studentData.student_name_bangla), "Name (English)", esc(studentData.student_name_english), "Nationality", esc(studentData.nationality))}
    ${row3("NID/Birth Cert. No.", esc(studentData.student_nid_or_birth_no), "Blood Group", esc(studentData.blood_group), "Date of Birth", esc(studentData.date_of_birth))}
    ${row3("Gender", esc(studentData.gender), "Marital Status", esc(studentData.marital_status), "Religion", esc(studentData.religion))}
    ${row3("Father's Name (English)", esc(studentData.father_name_english), "Father's Name (Bangla)", esc(studentData.father_name_bangla), "Father's National ID", esc(studentData.father_nid))}
    ${row3("Mother's Name (English)", esc(studentData.mother_name_english), "Mother's Name (Bangla)", esc(studentData.mother_name_bangla), "Mother's National ID", esc(studentData.mother_nid))}
    ${row2("Father's Contact", esc(studentData.father_mobile), "Mother's Contact", esc(studentData.mother_mobile))}
    ${row2("Father's Occupation", esc(studentData.father_occupation), "Father's Income", esc(studentData.father_income))}
    ${row2("Mother's Occupation", esc(studentData.mother_occupation), "Mother's Income", esc(studentData.mother_income))}
  </tbody></table>

  ${secHdr("Present Address")}
  <table class="it"><tbody>
    ${row1("Address", esc(studentData.present_address))}
    ${row3("Division", esc(presentDivision?.name), "District", esc(presentDistrict?.name), "Upazila", esc(presentUpozilla?.name))}
    ${row2("Post Office", esc(studentData.present_post_office), "Post Code", esc(studentData.present_post_code))}
  </tbody></table>

  ${secHdr("Permanent Address")}
  <table class="it"><tbody>
    ${row1("Address", esc(studentData.permanent_address))}
    ${row3("Division", esc(permanentDivision?.name), "District", esc(permanentDistrict?.name), "Upazila", esc(permanentUpozilla?.name))}
    ${row2("Post Office", esc(studentData.permanent_post_office), "Post Code", esc(studentData.permanent_post_code))}
  </tbody></table>

  ${
    eduInformation.length
      ? `<div class="edu-title">Educational Qualifications</div>
  <table class="edu-tbl">
    <thead><tr><th>Exam</th><th>Institute</th><th>Board</th><th>Group</th><th>Roll No.</th><th>Reg. No.</th><th>GPA</th><th>Passing Year</th></tr></thead>
    <tbody>${eduRows}</tbody>
  </table>`
      : ""
  }

  ${
    studentData.guardian_name || studentData.guardian_mobile
      ? `${secHdr("Guardian Information")}
  <table class="it"><tbody>
    ${row2(
      "Name & Relationship",
      esc(
        `${studentData.guardian_name ?? ""}${studentData.guardian_relation ? ` (${studentData.guardian_relation})` : ""}`,
      ),
      "Mobile",
      esc(studentData.guardian_mobile),
    )}
    ${row2("Occupation", esc(studentData.guardian_occupation), "Yearly Income", esc(studentData.guardian_yearly_income))}
    ${row1("Land Property of Parents", esc(studentData.guardian_property))}
  </tbody></table>`
      : ""
  }

  ${
    studentData.vaccine
      ? `${secHdr("Covid-19 Vaccine Information")}
  <table class="it"><tbody>${row2("Vaccinated?", esc(studentData.vaccine), "Vaccine Name", esc(studentData.vaccine_name))}</tbody></table>`
      : ""
  }

  ${
    studentData.quota
      ? `${secHdr("Quota Information")}
  <table class="it"><tbody>${row2("Quota?", "Yes", "Quota Name", esc(studentData.quota))}</tbody></table>`
      : ""
  }

  ${secHdr("Attachments")}
  <table class="it"><tbody>
    ${row2("Student Photo", attachmentCell(studentData.student_pic), "Vaccine Certificate", attachmentCell(studentData.vaccine_certificate))}
    ${row2("Birth Certificate/NID", attachmentCell(studentData.student_birth_nid_file), "Optional", attachmentCell(studentData.other_file))}
  </tbody></table>

  ${(() => {
    const inst = `${esc(institute?.institute_name)}${institute?.institute_address ? `, ${esc(institute.institute_address)}` : ""}`;
    return `<div class="declaration">
    <b>Declaration:</b> I, <b>${esc(studentData.student_name_english)}</b>, hereby declare that the above-mentioned information and photo are correct. If any
    information provided by me is found to be false, <b>${inst}</b> reserves the right to cancel my admission. I shall be obliged to obey the rules and
    regulations of the relevant Education Board/University as well as <b>${inst}</b> and to pay all the required fees.
  </div>`;
  })()}

  <div class="signatures">
    <div class="sig-row">
      <div class="sig-col"><span class="sig-line">Student Signature</span></div>
      <div class="sig-col"><span class="sig-line">Signature of Convener / Department Head</span></div>
      <div class="sig-col"><span class="sig-line">Signature of Principal</span></div>
    </div>
  </div>

  <div class="doc-footer">
    <span>Powered By: ${PDF_FOOTER_BRAND}</span>
    <span>Date &amp; Time: ${new Date().toLocaleString()}</span>
  </div>
</body>
</html>`;
}
