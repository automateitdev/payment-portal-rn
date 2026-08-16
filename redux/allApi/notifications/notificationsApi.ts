import { baseApi } from "@/redux/baseApi/baseApi";

export interface NotificationItem {
  id: string;
  type: string;
  read_at: string | null;
  created_at: string;
  data: {
    pay_invoice_id?: number;
    amount_paid?: number;
    severity?: "success" | "error" | "info" | "warning";
    message?: string;
  };
}

interface NotificationsResult {
  list: NotificationItem[];
  unreadCount: number;
}

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    fetchNotifications: builder.query<NotificationsResult, void>({
      query: () => ({
        url: "/payment-portal/notifications",
      }),
      transformResponse: (response: any) => {
        const payload = response?.payload?.data;
        return {
          list: payload?.payload?.data || [],
          unreadCount: payload?.unread_count || 0,
        };
      },
      providesTags: ["Notifications"],
    }),

    markNotificationRead: builder.mutation<void, string>({
      query: (id) => ({
        url: `/payment-portal/notifications/${id}/read`,
        method: "POST",
      }),
      invalidatesTags: ["Notifications"],
    }),

    markAllNotificationsRead: builder.mutation<void, void>({
      query: () => ({
        url: "/payment-portal/notifications/read-all",
        method: "POST",
      }),
      invalidatesTags: ["Notifications"],
    }),

    clearAllNotifications: builder.mutation<void, void>({
      query: () => ({
        url: "/payment-portal/notifications",
        method: "DELETE",
      }),
      invalidatesTags: ["Notifications"],
    }),
  }),
});

export const {
  useFetchNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useClearAllNotificationsMutation,
} = notificationsApi;
