// import { baseApi } from "@/redux/baseApi/baseApi";

// export const paymentApi = baseApi.injectEndpoints({
//   endpoints: (builder) => ({
//     fetchPayableList: builder.query({
//       query: ({ page = 1, per_page = 20 } = {}) => ({
//         url: "/payment-portal/payment-search",
//         params: { page, per_page },
//       }),
//       transformResponse: (response) => {
//         const data = response.payload?.data;
//         return {
//           chargeSetup: data?.charge_setup || null,
//           chargeList: data?.all_charges || [],
//           payableList: (data?.all_payments?.processed_payments || []).map(
//             (feeHead) => ({
//               ...feeHead,
//               selectedSubheads: [],
//               fee_subheads: feeHead.fee_subheads.map((subhead) => ({
//                 ...subhead,
//                 due_amount: parseFloat(subhead.due_amount) || 0,
//               })),
//             }),
//           ),
//           grandTotal: data?.all_payments?.grand_total || 0,
//         };
//       },
//       providesTags: ["Payments"],
//     }),

//     paymentRequest: builder.mutation({
//       query: (formData) => ({
//         url: "/payment-portal/payment-create",
//         method: "POST",
//         body: formData,
//         responseHandler: async (response) => {
//           // Handle text/html responses
//           const contentType = response.headers.get("content-type");
//           if (contentType?.includes("application/json")) {
//             return response.json();
//           } else if (contentType?.includes("text/html")) {
//             return { html: await response.text(), status: "success" };
//           }
//           return { status: false, error: "Unexpected response type" };
//         },
//       }),
//       invalidatesTags: ["Payments"],
//     }),

//     fetchInvoices: builder.query({
//       query: ({ academic_year_id, student_id }) => ({
//         url: "/payment-portal/payment-invoice-show",
//         params: { academic_year_id, student_id },
//       }),
//       transformResponse: (response) => {
//         const data = response.payload?.data;
//         return data?.enlistment_list?.data || [];
//       },
//       providesTags: ["Invoices"],
//     }),
//     paymentSearch: builder.query({
//       query: (data) => ({
//         url: "/payment-portal/payment-search",
//         data,
//       }),
//       providesTags: ["Payable"],
//     }),
//   }),
//   overrideExisting: false,
// });
// export const {
//   useFetchPayableListQuery,
//   usePaymentRequestMutation,
//   useFetchInvoicesQuery,
//   usePaymentSearchQuery,
// } = paymentApi;
// src/redux/allApi/payments/paymentApi.ts

import { baseApi } from "@/redux/baseApi/baseApi";

interface PaymentRequestData {
  payapplies_id: number[];
  amount: number[];
  gateway?: string | null;
}

interface PaymentResponse {
  status: "success" | "error";
  message?: string;
  payment_url?: string;
  html?: string;
  error?: string;
  transaction_id?: string;
  invoice_no?: string;
  amount_paid?: number;
  payment_date?: string;
}

interface PaymentSuccessData {
  transaction_id: string;
  invoice_no: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  status: "completed" | "pending" | "failed";
}

interface PaymentFailureData {
  error_code: string;
  error_message: string;
  transaction_id?: string;
  retry_url?: string;
}

export const paymentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // fetchPayableList: builder.query({
    //   query: ({ page = 1, per_page = 20 } = {}) => ({
    //     url: "/payment-portal/payment-search",
    //     params: { page, per_page },
    //   }),
    //   keepUnusedDataFor: 0, // ✅ no cache
    //   transformResponse: (response) => {
    //     const data = response.payload?.data;
    //     return {
    //       chargeSetup: data?.charge_setup || null,
    //       chargeList: data?.all_charges || [],
    //       payableList: (data?.all_payments?.processed_payments || []).map(
    //         (feeHead) => ({
    //           ...feeHead,
    //           selectedSubheads: [],
    //           fee_subheads: feeHead.fee_subheads.map((subhead) => ({
    //             ...subhead,
    //             due_amount: parseFloat(subhead.due_amount) || 0,
    //           })),
    //         }),
    //       ),
    //       grandTotal: data?.all_payments?.grand_total || 0,
    //       paymentSetting: data?.paymentSetting || "Due Upto Current Date",
    //     };
    //   },
    //   providesTags: ["Payments"],
    // }),

    paymentRequest: builder.mutation<PaymentResponse, PaymentRequestData>({
      query: (formData) => ({
        url: "/payment-portal/payment-create",
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }),
      transformResponse: (response: any) => {
        const data = response.payload?.data || response;

        // Handle different response formats
        if (data.payment_url) {
          return {
            status: "success" as const,
            payment_url: data.payment_url,
            message: data.message,
            transaction_id: data.transaction_id,
            invoice_no: data.invoice_no,
            amount_paid: data.amount_paid,
          };
        } else if (data.html) {
          return {
            status: "success" as const,
            html: data.html,
            message: data.message,
          };
        } else if (data.error) {
          return {
            status: "error" as const,
            error: data.error,
            message: data.message,
          };
        }

        return {
          status: data.status || "error",
          message: data.message,
          error: data.error,
        };
      },
      invalidatesTags: ["Payments"],
    }),

    checkPaymentStatus: builder.query<
      PaymentSuccessData,
      { transaction_id: string }
    >({
      query: ({ transaction_id }) => ({
        url: "/payment-portal/payment-status",
        params: { transaction_id },
      }),
      keepUnusedDataFor: 0, // ✅ important for real-time status

      transformResponse: (response: any) => {
        const data = response.payload?.data || response;
        return {
          transaction_id: data.transaction_id,
          invoice_no: data.invoice_no,
          amount_paid: data.amount_paid,
          payment_date: data.payment_date,
          payment_method: data.payment_method,
          status: data.status,
        };
      },
    }),

    fetchInvoices: builder.query({
      query: ({ academic_year_id, student_id }) => ({
        url: "/payment-portal/payment-invoice-show",
        params: { academic_year_id, student_id },
      }),
      keepUnusedDataFor: 0,

      transformResponse: (response) => {
        const data = response.payload?.data;
        return data?.enlistment_list?.data || [];
      },
      providesTags: ["Invoices"],
    }),

    paymentSearch: builder.query({
      query: (data) => ({
        url: "/payment-portal/payment-search",
        params: data,
      }),
      keepUnusedDataFor: 0,

      providesTags: ["Payable"],
    }),

    // fetchGatewayList: builder.query({
    //   query: () => ({
    //     url: "/gateway-list",
    //   }),
    //   keepUnusedDataFor: 0,
    //   transformResponse: (response: any) => {
    //     return response.payload?.data?.gatewayList || [];
    //   },
    // }),
    fetchGatewayList: builder.query({
      query: () => ({
        url: "/payment-portal/gateway-list-by-institute",
      }),
      keepUnusedDataFor: 0,
      transformResponse: (response: any) => {
        return response.payload?.data?.gatewayList || [];
      },
    }),
  }),
});

export const {
  // useFetchPayableListQuery,
  usePaymentRequestMutation,
  useCheckPaymentStatusQuery,
  useFetchInvoicesQuery,
  usePaymentSearchQuery,
  useFetchGatewayListQuery,
} = paymentApi;
