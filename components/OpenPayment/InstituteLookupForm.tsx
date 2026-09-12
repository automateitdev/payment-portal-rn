import ReusableButton from "@/components/shared/Button/ReusableButton";
import ReusableInput from "@/components/shared/ReusableInput";
import { getErrorMessage } from "@/components/utils/errorHandler";
import { useLazyLookupInstituteQuery } from "@/redux/allApi/authApi/authApi";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

type Props = {
  autoFocus?: boolean;
  /** Which flow to route into after a successful lookup. */
  flow?: "open-payment" | "onlineadmission";
  /** Called after a successful lookup, just before navigation. */
  onVerified?: () => void;
};

/**
 * Institute ID entry + verification, shared by the Open Payment and
 * Online Admission flows. Hits GET /institute-lookup/:id and, on success,
 * navigates to that institute's page for the given `flow`.
 */
const InstituteLookupForm = ({
  autoFocus,
  flow = "open-payment",
  onVerified,
}: Props) => {
  const router = useRouter();
  const [instituteId, setInstituteId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [triggerLookup, { isFetching }] = useLazyLookupInstituteQuery();

  const handleContinue = async () => {
    const id = instituteId.trim();
    if (!id) {
      setError("Enter your Institute ID to continue");
      return;
    }
    setError(null);
    try {
      await triggerLookup(id).unwrap();
      onVerified?.();
      if (flow === "onlineadmission") {
        router.push({
          pathname: "/onlineadmission/[instituteId]",
          params: { instituteId: id },
        });
      } else {
        router.push({
          pathname: "/open-payment/[instituteId]",
          params: { instituteId: id },
        });
      }
    } catch (err) {
      setError(getErrorMessage(err) || "Institute not found.");
    }
  };

  return (
    <View>
      <ReusableInput
        label="Institute ID"
        placeholder="e.g. 123456"
        value={instituteId}
        onChangeText={(t) => {
          setInstituteId(t);
          if (error) setError(null);
        }}
        onSubmitEditing={handleContinue}
        autoFocus={autoFocus}
        autoCapitalize="none"
        returnKeyType="go"
        height={46}
        error={!!error}
        errorText={error ?? undefined}
        leftIcon={
          <Ionicons
            name="business-outline"
            size={16}
            color={error ? colors.danger : colors.surface[500]}
          />
        }
      />

      {/* gap between the input and the button */}
      <View className="h-1.5" />

      <ReusableButton
        title="Continue"
        onPress={handleContinue}
        isLoading={isFetching}
        loadingText="Verifying…"
        variant="primary"
        position="stretch"
        width="100%"
        className="rounded-2xl py-3.5 justify-center"
        rightIcon={
          !isFetching ? (
            <Ionicons name="arrow-forward" size={15} color="#ffffff" />
          ) : undefined
        }
      />
    </View>
  );
};

export default InstituteLookupForm;
