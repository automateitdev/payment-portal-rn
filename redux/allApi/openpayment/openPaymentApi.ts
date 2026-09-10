import { baseApi } from "@/redux/baseApi/baseApi";

/**
 * Public Open Payment endpoints (no auth required).
 * Base URL already includes `/api`, so paths are relative to that.
 */
const openPaymentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Initial page load: institute info, academic years, config.
    getOpenPaymentInfo: build.query<any, { instituteId: string }>({
      query: ({ instituteId }) => `/open-payment/${instituteId}/info`,
    }),

    // Fee heads for the selected academic year.
    getOpenPaymentFeeHeads: build.query<
      any,
      { instituteId: string; academic_year: string }
    >({
      query: ({ instituteId, academic_year }) => ({
        url: `/open-payment/${instituteId}/fee-heads`,
        params: { academic_year },
      }),
    }),

    // Setup details for a student (fired on Search) — POST with FormData.
    getOpenPaymentSetupDetails: build.mutation<
      any,
      {
        instituteId: string;
        academic_year: string;
        fee_head: string;
        student_id: string;
      }
    >({
      query: ({ instituteId, academic_year, fee_head, student_id }) => {
        const formData = new FormData();
        formData.append("academic_year", academic_year);
        formData.append("fee_head", fee_head);
        formData.append("student_id", student_id);
        return {
          url: `/open-payment/${instituteId}/setups`,
          method: "POST",
          body: formData,
        };
      },
    }),

    // Validate before payment — POST FormData. Returns amount_details
    // (base_payment, charge_amount, total_payment, ...).
    validateOpenPayment: build.mutation<
      any,
      {
        instituteId: string;
        setup_id: string | number;
        student_id: string;
        name: string;
        mobile: string;
        academic_year: string;
        amount: string | number;
        session?: string;
        department?: string;
        class?: string;
        roll?: string;
        group?: string;
      }
    >({
      query: ({ instituteId, ...fields }) => {
        const formData = new FormData();
        Object.entries(fields).forEach(([key, value]) => {
          formData.append(key, value == null ? "" : String(value));
        });
        return {
          url: `/open-payment/${instituteId}/validate/payment`,
          method: "POST",
          body: formData,
        };
      },
    }),

    // Open payment rule types (Any Id / Fixed Id) for fee configuration.
    getOpenPaymentRules: build.query<any, void>({
      query: () => `/open-payment/rules`,
    }),

    // Fees-management startup data (academic years, fee heads, funds, ledgers…).
    getFeesStartup: build.query<any, void>({
      query: () => `/fees-management/startup`,
    }),

    // Invoice search — scoped to an institute id.
    // GET /open-payment/:instituteId/invoice-search?invoice_search=<term>
    getOpenPaymentInvoices: build.query<
      any,
      { instituteId: string; invoice_search: string }
    >({
      query: ({ instituteId, invoice_search }) => ({
        url: `/open-payment/${instituteId}/invoice-search`,
        params: { invoice_search },
      }),
    }),

    // Create a new open-payment setup (fee configure form).
    createOpenPaymentSetup: build.mutation<any, FormData>({
      query: (body) => ({
        url: `/open-payment/setup`,
        method: "POST",
        body,
      }),
    }),

    // List all open-payment setups (fee configure admin list).
    getOpenPaymentSetupList: build.query<any, void>({
      query: () => `/open-payment/setup`,
    }),

    // Update enrolled students for a setup. The API expects the students wrapped
    // in an object with a "students" key.
    updateOpenPaymentStudents: build.mutation<
      any,
      { id: number | string; students: any[] }
    >({
      query: ({ id, students }) => ({
        url: `/open-payment/update-students/${id}`,
        method: "POST",
        body: { students },
      }),
    }),

    // Delete one or more enrolled students from a setup.
    deleteOpenPaymentStudents: build.mutation<
      any,
      { id: number | string; students: { student_id: string | number }[] }
    >({
      query: ({ id, students }) => ({
        url: `/open-payment/setup/${id}/students/delete`,
        method: "POST",
        body: { students },
      }),
    }),

    // Create the payment at the gateway — returns { token, payment_url }.
    makeOpenPayment: build.mutation<
      any,
      {
        instituteId: string;
        gateway: string;
        setup_id: string | number;
        student_id: string;
        base_amount: number;
        total_amount: number;
      }
    >({
      query: ({ instituteId, ...body }) => ({
        url: `/open-payment/${instituteId}/make-payment`,
        method: "POST",
        body,
      }),
    }),
    // Update an existing open-payment setup.
    updateOpenPaymentSetup: build.mutation<any, { id: number | string; body: any }>({
      query: ({ id, body }) => ({
        url: `/open-payment/setup/${id}`,
        method: "POST",
        body,
      }),
    }),

    addOpenPaymentStudents: build.mutation<any, { id: number | string; body: any }>({
      query: ({ id, body }) => ({
        url: `/open-payment/setup/${id}/students`,
        method: "POST",
        body,
      }),
    }),

    // Delete an open-payment setup.
    deleteOpenPaymentSetup: build.mutation<any, number | string>({
      query: (id) => ({
        url: `/open-payment/setup/${id}/delete`,
        method: "DELETE",
      }),
    }),

    // Get transaction report.
    getTransactionReport: build.mutation<any, any>({
      query: (body) => ({
        url: `/open-payment/report/transaction`,
        method: "POST",
        body,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetOpenPaymentInfoQuery,
  useGetOpenPaymentFeeHeadsQuery,
  useGetOpenPaymentSetupDetailsMutation,
  useValidateOpenPaymentMutation,
  useMakeOpenPaymentMutation,
  useLazyGetOpenPaymentInvoicesQuery,
  useGetOpenPaymentRulesQuery,
  useGetFeesStartupQuery,
  useCreateOpenPaymentSetupMutation,
  useGetOpenPaymentSetupListQuery,
  useUpdateOpenPaymentStudentsMutation,
  useDeleteOpenPaymentStudentsMutation,
  useUpdateOpenPaymentSetupMutation,
  useAddOpenPaymentStudentsMutation,
  useDeleteOpenPaymentSetupMutation,
  useGetTransactionReportMutation,
} = openPaymentApi;

export default openPaymentApi;
