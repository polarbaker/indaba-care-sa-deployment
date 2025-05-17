import React, { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = true, className = "", ...props }, ref) => {
    const inputStyles = `rounded-lg border px-3 py-3 text-sm transition-all duration-150 ease focus:outline-none focus:ring-2 ${
      error
        ? "border-[#E63946] focus:border-[#E63946] focus:ring-[#E63946]"
        : "border-secondary focus:border-primary focus:ring-primary"
    } ${fullWidth ? "w-full" : ""} ${className}`;

    return (
      <div className={fullWidth ? "w-full" : ""}>
        {label && (
          <label
            htmlFor={props.id}
            className="mb-1 block text-sm font-medium text-text-primary"
          >
            {label}
          </label>
        )}
        <input ref={ref} className={inputStyles} {...props} />
        {error && <p className="mt-1 text-sm text-[#E63946]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
