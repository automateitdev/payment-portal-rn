import { showMessage } from "@/components/shared/CustomToast/message";
import { useGetInstituteInfoQuery } from "@/redux/allApi/authApi/authApi";
import { useGetGeneralConfigsQuery } from "@/redux/allApi/generalConfigApi/generalConfigApi";
import {
  useFetchGatewayListQuery,
  usePaymentRequestMutation,
  usePaymentSearchQuery,
} from "@/redux/allApi/invoices/invoicesApi";
import { useAppSelector } from "@/redux/hook";
import { RootState } from "@/redux/store";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import CheckBox from "expo-checkbox";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Collapsible from "react-native-collapsible";

interface FeeSubhead {
  payapplies_id: number;
  feesubhead: string;
  feesubhead_id: number;
  academic_year_id: number;
  academic_year: string;
  payable_date: string;
  payable_amount: string;
  fine: number;
  fine_paid_amount: string;
  waiver: string | null;
  waiver_amount: number;
  payapply_state: string;
  previous_paid: string;
  previous_due: string;
  calculated_amount: number;
  partial_payment?: number;
}

interface FeeHead {
  id: number;
  fee_head_name: string;
  total_payable_feeheadwise: number;
  fee_subheads: FeeSubhead[];
}

interface ChargeSetup {
  id: number;
  title: string;
  calculation_type: "percentage" | "fixed";
  amount: string;
}

interface PaymentData {
  errors: any;
  status: "success";
  charge_setup: ChargeSetup;
  all_charges: {
  all_charges: {
    id: number;
    amount: string;
  }[];
  }[];
  all_payments: {
    processed_payments: FeeHead[];
    base_total: number;
    grand_total: number;
    total_waiver: number;
    total_fine: number;
    total_paid: number;
  };
  paymentSetting: string;
}

const AvailablePayment = () => {
  const router = useRouter();
  const themeMode = useAppSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === "dark";
  const [expandedRows, setExpandedRows] = useState<{ [key: number]: boolean }>(
    {},
  );
  const [selectedFeesubheads, setSelectedFeesubheads] = useState<{
    [key: number]: FeeSubhead[];
  }>({});
  const [autoSelectedSubheads, setAutoSelectedSubheads] = useState<{
    [key: number]: FeeSubhead[];
  }>({});
  const [confirmPaymentDialog, setConfirmPaymentDialog] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { data: instituteData } = useGetInstituteInfoQuery({});
  const [partialInputs, setPartialInputs] = useState<{ [key: string]: string }>(
    {},
  );
  const {
    data: paymentSearch,
    isLoading,
    refetch: refetchPayment,
  } = usePaymentSearchQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const {
    data: generalConfigs,
    isLoading: isConfigLoading,
    refetch: refetchConfigs,
  } = useGetGeneralConfigsQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const userData = instituteData?.payload?.data?.user || {};
  const paymentData: PaymentData = paymentSearch?.payload?.data;
  const { data: gatewayList = [] } = useFetchGatewayListQuery(undefined);
  const [paymentRequest, { isLoading: isPaymentProcessing }] =
    usePaymentRequestMutation();
  // const noticeBoard = [
  //   "সম্মানিত অভিভাবকবৃন্দের অবগতির জন্য জানানো যাচ্ছে যে, ইয়ার ক্লোজিং কার্যক্রমের কারণে আগামী ৩০ ও ৩১ ডিসেম্বর ২০২৫ ইং তারিখে স্কুলের সকল ধরনের ট্রানজেকশন সাময়িকভাবে বন্ধ থাকবে। আগামী ১ জানুয়ারি ২০২৬ ইং তারিখ থেকে সকল ধরনের ট্রানজেকশন পুনরায় চালু থাকবে।",
  // ];

  const feeHeads = paymentData?.all_payments?.processed_payments || [];
  const chargeSetup = paymentData?.charge_setup;
  const chargeList = paymentData?.all_charges || [];
  // const student_online_payment_setting = paymentData?.paymentSetting;

  const fees_payment_by_web = generalConfigs?.fees_payment_by_web;
  const student_online_payment_setting =
    generalConfigs?.student_online_payment_setting;
  // const fees_payment_by_web = "yes";

  useEffect(() => {
    if (feeHeads.length > 0 && student_online_payment_setting) {
      const today = dayjs().format("YYYY-MM-DD");
      const newAutoSelected: { [key: number]: FeeSubhead[] } = {};
      const newSelected: { [key: number]: FeeSubhead[] } = {};

      feeHeads.forEach((feeHead) => {
        const autoSelected = feeHead.fee_subheads.filter(
          (subhead) =>
            subhead.payable_date &&
            (dayjs(subhead.payable_date).isSame(today, "day") ||
              dayjs(subhead.payable_date).isBefore(today, "day")),
        );

        newAutoSelected[feeHead.id] = autoSelected;
        newSelected[feeHead.id] = [...autoSelected];
      });

      setAutoSelectedSubheads(newAutoSelected);
      setSelectedFeesubheads(newSelected);
    }
  }, [feeHeads, student_online_payment_setting]);
  }, [feeHeads, student_online_payment_setting]);

  useEffect(() => {
    if (gatewayList && gatewayList.length === 1) {
      setSelectedGateway(gatewayList[0].type);
    }
  }, [gatewayList]);

  const formatCurrency = (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return isNaN(num)
      ? "0.00"
      : num.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  };

  const totalCalculatedAmount = useMemo(() => {
    let total = 0;
    for (const feeheadId in selectedFeesubheads) {
      const subheads = selectedFeesubheads[Number(feeheadId)];
      if (Array.isArray(subheads)) {
        for (const item of subheads) {
          const amount =
            item.partial_payment != null && !isNaN(item.partial_payment)
              ? Number(item.partial_payment)
              : Number(item.calculated_amount || 0);
          total += amount;
        }
      }
    }
    return total;
  }, [selectedFeesubheads]);

  const getPayableAmount = (
    feeHeadId: number,
    amount_type: keyof FeeSubhead | "current_due",
  ) => {
    const subheads = selectedFeesubheads[feeHeadId];
    if (!Array.isArray(subheads)) return "0.00";

    // Handle current_due specially since it's not in FeeSubhead interface
    if (amount_type === "current_due") {
      return subheads
        .reduce((sum, subhead) => {
          const due = getCurrentDue(subhead);
          return sum + parseFloat(due);
        }, 0)
        .toFixed(2);
    }

    // Handle other amount types
    return subheads
      .reduce((sum, subhead) => {
        let amount = 0;
        if (amount_type === "calculated_amount") {
          const partial = subhead.partial_payment;
          if (partial !== undefined && partial !== null) {
            amount = Number(partial) || 0;
          } else {
            amount = Number(subhead.calculated_amount) || 0;
          }
        } else {
          amount = Number(subhead[amount_type]) || 0;
        }
        return sum + amount;
      }, 0)
      .toFixed(2);
  };
  const getCurrentDue = (data: FeeSubhead) => {
    if (!data.partial_payment) return "0.00";
    const current_due =
      parseFloat(data.calculated_amount.toString()) -
      parseFloat(data.partial_payment.toString());
    return current_due.toFixed(2);
  };

  const toggleRow = (id: number) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // ডাটা রিফ্রেশ করো
      await refetchPayment().unwrap(); // RTK Query-এর refetch
      // Optional: institute info-ও রিফ্রেশ করতে চাইলে
      // await refetchInstitute().unwrap();  (যদি useGetInstituteInfoQuery-এর refetch নাও)
    } catch (err) {
      console.error("Refresh failed:", err);
      // Optional: ইউজারকে ছোট্ট টোস্ট দেখাতে পারো
      Alert.alert("Refresh Failed", "Couldn't update data. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };
  const handleSubheadSelect = (
    feeHeadId: number,
    subhead: FeeSubhead,
    isSelected: boolean,
  ) => {
    const currentSelected = selectedFeesubheads[feeHeadId] || [];
    const autoSelected = autoSelectedSubheads[feeHeadId] || [];
    const isAutoSelected = autoSelected.some(
      (item) => item.payapplies_id === subhead.payapplies_id,
    );

    // If it's auto-selected, don't allow deselecting
    if (isAutoSelected && !isSelected) {
      return;
    }

    let newSelected;
    if (isSelected) {
      newSelected = [...currentSelected, subhead];
    } else {
      newSelected = currentSelected.filter(
        (item) => item.payapplies_id !== subhead.payapplies_id,
      );
    }

    // Ensure auto-selected items are always included
    const finalSelected = [
      ...newSelected.filter(
        (item) =>
          !autoSelected.some(
            (auto) => auto.payapplies_id === item.payapplies_id,
          ),
      ),
      ...autoSelected,
    ];

    setSelectedFeesubheads((prev) => ({
      ...prev,
      [feeHeadId]: finalSelected,
    }));
  };

  const handlePartialPaymentChange = (
    feeHeadId: number,
    subheadId: number,
    value: string,
  ) => {
    if (
      student_online_payment_setting?.toLowerCase() !==
      "partial payment on subhead"
    ) {
      return;
    }
    const numValue = parseFloat(value) || 0;
    const subheads = selectedFeesubheads[feeHeadId] || [];

    const updatedSubheads = subheads.map((subhead) => {
      if (subhead.payapplies_id === subheadId) {
        return {
          ...subhead,
          partial_payment: numValue,
        };
      }
      return subhead;
    });

    setSelectedFeesubheads((prev) => ({
      ...prev,
      [feeHeadId]: updatedSubheads,
    }));
  };

  const isLockedRow = (feeHeadId: number, subhead: FeeSubhead) => {
    return autoSelectedSubheads[feeHeadId]?.some(
      (item) => item.payapplies_id === subhead.payapplies_id,
    );
  };

  const paymentConfirmation = () => {
    if (totalCalculatedAmount <= 0) {
      Alert.alert("Error", "Please select at least one fee to pay");
      return;
    }
    setConfirmPaymentDialog(true);
  };

  const proceedPayment = async () => {
    try {
      // Prepare payment data
      const paymentRequestData = {
        payapplies_id: [] as number[],
        amount: [] as number[],
        gateway: selectedGateway,
      };

      for (const feeHeadId in selectedFeesubheads) {
        const subheads = selectedFeesubheads[Number(feeHeadId)];
        if (Array.isArray(subheads)) {
          subheads.forEach((subhead) => {
            paymentRequestData.payapplies_id.push(subhead.payapplies_id);
            const amount =
              subhead.partial_payment != null && !isNaN(subhead.partial_payment)
                ? Number(subhead.partial_payment)
                : Number(subhead.calculated_amount || 0);
            paymentRequestData.amount.push(amount);
          });
        }
      }
      // Call the payment API
      const response = await paymentRequest(paymentRequestData).unwrap();

      if (response.status === "success") {
        if (response.html) {
          if (Platform.OS === "web") {
            // On web, we might want to handle HTML form differently if it's a POST
            // But usually, redirecting to a payment URL is preferred.
            // If the API returns HTML, it usually expects a self-submitting form.
            // For now, let's assume we can use the payment_url if it exists,
            // For now, let's assume we can use the payment_url if it exists,
            // or we might need to render the HTML.
            if (response.payment_url) {
              window.location.href = response.payment_url;
              return;
            }
          }

          router.push({
            pathname: "/payments/available_payment/paymentwebview",
            params: {
              payment_url: response.payment_url || "about:blank",
              transaction_id: response.transaction_id || `HTML_${Date.now()}`,
              amount: totalCalculatedAmount.toString(),
              html_content: response.html,
            },
          });
        }
        // Case 2: Direct URL (SSLCommerz, bKash, etc.)
        else if (response.payment_url) {
          if (Platform.OS === "web") {
            window.location.href = response.payment_url;
            return;
          }

          router.push({
            pathname: "/payments/available_payment/paymentwebview",
            params: {
              payment_url: response.payment_url,
              transaction_id: response.transaction_id,
              amount: totalCalculatedAmount.toString(),
            },
          });
        }
        // Case 3: Direct success
        else {
          router.push({
            pathname: "/payments/available_payment/success",
            params: {
              transaction_id: response.transaction_id || Date.now().toString(),
              invoice_no: response.invoice_no || `INV-${Date.now()}`,
              amount_paid: totalCalculatedAmount.toString(),
              payment_date: new Date().toISOString(),
              message: response.message || "Payment completed successfully",
            },
          });
        }
      } else {
        // Payment failed
        router.push({
          pathname: "/payments/available_payment/fail",
          params: {
            error_message:
              response.error || "Payment failed. Please try again.",
            transaction_id: response.transaction_id || "",
            amount: totalCalculatedAmount.toString(),
          },
        });
      }

      setConfirmPaymentDialog(false);
    } catch (error: any) {
      setConfirmPaymentDialog(false);
      console.log("Payment Error Context:", error);

      let errorMessage = "Failed to process payment. Please try again.";

      // 1. Handle nested errors object (e.g., system_error, exam_error, etc.)
      if (error?.data?.errors) {
        const errors = error.data.errors;
        const messages: string[] = [];

        Object.keys(errors).forEach((key) => {
          const errorArray = errors[key];
          if (Array.isArray(errorArray)) {
            errorArray.forEach((err: any) => {
              if (err?.message) messages.push(err.message);
              else if (typeof err === "string") messages.push(err);
            });
          } else if (typeof errorArray === "string") {
            messages.push(errorArray);
          }
        });
      // 1. Handle nested errors object (e.g., system_error, exam_error, etc.)
      if (error?.data?.errors) {
        const errors = error.data.errors;
        const messages: string[] = [];

        Object.keys(errors).forEach((key) => {
          const errorArray = errors[key];
          if (Array.isArray(errorArray)) {
            errorArray.forEach((err: any) => {
              if (err?.message) messages.push(err.message);
              else if (typeof err === "string") messages.push(err);
            });
          } else if (typeof errorArray === "string") {
            messages.push(errorArray);
          }
        });

        if (messages.length > 0) {
          errorMessage = messages.join("\n");
        }
      }
      // 2. Handle direct system_error if not nested in errors
      else if (error?.data?.system_error) {
        if (Array.isArray(error.data.system_error)) {
          errorMessage = error.data.system_error
            .map((e: any) => e.message || e)
            .join("\n");
        } else {
          errorMessage = error.data.system_error;
          errorMessage = messages.join("\n");
        }
      }
      // 2. Handle direct system_error if not nested in errors
      else if (error?.data?.system_error) {
        if (Array.isArray(error.data.system_error)) {
          errorMessage = error.data.system_error
            .map((e: any) => e.message || e)
            .join("\n");
        } else {
          errorMessage = error.data.system_error;
        }
      }
      // 3. Fallback to other common fields
      // 3. Fallback to other common fields
      else if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.data?.error) {
        errorMessage = error.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      showMessage("error", "Payment Error", errorMessage);
      showMessage("error", "Payment Error", errorMessage);
    }
  };
  const totalChargeAmount = useMemo(() => {
    return chargeList.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
  }, [chargeList]);

  // Render fee head item
  const renderFeeHeadItem = ({ item }: { item: FeeHead }) => {
    const isExpanded = expandedRows[item.id] || false;
    const selectedSubheads = selectedFeesubheads[item.id] || [];

    return (
      <View className="mb-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {/* Fee Head Header */}
        <TouchableOpacity
          onPress={() => toggleRow(item.id)}
          className="flex-row items-center p-4 border-b border-gray-100 dark:border-slate-800"
        >
          <MaterialIcons
            name={isExpanded ? "expand-less" : "expand-more"}
            size={24}
            color={isDark ? "#94a3b8" : "#6b7280"}
          />
          <View className="ml-3 flex-1">
            <Text className="text-lg font-semibold text-gray-800 dark:text-slate-100">
              {item.fee_head_name}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-blue-600 dark:text-blue-400 font-medium mr-2">
              ৳ {formatCurrency(item.total_payable_feeheadwise)}
            </Text>
            <Feather
              name="chevron-right"
              size={20}
              color={isDark ? "#94a3b8" : "#6b7280"}
            />
          </View>
        </TouchableOpacity>

        {/* Fee Head Details */}
        <View className="p-4 bg-gray-50/5 dark:bg-slate-900/50">
          <View className="flex-row flex-wrap mb-3">
            <View className="w-1/2 mb-2">
              <Text className="text-xs text-gray-500 dark:text-slate-400">
                Fee Subheads
              </Text>
              <View className="mt-1">
                {student_online_payment_setting?.toLowerCase() ===
                "due upto current date" ? (
                  <View className="flex-row flex-wrap gap-1">
                    {item.fee_subheads.map((subhead) => {
                      const isAutoSelected = autoSelectedSubheads[
                        item.id
                      ]?.some(
                        (item) => item.payapplies_id === subhead.payapplies_id,
                      );
                      const isSelected = selectedSubheads.some(
                        (s) => s.payapplies_id === subhead.payapplies_id,
                      );

                      return (
                        <TouchableOpacity
                          key={subhead.payapplies_id}
                          onPress={() =>
                            handleSubheadSelect(item.id, subhead, !isSelected)
                          }
                          disabled={isAutoSelected}
                          className={`px-3 py-1.5 rounded-full ${isSelected ? "bg-blue-100 border border-blue-300" : "bg-gray-100 border border-gray-200"} ${isAutoSelected ? "opacity-60" : ""}`}
                        >
                          <Text
                            className={`text-xs font-medium ${isSelected ? "text-blue-700" : "text-gray-600"}`}
                          >
                            {subhead.feesubhead}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View className="flex-row flex-wrap gap-1">
                    {item.fee_subheads.map((subhead) => {
                      const isSelected = selectedSubheads.some(
                        (s) => s.payapplies_id === subhead.payapplies_id,
                      );

                      return (
                        <TouchableOpacity
                          key={subhead.payapplies_id}
                          onPress={() =>
                            handleSubheadSelect(item.id, subhead, !isSelected)
                          }
                          className={`px-3 py-1.5 rounded-full ${isSelected ? "bg-blue-100 border border-blue-300" : "bg-gray-100 border border-gray-200"}`}
                        >
                          <Text
                            className={`text-xs font-medium ${isSelected ? "text-blue-700" : "text-gray-600"}`}
                          >
                            {subhead.feesubhead}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Summary Row */}
          <View className="flex-row flex-wrap justify-between border-t border-gray-100 dark:border-slate-800 pt-3">
            <View className="w-1/3 mb-2">
              <Text className="text-xs text-gray-500">Total Payable</Text>
              <Text className="text-sm font-medium dark:text-slate-100 mt-1">
                ৳ {getPayableAmount(item.id, "payable_amount")}
              </Text>
            </View>
            <View className="w-1/3 mb-2">
              <Text className="text-xs text-gray-500">Previous Paid</Text>
              <Text className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">
                ৳ {getPayableAmount(item.id, "previous_paid")}
              </Text>
            </View>
            <View className="w-1/3 mb-2">
              <Text className="text-xs text-gray-500">Previous Due</Text>
              <Text className="text-sm font-medium text-red-500 dark:text-rose-400 mt-1">
                ৳ {getPayableAmount(item.id, "previous_due")}
              </Text>
            </View>
            <View className="w-1/3 mb-2">
              <Text className="text-xs text-gray-500">Fine</Text>
              <Text className="text-sm font-medium dark:text-slate-100 mt-1">
                ৳ {getPayableAmount(item.id, "fine")}
              </Text>
            </View>
            <View className="w-1/3 mb-2">
              <Text className="text-xs text-gray-500">Waiver</Text>
              <Text className="text-sm font-medium dark:text-slate-100 mt-1">
                ৳ {getPayableAmount(item.id, "waiver_amount")}
              </Text>
            </View>
            <View className="w-1/3 mb-2">
              <Text className="text-xs text-gray-500">Payment of</Text>
              <Text className="text-sm font-medium dark:text-slate-100 mt-1">
                ৳ {getPayableAmount(item.id, "calculated_amount")}
              </Text>
            </View>
            <View className="w-1/3 mb-2">
              <Text className="text-xs text-gray-500">Total Due</Text>
              <Text className="text-sm font-medium dark:text-slate-100 mt-1">
                ৳ {getPayableAmount(item.id, "current_due")}
              </Text>
            </View>
          </View>
        </View>

        <Collapsible collapsed={!isExpanded}>
          <View className="border-t border-gray-100 dark:border-slate-800">
            {/* Scrollable table container */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              className="bg-gray-50 dark:bg-slate-900"
            >
              <View className="min-w-full">
                {/* Table Header */}
                <View className="flex-row p-3 border-b border-gray-200 dark:border-slate-800">
                  <View className="w-10">
                    <Text className="text-xs font-semibold text-gray-700 dark:text-slate-300"></Text>
                  </View>
                  <View className="w-24">
                    <Text className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                      Academic Year
                    </Text>
                  </View>
                  <View className="w-24">
                    <Text className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                      Fee-Subhead
                    </Text>
                  </View>
                  <View className="w-24">
                    <Text className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                      Payable Date
                    </Text>
                  </View>
                  <View className="w-20">
                    <Text className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                      Payable
                    </Text>
                  </View>
                  <View className="w-24">
                    <Text className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                      Previous Due
                    </Text>
                  </View>
                  <View className="w-16">
                    <Text className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                      Fine
                    </Text>
                  </View>
                  <View className="w-16">
                    <Text className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                      Waiver
                    </Text>
                  </View>
                  <View className="w-32">
                    <Text className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                      Payment of
                    </Text>
                  </View>
                  <View className="w-24">
                    <Text className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                      Due Amount
                    </Text>
                  </View>
                </View>

                {/* Table Body with FlatList */}
                <FlatList
                  data={item.fee_subheads}
                  keyExtractor={(subhead: FeeSubhead) =>
                    subhead.payapplies_id.toString()
                  }
                  renderItem={({ item: subhead }: { item: FeeSubhead }) => {
                    const isLocked = autoSelectedSubheads[item.id]?.some(
                      (autoItem) =>
                        autoItem.payapplies_id === subhead.payapplies_id,
                    );
                    const isSelected = selectedSubheads.some(
                      (s) => s.payapplies_id === subhead.payapplies_id,
                    );

                    return (
                      <View className="flex-row p-3 border-b border-gray-100 dark:border-slate-800 min-w-full">
                        <View className="w-10 justify-center">
                          <CheckBox
                            value={isSelected}
                            onValueChange={(newValue: boolean) =>
                              handleSubheadSelect(item.id, subhead, newValue)
                            }
                            disabled={isLocked}
                            color={isLocked ? "#9ca3af" : "#3b82f6"}
                          />
                        </View>

                        <View className="w-24 justify-center">
                          <Text className="text-xs text-gray-700 dark:text-slate-300">
                            {subhead.academic_year}
                          </Text>
                        </View>

                        <View className="w-24 justify-center">
                          <Text className="text-xs text-gray-700 dark:text-slate-300">
                            {subhead.feesubhead}
                          </Text>
                        </View>

                        <View className="w-24 justify-center">
                          <Text className="text-xs text-gray-700 dark:text-slate-300">
                            {subhead.payable_date}
                          </Text>
                        </View>

                        <View className="w-20 justify-center">
                          <Text className="text-xs text-gray-700 dark:text-slate-300">
                            ৳ {formatCurrency(subhead.payable_amount)}
                          </Text>
                        </View>

                        <View className="w-24 justify-center">
                          <Text className="text-xs text-gray-700 dark:text-slate-300">
                            ৳ {formatCurrency(subhead.previous_due)}
                          </Text>
                        </View>

                        <View className="w-16 justify-center">
                          <View className="flex-row items-center">
                            {Number(subhead.fine) >
                            Number(subhead.fine_paid_amount) ? (
                              <MaterialIcons
                                name="info"
                                size={14}
                                color="#f59e0b"
                              />
                            ) : Number(subhead.fine_paid_amount) ===
                              Number(subhead.fine) ? (
                              <MaterialIcons
                                name="check-circle"
                                size={14}
                                color="#10b981"
                              />
                            ) : null}
                            <Text className="text-xs text-gray-700 ml-1">
                              ৳ {subhead.fine}
                            </Text>
                          </View>
                        </View>

                        <View className="w-16 justify-center">
                          <Text className="text-xs text-gray-700">
                            ৳ {subhead.waiver_amount}
                          </Text>
                        </View>

                        <View className="w-32">
                          <View className="flex-row items-center space-x-2">
                            <Text className="text-xs text-gray-700 flex-1">
                              ৳ {formatCurrency(subhead.calculated_amount)}
                            </Text>

                            {/* {student_online_payment_setting?.toLowerCase() ===
                              "partial payment on subhead" && (
                              <View className="flex-1">
                                <TextInput
                                  value={
                                    subhead.partial_payment?.toString() || ""
                                  }
                                  onChangeText={(text: string) => {
                                    const numericValue = parseFloat(text) || 0;
                                    const payableAmount =
                                      parseFloat(
                                        subhead.calculated_amount.toString(),
                                      ) || 0;

                                    // Check if input is invalid (contains non-numeric except decimal)
                                    if (text && !/^\d*\.?\d*$/.test(text)) {
                                      return; // Don't update for invalid input
                                    }

                                    // Validate: can't exceed payable amount
                                    if (numericValue > payableAmount) {
                                      // Show warning but don't auto-correct yet
                                      Alert.alert(
                                        "Invalid Amount",
                                        `Partial payment cannot exceed payable amount of ৳${payableAmount.toFixed(2)}`,
                                        [{ text: "OK" }],
                                      );
                                      // Auto-correct to payable amount
                                      handlePartialPaymentChange(
                                        item.id,
                                        subhead.payapplies_id,
                                        payableAmount.toString(),
                                      );
                                    } else {
                                      handlePartialPaymentChange(
                                        item.id,
                                        subhead.payapplies_id,
                                        text,
                                      );
                                    }
                                  }}
                                  onBlur={() => {
                                    // Validate on blur as well
                                    const currentValue =
                                      subhead.partial_payment || 0;
                                    const payableAmount =
                                      parseFloat(
                                        subhead.calculated_amount.toString(),
                                      ) || 0;

                                    if (currentValue > payableAmount) {
                                      handlePartialPaymentChange(
                                        item.id,
                                        subhead.payapplies_id,
                                        payableAmount.toString(),
                                      );
                                    }
                                  }}
                                  placeholder="Partial"
                                  keyboardType="numeric"
                                  editable={isSelected}
                                  className={`border ${isSelected ? "border-blue-300" : "border-gray-300"} rounded px-2 py-1 text-xs`}
                                  maxLength={15}
                                />
                                {subhead.partial_payment && (
                                  <Text className="text-xs text-gray-500 mt-1">
                                    Max: ৳
                                    {formatCurrency(subhead.calculated_amount)}
                                  </Text>
                                )}
                              </View>
                            )} */}
                            {student_online_payment_setting?.toLowerCase() ===
                              "partial payment on subhead" &&
                              (() => {
                                const inputKey = `${item.id}_${subhead.payapplies_id}`;

                                return (
                                  <View className="flex-1">
                                    <TextInput
                                      value={
                                        partialInputs[inputKey] ??
                                        subhead.partial_payment?.toString() ??
                                        ""
                                      }
                                      onChangeText={(text: string) => {
                                        if (!/^\d*\.?\d*$/.test(text)) return;

                                        setPartialInputs((prev) => ({
                                          ...prev,
                                          [inputKey]: text,
                                        }));
                                      }}
                                      onBlur={() => {
                                        const text = partialInputs[inputKey];
                                        const numericValue =
                                          parseFloat(text) || 0;
                                        const payableAmount =
                                          subhead.calculated_amount;

                                        const finalValue =
                                          numericValue > payableAmount
                                            ? payableAmount
                                            : numericValue;

                                        handlePartialPaymentChange(
                                          item.id,
                                          subhead.payapplies_id,
                                          finalValue.toString(),
                                        );

                                        setPartialInputs((prev) => ({
                                          ...prev,
                                          [inputKey]: finalValue.toString(),
                                        }));
                                      }}
                                      placeholder="Partial"
                                      placeholderTextColor={
                                        isDark ? "#94a3b8" : "#9ca3af"
                                      }
                                      keyboardType="numeric"
                                      editable={isSelected}
                                      className={`border ${
                                        isSelected
                                          ? "border-blue-300 dark:border-blue-800"
                                          : "border-gray-300 dark:border-slate-800"
                                      } rounded px-2 py-1 text-xs dark:text-slate-100`}
                                    />

                                    {subhead.partial_payment && (
                                      <Text className="text-xs text-gray-500 mt-1">
                                        Max: ৳{" "}
                                        {formatCurrency(
                                          subhead.calculated_amount,
                                        )}
                                      </Text>
                                    )}
                                  </View>
                                );
                              })()}
                          </View>
                        </View>

                        <View className="w-24 justify-center">
                          <Text className="text-xs text-gray-700">
                            {isSelected
                              ? `৳ ${getCurrentDue(subhead)}`
                              : "৳ 0.00"}
                          </Text>
                        </View>
                      </View>
                    );
                  }}
                  scrollEnabled={false}
                  initialNumToRender={5}
                  windowSize={5}
                  removeClippedSubviews={true}
                  getItemLayout={(_, index) => ({
                    length: 48,
                    offset: 48 * index,
                    index,
                  })}
                  ListEmptyComponent={
                    <View className="p-4 items-center min-w-full">
                      <Text className="text-gray-500">
                        No subheads available
                      </Text>
                    </View>
                  }
                />
              </View>
            </ScrollView>
          </View>
        </Collapsible>
      </View>
    );
  };

  if (isLoading && !refreshing) {
    // শুধু প্রথম লোডে দেখাবে, refresh-এ না
    return (
      <View className="flex-1 bg-gray-50 dark:bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600 dark:text-slate-400">
          Loading payment information...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      className="bg-gray-50 dark:bg-slate-900"
    >
      <View className="flex-1">
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={
            <>
              {/* Student Info Card */}
              <View className="mx-4 mt-5 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                <Text className="text-xl font-bold text-blue-700 dark:text-blue-400 mb-3">
                  {userData.student_name}{" "}
                  <Text className="text-gray-600 dark:text-slate-400 text-base">
                    (SID: {userData.student_id || "—"})
                  </Text>
                </Text>
                <View className="flex-row flex-wrap justify-between gap-4">
                  <View>
                    <Text className="text-gray-600 dark:text-slate-400">
                      Academic Year: {userData.academic_year || "—"}
                    </Text>
                    <Text className="text-gray-600 dark:text-slate-400">
                      Department: {userData.department_name || "—"}
                    </Text>
                    <Text className="text-gray-600 dark:text-slate-400">
                      Class: {userData.class_name || "—"} -{" "}
                      {userData.shift || "—"} - {userData.section || "—"}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-gray-600 dark:text-slate-400">
                      Group: {userData.group || "—"}
                    </Text>
                    <Text className="text-gray-600 dark:text-slate-400">
                      Roll: {userData.roll || "—"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Notice Board */}
              {/* {noticeBoard.length > 0 && (
              <View className="mx-4 mt-4">
                {noticeBoard.map((notice, index) => (
                  <View
                    key={index}
                    className="bg-yellow-50 border border-yellow-200 rounded-lg p-3"
                  >
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      <Text className="text-yellow-800 text-sm">{notice}</Text>
                    </ScrollView>
                  </View>
                ))}
              </View>
            )} */}

              {fees_payment_by_web === "yes" ? (
                <View className="mx-4 mt-4">
                  <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                    <View className="p-4 border-b border-gray-200 dark:border-slate-800">
                      <Text className="text-lg font-bold text-gray-800 dark:text-slate-200">
                        Payable List
                      </Text>
                    </View>

                    <View className="p-4 border-b border-gray-100">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row space-x-2">
                          {totalCalculatedAmount > 0 ? (
                            <View className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                              <Text className="text-blue-700 font-medium">
                                Payment Amount: ৳{" "}
                                {formatCurrency(totalCalculatedAmount)}
                              </Text>
                            </View>
                          ) : (
                            <View className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5">
                              <Text className="text-yellow-700 font-medium">
                                Select payment to pay
                              </Text>
                            </View>
                          )}
                          <TouchableOpacity
                            onPress={paymentConfirmation}
                            disabled={totalCalculatedAmount <= 0}
                            className={`flex-row items-center px-4 py-2 rounded-lg ${totalCalculatedAmount > 0 ? "bg-blue-600" : "bg-gray-300"}`}
                          >
                            <Feather
                              name="credit-card"
                              size={18}
                              color="white"
                            />
                            <Text className="text-white font-medium ml-2">
                              Pay Now
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    <View className="p-4">
                      {feeHeads.length > 0 ? (
                        <FlatList
                          data={feeHeads}
                          keyExtractor={(item) => item.id.toString()}
                          renderItem={renderFeeHeadItem}
                          showsVerticalScrollIndicator={false}
                          contentContainerStyle={{ paddingBottom: 20 }}
                        />
                      ) : (
                        <View className="py-10 items-center">
                          <MaterialIcons
                            name="receipt"
                            size={48}
                            color="#9ca3af"
                          />
                          <Text className="mt-4 text-gray-600 font-medium">
                            No Data Found
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ) : (
                <View className="mx-4 mt-4">
                  <View className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <Text className="text-red-700 font-medium">
                      Sorry! Payment by web service unavailable!
                    </Text>
                  </View>
                </View>
              )}
            </>
          }
          ListFooterComponent={<View className="h-4" />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#3b82f6", "#2563eb"]} // নীল রঙের spinner
              tintColor={isDark ? "#60a5fa" : "#3b82f6"}
              title="Refreshing fees..."
              titleColor={isDark ? "#94a3b8" : "#6b7280"}
            />
          }
        />

        {/* Payment Confirmation Modal */}
        <Modal
          visible={confirmPaymentDialog}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setConfirmPaymentDialog(false)}
        >
          <View className="flex-1 bg-black/60 justify-center items-center p-4">
            <View className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md border border-gray-100 dark:border-slate-700">
              <View className="p-6">
                <Text className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4">
                  Payment Confirmation
                </Text>

                <View className="mb-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <Text className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    Payment of: ৳ {formatCurrency(totalCalculatedAmount)}
                  </Text>
                </View>

                {chargeSetup && chargeList.length > 0 && (
                  <View className="mb-4">
                    {chargeSetup.calculation_type === "percentage" ? (
                      <View className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3">
                        <Text className="text-xs text-gray-600 dark:text-slate-400">
                          {chargeSetup.title} — {chargeSetup.amount}% of total =
                          ৳
                          {(
                            totalCalculatedAmount *
                            (parseFloat(chargeSetup.amount) / 100)
                          ).toFixed(2)}
                        </Text>
                      </View>
                    ) : (
                      <View className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3">
                        <Text className="text-xs text-gray-600 dark:text-slate-400">
                          {chargeSetup.title} : ৳{" "}
                          {formatCurrency(totalChargeAmount)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                <View className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-lg p-3 mb-4">
                  <Text className="text-xs text-yellow-800 dark:text-yellow-400">
                    বিশেষ দ্রষ্টব্যঃ পেমেন্ট পোর্টালে প্রয়োজনীয় ধাপগুলো সম্পন্ন
                    না করে থাকলে (যেমন: ব্রাউজার বন্ধ করে দেয়া / পোর্টাল থেকে
                    ফিরে আসা), সংশ্লিষ্ট পেমেন্টটি ৩০ মিনিটের জন্য ‘PENDING’
                    অবস্থায় থাকবে। এই সময়ের মধ্যে উক্ত পেমেন্ট প্রক্রিয়া আর
                    চালিয়ে নেওয়া সম্ভব হবে না।
                  </Text>
                </View>

                <View className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-3 mb-6">
                  <Text className="text-xs text-blue-800 dark:text-blue-400">
                    Clicking proceed will take you to the associated payment
                    portal
                  </Text>
                </View>

                {/* Gateway Selection */}
                {gatewayList && gatewayList.length > 1 && (
                  <View className="mb-6">
                    <Text className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
                      Select Payment Gateway
                    </Text>
                    <View className="flex-row flex-wrap gap-3">
                      {gatewayList.map((gateway: any) => (
                        <TouchableOpacity
                          key={gateway.type}
                          onPress={() => setSelectedGateway(gateway.type)}
                          className={`flex-1 min-w-[45%] flex-row items-center p-4 rounded-xl border-2 ${
                            selectedGateway === gateway.type
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : "border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                          }`}
                        >
                          <View
                            className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 ${
                              selectedGateway === gateway.type
                                ? "border-blue-500"
                                : "border-gray-300 dark:border-slate-700"
                            }`}
                          >
                            {selectedGateway === gateway.type && (
                              <View className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                            )}
                          </View>
                          <Text
                            className={`font-medium ${
                              selectedGateway === gateway.type
                                ? "text-blue-700 dark:text-blue-400"
                                : "text-gray-600 dark:text-slate-400"
                            }`}
                          >
                            {gateway.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View className="flex-row justify-end space-x-2">
                  <TouchableOpacity
                    onPress={() => setConfirmPaymentDialog(false)}
                    className="px-6 py-3 border border-gray-300 dark:border-slate-700 rounded-lg"
                    disabled={loading}
                  >
                    <Text className="text-gray-700 dark:text-slate-300 font-medium">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={proceedPayment}
                    disabled={
                      totalCalculatedAmount <= 0 ||
                      isPaymentProcessing ||
                      !selectedGateway
                    }
                    className={`flex-row items-center px-6 py-3 rounded-lg ${totalCalculatedAmount > 0 && !isPaymentProcessing && selectedGateway ? "bg-blue-600" : "bg-gray-300"}`}
                  >
                    {isPaymentProcessing ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Feather name="send" size={18} color="white" />
                        <Text className="text-white font-medium ml-2">
                          Proceed
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
};

export default AvailablePayment;

// =============================================================================

// import { useGetInstituteInfoQuery } from "@/redux/allApi/authApi/authApi";
// import { useGetGeneralConfigsQuery } from "@/redux/allApi/generalConfigApi/generalConfigApi";
// import {
//   usePaymentRequestMutation,
//   usePaymentSearchQuery,
// } from "@/redux/allApi/invoices/invoicesApi";
// import { Feather, MaterialIcons } from "@expo/vector-icons";
// import dayjs from "dayjs";
// import CheckBox from "expo-checkbox";
// import { useRouter } from "expo-router";
// import React, { useEffect, useMemo, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   FlatList,
//   Modal,
//   RefreshControl,
//   ScrollView,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import Collapsible from "react-native-collapsible";

// interface FeeSubhead {
//   payapplies_id: number;
//   feesubhead: string;
//   feesubhead_id: number;
//   academic_year_id: number;
//   academic_year: string;
//   payable_date: string;
//   payable_amount: string;
//   fine: number;
//   fine_paid_amount: string;
//   waiver: string | null;
//   waiver_amount: number;
//   payapply_state: string;
//   previous_paid: string;
//   previous_due: string;
//   calculated_amount: number;
//   partial_payment?: number;
// }

// interface FeeHead {
//   id: number;
//   fee_head_name: string;
//   total_payable_feeheadwise: number;
//   fee_subheads: FeeSubhead[];
// }

// interface ChargeSetup {
//   id: number;
//   title: string;
//   calculation_type: "percentage" | "fixed";
//   amount: string;
// }

// interface PaymentData {
//   errors: any;
//   status: "success";
//   charge_setup: ChargeSetup;
//   all_charges: Array<{
//     id: number;
//     amount: string;
//   }>;
//   all_payments: {
//     processed_payments: FeeHead[];
//     base_total: number;
//     grand_total: number;
//     total_waiver: number;
//     total_fine: number;
//     total_paid: number;
//   };
//   paymentSetting: string;
// }

// const AvailablePayment = () => {
//   const router = useRouter();
//   const [expandedRows, setExpandedRows] = useState<{ [key: number]: boolean }>(
//     {},
//   );
//   const [selectedFeesubheads, setSelectedFeesubheads] = useState<{
//     [key: number]: FeeSubhead[];
//   }>({});
//   const [autoSelectedSubheads, setAutoSelectedSubheads] = useState<{
//     [key: number]: FeeSubhead[];
//   }>({});
//   const [confirmPaymentDialog, setConfirmPaymentDialog] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [refreshing, setRefreshing] = useState(false);
//   const { data: instituteData } = useGetInstituteInfoQuery({});

//   const {
//     data: paymentSearch,
//     isLoading,
//     refetch: refetchPayment,
//   } = usePaymentSearchQuery({});
//   const {
//     data: generalConfigs,
//     isLoading: isConfigLoading,
//     refetch: refetchConfigs,
//   } = useGetGeneralConfigsQuery();
//   const fees_payment_by_web = generalConfigs?.fees_payment_by_web || "no";
//   const student_online_payment_setting =
//     generalConfigs?.student_online_payment_setting || "Due Upto Current Date";
//   ("FROM GENERAL CONFIG STORE API", generalConfigs);
//   const userData = instituteData?.payload?.data?.user || {};
//   const paymentData: PaymentData = paymentSearch?.payload?.data;
//   const [paymentRequest, { isLoading: isPaymentProcessing }] =
//     usePaymentRequestMutation();
//   // const noticeBoard = [
//   //   "সম্মানিত অভিভাবকবৃন্দের অবগতির জন্য জানানো যাচ্ছে যে, ইয়ার ক্লোজিং কার্যক্রমের কারণে আগামী ৩০ ও ৩১ ডিসেম্বর ২০২৫ ইং তারিখে স্কুলের সকল ধরনের ট্রানজেকশন সাময়িকভাবে বন্ধ থাকবে। আগামী ১ জানুয়ারি ২০২৬ ইং তারিখ থেকে সকল ধরনের ট্রানজেকশন পুনরায় চালু থাকবে।",
//   // ];

//   const feeHeads = paymentData?.all_payments?.processed_payments || [];
//   const chargeSetup = paymentData?.charge_setup;
//   const chargeList = paymentData?.all_charges || [];
//   // const student_online_payment_setting = paymentData?.paymentSetting;
//   useEffect(() => {
//     if (feeHeads.length > 0 && student_online_payment_setting) {
//       const today = dayjs().format("YYYY-MM-DD");
//       const newAutoSelected: { [key: number]: FeeSubhead[] } = {};
//       const newSelected: { [key: number]: FeeSubhead[] } = {};

//       feeHeads.forEach((feeHead) => {
//         let autoSelected: FeeSubhead[] = [];

//         // Apply different auto-selection logic based on payment setting
//         if (
//           student_online_payment_setting.toLowerCase() ===
//           "due upto current date"
//         ) {
//           autoSelected = feeHead.fee_subheads.filter(
//             (subhead) =>
//               subhead.payable_date &&
//               (dayjs(subhead.payable_date).isSame(today, "day") ||
//                 dayjs(subhead.payable_date).isBefore(today, "day")),
//           );
//         }
//         // Add other payment setting conditions if needed

//         newAutoSelected[feeHead.id] = autoSelected;
//         newSelected[feeHead.id] = [...autoSelected];
//       });

//       setAutoSelectedSubheads(newAutoSelected);
//       setSelectedFeesubheads(newSelected);
//     }
//   }, [feeHeads, student_online_payment_setting]);
//   // useEffect(() => {
//   //   if (feeHeads.length > 0 && student_online_payment_setting) {
//   //     const today = dayjs().format("YYYY-MM-DD");
//   //     const newAutoSelected: { [key: number]: FeeSubhead[] } = {};
//   //     const newSelected: { [key: number]: FeeSubhead[] } = {};

//   //     feeHeads.forEach((feeHead) => {
//   //       const autoSelected = feeHead.fee_subheads.filter(
//   //         (subhead) =>
//   //           subhead.payable_date &&
//   //           (dayjs(subhead.payable_date).isSame(today, "day") ||
//   //             dayjs(subhead.payable_date).isBefore(today, "day")),
//   //       );

//   //       newAutoSelected[feeHead.id] = autoSelected;
//   //       newSelected[feeHead.id] = [...autoSelected];
//   //     });

//   //     setAutoSelectedSubheads(newAutoSelected);
//   //     setSelectedFeesubheads(newSelected);
//   //   }
//   // }, [feeHeads]);

//   const formatCurrency = (value: number | string) => {
//     const num = typeof value === "string" ? parseFloat(value) : value;
//     return isNaN(num)
//       ? "0.00"
//       : num.toLocaleString("en-US", {
//           minimumFractionDigits: 2,
//           maximumFractionDigits: 2,
//         });
//   };

//   const totalCalculatedAmount = useMemo(() => {
//     let total = 0;
//     for (const feeheadId in selectedFeesubheads) {
//       const subheads = selectedFeesubheads[Number(feeheadId)];
//       if (Array.isArray(subheads)) {
//         for (const item of subheads) {
//           const amount =
//             item.partial_payment != null && !isNaN(item.partial_payment)
//               ? Number(item.partial_payment)
//               : Number(item.calculated_amount || 0);
//           total += amount;
//         }
//       }
//     }
//     return total;
//   }, [selectedFeesubheads]);

//   const getPayableAmount = (
//     feeHeadId: number,
//     amount_type: keyof FeeSubhead | "current_due",
//   ) => {
//     const subheads = selectedFeesubheads[feeHeadId];
//     if (!Array.isArray(subheads)) return "0.00";

//     if (amount_type === "current_due") {
//       return subheads
//         .reduce((sum, subhead) => {
//           const due = getCurrentDue(subhead);
//           return sum + parseFloat(due);
//         }, 0)
//         .toFixed(2);
//     }

//     // Handle other amount types
//     return subheads
//       .reduce((sum, subhead) => {
//         let amount = 0;
//         if (amount_type === "calculated_amount") {
//           const partial = subhead.partial_payment;
//           if (partial !== undefined && partial !== null) {
//             amount = Number(partial) || 0;
//           } else {
//             amount = Number(subhead.calculated_amount) || 0;
//           }
//         } else {
//           amount = Number(subhead[amount_type]) || 0;
//         }
//         return sum + amount;
//       }, 0)
//       .toFixed(2);
//   };
//   const getCurrentDue = (data: FeeSubhead) => {
//     if (!data.partial_payment) return "0.00";
//     const current_due =
//       parseFloat(data.calculated_amount.toString()) -
//       parseFloat(data.partial_payment.toString());
//     return current_due.toFixed(2);
//   };

//   const toggleRow = (id: number) => {
//     setExpandedRows((prev) => ({
//       ...prev,
//       [id]: !prev[id],
//     }));
//   };
//   const onRefresh = async () => {
//     setRefreshing(true);
//     try {
//       // ডাটা রিফ্রেশ করো
//       await refetchPayment().unwrap(); // RTK Query-এর refetch
//       await refetchConfigs().unwrap();

//       // Optional: institute info-ও রিফ্রেশ করতে চাইলে
//       // await refetchInstitute().unwrap();  (যদি useGetInstituteInfoQuery-এর refetch নাও)
//     } catch (err) {
//       console.error("Refresh failed:", err);
//       // Optional: ইউজারকে ছোট্ট টোস্ট দেখাতে পারো
//       Alert.alert("Refresh Failed", "Couldn't update data. Please try again.");
//     } finally {
//       setRefreshing(false);
//     }
//   };
//   const handleSubheadSelect = (
//     feeHeadId: number,
//     subhead: FeeSubhead,
//     isSelected: boolean,
//   ) => {
//     const currentSelected = selectedFeesubheads[feeHeadId] || [];
//     const autoSelected = autoSelectedSubheads[feeHeadId] || [];
//     const isAutoSelected = autoSelected.some(
//       (item) => item.payapplies_id === subhead.payapplies_id,
//     );

//     // If it's auto-selected, don't allow deselecting
//     if (isAutoSelected && !isSelected) {
//       return;
//     }

//     let newSelected;
//     if (isSelected) {
//       newSelected = [...currentSelected, subhead];
//     } else {
//       newSelected = currentSelected.filter(
//         (item) => item.payapplies_id !== subhead.payapplies_id,
//       );
//     }

//     // Ensure auto-selected items are always included
//     const finalSelected = [
//       ...newSelected.filter(
//         (item) =>
//           !autoSelected.some(
//             (auto) => auto.payapplies_id === item.payapplies_id,
//           ),
//       ),
//       ...autoSelected,
//     ];

//     setSelectedFeesubheads((prev) => ({
//       ...prev,
//       [feeHeadId]: finalSelected,
//     }));
//   };

//   // const handlePartialPaymentChange = (
//   //   feeHeadId: number,
//   //   subheadId: number,
//   //   value: string,
//   // ) => {
//   //   const numValue = parseFloat(value) || 0;
//   //   const subheads = selectedFeesubheads[feeHeadId] || [];

//   //   const updatedSubheads = subheads.map((subhead) => {
//   //     if (subhead.payapplies_id === subheadId) {
//   //       return {
//   //         ...subhead,
//   //         partial_payment: numValue,
//   //       };
//   //     }
//   //     return subhead;
//   //   });

//   //   setSelectedFeesubheads((prev) => ({
//   //     ...prev,
//   //     [feeHeadId]: updatedSubheads,
//   //   }));
//   // };
//   const handlePartialPaymentChange = (
//     feeHeadId: number,
//     subheadId: number,
//     value: string,
//   ) => {
//     // Only allow partial payment if the setting is enabled
//     if (
//       student_online_payment_setting.toLowerCase() !==
//       "partial payment on subhead"
//     ) {
//       return;
//     }

//     const numValue = parseFloat(value) || 0;
//     const subheads = selectedFeesubheads[feeHeadId] || [];

//     const updatedSubheads = subheads.map((subhead) => {
//       if (subhead.payapplies_id === subheadId) {
//         return {
//           ...subhead,
//           partial_payment: numValue,
//         };
//       }
//       return subhead;
//     });

//     setSelectedFeesubheads((prev) => ({
//       ...prev,
//       [feeHeadId]: updatedSubheads,
//     }));
//   };

//   const isLockedRow = (feeHeadId: number, subhead: FeeSubhead) => {
//     return autoSelectedSubheads[feeHeadId]?.some(
//       (item) => item.payapplies_id === subhead.payapplies_id,
//     );
//   };

//   const paymentConfirmation = () => {
//     if (totalCalculatedAmount <= 0) {
//       Alert.alert("Error", "Please select at least one fee to pay");
//       return;
//     }
//     setConfirmPaymentDialog(true);
//   };

//   const proceedPayment = async () => {
//     try {
//       // Prepare payment data
//       const paymentRequestData = {
//         payapplies_id: [] as number[],
//         amount: [] as number[],
//       };

//       for (const feeHeadId in selectedFeesubheads) {
//         const subheads = selectedFeesubheads[Number(feeHeadId)];
//         if (Array.isArray(subheads)) {
//           subheads.forEach((subhead) => {
//             paymentRequestData.payapplies_id.push(subhead.payapplies_id);
//             const amount =
//               subhead.partial_payment != null && !isNaN(subhead.partial_payment)
//                 ? Number(subhead.partial_payment)
//                 : Number(subhead.calculated_amount || 0);
//             paymentRequestData.amount.push(amount);
//           });
//         }
//       }

//       // Call the payment API
//       const response = await paymentRequest(paymentRequestData).unwrap();
//       if (response) {
//         // Handle different success scenarios
//         if (response.payment_url) {
//           // For webview payment (like SSLCommerz)
//           router.push({
//             pathname: "/payments/available_payment/paymentwebview",
//             params: {
//               payment_url: response.payment_url,
//               transaction_id: response.transaction_id,
//               amount: totalCalculatedAmount.toString(),
//             },
//           });
//         } else if (response.html) {
//           // Handle HTML form submission (less common in mobile)
//         } else {
//           // Direct success
//           router.push({
//             pathname: "/payments/available_payment/success",
//             params: {
//               transaction_id: response.transaction_id || Date.now().toString(),
//               invoice_no: response.invoice_no || `INV-${Date.now()}`,
//               amount_paid: totalCalculatedAmount.toString(),
//               payment_date: new Date().toISOString(),
//               message: response.message || "Payment completed successfully",
//             },
//           });
//         }
//       } else {
//         // Payment failed
//         router.push({
//           pathname: "/payments/available_payment/fail",
//           params: {
//             error_message:
//               response.error || "Payment failed. Please try again.",
//             transaction_id: response.transaction_id || "",
//             amount: totalCalculatedAmount.toString(),
//           },
//         });
//       }

//       setConfirmPaymentDialog(false);
//     } catch (error: any) {
//       let errorMessage = "Failed to process payment. Please try again.";

//       // 1. RTK Query standard error shape
//       if (
//         error?.data?.errors?.system_error &&
//         Array.isArray(error.data.errors.system_error)
//       ) {
//         // Extract all messages from the array of error objects
//         const messages = error.data.errors.system_error
//           .map((errObj: any) => errObj?.message || errObj?.msg || "")
//           .filter(Boolean);

//         if (messages.length > 0) {
//           errorMessage = messages.join("\n• ");
//           // Optional: prefix if you want
//           // errorMessage = "The following issues occurred:\n• " + messages.join("\n• ");
//         }
//       }
//       // 2. Fallback to other common places
//       else if (error?.data?.message) {
//         errorMessage = error.data.message;
//       } else if (error?.data?.error) {
//         errorMessage = error.data.error;
//       } else if (error?.message) {
//         errorMessage = error.message;
//       }

//       // ──────────────────────────────────────────────────────────────
//       // Show nice alert
//       // ──────────────────────────────────────────────────────────────
//       Alert.alert(
//         "Payment Error",
//         errorMessage,
//         [
//           {
//             text: "OK",
//             onPress: () => {
//               setConfirmPaymentDialog(false);
//               // Optional: reset selection or refresh data here if needed
//             },
//           },
//         ],
//         { cancelable: true },
//       );

//       console.error("Payment error:", error);
//       // console.error("Payment error:", error);
//       // Alert.alert(
//       //   "Payment Error",
//       //   error?.data?.error ||
//       //     error?.message ||
//       //     "Failed to process payment. Please try again.",
//       //   [{ text: "OK", onPress: () => setConfirmPaymentDialog(false) }],
//       // );
//     }
//   };

//   const totalChargeAmount = useMemo(() => {
//     return chargeList.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
//   }, [chargeList]);

//   // Render fee head item
//   const renderFeeHeadItem = ({ item }: { item: FeeHead }) => {
//     const isExpanded = expandedRows[item.id] || false;
//     const selectedSubheads = selectedFeesubheads[item.id] || [];

//     return (
//       <View className="mb-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
//         {/* Fee Head Header */}
//         <TouchableOpacity
//           onPress={() => toggleRow(item.id)}
//           className="flex-row items-center p-4 border-b border-gray-100"
//         >
//           <MaterialIcons
//             name={isExpanded ? "expand-less" : "expand-more"}
//             size={24}
//             color="#6b7280"
//           />
//           <View className="ml-3 flex-1">
//             <Text className="text-lg font-semibold text-gray-800">
//               {item.fee_head_name}
//             </Text>
//           </View>
//           <View className="flex-row items-center">
//             <Text className="text-blue-600 font-medium mr-2">
//               ৳ {formatCurrency(item.total_payable_feeheadwise)}
//             </Text>
//             <Feather name="chevron-right" size={20} color="#6b7280" />
//           </View>
//         </TouchableOpacity>

//         {/* Fee Head Details */}
//         <View className="p-4">
//           <View className="flex-row flex-wrap mb-3">
//             <View className="w-1/2 mb-2">
//               <Text className="text-xs text-gray-500">Fee Subheads</Text>
//               <View className="mt-1">
//                 {student_online_payment_setting.toLowerCase() ===
//                 "due upto current date" ? (
//                   <View className="flex-row flex-wrap gap-1">
//                     {item?.fee_subheads?.map((subhead) => {
//                       const isAutoSelected = autoSelectedSubheads[
//                         item.id
//                       ]?.some(
//                         (item) => item.payapplies_id === subhead.payapplies_id,
//                       );
//                       const isSelected = selectedSubheads.some(
//                         (s) => s.payapplies_id === subhead.payapplies_id,
//                       );

//                       return (
//                         <TouchableOpacity
//                           key={subhead.payapplies_id}
//                           onPress={() =>
//                             handleSubheadSelect(item.id, subhead, !isSelected)
//                           }
//                           disabled={isAutoSelected}
//                           className={`px-3 py-1.5 rounded-full ${isSelected ? "bg-blue-100 border border-blue-300" : "bg-gray-100 border border-gray-200"} ${isAutoSelected ? "opacity-60" : ""}`}
//                         >
//                           <Text
//                             className={`text-xs font-medium ${isSelected ? "text-blue-700" : "text-gray-600"}`}
//                           >
//                             {subhead.feesubhead}
//                           </Text>
//                         </TouchableOpacity>
//                       );
//                     })}
//                   </View>
//                 ) : (
//                   <View className="flex-row flex-wrap gap-1">
//                     {item?.fee_subheads?.map((subhead) => {
//                       const isSelected = selectedSubheads.some(
//                         (s) => s.payapplies_id === subhead.payapplies_id,
//                       );

//                       return (
//                         <TouchableOpacity
//                           key={subhead.payapplies_id}
//                           onPress={() =>
//                             handleSubheadSelect(item.id, subhead, !isSelected)
//                           }
//                           className={`px-3 py-1.5 rounded-full ${isSelected ? "bg-blue-100 border border-blue-300" : "bg-gray-100 border border-gray-200"}`}
//                         >
//                           <Text
//                             className={`text-xs font-medium ${isSelected ? "text-blue-700" : "text-gray-600"}`}
//                           >
//                             {subhead.feesubhead}
//                           </Text>
//                         </TouchableOpacity>
//                       );
//                     })}
//                   </View>
//                 )}
//               </View>
//             </View>
//           </View>

//           {/* Summary Row */}
//           <View className="flex-row flex-wrap justify-between border-t border-gray-100 pt-3">
//             <View className="w-1/3 mb-2">
//               <Text className="text-xs text-gray-500">Total Payable</Text>
//               <Text className="text-sm font-medium mt-1">
//                 ৳ {getPayableAmount(item.id, "payable_amount")}
//               </Text>
//             </View>
//             <View className="w-1/3 mb-2">
//               <Text className="text-xs text-gray-500">Previous Paid</Text>
//               <Text className="text-sm font-medium text-blue-600 mt-1">
//                 ৳ {getPayableAmount(item.id, "previous_paid")}
//               </Text>
//             </View>
//             <View className="w-1/3 mb-2">
//               <Text className="text-xs text-gray-500">Previous Due</Text>
//               <Text className="text-sm font-medium text-red-500 mt-1">
//                 ৳ {getPayableAmount(item.id, "previous_due")}
//               </Text>
//             </View>
//             <View className="w-1/3 mb-2">
//               <Text className="text-xs text-gray-500">Fine</Text>
//               <Text className="text-sm font-medium mt-1">
//                 ৳ {getPayableAmount(item.id, "fine")}
//               </Text>
//             </View>
//             <View className="w-1/3 mb-2">
//               <Text className="text-xs text-gray-500">Waiver</Text>
//               <Text className="text-sm font-medium mt-1">
//                 ৳ {getPayableAmount(item.id, "waiver_amount")}
//               </Text>
//             </View>
//             <View className="w-1/3 mb-2">
//               <Text className="text-xs text-gray-500">Payment of</Text>
//               <Text className="text-sm font-medium mt-1">
//                 ৳ {getPayableAmount(item.id, "calculated_amount")}
//               </Text>
//             </View>
//             <View className="w-1/3 mb-2">
//               <Text className="text-xs text-gray-500">Total Due</Text>
//               <Text className="text-sm font-medium mt-1">
//                 ৳ {getPayableAmount(item.id, "current_due")}
//               </Text>
//             </View>
//           </View>
//         </View>

//         {/* Expanded Subheads Table */}
//         {/* <Collapsible collapsed={!isExpanded}>
//           <View className="border-t border-gray-100">
//             <View className="bg-gray-50 flex-row p-3 border-b border-gray-200">
//               <View className="w-10">
//                 <Text className="text-xs font-semibold text-gray-700"></Text>
//               </View>
//               <View className="flex-1">
//                 <Text className="text-xs font-semibold text-gray-700">
//                   Academic Year
//                 </Text>
//               </View>
//               <View className="flex-1">
//                 <Text className="text-xs font-semibold text-gray-700">
//                   Fee-Subhead
//                 </Text>
//               </View>
//               <View className="flex-1">
//                 <Text className="text-xs font-semibold text-gray-700">
//                   Payable Date
//                 </Text>
//               </View>
//               <View className="flex-1">
//                 <Text className="text-xs font-semibold text-gray-700">
//                   Payable
//                 </Text>
//               </View>
//               <View className="flex-1">
//                 <Text className="text-xs font-semibold text-gray-700">
//                   Previous Due
//                 </Text>
//               </View>
//               <View className="flex-1">
//                 <Text className="text-xs font-semibold text-gray-700">
//                   Fine
//                 </Text>
//               </View>
//               <View className="flex-1">
//                 <Text className="text-xs font-semibold text-gray-700">
//                   Waiver
//                 </Text>
//               </View>
//               <View className="flex-2">
//                 <Text className="text-xs font-semibold text-gray-700">
//                   Payment of
//                 </Text>
//               </View>
//               <View className="flex-1">
//                 <Text className="text-xs font-semibold text-gray-700">
//                   Due Amount
//                 </Text>
//               </View>
//             </View>

//             {item.fee_subheads.map((subhead) => {
//               const isLocked = isLockedRow(item.id, subhead);
//               const isSelected = selectedSubheads.some(
//                 (s) => s.payapplies_id === subhead.payapplies_id,
//               );

//               return (
//                 <View
//                   key={subhead.payapplies_id}
//                   className="flex-row p-3 border-b border-gray-100"
//                 >
//                   <View className="w-10 justify-center">
//                     <CheckBox
//                       value={isSelected}
//                       onValueChange={(newValue) =>
//                         handleSubheadSelect(item.id, subhead, newValue)
//                       }
//                       disabled={isLocked}
//                       color={isLocked ? "#9ca3af" : "#3b82f6"}
//                     />
//                   </View>
//                   <View className="flex-1 justify-center">
//                     <Text className="text-xs text-gray-700">
//                       {subhead.academic_year}
//                     </Text>
//                   </View>
//                   <View className="flex-1 justify-center">
//                     <Text className="text-xs text-gray-700">
//                       {subhead.feesubhead}
//                     </Text>
//                   </View>
//                   <View className="flex-1 justify-center">
//                     <Text className="text-xs text-gray-700">
//                       {subhead.payable_date}
//                     </Text>
//                   </View>
//                   <View className="flex-1 justify-center">
//                     <Text className="text-xs text-gray-700">
//                       ৳ {formatCurrency(subhead.payable_amount)}
//                     </Text>
//                   </View>
//                   <View className="flex-1 justify-center">
//                     <Text className="text-xs text-gray-700">
//                       ৳ {formatCurrency(subhead.previous_due)}
//                     </Text>
//                   </View>
//                   <View className="flex-1 justify-center">
//                     <View className="flex-row items-center">
//                       {Number(subhead.fine) >
//                       Number(subhead.fine_paid_amount) ? (
//                         <MaterialIcons name="info" size={14} color="#f59e0b" />
//                       ) : Number(subhead.fine_paid_amount) ===
//                         Number(subhead.fine) ? (
//                         <MaterialIcons
//                           name="check-circle"
//                           size={14}
//                           color="#10b981"
//                         />
//                       ) : null}
//                       <Text className="text-xs text-gray-700 ml-1">
//                         ৳ {subhead.fine}
//                       </Text>
//                     </View>
//                   </View>
//                   <View className="flex-1 justify-center">
//                     <Text className="text-xs text-gray-700">
//                       ৳ {subhead.waiver_amount}
//                     </Text>
//                   </View>
//                   <View className="flex-2">
//                     <View className="flex-row items-center space-x-2">
//                       <Text className="text-xs text-gray-700 flex-1">
//                         ৳ {formatCurrency(subhead.calculated_amount)}
//                       </Text>
//                       {student_online_payment_setting.toLowerCase() ===
//                         "partial payment on subhead" && (
//                         <TextInput
//                           value={subhead.partial_payment?.toString() || ""}
//                           onChangeText={(text) =>
//                             handlePartialPaymentChange(
//                               item.id,
//                               subhead.payapplies_id,
//                               text,
//                             )
//                           }
//                           placeholder="Partial"
//                           keyboardType="numeric"
//                           editable={isSelected}
//                           className={`flex-1 border ${isSelected ? "border-blue-300" : "border-gray-300"} rounded px-2 py-1 text-xs`}
//                         />
//                       )}
//                     </View>
//                   </View>
//                   <View className="flex-1 justify-center">
//                     <Text className="text-xs text-gray-700">
//                       {isSelected ? `৳ ${getCurrentDue(subhead)}` : "৳ 0.00"}
//                     </Text>
//                   </View>
//                 </View>
//               );
//             })}
//           </View>
//         </Collapsible> */}
//         <Collapsible collapsed={!isExpanded}>
//           <View className="border-t border-gray-100">
//             {/* Scrollable table container */}
//             <ScrollView
//               horizontal
//               showsHorizontalScrollIndicator={true}
//               className="bg-gray-50"
//             >
//               <View className="min-w-full">
//                 {/* Table Header */}
//                 <View className="flex-row p-3 border-b border-gray-200">
//                   <View className="w-10">
//                     <Text className="text-xs font-semibold text-gray-700"></Text>
//                   </View>
//                   <View className="w-24">
//                     <Text className="text-xs font-semibold text-gray-700">
//                       Academic Year
//                     </Text>
//                   </View>
//                   <View className="w-24">
//                     <Text className="text-xs font-semibold text-gray-700">
//                       Fee-Subhead
//                     </Text>
//                   </View>
//                   <View className="w-24">
//                     <Text className="text-xs font-semibold text-gray-700">
//                       Payable Date
//                     </Text>
//                   </View>
//                   <View className="w-20">
//                     <Text className="text-xs font-semibold text-gray-700">
//                       Payable
//                     </Text>
//                   </View>
//                   <View className="w-24">
//                     <Text className="text-xs font-semibold text-gray-700">
//                       Previous Due
//                     </Text>
//                   </View>
//                   <View className="w-16">
//                     <Text className="text-xs font-semibold text-gray-700">
//                       Fine
//                     </Text>
//                   </View>
//                   <View className="w-16">
//                     <Text className="text-xs font-semibold text-gray-700">
//                       Waiver
//                     </Text>
//                   </View>
//                   <View className="w-32">
//                     <Text className="text-xs font-semibold text-gray-700">
//                       Payment of
//                     </Text>
//                   </View>
//                   <View className="w-24">
//                     <Text className="text-xs font-semibold text-gray-700">
//                       Due Amount
//                     </Text>
//                   </View>
//                 </View>

//                 {/* Table Body with FlatList */}
//                 <FlatList
//                   data={item.fee_subheads}
//                   keyExtractor={(subhead: FeeSubhead) =>
//                     subhead.payapplies_id.toString()
//                   }
//                   renderItem={({ item: subhead }: { item: FeeSubhead }) => {
//                     const isLocked = autoSelectedSubheads[item.id]?.some(
//                       (autoItem) =>
//                         autoItem.payapplies_id === subhead.payapplies_id,
//                     );
//                     const isSelected = selectedSubheads.some(
//                       (s) => s.payapplies_id === subhead.payapplies_id,
//                     );

//                     return (
//                       <View className="flex-row p-3 border-b border-gray-100 min-w-full">
//                         <View className="w-10 justify-center">
//                           <CheckBox
//                             value={isSelected}
//                             onValueChange={(newValue: boolean) =>
//                               handleSubheadSelect(item.id, subhead, newValue)
//                             }
//                             disabled={isLocked}
//                             color={isLocked ? "#9ca3af" : "#3b82f6"}
//                           />
//                         </View>

//                         <View className="w-24 justify-center">
//                           <Text className="text-xs text-gray-700">
//                             {subhead.academic_year}
//                           </Text>
//                         </View>

//                         <View className="w-24 justify-center">
//                           <Text className="text-xs text-gray-700">
//                             {subhead.feesubhead}
//                           </Text>
//                         </View>

//                         <View className="w-24 justify-center">
//                           <Text className="text-xs text-gray-700">
//                             {subhead.payable_date}
//                           </Text>
//                         </View>

//                         <View className="w-20 justify-center">
//                           <Text className="text-xs text-gray-700">
//                             ৳ {formatCurrency(subhead.payable_amount)}
//                           </Text>
//                         </View>

//                         <View className="w-24 justify-center">
//                           <Text className="text-xs text-gray-700">
//                             ৳ {formatCurrency(subhead.previous_due)}
//                           </Text>
//                         </View>

//                         <View className="w-16 justify-center">
//                           <View className="flex-row items-center">
//                             {Number(subhead.fine) >
//                             Number(subhead.fine_paid_amount) ? (
//                               <MaterialIcons
//                                 name="info"
//                                 size={14}
//                                 color="#f59e0b"
//                               />
//                             ) : Number(subhead.fine_paid_amount) ===
//                               Number(subhead.fine) ? (
//                               <MaterialIcons
//                                 name="check-circle"
//                                 size={14}
//                                 color="#10b981"
//                               />
//                             ) : null}
//                             <Text className="text-xs text-gray-700 ml-1">
//                               ৳ {subhead.fine}
//                             </Text>
//                           </View>
//                         </View>

//                         <View className="w-16 justify-center">
//                           <Text className="text-xs text-gray-700">
//                             ৳ {subhead.waiver_amount}
//                           </Text>
//                         </View>

//                         <View className="w-32">
//                           <View className="flex-row items-center space-x-2">
//                             <Text className="text-xs text-gray-700 flex-1">
//                               ৳ {formatCurrency(subhead.calculated_amount)}
//                             </Text>
//                             {student_online_payment_setting.toLowerCase() ===
//                               "partial payment on subhead" && (
//                               <View className="flex-1">
//                                 <TextInput
//                                   value={
//                                     subhead.partial_payment?.toString() || ""
//                                   }
//                                   onChangeText={(text: string) => {
//                                     if (
//                                       student_online_payment_setting.toLowerCase() ===
//                                       "partial payment on subhead"
//                                     ) {
//                                       const numericValue =
//                                         parseFloat(text) || 0;
//                                       const payableAmount =
//                                         parseFloat(
//                                           subhead.calculated_amount.toString(),
//                                         ) || 0;

//                                       if (text && !/^\d*\.?\d*$/.test(text)) {
//                                         return;
//                                       }

//                                       if (numericValue > payableAmount) {
//                                         Alert.alert(
//                                           "Invalid Amount",
//                                           `Partial payment cannot exceed payable amount of ৳${payableAmount.toFixed(2)}`,
//                                           [{ text: "OK" }],
//                                         );
//                                         handlePartialPaymentChange(
//                                           item.id,
//                                           subhead.payapplies_id,
//                                           payableAmount.toString(),
//                                         );
//                                       } else {
//                                         handlePartialPaymentChange(
//                                           item.id,
//                                           subhead.payapplies_id,
//                                           text,
//                                         );
//                                       }
//                                     }
//                                   }}
//                                   onBlur={() => {
//                                     // Validate on blur as well
//                                     const currentValue =
//                                       subhead.partial_payment || 0;
//                                     const payableAmount =
//                                       parseFloat(
//                                         subhead.calculated_amount.toString(),
//                                       ) || 0;

//                                     if (currentValue > payableAmount) {
//                                       handlePartialPaymentChange(
//                                         item.id,
//                                         subhead.payapplies_id,
//                                         payableAmount.toString(),
//                                       );
//                                     }
//                                   }}
//                                   placeholder="Partial"
//                                   keyboardType="numeric"
//                                   editable={isSelected}
//                                   className={`border ${isSelected ? "border-blue-300" : "border-gray-300"} rounded px-2 py-1 text-xs`}
//                                   maxLength={15}
//                                 />
//                                 {subhead.partial_payment && (
//                                   <Text className="text-xs text-gray-500 mt-1">
//                                     Max: ৳
//                                     {formatCurrency(subhead.calculated_amount)}
//                                   </Text>
//                                 )}
//                               </View>
//                             )}
//                           </View>
//                         </View>

//                         <View className="w-24 justify-center">
//                           <Text className="text-xs text-gray-700">
//                             {isSelected
//                               ? `৳ ${getCurrentDue(subhead)}`
//                               : "৳ 0.00"}
//                           </Text>
//                         </View>
//                       </View>
//                     );
//                   }}
//                   scrollEnabled={false}
//                   initialNumToRender={5}
//                   windowSize={5}
//                   removeClippedSubviews={true}
//                   getItemLayout={(_, index) => ({
//                     length: 48,
//                     offset: 48 * index,
//                     index,
//                   })}
//                   ListEmptyComponent={
//                     <View className="p-4 items-center min-w-full">
//                       <Text className="text-gray-500">
//                         No subheads available
//                       </Text>
//                     </View>
//                   }
//                 />
//               </View>
//             </ScrollView>
//           </View>
//         </Collapsible>
//       </View>
//     );
//   };

//   if ((isLoading || isConfigLoading) && !refreshing) {
//     return (
//       <View className="flex-1 bg-gray-50 items-center justify-center">
//         <ActivityIndicator size="large" color="#3b82f6" />
//         <Text className="mt-4 text-gray-600">
//           Loading payment information...
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <View className="flex-1 bg-gray-50">
//       <FlatList
//         data={[]}
//         renderItem={() => null}
//         ListHeaderComponent={
//           <>
//             {/* Student Info Card */}
//             <View className="mx-4 mt-5 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
//               <Text className="text-xl font-bold text-blue-700 mb-3">
//                 {userData.student_name}{" "}
//                 <Text className="text-gray-600 text-base">
//                   (SID: {userData.student_id || "—"})
//                 </Text>
//               </Text>
//               <View className="flex-row flex-wrap justify-between gap-4">
//                 <View>
//                   <Text className="text-gray-600">
//                     Academic Year: {userData.academic_year || "—"}
//                   </Text>
//                   <Text className="text-gray-600">
//                     Department: {userData.department_name || "—"}
//                   </Text>
//                   <Text className="text-gray-600">
//                     Class: {userData.class_name || "—"} -{" "}
//                     {userData.shift || "—"} - {userData.section || "—"}
//                   </Text>
//                 </View>
//                 <View>
//                   <Text className="text-gray-600">
//                     Group: {userData.group || "—"}
//                   </Text>
//                   <Text className="text-gray-600">
//                     Roll: {userData.roll || "—"}
//                   </Text>
//                 </View>
//               </View>
//             </View>

//             {/* Notice Board */}
//             {/* {noticeBoard.length > 0 && (
//               <View className="mx-4 mt-4">
//                 {noticeBoard.map((notice, index) => (
//                   <View
//                     key={index}
//                     className="bg-yellow-50 border border-yellow-200 rounded-lg p-3"
//                   >
//                     <ScrollView
//                       horizontal
//                       showsHorizontalScrollIndicator={false}
//                     >
//                       <Text className="text-yellow-800 text-sm">{notice}</Text>
//                     </ScrollView>
//                   </View>
//                 ))}
//               </View>
//             )} */}

//             {/* Payable List */}
//             {/* Payable List */}
//             {/* {feeHeads.length > 0 ? (
//               <View className="mx-4 mt-4">
//                 <View className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//                   <View className="p-4 border-b border-gray-200">
//                     <Text className="text-lg font-bold text-gray-800">
//                       Payable List
//                     </Text>
//                   </View>

//                   <View className="p-4 border-b border-gray-100">
//                     <View className="flex-row items-center justify-between">
//                       <View className="flex-row space-x-2">
//                         {totalCalculatedAmount > 0 ? (
//                           <View className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
//                             <Text className="text-blue-700 font-medium">
//                               Payment Amount: ৳{" "}
//                               {formatCurrency(totalCalculatedAmount)}
//                             </Text>
//                           </View>
//                         ) : (
//                           <View className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5">
//                             <Text className="text-yellow-700 font-medium">
//                               Select payment to pay
//                             </Text>
//                           </View>
//                         )}
//                         <TouchableOpacity
//                           onPress={paymentConfirmation}
//                           disabled={totalCalculatedAmount <= 0}
//                           className={`flex-row items-center px-4 py-2 rounded-lg ${totalCalculatedAmount > 0 ? "bg-blue-600" : "bg-gray-300"}`}
//                         >
//                           <Feather name="credit-card" size={18} color="white" />
//                           <Text className="text-white font-medium ml-2">
//                             Pay Now
//                           </Text>
//                         </TouchableOpacity>
//                       </View>
//                     </View>
//                   </View>

//                   <View className="p-4">
//                     {feeHeads.length > 0 ? (
//                       <FlatList
//                         data={feeHeads}
//                         keyExtractor={(item) => item.id.toString()}
//                         renderItem={renderFeeHeadItem}
//                         showsVerticalScrollIndicator={false}
//                         contentContainerStyle={{ paddingBottom: 20 }}
//                       />
//                     ) : (
//                       <View className="py-10 items-center">
//                         <MaterialIcons
//                           name="receipt"
//                           size={48}
//                           color="#9ca3af"
//                         />
//                         <Text className="mt-4 text-gray-600 font-medium">
//                           No Data Found
//                         </Text>
//                       </View>
//                     )}
//                   </View>
//                 </View>
//               </View>
//             ) : !isLoading ? (
//               <View className="mx-4 mt-4">
//                 <View className="bg-red-50 border border-red-200 rounded-lg p-4">
//                   <Text className="text-red-700 font-medium">
//                     No payable fees available!
//                   </Text>
//                 </View>
//               </View>
//             ) : null} */}
//             {fees_payment_by_web === "yes" ? (
//               <View className="mx-4 mt-4">
//                 <View className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//                   <View className="p-4 border-b border-gray-200">
//                     <Text className="text-lg font-bold text-gray-800">
//                       Payable List
//                     </Text>
//                   </View>

//                   {/* Payment setting indicator */}
//                   <View className="px-4 pt-3">
//                     <View className="bg-gray-50 border border-gray-200 rounded-lg p-2">
//                       <Text className="text-xs text-gray-600 text-center">
//                         Payment Setting: {student_online_payment_setting}
//                       </Text>
//                     </View>
//                   </View>

//                   <View className="p-4 border-b border-gray-100">
//                     <View className="flex-row items-center justify-between">
//                       <View className="flex-row space-x-2">
//                         {totalCalculatedAmount > 0 ? (
//                           <View className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
//                             <Text className="text-blue-700 font-medium">
//                               Payment Amount: ৳{" "}
//                               {formatCurrency(totalCalculatedAmount)}
//                             </Text>
//                           </View>
//                         ) : (
//                           <View className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5">
//                             <Text className="text-yellow-700 font-medium">
//                               Select payment to pay
//                             </Text>
//                           </View>
//                         )}
//                         <TouchableOpacity
//                           onPress={paymentConfirmation}
//                           disabled={totalCalculatedAmount <= 0}
//                           className={`flex-row items-center px-4 py-2 rounded-lg ${totalCalculatedAmount > 0 ? "bg-blue-600" : "bg-gray-300"}`}
//                         >
//                           <Feather name="credit-card" size={18} color="white" />
//                           <Text className="text-white font-medium ml-2">
//                             Pay Now
//                           </Text>
//                         </TouchableOpacity>
//                       </View>
//                     </View>
//                   </View>

//                   <View className="p-4">
//                     {feeHeads.length > 0 ? (
//                       <FlatList
//                         data={feeHeads}
//                         keyExtractor={(item) => item.id.toString()}
//                         renderItem={renderFeeHeadItem}
//                         showsVerticalScrollIndicator={false}
//                         contentContainerStyle={{ paddingBottom: 20 }}
//                       />
//                     ) : (
//                       <View className="py-10 items-center">
//                         <MaterialIcons
//                           name="receipt"
//                           size={48}
//                           color="#9ca3af"
//                         />
//                         <Text className="mt-4 text-gray-600 font-medium">
//                           No Data Found
//                         </Text>
//                       </View>
//                     )}
//                   </View>
//                 </View>
//               </View>
//             ) : (
//               <View className="mx-4 mt-4">
//                 <View className="bg-red-50 border border-red-200 rounded-lg p-4">
//                   <Text className="text-red-700 font-medium">
//                     Sorry! Payment by web service unavailable!
//                   </Text>
//                   <Text className="text-red-600 text-sm mt-2">
//                     Please contact your institution for payment options.
//                   </Text>
//                 </View>
//               </View>
//             )}
//           </>
//         }
//         ListFooterComponent={<View className="h-4" />}
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{ paddingBottom: 20 }}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={onRefresh}
//             colors={["#3b82f6", "#2563eb"]}
//             tintColor="#3b82f6"
//             title="Refreshing fees..."
//             titleColor="#6b7280"
//           />
//         }
//       />

//       {/* Payment Confirmation Modal */}
//       <Modal
//         visible={confirmPaymentDialog}
//         animationType="slide"
//         transparent={true}
//         onRequestClose={() => setConfirmPaymentDialog(false)}
//       >
//         <View className="flex-1 bg-black/50 justify-center items-center p-4">
//           <View className="bg-white rounded-2xl w-full max-w-md">
//             <View className="p-6">
//               <Text className="text-xl font-bold text-gray-800 mb-4">
//                 Payment Confirmation
//               </Text>

//               <View className="mb-4">
//                 <Text className="text-2xl font-bold text-blue-600">
//                   Payment of: ৳ {formatCurrency(totalCalculatedAmount)}
//                 </Text>
//               </View>

//               {chargeSetup && chargeList.length > 0 && (
//                 <View className="mb-4">
//                   {chargeSetup.calculation_type === "percentage" ? (
//                     <View className="bg-gray-50 border border-gray-200 rounded-lg p-3">
//                       <Text className="text-xs text-gray-600">
//                         {chargeSetup.title} — {chargeSetup.amount}% of total = ৳
//                         {(
//                           totalCalculatedAmount *
//                           (parseFloat(chargeSetup.amount) / 100)
//                         ).toFixed(2)}
//                       </Text>
//                     </View>
//                   ) : (
//                     <View className="bg-gray-50 border border-gray-200 rounded-lg p-3">
//                       <Text className="text-xs text-gray-600">
//                         {chargeSetup.title} : ৳{" "}
//                         {formatCurrency(totalChargeAmount)}
//                       </Text>
//                     </View>
//                   )}
//                 </View>
//               )}

//               <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
//                 <Text className="text-xs text-yellow-800">
//                   বিশেষ দ্রষ্টব্যঃ পেমেন্ট পোর্টালে প্রয়োজনীয় ধাপগুলো সম্পন্ন না
//                   করে থাকলে (যেমন: ব্রাউজার বন্ধ করে দেয়া / পোর্টাল থেকে ফিরে
//                   আসা), সংশ্লিষ্ট পেমেন্টটি ৩০ মিনিটের জন্য ‘PENDING’ অবস্থায়
//                   থাকবে। এই সময়ের মধ্যে উক্ত পেমেন্ট প্রক্রিয়া আর চালিয়ে নেওয়া
//                   সম্ভব হবে না।
//                 </Text>
//               </View>

//               <View className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
//                 <Text className="text-xs text-blue-800">
//                   Clicking proceed will take you to the associated payment
//                   portal
//                 </Text>
//               </View>

//               <View className="flex-row justify-end space-x-2">
//                 <TouchableOpacity
//                   onPress={() => setConfirmPaymentDialog(false)}
//                   className="px-6 py-3 border border-gray-300 rounded-lg"
//                   disabled={loading}
//                 >
//                   <Text className="text-gray-700 font-medium">Cancel</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   onPress={proceedPayment}
//                   disabled={totalCalculatedAmount <= 0 || isPaymentProcessing}
//                   className={`flex-row items-center px-6 py-3 rounded-lg ${totalCalculatedAmount > 0 && !isPaymentProcessing ? "bg-blue-600" : "bg-gray-300"}`}
//                 >
//                   {isPaymentProcessing ? (
//                     <ActivityIndicator color="white" />
//                   ) : (
//                     <>
//                       <Feather name="send" size={18} color="white" />
//                       <Text className="text-white font-medium ml-2">
//                         Proceed
//                       </Text>
//                     </>
//                   )}
//                 </TouchableOpacity>
//               </View>
//             </View>
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// };

// export default AvailablePayment;
// ==============================================main component================================================

// import { useGetInstituteInfoQuery } from "@/redux/allApi/authApi/authApi";
// import {
//   usePaymentRequestMutation,
//   usePaymentSearchQuery,
// } from "@/redux/allApi/invoices/invoicesApi";
// import { Feather, MaterialIcons } from "@expo/vector-icons";
// import dayjs from "dayjs";
// import CheckBox from "expo-checkbox";
// import { useRouter } from "expo-router";
// import React, { useEffect, useMemo, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   FlatList,
//   Modal,
//   RefreshControl,
//   ScrollView,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import Collapsible from "react-native-collapsible";

// interface FeeSubhead {
//   payapplies_id: number;
//   feesubhead: string;
//   feesubhead_id: number;
//   academic_year_id: number;
//   academic_year: string;
//   payable_date: string;
//   payable_amount: string;
//   fine: number;
//   fine_paid_amount: string;
//   waiver: string | null;
//   waiver_amount: number;
//   payapply_state: string;
//   previous_paid: string;
//   previous_due: string;
//   calculated_amount: number;
//   partial_payment?: number;
// }

// interface FeeHead {
//   id: number;
//   fee_head_name: string;
//   total_payable_feeheadwise: number;
//   fee_subheads: FeeSubhead[];
// }

// interface ChargeSetup {
//   id: number;
//   title: string;
//   calculation_type: "percentage" | "fixed";
//   amount: string;
// }

// interface PaymentData {
//   errors: any;
//   status: "success";
//   charge_setup: ChargeSetup;
//   all_charges: Array<{
//     id: number;
//     amount: string;
//   }>;
//   all_payments: {
//     processed_payments: FeeHead[];
//     base_total: number;
//     grand_total: number;
//     total_waiver: number;
//     total_fine: number;
//     total_paid: number;
//   };
//   paymentSetting: string;
// }

// const AvailablePayment = () => {
//   const router = useRouter();
//   const [expandedRows, setExpandedRows] = useState<{ [key: number]: boolean }>(
//     {},
//   );
//   const [selectedFeesubheads, setSelectedFeesubheads] = useState<{
//     [key: number]: FeeSubhead[];
//   }>({});
//   const [autoSelectedSubheads, setAutoSelectedSubheads] = useState<{
//     [key: number]: FeeSubhead[];
//   }>({});
//   const [confirmPaymentDialog, setConfirmPaymentDialog] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [refreshing, setRefreshing] = useState(false);
//   const { data: instituteData } = useGetInstituteInfoQuery({});

//   const {
//     data: paymentSearch,
//     isLoading,
//     refetch: refetchPayment,
//   } = usePaymentSearchQuery({});

//   const userData = instituteData?.payload?.data?.user || {};
//   const paymentData: PaymentData = paymentSearch?.payload?.data;
//   const [paymentRequest, { isLoading: isPaymentProcessing }] =
//     usePaymentRequestMutation();
//   // const noticeBoard = [
//   //   "সম্মানিত অভিভাবকবৃন্দের অবগতির জন্য জানানো যাচ্ছে যে, ইয়ার ক্লোজিং কার্যক্রমের কারণে আগামী ৩০ ও ৩১ ডিসেম্বর ২০২৫ ইং তারিখে স্কুলের সকল ধরনের ট্রানজেকশন সাময়িকভাবে বন্ধ থাকবে। আগামী ১ জানুয়ারি ২০২৬ ইং তারিখ থেকে সকল ধরনের ট্রানজেকশন পুনরায় চালু থাকবে।",
//   // ];

//   const feeHeads = paymentData?.all_payments?.processed_payments || [];
//   const chargeSetup = paymentData?.charge_setup;
//   const chargeList = paymentData?.all_charges || [];
//   const student_online_payment_setting = paymentData?.paymentSetting;
//   const fees_payment_by_web = "yes";

//   useEffect(() => {
//     if (feeHeads.length > 0) {
//       const today = dayjs().format("YYYY-MM-DD");
//       const newAutoSelected: { [key: number]: FeeSubhead[] } = {};
//       const newSelected: { [key: number]: FeeSubhead[] } = {};

//       feeHeads.forEach((feeHead) => {
//         const autoSelected = feeHead.fee_subheads.filter(
//           (subhead) =>
//             subhead.payable_date &&
//             (dayjs(subhead.payable_date).isSame(today, "day") ||
//               dayjs(subhead.payable_date).isBefore(today, "day")),
//         );

//         newAutoSelected[feeHead.id] = autoSelected;
//         newSelected[feeHead.id] = [...autoSelected];
//       });

//       setAutoSelectedSubheads(newAutoSelected);
//       setSelectedFeesubheads(newSelected);
//     }
//   }, [feeHeads]);

//   const formatCurrency = (value: number | string) => {
//     const num = typeof value === "string" ? parseFloat(value) : value;
//     return isNaN(num)
//       ? "0.00"
//       : num.toLocaleString("en-US", {
//           minimumFractionDigits: 2,
//           maximumFractionDigits: 2,
//         });
//   };

//   const totalCalculatedAmount = useMemo(() => {
//     let total = 0;
//     for (const feeheadId in selectedFeesubheads) {
//       const subheads = selectedFeesubheads[Number(feeheadId)];
//       if (Array.isArray(subheads)) {
//         for (const item of subheads) {
//           const amount =
//             item.partial_payment != null && !isNaN(item.partial_payment)
//               ? Number(item.partial_payment)
//               : Number(item.calculated_amount || 0);
//           total += amount;
//         }
//       }
//     }
//     return total;
//   }, [selectedFeesubheads]);

//   // const getPayableAmount = (
//   //   feeHeadId: number,
//   //   amount_type: keyof FeeSubhead ,
//   // ) => {
//   //   const subheads = selectedFeesubheads[feeHeadId];
//   //   if (!Array.isArray(subheads)) return "0.00";

//   //   return subheads
//   //     .reduce((sum, subhead) => {
//   //       let amount = 0;
//   //       if (amount_type === "calculated_amount") {
//   //         const partial = subhead.partial_payment;
//   //         if (partial !== undefined && partial !== null) {
//   //           amount = Number(partial) || 0;
//   //         } else {
//   //           amount = Number(subhead.calculated_amount) || 0;
//   //         }
//   //       } else {
//   //         amount = Number(subhead[amount_type]) || 0;
//   //       }
//   //       return sum + amount;
//   //     }, 0)
//   //     .toFixed(2);
//   // };
//   const getPayableAmount = (
//     feeHeadId: number,
//     amount_type: keyof FeeSubhead | "current_due",
//   ) => {
//     const subheads = selectedFeesubheads[feeHeadId];
//     if (!Array.isArray(subheads)) return "0.00";

//     // Handle current_due specially since it's not in FeeSubhead interface
//     if (amount_type === "current_due") {
//       return subheads
//         .reduce((sum, subhead) => {
//           const due = getCurrentDue(subhead);
//           return sum + parseFloat(due);
//         }, 0)
//         .toFixed(2);
//     }

//     // Handle other amount types
//     return subheads
//       .reduce((sum, subhead) => {
//         let amount = 0;
//         if (amount_type === "calculated_amount") {
//           const partial = subhead.partial_payment;
//           if (partial !== undefined && partial !== null) {
//             amount = Number(partial) || 0;
//           } else {
//             amount = Number(subhead.calculated_amount) || 0;
//           }
//         } else {
//           amount = Number(subhead[amount_type]) || 0;
//         }
//         return sum + amount;
//       }, 0)
//       .toFixed(2);
//   };
//   const getCurrentDue = (data: FeeSubhead) => {
//     if (!data.partial_payment) return "0.00";
//     const current_due =
//       parseFloat(data.calculated_amount.toString()) -
//       parseFloat(data.partial_payment.toString());
//     return current_due.toFixed(2);
//   };

//   const toggleRow = (id: number) => {
//     setExpandedRows((prev) => ({
//       ...prev,
//       [id]: !prev[id],
//     }));
//   };
//   const onRefresh = async () => {
//     setRefreshing(true);
//     try {
//       // ডাটা রিফ্রেশ করো
//       await refetchPayment().unwrap(); // RTK Query-এর refetch
//       // Optional: institute info-ও রিফ্রেশ করতে চাইলে
//       // await refetchInstitute().unwrap();  (যদি useGetInstituteInfoQuery-এর refetch নাও)
//     } catch (err) {
//       console.error("Refresh failed:", err);
//       // Optional: ইউজারকে ছোট্ট টোস্ট দেখাতে পারো
//       Alert.alert("Refresh Failed", "Couldn't update data. Please try again.");
//     } finally {
//       setRefreshing(false);
//     }
//   };
//   const handleSubheadSelect = (
//     feeHeadId: number,
//     subhead: FeeSubhead,
//     isSelected: boolean,
//   ) => {
//     const currentSelected = selectedFeesubheads[feeHeadId] || [];
//     const autoSelected = autoSelectedSubheads[feeHeadId] || [];
//     const isAutoSelected = autoSelected.some(
//       (item) => item.payapplies_id === subhead.payapplies_id,
//     );

//     // If it's auto-selected, don't allow deselecting
//     if (isAutoSelected && !isSelected) {
//       return;
//     }

//     let newSelected;
//     if (isSelected) {
//       newSelected = [...currentSelected, subhead];
//     } else {
//       newSelected = currentSelected.filter(
//         (item) => item.payapplies_id !== subhead.payapplies_id,
//       );
//     }

//     // Ensure auto-selected items are always included
//     const finalSelected = [
//       ...newSelected.filter(
//         (item) =>
//           !autoSelected.some(
//             (auto) => auto.payapplies_id === item.payapplies_id,
//           ),
//       ),
//       ...autoSelected,
//     ];

//     setSelectedFeesubheads((prev) => ({
//       ...prev,
//       [feeHeadId]: finalSelected,
//     }));
//   };

//   const handlePartialPaymentChange = (
//     feeHeadId: number,
//     subheadId: number,
//     value: string,
//   ) => {
//     const numValue = parseFloat(value) || 0;
//     const subheads = selectedFeesubheads[feeHeadId] || [];

//     const updatedSubheads = subheads.map((subhead) => {
//       if (subhead.payapplies_id === subheadId) {
//         return {
//           ...subhead,
//           partial_payment: numValue,
//         };
//       }
//       return subhead;
//     });

//     setSelectedFeesubheads((prev) => ({
//       ...prev,
//       [feeHeadId]: updatedSubheads,
//     }));
//   };

//   const isLockedRow = (feeHeadId: number, subhead: FeeSubhead) => {
//     return autoSelectedSubheads[feeHeadId]?.some(
//       (item) => item.payapplies_id === subhead.payapplies_id,
//     );
//   };

//   const paymentConfirmation = () => {
//     if (totalCalculatedAmount <= 0) {
//       Alert.alert("Error", "Please select at least one fee to pay");
//       return;
//     }
//     setConfirmPaymentDialog(true);
//   };

//   const proceedPayment = async () => {
//     try {
//       // Prepare payment data
//       const paymentRequestData = {
//         payapplies_id: [] as number[],
//         amount: [] as number[],
//       };

//       for (const feeHeadId in selectedFeesubheads) {
//         const subheads = selectedFeesubheads[Number(feeHeadId)];
//         if (Array.isArray(subheads)) {
//           subheads.forEach((subhead) => {
//             paymentRequestData.payapplies_id.push(subhead.payapplies_id);
//             const amount =
//               subhead.partial_payment != null && !isNaN(subhead.partial_payment)
//                 ? Number(subhead.partial_payment)
//                 : Number(subhead.calculated_amount || 0);
//             paymentRequestData.amount.push(amount);
//           });
//         }
//       }

//       // Call the payment API
//       const response = await paymentRequest(paymentRequestData).unwrap();
//       if (response) {
//         // Handle different success scenarios
//         if (response.payment_url) {
//           // For webview payment (like SSLCommerz)
//           router.push({
//             pathname: "/payments/available_payment/paymentwebview",
//             params: {
//               payment_url: response.payment_url,
//               transaction_id: response.transaction_id,
//               amount: totalCalculatedAmount.toString(),
//             },
//           });
//         } else if (response.html) {
//           // Handle HTML form submission (less common in mobile)
//         } else {
//           // Direct success
//           router.push({
//             pathname: "/payments/available_payment/success",
//             params: {
//               transaction_id: response.transaction_id || Date.now().toString(),
//               invoice_no: response.invoice_no || `INV-${Date.now()}`,
//               amount_paid: totalCalculatedAmount.toString(),
//               payment_date: new Date().toISOString(),
//               message: response.message || "Payment completed successfully",
//             },
//           });
//         }
//       } else {
//         // Payment failed
//         router.push({
//           pathname: "/payments/available_payment/fail",
//           params: {
//             error_message:
//               response.error || "Payment failed. Please try again.",
//             transaction_id: response.transaction_id || "",
//             amount: totalCalculatedAmount.toString(),
//           },
//         });
//       }

//       setConfirmPaymentDialog(false);
//     } catch (error: any) {
//       let errorMessage = "Failed to process payment. Please try again.";

//       // 1. RTK Query standard error shape
//       if (
//         error?.data?.errors?.system_error &&
//         Array.isArray(error.data.errors.system_error)
//       ) {
//         // Extract all messages from the array of error objects
//         const messages = error.data.errors.system_error
//           .map((errObj: any) => errObj?.message || errObj?.msg || "")
//           .filter(Boolean);

//         if (messages.length > 0) {
//           errorMessage = messages.join("\n• ");
//           // Optional: prefix if you want
//           // errorMessage = "The following issues occurred:\n• " + messages.join("\n• ");
//         }
//       }
//       // 2. Fallback to other common places
//       else if (error?.data?.message) {
//         errorMessage = error.data.message;
//       } else if (error?.data?.error) {
//         errorMessage = error.data.error;
//       } else if (error?.message) {
//         errorMessage = error.message;
//       }

//       // ──────────────────────────────────────────────────────────────
//       // Show nice alert
//       // ──────────────────────────────────────────────────────────────
//       Alert.alert(
//         "Payment Error",
//         errorMessage,
//         [
//           {
//             text: "OK",
//             onPress: () => {
//               setConfirmPaymentDialog(false);
//               // Optional: reset selection or refresh data here if needed
//             },
//           },
//         ],
//         { cancelable: true },
//       );

//       console.error("Payment error:", error);
//       // console.error("Payment error:", error);
//       // Alert.alert(
//       //   "Payment Error",
//       //   error?.data?.error ||
//       //     error?.message ||
//       //     "Failed to process payment. Please try again.",
//       //   [{ text: "OK", onPress: () => setConfirmPaymentDialog(false) }],
//       // );
//     }
//   };

//   const totalChargeAmount = useMemo(() => {
//     return chargeList.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
//   }, [chargeList]);

//   // Render fee head item
//   const renderFeeHeadItem = ({ item }: { item: FeeHead }) => {
//     const isExpanded = expandedRows[item.id] || false;
//     const selectedSubheads = selectedFeesubheads[item.id] || [];

//     return (
//       <View className="mb-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
//         {/* Fee Head Header */}
//         <TouchableOpacity
//           onPress={() => toggleRow(item.id)}
//           className="flex-row items-center p-4 border-b border-gray-100"
//         >
//           <MaterialIcons
//             name={isExpanded ? "expand-less" : "expand-more"}
//             size={24}
//             color="#6b7280"
//           />
//           <View className="ml-3 flex-1">
//             <Text className="text-lg font-semibold text-gray-800">
//               {item.fee_head_name}
//             </Text>
//           </View>
//           <View className="flex-row items-center">
//             <Text className="text-blue-600 font-medium mr-2">
//               ৳ {formatCurrency(item.total_payable_feeheadwise)}
//             </Text>
//             <Feather name="chevron-right" size={20} color="#6b7280" />
//           </View>
//         </TouchableOpacity>

//         {/* Fee Head Details */}
//         <View className="p-4">
//           <View className="flex-row flex-wrap mb-3">
//             <View className="w-1/2 mb-2">
//               <Text className="text-xs text-gray-500">Fee Subheads</Text>
//               <View className="mt-1">
//                 {student_online_payment_setting.toLowerCase() ===
//                 "due upto current date" ? (
//                   <View className="flex-row flex-wrap gap-1">
//                     {item.fee_subheads.map((subhead) => {
//                       const isAutoSelected = autoSelectedSubheads[
//                         item.id
//                       ]?.some(
//                         (item) => item.payapplies_id === subhead.payapplies_id,
//                       );
//                       const isSelected = selectedSubheads.some(
//                         (s) => s.payapplies_id === subhead.payapplies_id,
//                       );

//                       return (
//                         <TouchableOpacity
//                           key={subhead.payapplies_id}
//                           onPress={() =>
//                             handleSubheadSelect(item.id, subhead, !isSelected)
//                           }
//                           disabled={isAutoSelected}
//                           className={`px-3 py-1.5 rounded-full ${isSelected ? "bg-blue-100 border border-blue-300" : "bg-gray-100 border border-gray-200"} ${isAutoSelected ? "opacity-60" : ""}`}
//                         >
//                           <Text
//                             className={`text-xs font-medium ${isSelected ? "text-blue-700" : "text-gray-600"}`}
//                           >
//                             {subhead.feesubhead}
//                           </Text>
//                         </TouchableOpacity>
//                       );
//                     })}
//                   </View>
//                 ) : (
//                   <View className="flex-row flex-wrap gap-1">
//                     {item.fee_subheads.map((subhead) => {
//                       const isSelected = selectedSubheads.some(
//                         (s) => s.payapplies_id === subhead.payapplies_id,
//                       );

//                       return (
//                         <TouchableOpacity
//                           key={subhead.payapplies_id}
//                           onPress={() =>
//                             handleSubheadSelect(item.id, subhead, !isSelected)
//                           }
//                           className={`px-3 py-1.5 rounded-full ${isSelected ? "bg-blue-100 border border-blue-300" : "bg-gray-100 border border-gray-200"}`}
//                         >
//                           <Text
//                             className={`text-xs font-medium ${isSelected ? "text-blue-700" : "text-gray-600"}`}
//                           >
//                             {subhead.feesubhead}
//                           </Text>
//                         </TouchableOpacity>
//                       );
//                     })}
//                   </View>
//                 )}
//               </View>
//             </View>
//           </View>

//           {/* Summary Row */}
//           <View className="flex-row flex-wrap justify-between border-t border-gray-100 pt-3">
//             <View className="w-1/3 mb-2">
//               <Text className="text-xs text-gray-500">Total Payable</Text>
//               <Text className="text-sm font-medium mt-1">
//                 ৳ {getPayableAmount(item.id, "payable_amount")}
//               </Text>
//             </View>
//             <View className="w-1/3 mb-2">
//               <Text className="text-xs text-gray-500">Previous Paid</Text>
//               <Text className="text-sm font-medium text-blue-600 mt-1">
//                 ৳ {getPayableAmount(item.id, "previous_paid")}
//               </Text>
//             </View>
//             <View className="w-1/3 mb-2">
//               <Text className="text-xs text-gray-500">Previous Due</Text>
//               <Text className="text-sm font-medium text-red-500 mt-1">
//                 ৳ {getPayableAmount(item.id, "previous_due")}
//               </Text>
//             </View>
//             <View className="w-1/3 mb-2">
//               <Text className="text-xs text-gray-500">Fine</Text>
//               <Text className="text-sm font-medium mt-1">
//                 ৳ {getPayableAmount(item.id, "fine")}
//               </Text>
//             </View>
//             <View className="w-1/3 mb-2">
//               <Text className="text-xs text-gray-500">Waiver</Text>
//               <Text className="text-sm font-medium mt-1">
//                 ৳ {getPayableAmount(item.id, "waiver_amount")}
//               </Text>
//             </View>
//             <View className="w-1/3 mb-2">
//               <Text className="text-xs text-gray-500">Payment of</Text>
//               <Text className="text-sm font-medium mt-1">
//                 ৳ {getPayableAmount(item.id, "calculated_amount")}
//               </Text>
//             </View>
//             <View className="w-1/3 mb-2">
//               <Text className="text-xs text-gray-500">Total Due</Text>
//               <Text className="text-sm font-medium mt-1">
//                 ৳ {getPayableAmount(item.id, "current_due")}
//               </Text>
//             </View>
//           </View>
//         </View>

//         {/* Expanded Subheads Table */}
//         {/* <Collapsible collapsed={!isExpanded}>
//           <View className="border-t border-gray-100">
//             <View className="bg-gray-50 flex-row p-3 border-b border-gray-200">
//               <View className="w-10">
//                 <Text className="text-xs font-semibold text-gray-700"></Text>
//               </View>
//               <View className="flex-1">
//                 <Text className="text-xs font-semibold text-gray-700">
//                   Academic Year
//                 </Text>
//               </View>
//               <View className="flex-1">
//                 <Text className="text-xs font-semibold text-gray-700">
//                   Fee-Subhead
//                 </Text>
//               </View>
//               <View className="flex-1">
//                 <Text className="text-xs font-semibold text-gray-700">
//                   Payable Date
//                 </Text>
//               </View>
//               <View className="flex-1">
//                 <Text className="text-xs font-semibold text-gray-700">
//                   Payable
//                 </Text>
//               </View>
//               <View className="flex-1">
//                 <Text className="text-xs font-semibold text-gray-700">
//                   Previous Due
//                 </Text>
//               </View>
//               <View className="flex-1">
//                 <Text className="text-xs font-semibold text-gray-700">
//                   Fine
//                 </Text>
//               </View>
//               <View className="flex-1">
//                 <Text className="text-xs font-semibold text-gray-700">
//                   Waiver
//                 </Text>
//               </View>
//               <View className="flex-2">
//                 <Text className="text-xs font-semibold text-gray-700">
//                   Payment of
//                 </Text>
//               </View>
//               <View className="flex-1">
//                 <Text className="text-xs font-semibold text-gray-700">
//                   Due Amount
//                 </Text>
//               </View>
//             </View>

//             {item.fee_subheads.map((subhead) => {
//               const isLocked = isLockedRow(item.id, subhead);
//               const isSelected = selectedSubheads.some(
//                 (s) => s.payapplies_id === subhead.payapplies_id,
//               );

//               return (
//                 <View
//                   key={subhead.payapplies_id}
//                   className="flex-row p-3 border-b border-gray-100"
//                 >
//                   <View className="w-10 justify-center">
//                     <CheckBox
//                       value={isSelected}
//                       onValueChange={(newValue) =>
//                         handleSubheadSelect(item.id, subhead, newValue)
//                       }
//                       disabled={isLocked}
//                       color={isLocked ? "#9ca3af" : "#3b82f6"}
//                     />
//                   </View>
//                   <View className="flex-1 justify-center">
//                     <Text className="text-xs text-gray-700">
//                       {subhead.academic_year}
//                     </Text>
//                   </View>
//                   <View className="flex-1 justify-center">
//                     <Text className="text-xs text-gray-700">
//                       {subhead.feesubhead}
//                     </Text>
//                   </View>
//                   <View className="flex-1 justify-center">
//                     <Text className="text-xs text-gray-700">
//                       {subhead.payable_date}
//                     </Text>
//                   </View>
//                   <View className="flex-1 justify-center">
//                     <Text className="text-xs text-gray-700">
//                       ৳ {formatCurrency(subhead.payable_amount)}
//                     </Text>
//                   </View>
//                   <View className="flex-1 justify-center">
//                     <Text className="text-xs text-gray-700">
//                       ৳ {formatCurrency(subhead.previous_due)}
//                     </Text>
//                   </View>
//                   <View className="flex-1 justify-center">
//                     <View className="flex-row items-center">
//                       {Number(subhead.fine) >
//                       Number(subhead.fine_paid_amount) ? (
//                         <MaterialIcons name="info" size={14} color="#f59e0b" />
//                       ) : Number(subhead.fine_paid_amount) ===
//                         Number(subhead.fine) ? (
//                         <MaterialIcons
//                           name="check-circle"
//                           size={14}
//                           color="#10b981"
//                         />
//                       ) : null}
//                       <Text className="text-xs text-gray-700 ml-1">
//                         ৳ {subhead.fine}
//                       </Text>
//                     </View>
//                   </View>
//                   <View className="flex-1 justify-center">
//                     <Text className="text-xs text-gray-700">
//                       ৳ {subhead.waiver_amount}
//                     </Text>
//                   </View>
//                   <View className="flex-2">
//                     <View className="flex-row items-center space-x-2">
//                       <Text className="text-xs text-gray-700 flex-1">
//                         ৳ {formatCurrency(subhead.calculated_amount)}
//                       </Text>
//                       {student_online_payment_setting.toLowerCase() ===
//                         "partial payment on subhead" && (
//                         <TextInput
//                           value={subhead.partial_payment?.toString() || ""}
//                           onChangeText={(text) =>
//                             handlePartialPaymentChange(
//                               item.id,
//                               subhead.payapplies_id,
//                               text,
//                             )
//                           }
//                           placeholder="Partial"
//                           keyboardType="numeric"
//                           editable={isSelected}
//                           className={`flex-1 border ${isSelected ? "border-blue-300" : "border-gray-300"} rounded px-2 py-1 text-xs`}
//                         />
//                       )}
//                     </View>
//                   </View>
//                   <View className="flex-1 justify-center">
//                     <Text className="text-xs text-gray-700">
//                       {isSelected ? `৳ ${getCurrentDue(subhead)}` : "৳ 0.00"}
//                     </Text>
//                   </View>
//                 </View>
//               );
//             })}
//           </View>
//         </Collapsible> */}
//         <Collapsible collapsed={!isExpanded}>
//           <View className="border-t border-gray-100">
//             {/* Scrollable table container */}
//             <ScrollView
//               horizontal
//               showsHorizontalScrollIndicator={true}
//               className="bg-gray-50"
//             >
//               <View className="min-w-full">
//                 {/* Table Header */}
//                 <View className="flex-row p-3 border-b border-gray-200">
//                   <View className="w-10">
//                     <Text className="text-xs font-semibold text-gray-700"></Text>
//                   </View>
//                   <View className="w-24">
//                     <Text className="text-xs font-semibold text-gray-700">
//                       Academic Year
//                     </Text>
//                   </View>
//                   <View className="w-24">
//                     <Text className="text-xs font-semibold text-gray-700">
//                       Fee-Subhead
//                     </Text>
//                   </View>
//                   <View className="w-24">
//                     <Text className="text-xs font-semibold text-gray-700">
//                       Payable Date
//                     </Text>
//                   </View>
//                   <View className="w-20">
//                     <Text className="text-xs font-semibold text-gray-700">
//                       Payable
//                     </Text>
//                   </View>
//                   <View className="w-24">
//                     <Text className="text-xs font-semibold text-gray-700">
//                       Previous Due
//                     </Text>
//                   </View>
//                   <View className="w-16">
//                     <Text className="text-xs font-semibold text-gray-700">
//                       Fine
//                     </Text>
//                   </View>
//                   <View className="w-16">
//                     <Text className="text-xs font-semibold text-gray-700">
//                       Waiver
//                     </Text>
//                   </View>
//                   <View className="w-32">
//                     <Text className="text-xs font-semibold text-gray-700">
//                       Payment of
//                     </Text>
//                   </View>
//                   <View className="w-24">
//                     <Text className="text-xs font-semibold text-gray-700">
//                       Due Amount
//                     </Text>
//                   </View>
//                 </View>

//                 {/* Table Body with FlatList */}
//                 <FlatList
//                   data={item.fee_subheads}
//                   keyExtractor={(subhead: FeeSubhead) =>
//                     subhead.payapplies_id.toString()
//                   }
//                   renderItem={({ item: subhead }: { item: FeeSubhead }) => {
//                     const isLocked = autoSelectedSubheads[item.id]?.some(
//                       (autoItem) =>
//                         autoItem.payapplies_id === subhead.payapplies_id,
//                     );
//                     const isSelected = selectedSubheads.some(
//                       (s) => s.payapplies_id === subhead.payapplies_id,
//                     );

//                     return (
//                       <View className="flex-row p-3 border-b border-gray-100 min-w-full">
//                         <View className="w-10 justify-center">
//                           <CheckBox
//                             value={isSelected}
//                             onValueChange={(newValue: boolean) =>
//                               handleSubheadSelect(item.id, subhead, newValue)
//                             }
//                             disabled={isLocked}
//                             color={isLocked ? "#9ca3af" : "#3b82f6"}
//                           />
//                         </View>

//                         <View className="w-24 justify-center">
//                           <Text className="text-xs text-gray-700">
//                             {subhead.academic_year}
//                           </Text>
//                         </View>

//                         <View className="w-24 justify-center">
//                           <Text className="text-xs text-gray-700">
//                             {subhead.feesubhead}
//                           </Text>
//                         </View>

//                         <View className="w-24 justify-center">
//                           <Text className="text-xs text-gray-700">
//                             {subhead.payable_date}
//                           </Text>
//                         </View>

//                         <View className="w-20 justify-center">
//                           <Text className="text-xs text-gray-700">
//                             ৳ {formatCurrency(subhead.payable_amount)}
//                           </Text>
//                         </View>

//                         <View className="w-24 justify-center">
//                           <Text className="text-xs text-gray-700">
//                             ৳ {formatCurrency(subhead.previous_due)}
//                           </Text>
//                         </View>

//                         <View className="w-16 justify-center">
//                           <View className="flex-row items-center">
//                             {Number(subhead.fine) >
//                             Number(subhead.fine_paid_amount) ? (
//                               <MaterialIcons
//                                 name="info"
//                                 size={14}
//                                 color="#f59e0b"
//                               />
//                             ) : Number(subhead.fine_paid_amount) ===
//                               Number(subhead.fine) ? (
//                               <MaterialIcons
//                                 name="check-circle"
//                                 size={14}
//                                 color="#10b981"
//                               />
//                             ) : null}
//                             <Text className="text-xs text-gray-700 ml-1">
//                               ৳ {subhead.fine}
//                             </Text>
//                           </View>
//                         </View>

//                         <View className="w-16 justify-center">
//                           <Text className="text-xs text-gray-700">
//                             ৳ {subhead.waiver_amount}
//                           </Text>
//                         </View>

//                         <View className="w-32">
//                           <View className="flex-row items-center space-x-2">
//                             <Text className="text-xs text-gray-700 flex-1">
//                               ৳ {formatCurrency(subhead.calculated_amount)}
//                             </Text>
//                             {student_online_payment_setting.toLowerCase() ===
//                               "partial payment on subhead" && (
//                               <View className="flex-1">
//                                 <TextInput
//                                   value={
//                                     subhead.partial_payment?.toString() || ""
//                                   }
//                                   onChangeText={(text: string) => {
//                                     const numericValue = parseFloat(text) || 0;
//                                     const payableAmount =
//                                       parseFloat(
//                                         subhead.calculated_amount.toString(),
//                                       ) || 0;

//                                     // Check if input is invalid (contains non-numeric except decimal)
//                                     if (text && !/^\d*\.?\d*$/.test(text)) {
//                                       return; // Don't update for invalid input
//                                     }

//                                     // Validate: can't exceed payable amount
//                                     if (numericValue > payableAmount) {
//                                       // Show warning but don't auto-correct yet
//                                       Alert.alert(
//                                         "Invalid Amount",
//                                         `Partial payment cannot exceed payable amount of ৳${payableAmount.toFixed(2)}`,
//                                         [{ text: "OK" }],
//                                       );
//                                       // Auto-correct to payable amount
//                                       handlePartialPaymentChange(
//                                         item.id,
//                                         subhead.payapplies_id,
//                                         payableAmount.toString(),
//                                       );
//                                     } else {
//                                       handlePartialPaymentChange(
//                                         item.id,
//                                         subhead.payapplies_id,
//                                         text,
//                                       );
//                                     }
//                                   }}
//                                   onBlur={() => {
//                                     // Validate on blur as well
//                                     const currentValue =
//                                       subhead.partial_payment || 0;
//                                     const payableAmount =
//                                       parseFloat(
//                                         subhead.calculated_amount.toString(),
//                                       ) || 0;

//                                     if (currentValue > payableAmount) {
//                                       handlePartialPaymentChange(
//                                         item.id,
//                                         subhead.payapplies_id,
//                                         payableAmount.toString(),
//                                       );
//                                     }
//                                   }}
//                                   placeholder="Partial"
//                                   keyboardType="numeric"
//                                   editable={isSelected}
//                                   className={`border ${isSelected ? "border-blue-300" : "border-gray-300"} rounded px-2 py-1 text-xs`}
//                                   maxLength={15}
//                                 />
//                                 {subhead.partial_payment && (
//                                   <Text className="text-xs text-gray-500 mt-1">
//                                     Max: ৳
//                                     {formatCurrency(subhead.calculated_amount)}
//                                   </Text>
//                                 )}
//                               </View>
//                             )}
//                           </View>
//                         </View>

//                         <View className="w-24 justify-center">
//                           <Text className="text-xs text-gray-700">
//                             {isSelected
//                               ? `৳ ${getCurrentDue(subhead)}`
//                               : "৳ 0.00"}
//                           </Text>
//                         </View>
//                       </View>
//                     );
//                   }}
//                   scrollEnabled={false}
//                   initialNumToRender={5}
//                   windowSize={5}
//                   removeClippedSubviews={true}
//                   getItemLayout={(_, index) => ({
//                     length: 48,
//                     offset: 48 * index,
//                     index,
//                   })}
//                   ListEmptyComponent={
//                     <View className="p-4 items-center min-w-full">
//                       <Text className="text-gray-500">
//                         No subheads available
//                       </Text>
//                     </View>
//                   }
//                 />
//               </View>
//             </ScrollView>
//           </View>
//         </Collapsible>
//       </View>
//     );
//   };

//   if (isLoading && !refreshing) {
//     // শুধু প্রথম লোডে দেখাবে, refresh-এ না
//     return (
//       <View className="flex-1 bg-gray-50 items-center justify-center">
//         <ActivityIndicator size="large" color="#3b82f6" />
//         <Text className="mt-4 text-gray-600">
//           Loading payment information...
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <View className="flex-1 bg-gray-50">
//       <FlatList
//         data={[]}
//         renderItem={() => null}
//         ListHeaderComponent={
//           <>
//             {/* Student Info Card */}
//             <View className="mx-4 mt-5 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
//               <Text className="text-xl font-bold text-blue-700 mb-3">
//                 {userData.student_name}{" "}
//                 <Text className="text-gray-600 text-base">
//                   (SID: {userData.student_id || "—"})
//                 </Text>
//               </Text>
//               <View className="flex-row flex-wrap justify-between gap-4">
//                 <View>
//                   <Text className="text-gray-600">
//                     Academic Year: {userData.academic_year || "—"}
//                   </Text>
//                   <Text className="text-gray-600">
//                     Department: {userData.department_name || "—"}
//                   </Text>
//                   <Text className="text-gray-600">
//                     Class: {userData.class_name || "—"} -{" "}
//                     {userData.shift || "—"} - {userData.section || "—"}
//                   </Text>
//                 </View>
//                 <View>
//                   <Text className="text-gray-600">
//                     Group: {userData.group || "—"}
//                   </Text>
//                   <Text className="text-gray-600">
//                     Roll: {userData.roll || "—"}
//                   </Text>
//                 </View>
//               </View>
//             </View>

//             {/* Notice Board */}
//             {/* {noticeBoard.length > 0 && (
//               <View className="mx-4 mt-4">
//                 {noticeBoard.map((notice, index) => (
//                   <View
//                     key={index}
//                     className="bg-yellow-50 border border-yellow-200 rounded-lg p-3"
//                   >
//                     <ScrollView
//                       horizontal
//                       showsHorizontalScrollIndicator={false}
//                     >
//                       <Text className="text-yellow-800 text-sm">{notice}</Text>
//                     </ScrollView>
//                   </View>
//                 ))}
//               </View>
//             )} */}

//             {/* Payable List */}
//             {/* Payable List */}
//             {feeHeads.length > 0 ? (
//               <View className="mx-4 mt-4">
//                 <View className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//                   <View className="p-4 border-b border-gray-200">
//                     <Text className="text-lg font-bold text-gray-800">
//                       Payable List
//                     </Text>
//                   </View>

//                   <View className="p-4 border-b border-gray-100">
//                     <View className="flex-row items-center justify-between">
//                       <View className="flex-row space-x-2">
//                         {totalCalculatedAmount > 0 ? (
//                           <View className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
//                             <Text className="text-blue-700 font-medium">
//                               Payment Amount: ৳{" "}
//                               {formatCurrency(totalCalculatedAmount)}
//                             </Text>
//                           </View>
//                         ) : (
//                           <View className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5">
//                             <Text className="text-yellow-700 font-medium">
//                               Select payment to pay
//                             </Text>
//                           </View>
//                         )}
//                         <TouchableOpacity
//                           onPress={paymentConfirmation}
//                           disabled={totalCalculatedAmount <= 0}
//                           className={`flex-row items-center px-4 py-2 rounded-lg ${totalCalculatedAmount > 0 ? "bg-blue-600" : "bg-gray-300"}`}
//                         >
//                           <Feather name="credit-card" size={18} color="white" />
//                           <Text className="text-white font-medium ml-2">
//                             Pay Now
//                           </Text>
//                         </TouchableOpacity>
//                       </View>
//                     </View>
//                   </View>

//                   <View className="p-4">
//                     {feeHeads.length > 0 ? (
//                       <FlatList
//                         data={feeHeads}
//                         keyExtractor={(item) => item.id.toString()}
//                         renderItem={renderFeeHeadItem}
//                         showsVerticalScrollIndicator={false}
//                         contentContainerStyle={{ paddingBottom: 20 }}
//                       />
//                     ) : (
//                       <View className="py-10 items-center">
//                         <MaterialIcons
//                           name="receipt"
//                           size={48}
//                           color="#9ca3af"
//                         />
//                         <Text className="mt-4 text-gray-600 font-medium">
//                           No Data Found
//                         </Text>
//                       </View>
//                     )}
//                   </View>
//                 </View>
//               </View>
//             ) : !isLoading ? (
//               <View className="mx-4 mt-4">
//                 <View className="bg-red-50 border border-red-200 rounded-lg p-4">
//                   <Text className="text-red-700 font-medium">
//                     No payable fees available!
//                   </Text>
//                 </View>
//               </View>
//             ) : null}
//             {/* {fees_payment_by_web === "yes" ? (
//               <View className="mx-4 mt-4">
//                 <View className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//                   <View className="p-4 border-b border-gray-200">
//                     <Text className="text-lg font-bold text-gray-800">
//                       Payable List
//                     </Text>
//                   </View>

//                   <View className="p-4 border-b border-gray-100">
//                     <View className="flex-row items-center justify-between">
//                       <View className="flex-row space-x-2">
//                         {totalCalculatedAmount > 0 ? (
//                           <View className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
//                             <Text className="text-blue-700 font-medium">
//                               Payment Amount: ৳{" "}
//                               {formatCurrency(totalCalculatedAmount)}
//                             </Text>
//                           </View>
//                         ) : (
//                           <View className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5">
//                             <Text className="text-yellow-700 font-medium">
//                               Select payment to pay
//                             </Text>
//                           </View>
//                         )}
//                         <TouchableOpacity
//                           onPress={paymentConfirmation}
//                           disabled={totalCalculatedAmount <= 0}
//                           className={`flex-row items-center px-4 py-2 rounded-lg ${totalCalculatedAmount > 0 ? "bg-blue-600" : "bg-gray-300"}`}
//                         >
//                           <Feather name="credit-card" size={18} color="white" />
//                           <Text className="text-white font-medium ml-2">
//                             Pay Now
//                           </Text>
//                         </TouchableOpacity>
//                       </View>
//                     </View>
//                   </View>

//                   <View className="p-4">
//                     {feeHeads.length > 0 ? (
//                       <FlatList
//                         data={feeHeads}
//                         keyExtractor={(item) => item.id.toString()}
//                         renderItem={renderFeeHeadItem}
//                         showsVerticalScrollIndicator={false}
//                         contentContainerStyle={{ paddingBottom: 20 }}
//                       />
//                     ) : (
//                       <View className="py-10 items-center">
//                         <MaterialIcons
//                           name="receipt"
//                           size={48}
//                           color="#9ca3af"
//                         />
//                         <Text className="mt-4 text-gray-600 font-medium">
//                           No Data Found
//                         </Text>
//                       </View>
//                     )}
//                   </View>
//                 </View>
//               </View>
//             ) : (
//               <View className="mx-4 mt-4">
//                 <View className="bg-red-50 border border-red-200 rounded-lg p-4">
//                   <Text className="text-red-700 font-medium">
//                     Sorry! Payment by web service unavailable!
//                   </Text>
//                 </View>
//               </View>
//             )} */}
//           </>
//         }
//         ListFooterComponent={<View className="h-4" />}
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{ paddingBottom: 20 }}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={onRefresh}
//             colors={["#3b82f6", "#2563eb"]} // নীল রঙের spinner
//             tintColor="#3b82f6"
//             title="Refreshing fees..."
//             titleColor="#6b7280"
//           />
//         }
//       />

//       {/* Payment Confirmation Modal */}
//       <Modal
//         visible={confirmPaymentDialog}
//         animationType="slide"
//         transparent={true}
//         onRequestClose={() => setConfirmPaymentDialog(false)}
//       >
//         <View className="flex-1 bg-black/50 justify-center items-center p-4">
//           <View className="bg-white rounded-2xl w-full max-w-md">
//             <View className="p-6">
//               <Text className="text-xl font-bold text-gray-800 mb-4">
//                 Payment Confirmation
//               </Text>

//               <View className="mb-4">
//                 <Text className="text-2xl font-bold text-blue-600">
//                   Payment of: ৳ {formatCurrency(totalCalculatedAmount)}
//                 </Text>
//               </View>

//               {chargeSetup && chargeList.length > 0 && (
//                 <View className="mb-4">
//                   {chargeSetup.calculation_type === "percentage" ? (
//                     <View className="bg-gray-50 border border-gray-200 rounded-lg p-3">
//                       <Text className="text-xs text-gray-600">
//                         {chargeSetup.title} — {chargeSetup.amount}% of total = ৳
//                         {(
//                           totalCalculatedAmount *
//                           (parseFloat(chargeSetup.amount) / 100)
//                         ).toFixed(2)}
//                       </Text>
//                     </View>
//                   ) : (
//                     <View className="bg-gray-50 border border-gray-200 rounded-lg p-3">
//                       <Text className="text-xs text-gray-600">
//                         {chargeSetup.title} : ৳{" "}
//                         {formatCurrency(totalChargeAmount)}
//                       </Text>
//                     </View>
//                   )}
//                 </View>
//               )}

//               <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
//                 <Text className="text-xs text-yellow-800">
//                   বিশেষ দ্রষ্টব্যঃ পেমেন্ট পোর্টালে প্রয়োজনীয় ধাপগুলো সম্পন্ন না
//                   করে থাকলে (যেমন: ব্রাউজার বন্ধ করে দেয়া / পোর্টাল থেকে ফিরে
//                   আসা), সংশ্লিষ্ট পেমেন্টটি ৩০ মিনিটের জন্য ‘PENDING’ অবস্থায়
//                   থাকবে। এই সময়ের মধ্যে উক্ত পেমেন্ট প্রক্রিয়া আর চালিয়ে নেওয়া
//                   সম্ভব হবে না।
//                 </Text>
//               </View>

//               <View className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
//                 <Text className="text-xs text-blue-800">
//                   Clicking proceed will take you to the associated payment
//                   portal
//                 </Text>
//               </View>

//               <View className="flex-row justify-end space-x-2">
//                 <TouchableOpacity
//                   onPress={() => setConfirmPaymentDialog(false)}
//                   className="px-6 py-3 border border-gray-300 rounded-lg"
//                   disabled={loading}
//                 >
//                   <Text className="text-gray-700 font-medium">Cancel</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   onPress={proceedPayment}
//                   disabled={totalCalculatedAmount <= 0 || isPaymentProcessing}
//                   className={`flex-row items-center px-6 py-3 rounded-lg ${totalCalculatedAmount > 0 && !isPaymentProcessing ? "bg-blue-600" : "bg-gray-300"}`}
//                 >
//                   {isPaymentProcessing ? (
//                     <ActivityIndicator color="white" />
//                   ) : (
//                     <>
//                       <Feather name="send" size={18} color="white" />
//                       <Text className="text-white font-medium ml-2">
//                         Proceed
//                       </Text>
//                     </>
//                   )}
//                 </TouchableOpacity>
//               </View>
//             </View>
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// };

// export default AvailablePayment;
