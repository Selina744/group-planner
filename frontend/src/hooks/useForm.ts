/**
 * Custom form management hook - lightweight alternative to react-hook-form
 * Provides form state management, validation, and submission handling
 */

import { useState, useCallback } from 'react';

export interface UseFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  onSubmit?: (values: T) => Promise<void> | void;
}

export interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  setValue: (name: keyof T, value: any) => void;
  setFieldError: (name: keyof T, error: string | undefined) => void;
  setFieldTouched: (name: keyof T, touched?: boolean) => void;
  validateField: (name: keyof T) => string | undefined;
  validateForm: () => boolean;
  handleSubmit: (onSubmit?: (values: T) => Promise<void> | void) => (e?: React.FormEvent) => Promise<void>;
  reset: () => void;
  clearErrors: () => void;
}

export function useForm<T extends Record<string, any>>(
  options: UseFormOptions<T>
): UseFormReturn<T> {
  const [values, setValues] = useState<T>(options.initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));

    // Clear error when value changes
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [errors]);

  const setFieldError = useCallback((name: keyof T, error: string | undefined) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  const setFieldTouched = useCallback((name: keyof T, isTouched: boolean = true) => {
    setTouched(prev => ({ ...prev, [name]: isTouched }));
  }, []);

  const validateField = useCallback((name: keyof T): string | undefined => {
    if (!options.validate) return undefined;

    const allErrors = options.validate(values);
    return allErrors[name];
  }, [options.validate, values]);

  const validateForm = useCallback((): boolean => {
    if (!options.validate) return true;

    const newErrors = options.validate(values);
    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  }, [options.validate, values]);

  const handleSubmit = useCallback((onSubmit?: (values: T) => Promise<void> | void) => {
    return async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      // Mark all fields as touched
      const allTouched = Object.keys(values).reduce((acc, key) => ({
        ...acc,
        [key]: true,
      }), {});
      setTouched(allTouched);

      // Validate form
      if (!validateForm()) {
        return;
      }

      setIsSubmitting(true);

      try {
        const submitHandler = onSubmit || options.onSubmit;
        if (submitHandler) {
          await submitHandler(values);
        }
      } catch (error) {
        // Error handling is left to the submit handler
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    };
  }, [values, validateForm, options.onSubmit]);

  const reset = useCallback(() => {
    setValues(options.initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [options.initialValues]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setFieldError,
    setFieldTouched,
    validateField,
    validateForm,
    handleSubmit,
    reset,
    clearErrors,
  };
}