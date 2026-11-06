import { $api, ApiError } from "@/services/api";
import { FormikHelpers, useFormik } from "formik";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as yup from "yup";
import useStore, { User } from "@/store";
import {
  fallbackCountry,
  getInvite,
  resolveInviteCountry,
} from "@/services/invite";

interface OnboardingResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

const onboardingSchema = yup.object().shape({
  email: yup
    .string()
    .email("Invalid email address")
    .required("Email is required"),
  password: yup
    .string()
    .required("Password is required")
    .min(8, "Password must be at least 8 characters")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
  firstname: yup.string().required("First name is required"),
  lastname: yup.string().required("Last name is required"),
});

export const useAcceptInvite = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setUser = useStore((state) => state.setUser);
  const onboardingToken = searchParams.get("token");

  const [orgName, setOrgName] = useState("");
  const [countryId, setCountryId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialValues = {
    email: "",
    password: "",
    firstname: "",
    lastname: "",
  };

  const handleFormikSubmit = async (
    values: typeof initialValues,
    helpers: FormikHelpers<typeof initialValues>
  ) => {
    helpers.setSubmitting(true);
    setFormError(null);
    // never sign up with an empty country: the backend rejects it, and the
    // person would be told to sign in to an account that was never created
    const country =
      countryId || (await fallbackCountry().catch(() => ""));
    if (!country) {
      setFormError(
        "We couldn't load your invite details. Check your connection and try again."
      );
      helpers.setSubmitting(false);
      return;
    }
    $api
      .post<OnboardingResponse>("auth/signup", {
        ...values,
        country,
        inviteCode: onboardingToken,
      })
      .then(({ data }) => {
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);

        setUser(data.user);

        return $api.post(
          "employees/join",
          {
            token: onboardingToken,
            country,
          },
          {
            headers: {
              Authorization: `Bearer ${data.accessToken}`,
            },
          }
        );
      })
      .then(() => {
        navigate("/login", {
          state: {
            message:
              "Account created successfully! Please sign in to continue.",
          },
        });
      })
      .catch((err) => {
        if (err instanceof ApiError && err.errors) {
          helpers.setErrors(err.errors as Record<string, string>);
        }

        setError(err.message);
      })
      .finally(() => {
        helpers.setSubmitting(false);
      });
  };

  const form = useFormik({
    initialValues,
    validationSchema: onboardingSchema,
    onSubmit: handleFormikSubmit,
  });

  useEffect(() => {
    if (onboardingToken) {
      getInvite(onboardingToken)
        .then(async (data) => {
          form.setValues({
            email: data.email,
            password: "",
            firstname: data.firstname,
            lastname: data.lastname,
          });
          setOrgName(data.company.name);
          setCountryId(await resolveInviteCountry(data).catch(() => ""));
          setIsLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setIsLoading(false);
        });
    } else {
      setError("No onboarding token provided.");
      setIsLoading(false);
    }
  }, [onboardingToken, form.setValues]);

  const handleSignInRedirect = () => {
    navigate(`/login?onboarding_token=${onboardingToken}`, {
      state: { message: `Please sign in to join ${orgName}.` },
    });
  };

  return {
    orgName,
    isLoading,
    error,
    formError,
    form,
    handleSignInRedirect,
  };
};
