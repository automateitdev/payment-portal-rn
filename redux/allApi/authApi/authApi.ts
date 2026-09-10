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
    // Public lookup used by the Open Payment flow to verify an institute
    // before letting a guest continue. Returns 404 "Institute not found."
    // for an unknown id.
    lookupInstitute: builder.query<any, string>({
      query: (instituteId) => `/institute-lookup/${instituteId}`,
    }),
  }),
});

export const {
  useLoginUserMutation,
  useGetInstituteInfoQuery,
  useLazyLookupInstituteQuery,
} = authApi;
