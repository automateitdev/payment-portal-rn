import { CustomSelect, SelectOption } from "@/components/Selector/Selector";
import { showMessage } from "@/components/shared/CustomToast/message";
import { useGetInstituteInfoQuery } from "@/redux/allApi/authApi/authApi";
import {
  useGetStudentExamListQuery,
  useGetStudentSpecificResultMutation,
} from "@/redux/allApi/semesterExam/semesterExamApi";
import { useAppSelector } from "@/redux/hook";
import { Feather } from "@expo/vector-icons";
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
    guardian_details?: {
      father_name_english?: string;
      mother_name_english?: string;
      guardian_mobile?: string;
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
};
type TranscriptRow = {
  name: string;
  fullMarks: number | string;
  highestMarks: number | string;
  marks: Record<string, number | string>;
  finalMarks: number | string;
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

        allRows.push({
          name: rowName,
          fullMarks,
          highestMarks,
          marks: marksRecord,
          finalMarks: part.final_mark ?? part.total_marks ?? "",
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

  return {
    instituteName: payload.institute_details?.institute_name || "Institute",
    instituteAddress: payload.institute_details?.institute_address || "-",
    instituteContact: payload.institute_details?.institute_contact || "-",
    instituteEmail: payload.institute_details?.institute_email || "-",
    logoUrl: payload.institute_details?.logo_url || "",
    examName: selectedExam,
    yearLabel: selectedYear,
    studentName: studentResult.student_name || "-",
    fatherName:
      studentResult.student_info?.guardian_details?.father_name_english || "-",
    motherName:
      studentResult.student_info?.guardian_details?.mother_name_english || "-",
    studentId: toLabelValue(studentResult.student_id),
    roll: toLabelValue(studentResult.roll),
    department: toLabelValue(
      examInfo?.group || // using group as dept if available from exam list
        configs.find((c) => c.department_name)?.department_name ||
        gradeItem.department_name ||
        configItem.department_name ||
        configItem.subject_type,
    ),
    classShiftSection:
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
        .join("-") || "-",
    group:
      capitalize(
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
        <td>${escapeHtml(row.finalMarks)}</td>
        ${gpCell}
        ${gradeCell}
      </tr>
    `;
  };

  const rowsHtml = transcript.rows.map(renderRow).join("");
  const optionalHtml = transcript.optionalRows.map(renderRow).join("");
  const uncountableHtml = transcript.uncountableRows.map(renderRow).join("");

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

  const qrCodeUrl = await QRCode.toDataURL(qrData, {
    margin: 1,
    width: 200,
    color: { dark: "#111827", light: "#ffffff" },
  });

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
            border-radius: 12px;
            background: #8B4513;
            color: white;
            text-align: center;
            padding: 6px 12px;
            font-weight: 400;
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
              <div style="width: 124px;"></div>
              <div class="title">
                <h1>${escapeHtml(transcript.instituteName)}</h1>
                <p>${escapeHtml(transcript.instituteAddress)}</p>
                <p>Contact: ${escapeHtml(transcript.instituteContact)} | Email: ${escapeHtml(transcript.instituteEmail)}</p>
                ${logoHtml}
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

            <div class="banner">ACADEMIC TRANSCRIPT</div>

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
              <thead>
                <tr>
                  <th rowspan="2">Name of Subject</th>
                  <th rowspan="2">Full Marks</th>
                  <th rowspan="2">Highest Marks</th>
                  <th colspan="${transcript.markKeys.length || 1}">Obtained Marks</th>
                  <th rowspan="2">Final Marks</th>
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
                  <td style="font-weight:700;">${escapeHtml(transcript.gpaWithoutOptional)}</td>
                  <td style="font-weight:700;">${escapeHtml(transcript.letterGradeWithoutOptional)}</td>
                </tr>
              </tbody>
            </table>

            ${
              transcript.optionalRows.length
                ? `
            <div class="section-label">4th Subjects</div>
            <table class="result-table">
              <tbody>
                ${optionalHtml}
                <tr class="yellow-row">
                  <td style="text-align:right;">Total Marks(with 4th Subject)</td>
                  <td>${escapeHtml(transcript.totalFullMarksWithOptional)}</td>
                  <td></td>
                  ${transcript.markKeys.map(() => "<td></td>").join("")}
                  <td style="font-weight:700;">${escapeHtml(transcript.totalMarksWithOptional)}</td>
                  <td style="font-weight:700;">${escapeHtml(transcript.gpaWithOptional)}</td>
                  <td style="font-weight:700;">${escapeHtml(transcript.letterGradeWithOptional)}</td>
                </tr>
              </tbody>
            </table>
            `
                : ""
            }

            ${
              transcript.uncountableRows.length
                ? `
            <div class="section-label">Uncountable Subjects</div>
            <table class="result-table">
              <tbody>
                ${uncountableHtml}
              </tbody>
            </table>
            `
                : ""
            }

            <div class="bottom-grid">
              <div class="block">
                <table>
                  <tr><th colspan="2">Summary</th></tr>
                  <tr><td>Result Status</td><td>${escapeHtml(transcript.resultStatus)}</td></tr>
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
                  <tr><td colspan="4"><strong>Comments:</strong><br/>${escapeHtml(transcript.comments)}</td></tr>
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
                        <img src="${qrCodeUrl}" alt="QR Code" style="width:72px; height:72px;" />
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
              <div>Powered By: Academy-Institute Management Software</div>
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

  const [selectedYearId, setSelectedYearId] = useState<number | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  const { data: instituteData } = useGetInstituteInfoQuery({});
  const student = instituteData?.payload?.data?.user || {};

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

  const yearOptions = useMemo<SelectOption[]>(() => {
    const source = examList
      .filter((item) => item.academicYearId)
      .map((item) => ({
        label: item.academicYearName,
        value: item.academicYearId as number,
      }));

    if (source.length) {
      return Array.from(
        new Map(source.map((item) => [item.value, item])).values(),
      );
    }

    return (authUser?.academicYear || []).map((year) => ({
      label: year.name,
      value: year.id,
    }));
  }, [authUser?.academicYear, examList]);

  const examOptions = useMemo<SelectOption[]>(() => {
    return examList
      .filter(
        (item) =>
          selectedYearId === null ||
          item.academicYearId === null ||
          item.academicYearId === selectedYearId,
      )
      .map((item) => ({
        label: item.examName,
        value: item.examId,
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
      academic_year_id: selectedYearId,
      exam_id: selectedExamId,
    })
      .unwrap()
      .catch((error: unknown) => {
        const maybeError = error as {
          data?: { message?: string };
          message?: string;
        };
        const message =
          maybeError?.data?.message ||
          maybeError?.message ||
          "Result load korte problem hocche.";
        showMessage("error", "Result load failed", message);
      });
  }, [fetchStudentResult, selectedExamId, selectedYearId]);

  const resultPayload = useMemo(
    () => getPayload(studentResultResponse),
    [studentResultResponse],
  );

  const selectedExamData = examList.find((e) => e.examId === selectedExamId);

  const transcriptData = useMemo(
    () =>
      getTranscriptData(
        resultPayload,
        selectedYearOption?.label || "-",
        selectedExamOption?.label || "-",
        {
          class: selectedExamData?.class,
          shift: selectedExamData?.shift,
          section: selectedExamData?.section,
          group: selectedExamData?.group,
        },
      ),
    [
      resultPayload,
      selectedExamOption?.label,
      selectedYearOption?.label,
      selectedExamData,
    ],
  );

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

  const handleYearChange = (value: string | number) => {
    const nextYearId = Number(value);

    if (nextYearId !== selectedYearId) {
      setSelectedYearId(nextYearId);
      setSelectedExamId(null);
      resetResult();
    }
  };

  const resultRows = transcriptData?.rows || [];
  const hasResult = !!transcriptData;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={isExamListFetching}
            onRefresh={onRefresh}
            colors={["#0f766e"]}
            tintColor="#0f766e"
          />
        }
      >
        <View className="px-4 pt-5">
          <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-5 overflow-hidden">
            <View className="absolute -top-10 right-0 h-28 w-28 rounded-full bg-emerald-100/70 dark:bg-emerald-500/10" />
            <View className="absolute -bottom-12 left-0 h-32 w-32 rounded-full bg-cyan-100/70 dark:bg-cyan-500/10" />

            <View
              style={{
                flexDirection: isDesktop ? "row" : "column",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text className="text-[11px] font-bold uppercase tracking-[2px] text-emerald-600 dark:text-emerald-400">
                  Semester Exam
                </Text>
                <Text className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                  Mark Sheet Download
                </Text>
              </View>

              <View className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl px-4 py-3 border border-slate-200 dark:border-slate-700">
                <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Student
                </Text>
                <Text className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                  {student?.student_name || "Loading..."}
                </Text>
                <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  SID: {student?.student_id || "-"}
                </Text>
              </View>
            </View>

            <View
              className="mt-6"
              style={{
                flexDirection: isDesktop ? "row" : "column",
                gap: 14,
                alignItems: isDesktop ? "flex-end" : "stretch",
              }}
            >
              <View style={{ flex: 1 }}>
                <CustomSelect
                  label="Academic Year"
                  placeholder="Select year"
                  options={yearOptions}
                  value={selectedYearId}
                  onChange={handleYearChange}
                  helperText={
                    yearOptions.length
                      ? "Select year to view results"
                      : "No academic year list available."
                  }
                />
              </View>

              <View style={{ flex: 1 }}>
                <CustomSelect
                  label="Exam"
                  placeholder="Select exam"
                  options={examOptions}
                  value={selectedExamId}
                  onChange={(value) => setSelectedExamId(Number(value))}
                  disabled={!selectedYearId || !examOptions.length}
                  helperText={
                    selectedYearId
                      ? "Select exam to view results"
                      : "First select academic year."
                  }
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleDownload}
                disabled={!hasResult || downloading}
                className={`h-[56px] rounded-2xl px-5 flex-row items-center justify-center ${
                  hasResult ? "bg-emerald-500" : "bg-slate-200"
                }`}
                style={{ minWidth: isDesktop ? 220 : "100%" }}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Feather
                    name="download"
                    size={18}
                    color={hasResult ? "#ffffff" : "#94a3b8"}
                  />
                )}
                <Text
                  className={`ml-2 font-bold ${
                    hasResult ? "text-white" : "text-slate-500"
                  }`}
                >
                  Download Transcript
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* {isExamListLoading ? (
            <View className="mt-5 bg-white dark:bg-slate-900 rounded-[24px] p-8 border border-slate-200 dark:border-slate-800 items-center">
              <ActivityIndicator size="large" color="#0f766e" />
              <Text className="mt-4 text-slate-600 dark:text-slate-400">
                Exam list load hocche...
              </Text>
            </View>
          ) : examListError ? (
            <View className="mt-5 bg-white dark:bg-slate-900 rounded-[24px] p-8 border border-rose-200 dark:border-rose-900/40 items-center">
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={40}
                color="#ef4444"
              />
              <Text className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
                Exam list load hoyni
              </Text>
              <TouchableOpacity
                onPress={() => refetchExamList()}
                className="mt-5 rounded-2xl bg-slate-900 dark:bg-slate-100 px-5 py-3"
              >
                <Text className="font-bold text-white dark:text-slate-900">
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>
          ) : isResultLoading ? (
            <View className="mt-5 bg-white dark:bg-slate-900 rounded-[24px] p-8 border border-slate-200 dark:border-slate-800 items-center">
              <ActivityIndicator size="large" color="#2563eb" />
              <Text className="mt-4 text-slate-600 dark:text-slate-400">
                Result load hocche...
              </Text>
            </View>
          ) : resultError ? (
            <View className="mt-5 bg-white dark:bg-slate-900 rounded-[24px] p-8 border border-rose-200 dark:border-rose-900/40 items-center">
              <Ionicons name="close-circle-outline" size={42} color="#ef4444" />
              <Text className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
                Result load failed
              </Text>
              <Text className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
                Academic year ar exam abar select kore try korte paro.
              </Text>
            </View>
          ) : hasResult ? (
            <View className="mt-5">
              <View className="bg-white dark:bg-slate-900 rounded-[24px] p-5 border border-slate-200 dark:border-slate-800">
                <View
                  style={{
                    flexDirection: isDesktop ? "row" : "column",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <View>
                    <Text className="text-xl font-black text-slate-900 dark:text-white">
                      {transcriptData.examName}
                    </Text>
                    <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {transcriptData.yearLabel}
                    </Text>
                  </View>

                  <View className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 border border-emerald-100 dark:border-emerald-500/20">
                    <Text className="text-xs font-semibold uppercase tracking-[2px] text-emerald-600 dark:text-emerald-400">
                      Result Status
                    </Text>
                    <Text className="mt-1 text-lg font-black text-emerald-700 dark:text-emerald-300">
                      {transcriptData.resultStatus}
                    </Text>
                  </View>
                </View>

                <View
                  className="mt-5"
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    marginHorizontal: -6,
                  }}
                >
                  <SummaryCard
                    label="Student Name"
                    value={transcriptData.studentName}
                  />
                  <SummaryCard
                    label="Student ID"
                    value={transcriptData.studentId}
                  />
                  <SummaryCard label="Roll" value={transcriptData.roll} />
                  <SummaryCard label="GPA" value={transcriptData.gpa} />
                  <SummaryCard
                    label="Letter Grade"
                    value={transcriptData.letterGrade}
                  />
                  <SummaryCard
                    label="Total Marks"
                    value={transcriptData.totalMarks}
                  />
                </View>
              </View>

              <View className="mt-5 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 overflow-hidden">
                <View className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                  <Text className="text-lg font-black text-slate-900 dark:text-white">
                    Subject Wise Transcript
                  </Text>
                </View>

                {resultRows.map((row, index) => (
                  <View
                    key={`${row.name}-${index}`}
                    className={`px-5 py-4 ${
                      index !== resultRows.length - 1
                        ? "border-b border-slate-100 dark:border-slate-800"
                        : ""
                    } ${row.isUncountable ? "bg-amber-50/70 dark:bg-amber-500/5" : ""}`}
                  >
                    <Text className="text-base font-bold text-slate-900 dark:text-white">
                      {row.name}
                    </Text>
                    <View className="mt-3 flex-row flex-wrap">
                      <MiniStat
                        label="Full Marks"
                        value={toLabelValue(row.fullMarks)}
                      />
                      <MiniStat
                        label="Highest Marks"
                        value={toLabelValue(row.highestMarks)}
                      />
                      <MiniStat
                        label="Obtained"
                        value={`CQ: ${toLabelValue(row.cqMarks)} | MCQ: ${toLabelValue(row.mcqMarks)}`}
                      />
                      <MiniStat
                        label="Final Marks"
                        value={toLabelValue(row.finalMarks)}
                      />
                      <MiniStat
                        label="Grade Point"
                        value={toLabelValue(row.gradePoint)}
                      />
                      <MiniStat
                        label="Letter Grade"
                        value={toLabelValue(row.letterGrade)}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View className="mt-5 bg-white dark:bg-slate-900 rounded-[24px] p-8 border border-dashed border-slate-300 dark:border-slate-700 items-center">
              <Ionicons
                name="document-text-outline"
                size={42}
                color={isDark ? "#64748b" : "#94a3b8"}
              />
              <Text className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                Transcript ready to load
              </Text>
              <Text className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
                Year ar exam select korlei ekhane transcript details dekhabe.
              </Text>
            </View>
          )} */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="px-1.5 mb-3" style={{ width: "50%" }}>
      <View className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-4 py-3">
        <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-slate-500 dark:text-slate-400">
          {label}
        </Text>
        <Text className="mt-2 text-base font-bold text-slate-900 dark:text-white">
          {value}
        </Text>
      </View>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="mr-3 mb-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 min-w-[110px]">
      <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-slate-500 dark:text-slate-400">
        {label}
      </Text>
      <Text className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
        {value}
      </Text>
    </View>
  );
}
// import { CustomSelect, SelectOption } from "@/components/Selector/Selector";
// import { useGetInstituteInfoQuery } from "@/redux/allApi/authApi/authApi";
// import {
//   useGetStudentExamListQuery,
//   useGetStudentSpecificResultMutation,
// } from "@/redux/allApi/semesterExam/semesterExamApi";
// import { useAppSelector } from "@/redux/hook";
// import { showToast } from "@/utils/toast";
// import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
// import {
//   ActivityIndicator,
//   Alert,
//   Platform,
//   RefreshControl,
//   ScrollView,
//   StatusBar,
//   Text,
//   TouchableOpacity,
//   useWindowDimensions,
//   View,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";

// const RESULT_PDF_FILENAME_PREFIX = "Academic_Transcript";

// type JsonRecord = Record<string, unknown>;
// type PartMarks = Record<string, number>;
// type SubjectPart = {
//   subject_id?: number;
//   subject_name?: string;
//   part_marks?: PartMarks;
//   total_marks?: number;
//   final_mark?: number;
//   grade?: string;
//   grade_point?: string;
//   attendance_status?: string;
// };
// type SubjectResult = {
//   subject_id?: number;
//   subject_name?: string;
//   combined_id?: number;
//   combined_name?: string;
//   is_combined?: boolean;
//   parts?: SubjectPart[];
//   part_marks?: PartMarks;
//   total_marks?: number;
//   total_max_mark?: number;
//   final_mark?: number;
//   percentage?: number;
//   grade?: string;
//   grade_point?: string;
//   combined_grade?: string;
//   combined_grade_point?: string;
//   combined_status?: string;
//   attendance_status?: string;
//   is_uncountable?: boolean;
//   is_optional?: boolean;
// };
// type FailedSubject = {
//   subject_name?: string;
//   marks?: number;
//   grade?: string;
// };
// type StudentResult = {
//   student_id?: number;
//   student_name?: string;
//   roll?: number | string;
//   subjects?: SubjectResult[];
//   total_mark_without_optional?: number;
//   gpa_without_optional?: number | string;
//   letter_grade_without_optional?: string;
//   total_mark_with_optional?: number;
//   gpa_with_optional?: number | string;
//   letter_grade_with_optional?: string;
//   result_status?: string;
//   optional_bonus_gp?: number | string;
//   optional_bonus_mark?: number;
//   failed_subject_count?: number;
//   failed_subjects?: FailedSubject[];
//   student_info?: {
//     guardian_details?: {
//       father_name_english?: string;
//       mother_name_english?: string;
//       guardian_mobile?: string;
//     };
//   };
//   merit_info?: {
//     class_position?: number;
//     shift_position?: number;
//     section_position?: number;
//   };
// };
// type HighestMark = {
//   subject_id?: number;
//   subject_name?: string;
//   highest_mark?: number;
// };
// type FullMark = {
//   subject_id?: number;
//   subject_name?: string;
//   full_mark?: number;
// };
// type ExamGrade = {
//   from_mark?: string;
//   to_mark?: string;
//   grade_point?: string;
//   grade?: string;
// };
// type InstituteDetails = {
//   institute_name?: string;
//   institute_address?: string;
//   institute_contact?: string;
//   institute_email?: string;
//   logo_url?: string;
// };
// type ResultPayload = {
//   institute_details?: InstituteDetails;
//   result?: StudentResult[];
//   highest_marks?: HighestMark[];
//   subject_config?: JsonRecord[];
//   exam_grade?: ExamGrade[];
//   full_marks?: FullMark[];
//   total_full_marks?: number;
//   is_conversion?: boolean;
// };
// type TranscriptRow = {
//   name: string;
//   fullMarks: number | string;
//   highestMarks: number | string;
//   obtainedMarks: string;
//   finalMarks: number | string;
//   gradePoint: string;
//   letterGrade: string;
//   status: string;
//   isUncountable: boolean;
// };
// type TranscriptData = {
//   instituteName: string;
//   instituteAddress: string;
//   instituteContact: string;
//   instituteEmail: string;
//   examName: string;
//   yearLabel: string;
//   studentName: string;
//   fatherName: string;
//   motherName: string;
//   studentId: string;
//   roll: string;
//   department: string;
//   classShiftSection: string;
//   group: string;
//   merit: string;
//   resultStatus: string;
//   totalMarks: string;
//   gpa: string;
//   letterGrade: string;
//   failedSubjects: string;
//   gradeScale: ExamGrade[];
//   rows: TranscriptRow[];
// };

// const isRecord = (value: unknown): value is JsonRecord =>
//   !!value && typeof value === "object" && !Array.isArray(value);

// const getPayload = (response: unknown): ResultPayload | null => {
//   if (!isRecord(response)) {
//     return null;
//   }

//   const payload = response.payload;
//   if (isRecord(payload) && isRecord(payload.data)) {
//     return payload.data as ResultPayload;
//   }

//   if (isRecord(response.data)) {
//     return response.data as ResultPayload;
//   }

//   return response as ResultPayload;
// };

// const toLabelValue = (value: unknown) =>
//   value === null || value === undefined || value === "" ? "-" : String(value);

// const escapeHtml = (value: unknown) =>
//   String(value ?? "")
//     .replaceAll("&", "&amp;")
//     .replaceAll("<", "&lt;")
//     .replaceAll(">", "&gt;")
//     .replaceAll('"', "&quot;")
//     .replaceAll("'", "&#39;");

// const formatDecimal = (value: unknown) => {
//   if (value === null || value === undefined || value === "") {
//     return "-";
//   }

//   const numericValue = Number(value);
//   return Number.isFinite(numericValue) ? numericValue.toFixed(2) : String(value);
// };

// const getPartMarksText = (partMarks?: PartMarks) => {
//   if (!partMarks || !Object.keys(partMarks).length) {
//     return "-";
//   }

//   return Object.entries(partMarks)
//     .map(([key, value]) => `${key}: ${value}`)
//     .join(", ");
// };

// const getTranscriptData = (
//   payload: ResultPayload | null,
//   selectedYear: string,
//   selectedExam: string,
// ): TranscriptData | null => {
//   if (!payload?.result?.length) {
//     return null;
//   }

//   const studentResult = payload.result[0];
//   const highestMarkMap = new Map(
//     (payload.highest_marks || []).map((item) => [
//       item.subject_name || "",
//       item.highest_mark || 0,
//     ]),
//   );
//   const fullMarkMap = new Map(
//     (payload.full_marks || []).map((item) => [
//       item.subject_name || "",
//       item.full_mark || 0,
//     ]),
//   );

//   const rows = (studentResult.subjects || []).map((subject) => {
//     const rowName = subject.is_combined
//       ? subject.combined_name || subject.subject_name || "Subject"
//       : subject.subject_name || "Subject";
//     const gradePoint = subject.is_combined
//       ? subject.combined_grade_point || "-"
//       : subject.grade_point || "-";
//     const letterGrade = subject.is_combined
//       ? subject.combined_grade || "-"
//       : subject.grade || "-";
//     const status = subject.is_combined
//       ? subject.combined_status || "-"
//       : subject.attendance_status || "-";
//     const fullMarks =
//       subject.total_max_mark ||
//       fullMarkMap.get(rowName) ||
//       subject.parts?.reduce((sum, part) => sum + (part.total_marks || 0), 0) ||
//       0;
//     const highestMarks = highestMarkMap.get(rowName) || "-";
//     const obtainedMarks = subject.is_combined
//       ? getPartMarksText(subject.parts?.reduce<PartMarks>((acc, part) => {
//           Object.entries(part.part_marks || {}).forEach(([key, value]) => {
//             acc[key] = (acc[key] || 0) + value;
//           });
//           return acc;
//         }, {}))
//       : getPartMarksText(subject.part_marks);

//     return {
//       name: rowName,
//       fullMarks,
//       highestMarks,
//       obtainedMarks,
//       finalMarks: subject.final_mark ?? subject.total_marks ?? "-",
//       gradePoint,
//       letterGrade,
//       status,
//       isUncountable: !!subject.is_uncountable,
//     };
//   });

//   const failedSubjects = (studentResult.failed_subjects || [])
//     .map((item) => item.subject_name)
//     .filter(Boolean)
//     .join(", ");

//   return {
//     instituteName: payload.institute_details?.institute_name || "Institute",
//     instituteAddress: payload.institute_details?.institute_address || "-",
//     instituteContact: payload.institute_details?.institute_contact || "-",
//     instituteEmail: payload.institute_details?.institute_email || "-",
//     examName: selectedExam,
//     yearLabel: selectedYear,
//     studentName: studentResult.student_name || "-",
//     fatherName:
//       studentResult.student_info?.guardian_details?.father_name_english || "-",
//     motherName:
//       studentResult.student_info?.guardian_details?.mother_name_english || "-",
//     studentId: toLabelValue(studentResult.student_id),
//     roll: toLabelValue(studentResult.roll),
//     department: toLabelValue(
//       (payload.subject_config || [])[0]?.department_name ||
//         (payload.subject_config || [])[0]?.subject_type,
//     ),
//     classShiftSection: [
//       (payload.subject_config || [])[0]?.class_name,
//       (payload.subject_config || [])[0]?.shift_name,
//       (payload.subject_config || [])[0]?.section_name,
//     ]
//       .filter(Boolean)
//       .join(" - ") || "-",
//     group: toLabelValue((payload.subject_config || [])[0]?.group_name),
//     merit:
//       studentResult.merit_info?.class_position !== undefined
//         ? `Class ${studentResult.merit_info.class_position} / Shift ${toLabelValue(
//             studentResult.merit_info.shift_position,
//           )} / Section ${toLabelValue(
//             studentResult.merit_info.section_position,
//           )}`
//         : "-",
//     resultStatus: studentResult.result_status || "-",
//     totalMarks: toLabelValue(studentResult.total_mark_with_optional),
//     gpa: formatDecimal(studentResult.gpa_with_optional),
//     letterGrade: studentResult.letter_grade_with_optional || "-",
//     failedSubjects: failedSubjects || "None",
//     gradeScale: payload.exam_grade || [],
//     rows,
//   };
// };

// const getTranscriptHtml = (transcript: TranscriptData) => {
//   const rowsHtml = transcript.rows
//     .map(
//       (row) => `
//         <tr class="${row.isUncountable ? "uncountable" : ""}">
//           <td class="subject">${escapeHtml(row.name)}</td>
//           <td>${escapeHtml(row.fullMarks)}</td>
//           <td>${escapeHtml(row.highestMarks)}</td>
//           <td class="marks-col">${escapeHtml(row.obtainedMarks)}</td>
//           <td>${escapeHtml(row.finalMarks)}</td>
//           <td>${escapeHtml(row.gradePoint)}</td>
//           <td>${escapeHtml(row.letterGrade)}</td>
//           <td>${escapeHtml(row.status)}</td>
//         </tr>
//       `,
//     )
//     .join("");

//   const gradeScaleHtml = transcript.gradeScale
//     .map(
//       (grade) => `
//         <tr>
//           <td>${escapeHtml(grade.from_mark)}-${escapeHtml(grade.to_mark)}</td>
//           <td>${escapeHtml(grade.grade)}</td>
//           <td>${escapeHtml(grade.grade_point)}</td>
//         </tr>
//       `,
//     )
//     .join("");

//   return `
//     <!DOCTYPE html>
//     <html>
//       <head>
//         <meta charset="UTF-8" />
//         <style>
//           @page { size: A4 portrait; margin: 8mm; }
//           * { box-sizing: border-box; }
//           body {
//             margin: 0;
//             color: #111827;
//             font-family: Arial, sans-serif;
//             background: #ffffff;
//           }
//           .sheet {
//             border: 4px solid #7f1d1d;
//             padding: 10px;
//             min-height: 100%;
//           }
//           .inner {
//             border: 2px solid #d97706;
//             padding: 12px 14px 20px;
//           }
//           .header {
//             display: flex;
//             justify-content: space-between;
//             align-items: flex-start;
//             gap: 16px;
//           }
//           .title {
//             flex: 1;
//             text-align: center;
//           }
//           .title h1 {
//             font-size: 20px;
//             margin: 0;
//           }
//           .title p {
//             margin: 2px 0;
//             font-size: 11px;
//           }
//           .grade-box {
//             width: 170px;
//             border-collapse: collapse;
//             font-size: 10px;
//           }
//           .grade-box td, .grade-box th {
//             border: 1px solid #111827;
//             padding: 3px 4px;
//             text-align: center;
//           }
//           .banner {
//             margin: 14px auto 12px;
//             width: 320px;
//             border-radius: 12px;
//             background: #a16207;
//             color: white;
//             text-align: center;
//             padding: 8px 12px;
//             font-weight: 700;
//             font-size: 18px;
//           }
//           .meta {
//             width: 100%;
//             border-collapse: collapse;
//             margin-bottom: 10px;
//           }
//           .meta td {
//             font-size: 12px;
//             padding: 2px 4px;
//             vertical-align: top;
//           }
//           .meta .label {
//             width: 85px;
//           }
//           .meta .value {
//             font-weight: 700;
//           }
//           .result-table {
//             width: 100%;
//             border-collapse: collapse;
//             margin-top: 8px;
//           }
//           .result-table th, .result-table td {
//             border: 1px solid #111827;
//             padding: 5px 6px;
//             font-size: 10px;
//             text-align: center;
//             vertical-align: middle;
//           }
//           .result-table th {
//             background: #f8fafc;
//             font-weight: 700;
//           }
//           .subject {
//             text-align: left !important;
//             width: 28%;
//           }
//           .marks-col {
//             text-align: left !important;
//             width: 20%;
//           }
//           .uncountable td {
//             background: #fefce8;
//           }
//           .summary {
//             margin-top: 12px;
//             display: grid;
//             grid-template-columns: 1fr 1fr 1fr;
//             gap: 8px;
//           }
//           .summary-card {
//             border: 1px solid #111827;
//           }
//           .summary-card table {
//             width: 100%;
//             border-collapse: collapse;
//           }
//           .summary-card td, .summary-card th {
//             border: 1px solid #111827;
//             padding: 4px 5px;
//             font-size: 10px;
//           }
//           .summary-card th {
//             background: #f8fafc;
//             text-align: left;
//           }
//           .qr-box {
//             min-height: 120px;
//             display: flex;
//             align-items: center;
//             justify-content: center;
//             color: #64748b;
//             font-size: 10px;
//           }
//           .footer {
//             margin-top: 50px;
//             display: grid;
//             grid-template-columns: repeat(3, 1fr);
//             gap: 24px;
//           }
//           .sign {
//             text-align: center;
//             font-size: 11px;
//           }
//           .line {
//             border-top: 2px dashed #6b7280;
//             margin-bottom: 6px;
//             height: 18px;
//           }
//         </style>
//       </head>
//       <body>
//         <div class="sheet">
//           <div class="inner">
//             <div class="header">
//               <div class="title">
//                 <h1>${escapeHtml(transcript.instituteName)}</h1>
//                 <p>${escapeHtml(transcript.instituteAddress)}</p>
//                 <p>Contact: ${escapeHtml(transcript.instituteContact)} | Email: ${escapeHtml(transcript.instituteEmail)}</p>
//               </div>
//               <table class="grade-box">
//                 <thead>
//                   <tr>
//                     <th>Range</th>
//                     <th>Grade</th>
//                     <th>GP</th>
//                   </tr>
//                 </thead>
//                 <tbody>${gradeScaleHtml}</tbody>
//               </table>
//             </div>

//             <div class="banner">ACADEMIC TRANSCRIPT</div>

//             <table class="meta">
//               <tr>
//                 <td class="label">Name</td>
//                 <td class="value">: ${escapeHtml(transcript.studentName)}</td>
//                 <td class="label">Exam</td>
//                 <td class="value">: ${escapeHtml(transcript.examName)}</td>
//               </tr>
//               <tr>
//                 <td class="label">Father</td>
//                 <td class="value">: ${escapeHtml(transcript.fatherName)}</td>
//                 <td class="label">Year</td>
//                 <td class="value">: ${escapeHtml(transcript.yearLabel)}</td>
//               </tr>
//               <tr>
//                 <td class="label">Mother</td>
//                 <td class="value">: ${escapeHtml(transcript.motherName)}</td>
//                 <td class="label">Department</td>
//                 <td class="value">: ${escapeHtml(transcript.department)}</td>
//               </tr>
//               <tr>
//                 <td class="label">Student ID</td>
//                 <td class="value">: ${escapeHtml(transcript.studentId)}</td>
//                 <td class="label">Group</td>
//                 <td class="value">: ${escapeHtml(transcript.group)}</td>
//               </tr>
//               <tr>
//                 <td class="label">Roll</td>
//                 <td class="value">: ${escapeHtml(transcript.roll)}</td>
//                 <td class="label">Class-Shift-Section</td>
//                 <td class="value">: ${escapeHtml(transcript.classShiftSection)}</td>
//               </tr>
//             </table>

//             <table class="result-table">
//               <thead>
//                 <tr>
//                   <th>Name of Subject</th>
//                   <th>Full Marks</th>
//                   <th>Highest Marks</th>
//                   <th>Obtained Marks</th>
//                   <th>Final Marks</th>
//                   <th>Grade Point</th>
//                   <th>Letter Grade</th>
//                   <th>Status</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 ${rowsHtml}
//                 <tr>
//                   <td colspan="4" style="text-align:right;font-weight:700;">Total / GPA / Grade</td>
//                   <td style="font-weight:700;">${escapeHtml(transcript.totalMarks)}</td>
//                   <td style="font-weight:700;">${escapeHtml(transcript.gpa)}</td>
//                   <td style="font-weight:700;">${escapeHtml(transcript.letterGrade)}</td>
//                   <td style="font-weight:700;">${escapeHtml(transcript.resultStatus)}</td>
//                 </tr>
//               </tbody>
//             </table>

//             <div class="summary">
//               <div class="summary-card">
//                 <table>
//                   <tr><th colspan="2">Summary</th></tr>
//                   <tr><td>Result Status</td><td>${escapeHtml(transcript.resultStatus)}</td></tr>
//                   <tr><td>Total Marks</td><td>${escapeHtml(transcript.totalMarks)}</td></tr>
//                   <tr><td>GPA</td><td>${escapeHtml(transcript.gpa)}</td></tr>
//                   <tr><td>Letter Grade</td><td>${escapeHtml(transcript.letterGrade)}</td></tr>
//                   <tr><td>Merit</td><td>${escapeHtml(transcript.merit)}</td></tr>
//                 </table>
//               </div>
//               <div class="summary-card">
//                 <table>
//                   <tr><th>Remarks</th></tr>
//                   <tr><td>Failed Subjects: ${escapeHtml(transcript.failedSubjects)}</td></tr>
//                   <tr><td>Generated from student specific result endpoint.</td></tr>
//                   <tr><td>Uncountable subjects are highlighted softly.</td></tr>
//                 </table>
//               </div>
//               <div class="summary-card">
//                 <table>
//                   <tr><th>Digital Verification</th></tr>
//                   <tr><td><div class="qr-box">Scan from portal verification module</div></td></tr>
//                 </table>
//               </div>
//             </div>

//             <div class="footer">
//               <div class="sign">
//                 <div class="line"></div>
//                 Guardian
//               </div>
//               <div class="sign">
//                 <div class="line"></div>
//                 Class Teacher
//               </div>
//               <div class="sign">
//                 <div class="line"></div>
//                 Principal / Headmaster
//               </div>
//             </div>
//           </div>
//         </div>
//       </body>
//     </html>
//   `;
// };

// export default function SemesterExamScreen() {
//   const { width } = useWindowDimensions();
//   const themeMode = useAppSelector((state) => state.theme.mode);
//   const authUser = useAppSelector((state) => state.auth.user);
//   const isDark = themeMode === "dark";
//   const isDesktop = width >= 960;

//   const [selectedYearId, setSelectedYearId] = useState<number | null>(null);
//   const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
//   const [downloading, setDownloading] = useState(false);

//   const { data: instituteData } = useGetInstituteInfoQuery({});
//   const student = instituteData?.payload?.data?.user || {};

//   const {
//     data: examList = [],
//     isLoading: isExamListLoading,
//     isFetching: isExamListFetching,
//     error: examListError,
//     refetch: refetchExamList,
//   } = useGetStudentExamListQuery(undefined, {
//     refetchOnMountOrArgChange: true,
//   });

//   const [
//     fetchStudentResult,
//     {
//       data: studentResultResponse,
//       isLoading: isResultLoading,
//       error: resultError,
//       reset: resetResult,
//     },
//   ] = useGetStudentSpecificResultMutation();

//   const yearOptions = useMemo<SelectOption[]>(() => {
//     const source = examList
//       .filter((item) => item.academicYearId)
//       .map((item) => ({
//         label: item.academicYearName,
//         value: item.academicYearId as number,
//       }));

//     if (source.length) {
//       return Array.from(
//         new Map(source.map((item) => [item.value, item])).values(),
//       );
//     }

//     return (authUser?.academicYear || []).map((year) => ({
//       label: year.name,
//       value: year.id,
//     }));
//   }, [authUser?.academicYear, examList]);

//   const examOptions = useMemo<SelectOption[]>(() => {
//     return examList
//       .filter(
//         (item) =>
//           selectedYearId === null ||
//           item.academicYearId === null ||
//           item.academicYearId === selectedYearId,
//       )
//       .map((item) => ({
//         label: item.examName,
//         value: item.examId,
//       }));
//   }, [examList, selectedYearId]);

//   const selectedYearOption = yearOptions.find(
//     (option) => option.value === selectedYearId,
//   );
//   const selectedExamOption = examOptions.find(
//     (option) => option.value === selectedExamId,
//   );

//   useEffect(() => {
//     if (!selectedYearId || !selectedExamId) {
//       return;
//     }

//     fetchStudentResult({
//       academic_year_id: selectedYearId,
//       exam_id: selectedExamId,
//     })
//       .unwrap()
//       .catch((error: unknown) => {
//         const maybeError = error as {
//           data?: { message?: string };
//           message?: string;
//         };
//         const message =
//           maybeError?.data?.message ||
//           maybeError?.message ||
//           "Result load korte problem hocche.";
//         showToast("error", "Result load failed", message);
//       });
//   }, [fetchStudentResult, selectedExamId, selectedYearId]);

//   const resultPayload = useMemo(
//     () => getPayload(studentResultResponse),
//     [studentResultResponse],
//   );

//   const transcriptData = useMemo(
//     () =>
//       getTranscriptData(
//         resultPayload,
//         selectedYearOption?.label || "-",
//         selectedExamOption?.label || "-",
//       ),
//     [resultPayload, selectedExamOption?.label, selectedYearOption?.label],
//   );

//   const downloadPdfOnWeb = async (html: string) => {
//     if (typeof document === "undefined") {
//       throw new Error("Web print is not available.");
//     }

//     const iframe = document.createElement("iframe");
//     iframe.style.position = "fixed";
//     iframe.style.right = "0";
//     iframe.style.bottom = "0";
//     iframe.style.width = "0";
//     iframe.style.height = "0";
//     iframe.style.border = "0";
//     document.body.appendChild(iframe);

//     const cleanup = () => {
//       setTimeout(() => {
//         iframe.remove();
//       }, 1000);
//     };

//     const printFrame = () => {
//       const frameWindow = iframe.contentWindow;

//       if (!frameWindow) {
//         cleanup();
//         throw new Error("Could not open print frame");
//       }

//       frameWindow.focus();
//       frameWindow.print();
//       cleanup();
//       showToast("success", "Print dialog opened. Choose Save as PDF.");
//     };

//     const frameDocument =
//       iframe.contentDocument || iframe.contentWindow?.document;

//     if (!frameDocument) {
//       cleanup();
//       throw new Error("Could not create print document");
//     }

//     frameDocument.open();
//     frameDocument.write(html);
//     frameDocument.close();

//     if (iframe.contentWindow?.document.readyState === "complete") {
//       printFrame();
//       return;
//     }

//     iframe.onload = () => {
//       printFrame();
//     };
//   };

//   const downloadPdfOnAndroid = async (fileName: string, pdfBase64: string) => {
//     const downloadRootUri =
//       FileSystem.StorageAccessFramework.getUriForDirectoryInRoot("Download");
//     const permissions =
//       await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
//         downloadRootUri,
//       );

//     if (!permissions.granted) {
//       showToast("error", "Download folder permission was not granted.");
//       return;
//     }

//     const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
//       permissions.directoryUri,
//       fileName,
//       "application/pdf",
//     );

//     await FileSystem.StorageAccessFramework.writeAsStringAsync(
//       fileUri,
//       pdfBase64,
//       { encoding: FileSystem.EncodingType.Base64 },
//     );

//     showToast("success", "PDF saved to your selected Downloads folder.");
//   };

//   const handleDownload = useCallback(async () => {
//     if (!transcriptData) {
//       showToast("info", "Result ready na", "Age year ar exam select korun.");
//       return;
//     }

//     try {
//       setDownloading(true);
//       const html = getTranscriptHtml(transcriptData);
//       const safeStudent = transcriptData.studentName.replace(/[^a-zA-Z0-9-]/g, "_");
//       const fileName = `${RESULT_PDF_FILENAME_PREFIX}_${safeStudent}_${Date.now()}`;

//       if (Platform.OS === "web") {
//         await downloadPdfOnWeb(html);
//         return;
//       }

//       const result = await Print.printToFileAsync({
//         html,
//         base64: true,
//         width: 794,
//         height: 1123,
//       });

//       if (Platform.OS === "android" && result.base64) {
//         await downloadPdfOnAndroid(fileName, result.base64);
//         return;
//       }

//       const fileUri = `${FileSystem.documentDirectory}${fileName}.pdf`;
//       await FileSystem.copyAsync({ from: result.uri, to: fileUri });
//       showToast("success", "PDF saved inside app documents.");
//       Alert.alert("PDF Saved", `Saved to:\n${fileUri}`);
//     } catch (error: unknown) {
//       const message =
//         error instanceof Error ? error.message : "Unknown error occurred";
//       showToast("error", "PDF generate failed", message);
//     } finally {
//       setDownloading(false);
//     }
//   }, [transcriptData]);

//   const onRefresh = async () => {
//     resetResult();
//     await refetchExamList();
//   };

//   const handleYearChange = (value: string | number) => {
//     const nextYearId = Number(value);

//     if (nextYearId !== selectedYearId) {
//       setSelectedYearId(nextYearId);
//       setSelectedExamId(null);
//       resetResult();
//     }
//   };

//   const resultRows = transcriptData?.rows || [];
//   const hasResult = !!transcriptData;

//   return (
//     <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
//       <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{ paddingBottom: 28 }}
//         refreshControl={
//           <RefreshControl
//             refreshing={isExamListFetching}
//             onRefresh={onRefresh}
//             colors={["#0f766e"]}
//             tintColor="#0f766e"
//           />
//         }
//       >
//         <View className="px-4 pt-5">
//           <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-5 overflow-hidden">
//             <View className="absolute -top-10 right-0 h-28 w-28 rounded-full bg-emerald-100/70 dark:bg-emerald-500/10" />
//             <View className="absolute -bottom-12 left-0 h-32 w-32 rounded-full bg-cyan-100/70 dark:bg-cyan-500/10" />

//             <View
//               style={{
//                 flexDirection: isDesktop ? "row" : "column",
//                 justifyContent: "space-between",
//                 gap: 16,
//               }}
//             >
//               <View style={{ flex: 1 }}>
//                 <Text className="text-[11px] font-bold uppercase tracking-[2px] text-emerald-600 dark:text-emerald-400">
//                   Semester Exam
//                 </Text>
//                 <Text className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
//                   Mark Sheet Download
//                 </Text>
//                 <Text className="mt-2 text-sm text-slate-500 dark:text-slate-400">
//                   Year ar exam select korlei transcript load hobe, tarpor phone-e PDF save korte parben.
//                 </Text>
//               </View>

//               <View className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl px-4 py-3 border border-slate-200 dark:border-slate-700">
//                 <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">
//                   Student
//                 </Text>
//                 <Text className="mt-1 text-base font-bold text-slate-900 dark:text-white">
//                   {student?.student_name || "Loading..."}
//                 </Text>
//                 <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">
//                   SID: {student?.student_id || "-"}
//                 </Text>
//               </View>
//             </View>

//             <View
//               className="mt-6"
//               style={{
//                 flexDirection: isDesktop ? "row" : "column",
//                 gap: 14,
//                 alignItems: isDesktop ? "flex-end" : "stretch",
//               }}
//             >
//               <View style={{ flex: 1 }}>
//                 <CustomSelect
//                   label="Academic Year"
//                   placeholder="Select year"
//                   options={yearOptions}
//                   value={selectedYearId}
//                   onChange={handleYearChange}
//                   helperText={
//                     yearOptions.length
//                       ? "Year select korle related exam list filter hobe."
//                       : "Academic year list available nei."
//                   }
//                 />
//               </View>

//               <View style={{ flex: 1 }}>
//                 <CustomSelect
//                   label="Exam"
//                   placeholder="Select exam"
//                   options={examOptions}
//                   value={selectedExamId}
//                   onChange={(value) => setSelectedExamId(Number(value))}
//                   disabled={!selectedYearId || !examOptions.length}
//                   helperText={
//                     selectedYearId
//                       ? "Exam select korlei result auto load hobe."
//                       : "Age academic year select korun."
//                   }
//                 />
//               </View>

//               <TouchableOpacity
//                 activeOpacity={0.9}
//                 onPress={handleDownload}
//                 disabled={!hasResult || downloading}
//                 className={`h-[56px] rounded-2xl px-5 flex-row items-center justify-center ${
//                   hasResult ? "bg-emerald-500" : "bg-slate-200"
//                 }`}
//                 style={{ minWidth: isDesktop ? 220 : "100%" }}
//               >
//                 {downloading ? (
//                   <ActivityIndicator size="small" color="#ffffff" />
//                 ) : (
//                   <Feather
//                     name="download"
//                     size={18}
//                     color={hasResult ? "#ffffff" : "#94a3b8"}
//                   />
//                 )}
//                 <Text
//                   className={`ml-2 font-bold ${
//                     hasResult ? "text-white" : "text-slate-500"
//                   }`}
//                 >
//                   Download Transcript
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>

//           {isExamListLoading ? (
//             <View className="mt-5 bg-white dark:bg-slate-900 rounded-[24px] p-8 border border-slate-200 dark:border-slate-800 items-center">
//               <ActivityIndicator size="large" color="#0f766e" />
//               <Text className="mt-4 text-slate-600 dark:text-slate-400">
//                 Exam list load hocche...
//               </Text>
//             </View>
//           ) : examListError ? (
//             <View className="mt-5 bg-white dark:bg-slate-900 rounded-[24px] p-8 border border-rose-200 dark:border-rose-900/40 items-center">
//               <MaterialCommunityIcons
//                 name="alert-circle-outline"
//                 size={40}
//                 color="#ef4444"
//               />
//               <Text className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
//                 Exam list load hoyni
//               </Text>
//               <TouchableOpacity
//                 onPress={() => refetchExamList()}
//                 className="mt-5 rounded-2xl bg-slate-900 dark:bg-slate-100 px-5 py-3"
//               >
//                 <Text className="font-bold text-white dark:text-slate-900">
//                   Try Again
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           ) : isResultLoading ? (
//             <View className="mt-5 bg-white dark:bg-slate-900 rounded-[24px] p-8 border border-slate-200 dark:border-slate-800 items-center">
//               <ActivityIndicator size="large" color="#2563eb" />
//               <Text className="mt-4 text-slate-600 dark:text-slate-400">
//                 Result load hocche...
//               </Text>
//             </View>
//           ) : resultError ? (
//             <View className="mt-5 bg-white dark:bg-slate-900 rounded-[24px] p-8 border border-rose-200 dark:border-rose-900/40 items-center">
//               <Ionicons name="close-circle-outline" size={42} color="#ef4444" />
//               <Text className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
//                 Result load failed
//               </Text>
//               <Text className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
//                 Academic year ar exam abar select kore try korte paro.
//               </Text>
//             </View>
//           ) : hasResult ? (
//             <View className="mt-5">
//               <View className="bg-white dark:bg-slate-900 rounded-[24px] p-5 border border-slate-200 dark:border-slate-800">
//                 <View
//                   style={{
//                     flexDirection: isDesktop ? "row" : "column",
//                     justifyContent: "space-between",
//                     gap: 12,
//                   }}
//                 >
//                   <View>
//                     <Text className="text-xl font-black text-slate-900 dark:text-white">
//                       {transcriptData.examName}
//                     </Text>
//                     <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">
//                       {transcriptData.yearLabel}
//                     </Text>
//                   </View>

//                   <View className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 border border-emerald-100 dark:border-emerald-500/20">
//                     <Text className="text-xs font-semibold uppercase tracking-[2px] text-emerald-600 dark:text-emerald-400">
//                       Result Status
//                     </Text>
//                     <Text className="mt-1 text-lg font-black text-emerald-700 dark:text-emerald-300">
//                       {transcriptData.resultStatus}
//                     </Text>
//                   </View>
//                 </View>

//                 <View
//                   className="mt-5"
//                   style={{
//                     flexDirection: "row",
//                     flexWrap: "wrap",
//                     marginHorizontal: -6,
//                   }}
//                 >
//                   <SummaryCard label="Student Name" value={transcriptData.studentName} />
//                   <SummaryCard label="Student ID" value={transcriptData.studentId} />
//                   <SummaryCard label="Roll" value={transcriptData.roll} />
//                   <SummaryCard label="GPA" value={transcriptData.gpa} />
//                   <SummaryCard label="Letter Grade" value={transcriptData.letterGrade} />
//                   <SummaryCard label="Total Marks" value={transcriptData.totalMarks} />
//                 </View>
//               </View>

//               <View className="mt-5 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 overflow-hidden">
//                 <View className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
//                   <Text className="text-lg font-black text-slate-900 dark:text-white">
//                     Subject Wise Transcript
//                   </Text>
//                 </View>

//                 {resultRows.map((row, index) => (
//                   <View
//                     key={`${row.name}-${index}`}
//                     className={`px-5 py-4 ${
//                       index !== resultRows.length - 1
//                         ? "border-b border-slate-100 dark:border-slate-800"
//                         : ""
//                     } ${row.isUncountable ? "bg-amber-50/70 dark:bg-amber-500/5" : ""}`}
//                   >
//                     <Text className="text-base font-bold text-slate-900 dark:text-white">
//                       {row.name}
//                     </Text>
//                     <View className="mt-3 flex-row flex-wrap">
//                       <MiniStat label="Full Marks" value={toLabelValue(row.fullMarks)} />
//                       <MiniStat
//                         label="Highest Marks"
//                         value={toLabelValue(row.highestMarks)}
//                       />
//                       <MiniStat
//                         label="Obtained"
//                         value={toLabelValue(row.obtainedMarks)}
//                       />
//                       <MiniStat
//                         label="Final Marks"
//                         value={toLabelValue(row.finalMarks)}
//                       />
//                       <MiniStat
//                         label="Grade Point"
//                         value={toLabelValue(row.gradePoint)}
//                       />
//                       <MiniStat
//                         label="Letter Grade"
//                         value={toLabelValue(row.letterGrade)}
//                       />
//                     </View>
//                   </View>
//                 ))}
//               </View>
//             </View>
//           ) : (
//             <View className="mt-5 bg-white dark:bg-slate-900 rounded-[24px] p-8 border border-dashed border-slate-300 dark:border-slate-700 items-center">
//               <Ionicons
//                 name="document-text-outline"
//                 size={42}
//                 color={isDark ? "#64748b" : "#94a3b8"}
//               />
//               <Text className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
//                 Transcript ready to load
//               </Text>
//               <Text className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
//                 Year ar exam select korlei ekhane transcript details dekhabe.
//               </Text>
//             </View>
//           )}
//         </View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// function SummaryCard({ label, value }: { label: string; value: string }) {
//   return (
//     <View className="px-1.5 mb-3" style={{ width: "50%" }}>
//       <View className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-4 py-3">
//         <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-slate-500 dark:text-slate-400">
//           {label}
//         </Text>
//         <Text className="mt-2 text-base font-bold text-slate-900 dark:text-white">
//           {value}
//         </Text>
//       </View>
//     </View>
//   );
// }

// function MiniStat({ label, value }: { label: string; value: string }) {
//   return (
//     <View className="mr-3 mb-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 min-w-[110px]">
//       <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-slate-500 dark:text-slate-400">
//         {label}
//       </Text>
//       <Text className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
//         {value}
//       </Text>
//     </View>
//   );
// }
