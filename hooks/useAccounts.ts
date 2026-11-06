import { $api, ApiError } from "@/services/api";
import useStore, { User } from "@/store";
import { FormikHelpers, useFormik } from "formik";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as yup from "yup";

// Off until the safe bank change flow (M01-06). The backend already rejects
// bank changes from employees (PUT /users/me returns 400).
const BANK_CHANGES_ENABLED = false;

interface AccountsFormValues {
  bankId: string;
  accountNumber: string;
  accountName: string;
}

interface ResolveAccountResponse {
  accountName: string;
}

const accountsSchema = yup.object().shape({
  bankId: yup.string().required("Bank is required"),
  accountNumber: yup
    .string()
    .required("Account number is required")
    .matches(/^\d{10}$/, "Account number must be exactly 10 digits"),
  accountName: yup.string().required("Account name is required"),
});

export const useAccounts = () => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const [isResolvingAccount, setIsResolvingAccount] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const initialValues: AccountsFormValues = {
    bankId: user?.bankId || "",
    accountNumber: user?.accountNumber || "",
    accountName: "",
  };

  const handleFormikSubmit = async (
    values: AccountsFormValues,
    helpers: FormikHelpers<AccountsFormValues>
  ) => {
    if (!BANK_CHANGES_ENABLED) {
      return;
    }
    helpers.setSubmitting(true);
    try {
      const response = await $api.put<User>("users/me", {
        bankId: values.bankId,
        accountNumber: values.accountNumber,
      });

      // Update user in store
      setUser(response.data);

      // Reset form after successful submission
      helpers.resetForm();

      // Show success message (you can add a toast notification here)
      console.log("Account added successfully");
    } catch (error) {
      console.error("Failed to add account:", error);
      if (error instanceof ApiError && error.status === 422) {
        helpers.setErrors(error.errors as any);
        return;
      }
      if (error instanceof Error) {
        helpers.setFieldError("bankId", error.message);
      }
    } finally {
      helpers.setSubmitting(false);
    }
  };

  const form = useFormik({
    initialValues,
    validationSchema: accountsSchema,
    onSubmit: handleFormikSubmit,
    enableReinitialize: true, // Reinitialize when user changes
  });

  // Resolve account name on initial load if bankId and accountNumber are present
  useEffect(() => {
    if (!BANK_CHANGES_ENABLED) return;
    if (
      !hasInitialized &&
      user?.bankId &&
      user?.accountNumber &&
      /^\d{10}$/.test(user.accountNumber)
    ) {
      setHasInitialized(true);
      const resolveInitialAccount = async () => {
        setIsResolvingAccount(true);
        try {
          const response = await $api.post<ResolveAccountResponse>(
            "payments/resolve-account",
            {
              provider: "paystack",
              bankId: user.bankId,
              accountNumber: user.accountNumber,
            }
          );

          form.setFieldValue("accountName", response.data.accountName);
        } catch (error) {
          console.error("Failed to resolve initial account:", error);
        } finally {
          setIsResolvingAccount(false);
        }
      };

      resolveInitialAccount();
    } else if (!user?.bankId || !user?.accountNumber) {
      setHasInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.bankId, user?.accountNumber, hasInitialized]);

  // Resolve account when bank and account number are both filled (only after initialization)
  useEffect(() => {
    // Don't run this effect until after initial load is complete
    if (!BANK_CHANGES_ENABLED || !hasInitialized) return;

    const resolveAccount = async () => {
      const { bankId, accountNumber } = form.values;

      // Clear account name if account number is not 10 digits
      if (accountNumber && accountNumber.length !== 10) {
        if (form.values.accountName) {
          form.setFieldValue("accountName", "");
        }
        return;
      }

      // Only resolve if both fields are filled and account number is exactly 10 digits
      // Only resolve if the values have actually changed from the initial user values
      const hasChanged =
        bankId !== (user?.bankId || "") ||
        accountNumber !== (user?.accountNumber || "");

      if (
        bankId &&
        accountNumber &&
        /^\d{10}$/.test(accountNumber) &&
        !form.errors.accountNumber &&
        hasChanged
      ) {
        setIsResolvingAccount(true);
        try {
          const response = await $api.post<ResolveAccountResponse>(
            "payments/resolve-account",
            {
              provider: "paystack",
              bankId,
              accountNumber,
            }
          );

          // Prefill account name
          form.setFieldValue("accountName", response.data.accountName);
          form.setFieldTouched("accountName", true);
        } catch (error) {
          console.error("Failed to resolve account:", error);
          // Clear account name on error
          form.setFieldValue("accountName", "");
          if (error instanceof ApiError) {
            form.setFieldError("accountNumber", error.message);
          }
        } finally {
          setIsResolvingAccount(false);
        }
      } else if (!bankId || !accountNumber) {
        // Only clear account name if user manually cleared the fields (not on initial load)
        if (form.values.accountName && hasChanged) {
          form.setFieldValue("accountName", "");
        }
      }
    };

    // Debounce the resolve call
    const timeoutId = setTimeout(() => {
      resolveAccount();
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.values.bankId,
    form.values.accountNumber,
    form.errors.accountNumber,
    hasInitialized,
    user?.bankId,
    user?.accountNumber,
  ]);

  // Check if form is valid and account name is resolved
  const isFormValid = form.isValid && form.values.accountName !== "";

  // Handler for back navigation
  const handleBack = () => {
    navigate(-1);
  };

  // Handler for bank select change
  const handleBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    form.setFieldValue("bankId", e.target.value);
    form.setFieldTouched("bankId", true);
  };

  // Helper text for account number
  const getAccountNumberHelperText = () => {
    if (isResolvingAccount) {
      return "Resolving account name...";
    }
    if (
      form.values.accountNumber.length === 10 &&
      !form.errors.accountNumber &&
      form.values.accountName
    ) {
      return "Account verified";
    }
    return undefined;
  };

  return {
    form,
    isResolvingAccount,
    isFormValid,
    handleBack,
    handleBankChange,
    getAccountNumberHelperText,
  };
};
