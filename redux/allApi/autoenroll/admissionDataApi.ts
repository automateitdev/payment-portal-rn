import { baseApi } from "@/redux/baseApi/baseApi";

export interface AdmissionInstituteDetails {
  id: number;
  institute_id: string;
  institute_name: string;
  institute_address: string;
  logo: string | null;
  institute_email: string | null;
  institute_contact: string | null;
  [key: string]: any;
}

// One "core" entity (shift/group/section) as embedded in a class_details
// variant row — the API names the value field core_subcategory_name for
// all three of these, not "name".
export interface AdmissionCoreEntity {
  id: number;
  core_category_id: number;
  core_subcategory_name: string;
}

// A single available (group, shift, section) combination for one class.
export interface AdmissionClassDetailVariant {
  id: number;
  group_id: number;
  shift_id: number;
  section_id: number;
  groups: AdmissionCoreEntity;
  shifts: AdmissionCoreEntity;
  sections: AdmissionCoreEntity;
}

// instituteClassMaps is a FLAT list — one row per (department, class) pair,
// not one row per department with a nested list of classes. class_details
// holds the group/shift/section combinations available for that one class.
export interface AdmissionInstituteClassMap {
  id: number;
  department_id: number;
  department_name: string;
  class_id: number;
  class_name: string;
  class_details: AdmissionClassDetailVariant[];
}

export interface AdmissionAcademicYear {
  id: number;
  name: string;
  [key: string]: any;
}

export interface AdmissionDepartment {
  id: number;
  name: string;
  [key: string]: any;
}

export interface AdmissionData {
  instiute_details: AdmissionInstituteDetails;
  institute_essentials: {
    instituteClassMaps: AdmissionInstituteClassMap[];
    academic_years?: AdmissionAcademicYear[];
    departments?: AdmissionDepartment[];
  };
  enabled: "YES" | "NO";
  form: "YES" | "NO";
  subject: "YES" | "NO";
  academic_info: "YES" | "NO";
  covid_vaccine: "YES" | "NO";
  quota: "YES" | "NO";
  details: any[];
  admission_link: string | null;
  payment_instruction: string | null;
  admission_approved: "YES" | "NO";
  [key: string]: any;
}

export interface SubjectSetSubject {
  institute_subject_id: number;
  subject_code: string;
  subject_name: string;
  [key: string]: any;
}

export interface SubjectSetGroup {
  type: "compulsory" | "uncountable" | "group_based" | "choosable";
  subjects: SubjectSetSubject[];
}

export interface SubjectSetPackage {
  id: number;
  subjects: SubjectSetGroup[];
  group_base_limit: number | null;
  choosable_limit: number | null;
  [key: string]: any;
}

export interface SubjectSetAlternate {
  alternates: { institute_subject_id: number }[];
}

export interface SubjectSetPayload {
  institute_id: string | number;
  academic_year_id: string | number;
  department_id: string | number;
  class_id: string | number;
  group_id: string | number;
}

// The submitted application, as returned by /student-form-preview/{key}.
// present_/permanent_ division/district/upozilla and edu_information are
// JSON-encoded strings on the wire (mirrors how they were stored on submit).
export interface AdmissionPreviewStudentData {
  id: number;
  institute_details_id: number;
  unique_number: string;
  student_name_bangla: string;
  student_name_english: string;
  student_mobile: string;
  father_name_bangla: string;
  father_name_english: string;
  father_nid: string;
  father_mobile: string;
  mother_name_bangla: string;
  mother_name_english: string;
  mother_nid: string;
  mother_mobile: string;
  nationality: string;
  date_of_birth: string;
  student_nid_or_birth_no: string;
  gender: string;
  religion: string;
  blood_group: string | null;
  marital_status: string | null;
  present_division: string | null;
  present_district: string | null;
  present_upozilla: string | null;
  present_post_office: string;
  present_post_code: string | null;
  present_address: string;
  permanent_division: string | null;
  permanent_district: string | null;
  permanent_upozilla: string | null;
  permanent_post_office: string;
  permanent_post_code: string | null;
  permanent_address: string;
  academic_year_id: number;
  department_id: number;
  class_id: number;
  group_id: number;
  shift_id: number;
  admission_subject_setup_id: number | null;
  preferred_subjects: {
    compulsory?: SubjectSetSubject[];
    group_base?: SubjectSetSubject[];
    choosable?: SubjectSetSubject[];
    uncountable?: SubjectSetSubject[];
  } | null;
  edu_information: string | null;
  assigned_roll: string | null;
  quota: string | null;
  vaccine: string | null;
  vaccine_name: string | null;
  vaccine_certificate: string | null;
  student_pic: string | null;
  student_birth_nid_file: string | null;
  other_file: string | null;
  approval_status: string;
  date: string;
  amount: string;
  student_pic_url: string | null;
  vaccine_certificate_url: string | null;
  student_birth_nid_file_url: string | null;
  other_file_url: string | null;
  institute_detail: AdmissionInstituteDetails & {
    institute_id: string;
    logo_url?: string | null;
  };
  academic_year?: { coresubcategories?: { core_subcategory_name: string } };
  department?: { name: string };
  class?: { class_name: string };
  group?: { groups?: { core_subcategory_name: string } };
  shift?: { shifts?: { core_subcategory_name: string } };
  [key: string]: any;
}

export interface AdmissionPreviewData {
  status: string;
  message: string;
  student_data: AdmissionPreviewStudentData;
  admission_fee: string;
  software_fee: string;
  exam: boolean;
  subject: boolean;
  deadline: string | null;
  deadline_status: string;
  gateways: { name: string; type: string }[];
}

export const admissionDataApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdmissionData: builder.query<AdmissionData, string | number>({
      query: (instituteId) => `/admission-data/${instituteId}`,
      // admission_approved is a SIBLING of admissionConfig in the response
      // (payload.data.admission_approved), not nested inside it — merge it
      // in so callers can read admissionData.admission_approved either way.
      transformResponse: (r: any) => {
        const data = r?.payload?.data;
        return {
          ...(data?.admissionConfig ?? data ?? r),
          admission_approved: data?.admission_approved,
        };
      },
    }),

    getAdmissionInstruction: builder.query<string, void>({
      query: () => `/online-admission-instruction`,
      transformResponse: (r: any) => r?.payload?.data?.instruction ?? "",
    }),

    getSubjectSet: builder.mutation<
      {
        admissionSubjectSet: SubjectSetPackage[];
        alternates: SubjectSetAlternate[];
      },
      SubjectSetPayload
    >({
      query: (body) => ({ url: "/subject-set", method: "POST", body }),
      transformResponse: (r: any) => ({
        admissionSubjectSet: r?.payload?.data?.admissionSubjectSet ?? [],
        alternates: r?.payload?.data?.alternates ?? [],
      }),
    }),

    // Submits the Apply Online form. Body is a multipart FormData (student
    // photo / birth-cert / vaccine-cert / other-doc files, plus all the
    // scalar + JSON-stringified fields) built by the caller.
    submitAdmissionApplication: builder.mutation<
      { status: string; message?: string; unique_number?: string },
      FormData
    >({
      query: (formData) => ({
        url: "/student-form-store",
        method: "POST",
        body: formData,
      }),
      // Real shape: { message: "Success", status_code: 201, payload: { data:
      // { unique_number, status: "success", message: "Application saved..." } } }
      transformResponse: (r: any) => ({
        status:
          r?.payload?.data?.status ??
          (r?.status_code === 201 ? "success" : "error"),
        message: r?.payload?.data?.message ?? r?.message,
        unique_number: r?.payload?.data?.unique_number,
      }),
    }),
    // Read-back of a submitted application — shown on the post-submit preview
    // page (/autoenroll/admission/preview/[key]) and reused there for payment.
    getAdmissionPreview: builder.query<AdmissionPreviewData, string>({
      query: (key) => `/student-form-preview/${key}`,
      transformResponse: (r: any) => r?.payload?.data,
    }),

    // Edits an already-submitted application (Preview page's "Edit" dialog).
    // POST /student-form-update/{unique_number} — the key is BOTH the URL
    // path param and a `unique_number` field inside the FormData body.
    updateAdmissionApplication: builder.mutation<
      { status: string; message?: string },
      { uniqueNumber: string; formData: FormData }
    >({
      query: ({ uniqueNumber, formData }) => ({
        url: `/student-form-update/${uniqueNumber}`,
        method: "POST",
        body: formData,
      }),
      transformResponse: (r: any) => ({
        status:
          r?.payload?.data?.status ??
          (r?.status_code === 200 || r?.status_code === 201
            ? "success"
            : "error"),
        message: r?.payload?.data?.message ?? r?.message,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAdmissionDataQuery,
  useGetAdmissionInstructionQuery,
  useGetSubjectSetMutation,
  useSubmitAdmissionApplicationMutation,
  useGetAdmissionPreviewQuery,
  useLazyGetAdmissionPreviewQuery,
  useUpdateAdmissionApplicationMutation,
} = admissionDataApi;

export default admissionDataApi;
