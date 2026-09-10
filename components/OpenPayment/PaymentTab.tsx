import {
  useGetOpenPaymentFeeHeadsQuery,
  useGetOpenPaymentInfoQuery,
  useGetOpenPaymentSetupDetailsMutation,
  useMakeOpenPaymentMutation,
  useValidateOpenPaymentMutation,
} from "@/redux/allApi/openpayment/openPaymentApi";
import { usePaymentGateway } from "@/utils/payment/usePaymentGateway";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Control, Controller, RegisterOptions, useForm } from "react-hook-form";
import { Image, Pressable, Text, View } from "react-native";
import { showMessage } from "../shared/CustomToast/message";
import { normalizeApiError } from "../utils/errorNormalizer";
import { SearchableSelect } from "../ui/SearchableSelect";
import ReusableModal from "../Modal/ReusableModal";
import ReusableInput from "../shared/ReusableInput";
import ReusableButton from "../shared/Button/ReusableButton";

/* ----------------------------- Controlled input ----------------------------- */
type ControlledInputProps = {
  control: Control<any>;
  name: string;
  label?: string;
  required?: boolean;
  rules?: RegisterOptions;
  placeholder?: string;
  inputType?: "text" | "number";
  editable?: boolean;
};

const ControlledInput = ({
  control,
  name,
  label,
  required,
  rules,
  placeholder,
  inputType = "text",
  editable = true,
}: ControlledInputProps) => (
  <Controller
    control={control}
    name={name}
    rules={rules}
    render={({ field: { value, onChange, onBlur }, fieldState }) => (
      <View className="w-full">
        {label && (
          <Text className="mb-1.5 text-[13px] font-medium text-[#334155]">
            {label}
            {required && <Text className="text-red-500"> *</Text>}
          </Text>
        )}
        <ReusableInput
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          inputType={inputType}
          editable={editable}
          disabled={!editable}
          error={!!fieldState.error}
        />
        {fieldState.error && (
          <Text className="text-[11px] text-red-500 mt-1 ml-1">
            {fieldState.error.message}
          </Text>
        )}
      </View>
    )}
  />
);

/* --------------------------------- Field row -------------------------------- */
const FieldRow = ({ children }: { children: React.ReactNode }) => (
  <View className="flex-col sm:flex-row gap-4">{children}</View>
);

/* ------------------------------- Payment tab -------------------------------- */
const PaymentTab = ({ instituteId }: { instituteId: string }) => {
  const { control, handleSubmit, watch, reset, setValue } = useForm({
    defaultValues: {
      academic_year: "",
      fee_head: "",
      student_id: "",
      name: "",
      mobile: "",
      session: "",
      department: "",
      class: "",
      roll: "",
      shift: "",
      group: "",
      amount: "",
    },
  });

  const academic_year = watch("academic_year");
  const fee_head = watch("fee_head");
  const student_id = watch("student_id");

  const [setup, setSetup] = useState<any>(null);
  const [gateways, setGateways] = useState<any[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [amountDetails, setAmountDetails] = useState<any>(null);
  // True once the search returned a fully known (enlisted) student — their
  // personal fields are auto-filled and locked so the payer can't alter them.
  const [studentLocked, setStudentLocked] = useState(false);

  const redirectToGateway = usePaymentGateway();

  // One gateway → use it automatically; more than one → let the user pick.
  useEffect(() => {
    setSelectedGateway(gateways.length === 1 ? gateways[0].type : null);
  }, [gateways]);

  /* ------------------------------ data fetching ----------------------------- */
  const { data: infoRes } = useGetOpenPaymentInfoQuery(
    { instituteId },
    { skip: !instituteId },
  );
  const institute = infoRes?.payload?.data?.institute;

  const academicYearOptions = useMemo(
    () =>
      (infoRes?.payload?.data?.academic_years || []).map((y: string) => ({
        label: y,
        value: y,
      })),
    [infoRes],
  );

  const { data: feeHeadRes, isFetching: feeHeadsLoading } =
    useGetOpenPaymentFeeHeadsQuery(
      { instituteId, academic_year },
      { skip: !instituteId || !academic_year },
    );

  const feeHeadOptions = useMemo(
    () =>
      (feeHeadRes?.payload?.data?.fee_heads || []).map((f: string) => ({
        label: f,
        value: f,
      })),
    [feeHeadRes],
  );

  // For a "pay as you go" enlisted student the fees live on the student
  // record; otherwise they're on the setup itself.
  const feeAmounts: any[] = useMemo(
    () =>
      setup?.student?.amounts?.length
        ? setup.student.amounts
        : setup?.amounts || [],
    [setup],
  );

  const amountOptions = useMemo(
    () =>
      feeAmounts.map((a: any) => ({
        label: a.tag ? `${a.tag} — ${a.amount}` : String(a.amount),
        value: String(a.id),
      })),
    [feeAmounts],
  );

  const [triggerSetup, { isLoading: searching }] =
    useGetOpenPaymentSetupDetailsMutation();
  const [validatePayment, { isLoading: validating }] =
    useValidateOpenPaymentMutation();
  const [makePayment, { isLoading: makingPayment }] =
    useMakeOpenPaymentMutation();

  /* -------------------------------- handlers -------------------------------- */
  const handleSearch = async () => {
    if (!academic_year || !fee_head || !student_id) {
      showMessage(
        "warning",
        "Missing Selection",
        "Please select Academic Year, Fee Head and enter Student ID.",
      );
      return;
    }
    try {
      const res = await triggerSetup({
        instituteId,
        academic_year,
        fee_head,
        student_id,
      }).unwrap();
      const data = res?.payload?.data;
      setSetup(data?.setup || null);
      setGateways(data?.gateways || []);
      setValue("amount", "");

      // Auto-fill the student's personal fields when the response carries a
      // full enlisted-student record (FIXED_ID). ANY_ID only returns
      // { student_id, is_allowed }, so nothing to fill there.
      const st = data?.setup?.student;
      const isFullRecord = !!st && (st.name != null || st.mobile != null);
      if (isFullRecord) {
        const put = (key: any, v: any) =>
          setValue(key, v == null ? "" : String(v));
        put("name", st.name);
        put("mobile", st.mobile);
        put("session", st.session);
        put("department", st.department);
        put("class", st.class);
        put("roll", st.roll);
        put("shift", st.shift);
        put("group", st.group);
      }
      setStudentLocked(isFullRecord);

      showMessage(
        "success",
        "Success",
        data?.message || "Setup details retrieved successfully.",
      );
    } catch (err) {
      setSetup(null);
      setGateways([]);
      setStudentLocked(false);
      showMessage("error", "Error", normalizeApiError(err).message);
    }
  };

  const onReset = () => {
    reset();
    setSetup(null);
    setGateways([]);
    setAmountDetails(null);
    setConfirmOpen(false);
    setStudentLocked(false);
  };

  // Pay Now → validate the payment, then show the confirm modal.
  const onPay = handleSubmit(
    async (values) => {
      if (!setup) {
        showMessage(
          "warning",
          "Attention",
          "Please search a valid student first.",
        );
        return;
      }
      const amountObj = feeAmounts.find(
        (a: any) => String(a.id) === values.amount,
      );
      const numericAmount = amountObj ? Number(amountObj.amount) : 0;
      if (!values.amount || !numericAmount) {
        showMessage(
          "warning",
          "Attention",
          "Please select or enter at least one fee to proceed with payment.",
        );
        return;
      }
      try {
        const res = await validatePayment({
          instituteId,
          setup_id: setup.setup_id,
          student_id: values.student_id,
          name: values.name,
          mobile: values.mobile,
          academic_year: values.academic_year,
          amount: numericAmount,
          session: values.session,
          department: values.department,
          class: values.class,
          roll: values.roll,
          group: values.group,
        }).unwrap();
        setAmountDetails(res?.payload?.data?.amount_details || null);
        setConfirmOpen(true);
      } catch (err) {
        showMessage("error", "Error", normalizeApiError(err).message);
      }
    },
    // Validation failed → tell the user which field is blocking submit.
    (formErrors) => {
      const first = Object.values(formErrors)[0] as { message?: string };
      showMessage(
        "warning",
        "Attention",
        first?.message || "Please fill all required fields correctly.",
      );
    },
  );

  // Confirm Payment → create the gateway payment and redirect.
  const handleConfirmPay = async () => {
    if (!amountDetails) return;
    if (gateways.length > 1 && !selectedGateway) {
      showMessage("warning", "Attention", "Please select a payment gateway.");
      return;
    }
    const gateway = selectedGateway || gateways[0]?.type;
    if (!gateway) {
      showMessage("error", "Error", "No payment gateway available.");
      return;
    }
    try {
      const res = await makePayment({
        instituteId,
        gateway,
        setup_id: amountDetails.open_payment_setup_id,
        student_id: amountDetails.student_id,
        base_amount: Number(amountDetails.base_payment),
        total_amount: Number(amountDetails.total_payment),
      }).unwrap();
      const data = res?.payload?.data;
      if (!data?.payment_url && !data?.html) {
        showMessage("error", "Error", "No payment URL received from gateway.");
        return;
      }
      setConfirmOpen(false);
      redirectToGateway({
        payment_url: data.payment_url,
        html: data.html,
        amount: amountDetails.total_payment,
        transaction_id: data.token,
        returnPath: `/open-payment/${instituteId}`,
      });
    } catch (err) {
      showMessage("error", "Error", normalizeApiError(err).message);
    }
  };

  /* --------------------------------- render --------------------------------- */
  return (
    <View>
      {/* Institute header */}
      <View className="flex-row items-center gap-3 pb-4 mb-4 border-b border-gray-100">
        {institute?.logo ? (
          <Image
            source={{ uri: institute.logo }}
            style={{ width: 48, height: 48, borderRadius: 8 }}
            resizeMode="contain"
          />
        ) : (
          <View className="w-12 h-12 rounded-lg bg-indigo-50" />
        )}
        <View className="flex-1">
          <Text
            className="text-base font-black text-gray-800"
            numberOfLines={2}
          >
            {institute?.institute_name || "Institute"}
          </Text>
          {institute?.institute_address ? (
            <Text className="text-xs text-gray-500 mt-0.5">
              {institute.institute_address}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Academic Year + Fee Head */}
      <FieldRow>
        <View className="w-full sm:flex-1">
          <SearchableSelect
            name="academic_year"
            control={control}
            label="Academic Year *"
            options={academicYearOptions}
            placeholder="Select Academic Year"
            onValueChange={() => {
              setValue("fee_head", "");
              setSetup(null);
              setGateways([]);
            }}
          />
        </View>
        <View className="w-full sm:flex-1">
          <SearchableSelect
            name="fee_head"
            control={control}
            label="Fee Head *"
            options={feeHeadOptions}
            placeholder={
              !academic_year
                ? "Select Academic Year first"
                : feeHeadsLoading
                  ? "Loading fee heads..."
                  : "Select Fee Head"
            }
            disabled={!academic_year || feeHeadsLoading}
            onValueChange={() => {
              setSetup(null);
              setGateways([]);
            }}
          />
        </View>
      </FieldRow>

      {/* Student ID + Search */}
      <View className="flex-col sm:flex-row sm:items-end lg:flex-col lg:items-stretch gap-4 mb-4">
        <View className="w-full sm:flex-1">
          <ControlledInput
            control={control}
            name="student_id"
            label="Student ID"
            required
            placeholder="Enter Student ID"
          />
        </View>
        <ReusableButton
          title="Search"
          variant="primary"
          isLoading={searching}
          onPress={handleSearch}
          leftIcon={<Ionicons name="search" size={16} color="#ffffff" />}
        />
      </View>

      {/* Fields below appear only after a successful student search */}
      {setup && (
        <>
          {studentLocked && (
            <View className="flex-row items-center bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 mb-4">
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text className="flex-1 text-[12px] text-emerald-700 font-medium ml-2">
                Student found — details auto-filled below.
              </Text>
            </View>
          )}

          {/* Name + Mobile */}
          <FieldRow>
            <View className="w-full sm:flex-1 mb-4">
              <ControlledInput
                control={control}
                name="name"
                label="Name"
                required
                editable={!studentLocked}
                placeholder="Enter Full Name"
                rules={{ required: "Name is required" }}
              />
            </View>
            <View className="w-full sm:flex-1 mb-4">
              <ControlledInput
                control={control}
                name="mobile"
                label="Mobile No."
                required
                editable={!studentLocked}
                inputType="number"
                placeholder="01XXXXXXXXX"
                rules={{
                  required: "Please input a valid number for payment",
                  pattern: {
                    value: /^01\d{9}$/,
                    message: "Please input a valid number for payment",
                  },
                }}
              />
            </View>
          </FieldRow>

          {/* Session + Department */}
          <FieldRow>
            <View className="w-full sm:flex-1 mb-4">
              <ControlledInput
                control={control}
                name="session"
                label="Session"
                editable={!studentLocked}
                placeholder="Session"
              />
            </View>
            <View className="w-full sm:flex-1 mb-4">
              <ControlledInput
                control={control}
                name="department"
                label="Department"
                editable={!studentLocked}
                placeholder="Department"
              />
            </View>
          </FieldRow>

          {/* Class + Roll */}
          <FieldRow>
            <View className="w-full sm:flex-1 mb-4">
              <ControlledInput
                control={control}
                name="class"
                label="Class"
                editable={!studentLocked}
                placeholder="Class"
              />
            </View>
            <View className="w-full sm:flex-1 mb-4">
              <ControlledInput
                control={control}
                name="roll"
                label="Roll"
                editable={!studentLocked}
                inputType="number"
                placeholder="0"
              />
            </View>
          </FieldRow>

          {/* Shift + Group */}
          <FieldRow>
            <View className="w-full sm:flex-1 mb-4">
              <ControlledInput
                control={control}
                name="shift"
                label="Shift"
                editable={!studentLocked}
                placeholder="Shift"
              />
            </View>
            <View className="w-full sm:flex-1 mb-4">
              <ControlledInput
                control={control}
                name="group"
                label="Group"
                editable={!studentLocked}
                placeholder="Group"
              />
            </View>
          </FieldRow>

          {/* Fee table */}
          <View className="mt-2 border border-gray-200 rounded-xl overflow-hidden">
            <View className="flex-row bg-gray-50 border-b border-gray-200">
              <Text className="flex-1 px-4 py-3 text-[13px] font-bold text-gray-700">
                Fee Head
              </Text>
              <Text className="flex-1 px-4 py-3 text-[13px] font-bold text-gray-700">
                Amount
              </Text>
            </View>
            <View className="flex-row items-center px-4 py-3">
              <Text className="flex-1 text-sm text-gray-700">
                {fee_head || "—"}
              </Text>
              <View className="flex-1">
                <SearchableSelect
                  name="amount"
                  control={control}
                  options={amountOptions}
                  placeholder={
                    setup ? "Select Amount" : "Search a student first"
                  }
                  disabled={!setup || amountOptions.length === 0}
                  containerClassName="mb-0"
                />
              </View>
            </View>
          </View>

          {/* Info banner */}
          <View className="flex-row items-center bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-4">
            <Ionicons
              name="warning-outline"
              size={16}
              color="#d97706"
              style={{ marginRight: 8 }}
            />
            <Text className="flex-1 text-[13px] text-amber-700 font-medium">
              Please select or enter at least one fee to proceed with payment.
            </Text>
          </View>

          {/* Action buttons */}
          <View className="flex-row flex-wrap justify-end items-center gap-3 mt-6">
            <ReusableButton title="Reset" variant="ghost" onPress={onReset} />
            <ReusableButton
              title="Pay Now"
              variant="primary"
              isLoading={validating}
              onPress={onPay}
              leftIcon={
                <Ionicons name="card-outline" size={16} color="#ffffff" />
              }
            />
          </View>
        </>
      )}

      {/* Confirm payment modal */}
      <ReusableModal
        visible={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Payment Details"
        size="sm"
        cancelButton={{
          label: "Cancel",
          variant: "ghost",
          onPress: () => setConfirmOpen(false),
          leftIcon: <Ionicons name="close" size={16} color="#65a30d" />,
        }}
        confirmButton={{
          label: "Confirm Payment",
          onPress: handleConfirmPay,
          isLoading: makingPayment,

          leftIcon: <Ionicons name="checkmark" size={16} color="#ffffff" />,
        }}
      >
        {amountDetails ? (
          <View className="gap-3">
            <DetailRow label="Student Name" value={amountDetails.name} />
            <DetailRow label="Student ID" value={amountDetails.student_id} />
            <DetailRow label="Mobile" value={amountDetails.mobile} />
            <DetailRow
              label="Academic Year"
              value={amountDetails.academic_year}
            />
            <DetailRow
              label="Base Payment"
              value={`৳ ${Number(amountDetails.base_payment).toLocaleString()}`}
              bold
            />
            {amountDetails.charge_amount ? (
              <Text className="text-xs text-gray-400">
                {amountDetails.charge_title || "Charge"}: ৳{" "}
                {Number(amountDetails.charge_amount).toLocaleString()}
              </Text>
            ) : null}
            <View className="border-t border-gray-100 pt-3">
              <DetailRow
                label="Total Payment"
                value={`৳ ${Number(amountDetails.total_payment).toLocaleString()}`}
                bold
              />
            </View>

            {/* Gateway selection (only when more than one) */}
            {gateways.length > 1 && (
              <View className="mt-2">
                <Text className="text-[13px] font-medium text-[#334155] mb-2">
                  Select Payment Gateway
                </Text>
                <View className="gap-2">
                  {gateways.map((gw: any) => {
                    const active = selectedGateway === gw.type;
                    return (
                      <Pressable
                        key={gw.type}
                        onPress={() => setSelectedGateway(gw.type)}
                        className={`flex-row items-center border rounded-xl px-4 py-3 ${
                          active
                            ? "border-lime-500 bg-lime-50"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <View
                          className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 ${
                            active ? "border-lime-600" : "border-gray-300"
                          }`}
                        >
                          {active && (
                            <View className="w-2.5 h-2.5 rounded-full bg-lime-600" />
                          )}
                        </View>
                        <Text
                          className={`font-medium ${
                            active ? "text-lime-700" : "text-gray-600"
                          }`}
                        >
                          {gw.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        ) : null}
      </ReusableModal>
    </View>
  );
};

/* ------------------------------- Detail row --------------------------------- */
const DetailRow = ({
  label,
  value,
  bold,
}: {
  label: string;
  value?: string | number;
  bold?: boolean;
}) => (
  <View>
    <Text className="text-[13px] font-semibold text-[#334155]">{label}:</Text>
    <Text
      className={`mt-0.5 text-gray-700 ${bold ? "text-lg font-black text-gray-900" : "text-sm"}`}
    >
      {value ?? "—"}
    </Text>
  </View>
);

export default PaymentTab;
