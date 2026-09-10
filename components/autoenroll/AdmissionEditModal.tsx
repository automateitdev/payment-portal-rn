import ReusableButton from "@/components/shared/Button/ReusableButton";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import { SearchableMultiSelect } from "@/components/ui/SearchableMultiSelect";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import SelectDropdown, { Option } from "@/components/ui/SelectDropdown";
import {
  AdmissionData,
  AdmissionPreviewStudentData,
  SubjectSetAlternate,
  SubjectSetPackage,
  useGetSubjectSetMutation,
  useUpdateAdmissionApplicationMutation,
} from "@/redux/allApi/autoenroll/admissionDataApi";
import { FullMapAdmissionFeeConfigRow } from "@/redux/allApi/autoenroll/admissionFeeConfigApi";
import {
  DistrictData,
  DivisionData,
  UpazillaData,
  useGetDistrictsQuery,
  useGetDivisionsQuery,
  useGetUpazillasQuery,
} from "@/redux/allApi/autoenroll/geographyApi";

import { genders, religions } from "@/utils/StaticData";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import React, { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Platform, Pressable, Text, View } from "react-native";
import { showMessage } from "../shared/CustomToast/message";
import ReusableInput from "../shared/ReusableInput";
import ReusableNotice from "@/utils/ReusableNotice";
import ReusableModal from "../Modal/ReusableModal";

const BLOOD_GROUP_OPTIONS: Option[] = [
  "A+",
  "B+",
  "O+",
  "AB+",
  "A-",
  "B-",
  "O-",
  "AB-",
].map((v) => ({ label: v, value: v }));
const MARITAL_STATUS_OPTIONS: Option[] = [
  "Married",
  "Unmarried",
  "Divorced",
  "Widowed",
  "Single",
].map((v) => ({ label: v, value: v }));
const BOARD_OPTIONS: Option[] = [
  "Dhaka",
  "Barisal",
  "Chittagong",
  "Comilla",
  "Jessore",
  "Mymensingh",
  "Rajshahi",
  "Sylhet",
  "Dinajpur",
  "Bangladesh Madrasah Education Board",
  "Bangladesh Open University",
  "Bangladesh Technical Education Board",
  "Directorate of Primary Education",
].map((v) => ({ label: v, value: v }));
const VACCINE_STATUS_OPTIONS: Option[] = [
  "No",
  "Yes - 1st Dose",
  "Yes - 1st & 2nd Dose",
  "Yes - 1st, 2nd & Booster Dose",
].map((v) => ({ label: v, value: v }));
const VACCINE_NAME_OPTIONS: Option[] = [
  "Moderna / মডার্না",
  "Sinovac / সিনোভ্যাক",
  "BioNTech-Pfizer / বায়োনটেক-ফাইজার",
  "Oxford-AstraZeneca / অক্সফোর্ড-অ্যাস্ট্রাজেনেকা",
].map((v) => ({ label: v, value: v }));
const QUOTA_PRESET_OPTIONS = ["Freedom Fighter", "Disability"] as const;
const REQUIRED_LABEL = <Text style={{ color: "tomato" }}> * </Text>;

interface EduInfoRow {
  exam: "SSC" | "HSC";
  board: string;
  institute: string;
  group: string;
  roll: string;
  registration: string;
  gpa: string;
  passingYear: string;
}

interface FilePickAsset {
  uri: string;
  name: string;
  type: string;
  webFile?: File;
}
type FileFieldKey =
  | "student_pic"
  | "student_birth_nid_file"
  | "other_file"
  | "vaccine_certificate";

interface EditForm {
  student_name_bangla: string;
  student_name_english: string;
  student_mobile: string;
  nationality: string;
  date_of_birth: string | null;
  student_nid_or_birth_no: string;
  blood_group: string;
  marital_status: string;
  father_name_bangla: string;
  father_name_english: string;
  father_nid: string;
  father_mobile: string;
  mother_name_bangla: string;
  mother_name_english: string;
  mother_nid: string;
  mother_mobile: string;
  present_address: string;
  present_division: string;
  present_district: string;
  present_upozilla: string;
  present_post_office: string;
  present_post_code: string;
  permanent_address: string;
  permanent_division: string;
  permanent_district: string;
  permanent_upozilla: string;
  permanent_post_office: string;
  permanent_post_code: string;
  academic_year_id: string;
  department_id: string;
  class_id: string;
  group_id: string;
  shift_id: string;
  admission_subject_setup_id: string;
  gender: string;
  religion: string;
  quota: string;
  vaccine: string;
  vaccine_name: string;
}

// present_/permanent_ division/district/upozilla and edu_information come
// back from /student-form-preview as JSON-encoded strings — same shape the
// Apply Online form sends on create, so the same parsing rules apply here.
const parseJson = <T,>(value: string | null | undefined): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const normalizeEduInformation = (source: Partial<EduInfoRow>[]): EduInfoRow[] =>
  (["SSC", "HSC"] as const).map((exam) => {
    const existing = source.find((row) => row.exam === exam) ?? {};
    return {
      board: "",
      institute: "",
      group: "",
      roll: "",
      registration: "",
      gpa: "",
      passingYear: "",
      ...existing,
      exam,
    };
  });

const SectionToggle = ({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) => (
  <Pressable onPress={onToggle} className="flex-row items-center mb-3">
    <Ionicons
      name={checked ? "checkbox" : "square-outline"}
      size={20}
      color={checked ? "#1e3a8a" : "#94a3b8"}
    />
    <Text className="ml-2 font-bold text-[13px] text-slate-800">{label}</Text>
  </Pressable>
);

const FormRow = ({ children }: { children: React.ReactNode }) => (
  <View className="flex-row flex-wrap -mx-2">{children}</View>
);
const FormCol = ({
  width = "half",
  children,
}: {
  width?: "half" | "third" | "full";
  children: React.ReactNode;
}) => {
  const cls =
    width === "half"
      ? "w-full md:w-1/2"
      : width === "third"
        ? "w-full md:w-1/3"
        : "w-full";
  return <View className={`px-2 mb-4 ${cls}`}>{children}</View>;
};
const FieldLabel = ({
  text,
  required = false,
}: {
  text: string;
  required?: boolean;
}) => (
  <Text className="mb-1.5 text-[13px] font-medium text-[#334155]">
    {text} {required && REQUIRED_LABEL}
  </Text>
);

interface MultiSelectAdapterProps {
  options: Option[];
  value: Option[];
  onChange: (value: Option[]) => void;
  placeholder?: string;
}
const SubjectMultiSelectAdapter = ({
  options,
  value,
  onChange,
  placeholder,
}: MultiSelectAdapterProps) => {
  const { control, watch } = useForm<{ items: Option[] }>({
    defaultValues: { items: value },
  });
  const items = watch("items");
  useEffect(() => {
    if (items !== value) onChange(items ?? []);
  }, [items]);
  return (
    <SearchableMultiSelect
      name="items"
      control={control}
      options={options}
      placeholder={placeholder}
      containerClassName="mb-4"
    />
  );
};

const FilePickRow = ({
  label,
  fileName,
  onPick,
}: {
  label: string;
  fileName: string | null;
  onPick: () => void;
}) => (
  <View className="mb-4">
    <Text className="mb-1.5 text-[13px] font-medium text-[#334155]">
      {label}
    </Text>
    <Pressable
      onPress={onPick}
      className="flex-row items-center justify-between h-[46px] rounded-lg border-[1.5px] border-dashed border-[#CBD5E1] bg-slate-50 px-4"
    >
      <Text
        numberOfLines={1}
        className={`flex-1 text-[14px] ${fileName ? "text-slate-800 font-medium" : "text-slate-400"}`}
      >
        {fileName ?? "No file chosen"}
      </Text>
      <Ionicons name="cloud-upload-outline" size={18} color="#1e3a8a" />
    </Pressable>
  </View>
);

interface AdmissionEditModalProps {
  visible: boolean;
  onClose: () => void;
  studentData: AdmissionPreviewStudentData;
  admissionConfig?: AdmissionData;
  feeMap?: FullMapAdmissionFeeConfigRow[];
  onUpdated: () => void;
}

// Mirrors the Nuxt reference's "Edit Necessary Information" dialog: each
// section is independently toggled on, pre-filled from the already-fetched
// preview data (studentData) the first time it's opened, and only toggled
// sections are included in the update FormData. Supporting option lists
// (fee-config map, divisions, subject sets) come from the same endpoints
// ApplyOnlineTab already uses — nothing here is invented data.
const AdmissionEditModal = ({
  visible,
  onClose,
  studentData,
  admissionConfig,
  feeMap,
  onUpdated,
}: AdmissionEditModalProps) => {
  const { control, watch, setValue, reset } = useForm<EditForm>();
  const { data: divisions } = useGetDivisionsQuery(undefined, {
    skip: !visible,
  });
  const [getSubjectSet] = useGetSubjectSetMutation();
  const [updateAdmissionApplication, { isLoading: updating }] =
    useUpdateAdmissionApplicationMutation();

  const [studentEdit, setStudentEdit] = useState(false);
  const [parentEdit, setParentEdit] = useState(false);
  const [addressEdit, setAddressEdit] = useState(false);
  const [academicEdit, setAcademicEdit] = useState(false);
  const [educationEdit, setEducationEdit] = useState(false);
  const [covidEdit, setCovidEdit] = useState(false);
  const [quotaEdit, setQuotaEdit] = useState(false);
  const [attachmentEdit, setAttachmentEdit] = useState(false);
  const [consent, setConsent] = useState(false);

  const [addressSameAsPresent, setAddressSameAsPresent] = useState(false);
  const [groupSubjects, setGroupSubjects] = useState<Option[]>([]);
  const [choosableSubjects, setChoosableSubjects] = useState<Option[]>([]);
  const [subjectSet, setSubjectSet] = useState<SubjectSetPackage[]>([]);
  const [subjectAlternates, setSubjectAlternates] = useState<
    SubjectSetAlternate[]
  >([]);
  const [eduInfo, setEduInfo] = useState<EduInfoRow[]>(
    normalizeEduInformation([]),
  );
  const [otherQuota, setOtherQuota] = useState("");
  const [isOtherQuota, setIsOtherQuota] = useState(false);
  const [files, setFiles] = useState<
    Record<FileFieldKey, FilePickAsset | null>
  >({
    student_pic: null,
    student_birth_nid_file: null,
    other_file: null,
    vaccine_certificate: null,
  });

  const academicYearId = watch("academic_year_id");
  const departmentId = watch("department_id");
  const classId = watch("class_id");
  const groupId = watch("group_id");
  const shiftId = watch("shift_id");
  const admissionSubjectSetupId = watch("admission_subject_setup_id");
  const genderValue = watch("gender");
  const presentDivision = watch("present_division");
  const presentDistrict = watch("present_district");
  const permanentDivision = watch("permanent_division");
  const permanentDistrict = watch("permanent_district");
  const vaccineStatus = watch("vaccine");
  const quota = watch("quota");

  // Re-seed the whole modal straight from studentData (the preview API
  // response) every time it opens — mirrors the Nuxt reference filling
  // formData.* from previewData.student_data.
  useEffect(() => {
    if (!visible) return;
    const pDiv = parseJson<{ id: number }>(studentData.present_division);
    const pDist = parseJson<{ id: number }>(studentData.present_district);
    const pUpz = parseJson<{ id: number }>(studentData.present_upozilla);
    const permDiv = parseJson<{ id: number }>(studentData.permanent_division);
    const permDist = parseJson<{ id: number }>(studentData.permanent_district);
    const permUpz = parseJson<{ id: number }>(studentData.permanent_upozilla);

    reset({
      student_name_bangla: studentData.student_name_bangla ?? "",
      student_name_english: studentData.student_name_english ?? "",
      student_mobile: studentData.student_mobile ?? "",
      nationality: studentData.nationality ?? "",
      date_of_birth: studentData.date_of_birth ?? null,
      student_nid_or_birth_no: studentData.student_nid_or_birth_no ?? "",
      blood_group: studentData.blood_group ?? "",
      marital_status: studentData.marital_status ?? "",
      father_name_bangla: studentData.father_name_bangla ?? "",
      father_name_english: studentData.father_name_english ?? "",
      father_nid: studentData.father_nid ?? "",
      father_mobile: studentData.father_mobile ?? "",
      mother_name_bangla: studentData.mother_name_bangla ?? "",
      mother_name_english: studentData.mother_name_english ?? "",
      mother_nid: studentData.mother_nid ?? "",
      mother_mobile: studentData.mother_mobile ?? "",
      present_address: studentData.present_address ?? "",
      present_division: pDiv ? String(pDiv.id) : "",
      present_district: pDist ? String(pDist.id) : "",
      present_upozilla: pUpz ? String(pUpz.id) : "",
      present_post_office: studentData.present_post_office ?? "",
      present_post_code: studentData.present_post_code ?? "",
      permanent_address: studentData.permanent_address ?? "",
      permanent_division: permDiv ? String(permDiv.id) : "",
      permanent_district: permDist ? String(permDist.id) : "",
      permanent_upozilla: permUpz ? String(permUpz.id) : "",
      permanent_post_office: studentData.permanent_post_office ?? "",
      permanent_post_code: studentData.permanent_post_code ?? "",
      academic_year_id: String(studentData.academic_year_id ?? ""),
      department_id: String(studentData.department_id ?? ""),
      class_id: String(studentData.class_id ?? ""),
      group_id: String(studentData.group_id ?? ""),
      shift_id: String(studentData.shift_id ?? ""),
      admission_subject_setup_id: studentData.admission_subject_setup_id
        ? String(studentData.admission_subject_setup_id)
        : "",
      gender: studentData.gender ?? "",
      religion: studentData.religion ?? "",
      quota: studentData.quota ?? "",
      vaccine: studentData.vaccine ?? "",
      vaccine_name: studentData.vaccine_name ?? "",
    });

    setStudentEdit(false);
    setParentEdit(false);
    setAddressEdit(false);
    setAcademicEdit(false);
    setEducationEdit(false);
    setCovidEdit(false);
    setQuotaEdit(false);
    setAttachmentEdit(false);
    setConsent(false);
    setAddressSameAsPresent(false);

    setGroupSubjects(
      (studentData.preferred_subjects?.group_base ?? []).map((s) => ({
        label: `${s.subject_code} : ${s.subject_name}`,
        value: String(s.institute_subject_id),
      })),
    );
    setChoosableSubjects(
      (studentData.preferred_subjects?.choosable ?? []).map((s) => ({
        label: `${s.subject_code} : ${s.subject_name}`,
        value: String(s.institute_subject_id),
      })),
    );
    setEduInfo(
      normalizeEduInformation(
        parseJson<Partial<EduInfoRow>[]>(studentData.edu_information) ?? [],
      ),
    );
    const q = studentData.quota ?? "";
    const isPreset = q === "Freedom Fighter" || q === "Disability";
    setIsOtherQuota(!!q && !isPreset);
    setOtherQuota(!isPreset ? q : "");
    setFiles({
      student_pic: null,
      student_birth_nid_file: null,
      other_file: null,
      vaccine_certificate: null,
    });
  }, [visible, studentData]);

  const academicYearOptions: Option[] = useMemo(() => {
    const seen = new Map<string, string>();
    (feeMap ?? []).forEach((r) =>
      seen.set(
        String(r.academic_year_id),
        r.academic_year?.coresubcategories?.core_subcategory_name ??
          String(r.academic_year_id),
      ),
    );
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [feeMap]);
  const departmentOptions: Option[] = useMemo(() => {
    if (!academicYearId) return [];
    const seen = new Map<string, string>();
    (feeMap ?? [])
      .filter((r) => String(r.academic_year_id) === academicYearId)
      .forEach((r) =>
        seen.set(
          String(r.department_id),
          r.department?.name ?? String(r.department_id),
        ),
      );
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [feeMap, academicYearId]);
  const classOptions: Option[] = useMemo(() => {
    if (!academicYearId || !departmentId) return [];
    const seen = new Map<string, string>();
    (feeMap ?? [])
      .filter(
        (r) =>
          String(r.academic_year_id) === academicYearId &&
          String(r.department_id) === departmentId,
      )
      .forEach((r) =>
        seen.set(
          String(r.class_id),
          r.class?.core_subcategory_name ?? String(r.class_id),
        ),
      );
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [feeMap, academicYearId, departmentId]);
  const groupOptions: Option[] = useMemo(() => {
    if (!academicYearId || !departmentId || !classId) return [];
    const seen = new Map<string, string>();
    (feeMap ?? [])
      .filter(
        (r) =>
          String(r.academic_year_id) === academicYearId &&
          String(r.department_id) === departmentId &&
          String(r.class_id) === classId,
      )
      .forEach((r) =>
        seen.set(
          String(r.group_id),
          r.group?.core_subcategory_name ?? String(r.group_id),
        ),
      );
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [feeMap, academicYearId, departmentId, classId]);
  const shiftOptions: Option[] = useMemo(() => {
    if (!academicYearId || !departmentId || !classId || !groupId) return [];
    const seen = new Map<string, string>();
    (feeMap ?? [])
      .filter(
        (r) =>
          String(r.academic_year_id) === academicYearId &&
          String(r.department_id) === departmentId &&
          String(r.class_id) === classId &&
          String(r.group_id) === groupId,
      )
      .forEach((r) =>
        seen.set(
          String(r.shift_id),
          r.shift?.core_subcategory_name ?? String(r.shift_id),
        ),
      );
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [feeMap, academicYearId, departmentId, classId, groupId]);
  const divisionOptions: Option[] = useMemo(
    () =>
      (divisions ?? []).map((d: DivisionData) => ({
        label: `${d.name} ( ${d.bn_name} )`,
        value: String(d.id),
      })),
    [divisions],
  );

  const matchingFeeRows = useMemo(() => {
    if (
      !feeMap?.length ||
      !academicYearId ||
      !departmentId ||
      !classId ||
      !groupId ||
      !shiftId
    )
      return [];
    return feeMap.filter(
      (r) =>
        String(r.academic_year_id) === academicYearId &&
        String(r.department_id) === departmentId &&
        String(r.class_id) === classId &&
        String(r.group_id) === groupId &&
        String(r.shift_id) === shiftId,
    );
  }, [feeMap, academicYearId, departmentId, classId, groupId, shiftId]);
  const genderOptions: Option[] = useMemo(() => {
    if (!matchingFeeRows.length) return genders;
    const unique = Array.from(
      new Set(matchingFeeRows.map((r) => r.gender).filter(Boolean)),
    );
    return unique.length
      ? unique.map((g) => ({ label: g, value: g }))
      : genders;
  }, [matchingFeeRows]);
  const religionOptions: Option[] = useMemo(() => {
    if (!matchingFeeRows.length) return religions;
    const unique = Array.from(
      new Set(matchingFeeRows.map((r) => r.religion).filter(Boolean)),
    );
    return unique.length
      ? unique.map((r) => ({ label: r, value: r }))
      : religions;
  }, [matchingFeeRows]);

  // Subject set fetch — only while the Academic section is open, mirrors
  // ApplyOnlineTab's cascading POST /subject-set on year/department/class/group.
  useEffect(() => {
    if (!academicEdit || admissionConfig?.subject !== "YES") return;
    const instituteId = studentData.institute_detail?.institute_id;
    if (
      !instituteId ||
      !academicYearId ||
      !departmentId ||
      !classId ||
      !groupId
    ) {
      setSubjectSet([]);
      setSubjectAlternates([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await getSubjectSet({
          institute_id: instituteId,
          academic_year_id: academicYearId,
          department_id: departmentId,
          class_id: classId,
          group_id: groupId,
        }).unwrap();
        if (cancelled) return;
        setSubjectSet(result.admissionSubjectSet);
        setSubjectAlternates(result.alternates);
      } catch {
        if (!cancelled) {
          setSubjectSet([]);
          setSubjectAlternates([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    academicEdit,
    admissionConfig?.subject,
    studentData.institute_detail?.institute_id,
    academicYearId,
    departmentId,
    classId,
    groupId,
  ]);

  const selectedSubjectPackage = useMemo(
    () => subjectSet.find((p) => String(p.id) === admissionSubjectSetupId),
    [subjectSet, admissionSubjectSetupId],
  );
  const groupBaseSubjectList = useMemo(
    () =>
      selectedSubjectPackage?.subjects?.find((s) => s.type === "group_based")
        ?.subjects ?? [],
    [selectedSubjectPackage],
  );
  const choosableSubjectList = useMemo(
    () =>
      selectedSubjectPackage?.subjects?.find((s) => s.type === "choosable")
        ?.subjects ?? [],
    [selectedSubjectPackage],
  );
  const groupBaseLimit = selectedSubjectPackage?.group_base_limit ?? null;
  const choosableLimit = selectedSubjectPackage?.choosable_limit ?? null;
  const alternateBlockedIds = useMemo(() => {
    const selected = new Set(
      [...groupSubjects, ...choosableSubjects].map((o) => o.value),
    );
    const blocked = new Set<string>();
    subjectAlternates.forEach((altSet) => {
      const setIds = altSet.alternates.map((a) =>
        String(a.institute_subject_id),
      );
      if (setIds.some((sid) => selected.has(sid)))
        setIds
          .filter((sid) => !selected.has(sid))
          .forEach((sid) => blocked.add(sid));
    });
    return blocked;
  }, [subjectAlternates, groupSubjects, choosableSubjects]);
  const groupBaseSubjectOptions: Option[] = useMemo(
    () =>
      groupBaseSubjectList.map((s) => ({
        label: `${s.subject_code} : ${s.subject_name}`,
        value: String(s.institute_subject_id),
      })),
    [groupBaseSubjectList],
  );
  const choosableSubjectOptions: Option[] = useMemo(
    () =>
      choosableSubjectList.map((s) => ({
        label: `${s.subject_code} : ${s.subject_name}`,
        value: String(s.institute_subject_id),
      })),
    [choosableSubjectList],
  );
  const availableGroupBaseOptions: Option[] = useMemo(
    () =>
      groupBaseSubjectOptions.filter((o) => {
        if (groupSubjects.some((g) => g.value === o.value)) return true;
        if (
          alternateBlockedIds.has(o.value) ||
          choosableSubjects.some((c) => c.value === o.value)
        )
          return false;
        if (groupBaseLimit != null && groupSubjects.length >= groupBaseLimit)
          return false;
        return true;
      }),
    [
      groupBaseSubjectOptions,
      groupSubjects,
      choosableSubjects,
      alternateBlockedIds,
      groupBaseLimit,
    ],
  );
  const availableChoosableOptions: Option[] = useMemo(
    () =>
      choosableSubjectOptions.filter((o) => {
        if (choosableSubjects.some((c) => c.value === o.value)) return true;
        if (
          alternateBlockedIds.has(o.value) ||
          groupSubjects.some((g) => g.value === o.value)
        )
          return false;
        if (
          choosableLimit != null &&
          choosableSubjects.length >= choosableLimit
        )
          return false;
        return true;
      }),
    [
      choosableSubjectOptions,
      choosableSubjects,
      groupSubjects,
      alternateBlockedIds,
      choosableLimit,
    ],
  );

  const { data: presentDistricts } = useGetDistrictsQuery(presentDivision, {
    skip: !presentDivision || !addressEdit,
  });
  const { data: permanentDistricts } = useGetDistrictsQuery(permanentDivision, {
    skip: !permanentDivision || !addressEdit,
  });
  const { data: presentUpazillas } = useGetUpazillasQuery(presentDistrict, {
    skip: !presentDistrict || !addressEdit,
  });
  const { data: permanentUpazillas } = useGetUpazillasQuery(permanentDistrict, {
    skip: !permanentDistrict || !addressEdit,
  });
  const presentDistrictOptions: Option[] = useMemo(
    () =>
      (presentDistricts ?? []).map((d: DistrictData) => ({
        label: `${d.name} ( ${d.bn_name} )`,
        value: String(d.id),
      })),
    [presentDistricts],
  );
  const permanentDistrictOptions: Option[] = useMemo(
    () =>
      (permanentDistricts ?? []).map((d: DistrictData) => ({
        label: `${d.name} ( ${d.bn_name} )`,
        value: String(d.id),
      })),
    [permanentDistricts],
  );
  const presentUpazillaOptions: Option[] = useMemo(
    () =>
      (presentUpazillas ?? []).map((u: UpazillaData) => ({
        label: `${u.name} ( ${u.bn_name} )`,
        value: String(u.id),
      })),
    [presentUpazillas],
  );
  const permanentUpazillaOptions: Option[] = useMemo(
    () =>
      (permanentUpazillas ?? []).map((u: UpazillaData) => ({
        label: `${u.name} ( ${u.bn_name} )`,
        value: String(u.id),
      })),
    [permanentUpazillas],
  );

  const handleSameAsPresent = (checked: boolean) => {
    setAddressSameAsPresent(checked);
    if (checked) {
      setValue("permanent_address", watch("present_address"));
      setValue("permanent_division", watch("present_division"));
      setValue("permanent_district", watch("present_district"));
      setValue("permanent_upozilla", watch("present_upozilla"));
      setValue("permanent_post_office", watch("present_post_office"));
      setValue("permanent_post_code", watch("present_post_code"));
    }
  };

  const updateEduInfo = (
    index: number,
    field: keyof EduInfoRow,
    value: string,
  ) => {
    setEduInfo((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  const pickFile = async (key: FileFieldKey, label: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setFiles((prev) => ({
        ...prev,
        [key]: {
          uri: asset.uri,
          name: asset.name ?? `${key}.jpg`,
          type: asset.mimeType ?? "application/octet-stream",
          webFile: asset.file,
        },
      }));
    } catch {
      showMessage("error", "Failed", `Could not select ${label}.`);
    }
  };

  const anySectionEdited =
    studentEdit ||
    parentEdit ||
    addressEdit ||
    academicEdit ||
    educationEdit ||
    covidEdit ||
    quotaEdit ||
    attachmentEdit;

  const isEduInformationFilled = () =>
    eduInfo.every((row) =>
      Object.values(row).every(
        (v) => v !== "" && v !== null && v !== undefined,
      ),
    );

  const appendPreferredSubjects = (
    formData: FormData,
    group: "compulsory" | "group_base" | "choosable",
    subjects: {
      institute_subject_id: number;
      subject_code: string;
      subject_name: string;
    }[],
  ) => {
    subjects.forEach((s, i) => {
      formData.append(
        `preferred_subjects[${group}][${i}][institute_subject_id]`,
        String(s.institute_subject_id),
      );
      formData.append(
        `preferred_subjects[${group}][${i}][subject_code]`,
        s.subject_code,
      );
      formData.append(
        `preferred_subjects[${group}][${i}][subject_name]`,
        s.subject_name,
      );
    });
  };

  const handleUpdate = async () => {
    if (!consent) {
      showMessage(
        "error",
        "Consent required",
        "Please accept the declaration before updating.",
      );
      return;
    }
    if (academicEdit && admissionConfig?.subject === "YES") {
      if (
        groupBaseSubjectList.length &&
        groupBaseLimit != null &&
        groupSubjects.length !== groupBaseLimit
      ) {
        showMessage(
          "error",
          "Missing fields",
          `Please select exactly ${groupBaseLimit} group based subject(s).`,
        );
        return;
      }
      if (
        choosableSubjectList.length &&
        choosableLimit != null &&
        choosableSubjects.length !== choosableLimit
      ) {
        showMessage(
          "error",
          "Missing fields",
          `Please select exactly ${choosableLimit} choosable subject(s).`,
        );
        return;
      }
    }
    if (educationEdit && !isEduInformationFilled()) {
      showMessage(
        "error",
        "Missing fields",
        "SSC and HSC education information must be fully filled.",
      );
      return;
    }

    const values = watch();
    const formData = new FormData();
    formData.append("unique_number", studentData.unique_number);

    if (studentEdit) {
      (
        [
          "student_name_bangla",
          "student_name_english",
          "student_mobile",
          "nationality",
          "date_of_birth",
          "student_nid_or_birth_no",
          "blood_group",
          "marital_status",
        ] as (keyof EditForm)[]
      ).forEach((f) => formData.append(f, values[f] ?? ""));
    }
    if (parentEdit) {
      (
        [
          "father_name_bangla",
          "father_name_english",
          "father_nid",
          "father_mobile",
          "mother_name_bangla",
          "mother_name_english",
          "mother_nid",
          "mother_mobile",
        ] as (keyof EditForm)[]
      ).forEach((f) => formData.append(f, values[f] ?? ""));
    }
    if (addressEdit) {
      const selectedDivision = (divId: string) =>
        (divisions ?? []).find((d: any) => String(d.id) === divId) ?? null;
      const selectedDistrict = (
        list: DistrictData[] | undefined,
        distId: string,
      ) => (list ?? []).find((d) => String(d.id) === distId) ?? null;
      const selectedUpazilla = (
        list: UpazillaData[] | undefined,
        upzId: string,
      ) => (list ?? []).find((u) => String(u.id) === upzId) ?? null;
      formData.append("present_address", values.present_address ?? "");
      formData.append(
        "present_division",
        JSON.stringify(selectedDivision(values.present_division)),
      );
      formData.append(
        "present_district",
        JSON.stringify(
          selectedDistrict(presentDistricts, values.present_district),
        ),
      );
      formData.append(
        "present_upozilla",
        JSON.stringify(
          selectedUpazilla(presentUpazillas, values.present_upozilla),
        ),
      );
      formData.append("present_post_office", values.present_post_office ?? "");
      formData.append("present_post_code", values.present_post_code ?? "");
      formData.append("permanent_address", values.permanent_address ?? "");
      formData.append(
        "permanent_division",
        JSON.stringify(selectedDivision(values.permanent_division)),
      );
      formData.append(
        "permanent_district",
        JSON.stringify(
          selectedDistrict(permanentDistricts, values.permanent_district),
        ),
      );
      formData.append(
        "permanent_upozilla",
        JSON.stringify(
          selectedUpazilla(permanentUpazillas, values.permanent_upozilla),
        ),
      );
      formData.append(
        "permanent_post_office",
        values.permanent_post_office ?? "",
      );
      formData.append("permanent_post_code", values.permanent_post_code ?? "");
    }
    if (academicEdit) {
      formData.append(
        "institute_id",
        String(studentData.institute_detail?.institute_id ?? ""),
      );
      formData.append("academic_year_id", values.academic_year_id);
      formData.append("department_id", values.department_id);
      formData.append("class_id", values.class_id);
      formData.append("group_id", values.group_id);
      formData.append("shift_id", values.shift_id);
      formData.append(
        "admission_subject_setup_id",
        values.admission_subject_setup_id,
      );
      formData.append("gender", values.gender ?? "");
      formData.append("religion", values.religion ?? "");
      formData.append(
        "groupSubjects",
        JSON.stringify(groupSubjects.map((o) => Number(o.value))),
      );
      formData.append(
        "optionalSubjects",
        JSON.stringify(choosableSubjects.map((o) => Number(o.value))),
      );
      const compulsorySubjectList =
        selectedSubjectPackage?.subjects?.find((s) => s.type === "compulsory")
          ?.subjects ?? [];
      appendPreferredSubjects(formData, "compulsory", compulsorySubjectList);
      appendPreferredSubjects(
        formData,
        "group_base",
        groupBaseSubjectList.filter((s) =>
          groupSubjects.some((g) => g.value === String(s.institute_subject_id)),
        ),
      );
      appendPreferredSubjects(
        formData,
        "choosable",
        choosableSubjectList.filter((s) =>
          choosableSubjects.some(
            (c) => c.value === String(s.institute_subject_id),
          ),
        ),
      );
    }
    if (educationEdit) {
      formData.append(
        "edu_information",
        JSON.stringify(
          eduInfo.map((row) => ({
            exam: row.exam,
            board: row.board,
            institute: row.institute,
            group: row.group,
            roll: Number(row.roll),
            registration: Number(row.registration),
            gpa: row.gpa,
            passingYear: row.passingYear,
          })),
        ),
      );
    }
    if (covidEdit) {
      formData.append("vaccine", values.vaccine ?? "");
      formData.append("vaccine_name", values.vaccine_name ?? "");
      if (files.vaccine_certificate) {
        if (Platform.OS === "web" && files.vaccine_certificate.webFile)
          formData.append(
            "vaccine_certificate",
            files.vaccine_certificate.webFile,
            files.vaccine_certificate.name,
          );
        else
          formData.append("vaccine_certificate", {
            uri: files.vaccine_certificate.uri,
            name: files.vaccine_certificate.name,
            type: files.vaccine_certificate.type,
          } as any);
      }
    }
    if (quotaEdit) {
      formData.append("quota", values.quota ?? "");
    }
    if (attachmentEdit) {
      (
        [
          "student_pic",
          "student_birth_nid_file",
          "other_file",
        ] as FileFieldKey[]
      ).forEach((key) => {
        const file = files[key];
        if (!file) return;
        if (Platform.OS === "web" && file.webFile)
          formData.append(key, file.webFile, file.name);
        else
          formData.append(key, {
            uri: file.uri,
            name: file.name,
            type: file.type,
          } as any);
      });
    }

    try {
      const result = await updateAdmissionApplication({
        uniqueNumber: studentData.unique_number,
        formData,
      }).unwrap();
      if (result.status !== "success") {
        showMessage(
          "error",
          "Update failed",
          result.message || "Could not update the application.",
        );
        return;
      }
      showMessage(
        "success",
        "Updated",
        result.message || "Application updated successfully.",
      );
      onUpdated();
      onClose();
    } catch (err) {
      const data = (
        err as {
          data?: {
            errors?: { validation_error?: { message: string }[] };
            message?: string;
          };
        }
      )?.data;
      const validationErrors = data?.errors?.validation_error;
      const message =
        Array.isArray(validationErrors) && validationErrors.length
          ? validationErrors.map((e) => e.message).join("\n")
          : data?.message || "Could not update the application.";
      showMessage("error", "Update failed", message);
    }
  };

  return (
    <ReusableModal
      visible={visible}
      onClose={onClose}
      title="Edit Necessary Information"
      size="xl"
      maxHeight="85%"
      footerSlot={
        <ReusableButton
          title={updating ? "Updating..." : "Update"}
          variant="primary"
          isLoading={updating}
          disabled={!anySectionEdited}
          onPress={handleUpdate}
          leftIcon={<Ionicons name="sync-outline" size={16} color="#ffffff" />}
        />
      }
    >
      {/* ================= STUDENT INFORMATION ================= */}
      <SectionToggle
        label="Student Information"
        checked={studentEdit}
        onToggle={() => setStudentEdit((v) => !v)}
      />
      {studentEdit && (
        <FormRow>
          <FormCol>
            <FieldLabel text="Student Name (Bangla)" required />
            <Controller
              name="student_name_bangla"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Student Name (Bangla)"
                />
              )}
            />
          </FormCol>
          <FormCol>
            <FieldLabel text="Student Name (English)" required />
            <Controller
              name="student_name_english"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Student Name (English)"
                />
              )}
            />
          </FormCol>
          <FormCol>
            <FieldLabel text="Student Mobile No." required />
            <Controller
              name="student_mobile"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Student Contact"
                  inputType="number"
                />
              )}
            />
          </FormCol>
          <FormCol>
            <FieldLabel text="Nationality" required />
            <Controller
              name="nationality"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Nationality"
                />
              )}
            />
          </FormCol>
          <FormCol>
            <FieldLabel text="Date of Birth" required />
            <Controller
              name="date_of_birth"
              control={control}
              render={({ field }) => (
                <CustomDatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Date of Birth"
                />
              )}
            />
          </FormCol>
          <FormCol>
            <FieldLabel text="NID/Birth Registration" required />
            <Controller
              name="student_nid_or_birth_no"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="NID or Birth certificate no."
                />
              )}
            />
          </FormCol>
          <FormCol>
            <SelectDropdown
              name="blood_group"
              control={control}
              options={BLOOD_GROUP_OPTIONS}
              label="Blood Group"
              placeholder="Select Blood Group"
            />
          </FormCol>
          <FormCol>
            <SelectDropdown
              name="marital_status"
              control={control}
              options={MARITAL_STATUS_OPTIONS}
              label="Marital Status"
              placeholder="Select Marital Status"
            />
          </FormCol>
        </FormRow>
      )}

      {/* ================= PARENT INFORMATION ================= */}
      <SectionToggle
        label="Parent Information"
        checked={parentEdit}
        onToggle={() => setParentEdit((v) => !v)}
      />
      {parentEdit && (
        <FormRow>
          <FormCol>
            <FieldLabel text="Father's Name (Bangla)" />
            <Controller
              name="father_name_bangla"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Father Name (Bangla)"
                />
              )}
            />
          </FormCol>
          <FormCol>
            <FieldLabel text="Father's Name (English)" required />
            <Controller
              name="father_name_english"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Father Name (English)"
                />
              )}
            />
          </FormCol>
          <FormCol>
            <FieldLabel text="Father's National ID/Passport No." />
            <Controller
              name="father_nid"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Father NID or Passport No."
                />
              )}
            />
          </FormCol>
          <FormCol>
            <FieldLabel text="Father's Mobile No." />
            <Controller
              name="father_mobile"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Father's Contact"
                  inputType="number"
                />
              )}
            />
          </FormCol>
          <FormCol>
            <FieldLabel text="Mother's Name (Bangla)" />
            <Controller
              name="mother_name_bangla"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Mother Name (Bangla)"
                />
              )}
            />
          </FormCol>
          <FormCol>
            <FieldLabel text="Mother's Name (English)" required />
            <Controller
              name="mother_name_english"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Mother Name (English)"
                />
              )}
            />
          </FormCol>
          <FormCol>
            <FieldLabel text="Mother's National ID/Passport No." />
            <Controller
              name="mother_nid"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Mother NID or Passport No."
                />
              )}
            />
          </FormCol>
          <FormCol>
            <FieldLabel text="Mother's Mobile No." />
            <Controller
              name="mother_mobile"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Mother's Contact"
                  inputType="number"
                />
              )}
            />
          </FormCol>
        </FormRow>
      )}

      {/* ================= ADDRESS INFORMATION ================= */}
      <SectionToggle
        label="Address Information"
        checked={addressEdit}
        onToggle={() => setAddressEdit((v) => !v)}
      />
      {addressEdit && (
        <FormRow>
          <FormCol width="half">
            <Text className="text-primary font-bold mb-2">
              Mailing/Present Address {REQUIRED_LABEL}
            </Text>
            <Controller
              name="present_address"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Address / Village"
                  multiline
                  numberOfLines={4}
                  height={90}
                  disabled={addressSameAsPresent}
                />
              )}
            />
            <SearchableSelect
              name="present_division"
              control={control}
              options={divisionOptions}
              label="Division"
              placeholder="Select Division"
              disabled={addressSameAsPresent}
            />
            <SearchableSelect
              name="present_district"
              control={control}
              options={presentDistrictOptions}
              label="District"
              placeholder="Select District"
              disabled={addressSameAsPresent || !presentDivision}
            />
            <SearchableSelect
              name="present_upozilla"
              control={control}
              options={presentUpazillaOptions}
              label="P.S./Upazila"
              placeholder="Select Upazilla"
              disabled={addressSameAsPresent || !presentDistrict}
            />
            <FieldLabel text="Post Office" required />
            <Controller
              name="present_post_office"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Post Office"
                  disabled={addressSameAsPresent}
                />
              )}
            />
            <FieldLabel text="Postal Code" />
            <Controller
              name="present_post_code"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Postal Code"
                  inputType="number"
                  disabled={addressSameAsPresent}
                />
              )}
            />
          </FormCol>
          <FormCol width="half">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-primary font-bold">
                Permanent Address {REQUIRED_LABEL}
              </Text>
              <Pressable
                onPress={() => handleSameAsPresent(!addressSameAsPresent)}
                className="flex-row items-center"
              >
                <Ionicons
                  name={addressSameAsPresent ? "checkbox" : "square-outline"}
                  size={18}
                  color={addressSameAsPresent ? "#1e3a8a" : "#94a3b8"}
                />
                <Text className="ml-1.5 text-[13px] text-slate-600">
                  Same as present address
                </Text>
              </Pressable>
            </View>
            <Controller
              name="permanent_address"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Address / Village"
                  multiline
                  numberOfLines={4}
                  height={90}
                  disabled={addressSameAsPresent}
                />
              )}
            />
            <SearchableSelect
              name="permanent_division"
              control={control}
              options={divisionOptions}
              label="Division"
              placeholder="Select Division"
              disabled={addressSameAsPresent}
            />
            <SearchableSelect
              name="permanent_district"
              control={control}
              options={permanentDistrictOptions}
              label="District"
              placeholder="Select District"
              disabled={addressSameAsPresent || !permanentDivision}
            />
            <SearchableSelect
              name="permanent_upozilla"
              control={control}
              options={permanentUpazillaOptions}
              label="P.S./Upazila"
              placeholder="Select Upazilla"
              disabled={addressSameAsPresent || !permanentDistrict}
            />
            <FieldLabel text="Post Office" required />
            <Controller
              name="permanent_post_office"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Post Office"
                  disabled={addressSameAsPresent}
                />
              )}
            />
            <FieldLabel text="Postal Code" />
            <Controller
              name="permanent_post_code"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Postal Code"
                  inputType="number"
                  disabled={addressSameAsPresent}
                />
              )}
            />
          </FormCol>
        </FormRow>
      )}

      {/* ================= ACADEMIC INFORMATION ================= */}
      <SectionToggle
        label="Academic Information"
        checked={academicEdit}
        onToggle={() => setAcademicEdit((v) => !v)}
      />
      {academicEdit && (
        <View>
          <FormRow>
            <FormCol width="third">
              <SearchableSelect
                name="academic_year_id"
                control={control}
                options={academicYearOptions}
                label="Session"
                placeholder="Select Academic Year"
              />
            </FormCol>
            <FormCol width="third">
              <SearchableSelect
                name="department_id"
                control={control}
                options={departmentOptions}
                label="Department"
                placeholder="Select Department"
                disabled={!academicYearId}
              />
            </FormCol>
            <FormCol width="third">
              <SearchableSelect
                name="class_id"
                control={control}
                options={classOptions}
                label="Class"
                placeholder="Select Class"
                disabled={!departmentId}
              />
            </FormCol>
            <FormCol width="third">
              <SearchableSelect
                name="group_id"
                control={control}
                options={groupOptions}
                label="Faculty"
                placeholder="Select Faculty"
                disabled={!classId}
              />
            </FormCol>
            <FormCol width="third">
              <SelectDropdown
                name="shift_id"
                control={control}
                options={shiftOptions}
                label="Hall"
                placeholder="Select Hall"
                disabled={!groupId}
              />
            </FormCol>
            <FormCol width="third">
              <SelectDropdown
                name="gender"
                control={control}
                options={genderOptions}
                label="Gender"
                placeholder="Select Gender"
                disabled={!shiftId}
              />
            </FormCol>
            <FormCol width="third">
              <SelectDropdown
                name="religion"
                control={control}
                options={religionOptions}
                label="Religion"
                placeholder="Select Religion"
                disabled={!genderValue}
              />
            </FormCol>
          </FormRow>

          {admissionConfig?.subject === "YES" && selectedSubjectPackage && (
            <View className="mt-2">
              {groupBaseSubjectList.length > 0 && (
                <>
                  <Text className="mb-1.5 text-[13px] font-medium text-[#334155]">
                    Group Based Subjects
                    {groupBaseLimit != null && (
                      <Text style={{ color: "tomato" }}>
                        {" "}
                        (Select exactly {groupBaseLimit}) *
                      </Text>
                    )}
                  </Text>
                  <SubjectMultiSelectAdapter
                    options={availableGroupBaseOptions}
                    value={groupSubjects}
                    onChange={setGroupSubjects}
                    placeholder="Select Group Based Subjects"
                  />
                </>
              )}
              {choosableSubjectList.length > 0 && (
                <>
                  <Text className="mb-1.5 text-[13px] font-medium text-[#334155]">
                    Choosable Subjects
                    {choosableLimit != null && (
                      <Text style={{ color: "tomato" }}>
                        {" "}
                        (Select exactly {choosableLimit}) *
                      </Text>
                    )}
                  </Text>
                  <SubjectMultiSelectAdapter
                    options={availableChoosableOptions}
                    value={choosableSubjects}
                    onChange={setChoosableSubjects}
                    placeholder="Select Choosable Subjects"
                  />
                </>
              )}
            </View>
          )}
        </View>
      )}

      {/* ================= EDUCATION QUALIFICATIONS ================= */}
      {admissionConfig?.academic_info === "YES" && (
        <>
          <SectionToggle
            label="Education Qualifications"
            checked={educationEdit}
            onToggle={() => setEducationEdit((v) => !v)}
          />
          {educationEdit &&
            eduInfo.map((row, index) => (
              <View
                key={row.exam}
                className={
                  index > 0 ? "mt-4 pt-4 border-t border-slate-200" : ""
                }
              >
                <Text className="font-bold text-primary mb-2">
                  {row.exam} {REQUIRED_LABEL}
                </Text>
                <FormRow>
                  <FormCol width="third">
                    <SelectDropdown
                      label="Board"
                      options={BOARD_OPTIONS}
                      value={row.board}
                      onChange={(v) => updateEduInfo(index, "board", v)}
                      placeholder="Select Board"
                    />
                  </FormCol>
                  <FormCol width="third">
                    <FieldLabel text="Institute" />
                    <ReusableInput
                      value={row.institute}
                      onChangeText={(v) => updateEduInfo(index, "institute", v)}
                      placeholder="Institute Name"
                    />
                  </FormCol>
                  <FormCol width="third">
                    <FieldLabel text="Group" />
                    <ReusableInput
                      value={row.group}
                      onChangeText={(v) => updateEduInfo(index, "group", v)}
                      placeholder="Group"
                    />
                  </FormCol>
                  <FormCol width="third">
                    <FieldLabel text="Roll" />
                    <ReusableInput
                      value={row.roll}
                      onChangeText={(v) => updateEduInfo(index, "roll", v)}
                      placeholder="Roll No."
                      inputType="number"
                    />
                  </FormCol>
                  <FormCol width="third">
                    <FieldLabel text="Registration" />
                    <ReusableInput
                      value={row.registration}
                      onChangeText={(v) =>
                        updateEduInfo(index, "registration", v)
                      }
                      placeholder="Registration No."
                      inputType="number"
                    />
                  </FormCol>
                  <FormCol width="third">
                    <FieldLabel text="GPA" />
                    <ReusableInput
                      value={row.gpa}
                      onChangeText={(v) => updateEduInfo(index, "gpa", v)}
                      placeholder="GPA"
                    />
                  </FormCol>
                  <FormCol width="third">
                    <FieldLabel text="Passing Year" />
                    <ReusableInput
                      value={row.passingYear}
                      onChangeText={(v) =>
                        updateEduInfo(index, "passingYear", v)
                      }
                      placeholder="Passing Year"
                      inputType="number"
                    />
                  </FormCol>
                </FormRow>
              </View>
            ))}
        </>
      )}

      {/* ================= COVID-19 VACCINE INFORMATION ================= */}
      {admissionConfig?.covid_vaccine === "YES" && (
        <>
          <SectionToggle
            label="Covid-19 Vaccine Information"
            checked={covidEdit}
            onToggle={() => setCovidEdit((v) => !v)}
          />
          {covidEdit && (
            <FormRow>
              <FormCol width="third">
                <SelectDropdown
                  name="vaccine"
                  control={control}
                  options={VACCINE_STATUS_OPTIONS}
                  label="Vaccinated?"
                  placeholder="Select Status"
                />
              </FormCol>
              <FormCol width="third">
                <SelectDropdown
                  name="vaccine_name"
                  control={control}
                  options={VACCINE_NAME_OPTIONS}
                  label="Vaccine Name"
                  placeholder="Select Status"
                  disabled={vaccineStatus === "No" || !vaccineStatus}
                />
              </FormCol>
              <FormCol width="third">
                <FilePickRow
                  label="Vaccine Certificate"
                  fileName={files.vaccine_certificate?.name ?? null}
                  onPick={() =>
                    pickFile("vaccine_certificate", "Vaccine certificate")
                  }
                />
              </FormCol>
            </FormRow>
          )}
        </>
      )}

      {/* ================= QUOTA INFORMATION ================= */}
      {admissionConfig?.quota === "YES" && (
        <>
          <SectionToggle
            label="Quota Information"
            checked={quotaEdit}
            onToggle={() => setQuotaEdit((v) => !v)}
          />
          {quotaEdit && (
            <View className="flex-row flex-wrap items-center gap-4 mb-4">
              {QUOTA_PRESET_OPTIONS.map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => {
                    setValue("quota", preset);
                    setOtherQuota("");
                    setIsOtherQuota(false);
                  }}
                  className="flex-row items-center"
                >
                  <Ionicons
                    name={
                      quota === preset ? "radio-button-on" : "radio-button-off"
                    }
                    size={20}
                    color={quota === preset ? "#1e3a8a" : "#94a3b8"}
                  />
                  <Text className="ml-2 text-sm text-slate-700">{preset}</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => {
                  const nowOther = !isOtherQuota;
                  setIsOtherQuota(nowOther);
                  setValue("quota", nowOther ? otherQuota : "");
                }}
                className="flex-row items-center"
              >
                <Ionicons
                  name={isOtherQuota ? "checkbox" : "square-outline"}
                  size={20}
                  color={isOtherQuota ? "#1e3a8a" : "#94a3b8"}
                />
                <Text className="ml-2 text-sm text-slate-700">Other</Text>
              </Pressable>
              {isOtherQuota && (
                <ReusableInput
                  value={otherQuota}
                  onChangeText={(v) => {
                    setOtherQuota(v);
                    setValue("quota", v);
                  }}
                  placeholder="Name the quota"
                  containerClass="flex-1 mb-0"
                />
              )}
            </View>
          )}
        </>
      )}

      {/* ================= ATTACHMENT INFORMATION ================= */}
      <SectionToggle
        label="Attachment Information"
        checked={attachmentEdit}
        onToggle={() => setAttachmentEdit((v) => !v)}
      />
      {attachmentEdit && (
        <FormRow>
          <FormCol width="third">
            <FieldLabel text="Student Photo" required />
            <FilePickRow
              label="Student Photo"
              fileName={files.student_pic?.name ?? null}
              onPick={() => pickFile("student_pic", "Student photo")}
            />
          </FormCol>
          <FormCol width="third">
            <FieldLabel text="Birth Certificate/NID" />
            <FilePickRow
              label="Birth Certificate/NID"
              fileName={files.student_birth_nid_file?.name ?? null}
              onPick={() =>
                pickFile("student_birth_nid_file", "Birth certificate / NID")
              }
            />
          </FormCol>
          <FormCol width="third">
            <FieldLabel text="Other Document" />
            <FilePickRow
              label="Other Document"
              fileName={files.other_file?.name ?? null}
              onPick={() => pickFile("other_file", "Other document")}
            />
          </FormCol>
        </FormRow>
      )}

      {/* ================= DECLARATION + CONSENT ================= */}
      {anySectionEdited && (
        <View className="mt-2">
          <ReusableNotice
            message={`I, ${studentData.student_name_english}, hereby declare that the above-mentioned information and photo are correct. If any information provided by me is found to be false, ${studentData.institute_detail?.institute_name}${studentData.institute_detail?.institute_address ? `, ${studentData.institute_detail.institute_address}` : ""} reserves the right to cancel my admission. I shall be obliged to obey the rules and regulations of the institute and to pay all the required fees.`}
            icon="warning-outline"
            containerClassName="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3"
            textClassName="text-amber-800"
          />
          <Pressable
            onPress={() => setConsent((v) => !v)}
            className="flex-row items-start"
          >
            <Ionicons
              name={consent ? "checkbox" : "square-outline"}
              size={20}
              color={consent ? "#1e3a8a" : "#94a3b8"}
              style={{ marginRight: 8, marginTop: 1 }}
            />
            <Text className="flex-1 text-[13px] text-slate-600">
              I have read and accepted the consent
            </Text>
          </Pressable>
        </View>
      )}
    </ReusableModal>
  );
};

export default AdmissionEditModal;
