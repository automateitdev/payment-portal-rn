import { baseApi } from "@/redux/baseApi/baseApi";
import { decodeUnicode } from "@/utils/unicodeDecodedCode";

export interface DivisionData {
  id: number;
  name: string;
  bn_name: string;
  lat: string;
  long: string;
}

export interface DistrictData {
  id: number;
  name: string;
  bn_name: string;
  [key: string]: any;
}

export interface UpazillaData {
  id: number;
  name: string;
  bn_name: string;
  [key: string]: any;
}

export const geographyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDivisions: builder.query<DivisionData[], void>({
      query: () => `/divisions-data`,
      transformResponse: (r: any) => {
        const divisions =
          r?.payload?.data?.divisions ?? r?.payload?.data ?? r ?? [];
        return divisions.map((d: any) => ({
          ...d,
          bn_name: decodeUnicode(d.bn_name),
        }));
      },
    }),

    getDistricts: builder.query<DistrictData[], string | number>({
      query: (divisionId) => `/district-data/${divisionId}`,
      transformResponse: (r: any) => {
        const districts = r?.payload?.data?.districts ?? [];
        return districts.map((d: any) => ({
          ...d,
          bn_name: decodeUnicode(d.bn_name),
        }));
      },
    }),

    getUpazillas: builder.query<UpazillaData[], string | number>({
      query: (districtId) => `/upozila-data/${districtId}`,
      transformResponse: (r: any) => {
        const upazillas = r?.payload?.data?.upazilas ?? [];
        return upazillas.map((u: any) => ({
          ...u,
          bn_name: decodeUnicode(u.bn_name),
        }));
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetDivisionsQuery,
  useGetDistrictsQuery,
  useGetUpazillasQuery,
} = geographyApi;

export default geographyApi;
