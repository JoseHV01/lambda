const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function humanize(field) {
  return field.replace(/_/g, " ");
}

export const rules = {
  account_name: { required: true, type: "string", maxLength: 30 },
  first_name: { required: true, type: "string", maxLength: 12 },
  last_name: { required: true, type: "string", maxLength: 30 },
  ssn: { required: true, type: "string", minLength: 4, maxLength: 4 },
  email: { required: true, type: "string", pattern: emailPattern },
  phone_number: { required: true, type: "string", minLength: 10, maxLength: 10 },
  address: { required: true, type: "string" },
  zip_code: { required: true, type: "string", minLength: 5, maxLength: 5 },
  gender: { required: true, type: "string", enum: ["MALE", "FEMALE", "OTHER"] },
  marital_status: {
    required: true,
    type: "string",
    enum: [
      "SINGLE",
      "MARRIED",
      "DIVORCED",
      "WIDOWED",
      "SEPARATED",
      "ENGAGED",
      "DOMESTIC_PARTNERSHIP",
    ],
  },
  date_of_birth: { required: true, type: "string", format: "date-mmddyyyy" },
};

export function validateField(field, value) {
  const rule = rules[field];
  if (!rule) return { valid: true };

  const fieldName = humanize(field);

  if (rule.required && (value === undefined || value === null || value === "")) {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (!rule.required && (value === undefined || value === null || value === "")) {
    return { valid: true };
  }

  let finalValue = value;

  if (["ssn", "phone_number", "zip_code"].includes(field)) {
    if (typeof value !== "number" || isNaN(value)) {
      return { valid: false, error: `${fieldName} must be a valid number` };
    }
    finalValue = String(value);
  }

  if (field === "date_of_birth") {
    if (typeof value !== "string") {
      return { valid: false, error: `${fieldName} must be a string` };
    }
  
    const dateRegex = /^(0[1-9]|1[0-2])[\/-](0[1-9]|[12]\d|3[01])[\/-]\d{4}$/;
    if (!dateRegex.test(value)) {
      return {
        valid: false,
        error: `${fieldName} ${value} must be in MM/DD/YYYY or MM-DD-YYYY format`,
      };
    }
  
    const [month, day, year] = value.split(/[\/-]/).map(Number);
    const date = new Date(year, month - 1, day);
  
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return {
        valid: false,
        error: `The provided ${fieldName} ${value} is invalid. Please check the day, month, and year.`,
      };
    }
  }
  
  if (rule.type === "string" && typeof finalValue !== "string") {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  if (rule.minLength && String(finalValue).length < rule.minLength) {
    return {
      valid: false,
      error: `${fieldName} must have at least ${rule.minLength} characters`,
    };
  }
  if (rule.maxLength && String(finalValue).length > rule.maxLength) {
    return {
      valid: false,
      error: `${fieldName} must have at most ${rule.maxLength} characters`,
    };
  }

  if (rule.minLength && rule.maxLength && rule.minLength === rule.maxLength) {
    if (String(finalValue).length !== rule.minLength) {
      return {
        valid: false,
        error: `${fieldName} must have exactly ${rule.minLength} characters`,
      };
    }
  }

  if (rule.enum && !rule.enum.includes(finalValue)) {
    return {
      valid: false,
      error: `${fieldName} must be one of: ${rule.enum.join(", ")}`,
    };
  }

  if (rule.pattern && !rule.pattern.test(finalValue)) {
    return { valid: false, error: `${fieldName} "${finalValue}" is not a valid email` };
  }

  return { valid: true };
}
