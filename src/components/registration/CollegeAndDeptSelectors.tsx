import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { salemColleges, otherTopColleges, popularColleges, popularDepartments } from "@/lib/studentFields";

interface SelectorProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  size?: "sm" | "md";
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const CollegeSelect: React.FC<SelectorProps> = ({
  value,
  onChange,
  required = false,
  size = "md",
  disabled = false,
  placeholder = "Select College / University",
  className = "",
}) => {
  const isKnown = popularColleges.includes(value);
  const [isOther, setIsOther] = useState(!isKnown && !!value?.trim());

  useEffect(() => {
    if (value && !popularColleges.includes(value)) {
      setIsOther(true);
    } else if (popularColleges.includes(value) && value !== "Other") {
      setIsOther(false);
    }
  }, [value]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "Other") {
      setIsOther(true);
      if (popularColleges.includes(value)) {
        onChange("");
      }
    } else {
      setIsOther(false);
      onChange(val);
    }
  };

  const selectHeight = size === "sm" ? "h-9 text-xs rounded-lg" : "h-10 text-sm rounded-xl";
  const inputHeight = size === "sm" ? "h-9 text-xs rounded-lg" : "h-10 text-sm rounded-xl";

  const selectValue = isOther ? "Other" : value || "";

  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      <select
        value={selectValue}
        onChange={handleSelectChange}
        disabled={disabled}
        required={required && !isOther && !value}
        className={`w-full border border-input bg-background px-3 py-1.5 ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-foreground transition-all cursor-pointer ${selectHeight}`}
      >
        <option value="" disabled>
          -- {placeholder} --
        </option>
        <optgroup label="📍 Salem & Surrounding Colleges (Sona, KSR, GCE...)">
          {salemColleges.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </optgroup>
        <optgroup label="🏛️ Other Top Tamil Nadu / Premier Colleges">
          {otherTopColleges.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </optgroup>
        <option value="Other">✏️ Other / College Not Listed (Type Custom)</option>
      </select>

      {isOther && (
        <div className="pt-0.5 animate-in fade-in duration-200">
          <Input
            value={popularColleges.includes(value) ? "" : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your college name (e.g. Sona College, KSR, etc.)..."
            required={required}
            className={inputHeight}
            autoFocus
          />
        </div>
      )}
    </div>
  );
};

export const DepartmentSelect: React.FC<SelectorProps> = ({
  value,
  onChange,
  required = false,
  size = "md",
  disabled = false,
  placeholder = "Select Department / Branch",
  className = "",
}) => {
  const isKnown = popularDepartments.includes(value);
  const [isOther, setIsOther] = useState(!isKnown && !!value?.trim());

  useEffect(() => {
    if (value && !popularDepartments.includes(value)) {
      setIsOther(true);
    } else if (popularDepartments.includes(value) && value !== "Other") {
      setIsOther(false);
    }
  }, [value]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "Other") {
      setIsOther(true);
      if (popularDepartments.includes(value)) {
        onChange("");
      }
    } else {
      setIsOther(false);
      onChange(val);
    }
  };

  const selectHeight = size === "sm" ? "h-9 text-xs rounded-lg" : "h-10 text-sm rounded-xl";
  const inputHeight = size === "sm" ? "h-9 text-xs rounded-lg" : "h-10 text-sm rounded-xl";

  const selectValue = isOther ? "Other" : value || "";

  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      <select
        value={selectValue}
        onChange={handleSelectChange}
        disabled={disabled}
        required={required && !isOther && !value}
        className={`w-full border border-input bg-background px-3 py-1.5 ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-foreground transition-all cursor-pointer ${selectHeight}`}
      >
        <option value="" disabled>
          -- {placeholder} --
        </option>
        {popularDepartments
          .filter((dept) => dept !== "Other")
          .map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        <option value="Other">✏️ Other / Department Not Listed (Type Custom)</option>
      </select>

      {isOther && (
        <div className="pt-0.5 animate-in fade-in duration-200">
          <Input
            value={popularDepartments.includes(value) ? "" : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your department (e.g. CSE, AI & DS, ECE)..."
            required={required}
            className={inputHeight}
            autoFocus
          />
        </div>
      )}
    </div>
  );
};
