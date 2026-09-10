import { baseApi } from "@/redux/baseApi/baseApi";

export interface StoreAdmissionFeeConfigPayload {
  department_id: number;
  class_id: number;
  shift_id: number[];
  group_id: number[];
  academic_year_id: number;
  fee_head_id: number;
  fee_amount: number;
  fine_amount: null;
  fund_id: number[];
  fund_amount: null;
  religion: string[];
  gender: string[];
  fund_percentage: number[];
}

export interface AdmissionFeeConfigFund {
  fund_id: number;
  fund_name: string;
  fund_percentage: string;
  fund_amount: string;
}

export interface AdmissionFeeConfigDistribution {
  inner_key: string;
  fee_config_id: number;
  shift_id: number;
  shift_name: string;
  group_id: number;
  group_name: string;
  gender: string;
  religion: string;
  funds: AdmissionFeeConfigFund[];
}

export interface AdmissionFeeConfigRow {
  outer_key: string;
  academic_year: string;
  academic_year_id: number;
  department_id: string;
  department: string;
  class_id: string;
  class_name: string;
  fee_head_id: string;
  fee_head_name: string;
  fee_amount: string;
  dist: AdmissionFeeConfigDistribution[];
}

export interface UpdateAdmissionFeeConfigPayload {
  academic_year_id: number;
  department_id: number;
  class_id: number;
  group_id: number;
  shift_id: number;
  gender: string;
  religion: string;
  fee_head_id: number;
  fee_amount: number;
  fund_id: number[];
  fund_percentage: number[];
}

export interface DeleteAdmissionFeeConfigPayload {
  academic_year_id: number;
  department_id: number;
  class_id: number;
  group_id: number;
  shift_id: number;
  gender: string;
  religion: string;
  fee_head_id: number;
}

// One flat row per (class, department, group, shift, fee head, gender,
// religion) combination — /full-map/admission-fee-config returns every such
// combination for the institute across all academic years.
export interface FullMapAdmissionFeeConfigRow {
  id: number;
  institute_details_id: number;
  class_id: number;
  department_id: number;
  group_id: number;
  shift_id: number;
  academic_year_id: number;
  fee_head_id: number;
  gender: string;
  religion: string;
  fee_amount: string;
  fund_id: number;
  fund_amount: string;
  fund_percentage: string;
  academic_year: {
    id: number;
    coresubcategories: { core_subcategory_name: string };
  };
  department: { id: number; name: string };
  class: { id: number; core_subcategory_name: string };
  group: { id: number; core_subcategory_name: string };
  shift: { id: number; core_subcategory_name: string };
  feehead: { id: number; name: string };
}

export interface AdmissionFeeConfigGroupFeeHead {
  fee_head_id: number;
  fee_head: string;
  fee_amount: string;
}

// One row per group returned by GET /admission-fee-config for a fully
// selected (academic year, department, class, shift, fee head) combo — this
// is what drives the "Group Wise Apply" table on the Admission Config tab.
export interface AdmissionFeeConfigGroupRow {
  admission_fee_config_id: number;
  group_id: number;
  group_name: string;
  fee_heads: AdmissionFeeConfigGroupFeeHead[];
}

export interface FetchAdmissionFeeConfigGroupBasedParams {
  academic_year_id: string | number;
  department_id: string | number;
  class_id: string | number;
  shift_id: string | number;
  fee_head_id: string | number;
}

export interface AdmissionConfigExcelDownloadResponse {
  download_url: string;
}

// One applied group-wise config row — the "Configured" tab table.
export interface AdmissionConfigurationRow {
  academic_year: string;
  academic_year_id: number;
  department: string;
  department_id: number;
  class: string;
  class_id: number;
  shift: string;
  shift_id: number;
  group: string;
  group_id: number;
  created_at: string;
  roll_start: string;
  start_date_time: string;
  end_date_time: string;
  exam_enabled: boolean;
  exam_date_time: string | null;
  payment_ids: number[];
}

export interface AdmissionConfigurationBatchUpdatePayload {
  start_date_time: string;
  end_date_time: string;
  roll_start: string;
  exam_enabled: boolean;
  exam_date_time: string | null;
  payment_ids: number[];
}

export interface EnlistmentListItem {
  id: number;
  institute_details_id: number;
  admission_payment_id: number | null;
  board_application_id: string;
  name: string;
  board: string | null;
  passing_year: string | null;
  academic_year_id: number;
  department_id: number;
  class_id: number;
  group_id: number;
  shift_id: number;
  admission_roll: string | null;
  unique_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface EnlistmentListResponse {
  current_page: number;
  data: EnlistmentListItem[];
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
}

export interface DtParamsFilter {
  value: string;
  matchMode: string;
}

export interface FetchEnlistmentListParams {
  academic_year_id: string | number;
  department_id: string | number;
  class_id: string | number;
  dt_params: {
    first: number;
    rows: number;
    sortField: string | null;
    sortOrder: number | null;
    filters: Record<string, DtParamsFilter>;
  };
}

export const admissionFeeConfigApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    storeAdmissionFeeConfig: builder.mutation<
      any,
      StoreAdmissionFeeConfigPayload
    >({
      query: (body) => ({
        url: "/admission-fee-config",
        method: "POST",
        body,
      }),
      invalidatesTags: ["FeeAmount"],
    }),

    // Saved admission fee configs for a given academic year
    fetchAdmissionFeeConfigByYear: builder.query<
      AdmissionFeeConfigRow[],
      string | number
    >({
      query: (academicYearId) => `/admission-fee-config/by/${academicYearId}`,
      transformResponse: (r: any) => r?.payload?.data?.feeConfigs ?? [],
      providesTags: ["FeeAmount"],
    }),

    // Update a single fee config distribution row
    updateAdmissionFeeConfig: builder.mutation<
      any,
      { id: number | string; payload: UpdateAdmissionFeeConfigPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/admission-fee-config/${id}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: ["FeeAmount"],
    }),

    // Delete a fee config distribution row (and its applied students)
    deleteAdmissionFeeConfig: builder.mutation<
      any,
      DeleteAdmissionFeeConfigPayload
    >({
      query: (payload) => ({
        url: "/admission-fee-config-delete",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["FeeAmount"],
    }),

    // Full class/group/fee-head map for an institute, used to drive the
    // Admission Config screen's cascading filters.
    fetchFullMapAdmissionFeeConfig: builder.query<
      FullMapAdmissionFeeConfigRow[],
      string | number
    >({
      query: (instituteId) =>
        `/full-map/admission-fee-config?institute_id=${instituteId}`,
      transformResponse: (r: any) => r?.payload?.data?.fullMap ?? [],
      providesTags: ["FeeAmount"],
    }),

    // Groups (+ fee heads/amounts) for a fully selected academic year /
    // department / class / shift / fee head — populates the "Group Wise
    // Apply" table once all 5 filters are chosen.
    fetchAdmissionFeeConfigGroupBased: builder.query<
      AdmissionFeeConfigGroupRow[],
      FetchAdmissionFeeConfigGroupBasedParams
    >({
      query: (params) => {
        const qs = new URLSearchParams({
          academic_year_id: String(params.academic_year_id),
          department_id: String(params.department_id),
          class_id: String(params.class_id),
          shift_id: String(params.shift_id),
          fee_head_id: String(params.fee_head_id),
        }).toString();
        return `/admission-fee-config?${qs}`;
      },
      transformResponse: (r: any) => r?.payload?.data?.admissionFeeConfig ?? [],
      providesTags: ["FeeAmount"],
    }),

    // Applies the group-wise start/end/exam/roll window (the "Group Wise
    // Apply" table on the Admission Config tab). Body is an indexed FormData
    // (admission_fee_config_id[i], group_id[i], start_date_time[i],
    // end_date_time[i], exam_date_time[i], exam_enabled[i], roll_start[i],
    // file[i]) built by the caller — no fixed payload shape here since the
    // row count is dynamic.
    storeAdmissionConfiguration: builder.mutation<any, FormData>({
      query: (formData) => ({
        url: "/admission-configuration",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["FeeAmount"],
    }),

    // Generates the blank student-list excel template ("Student Template"
    // button on the Admission Config tab) and returns a URL to download it.
    downloadAdmissionConfigExcel: builder.mutation<
      AdmissionConfigExcelDownloadResponse,
      void
    >({
      query: () => ({
        url: "/admission-configuration/excelDownload",
        method: "POST",
      }),
      transformResponse: (r: any) => r?.payload?.data ?? {},
    }),

    // Applied group-wise configs (dates/roll/exam window) — the Configured tab.
    fetchAdmissionConfiguration: builder.query<
      AdmissionConfigurationRow[],
      void
    >({
      query: () => "/admission-configuration",
      transformResponse: (r: any) => r?.payload?.data?.configs ?? [],
      providesTags: ["FeeAmount"],
    }),

    // Edits a config row's start/end/roll/exam window — targets the rows by
    // their payment_ids (there's no single row id) rather than a path param.
    batchUpdateAdmissionConfiguration: builder.mutation<
      any,
      AdmissionConfigurationBatchUpdatePayload
    >({
      query: (body) => ({
        url: "/admission-configuration/batch-update",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["FeeAmount"],
    }),

    // Paginated list of enlisted admission applicants for a class — the
    // Enlistment tab. `dt_params` mirrors a PrimeVue lazy-datatable request
    // (paging/sort/filter), even though this tab only wires paging today.
    fetchEnlistmentList: builder.query<
      EnlistmentListResponse,
      FetchEnlistmentListParams
    >({
      query: (body) => ({
        url: "/admission-configuration/enlistment-list",
        method: "POST",
        body,
      }),
      transformResponse: (r: any) =>
        r?.payload?.data?.enlistment_list ?? {
          current_page: 1,
          data: [],
          from: 0,
          last_page: 1,
          per_page: 25,
          to: 0,
          total: 0,
        },
      providesTags: ["FeeAmount"],
    }),

    // Deletes selected enlistment rows. Body is FormData with `ids[]`.
    deleteEnlistmentList: builder.mutation<any, FormData>({
      query: (formData) => ({
        url: "/admission-configuration/delete-enlistment-list",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["FeeAmount"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useStoreAdmissionFeeConfigMutation,
  useFetchAdmissionFeeConfigByYearQuery,
  useUpdateAdmissionFeeConfigMutation,
  useDeleteAdmissionFeeConfigMutation,
  useFetchFullMapAdmissionFeeConfigQuery,
  useFetchAdmissionFeeConfigGroupBasedQuery,
  useDownloadAdmissionConfigExcelMutation,
  useStoreAdmissionConfigurationMutation,
  useFetchAdmissionConfigurationQuery,
  useBatchUpdateAdmissionConfigurationMutation,
  useFetchEnlistmentListQuery,
  useDeleteEnlistmentListMutation,
} = admissionFeeConfigApi;

export default admissionFeeConfigApi;
