import { baseApi } from "@/redux/baseApi/baseApi";

interface GeneralConfig {
  student_attendance_type: string | null;
  hr_attendance_type: string | null;
  student_portal_profile_edit: string | null;
  student_online_payment_setting: string | null;
  fees_payment_by_web: string | null;
  online_admission_web: string | null;
  allow_duplicate_roll: string | null;
  backdated_fee_collection: string | null;
  send_reciept_link: string | null;
  real_time_present_sms: string | null;
  sms_type: string | null;
  collection_sms: string | null;
  payment_portal_receipt_type: string | null;
  quick_collection_receipt_type: string | null;
}

interface GeneralConfigResponse {
  status: string;
  message: string;
  payload: {
    data: {
      institute_wise_config: Array<{
        id: number;
        short_name: string;
        value: string | null;
        institute_id: number;
      }>;
    };
  };
}

export const generalConfigApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGeneralConfigs: builder.query<GeneralConfig, void>({
      query: () => ({
        url: "/payment-portal/general-config-index",
        method: "GET",
      }),
      keepUnusedDataFor: 0,
      transformResponse: (response: GeneralConfigResponse) => {
        const { institute_wise_config } = response.payload.data;

        // Initialize config object with all null values
        const config: GeneralConfig = {
          student_attendance_type: null,
          hr_attendance_type: null,
          student_portal_profile_edit: null,
          student_online_payment_setting: null,
          fees_payment_by_web: null,
          online_admission_web: null,
          allow_duplicate_roll: null,
          backdated_fee_collection: null,
          send_reciept_link: null,
          real_time_present_sms: null,
          sms_type: null,
          collection_sms: null,
          payment_portal_receipt_type: null,
          quick_collection_receipt_type: null,
        };

        // Map config values by short_name
        institute_wise_config.forEach((item) => {
          const { short_name, value } = item;
          if (short_name in config) {
            (config as any)[short_name] = value;
          }
        });

        return config;
      },
      // providesTags: ["GeneralConfigs"],
    }),
  }),
});

export const { useGetGeneralConfigsQuery } = generalConfigApi;
