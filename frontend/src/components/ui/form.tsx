"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Form Context
interface FormContextType {
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  values: Record<string, any>;
  setFieldValue: (name: string, value: any) => void;
  setFieldError: (name: string, error: string) => void;
  setFieldTouched: (name: string, touched: boolean) => void;
  validateField: (name: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

const FormContext = React.createContext<FormContextType | undefined>(undefined);

const useFormFieldInternal = () => {
  const context = React.useContext(FormContext);
  if (!context) {
    throw new Error("useFormField must be used within a Form component");
  }
  return context;
};

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  onSubmit: (values: Record<string, any>) => void | Promise<void>;
  initialValues?: Record<string, any>;
  validate?: (values: Record<string, any>) => Record<string, string>;
}

const Form = React.forwardRef<HTMLFormElement, FormProps>(
  (
    { children, onSubmit, initialValues = {}, validate, className, ...props },
    ref,
  ) => {
    const [values, setValues] =
      React.useState<Record<string, any>>(initialValues);
    const [errors, setErrors] = React.useState<Record<string, string>>({});
    const [touched, setTouched] = React.useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const setFieldValue = React.useCallback((name: string, value: any) => {
      setValues((prev) => ({ ...prev, [name]: value }));
    }, []);

    const setFieldError = React.useCallback((name: string, error: string) => {
      setErrors((prev) => ({ ...prev, [name]: error }));
    }, []);

    const setFieldTouched = React.useCallback(
      (name: string, touched: boolean) => {
        setTouched((prev) => ({ ...prev, [name]: touched }));
      },
      [],
    );

    const validateField = React.useCallback(
      (name: string) => {
        if (!validate) return;

        const fieldErrors = validate(values);
        if (fieldErrors[name]) {
          setFieldError(name, fieldErrors[name]);
        } else {
          setErrors((prev) => {
            const { [name]: _, ...rest } = prev;
            return rest;
          });
        }
      },
      [values, validate, setFieldError],
    );

    const handleSubmit = React.useCallback(
      async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Validate all fields
        if (validate) {
          const validationErrors = validate(values);
          setErrors(validationErrors);

          if (Object.keys(validationErrors).length > 0) {
            setIsSubmitting(false);
            return;
          }
        }

        try {
          await onSubmit(values);
        } catch (error) {
          console.error("Form submission error:", error);
        } finally {
          setIsSubmitting(false);
        }
      },
      [values, validate, onSubmit],
    );

    const contextValue = React.useMemo(
      () => ({
        errors,
        touched,
        values,
        setFieldValue,
        setFieldError,
        setFieldTouched,
        validateField,
        handleSubmit,
      }),
      [
        errors,
        touched,
        values,
        setFieldValue,
        setFieldError,
        setFieldTouched,
        validateField,
        handleSubmit,
      ],
    );

    return (
      <FormContext.Provider value={contextValue}>
        <form
          ref={ref}
          onSubmit={handleSubmit}
          className={cn("space-y-6", className)}
          {...props}
        >
          {children}
        </form>
      </FormContext.Provider>
    );
  },
);
Form.displayName = "Form";

const FormField = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    name: string;
    label?: string;
    description?: string;
    required?: boolean;
  }
>(
  (
    { className, name, label, description, required, children, ...props },
    ref,
  ) => {
    const { errors, touched } = useFormFieldInternal();
    const error = touched[name] ? errors[name] : undefined;
    const fieldId = `field-${name}`;

    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {label && (
          <FormLabel htmlFor={fieldId} required={required}>
            {label}
          </FormLabel>
        )}
        <div id={fieldId}>
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child as React.ReactElement<any>, {
                name,
                id: fieldId,
                "aria-invalid": !!error,
                "aria-describedby": error
                  ? `${fieldId}-error`
                  : description
                    ? `${fieldId}-description`
                    : undefined,
              });
            }
            return child;
          })}
        </div>
        {description && !error && (
          <FormDescription id={`${fieldId}-description`}>
            {description}
          </FormDescription>
        )}
        {error && <FormMessage id={`${fieldId}-error`}>{error}</FormMessage>}
      </div>
    );
  },
);
FormField.displayName = "FormField";

const FormLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }
>(({ className, children, required, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className,
    )}
    {...props}
  >
    {children}
    {required && <span className="ml-1 text-destructive">*</span>}
  </label>
));
FormLabel.displayName = "FormLabel";

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm font-medium text-destructive", className)}
    {...props}
  >
    {children}
  </p>
));
FormMessage.displayName = "FormMessage";

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-2", className)} {...props} />
));
FormItem.displayName = "FormItem";

const FormControl = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { name: string }
>(({ className, name, children, ...props }, ref) => {
  const { setFieldValue, setFieldTouched, validateField, values } =
    useFormFieldInternal();

  const handleChange = React.useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      setFieldValue(name, e.target.value);
    },
    [name, setFieldValue],
  );

  const handleBlur = React.useCallback(() => {
    setFieldTouched(name, true);
    validateField(name);
  }, [name, setFieldTouched, validateField]);

  return (
    <div ref={ref} className={className} {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const childElement = child as React.ReactElement<any>;
          return React.cloneElement(childElement, {
            name,
            value: values[name] || "",
            onChange: (e: React.ChangeEvent<any>) => {
              (childElement.props as any).onChange?.(e);
              handleChange(e);
            },
            onBlur: (e: React.FocusEvent<any>) => {
              (childElement.props as any).onBlur?.(e);
              handleBlur();
            },
          });
        }
        return child;
      })}
    </div>
  );
});
FormControl.displayName = "FormControl";

// Export hook for external use
export const useFormField = useFormFieldInternal;

export {
  Form,
  FormField,
  FormLabel,
  FormDescription,
  FormMessage,
  FormItem,
  FormControl,
};
