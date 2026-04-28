import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: fetchBaseQuery({
    // baseUrl: "http://192.168.0.109:5000/api/v1",
    baseUrl: apiUrl,
    // credentials: "include",
    prepareHeaders: (headers, { getState }) => {
      // Example: get token from your auth slice
      const token = (getState() as any).auth.token;
      if (token) {
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }
      }

      // You can also set Content-Type or other headers
      headers.set("Content-Type", "application/json");

      return headers;
    },
  }),
  tagTypes: [
    "AuthUser",
    "Institute",
    "Payments",
    "Invoices",
    "Payable",
    "GeneralConfigs",
  ],

  endpoints: () => ({}),
  keepUnusedDataFor: 0,
  refetchOnMountOrArgChange: true,
});
