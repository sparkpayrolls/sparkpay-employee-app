import { $api } from "@/services/api";
import { getInvite, resolveInviteCountry } from "@/services/invite";
import useStore, { User } from "@/store";
import { FormikHelpers, useFormik } from "formik";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import * as yup from "yup";

interface LoginFormValues {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const JOIN_FAILED_NOTICE =
  "You're signed in, but this invite link no longer works. If you can't see your company, ask your HR or payroll admin to send a new invite.";

const loginSchema = yup.object().shape({
  email: yup
    .string()
    .email("Invalid email address")
    .required("Email is required"),
  password: yup.string().required("Password is required"),
});

export const useLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useStore((state) => state.setUser);
  const message = location.state?.message;
  const [searchParams] = useSearchParams();

  // "null" and "undefined" come from links built without a token
  const rawToken = searchParams.get("onboarding_token");
  const onboardingToken =
    rawToken && rawToken !== "null" && rawToken !== "undefined"
      ? rawToken
      : null;

  const initialValues: LoginFormValues = {
    email: "",
    password: "",
  };

  const handleFormikSubmit = async (
    values: LoginFormValues,
    helpers: FormikHelpers<LoginFormValues>
  ) => {
    helpers.setSubmitting(true);
    let session: LoginResponse;
    try {
      ({ data: session } = await $api.post<LoginResponse>("auth/login", {
        username: values.email,
        password: values.password,
      }));
    } catch {
      helpers.setFieldError("email", "Invalid email or password");
      helpers.setSubmitting(false);
      return;
    }

    localStorage.setItem("accessToken", session.accessToken);
    localStorage.setItem("refreshToken", session.refreshToken);
    setUser(session.user);

    if (onboardingToken) {
      try {
        // The employee's (or employer's) country. After sign-up the link is
        // used up and the lookup fails, so fall back to the account's.
        const country =
          (await getInvite(onboardingToken)
            .then(resolveInviteCountry)
            .catch(() => "")) || session.user.country?.id;
        await $api.post(
          "employees/join",
          {
            token: onboardingToken,
            country,
          },
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }
        );
      } catch {
        // The sign-in worked; only the link did not (used, expired, or the
        // person had already joined). Never report that as a wrong password.
        helpers.setSubmitting(false);
        navigate("/app/dashboard", { state: { notice: JOIN_FAILED_NOTICE } });
        return;
      }
    }

    helpers.setSubmitting(false);
    navigate("/app/dashboard");
  };

  const form = useFormik({
    initialValues,
    validationSchema: loginSchema,
    onSubmit: handleFormikSubmit,
  });

  const handleForgotPassword = () => {
    // TODO: Implement forgot password flow
    console.log("Forgot password clicked");
  };

  return {
    form,
    message,
    handleForgotPassword,
  };
};
