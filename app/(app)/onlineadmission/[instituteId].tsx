import ReusableButton from "@/components/shared/Button/ReusableButton";

import { SearchableMultiSelect } from "@/components/ui/SearchableMultiSelect";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import SelectDropdown, { Option } from "@/components/ui/SelectDropdown";
import {
  FullMapAdmissionFeeConfigRow,
  useFetchFullMapAdmissionFeeConfigQuery,
} from "@/redux/allApi/autoenroll/admissionFeeConfigApi";
import {
  AdmissionData,
  SubjectSetAlternate,
  SubjectSetPackage,
  SubjectSetSubject,
  useGetAdmissionDataQuery,
  useGetAdmissionInstructionQuery,
  useGetSubjectSetMutation,
  useLazyGetAdmissionPreviewQuery,
  useSubmitAdmissionApplicationMutation,
} from "@/redux/allApi/autoenroll/admissionDataApi";
import {
  DistrictData,
  DivisionData,
  UpazillaData,
  useGetDistrictsQuery,
  useGetDivisionsQuery,
  useGetUpazillasQuery,
} from "@/redux/allApi/autoenroll/geographyApi";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { WebView } from "react-native-webview";
import { genders, religions } from "@/utils/StaticData";
import { showMessage } from "@/components/shared/CustomToast/message";
import ReusableNotice from "@/utils/ReusableNotice";
import ReusableInput from "@/components/shared/ReusableInput";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import ReusableModal from "@/components/Modal/ReusableModal";
import ReusableTab from "@/components/Tab/ReusableTab";
// import { DivisionData } from "@/redux/allApi/autoenroll/geographyApi";

const TABS = [
  { key: "apply_online", label: "Apply Online" },
  { key: "preview_payment", label: "Preview & Payment" },
  { key: "how_to_apply", label: "How to Apply & Pay" },
];

// TODO: replace the remaining mock option lists (districts/upazillas and
// subject sets) once those APIs are available. Academic year, department,
// class, group, shift and division options are now derived from the real
// /admission-data and /divisions-data responses inside ApplyOnlineTab.

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

// Matches the Nuxt reference's quota RadioButtons exactly: Freedom Fighter,
// Disability, or a free-text "Other" quota (not a dropdown).
const QUOTA_PRESET_OPTIONS = ["Freedom Fighter", "Disability"] as const;

interface EduInfoRow {
  /** Exam name — driven by the institute's configured `academic_info_exams`. */
  exam: string;
  board: string;
  institute: string;
  group: string;
  roll: string;
  registration: string;
  gpa: string;
  passingYear: string;
}

const isEduRowBlank = (row: EduInfoRow) =>
  Object.values(row).every((v) => v === "" || v == null);
const isEduRowComplete = (row: EduInfoRow) =>
  Object.values(row).every((v) => v !== "" && v != null);

// A picked file, ready to append to FormData as a multipart file part.
// `webFile` is only present on web (expo-document-picker returns a real
// File there) — appending {uri,name,type} on web produces a JSON-ish blob
// the server doesn't recognize as a file, so web must append `webFile`
// directly while native appends the {uri,name,type} object.
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

interface AdmissionApplicationForm {
  academic_year_id: string;
  department_id: string;
  class_id: string;
  group_id: string;
  shift_id: string;
  admission_subject_setup_id: string;
  gender: string;
  religion: string;
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
  father_occupation: string;
  father_income: string;
  mother_name_bangla: string;
  mother_name_english: string;
  mother_nid: string;
  mother_mobile: string;
  mother_occupation: string;
  mother_income: string;
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
  guardian_name: string;
  guardian_relation: string;
  guardian_mobile: string;
  guardian_occupation: string;
  guardian_yearly_income: string;
  guardian_property: string;
  quota: string;
  vaccine: string;
  vaccine_name: string;
}

// Matches the Nuxt reference's `requiredFields` array — checked before the
// consent/confirmation dialog opens. student_pic is checked separately
// (see checkFields) since it lives in file state, not the RHF form.
const REQUIRED_FIELDS: (keyof AdmissionApplicationForm)[] = [
  "academic_year_id",
  "department_id",
  "class_id",
  "group_id",
  "shift_id",
  "gender",
  "religion",
  "student_name_bangla",
  "student_name_english",
  "student_mobile",
  "nationality",
  "date_of_birth",
  "student_nid_or_birth_no",
  "father_name_bangla",
  "father_name_english",
  "present_address",
  "present_division",
  "present_district",
  "present_upozilla",
  "present_post_office",
  "permanent_address",
  "permanent_division",
  "permanent_district",
  "permanent_upozilla",
  "permanent_post_office",
];

const DEFAULT_VALUES: AdmissionApplicationForm = {
  academic_year_id: "",
  department_id: "",
  class_id: "",
  group_id: "",
  shift_id: "",
  admission_subject_setup_id: "",
  gender: "",
  religion: "",
  student_name_bangla: "",
  student_name_english: "",
  student_mobile: "",
  nationality: "Bangladeshi",
  date_of_birth: null,
  student_nid_or_birth_no: "",
  blood_group: "",
  marital_status: "",
  father_name_bangla: "",
  father_name_english: "",
  father_nid: "",
  father_mobile: "",
  father_occupation: "",
  father_income: "",
  mother_name_bangla: "",
  mother_name_english: "",
  mother_nid: "",
  mother_mobile: "",
  mother_occupation: "",
  mother_income: "",
  present_address: "",
  present_division: "",
  present_district: "",
  present_upozilla: "",
  present_post_office: "",
  present_post_code: "",
  permanent_address: "",
  permanent_division: "",
  permanent_district: "",
  permanent_upozilla: "",
  permanent_post_office: "",
  permanent_post_code: "",
  guardian_name: "",
  guardian_relation: "",
  guardian_mobile: "",
  guardian_occupation: "",
  guardian_yearly_income: "",
  guardian_property: "",
  quota: "",
  vaccine: "No",
  vaccine_name: "",
};

const REQUIRED_LABEL = <Text style={{ color: "tomato" }}> * </Text>;

// Small reusable "pick a file" row — wired to expo-document-picker (see
// pickFile below). Image cropping for the student photo can be layered on
// later; for now it accepts whatever file/image the user picks.
interface FilePickRowProps {
  label: string;
  fileName: string | null;
  onPick: () => void;
}
const FilePickRow = ({ label, fileName, onPick }: FilePickRowProps) => (
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

interface ApplyOnlineTabProps {
  id: string;
  admissionData?: AdmissionData;
  divisions?: DivisionData[];
  feeMap?: FullMapAdmissionFeeConfigRow[];
}

// Pulls the real validation message(s) out of the API's error shape:
// { errors: { validation_error: [{ field, message }] }, message, status_code }.
const extractSubmitErrorMessage = (err: unknown): string => {
  const data = (
    err as {
      data?: {
        errors?: {
          validation_error?: { field: string | null; message: string }[];
        };
        message?: string;
      };
    }
  )?.data;
  const validationErrors = data?.errors?.validation_error;
  if (Array.isArray(validationErrors) && validationErrors.length) {
    return validationErrors.map((e) => e.message).join("\n");
  }
  if (data?.message) return data.message;
  return "Could not submit the application. Please try again.";
};

const ApplyOnlineTab = ({
  id,
  admissionData,
  divisions,
  feeMap,
}: ApplyOnlineTabProps) => {
  const router = useRouter();
  const {
    control,
    watch,
    setValue,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<AdmissionApplicationForm>({
    defaultValues: DEFAULT_VALUES,
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

  const [addressSameAsPresent, setAddressSameAsPresent] = useState(false);
  const [groupSubjects, setGroupSubjects] = useState<Option[]>([]);
  const [choosableSubjects, setChoosableSubjects] = useState<Option[]>([]);
  const [subjectSet, setSubjectSet] = useState<SubjectSetPackage[]>([]);
  const [subjectAlternates, setSubjectAlternates] = useState<
    SubjectSetAlternate[]
  >([]);
  const [getSubjectSet] = useGetSubjectSetMutation();
  const [otherQuota, setOtherQuota] = useState("");
  const [isOtherQuota, setIsOtherQuota] = useState(false);
  // Educational Qualifications — a dynamic list of rows (min 1). The "Exam"
  // dropdown options come straight from the institute's configured
  // `academic_info_exams`; nothing hardcoded, "Add More" appends a blank row.
  const blankEduRow = (): EduInfoRow => ({
    exam: "",
    board: "",
    institute: "",
    group: "",
    roll: "",
    registration: "",
    gpa: "",
    passingYear: "",
  });

  const examOptions: Option[] = useMemo(() => {
    const list = admissionData?.academic_info_exams ?? [];
    return (Array.isArray(list) ? list : []).map((e: any) => ({
      label: String(e),
      value: String(e),
    }));
  }, [admissionData?.academic_info_exams]);

  const [eduInfo, setEduInfo] = useState<EduInfoRow[]>([blankEduRow()]);

  const addEduRow = () => setEduInfo((prev) => [...prev, blankEduRow()]);
  const removeEduRow = (index: number) =>
    setEduInfo((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
    );
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [files, setFiles] = useState<
    Record<FileFieldKey, FilePickAsset | null>
  >({
    student_pic: null,
    student_birth_nid_file: null,
    other_file: null,
    vaccine_certificate: null,
  });
  const [submitAdmissionApplication] = useSubmitAdmissionApplicationMutation();

  const instituteName = admissionData?.instiute_details?.institute_name ?? "";
  const instituteAddress =
    admissionData?.instiute_details?.institute_address ?? "";

  // Matches the Nuxt reference's useAdmissionFeeFilters(admissionFeeConfigMap, formData):
  // Academic Year / Department / Class / Faculty(group) / Hall(shift) are ALL
  // derived from the fee-config fullMap, cascading step by step — NOT from
  // admission-data's institute_essentials.instituteClassMaps (that list isn't
  // used by the Nuxt form at all; only fee-configured combinations are
  // selectable here).
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
      (divisions ?? []).map((d) => ({
        label: `${d.name} ( ${d.bn_name} )`,
        value: String(d.id),
      })),
    [divisions],
  );

  // Gender/Religion available for the current class/group/shift combo, from
  // the full admission fee-config map — falls back to the full static list
  // until enough of the cascade is selected to narrow it down.
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

  // Matches the Nuxt reference: once institute/academic_year/department/class/
  // group are all selected, POST /subject-set and auto-pick the first
  // returned package as admission_subject_setup_id.
  useEffect(() => {
    if (admissionData?.subject !== "YES") return;
    if (!id || !academicYearId || !departmentId || !classId || !groupId) {
      setSubjectSet([]);
      setSubjectAlternates([]);
      setValue("admission_subject_setup_id", "");
      return;
    }
    let cancelled = false;
    setValue("admission_subject_setup_id", "");
    (async () => {
      try {
        const result = await getSubjectSet({
          institute_id: id,
          academic_year_id: academicYearId,
          department_id: departmentId,
          class_id: classId,
          group_id: groupId,
        }).unwrap();
        if (cancelled) return;
        setSubjectSet(result.admissionSubjectSet);
        setSubjectAlternates(result.alternates);
        setGroupSubjects([]);
        setChoosableSubjects([]);
        if (result.admissionSubjectSet.length > 0) {
          setValue(
            "admission_subject_setup_id",
            String(result.admissionSubjectSet[0].id),
          );
        }
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
    admissionData?.subject,
    id,
    academicYearId,
    departmentId,
    classId,
    groupId,
  ]);

  const selectedSubjectPackage = useMemo(
    () => subjectSet.find((p) => String(p.id) === admissionSubjectSetupId),
    [subjectSet, admissionSubjectSetupId],
  );

  const compulsorySubjectList = useMemo(
    () =>
      selectedSubjectPackage?.subjects?.find((s) => s.type === "compulsory")
        ?.subjects ?? [],
    [selectedSubjectPackage],
  );
  const uncountableSubjectList = useMemo(
    () =>
      selectedSubjectPackage?.subjects?.find((s) => s.type === "uncountable")
        ?.subjects ?? [],
    [selectedSubjectPackage],
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

  // Picking a subject in one list can block its "alternates" from being
  // picked in the other, until it's deselected again.
  const alternateBlockedIds = useMemo(() => {
    const selected = new Set(
      [...groupSubjects, ...choosableSubjects].map((o) => o.value),
    );
    const blocked = new Set<string>();
    subjectAlternates.forEach((altSet) => {
      const setIds = altSet.alternates.map((a) =>
        String(a.institute_subject_id),
      );
      if (setIds.some((sid) => selected.has(sid))) {
        setIds
          .filter((sid) => !selected.has(sid))
          .forEach((sid) => blocked.add(sid));
      }
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
    skip: !presentDivision,
  });
  const { data: permanentDistricts } = useGetDistrictsQuery(permanentDivision, {
    skip: !permanentDivision,
  });
  const { data: presentUpazillas } = useGetUpazillasQuery(presentDistrict, {
    skip: !presentDistrict,
  });
  const { data: permanentUpazillas } = useGetUpazillasQuery(permanentDistrict, {
    skip: !permanentDistrict,
  });

  const presentDistrictOptions: Option[] = useMemo(
    () =>
      (presentDistricts ?? []).map((d) => ({
        label: `${d.name} ( ${d.bn_name} )`,
        value: String(d.id),
      })),
    [presentDistricts],
  );
  const permanentDistrictOptions: Option[] = useMemo(
    () =>
      (permanentDistricts ?? []).map((d) => ({
        label: `${d.name} ( ${d.bn_name} )`,
        value: String(d.id),
      })),
    [permanentDistricts],
  );
  const presentUpazillaOptions: Option[] = useMemo(
    () =>
      (presentUpazillas ?? []).map((u) => ({
        label: `${u.name} ( ${u.bn_name} )`,
        value: String(u.id),
      })),
    [presentUpazillas],
  );
  const permanentUpazillaOptions: Option[] = useMemo(
    () =>
      (permanentUpazillas ?? []).map((u) => ({
        label: `${u.name} ( ${u.bn_name} )`,
        value: String(u.id),
      })),
    [permanentUpazillas],
  );

  // Reset the dependent cascading fields whenever their parent selection
  // changes, so a stale department/class/group/shift/gender/religion from a
  // previous selection can't linger in the form (mirrors — and actually
  // fixes — the Nuxt reference's intent here, whose equivalent watch()
  // targets unused formData fields and never fires).
  useEffect(() => {
    setValue("department_id", "");
    setValue("class_id", "");
    setValue("group_id", "");
    setValue("shift_id", "");
    setValue("gender", "");
    setValue("religion", "");
  }, [academicYearId]);

  useEffect(() => {
    setValue("class_id", "");
    setValue("group_id", "");
    setValue("shift_id", "");
    setValue("gender", "");
    setValue("religion", "");
  }, [departmentId]);

  useEffect(() => {
    setValue("group_id", "");
    setValue("shift_id", "");
    setValue("gender", "");
    setValue("religion", "");
  }, [classId]);

  useEffect(() => {
    setValue("shift_id", "");
    setValue("gender", "");
    setValue("religion", "");
  }, [groupId]);

  useEffect(() => {
    setValue("gender", "");
    setValue("religion", "");
  }, [shiftId]);

  useEffect(() => {
    setValue("religion", "");
  }, [genderValue]);

  useEffect(() => {
    setValue("present_district", "");
    setValue("present_upozilla", "");
  }, [presentDivision]);

  useEffect(() => {
    setValue("present_upozilla", "");
  }, [presentDistrict]);

  // Skipped while addressSameAsPresent is syncing values from the present
  // address — otherwise this would immediately wipe the district/upazilla
  // that handleSameAsPresent just copied over.
  useEffect(() => {
    if (addressSameAsPresent) return;
    setValue("permanent_district", "");
    setValue("permanent_upozilla", "");
  }, [permanentDivision]);

  useEffect(() => {
    if (addressSameAsPresent) return;
    setValue("permanent_upozilla", "");
  }, [permanentDistrict]);

  // Clear a required-field error as soon as that field gets a value.
  const allValues = watch();
  useEffect(() => {
    (Object.keys(errors) as (keyof AdmissionApplicationForm)[]).forEach((k) => {
      if (allValues[k]) clearErrors(k);
    });
  }, [allValues]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Red-ring wrapper for fields whose control can't show its own error. */
  const RequiredWrap = ({
    invalid,
    children,
  }: {
    invalid: boolean;
    children: React.ReactNode;
  }) => (
    <View className={invalid ? "rounded-xl border border-red-400 p-1" : ""}>
      {children}
      {invalid ? (
        <Text className="mt-0.5 text-[11px] text-red-500">
          This field is required
        </Text>
      ) : null}
    </View>
  );

  const updateEduInfo = (
    index: number,
    field: keyof EduInfoRow,
    value: string,
  ) => {
    setEduInfo((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

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

  // Appends preferred_subjects[<group>][<i>][institute_subject_id|subject_code|subject_name]
  // for a list of subjects — matches the API's expected multipart array notation.
  const appendPreferredSubjects = (
    formData: FormData,
    group: "compulsory" | "group_base" | "choosable",
    subjects: SubjectSetSubject[],
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

  const onSubmit = async (data: AdmissionApplicationForm) => {
    if (!consent) {
      showMessage(
        "error",
        "Consent required",
        "Please accept the declaration before submitting.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();

      formData.append("institute_id", String(id));

      const scalarFields: (keyof AdmissionApplicationForm)[] = [
        "student_name_bangla",
        "student_name_english",
        "student_mobile",
        "father_name_bangla",
        "father_name_english",
        "father_nid",
        "father_mobile",
        "father_occupation",
        "father_income",
        "mother_name_bangla",
        "mother_name_english",
        "mother_nid",
        "mother_mobile",
        "mother_occupation",
        "mother_income",
        "guardian_name",
        "guardian_relation",
        "guardian_mobile",
        "guardian_occupation",
        "guardian_yearly_income",
        "guardian_property",
        "nationality",
        "date_of_birth",
        "student_nid_or_birth_no",
        "gender",
        "religion",
        "blood_group",
        "marital_status",
        "present_post_office",
        "present_post_code",
        "present_address",
        "permanent_post_office",
        "permanent_post_code",
        "permanent_address",
        "quota",
        "vaccine",
        "vaccine_name",
      ];
      scalarFields.forEach((field) =>
        formData.append(field, data[field] ?? ""),
      );

      const selectedDivision = (divId: string) =>
        (divisions ?? []).find((d) => String(d.id) === divId) ?? null;
      const selectedDistrict = (
        list: DistrictData[] | undefined,
        distId: string,
      ) => (list ?? []).find((d) => String(d.id) === distId) ?? null;
      const selectedUpazilla = (
        list: UpazillaData[] | undefined,
        upzId: string,
      ) => (list ?? []).find((u) => String(u.id) === upzId) ?? null;

      formData.append(
        "present_division",
        JSON.stringify(selectedDivision(data.present_division)),
      );
      formData.append(
        "present_district",
        JSON.stringify(
          selectedDistrict(presentDistricts, data.present_district),
        ),
      );
      formData.append(
        "present_upozilla",
        JSON.stringify(
          selectedUpazilla(presentUpazillas, data.present_upozilla),
        ),
      );
      formData.append(
        "permanent_division",
        JSON.stringify(selectedDivision(data.permanent_division)),
      );
      formData.append(
        "permanent_district",
        JSON.stringify(
          selectedDistrict(permanentDistricts, data.permanent_district),
        ),
      );
      formData.append(
        "permanent_upozilla",
        JSON.stringify(
          selectedUpazilla(permanentUpazillas, data.permanent_upozilla),
        ),
      );

      formData.append("compulsorySubjects", JSON.stringify([]));
      formData.append(
        "groupSubjects",
        JSON.stringify(groupSubjects.map((o) => Number(o.value))),
      );
      formData.append(
        "optionalSubjects",
        JSON.stringify(choosableSubjects.map((o) => Number(o.value))),
      );

      formData.append(
        "edu_information",
        JSON.stringify(
          eduInfo
            .filter((row) =>
              Object.values(row).some((v) => v !== "" && v != null),
            )
            .map((row) => ({
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

      (Object.keys(files) as FileFieldKey[]).forEach((key) => {
        const file = files[key];
        if (!file) return;
        if (Platform.OS === "web" && file.webFile) {
          formData.append(key, file.webFile, file.name);
        } else {
          formData.append(key, {
            uri: file.uri,
            name: file.name,
            type: file.type,
          } as any);
        }
      });

      formData.append("academic_year_id", academicYearId);
      formData.append("department_id", departmentId);
      formData.append("class_id", classId);
      formData.append("group_id", groupId);
      formData.append("admission_subject_setup_id", admissionSubjectSetupId);
      formData.append("shift_id", shiftId);

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

      const result = await submitAdmissionApplication(formData).unwrap();
      if (result.status !== "success") {
        setConfirmationVisible(false);
        showMessage(
          "error",
          "Submission failed",
          result.message || "Could not submit the application.",
        );
        return;
      }
      setConfirmationVisible(false);
      showMessage(
        "success",
        "Application Submitted",
        result.message || "Application submitted successfully.",
      );
      if (result.unique_number) {
        router.push({
          pathname: "/onlineadmission/preview/[key]",
          params: { key: result.unique_number },
        });
      }
    } catch (err) {
      setConfirmationVisible(false);
      showMessage("error", "Submission failed", extractSubmitErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Mirrors the Nuxt reference's requiredFields + isEduInformationFilled
  // checks — run before opening the consent/confirmation dialog.
  const isEduInformationFilled = () => {
    if (admissionData?.academic_info !== "YES") return true;
    // "At least one required": every non-blank row must be fully filled, and
    // there must be at least one complete row.
    return (
      eduInfo.some(isEduRowComplete) &&
      eduInfo.every((row) => isEduRowBlank(row) || isEduRowComplete(row))
    );
  };

  const [eduError, setEduError] = useState(false);
  // Clear the education error once the section becomes valid.
  useEffect(() => {
    if (eduError && isEduInformationFilled()) setEduError(false);
  }, [eduInfo]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkFields = () => {
    const values = watch();
    clearErrors();

    // Highlight every invalid field at once (don't stop at the first).
    const missingFields = REQUIRED_FIELDS.filter((field) => !values[field]);
    missingFields.forEach((field) =>
      setError(field, { type: "required", message: "This field is required" }),
    );

    const eduInvalid = !isEduInformationFilled();
    setEduError(eduInvalid);

    if (missingFields.length > 0 || eduInvalid) {
      showMessage(
        "error",
        "Missing fields",
        "Please fill all required (*) fields.",
      );
      return;
    }
    if (!files.student_pic) {
      showMessage(
        "error",
        "Missing fields",
        "Please upload the student photo.",
      );
      return;
    }
    if (admissionData?.subject === "YES" && !admissionSubjectSetupId) {
      showMessage(
        "error",
        "Missing fields",
        "Please complete the subject selection.",
      );
      return;
    }
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
    setConfirmationVisible(true);
  };

  if (admissionData && admissionData.form !== "YES") {
    return (
      <View
        className="p-4"
        style={{ maxWidth: 700, width: "100%", alignSelf: "center" }}
      >
        <ReusableNotice
          message="The application form is currently closed for this institute."
          icon="document-text-outline"
          containerClassName="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
          textClassName="text-amber-800"
        />
      </View>
    );
  }

  return (
    <View
      className="p-4"
      style={{ maxWidth: 1160, width: "100%", alignSelf: "center" }}
    >
      <ReusableButton
        title="Refresh"
        variant="secondary"
        onPress={() => {}}
        containerClassName="self-end mb-2"
        leftIcon={<Ionicons name="refresh" size={16} color="#1e293b" />}
      />

      {/* ================= ACADEMIC INFORMATION ================= */}
      <Section title="Academic Information" icon="school-outline">
        <ReusableNotice
          message="Fill in the class/session details to see subject options."
          icon="book-outline"
          containerClassName="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4"
          textClassName="text-blue-800"
        />

        <FormRow>
          <FormCol>
            <SearchableSelect
              name="academic_year_id"
              control={control}
              options={academicYearOptions}
              label="Session"
              placeholder="Select Academic Year"
            />
          </FormCol>
          <FormCol>
            <SearchableSelect
              name="department_id"
              control={control}
              options={departmentOptions}
              label="Department"
              placeholder="Select Department"
              disabled={!academicYearId}
            />
          </FormCol>
          <FormCol>
            <SearchableSelect
              name="class_id"
              control={control}
              options={classOptions}
              label="Class"
              placeholder="Select Class"
              disabled={!departmentId}
            />
          </FormCol>
          <FormCol>
            <SearchableSelect
              name="group_id"
              control={control}
              options={groupOptions}
              label="Group"
              placeholder="Select Faculty"
              disabled={!classId}
            />
          </FormCol>
          <FormCol>
            <RequiredWrap invalid={!!errors.shift_id}>
              <SelectDropdown
                name="shift_id"
                control={control}
                options={shiftOptions}
                label="Shift"
                placeholder="Select Hall"
                disabled={!groupId}
              />
            </RequiredWrap>
          </FormCol>
          <FormCol>
            <RequiredWrap invalid={!!errors.gender}>
              <SelectDropdown
                name="gender"
                control={control}
                options={genderOptions}
                label="Gender"
                placeholder="Select Gender"
                disabled={!shiftId}
              />
            </RequiredWrap>
          </FormCol>
          <FormCol>
            <RequiredWrap invalid={!!errors.religion}>
              <SelectDropdown
                name="religion"
                control={control}
                options={religionOptions}
                label="Religion"
                placeholder="Select Religion"
                disabled={!genderValue}
              />
            </RequiredWrap>
          </FormCol>
        </FormRow>

        {admissionData?.subject === "YES" && (
          <View className="mt-2">
            {academicYearId &&
              departmentId &&
              classId &&
              groupId &&
              subjectSet.length === 0 && (
                <ReusableNotice
                  message="No Subject Set Available for this selection."
                  icon="alert-circle-outline"
                  containerClassName="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4"
                  textClassName="text-amber-800"
                />
              )}

            {selectedSubjectPackage && (
              <>
                {compulsorySubjectList.length > 0 && (
                  <View className="mb-4">
                    <Text className="mb-1.5 text-[13px] font-bold text-[#334155]">
                      Compulsory Subjects
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {compulsorySubjectList.map((s) => (
                        <View
                          key={s.institute_subject_id}
                          className="px-3 py-1 rounded-full bg-blue-100"
                        >
                          <Text className="text-xs text-blue-800">
                            {s.subject_code} : {s.subject_name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {groupBaseSubjectList.length > 0 && (
                  <View className="mb-1">
                    <Text className="mb-1.5 text-[13px] font-medium text-[#334155]">
                      Group Based Subjects
                      {groupBaseLimit != null && (
                        <Text style={{ color: "tomato" }}>
                          {" "}
                          (Select exactly {groupBaseLimit}) *
                        </Text>
                      )}
                    </Text>
                  </View>
                )}
                {groupBaseSubjectList.length > 0 && (
                  <SearchableMultiSelectAdapter
                    options={availableGroupBaseOptions}
                    value={groupSubjects}
                    onChange={setGroupSubjects}
                    placeholder="Select Group Based Subjects"
                  />
                )}

                {choosableSubjectList.length > 0 && (
                  <View className="mb-1">
                    <Text className="mb-1.5 text-[13px] font-medium text-[#334155]">
                      Choosable Subjects
                      {choosableLimit != null && (
                        <Text style={{ color: "tomato" }}>
                          {" "}
                          (Select exactly {choosableLimit}) *
                        </Text>
                      )}
                    </Text>
                  </View>
                )}
                {choosableSubjectList.length > 0 && (
                  <SearchableMultiSelectAdapter
                    options={availableChoosableOptions}
                    value={choosableSubjects}
                    onChange={setChoosableSubjects}
                    placeholder="Select Choosable Subjects"
                  />
                )}

                {uncountableSubjectList.length > 0 && (
                  <View className="mb-1">
                    <Text className="mb-1.5 text-[13px] font-bold text-[#334155]">
                      Uncountable Subjects
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {uncountableSubjectList.map((s) => (
                        <View
                          key={s.institute_subject_id}
                          className="px-3 py-1 rounded-full bg-amber-100"
                        >
                          <Text className="text-xs text-amber-800">
                            {s.subject_code} : {s.subject_name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </Section>

      {/* ================= STUDENT INFORMATION ================= */}
      <Section title="Student Information" icon="person-outline">
        <FormRow>
          <FormCol>
            <FieldLabel text="Name of Student (Bangla)" required />
            <Controller
              name="student_name_bangla"
              control={control}
              render={({ field, fieldState }) => (
                <ReusableInput
                  error={!!fieldState.error}
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Student Name (Bangla)"
                />
              )}
            />
          </FormCol>
          <FormCol>
            <FieldLabel text="Name of Student (English)" required />
            <Controller
              name="student_name_english"
              control={control}
              render={({ field, fieldState }) => (
                <ReusableInput
                  error={!!fieldState.error}
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
              render={({ field, fieldState }) => (
                <ReusableInput
                  error={!!fieldState.error}
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
              render={({ field, fieldState }) => (
                <ReusableInput
                  error={!!fieldState.error}
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Nationality"
                />
              )}
            />
          </FormCol>
          <FormCol>
            <FieldLabel text="Date of Birth" required />
            <RequiredWrap invalid={!!errors.date_of_birth}>
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
            </RequiredWrap>
          </FormCol>
          <FormCol>
            <FieldLabel text="NID / Birth Registration" required />
            <Controller
              name="student_nid_or_birth_no"
              control={control}
              render={({ field, fieldState }) => (
                <ReusableInput
                  error={!!fieldState.error}
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

        <View className="h-px bg-slate-200 my-3" />

        <FormRow>
          <FormCol>
            <FieldLabel text="Father's Name (Bangla)" />
            <Controller
              name="father_name_bangla"
              control={control}
              render={({ field, fieldState }) => (
                <ReusableInput
                  error={!!fieldState.error}
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
              render={({ field, fieldState }) => (
                <ReusableInput
                  error={!!fieldState.error}
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Father Name (English)"
                />
              )}
            />
          </FormCol>
          <FormCol>
            <FieldLabel text="Father's National ID / Passport No." />
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
            <FieldLabel text="Father's Occupation" />
            <Controller
              name="father_occupation"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Father's Occupation"
                />
              )}
            />
          </FormCol>
          <FormCol>
            <FieldLabel text="Father's Income" />
            <Controller
              name="father_income"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Father's Income"
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
            <FieldLabel text="Mother's National ID / Passport No." />
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
          <FormCol>
            <FieldLabel text="Mother's Occupation" />
            <Controller
              name="mother_occupation"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Mother's Occupation"
                />
              )}
            />
          </FormCol>
          <FormCol>
            <FieldLabel text="Mother's Income" />
            <Controller
              name="mother_income"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Mother's Income"
                  inputType="number"
                />
              )}
            />
          </FormCol>
        </FormRow>
      </Section>

      {/* ================= ADDRESS INFORMATION ================= */}
      <Section title="Address Information" icon="location-outline">
        <FormRow>
          <FormCol width="half">
            <Text className="text-primary font-bold mb-2">
              Mailing / Present Address {REQUIRED_LABEL}
            </Text>
            <Controller
              name="present_address"
              control={control}
              render={({ field, fieldState }) => (
                <ReusableInput
                  error={!!fieldState.error}
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Address / Villages"
                  multiline
                  numberOfLines={4}
                  height={90}
                />
              )}
            />
            <SearchableSelect
              name="present_division"
              control={control}
              options={divisionOptions}
              label="Division"
              placeholder="Select Division"
            />
            <SearchableSelect
              name="present_district"
              control={control}
              options={presentDistrictOptions}
              label="District"
              placeholder="Select District"
              disabled={!presentDivision}
            />
            <SearchableSelect
              name="present_upozilla"
              control={control}
              options={presentUpazillaOptions}
              label="P.S./Upazila"
              placeholder="Select Upazilla"
              disabled={!presentDistrict}
            />
            <FieldLabel text="Post Office" required />
            <Controller
              name="present_post_office"
              control={control}
              render={({ field, fieldState }) => (
                <ReusableInput
                  error={!!fieldState.error}
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Post Office"
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
              render={({ field, fieldState }) => (
                <ReusableInput
                  error={!!fieldState.error}
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
              render={({ field, fieldState }) => (
                <ReusableInput
                  error={!!fieldState.error}
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
      </Section>

      {/* ================= GUARDIAN INFORMATION ================= */}
      <Section title="Guardian Information" icon="people-outline">
        <FormRow>
          <FormCol>
            <FieldLabel text="Guardian Name" />
            <Controller
              name="guardian_name"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Guardian Name"
                />
              )}
            />
          </FormCol>
          <FormCol>
            <FieldLabel text="Relationship" />
            <Controller
              name="guardian_relation"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Relation with Guardian"
                />
              )}
            />
          </FormCol>
          <FormCol>
            <FieldLabel text="Mobile Number" />
            <Controller
              name="guardian_mobile"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Guardian Contact"
                  inputType="number"
                />
              )}
            />
          </FormCol>
          <FormCol>
            <FieldLabel text="Occupation" />
            <Controller
              name="guardian_occupation"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Guardian Occupation"
                />
              )}
            />
          </FormCol>
          <FormCol>
            <FieldLabel text="Yearly Income" />
            <Controller
              name="guardian_yearly_income"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Guardian Income (yearly)"
                  inputType="number"
                />
              )}
            />
          </FormCol>
          <FormCol>
            <FieldLabel text="Property" />
            <Controller
              name="guardian_property"
              control={control}
              render={({ field }) => (
                <ReusableInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Guardian Property"
                />
              )}
            />
          </FormCol>
        </FormRow>
      </Section>

      {/* ================= EDUCATIONAL QUALIFICATIONS ================= */}
      {admissionData?.academic_info === "YES" && (
        <Section
          title="Educational Qualifications"
          icon="document-text-outline"
        >
          <Text className="text-[12px] text-slate-500 mb-3 -mt-1">
            <Text style={{ color: "tomato" }}>* </Text>
            (Atleast One Required)
          </Text>
          {eduError ? (
            <Text className="text-[12px] text-red-500 mb-2 -mt-2">
              Please fill in at least one complete qualification (all fields of
              that row).
            </Text>
          ) : null}

          {eduInfo.map((row, index) => {
            const rowBad = eduError && !isEduRowComplete(row);
            const bad = (v: string) => rowBad && !v;
            return (
              <View
                key={index}
                className={
                  index > 0
                    ? "mt-4 pt-4 border-t border-slate-200 relative"
                    : "relative"
                }
              >
                {eduInfo.length > 1 && (
                  <Pressable
                    onPress={() => removeEduRow(index)}
                    className="absolute right-0 top-0 z-10 h-7 w-7 items-center justify-center rounded-full bg-red-50"
                  >
                    <Ionicons name="close" size={16} color="#dc2626" />
                  </Pressable>
                )}
                <FormRow>
                  <FormCol width="third">
                    <RequiredWrap invalid={bad(row.exam)}>
                      <SelectDropdown
                        label="Exam"
                        options={examOptions}
                        value={row.exam}
                        onChange={(v) => updateEduInfo(index, "exam", v)}
                        placeholder="Select Exam"
                      />
                    </RequiredWrap>
                  </FormCol>
                  <FormCol width="third">
                    <RequiredWrap invalid={bad(row.board)}>
                      <SelectDropdown
                        label="Board"
                        options={BOARD_OPTIONS}
                        value={row.board}
                        onChange={(v) => updateEduInfo(index, "board", v)}
                        placeholder="Select Board"
                      />
                    </RequiredWrap>
                  </FormCol>
                  <FormCol width="third">
                    <FieldLabel text="Institute" />
                    <ReusableInput
                      error={bad(row.institute)}
                      value={row.institute}
                      onChangeText={(v) => updateEduInfo(index, "institute", v)}
                      placeholder="Institute Name"
                    />
                  </FormCol>
                  <FormCol width="third">
                    <FieldLabel text="Group" />
                    <ReusableInput
                      error={bad(row.group)}
                      value={row.group}
                      onChangeText={(v) => updateEduInfo(index, "group", v)}
                      placeholder="Name of the Group/Dept."
                    />
                  </FormCol>
                  <FormCol width="third">
                    <FieldLabel text="Roll" />
                    <ReusableInput
                      error={bad(row.roll)}
                      value={row.roll}
                      onChangeText={(v) => updateEduInfo(index, "roll", v)}
                      placeholder="Roll No."
                      inputType="number"
                    />
                  </FormCol>
                  <FormCol width="third">
                    <FieldLabel text="Registration" />
                    <ReusableInput
                      error={bad(row.registration)}
                      value={row.registration}
                      onChangeText={(v) =>
                        updateEduInfo(index, "registration", v)
                      }
                      placeholder="Registration No."
                      inputType="number"
                    />
                  </FormCol>
                  <FormCol width="third">
                    <FieldLabel text="G.P.A" />
                    <ReusableInput
                      error={bad(row.gpa)}
                      value={row.gpa}
                      onChangeText={(v) => updateEduInfo(index, "gpa", v)}
                      placeholder="GPA"
                    />
                  </FormCol>
                  <FormCol width="third">
                    <FieldLabel text="Passing Year" />
                    <ReusableInput
                      error={bad(row.passingYear)}
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
            );
          })}

          <View className="mt-3 flex-row">
            <ReusableButton
              title="Add More"
              onPress={addEduRow}
              className="px-5 h-[38px]"
              style={{ backgroundColor: "#0f8f7f" }}
              leftIcon={
                <Ionicons name="add-circle-outline" size={16} color="#fff" />
              }
            />
          </View>
        </Section>
      )}

      {/* ================= QUOTA INFORMATION ================= */}
      {admissionData?.quota === "YES" && (
        <Section title="Quota Information" icon="bookmark-outline">
          <View className="flex-row flex-wrap items-center gap-4">
            {QUOTA_PRESET_OPTIONS.map((preset) => (
              <Pressable
                key={preset}
                onPress={() => {
                  setValue("quota", preset);
                  setOtherQuota("");
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
        </Section>
      )}

      {/* ================= COVID-19 VACCINE INFORMATION ================= */}
      {admissionData?.covid_vaccine === "YES" && (
        <Section
          title="Covid-19 Vaccine Information"
          icon="shield-checkmark-outline"
        >
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
        </Section>
      )}

      {/* ================= FILE ATTACHMENT ================= */}
      <Section title="File Attachment" icon="attach-outline">
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
            <FieldLabel text="Birth Certificate / NID" />
            <FilePickRow
              label="Birth Certificate / NID"
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
      </Section>

      {/* ================= APPLY FOR ADMISSION ================= */}
      <View className="mt-8 items-center">
        <ReusableButton
          title="Apply For Admission"
          variant="primary"
          onPress={checkFields}
          leftIcon={
            <Ionicons name="help-circle-outline" size={16} color="#ffffff" />
          }
        />
      </View>

      {/* ================= CONSENT + CONFIRMATION MODAL ================= */}
      <ReusableModal
        visible={confirmationVisible}
        onClose={() => setConfirmationVisible(false)}
        title="Consent and Confirmation"
        size="md"
        scrollable={false}
        footerSlot={
          <View className="flex-row justify-end gap-2 w-full">
            <ReusableButton
              title="Back"
              variant="secondary"
              onPress={() => setConfirmationVisible(false)}
              leftIcon={
                <Ionicons name="arrow-back" size={16} color="#1e293b" />
              }
            />
            <ReusableButton
              title={submitting ? "Submitting..." : "Apply"}
              variant="primary"
              isLoading={submitting}
              disabled={!consent}
              onPress={handleSubmit(onSubmit)}
              leftIcon={
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color="#ffffff"
                />
              }
            />
          </View>
        }
      >
        <ReusableNotice
          message={`I, ${watch("student_name_english") || "the applicant"}, hereby declare that the above-mentioned information and photo are correct. If any information provided by me is found to be false, ${instituteName}${instituteAddress ? `, ${instituteAddress}` : ""} reserves the right to cancel my admission. I shall be obliged to obey the rules and regulations of the institute and to pay all the required fees.`}
          icon="warning-outline"
          containerClassName="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4"
          textClassName="text-amber-800"
        />

        <Pressable
          onPress={() => setConsent((v) => !v)}
          className="flex-row items-start"
        >
          <Ionicons
            name={consent ? "checkbox" : "square-outline"}
            size={22}
            color={consent ? "#1e3a8a" : "#94a3b8"}
            style={{ marginRight: 8, marginTop: 1 }}
          />
          <Text className="flex-1 text-[13px] text-slate-600">
            I have read and accepted the consent
          </Text>
        </Pressable>
      </ReusableModal>
    </View>
  );
};

/* ------------------------------ small local helpers ------------------------------ */

// Responsive grid — mirrors the Nuxt reference's PrimeFlex `col-12 md:col-3`
// pattern: full width on mobile, narrowing into columns as the screen grows.
// FormRow wraps a set of FormCols; FormCol's `width` picks the breakpoint.
const FormRow = ({ children }: { children: React.ReactNode }) => (
  <View className="flex-row flex-wrap -mx-2">{children}</View>
);

/**
 * Section shell matching the public admission page on the web: a light-mint
 * header strip (icon + green title) above a white bordered card with the
 * fields. Replaces the pill-style <Legend> on this screen only.
 */
const Section = ({
  title,
  icon = "ellipse-outline",
  children,
}: {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) => (
  <View className="mt-4">
    <View
      className="flex-row items-center rounded-lg px-4 py-2.5 mb-3"
      style={{
        backgroundColor: "#e5f8f4",
        borderWidth: 1,
        borderColor: "#b9ddd5",
      }}
    >
      <Ionicons name={icon} size={15} color="#0b7369" />
      <Text className="text-[13px] font-bold ml-2" style={{ color: "#0b7369" }}>
        {title}
      </Text>
    </View>
    <View
      className="rounded-xl bg-white p-4"
      style={{ borderWidth: 1, borderColor: "#b9ddd5" }}
    >
      {children}
    </View>
  </View>
);

const COL_WIDTH_CLASSES = {
  quarter: "w-full md:w-1/2 lg:w-1/4",
  third: "w-full md:w-1/3",
  half: "w-full md:w-1/2",
} as const;

const FormCol = ({
  width = "quarter",
  children,
}: {
  width?: keyof typeof COL_WIDTH_CLASSES;
  children: React.ReactNode;
}) => (
  <View className={`px-2 mb-4 ${COL_WIDTH_CLASSES[width]}`}>{children}</View>
);

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

// SearchableMultiSelect only ships in RHF-controlled mode; this adapter lets
// it be used with plain value/onChange state for the subject pickers, which
// don't belong to the main form (they're arrays of Option objects, not
// primitives react-hook-form needs to serialize).
interface MultiSelectAdapterProps {
  options: Option[];
  value: Option[];
  onChange: (value: Option[]) => void;
  placeholder?: string;
}
const SearchableMultiSelectAdapter = ({
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

/* ================= PREVIEW & PAYMENT TAB ================= */
// Looks up the application via GET /student-form-preview/{id} and, once
// found, hands off to the same preview page (onlineadmission/preview/[key])
// used right after submitting a new application — that page owns the actual
// form display and payment flow.
const PreviewPaymentTab = () => {
  const [applicationId, setApplicationId] = useState("");
  const router = useRouter();

  const [fetchPreview, { isFetching: looking }] =
    useLazyGetAdmissionPreviewQuery();

  const handleLookup = async () => {
    if (!applicationId.trim()) {
      showMessage(
        "warning",
        "Required",
        "Enter your application ID to continue.",
      );
      return;
    }
    try {
      const result = await fetchPreview(applicationId.trim()).unwrap();
      if (!result) {
        showMessage("error", "Not found", "No application found for this ID.");
        return;
      }
      router.push({
        pathname: "/onlineadmission/preview/[key]",
        params: { key: applicationId.trim() },
      });
    } catch {
      showMessage("error", "Not found", "No application found for this ID.");
    }
  };

  return (
    <View
      className="p-4"
      style={{ maxWidth: 700, width: "100%", alignSelf: "center" }}
    >
      <Section title="Preview & Payment" icon="card-outline">
        <ReusableNotice
          message="Already submitted your application? Enter your Application ID below to preview your details and pay the admission fee."
          icon="receipt-outline"
          containerClassName="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4"
          textClassName="text-blue-800"
        />

        <FieldLabel text="Application ID" required />
        <ReusableInput
          value={applicationId}
          onChangeText={setApplicationId}
          placeholder="e.g. ADM2025000001"
        />

        <ReusableButton
          title="Find My Application"
          variant="primary"
          isLoading={looking}
          onPress={handleLookup}
          containerClassName="mt-2"
          leftIcon={
            <Ionicons name="search-outline" size={16} color="#ffffff" />
          }
        />

        <View className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <Text className="text-amber-800 text-[13px]">
            Haven&apos;t applied yet? Switch to the &quot;Apply Online&quot; tab
            and submit your form first — you&apos;ll get an Application ID to
            use here.
          </Text>
        </View>
      </Section>
    </View>
  );
};

/* ================= HOW TO APPLY & PAY TAB ================= */
// Mirrors the Nuxt reference's `<div v-html="appInstruction?.instruction">` —
// real HTML from GET /online-admission-instruction, rendered via WebView.
const HowToApplyTab = () => {
  const { data: instruction, isLoading } = useGetAdmissionInstructionQuery();

  return (
    <View
      className="p-4"
      style={{ maxWidth: 700, width: "100%", alignSelf: "center" }}
    >
      <Section title="How to Apply & Pay" icon="help-circle-outline">
        {isLoading ? (
          <ActivityIndicator size="small" color="#1e3a8a" />
        ) : instruction ? (
          <WebView
            originWhitelist={["*"]}
            source={{
              html: `<html><body style="font-family:sans-serif;color:#334155;font-size:14px;">${instruction}</body></html>`,
            }}
            style={{ height: 400 }}
          />
        ) : (
          <ReusableNotice
            message="No instruction yet!"
            icon="information-circle-outline"
            containerClassName="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
            textClassName="text-amber-800"
          />
        )}
      </Section>
    </View>
  );
};

/* ================= FULL PAGE SKELETON (Apply Online loading state) ================= */
// Mirrors the real Apply Online layout (institute card, tab bar, Legend
// sections with FormRow/FormCol fields) so the loading state doesn't jump
// once real data arrives. Each block is a flat gray box with a soft white
// gradient band sweeping across it (expo-linear-gradient) for a real
// shimmer effect, rather than a plain opacity pulse.
const useShimmerProgress = (delay: number) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1100,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, delay]);

  return progress;
};

const SkeletonBlock = ({
  delay = 0,
  className,
  style,
}: {
  delay?: number;
  className?: string;
  style?: object;
}) => {
  const progress = useShimmerProgress(delay);
  const [width, setWidth] = useState(0);
  const bandWidth = Math.max(width, 60);
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-bandWidth, bandWidth],
  });

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      className={`bg-slate-200 overflow-hidden ${className ?? ""}`}
      style={style}
    >
      {width > 0 && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: bandWidth,
            transform: [{ translateX }],
          }}
        >
          <LinearGradient
            colors={[
              "rgba(255,255,255,0)",
              "rgba(255,255,255,0.6)",
              "rgba(255,255,255,0)",
            ]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      )}
    </View>
  );
};

// A file-pick row placeholder, sized exactly like the real FilePickRow.
const SkeletonFileRow = ({ delay = 0 }: { delay?: number }) => (
  <View className="mb-4">
    <SkeletonBlock delay={delay} className="h-3 w-1/2 rounded-full mb-2" />
    <SkeletonBlock delay={delay + 40} className="h-[46px] w-full rounded-lg" />
  </View>
);

// Real Legend + FormRow/FormCol/FieldLabel structure, populated with skeleton
// boxes instead of live fields — matches ApplyOnlineTab section-for-section
// (Academic Information, Student Information, Address Information, File
// Attachment) so the loading state reads as "this exact form", not a generic
// placeholder shape.
const FullPageSkeleton = () => (
  <ScrollView
    className="flex-1 bg-white"
    contentContainerStyle={{ paddingBottom: 60 }}
  >
    <View
      className="px-4 pt-4"
      style={{ maxWidth: 1160, width: "100%", alignSelf: "center" }}
    >
      {/* Institute header card */}
      <View className="flex-row items-center bg-white border border-gray-100 rounded-2xl p-4 mb-4">
        <SkeletonBlock
          delay={0}
          style={{ width: 48, height: 48, borderRadius: 8, marginRight: 12 }}
        />
        <View className="flex-1">
          <SkeletonBlock delay={40} className="h-4 w-1/2 rounded-full mb-2" />
          <SkeletonBlock delay={80} className="h-3 w-1/3 rounded-full" />
        </View>
      </View>

      {/* Tab bar — real tabs, "Apply Online" active, non-interactive while loading */}
      <View className="bg-white rounded-2xl border border-gray-100 px-2 pt-2">
        <ReusableTab
          tabs={TABS}
          activeKey="apply_online"
          onChange={() => {}}
          variant="underline"
          size="md"
        />
      </View>
    </View>

    <View
      className="p-4"
      style={{ maxWidth: 1160, width: "100%", alignSelf: "center" }}
    >
      {/* Refresh button */}
      <View className="items-end mb-2">
        <SkeletonBlock delay={0} className="h-8 w-24 rounded-lg" />
      </View>

      {/* ================= ACADEMIC INFORMATION ================= */}
      <Section title="Academic Information" icon="school-outline">
        <SkeletonBlock delay={0} className="h-11 w-full rounded-xl mb-4" />
        <FormRow>
          {[
            "Session",
            "Department",
            "Class",
            "Faculty",
            "Hall",
            "Gender",
            "Religion",
          ].map((label, i) => (
            <FormCol key={label}>
              <FieldLabel text={label} />
              <SkeletonBlock
                delay={i * 60}
                className="h-[46px] w-full rounded-lg"
              />
            </FormCol>
          ))}
        </FormRow>
      </Section>

      {/* ================= STUDENT INFORMATION ================= */}
      <Section title="Student Information" icon="person-outline">
        <FormRow>
          {[
            "Name of Student (Bangla)",
            "Name of Student (English)",
            "Student Mobile No.",
            "Nationality",
            "Date of Birth",
            "NID / Birth Registration",
            "Blood Group",
            "Marital Status",
          ].map((label, i) => (
            <FormCol key={label}>
              <FieldLabel text={label} />
              <SkeletonBlock
                delay={i * 60}
                className="h-[46px] w-full rounded-lg"
              />
            </FormCol>
          ))}
        </FormRow>

        <View className="h-px bg-slate-200 my-3" />

        <FormRow>
          {[
            "Father's Name (Bangla)",
            "Father's Name (English)",
            "Father's National ID / Passport No.",
            "Father's Mobile No.",
            "Mother's Name (Bangla)",
            "Mother's Name (English)",
            "Mother's National ID / Passport No.",
            "Mother's Mobile No.",
          ].map((label, i) => (
            <FormCol key={label}>
              <FieldLabel text={label} />
              <SkeletonBlock
                delay={i * 60}
                className="h-[46px] w-full rounded-lg"
              />
            </FormCol>
          ))}
        </FormRow>
      </Section>

      {/* ================= ADDRESS INFORMATION ================= */}
      <Section title="Address Information" icon="location-outline">
        <FormRow>
          {["Mailing / Present Address", "Permanent Address"].map(
            (title, colIdx) => (
              <FormCol key={title} width="half">
                <SkeletonBlock
                  delay={colIdx * 60}
                  className="h-4 w-1/2 rounded-full mb-2"
                />
                <SkeletonBlock
                  delay={colIdx * 60 + 40}
                  className="h-[90px] w-full rounded-lg mb-4"
                />
                {["Division", "District", "P.S./Upazila"].map((label, i) => (
                  <View key={label} className="mb-4">
                    <SkeletonBlock
                      delay={colIdx * 60 + i * 40}
                      className="h-3 w-1/3 rounded-full mb-2"
                    />
                    <SkeletonBlock
                      delay={colIdx * 60 + i * 40 + 20}
                      className="h-[46px] w-full rounded-lg"
                    />
                  </View>
                ))}
                <FieldLabel text="Post Office" required />
                <SkeletonBlock
                  delay={colIdx * 60}
                  className="h-[46px] w-full rounded-lg mb-4"
                />
                <FieldLabel text="Postal Code" />
                <SkeletonBlock
                  delay={colIdx * 60 + 40}
                  className="h-[46px] w-full rounded-lg"
                />
              </FormCol>
            ),
          )}
        </FormRow>
      </Section>

      {/* ================= FILE ATTACHMENT ================= */}
      <Section title="File Attachment" icon="attach-outline">
        <FormRow>
          {["Student Photo", "Birth Certificate / NID", "Other Document"].map(
            (label, i) => (
              <FormCol key={label} width="third">
                <FieldLabel text={label} required={i === 0} />
                <SkeletonFileRow delay={i * 60} />
              </FormCol>
            ),
          )}
        </FormRow>
      </Section>

      <View className="mt-8 items-center">
        <SkeletonBlock delay={420} className="h-11 w-48 rounded-lg" />
      </View>
    </View>
  </ScrollView>
);

/* ================= PAGE CONTAINER ================= */
// Mirrors the Nuxt reference: the whole page (all three tabs) is gated on the
// /admission-data/{id} response's `enabled` flag alone — `form`, `subject`,
// `academic_info`, `covid_vaccine` and `quota` each gate their own section
// further down inside ApplyOnlineTab, same as the Nuxt config toggles.
const AdmissionApplication = () => {
  // Route segment is [instituteId]; the rest of this component refers to it
  // as `id`.
  const { instituteId: id } = useLocalSearchParams<{ instituteId: string }>();
  const [activeTab, setActiveTab] = useState("apply_online");

  const { data: admissionData, isLoading: admissionDataLoading } =
    useGetAdmissionDataQuery(id, { skip: !id });
  const { data: divisions } = useGetDivisionsQuery();
  const { data: feeMap } = useFetchFullMapAdmissionFeeConfigQuery(id, {
    skip: !id,
  });

  if (admissionDataLoading) {
    return <FullPageSkeleton />;
  }

  if (admissionData && admissionData.enabled !== "YES") {
    return (
      <View className="flex-1 bg-gray-50 p-4 items-center">
        <View className="mt-8" style={{ maxWidth: 700, width: "100%" }}>
          <ReusableNotice
            message="Online admission is not open for this institute right now. Please check back later."
            icon="alert-circle-outline"
            containerClassName="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
            textClassName="text-amber-800"
          />
        </View>
      </View>
    );
  }

  const instituteDetails = admissionData?.instiute_details;

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      <View
        className="px-4 pt-4"
        style={{ maxWidth: 1160, width: "100%", alignSelf: "center" }}
      >
        {instituteDetails && (
          <View className="flex-row items-center bg-white border border-gray-100 rounded-2xl p-4 mb-4">
            {instituteDetails.logo ? (
              <Image
                source={{ uri: instituteDetails.logo }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  marginRight: 12,
                }}
                resizeMode="contain"
              />
            ) : null}
            <View className="flex-1">
              <Text className="text-lg font-black text-[#1e3a8a]">
                {instituteDetails.institute_name}
              </Text>
              {!!instituteDetails.institute_address && (
                <Text className="text-[13px] text-slate-500 mt-0.5">
                  {instituteDetails.institute_address}
                </Text>
              )}
            </View>
          </View>
        )}

        <View className="bg-white rounded-2xl border border-gray-100 px-2 pt-2">
          <ReusableTab
            tabs={TABS}
            activeKey={activeTab}
            onChange={setActiveTab}
            variant="underline"
            size="md"
          />
        </View>
      </View>

      {activeTab === "apply_online" && (
        <ApplyOnlineTab
          id={id}
          admissionData={admissionData}
          divisions={divisions}
          feeMap={feeMap}
        />
      )}
      {activeTab === "preview_payment" && <PreviewPaymentTab />}
      {activeTab === "how_to_apply" && <HowToApplyTab />}
    </ScrollView>
  );
};

export default AdmissionApplication;
