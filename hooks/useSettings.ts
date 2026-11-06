import { $api, ApiError } from "@/services/api";
import { clearSession } from "@/services/session";
import useStore, { User } from "@/store";
import { FormikHelpers, useFormik } from "formik";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as yup from "yup";
import {
  formatPhoneNumber,
  normalizePhoneNumber,
} from "../utils/formatPhoneNumber";

interface SettingsFormValues {
  firstname: string;
  lastname: string;
  phonenumber: string;
}

const settingsSchema = yup.object().shape({
  firstname: yup.string().required("First name is required"),
  lastname: yup.string().required("Last name is required"),
  phonenumber: yup
    .string()
    .test(
      "phone",
      "Please enter a valid phone number",
      (value) =>
        !value || /^\+?[1-9]\d{1,14}$/.test(normalizePhoneNumber(value))
    )
    .optional(),
});

export const useSettings = () => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const initialValues: SettingsFormValues = {
    firstname: user?.firstname || "",
    lastname: user?.lastname || "",
    phonenumber: user?.phonenumber ? formatPhoneNumber(user.phonenumber) : "",
  };

  const handleFormikSubmit = async (
    values: SettingsFormValues,
    helpers: FormikHelpers<SettingsFormValues>
  ) => {
    helpers.setSubmitting(true);
    try {
      // Normalize phone number before sending to API
      const normalizedPhone = values.phonenumber
        ? normalizePhoneNumber(values.phonenumber)
        : "";

      const response = await $api.put<User>("users/me", {
        firstname: values.firstname,
        lastname: values.lastname,
        phonenumber: normalizedPhone || undefined,
      });

      // Update user in store
      setUser(response.data);

      // Show success message (you can add a toast notification here)
      console.log("Profile updated successfully");
    } catch (error) {
      console.error("Failed to update profile:", error);

      if (error instanceof ApiError && error.status === 422) {
        helpers.setErrors(error.errors);

        return;
      }

      if (error instanceof Error) {
        helpers.setFieldError("firstname", error.message);
      }
    } finally {
      helpers.setSubmitting(false);
    }
  };

  const form = useFormik({
    initialValues,
    validationSchema: settingsSchema,
    onSubmit: handleFormikSubmit,
    enableReinitialize: true, // Reinitialize when user changes
  });

  // Update form values when user changes
  useEffect(() => {
    if (user) {
      form.setValues({
        firstname: user.firstname || "",
        lastname: user.lastname || "",
        phonenumber: user.phonenumber
          ? formatPhoneNumber(user.phonenumber)
          : "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Custom handler for phone number input that formats as user types
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    form.setFieldValue("phonenumber", formatted);
  };

  // Custom handler for phone number paste
  const handlePhoneNumberPaste = (
    e: React.ClipboardEvent<HTMLInputElement>
  ) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const formatted = formatPhoneNumber(pastedText);
    form.setFieldValue("phonenumber", formatted);
  };

  // Handler for avatar upload
  const handleAvatarUpload = async (file: File) => {
    try {
      // Convert file to data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Prepare avatarFile object
      const avatarFile = {
        filename: file.name,
        data: dataUrl,
      };

      // Upload avatar
      const response = await $api.put<User>("users/me", {
        avatarFile,
      });

      // Update user in store
      setUser(response.data);

      console.log("Avatar updated successfully");
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      throw error;
    }
  };

  // Handler for picture change (file input)
  const handlePictureChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fileInputRef: React.RefObject<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploadingAvatar(true);
      try {
        await handleAvatarUpload(file);
      } catch (error) {
        // Error is already logged in handleAvatarUpload
        // You could show a toast notification here
      } finally {
        setIsUploadingAvatar(false);
        // Reset file input so the same file can be selected again
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  // Handler for edit picture button click
  const handleEditPictureClick = (
    fileInputRef: React.RefObject<HTMLInputElement>
  ) => {
    fileInputRef.current?.click();
  };

  // Handler for logout: forget the tokens and the stored user, not just the page
  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return {
    form,
    user,
    isUploadingAvatar,
    handlePhoneNumberChange,
    handlePhoneNumberPaste,
    handlePictureChange,
    handleEditPictureClick,
    handleLogout,
  };
};
