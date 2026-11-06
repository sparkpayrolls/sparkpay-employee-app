import React from "react";
import { useAcceptInvite } from "../hooks/useOnboardingInvite";
import { PasswordInput } from "../components/PasswordInput";
import { Input } from "../components/Input";
// import { SparkpayLogo } from "../components/SparkpayLogo";
import { Button } from "../components/Button";

const AcceptInvite: React.FC = () => {
  const { orgName, isLoading, error, form, handleSignInRedirect } =
    useAcceptInvite();

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col justify-center items-center bg-background-light p-6 dark:bg-background-dark">
        <p className="text-text-light dark:text-text-dark">Loading...</p>
      </div>
    );
  }

  if (error) {
    // Signing up uses up the link, so if joining failed straight after,
    // signing in is the way to finish
    return (
      <div className="flex min-h-screen flex-col justify-center items-center gap-4 bg-background-light p-6 text-center dark:bg-background-dark">
        <p className="text-red-500">{error}</p>
        <p className="text-subtext-light dark:text-subtext-dark">
          Already created your account?{" "}
          <button
            type="button"
            className="font-semibold text-primary underline"
            onClick={handleSignInRedirect}
          >
            Sign in to finish joining
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-background-light p-6 dark:bg-background-dark">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          {/* <SparkpayLogo /> */}
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-text-light dark:text-text-dark sm:text-3xl">
            You're invited to join {orgName}
          </h1>
          <p className="mt-2 text-subtext-light dark:text-subtext-dark">
            Create your account to get started.
          </p>
        </div>

        <form onSubmit={form.handleSubmit} className="space-y-6">
          <Input
            id="email"
            name="email"
            label="Email Address"
            type="email"
            autoComplete="email"
            required
            value={form.values.email}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            error={form.errors.email}
            touched={form.touched.email}
            helperText="We recommend using a personal email so you can access your Sparkpay account even after leaving the company."
          />

          <PasswordInput
            id="password"
            name="password"
            label="Create Password"
            placeholder="Create a strong password"
            autoComplete="new-password"
            value={form.values.password}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            error={form.errors.password}
            touched={form.touched.password}
          />

          <Button
            type="submit"
            isLoading={form.isSubmitting}
            disabled={!form.isValid || !form.dirty}
            className="w-full mt-4"
          >
            Create Account & Join
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-subtext-light dark:text-subtext-dark">
          Already have an account?{" "}
          <Button
            onClick={handleSignInRedirect}
            variant="ghost"
            className="p-0"
          >
            Sign In
          </Button>
        </p>
      </div>
    </div>
  );
};

export default AcceptInvite;
