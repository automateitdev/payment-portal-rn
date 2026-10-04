import { baseApi } from "@/redux/baseApi/baseApi";

export interface LeaveReason {
  id: number;
  institute_details_id?: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface LeaveReasonsResponse {
  errors: unknown;
  message: string;
  status_code: number;
  payload: {
    data: {
      status: string;
      message: string;
      payload: LeaveReason[];
    };
  };
}

export const leaveApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLeaveReasons: builder.query<LeaveReason[], void>({
      query: () => ({
        url: "/leave-reasons",
        method: "GET",
      }),
      transformResponse: (response: LeaveReasonsResponse) => {
        return response?.payload?.data?.payload || [];
      },
      providesTags: ["Leave"],
    }),
    applyLeave: builder.mutation<any, FormData>({
      query: (formData) => ({
        url: "/leave-applications",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Leave"],
    }),
  }),
  overrideExisting: true,
});

export const { useGetLeaveReasonsQuery, useApplyLeaveMutation } = leaveApi;
