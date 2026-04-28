import { baseApi } from "@/redux/baseApi/baseApi";

const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    loginUser: builder.mutation({
      query: (data) => ({
        url: "/payment-portal/student-login",
        method: "POST",
        body: data,
      }),
    }),
    getInstituteInfo: builder.query({
      query: () => "/payment-portal/auth-user",
      providesTags: ["Institute"],
    }),
  }),
});

export const { useLoginUserMutation, useGetInstituteInfoQuery } = authApi;
