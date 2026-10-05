import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useForm } from "react-hook-form";
import { showMessage } from "@/components/shared/CustomToast/message";
import { getErrorMessage } from "@/components/utils/errorHandler";
import { useGetInstituteInfoQuery } from "@/redux/allApi/authApi/authApi";
import {
  useGetStudentExamListQuery,
  useGetStudentSpecificResultMutation,
} from "@/redux/allApi/semesterExam/semesterExamApi";
import { useAppSelector } from "@/redux/hook";
import { Feather, Ionicons } from "@expo/vector-icons";
import { POWERED_BY_SOFTWARE_TEXT } from "@/utils/vendor";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import QRCode from "qrcode";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const RESULT_PDF_FILENAME_PREFIX = "Academic_Transcript";

type JsonRecord = Record<string, unknown>;
type PartMarks = Record<string, number>;
type SubjectPart = {
  subject_id?: number;
  subject_name?: string;
  part_marks?: PartMarks;
  total_marks?: number;
  final_mark?: number;
  grade?: string;
  grade_point?: string;
  attendance_status?: string;
};
type SubjectResult = {
  subject_id?: number;
  subject_name?: string;
  combined_id?: number;
  combined_name?: string;
  is_combined?: boolean;
  parts?: SubjectPart[];
  part_marks?: PartMarks;
  total_marks?: number;
  total_max_mark?: number;
  final_mark?: number;
  percentage?: number;
  grade?: string;
  grade_point?: string;
  combined_grade?: string;
  combined_grade_point?: string;
  combined_status?: string;
  attendance_status?: string;
  is_uncountable?: boolean;
  is_optional?: boolean;
};
type FailedSubject = {
  subject_name?: string;
  marks?: number;
  grade?: string;
};
type StudentResult = {
  student_id?: number;
  student_name?: string;
  roll?: number | string;
  subjects?: SubjectResult[];
  total_mark_without_optional?: number;
  gpa_without_optional?: number | string;
  letter_grade_without_optional?: string;
  total_mark_with_optional?: number;
  gpa_with_optional?: number | string;
  letter_grade_with_optional?: string;
  result_status?: string;
  optional_bonus_gp?: number | string;
  optional_bonus_mark?: number;
  failed_subject_count?: number;
  failed_subjects?: FailedSubject[];
  student_info?: {
    student_details?: {
      photo_url?: string;
    };
    guardian_details?: {
      father_name_english?: string;
      mother_name_english?: string;
      guardian_mobile?: string;
    };
    academic_details?: {
      academic_year_name?: string;
      department_name?: string;
      custom_student_id?: string;
      group_name?: string;
      roll?: number | string;
      class_shift_section?: string;
    };
  };
  merit_info?: {
    class_position?: number;
    shift_position?: number;
    section_position?: number;
  };
};
type HighestMark = {
  subject_id?: number;
  subject_name?: string;
  highest_mark?: number;
};
type FullMark = {
  subject_id?: number;
  subject_name?: string;
  full_mark?: number;
};
type ExamGrade = {
  from_mark?: string;
  to_mark?: string;
  grade_point?: string;
  grade?: string;
  result_status?: string;
  result?: string;
  department_name?: string;
  class_name?: string;
  academic_year?: string;
  comment?: string;
};
type InstituteDetails = {
  institute_name?: string;
  institute_address?: string;
  institute_contact?: string;
  institute_email?: string;
  logo_url?: string;
};
type ResultPayload = {
  institute_details?: InstituteDetails;
  result?: StudentResult[];
  highest_marks?: HighestMark[];
  subject_config?: JsonRecord[];
  exam_grade?: ExamGrade[];
  full_marks?: FullMark[];
  total_full_marks?: number;
  is_conversion?: boolean;
  is_grace_configured?: boolean;
  exam_config?: any;
};
type TranscriptRow = {
  name: string;
  fullMarks: number | string;
  highestMarks: number | string;
  marks: Record<string, number | string>;
  finalMarks: number | string;
  totalMarks: number | string;
  convertedMarks?: number | string;
  graceMarks?: number | string;
  gradePoint: string;
  letterGrade: string;
  attendance: string;
  isUncountable: boolean;
  isOptional: boolean;
  rowSpan?: number;
  isPart?: boolean;
};
type RemarkItem = {
  left: string;
  right: string;
};
type TranscriptData = {
  instituteName: string;
  instituteAddress: string;
  instituteContact: string;
  instituteEmail: string;
  logoUrl: string;
  examName: string;
  yearLabel: string;
  studentName: string;
  fatherName: string;
  motherName: string;
  studentId: string;
  roll: string;
  department: string;
  classShiftSection: string;
  group: string;
  merit: string;
  resultStatus: string;
  totalMarks: string;
  totalMarksWithOptional: string;
  totalMarksWithoutOptional: string;
  gpa: string;
  gpaWithOptional: string;
  gpaWithoutOptional: string;
  letterGrade: string;
  letterGradeWithOptional: string;
  letterGradeWithoutOptional: string;
  failedSubjects: string;
  failedSubjectCount: string;
  totalWorkingDays: string;
  totalPresent: string;
  totalAbsent: string;
  comments: string;
  gradeScale: ExamGrade[];
  rows: TranscriptRow[];
  optionalRows: TranscriptRow[];
  uncountableRows: TranscriptRow[];
  remarks: RemarkItem[];
  coCurricularActivities: string[];
  totalUncountableFullMarks: string;
  totalUncountableFinalMarks: string;
  totalFullMarks: string;
  totalFullMarksWithOptional: string;
  totalFullMarksWithoutOptional: string;
  markKeys: string[];
  studentPhotoUrl: string;
  meritPositions: { name: string; value: string }[];
  isConversion: boolean;
  isGraceConfigured: boolean;
  gradeComment: string;
};

const isRecord = (value: unknown): value is JsonRecord =>
  !!value && typeof value === "object" && !Array.isArray(value);

const getPayload = (response: unknown): ResultPayload | null => {
  if (!isRecord(response)) {
    return null;
  }

  const payload = response.payload;
  if (isRecord(payload) && isRecord(payload.data)) {
    return payload.data as ResultPayload;
  }

  if (isRecord(response.data)) {
    return response.data as ResultPayload;
  }

  return response as ResultPayload;
};

const toLabelValue = (value: unknown) =>
  value === null || value === undefined || value === "" ? "-" : String(value);

const capitalize = (value: unknown) => {
  const str = String(value ?? "");
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatDecimal = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? numericValue.toFixed(2)
    : String(value);
};

// getMarkByKey was removed as the transcript now uses dynamic markKeys mapping.

// Removed sumPartMarks as it is no longer used for dynamic marks.

const getTranscriptData = (
  payload: ResultPayload | null,
  selectedYear: string,
  selectedExam: string,
  examInfo?: {
    class?: string;
    shift?: string;
    section?: string;
    group?: string;
  },
): TranscriptData | null => {
  if (!payload?.result?.length) {
    return null;
  }

  const studentResult = payload.result[0];
  const highestMarkMap = new Map(
    (payload.highest_marks || []).map((item) => [
      item.subject_name || "",
      item.highest_mark || 0,
    ]),
  );
  const fullMarkMap = new Map(
    (payload.full_marks || []).map((item) => [
      item.subject_name || "",
      item.full_mark || 0,
    ]),
  );
  const markKeysSet = new Set<string>();
  (studentResult.subjects || []).forEach((subject) => {
    if (subject.is_combined && subject.parts) {
      subject.parts.forEach((part) => {
        Object.keys(part.part_marks || {}).forEach((key) =>
          markKeysSet.add(key),
        );
      });
    } else {
      Object.keys(subject.part_marks || {}).forEach((key) =>
        markKeysSet.add(key),
      );
    }
  });

  const markKeys = Array.from(markKeysSet).sort((a, b) => {
    const order = ["cq", "mcq", "pr", "practical", "written", "viva"];
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const aIdx = order.findIndex((o) => aLower.includes(o));
    const bIdx = order.findIndex((o) => bLower.includes(o));
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.localeCompare(b);
  });

  const configItem = (payload.subject_config || [])[0] || {};
  const allRows: TranscriptRow[] = [];
  (studentResult.subjects || []).forEach((subject: SubjectResult) => {
    const isUncountable = !!subject.is_uncountable;
    const isOptional = !!subject.is_optional;

    // If combined and user wants individual parts, flatten them
    if (subject.is_combined && (subject.parts || []).length > 0) {
      const parts = subject.parts || [];
      parts.forEach((part, index) => {
        const rowName = `${part.subject_name || "Subject"} (${subject.combined_name})`;
        const fullMarks = fullMarkMap.get(part.subject_name || "") || 0;
        const highestMarks = highestMarkMap.get(part.subject_name || "") ?? "";

        const marksRecord: Record<string, number | string> = {};
        markKeys.forEach((key) => {
          marksRecord[key] = (part.part_marks || {})[key] ?? "";
        });

        // Use 'any' type to silence TS errors if part doesn't have these properties
        const p: any = part;

        allRows.push({
          name: rowName,
          fullMarks,
          highestMarks,
          marks: marksRecord,
          totalMarks: p.total_marks ?? "",
          finalMarks: p.final_mark ?? p.total_marks ?? "",
          convertedMarks: p.converted_mark ?? "",
          graceMarks: p.grace_mark ?? "",
          gradePoint: subject.combined_grade_point || "",
          letterGrade: subject.combined_grade || "",
          attendance: part.attendance_status || "present",
          isUncountable,
          isOptional,
          rowSpan: index === 0 ? parts.length : 0,
          isPart: true,
        });
      });
    } else {
      const rowName = subject.subject_name || "Subject";
      const fullMarks = fullMarkMap.get(rowName) || subject.total_max_mark || 0;
      const highestMarks = highestMarkMap.get(rowName) ?? "";

      const marksRecord: Record<string, number | string> = {};
      markKeys.forEach((key) => {
        marksRecord[key] = (subject.part_marks || {})[key] ?? "";
      });

      allRows.push({
        name: rowName,
        fullMarks,
        highestMarks,
        marks: marksRecord,
        finalMarks: subject.is_uncountable
          ? Object.values(subject.part_marks || {}).reduce(
              (a, b) => (Number(a) || 0) + (Number(b) || 0),
              0,
            ) || ""
          : (subject.final_mark ?? subject.total_marks ?? ""),
        totalMarks: (subject as any).total_marks ?? "",
        convertedMarks: (subject as any).converted_mark ?? "",
        graceMarks: (subject as any).grace_mark ?? "",
        gradePoint: subject.grade_point || "",
        letterGrade: subject.grade || "",
        attendance: subject.attendance_status || "present",
        isUncountable,
        isOptional,
        rowSpan: 1,
      });
    }
  });

  const rows = allRows.filter((row) => !row.isUncountable && !row.isOptional);
  const optionalRows = allRows.filter((row) => row.isOptional);
  const uncountableRows = allRows.filter(
    (row) => row.isUncountable && !row.isOptional,
  );

  const failedSubjects = (studentResult.failed_subjects || [])
    .map((item) => item.subject_name)
    .filter(Boolean)
    .join(", ");

  const examCfg = payload.exam_config;
  const isFailed =
    (studentResult.failed_subject_count || 0) > 0 ||
    (studentResult.result_status || "").toLowerCase().includes("fail");
  const positionTypes: string[] = [];
  if (examCfg?.first_merit_position)
    positionTypes.push(examCfg.first_merit_position.trim());
  if (
    examCfg?.second_merit_position &&
    examCfg.second_merit_position !== examCfg.first_merit_position
  ) {
    positionTypes.push(examCfg.second_merit_position.trim());
  }
  const fieldCandidates: Record<string, string[]> = {
    "Class Wise": ["class_position", "merit_position"],
    "Section Wise": ["section_position", "section_merit_position"],
    "Group Wise": ["group_position", "group_merit_position"],
    "Shift Wise": ["shift_position", "shift_merit_position"],
    "Gender Wise": ["gender_position", "gender_merit_position"],
    "Religion Wise": ["religion_position", "religion_merit_position"],
    "Shift & Group Wise": [
      "shift_group_merit_position",
      "shift_group_position",
    ],
  };

  const meritPositions =
    positionTypes.length === 0
      ? []
      : positionTypes.map((t) => {
          let value: string | null = null;
          if (!isFailed && studentResult.merit_info) {
            const candidates = fieldCandidates[t] || [];
            for (const f of candidates) {
              const v =
                studentResult.merit_info[
                  f as keyof typeof studentResult.merit_info
                ];
              if (
                v !== undefined &&
                v !== null &&
                String(v).trim() !== "" &&
                String(v).toLowerCase() !== "n/a"
              ) {
                value = String(v);
                break;
              }
            }
          }
          return { name: t, value: value ?? "-" };
        });

  const remarks = (payload.exam_grade || []).map((item) => ({
    left: item.grade || "-",
    right: item.result_status || item.result || "-",
  }));

  const coCurricularActivities = [
    "Sports",
    "Cultural Function",
    "Scout/BNCC",
    "Math Olympiad",
  ];

  const totalPresentCount = rows.filter(
    (row) => row.attendance.toLowerCase() === "present",
  ).length;
  const totalAbsentCount = rows.filter(
    (row) => row.attendance.toLowerCase() !== "present",
  ).length;

  const gradeItem = (payload.exam_grade || [])[0] || {};
  const configs = payload.subject_config || [];

  const gradeComment =
    (payload.exam_grade || []).find(
      (g) =>
        g.grade === studentResult.letter_grade_with_optional ||
        g.grade === studentResult.letter_grade_without_optional,
    )?.comment ||
    studentResult.result_status ||
    "Not Good";

  return {
    instituteName: payload.institute_details?.institute_name || "Institute",
    instituteAddress: payload.institute_details?.institute_address || "-",
    instituteContact: payload.institute_details?.institute_contact || "-",
    instituteEmail: payload.institute_details?.institute_email || "-",
    logoUrl: payload.institute_details?.logo_url || "",
    examName: selectedExam,
    yearLabel: selectedYear,
    studentName: studentResult.student_name || "-",
    studentPhotoUrl:
      studentResult.student_info?.student_details?.photo_url || "",
    fatherName:
      studentResult.student_info?.guardian_details?.father_name_english || "-",
    motherName:
      studentResult.student_info?.guardian_details?.mother_name_english || "-",
    studentId: toLabelValue(
      studentResult.student_info?.academic_details?.custom_student_id ||
        studentResult.student_id,
    ),
    roll: toLabelValue(
      studentResult.student_info?.academic_details?.roll || studentResult.roll,
    ),
    department: toLabelValue(
      studentResult.student_info?.academic_details?.department_name ||
        examInfo?.group || // using group as dept if available from exam list
        configs.find((c) => c.department_name)?.department_name ||
        gradeItem.department_name ||
        configItem.department_name ||
        configItem.subject_type,
    ),
    classShiftSection:
      studentResult.student_info?.academic_details?.class_shift_section ||
      [
        capitalize(
          examInfo?.class ||
            configs.find((c) => c.class_name)?.class_name ||
            gradeItem.class_name ||
            configItem.class_name ||
            configItem.class,
        ),
        capitalize(
          examInfo?.shift ||
            configs.find((c) => c.shift_name)?.shift_name ||
            configItem.shift_name ||
            configItem.shift,
        ),
        capitalize(
          examInfo?.section ||
            configs.find((c) => c.section_name)?.section_name ||
            configItem.section_name ||
            configItem.section,
        ),
      ]
        .filter(Boolean)
        .join("-") ||
      "-",
    group:
      capitalize(
        studentResult.student_info?.academic_details?.group_name ||
          examInfo?.group ||
          configs.find((c) => c.group_name)?.group_name ||
          configItem.group_name ||
          configItem.group,
      ) || "-",
    merit:
      studentResult.merit_info?.class_position !== undefined
        ? `Class ${studentResult.merit_info.class_position} / Shift ${toLabelValue(
            studentResult.merit_info.shift_position,
          )} / Section ${toLabelValue(
            studentResult.merit_info.section_position,
          )}`
        : "-",
    resultStatus: studentResult.result_status || "-",
    totalMarks: toLabelValue(studentResult.total_mark_without_optional),
    totalMarksWithOptional: toLabelValue(
      studentResult.total_mark_with_optional,
    ),
    totalMarksWithoutOptional: toLabelValue(
      studentResult.total_mark_without_optional,
    ),
    totalFullMarks: toLabelValue(
      rows.reduce((acc, row) => acc + (Number(row.fullMarks) || 0), 0),
    ),
    totalFullMarksWithOptional: toLabelValue(
      allRows.reduce((acc, row) => acc + (Number(row.fullMarks) || 0), 0),
    ),
    totalFullMarksWithoutOptional: toLabelValue(
      rows.reduce((acc, row) => acc + (Number(row.fullMarks) || 0), 0),
    ),
    gpa: formatDecimal(studentResult.gpa_with_optional),
    gpaWithOptional: formatDecimal(studentResult.gpa_with_optional),
    gpaWithoutOptional: formatDecimal(studentResult.gpa_without_optional),
    letterGrade: studentResult.letter_grade_with_optional || "-",
    letterGradeWithOptional: studentResult.letter_grade_with_optional || "-",
    letterGradeWithoutOptional:
      studentResult.letter_grade_without_optional || "-",
    failedSubjects: failedSubjects || "None",
    failedSubjectCount: toLabelValue(studentResult.failed_subject_count || 0),
    totalWorkingDays: toLabelValue(
      rows.length + optionalRows.length + uncountableRows.length,
    ),
    totalPresent: toLabelValue(totalPresentCount),
    totalAbsent: toLabelValue(totalAbsentCount),
    comments: studentResult.result_status || "Not Good",
    gradeScale: payload.exam_grade || [],
    rows,
    optionalRows,
    uncountableRows,
    remarks,
    coCurricularActivities,
    meritPositions,
    isConversion: !!payload.is_conversion,
    isGraceConfigured: !!payload.is_grace_configured,
    gradeComment,
    totalUncountableFullMarks: toLabelValue(
      uncountableRows.reduce(
        (acc, row) => acc + (Number(row.fullMarks) || 0),
        0,
      ),
    ),
    totalUncountableFinalMarks: toLabelValue(
      uncountableRows.reduce(
        (acc, row) => acc + (Number(row.finalMarks) || 0),
        0,
      ),
    ),
    markKeys,
  };
};

const getTranscriptHtml = async (transcript: TranscriptData) => {
  const renderRow = (row: TranscriptRow) => {
    let gpCell = "";
    let gradeCell = "";

    if (row.rowSpan === undefined || row.rowSpan === 1) {
      gpCell = `<td>${escapeHtml(row.gradePoint)}</td>`;
      gradeCell = `<td>${escapeHtml(row.letterGrade)}</td>`;
    } else if (row.rowSpan > 0) {
      gpCell = `<td rowspan="${row.rowSpan}">${escapeHtml(row.gradePoint)}</td>`;
      gradeCell = `<td rowspan="${row.rowSpan}">${escapeHtml(row.letterGrade)}</td>`;
    } else {
      // Rowspan skip
      gpCell = "";
      gradeCell = "";
    }

    const markCells = transcript.markKeys
      .map((key) => `<td>${escapeHtml(row.marks[key] ?? "")}</td>`)
      .join("");

    return `
      <tr>
        <td class="subject text-left">${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.fullMarks)}</td>
        <td>${escapeHtml(row.highestMarks)}</td>
        ${markCells}
        <td>${escapeHtml(row.totalMarks)}</td>
        ${transcript.isConversion ? `<td>${escapeHtml(row.convertedMarks)}</td>` : ""}
        ${transcript.isGraceConfigured ? `<td>${escapeHtml(row.graceMarks)}</td>` : ""}
        ${transcript.isGraceConfigured ? `<td>${escapeHtml(row.finalMarks)}</td>` : ""}
        ${gpCell}
        ${gradeCell}
      </tr>
    `;
  };

  const rowsHtml = transcript.rows.map(renderRow).join("");
  const optionalHtml = transcript.optionalRows.map(renderRow).join("");
  const uncountableHtml = transcript.uncountableRows.map(renderRow).join("");

  // Same column set/order as renderRow's <td>s, so every result-table
  // (main / 4th subject / uncountable) shares identical column widths.
  const otherColCount =
    5 +
    transcript.markKeys.length +
    (transcript.isConversion ? 1 : 0) +
    (transcript.isGraceConfigured ? 2 : 0);
  const totalColCount = otherColCount + 1;
  const subjectWidth = 22;
  const otherWidth = (100 - subjectWidth) / otherColCount;
  const colgroupHtml = `
    <colgroup>
      <col style="width:${subjectWidth}%" />
      ${Array.from({ length: otherColCount }, () => `<col style="width:${otherWidth}%" />`).join("")}
    </colgroup>
  `;
  const sectionLabelRow = (label: string) =>
    `<tr><td colspan="${totalColCount}" class="section-label-cell">${escapeHtml(label)}</td></tr>`;
  const tableGapRow = () =>
    `<tr class="table-gap-row"><td colspan="${totalColCount}"></td></tr>`;

  const gradeScaleHtml = transcript.gradeScale
    .map(
      (grade) => `
        <tr>
          <td>${escapeHtml(grade.from_mark)}-${escapeHtml(grade.to_mark)}</td>
          <td>${escapeHtml(grade.grade)}</td>
          <td>${escapeHtml(grade.grade_point)}</td>
        </tr>
      `,
    )
    .join("");

  const remarkRows = Array.from(
    { length: Math.max(4, Math.ceil(transcript.remarks.length / 2)) },
    (_, index) => {
      const left = transcript.remarks[index * 2];
      const right = transcript.remarks[index * 2 + 1];
      return `
        <tr>
          <td>${escapeHtml(left?.left || "")}</td>
          <td>${escapeHtml(left?.right || "")}</td>
          <td>${escapeHtml(right?.left || "")}</td>
          <td>${escapeHtml(right?.right || "")}</td>
        </tr>
      `;
    },
  ).join("");

  const coCurricularRows = transcript.coCurricularActivities
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item)}</td>
          <td></td>
        </tr>
      `,
    )
    .join("");

  const logoHtml = transcript.logoUrl
    ? `<img src="${escapeHtml(transcript.logoUrl)}" alt="Institute Logo" class="logo" />`
    : `<div class="logo logo-fallback">${escapeHtml(transcript.instituteName.charAt(0))}</div>`;

  const qrData = `Name: ${transcript.studentName}
Roll: ${transcript.roll}
Student ID: ${transcript.studentId}
Exam: ${transcript.examName}
Year: ${transcript.yearLabel}
Result: ${transcript.resultStatus}
GPA: ${transcript.gpaWithOptional}`;

  let qrCodeImgHtml = "";
  try {
    if (Platform.OS === "web") {
      const qrCodeUrl = await QRCode.toDataURL(qrData, {
        margin: 1,
        width: 200,
        color: { dark: "#111827", light: "#ffffff" },
      });
      qrCodeImgHtml = `<img src="${qrCodeUrl}" alt="QR Code" style="width:72px; height:72px;" />`;
    } else {
      const svgString = await QRCode.toString(qrData, {
        type: "svg",
        margin: 1,
        color: { dark: "#111827", light: "#ffffff" },
      });
      const svgDataUrl =
        "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
      qrCodeImgHtml = `<img src="${svgDataUrl}" alt="QR Code" style="width:72px; height:72px;" />`;
    }
  } catch (err) {
    const fallbackUrl = `https://quickchart.io/qr?size=200&text=${encodeURIComponent(qrData)}&margin=1`;
    qrCodeImgHtml = `<img src="${fallbackUrl}" alt="QR Code" style="width:72px; height:72px;" />`;
  }

  const studentPhotoHtml = transcript.studentPhotoUrl
    ? `<img src="${escapeHtml(transcript.studentPhotoUrl)}" alt="Student Photo" style="width: 104px; height: 110px; object-fit: cover; border-radius: 4px;" />`
    : "";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          @page { size: A4 portrait; margin: 8mm; }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            margin: 0;
            color: #111827;
            font-family: Arial, sans-serif;
            background: #ffffff;
          }
          .sheet {
            border: 4px solid #7f1d1d;
            padding: 6px;
            min-height: 275mm;
            display: flex;
            flex-direction: column;
          }
          .inner {
            border: 2px solid #b45309;
            padding: 8px 10px 12px;
            flex: 1;
            display: flex;
            flex-direction: column;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 10px;
          }
          .title {
            flex: 1;
            text-align: center;
          }
          .title h1 {
            font-size: 18px;
            margin: 0;
            font-weight: 700;
          }
          .title p {
            margin: 0;
            font-size: 9px;
            line-height: 1.25;
          }
          .grade-box {
            width: 124px;
            border-collapse: collapse;
            font-size: 8px;
          }
          .grade-box td, .grade-box th {
            border: 1px solid #111827;
            padding: 2px 3px;
            text-align: center;
          }
          .logo {
            width: 52px;
            height: 52px;
            margin: 6px auto 4px;
            object-fit: contain;
            display: block;
          }
          .logo-fallback {
            border: 1px solid #334155;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            color: #1e3a8a;
          }
          .banner {
            margin: 4px auto 10px;
            width: 260px;
            border-radius: 6px;
            background: #8B4513;
            color: white;
            text-align: center;
            padding: 6px 12px;
            font-weight: 700;
            font-size: 11px;
          }
          .meta {
            width: 92%;
            margin: 15px auto 12px;
            border-collapse: collapse;
          }
          .meta td {
            font-size: 10px;
            padding: 2px 4px;
            vertical-align: top;
          }
          .meta .label {
            width: 100px;
          }
          .meta .value {
            font-weight: 700;
          }
          .result-table {
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
            margin-top: 2px;
          }
          .result-table th, .result-table td {
            border: 1px solid #111827;
            padding: 3px 4px;
            font-size: 8px;
            text-align: center;
            vertical-align: middle;
          }
          .result-table th {
            background: #efefef;
            font-weight: 700;
          }
          .subject {
            width: 25%;
          }
          .text-left {
            text-align: left !important;
          }
          .yellow-row td {
            background: #fff9c4;
            font-weight: 700;
          }
          .section-label {
            margin: 8px 0 4px;
            font-size: 10px;
            font-weight: 700;
          }
          .section-label-cell {
            text-align: left !important;
            font-weight: 700;
            background: #f1f5f9;
            padding: 3px 4px;
          }
          .bottom-grid {
            margin-top: 6px;
            display: grid;
            grid-template-columns: 1.1fr 1.3fr 1.1fr 0.95fr;
            gap: 0;
          }
          .block {
            border: 1px solid #111827;
            border-right: 0;
          }
          .block:last-child {
            border-right: 1px solid #111827;
          }
          .block table {
            width: 100%;
            border-collapse: collapse;
            height: 100%;
          }
          .block td, .block th {
            border: 1px solid #111827;
            padding: 3px 4px;
            font-size: 8px;
            vertical-align: top;
          }
          .block th {
            background: #efefef;
            text-align: left;
          }
          .qr-box {
            min-height: 110px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #111827;
            font-size: 8px;
            gap: 4px;
          }
          .qr-square {
            width: 72px;
            height: 72px;
            border: 1px solid #111827;
            display: flex;
            align-items: center;
            justify-content: center;
            background:
              linear-gradient(90deg, #111 10%, transparent 10%) 0 0/12px 12px,
              linear-gradient(#111 10%, transparent 10%) 0 0/12px 12px,
              linear-gradient(90deg, transparent 90%, #111 90%) 0 0/12px 12px,
              linear-gradient(transparent 90%, #111 90%) 0 0/12px 12px;
          }
          .footer {
            margin-top: auto;
            padding-top: 10px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
          .sign {
            text-align: center;
            font-size: 9px;
          }
          .line {
            border-top: 2px dashed #6b7280;
            margin: 0 auto 4px;
            width: 140px;
            height: 18px;
          }
          .powered {
            margin-top: 8px;
            font-size: 7px;
            color: #374151;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="inner">
            <div class="header">
              <div style="width: 124px; display: flex; flex-direction: column; align-items: flex-start;">
                ${studentPhotoHtml}
              </div>
              <div class="title" style="display: flex; flex-direction: column; align-items: center; text-align: center;">
                <h1 style="font-size: 20px;">${escapeHtml(transcript.instituteName)}</h1>
                <p>${escapeHtml(transcript.instituteAddress)}</p>
                <p>Contact: ${escapeHtml(transcript.instituteContact)} | Email: ${escapeHtml(transcript.instituteEmail)}</p>
                <div style="margin-top: 6px;">
                  ${logoHtml}
                </div>
                <div class="banner">ACADEMIC TRANSCRIPT</div>
              </div>
              <table class="grade-box">
                <thead>
                  <tr>
                    <th>Range(%)</th>
                    <th>Grade</th>
                    <th>GP</th>
                  </tr>
                </thead>
                <tbody>${gradeScaleHtml}</tbody>
              </table>
            </div>




            <table class="meta">
              <tr>
                <td class="label">Name</td>
                <td class="value">: ${escapeHtml(transcript.studentName)}</td>
                <td class="label">Exam</td>
                <td class="value">: ${escapeHtml(transcript.examName)}</td>
              </tr>
              <tr>
                <td class="label">Father</td>
                <td class="value">: ${escapeHtml(transcript.fatherName)}</td>
                <td class="label">Year</td>
                <td class="value">: ${escapeHtml(transcript.yearLabel)}</td>
              </tr>
              <tr>
                <td class="label">Mother</td>
                <td class="value">: ${escapeHtml(transcript.motherName)}</td>
                <td class="label">Department</td>
                <td class="value">: ${escapeHtml(transcript.department)}</td>
              </tr>
              <tr>
                <td class="label">Student ID</td>
                <td class="value">: ${escapeHtml(transcript.studentId)}</td>
                <td class="label">Group</td>
                <td class="value">: ${escapeHtml(transcript.group)}</td>
              </tr>
              <tr>
                <td class="label">Roll</td>
                <td class="value">: ${escapeHtml(transcript.roll)}</td>
                <td class="label">Class-Shift-Section</td>
                <td class="value">: ${escapeHtml(transcript.classShiftSection)}</td>
              </tr>
            </table>


            <table class="result-table">
              ${colgroupHtml}
              <thead>
                <tr>
                  <th rowspan="2">Name of Subject</th>
                  <th rowspan="2">Full Marks</th>
                  <th rowspan="2">Highest Marks</th>
                  <th colspan="${transcript.markKeys.length || 1}">Obtained Marks</th>
                  <th rowspan="2">Total Marks</th>
                  ${transcript.isConversion ? `<th rowspan="2">Converted Marks</th>` : ""}
                  ${transcript.isGraceConfigured ? `<th rowspan="2">Grace Marks</th>` : ""}
                  ${transcript.isGraceConfigured ? `<th rowspan="2">Final Marks</th>` : ""}
                  <th rowspan="2">Grade Point</th>
                  <th rowspan="2">Letter Grade</th>
                </tr>
                <tr>
                  ${
                    transcript.markKeys.length
                      ? transcript.markKeys
                          .map((k) => `<th>${escapeHtml(k)}</th>`)
                          .join("")
                      : "<th>Marks</th>"
                  }
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                <tr class="yellow-row">
                  <td style="text-align:right;">Total Marks</td>
                  <td>${escapeHtml(transcript.totalFullMarksWithoutOptional)}</td>
                  <td></td>
                  ${transcript.markKeys.map(() => "<td></td>").join("")}
                  <td style="font-weight:700;">${escapeHtml(transcript.totalMarksWithoutOptional)}</td>
                  ${transcript.isConversion ? `<td></td>` : ""}
                  ${transcript.isGraceConfigured ? `<td></td><td></td>` : ""}
                  <td style="font-weight:700;">${escapeHtml(transcript.gpaWithoutOptional)}</td>
                  <td style="font-weight:700;">${escapeHtml(transcript.letterGradeWithoutOptional)}</td>
                </tr>
                ${
                  transcript.optionalRows.length
                    ? `
                ${tableGapRow()}
                ${sectionLabelRow("4th Subjects")}
                ${optionalHtml}
                <tr class="yellow-row">
                  <td style="text-align:right;">Total Marks(with 4th Subject)</td>
                  <td>${escapeHtml(transcript.totalFullMarksWithOptional)}</td>
                  <td></td>
                  ${transcript.markKeys.map(() => "<td></td>").join("")}
                  <td style="font-weight:700;">${escapeHtml(transcript.totalMarksWithOptional)}</td>
                  ${transcript.isConversion ? `<td></td>` : ""}
                  ${transcript.isGraceConfigured ? `<td></td><td></td>` : ""}
                  <td style="font-weight:700;">${escapeHtml(transcript.gpaWithOptional)}</td>
                  <td style="font-weight:700;">${escapeHtml(transcript.letterGradeWithOptional)}</td>
                </tr>
                `
                    : ""
                }
                ${
                  transcript.uncountableRows.length
                    ? `
                ${tableGapRow()}
                ${sectionLabelRow("Uncountable Subjects")}
                ${uncountableHtml}
                `
                    : ""
                }
              </tbody>
            </table>


            <div class="bottom-grid">
              <div class="block">
                <table>
                  <tr><th colspan="2">Summary</th></tr>
                  <tr><td>Result Status</td><td>${escapeHtml(transcript.resultStatus)}</td></tr>
                  ${transcript.meritPositions.map((pos) => `<tr><td>${escapeHtml(pos.name)}</td><td>${escapeHtml(pos.value)}</td></tr>`).join("")}
                  <tr><td>Failed Subject(s)</td><td>${escapeHtml(transcript.failedSubjectCount)}</td></tr>
                  <tr><td>Total Working Days</td><td></td></tr>
                  <tr><td>Total Present</td><td></td></tr>
                  <tr><td>Total Absent</td><td></td></tr>
                </table>
              </div>
              <div class="block">
                <table>
                  <tr><th colspan="4">Remarks</th></tr>
                  ${remarkRows}
                  <tr><td colspan="4"><strong>Comments:</strong> ${escapeHtml(transcript.gradeComment)}</td></tr>
                </table>
              </div>
              <div class="block">
                <table>
                  <tr><th colspan="2">Co-Curricular Activities</th></tr>
                  ${coCurricularRows}
                </table>
              </div>
              <div class="block">
                <table>
                  <tr><th>DIGITAL VERIFICATION</th></tr>
                  <tr>
                    <td>
                      <div class="qr-box">
                        ${qrCodeImgHtml}
                        <div>Scan for Digital Result</div>
                        <div>Use phone camera to scan</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
            </div>


            <div class="footer">
              <div class="sign">
                <div class="line"></div>
                Guardian
              </div>
              <div class="sign">
                <div class="line"></div>
                Class Teacher
              </div>
              <div class="sign">
                <div class="line"></div>
                Principal / Headmaster
              </div>
            </div>


            <div class="powered">
              <div>${escapeHtml(POWERED_BY_SOFTWARE_TEXT)}</div>
              <div>Published: ${escapeHtml(new Date().toLocaleString("en-US"))}</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

export default function SemesterExamScreen() {
  const { width } = useWindowDimensions();
  const themeMode = useAppSelector((state) => state.theme.mode);
  const authUser = useAppSelector((state) => state.auth.user);
  const isDark = themeMode === "dark";
  const isDesktop = width >= 960;

  type FilterForm = {
    academic_year_id: string;
    exam_id: string;
  };

  const { control, setValue, watch } = useForm<FilterForm>({
    defaultValues: {
      academic_year_id: "",
      exam_id: "",
    },
  });

  const selectedYearId = watch("academic_year_id");
  const selectedExamId = watch("exam_id");
  const [downloading, setDownloading] = useState(false);

  const { data: instituteData } = useGetInstituteInfoQuery({});
  const student = instituteData?.payload?.data?.user || authUser || {};
  const instituteName =
    student?.institute_name ||
    student?.institute_detail?.institute_name ||
    instituteData?.payload?.data?.institute_name ||
    instituteData?.payload?.data?.institute?.institute_name ||
    authUser?.instituteName ||
    (authUser as any)?.institute_name ||
    "";
  const {
    data: examList = [],
    isLoading: isExamListLoading,
    isFetching: isExamListFetching,
    error: examListError,
    refetch: refetchExamList,
  } = useGetStudentExamListQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const [
    fetchStudentResult,
    {
      data: studentResultResponse,
      isLoading: isResultLoading,
      error: resultError,
      reset: resetResult,
    },
  ] = useGetStudentSpecificResultMutation();

  const yearOptions = useMemo(() => {
    const source = examList
      .filter((item) => item.academicYearId)
      .map((item) => ({
        label: item.academicYearName,
        value: String(item.academicYearId),
      }));

    if (source.length) {
      return Array.from(
        new Map(source.map((item) => [item.value, item])).values(),
      );
    }

    return (authUser?.academicYear || []).map((year) => ({
      label: year.name,
      value: String(year.id),
    }));
  }, [authUser?.academicYear, examList]);

  const examOptions = useMemo(() => {
    return examList
      .filter(
        (item) =>
          !selectedYearId ||
          item.academicYearId === null ||
          String(item.academicYearId) === selectedYearId,
      )
      .map((item) => ({
        label: item.examName,
        value: String(item.examId),
      }));
  }, [examList, selectedYearId]);

  const selectedYearOption = yearOptions.find(
    (option) => option.value === selectedYearId,
  );
  const selectedExamOption = examOptions.find(
    (option) => option.value === selectedExamId,
  );

  useEffect(() => {
    if (!selectedYearId || !selectedExamId) {
      return;
    }

    fetchStudentResult({
      academic_year_id: Number(selectedYearId),
      exam_id: Number(selectedExamId),
    })
      .unwrap()
      .catch((error: unknown) => {
        showMessage("error", "Result load failed", getErrorMessage(error));
      });
  }, [fetchStudentResult, selectedExamId, selectedYearId]);

  const resultPayload = useMemo(
    () => getPayload(studentResultResponse),
    [studentResultResponse],
  );

  const selectedExamData = examList.find((e) => String(e.examId) === String(selectedExamId));

  const transcriptData = useMemo(() => {
    const data = getTranscriptData(
      resultPayload,
      selectedYearOption?.label || "-",
      selectedExamOption?.label || "-",
      {
        class: selectedExamData?.class,
        shift: selectedExamData?.shift,
        section: selectedExamData?.section,
        group: selectedExamData?.group,
      },
    );

    return data;
  }, [
    resultPayload,
    selectedExamOption?.label,
    selectedYearOption?.label,
    selectedExamData,
  ]);

  const downloadPdfOnWeb = async (html: string) => {
    if (typeof document === "undefined") {
      throw new Error("Web print is not available.");
    }

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const cleanup = () => {
      setTimeout(() => {
        iframe.remove();
      }, 1000);
    };

    const printFrame = () => {
      const frameWindow = iframe.contentWindow;

      if (!frameWindow) {
        cleanup();
        throw new Error("Could not open print frame");
      }

      const images = frameWindow.document.getElementsByTagName("img");
      const imagePromises = Array.from(images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      });

      Promise.all(imagePromises).then(() => {
        setTimeout(() => {
          frameWindow.focus();
          frameWindow.print();
          cleanup();
          showMessage("success", "Print dialog opened. Choose Save as PDF.");
        }, 500);
      });
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

    // Always wait for the load event or a slight delay for rendering
    setTimeout(printFrame, 100);
  };

  const downloadPdfOnAndroid = async (fileName: string, pdfBase64: string) => {
    const SAF = (FileSystem as any).StorageAccessFramework;

    if (!SAF) {
      showMessage("error", "Storage Access Framework is not available.");
      return;
    }

    const downloadRootUri = SAF.getUriForDirectoryInRoot("Download");
    const permissions =
      await SAF.requestDirectoryPermissionsAsync(downloadRootUri);

    if (!permissions.granted) {
      showMessage("error", "Download folder permission was not granted.");
      return;
    }

    const fileUri = await SAF.createFileAsync(
      permissions.directoryUri,
      fileName,
      "application/pdf",
    );

    await SAF.writeAsStringAsync(fileUri, pdfBase64, {
      encoding: (FileSystem as any).EncodingType.Base64,
    });

    showMessage("success", "PDF saved to your selected Downloads folder.");
  };

  const handleDownload = useCallback(async () => {
    if (!transcriptData) {
      showMessage("info", "Result ready na", "Age year ar exam select korun.");
      return;
    }

    try {
      setDownloading(true);
      const html = await getTranscriptHtml(transcriptData);
      const safeStudent = transcriptData.studentName.replace(
        /[^a-zA-Z0-9-]/g,
        "_",
      );
      const fileName = `${RESULT_PDF_FILENAME_PREFIX}_${safeStudent}_${Date.now()}`;

      if (Platform.OS === "web") {
        await downloadPdfOnWeb(html);
        return;
      }

      const result = await Print.printToFileAsync({
        html,
        base64: true,
        width: 794,
        height: 1123,
      });

      if (Platform.OS === "android" && result.base64) {
        await downloadPdfOnAndroid(fileName, result.base64);
        return;
      }

      const fileUri = `${FileSystem.documentDirectory}${fileName}.pdf`;
      await FileSystem.copyAsync({ from: result.uri, to: fileUri });
      showMessage("success", "PDF saved inside app documents.");
      Alert.alert("PDF Saved", `Saved to:\n${fileUri}`);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      showMessage("error", "PDF generate failed", message);
    } finally {
      setDownloading(false);
    }
  }, [transcriptData]);

  const onRefresh = async () => {
    resetResult();
    await refetchExamList();
  };

  const handleYearChange = (value: string) => {
    if (value !== selectedYearId) {
      setValue("academic_year_id", value);
      setValue("exam_id", "");
      resetResult();
    }
  };

  const resultRows = transcriptData?.rows || [];
  const hasResult = !!transcriptData;

  const isWeb = Platform.OS === "web";
  const contentWidth = isWeb ? Math.min(width - 48, 1180) : width;

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC] dark:bg-[#0B1120]">
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
          paddingTop: isWeb ? 24 : 12,
          paddingHorizontal: isWeb ? 24 : 16,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isExamListFetching}
            onRefresh={onRefresh}
            colors={["#059669"]}
            tintColor="#059669"
          />
        }
      >
        <View
          style={{
            width: "100%",
            maxWidth: contentWidth,
            alignSelf: "center",
          }}
        >
          {/* 1. FILTER & ACTION CARD */}
          <View className="bg-white dark:bg-[#111C35] border border-gray-200/90 dark:border-gray-800/90 rounded-3xl p-5 md:p-6">
            <View
              style={{
                flexDirection: isDesktop ? "row" : "column",
                justifyContent: "space-between",
                alignItems: isDesktop ? "center" : "stretch",
                gap: 16,
              }}
            >
              <View className="flex-row items-center gap-3.5">
                <View className="h-11 w-11 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 items-center justify-center">
                  <Feather name="award" size={22} color="#059669" />
                </View>
                <View>
                  <Text className="text-xl md:text-2xl font-black text-gray-950 dark:text-white tracking-tight">
                    Semester Examination
                  </Text>
                  <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                    Academic transcripts, GPA, and performance reports
                  </Text>
                </View>
              </View>

              {/* Student Identity Chip */}
              <View className="flex-row items-center gap-3 bg-gray-50 dark:bg-gray-800/60 px-4 py-2.5 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 self-start md:self-auto max-w-full">
                <View className="h-10 w-10 rounded-xl bg-emerald-600 items-center justify-center shrink-0">
                  <Text className="text-white font-black text-base">
                    {(student?.student_name || "S").charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-sm font-black text-gray-950 dark:text-white"
                    numberOfLines={1}
                    selectable={true}
                  >
                    {student?.student_name || "Student"}
                  </Text>
                  {instituteName ? (
                    <Text
                      className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mt-0.5"
                      numberOfLines={1}
                      selectable={true}
                    >
                      {instituteName}
                    </Text>
                  ) : null}
                  <Text
                    className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5"
                    numberOfLines={1}
                    selectable={true}
                  >
                    ID: {student?.student_id || student?.institute_id || "-"}{student?.roll ? ` • Roll: ${student.roll}` : ""}
                  </Text>
                </View>
              </View>
            </View>

            {/* Select Controls & Download Action */}
            <View className="mt-6 pt-5 border-t border-gray-150 dark:border-gray-800/80 flex-col gap-4">
              <View className="w-full">
                <SearchableSelect
                  name="academic_year_id"
                  control={control}
                  label="Academic Year"
                  placeholder="Select year"
                  options={yearOptions}
                  onValueChange={handleYearChange}
                  containerClassName="mb-0"
                />
              </View>

              <View className="w-full">
                <SearchableSelect
                  name="exam_id"
                  control={control}
                  label="Examination"
                  placeholder="Select exam"
                  options={examOptions}
                  disabled={!selectedYearId || !examOptions.length}
                  containerClassName="mb-0"
                />
              </View>

              <View className="w-full pt-1">
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleDownload}
                  disabled={!hasResult || downloading}
                  className={`w-full h-[48px] rounded-xl px-5 flex-row items-center justify-center transition-all ${
                    hasResult
                      ? "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
                      : "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {downloading ? (
                    <ActivityIndicator size="small" color={hasResult ? "#ffffff" : "#059669"} />
                  ) : (
                    <Feather
                      name="download"
                      size={18}
                      color={hasResult ? "#ffffff" : isDark ? "#6B7280" : "#9CA3AF"}
                    />
                  )}
                  <Text
                    className={`ml-2 text-sm font-semibold ${
                      hasResult
                        ? "text-white"
                        : isDark
                        ? "text-slate-400"
                        : "text-slate-500"
                    }`}
                  >
                    {downloading ? "Preparing PDF..." : "Download Transcript"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 2. DYNAMIC CONTENT AREA */}
          {isExamListLoading ? (
            <View className="mt-6 bg-white dark:bg-[#111C35] rounded-3xl p-10 border border-gray-200/90 dark:border-gray-800/90 items-center justify-center ">
              <ActivityIndicator size="large" color="#059669" />
              <Text className="mt-4 text-base font-bold text-gray-800 dark:text-gray-200">
                Loading Examination List...
              </Text>
            </View>
          ) : examListError ? (
            <View className="mt-6 bg-white dark:bg-[#111C35] rounded-3xl p-8 border border-rose-200 dark:border-rose-900/40 items-center ">
              <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
              <Text className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
                Unable to Load Exam List
              </Text>
              <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center">
                {getErrorMessage(examListError)}
              </Text>
              <TouchableOpacity
                onPress={() => refetchExamList()}
                className="mt-4 rounded-xl bg-gray-900 dark:bg-gray-100 px-6 py-2.5"
              >
                <Text className="font-bold text-white dark:text-gray-900 text-sm">
                  Retry Loading
                </Text>
              </TouchableOpacity>
            </View>
          ) : isResultLoading ? (
            <View className="mt-6 bg-white dark:bg-[#111C35] rounded-3xl p-12 border border-gray-200/90 dark:border-gray-800/90 items-center justify-center ">
              <ActivityIndicator size="large" color="#059669" />
              <Text className="mt-4 text-base font-bold text-gray-900 dark:text-white">
                Fetching Official Marksheet...
              </Text>
            </View>
          ) : resultError ? (
            <View className="mt-6 bg-white dark:bg-[#111C35] rounded-3xl p-8 border border-rose-200 dark:border-rose-900/40 items-center ">
              <Ionicons name="close-circle-outline" size={44} color="#EF4444" />
              <Text className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
                Result Load Failed
              </Text>
              <Text className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400 max-w-md">
                {getErrorMessage(resultError)}
              </Text>
            </View>          ) : hasResult && transcriptData ? (
            <View className="mt-6">
              {/* A. OVERVIEW STATS CARDS (MOBILE & WEB) */}
              <View className="flex-row items-center gap-2.5 mb-5">
                {/* GPA */}
                {transcriptData.gpa && (
                  <View className="flex-1 p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/50">
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      GPA
                    </Text>
                    <View className="flex-row items-baseline gap-1 mt-1">
                      <Text className="text-lg md:text-xl font-black text-purple-700 dark:text-purple-300">
                        {transcriptData.gpa}
                      </Text>
                      {transcriptData.letterGrade && (
                        <Text className="text-xs font-black text-purple-600 dark:text-purple-400">
                          ({transcriptData.letterGrade})
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Total Marks */}
                {transcriptData.totalMarks && (
                  <View className="flex-1 p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/50">
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Total Marks
                    </Text>
                    <Text className="text-lg md:text-xl font-black text-blue-700 dark:text-blue-300 mt-1" numberOfLines={1}>
                      {transcriptData.totalMarks}
                      <Text className="text-xs font-semibold text-blue-500/70">
                        {transcriptData.totalFullMarks ? `/${transcriptData.totalFullMarks}` : ""}
                      </Text>
                    </Text>
                  </View>
                )}

                {/* Result Status */}
                {transcriptData.resultStatus && (
                  <View
                    className={`flex-1 p-3.5 rounded-2xl border ${
                      transcriptData.resultStatus.toLowerCase().includes("fail")
                        ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800/50"
                        : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/50"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        transcriptData.resultStatus.toLowerCase().includes("fail")
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      Result
                    </Text>
                    <Text
                      className={`text-base md:text-lg font-black mt-1 ${
                        transcriptData.resultStatus.toLowerCase().includes("fail")
                          ? "text-rose-700 dark:text-rose-300"
                          : "text-emerald-700 dark:text-emerald-300"
                      }`}
                      numberOfLines={1}
                    >
                      {transcriptData.resultStatus}
                    </Text>
                  </View>
                )}
              </View>

              {/* B. SUBJECT WISE MARKS TABLE (RESPONSIVE FOR ALL SCREENS) */}
              <View className="bg-white dark:bg-[#111C35] rounded-3xl border border-gray-200/90 dark:border-gray-800/90 overflow-hidden">
                <View className="px-5 py-4 border-b border-gray-200/80 dark:border-gray-800/80 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2.5">
                    <View className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 items-center justify-center">
                      <Ionicons name="document-text-outline" size={18} color="#059669" />
                    </View>
                    <Text className="text-base md:text-lg font-black text-gray-950 dark:text-white">
                      Subject-Wise Academic Transcript
                    </Text>
                  </View>
                  {!isDesktop && (
                    <View className="flex-row items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                      <Ionicons name="swap-horizontal" size={13} color="#6B7280" />
                      <Text className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        Swipe
                      </Text>
                    </View>
                  )}
                </View>
                {/* FULL TABLE VIEW WITH HORIZONTAL SCROLL ON MOBILE & WEB */}
                {(() => {
                  const COL_WIDTHS = {
                    subject: 220,
                    fullMarks: 85,
                    partMark: 75,
                    highest: 80,
                    obtained: 85,
                    gp: 65,
                    grade: 75,
                    attendance: 95,
                  };
                  const markKeys = transcriptData.markKeys || [];
                  const tableContentWidth =
                    COL_WIDTHS.subject +
                    COL_WIDTHS.fullMarks +
                    markKeys.length * COL_WIDTHS.partMark +
                    COL_WIDTHS.highest +
                    COL_WIDTHS.obtained +
                    COL_WIDTHS.gp +
                    COL_WIDTHS.grade +
                    COL_WIDTHS.attendance +
                    48;

                  return (
                    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                      <View style={{ minWidth: Math.max(tableContentWidth, 880), width: "100%" }}>
                        {/* Table Header */}
                        <View className="flex-row items-center px-6 py-3 bg-gray-50/80 dark:bg-gray-800/70 border-b border-gray-200/80 dark:border-gray-700/80">
                          <Text
                            style={{ width: COL_WIDTHS.subject }}
                            className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                          >
                            Subject Name
                          </Text>
                          <Text
                            style={{ width: COL_WIDTHS.fullMarks, textAlign: "center" }}
                            className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                          >
                            Full Marks
                          </Text>
                          {markKeys.map((key) => (
                            <Text
                              key={key}
                              style={{ width: COL_WIDTHS.partMark, textAlign: "center" }}
                              className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                            >
                              {key.toUpperCase()}
                            </Text>
                          ))}
                          <Text
                            style={{ width: COL_WIDTHS.highest, textAlign: "center" }}
                            className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                          >
                            Highest
                          </Text>
                          <Text
                            style={{ width: COL_WIDTHS.obtained, textAlign: "center" }}
                            className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                          >
                            Obtained
                          </Text>
                          <Text
                            style={{ width: COL_WIDTHS.gp, textAlign: "center" }}
                            className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                          >
                            GP
                          </Text>
                          <Text
                            style={{ width: COL_WIDTHS.grade, textAlign: "center" }}
                            className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                          >
                            Grade
                          </Text>
                          <Text
                            style={{ width: COL_WIDTHS.attendance, textAlign: "center" }}
                            className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                          >
                            Attendance
                          </Text>
                        </View>

                        {/* Main Compulsory Subjects */}
                        {resultRows.map((row, idx) => {
                          const gradeStyle = getGradeBadgeStyle(row.letterGrade);
                          return (
                            <View
                              key={`${row.name}-${idx}`}
                              className={`flex-row items-center px-6 py-3.5 border-b border-gray-100 dark:border-gray-800/60 ${
                                idx % 2 === 0
                                  ? "bg-white dark:bg-[#111C35]"
                                  : "bg-gray-50/40 dark:bg-gray-800/20"
                              }`}
                            >
                              <View style={{ width: COL_WIDTHS.subject, paddingRight: 10 }}>
                                <Text className="text-sm font-bold text-gray-950 dark:text-white" numberOfLines={2}>
                                  {row.name}
                                </Text>
                              </View>
                              <Text
                                style={{ width: COL_WIDTHS.fullMarks, textAlign: "center" }}
                                className="text-xs font-bold text-gray-600 dark:text-gray-300"
                              >
                                {toLabelValue(row.fullMarks)}
                              </Text>
                              {markKeys.map((key) => (
                                <Text
                                  key={key}
                                  style={{ width: COL_WIDTHS.partMark, textAlign: "center" }}
                                  className="text-xs font-medium text-gray-700 dark:text-gray-300"
                                >
                                  {toLabelValue(row.marks[key])}
                                </Text>
                              ))}
                              <Text
                                style={{ width: COL_WIDTHS.highest, textAlign: "center" }}
                                className="text-xs font-medium text-gray-500 dark:text-gray-400"
                              >
                                {toLabelValue(row.highestMarks)}
                              </Text>
                              <Text
                                style={{ width: COL_WIDTHS.obtained, textAlign: "center" }}
                                className="text-xs font-black text-emerald-600 dark:text-emerald-400"
                              >
                                {toLabelValue(row.finalMarks)}
                              </Text>
                              <Text
                                style={{ width: COL_WIDTHS.gp, textAlign: "center" }}
                                className="text-xs font-black text-gray-900 dark:text-white"
                              >
                                {toLabelValue(row.gradePoint)}
                              </Text>
                              <View style={{ width: COL_WIDTHS.grade, alignItems: "center" }}>
                                <View className={`px-2.5 py-0.5 rounded-md border ${gradeStyle.bg} ${gradeStyle.border}`}>
                                  <Text className={`text-xs font-black ${gradeStyle.text}`}>
                                    {toLabelValue(row.letterGrade)}
                                  </Text>
                                </View>
                              </View>
                              <View style={{ width: COL_WIDTHS.attendance, alignItems: "center" }}>
                                <View
                                  className={`px-2 py-0.5 rounded-full ${
                                    (row.attendance || "present").toLowerCase() === "present"
                                      ? "bg-emerald-50 dark:bg-emerald-950/40"
                                      : "bg-rose-50 dark:bg-rose-950/40"
                                  }`}
                                >
                                  <Text
                                    className={`text-[10px] font-bold ${
                                      (row.attendance || "present").toLowerCase() === "present"
                                        ? "text-emerald-700 dark:text-emerald-300"
                                        : "text-rose-700 dark:text-rose-300"
                                    }`}
                                  >
                                    {capitalize(row.attendance || "Present")}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          );
                        })}

                        {/* Optional Subjects Section */}
                        {(transcriptData.optionalRows || []).length > 0 && (
                          <>
                            <View className="px-6 py-2 bg-purple-50/60 dark:bg-purple-950/20 border-y border-purple-100 dark:border-purple-900/30">
                              <Text className="text-xs font-black text-purple-700 dark:text-purple-300 uppercase tracking-widest">
                                ★ 4th / Optional Subject
                              </Text>
                            </View>
                            {transcriptData.optionalRows.map((row, idx) => {
                              const gradeStyle = getGradeBadgeStyle(row.letterGrade);
                              return (
                                <View
                                  key={`optional-${row.name}-${idx}`}
                                  className="flex-row items-center px-6 py-3.5 border-b border-gray-100 dark:border-gray-800/60 bg-purple-50/20 dark:bg-purple-950/10"
                                >
                                  <View style={{ width: COL_WIDTHS.subject, paddingRight: 10 }}>
                                    <Text className="text-sm font-bold text-gray-950 dark:text-white" numberOfLines={1}>
                                      {row.name}
                                    </Text>
                                    <Text className="text-[10px] font-medium text-purple-600 dark:text-purple-400">
                                      Optional Subject
                                    </Text>
                                  </View>
                                  <Text
                                    style={{ width: COL_WIDTHS.fullMarks, textAlign: "center" }}
                                    className="text-xs font-bold text-gray-600 dark:text-gray-300"
                                  >
                                    {toLabelValue(row.fullMarks)}
                                  </Text>
                                  {markKeys.map((key) => (
                                    <Text
                                      key={key}
                                      style={{ width: COL_WIDTHS.partMark, textAlign: "center" }}
                                      className="text-xs font-medium text-gray-700 dark:text-gray-300"
                                    >
                                      {toLabelValue(row.marks[key])}
                                    </Text>
                                  ))}
                                  <Text
                                    style={{ width: COL_WIDTHS.highest, textAlign: "center" }}
                                    className="text-xs font-medium text-gray-500 dark:text-gray-400"
                                  >
                                    {toLabelValue(row.highestMarks)}
                                  </Text>
                                  <Text
                                    style={{ width: COL_WIDTHS.obtained, textAlign: "center" }}
                                    className="text-xs font-black text-purple-600 dark:text-purple-400"
                                  >
                                    {toLabelValue(row.finalMarks)}
                                  </Text>
                                  <Text
                                    style={{ width: COL_WIDTHS.gp, textAlign: "center" }}
                                    className="text-xs font-black text-gray-900 dark:text-white"
                                  >
                                    {toLabelValue(row.gradePoint)}
                                  </Text>
                                  <View style={{ width: COL_WIDTHS.grade, alignItems: "center" }}>
                                    <View className={`px-2.5 py-0.5 rounded-md border ${gradeStyle.bg} ${gradeStyle.border}`}>
                                      <Text className={`text-xs font-black ${gradeStyle.text}`}>
                                        {toLabelValue(row.letterGrade)}
                                      </Text>
                                    </View>
                                  </View>
                                  <View style={{ width: COL_WIDTHS.attendance, alignItems: "center" }}>
                                    <View className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40">
                                      <Text className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                        {capitalize(row.attendance || "Present")}
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                              );
                            })}
                          </>
                        )}
                      </View>
                    </ScrollView>
                  );
                })()}
              </View>

              {/* C. REMARKS & REMARKS CARD */}
              {(transcriptData.comments || transcriptData.gradeComment) && (
                <View className="mt-6 bg-white dark:bg-[#111C35] rounded-3xl p-6 border border-gray-200/90 dark:border-gray-800/90  flex-row items-start gap-3">
                  <View className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 items-center justify-center mt-0.5">
                    <Ionicons name="chatbubble-ellipses-outline" size={20} color="#D97706" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-black text-gray-950 dark:text-white">
                      Teacher Comments & Remarks
                    </Text>
                    <Text className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-5">
                      {transcriptData.comments || transcriptData.gradeComment}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          ) : (
            /* EMPTY STATE */
            <View className="mt-6 bg-white dark:bg-[#111C35] rounded-3xl p-12 border border-dashed border-gray-300 dark:border-gray-700 items-center justify-center">
              <View className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 items-center justify-center mb-4">
                <Ionicons
                  name="document-text-outline"
                  size={32}
                  color="#059669"
                />
              </View>
              <Text className="text-lg md:text-xl font-black text-gray-900 dark:text-white text-center">
                Select Examination to View Mark Sheet
              </Text>
              <Text className="mt-2 text-center text-xs md:text-sm text-gray-500 dark:text-gray-400 max-w-md">
                Please select your Academic Year and Examination from the filters above. Your complete subject-wise marksheet and GPA will appear here.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getGradeBadgeStyle(grade: string) {
  const g = (grade || "").trim().toUpperCase();
  if (g === "A+") {
    return {
      bg: "bg-emerald-50 dark:bg-emerald-950/60",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-200 dark:border-emerald-800/80",
    };
  }
  if (g === "A" || g === "A-") {
    return {
      bg: "bg-teal-50 dark:bg-teal-950/60",
      text: "text-teal-700 dark:text-teal-300",
      border: "border-teal-200 dark:border-teal-800/80",
    };
  }
  if (g.startsWith("B")) {
    return {
      bg: "bg-blue-50 dark:bg-blue-950/60",
      text: "text-blue-700 dark:text-blue-300",
      border: "border-blue-200 dark:border-blue-800/80",
    };
  }
  if (g.startsWith("C") || g.startsWith("D")) {
    return {
      bg: "bg-amber-50 dark:bg-amber-950/60",
      text: "text-amber-700 dark:text-amber-300",
      border: "border-amber-200 dark:border-amber-800/80",
    };
  }
  if (g === "F") {
    return {
      bg: "bg-rose-50 dark:bg-rose-950/60",
      text: "text-rose-700 dark:text-rose-300",
      border: "border-rose-200 dark:border-rose-800/80",
    };
  }
  return {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-700 dark:text-gray-300",
    border: "border-gray-200 dark:border-gray-700",
  };
}
