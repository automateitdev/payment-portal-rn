import { baseApi } from "@/redux/baseApi/baseApi";

export interface AdmissionInvoiceFundDetail {
  id: number;
  fund_id?: number;
  fund_name: string;
  feehead_name: string;
  fund_amount: string | number;
  fund_percentage?: number;
  default_fee_amount?: number;
  effective_fee_amount?: number;
  [key: string]: any;
}

export interface AdmissionInvoiceData {
  unique_number: string;
  applicant_name?: string;
  assigned_roll?: number | string;
  invoice?: string;
  trx_id?: string;
  transaction_date?: string;
  payable_amount?: string | number;
  payment_amount?: string | number;
  software_fee?: number;
  status?: number | string;
  msg?: string;
  academic_year?: string;
  class?: string;
  group?: string;
  shift?: string;
  department?: string;
  amount: string | number;
  [key: string]: any;
}

export interface AdmissionInstituteWiseConfig {
  id: number;
  key: string;
  value: string;
  short_name: string;
}

export interface AdmissionPaymentInvoice {
  status: string;
  payment_url: string | null;
  custom_student_id: string | null;
  invoice_data: AdmissionInvoiceData | null;
  fund_details: AdmissionInvoiceFundDetail[];
  institute_details: Record<string, any> | null;
  institute_wise_config: AdmissionInstituteWiseConfig[];
}

export const admissionPaymentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /student-admission-invoice/{unique_number}
    getAdmissionPaymentInvoice: builder.query<AdmissionPaymentInvoice, string>({
      query: (uniqueNumber) => `/student-admission-invoice/${uniqueNumber}`,
      transformResponse: (r: any) => {
        const data = r?.payload?.data ?? {};
        return {
          status: data.status,
          payment_url: data.payment_url ?? null,
          custom_student_id:
            data.custom_student_id ??
            data.invoice_data?.custom_student_id ??
            null,
          invoice_data: data.invoice_data ?? null,
          fund_details: data.fund_details ?? [],
          institute_details: data.institute_details ?? null,
          institute_wise_config: Array.isArray(data.institute_wise_config)
            ? data.institute_wise_config
            : [],
        };
      },
    }),

    // POST payment-for-admission — kicks off the gateway redirect. `gateway`
    // is the picked/defaulted gateway `type` (e.g. "SPG") from the preview
    // endpoint's `gateways[]` list.
    sendAdmissionPayment: builder.mutation<
      { status: string; message: string; payment_url: string | null },
      {
        unique_number: string;
        gateway?: string | null;
        admission_fee?: string | number | null;
        software_fee?: string | number | null;
        url?: string | null;
      }
    >({
      query: (body) => ({ url: "payment-for-admission", method: "POST", body }),
      transformResponse: (r: any) => r?.payload?.data ?? r,
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAdmissionPaymentInvoiceQuery,
  useLazyGetAdmissionPaymentInvoiceQuery,
  useSendAdmissionPaymentMutation,
} = admissionPaymentApi;

export default admissionPaymentApi;
