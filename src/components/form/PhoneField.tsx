// src/components/form/PhoneField.tsx
"use client";

import React, { useEffect, useId, useState } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

type Props = {
  name?: string;
  defaultCountry?: string;
  initialValue?: string; // E.164 (+90530...)
  value?: string;
  onChange?: (val: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** "underline" verirsen iç input tek çizgili olur */
  variant?: "underline" | "outline";
};

const UnderlineInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function UnderlineInputBase({ className = "", ...props }, ref) {
  return (
    <input
      ref={ref}
      {...props}
      className={[
        "block w-full border-0 border-b border-gray-300 bg-transparent px-0 py-2",
        "text-[15px] outline-none ring-0",
        "focus:border-black focus:ring-0",
        className,
      ].join(" ")}
    />
  );
});

const OutlineInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function OutlineInputBase({ className = "", ...props }, ref) {
  return (
    <input
      ref={ref}
      {...props}
      className={[
        "w-full rounded-md border px-3 py-2 text-[15px] outline-none",
        "focus-visible:ring-2 focus-visible:ring-black/70",
        className,
      ].join(" ")}
    />
  );
});

export default function PhoneField({
  name = "phone",
  defaultCountry = "TR",
  initialValue,
  value,
  onChange,
  required = true,
  disabled,
  placeholder = "+90",
  className = "",
  variant = "outline",
}: Props) {
  const [inner, setInner] = useState<string | undefined>(
    value ?? initialValue ?? undefined,
  );

  useEffect(() => {
    if (value !== undefined) setInner(value ?? "");
  }, [value]);

  useEffect(() => {
    if (value === undefined && initialValue) {
      setInner((prev) => (prev ? prev : initialValue));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const id = useId();

  const handleChange = (val?: string) => {
    const next = val ?? "";
    setInner(next);
    onChange?.(next);
  };

  const InputComp = variant === "underline" ? UnderlineInput : OutlineInput;

  return (
    <div className={className}>
      <div className="PhoneField">
        <PhoneInput
          id={id}
          value={inner}
          onChange={handleChange}
          defaultCountry={defaultCountry as any}
          international
          countryCallingCodeEditable={false}
          inputComponent={InputComp as any}
          placeholder={placeholder}
          className="w-full"
          required={required}
          disabled={disabled}
        />
      </div>

      {/* server action'a gerçek değer */}
      <input
        type="hidden"
        name={name}
        value={inner || ""}
        required={required}
      />
    </div>
  );
}
