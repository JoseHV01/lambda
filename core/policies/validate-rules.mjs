const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const numberPattern = /^\$?\d+(\.\d+)?$/;

export const rules = {
  account_email: {
    required: true,
    type: "string",
    pattern: emailPattern,
  },
  business_line: {
    required: true,
    type: "string",
    enum: ["Auto", "Health", "Life", "Home"],
  },
  request_type: {
    required: true,
    type: "string",
    enum: ["Personal", "Commercial"],
  },
  policy_number: {
    required: true,
    type: "number",
  },
  effective_date: {
    required: true,
    type: "string",
    format: "date-mmddyyyy",
    mustBeFuture: true,
  },
  expiration_date: {
    required: true,
    type: "string",
    format: "date-mmddyyyy",
    mustBeFuture: true,
  },
  insurance_company: {
    required: false,
    type: "string",
  },
  policy_prime: {
    required: true,
    type: "number",
    pattern: numberPattern,
  },
  coverage: {
    required: true,
    type: "number",
    pattern: numberPattern,
  },
  deductible: {
    required: true,
    type: "number",
    pattern: numberPattern,
  },
  object_to_insured: {
    required: true,
    type: "string",
  },
  agent_email: {
    required: true,
    type: "string",
    pattern: emailPattern,
  },
  details_for_policy: {
    required: false,
    type: "string",
  },
};

export function validateField(field, value) {
  const rule = rules[field];
  if (!rule) return { valid: true };

  if (rule.required && (value === undefined || value === null || value === "")) {
    return { valid: false, error: `${field.replace(/_/g, " ")} is required` };
  }

  if (!rule.required && (value === undefined || value === null || value === "")) {
    return { valid: true };
  }

  let finalValue = value;

  if (["policy_prime", "coverage", "deductible"].includes(field) && typeof value === "string") {
    finalValue = value.replace(/\$/g, "").trim();
  }

  if (rule.type === "number" && isNaN(Number(finalValue))) {
    return { valid: false, error: `${field.replace(/_/g, " ")} must be a valid number` };
  }

  if (rule.type === "string" && typeof finalValue !== "string") {
    return { valid: false, error: `${field.replace(/_/g, " ")} must be a string` };
  }

  if (rule.enum && !rule.enum.includes(finalValue)) {
    return {
      valid: false,
      error: `${field.replace(/_/g, " ")} must be one of: ${rule.enum.join(", ")}`,
    };
  }

  if (rule.pattern && !rule.pattern.test(finalValue)) {
    return { valid: false, error: `${field.replace(/_/g, " ")} is not valid` };
  }

  if (field === "effective_date" || field === "expiration_date") {
    const dateRegex = /^(0[1-9]|1[0-2])[\/-](0[1-9]|[12]\d|3[01])[\/-]\d{4}$/;
    if (!dateRegex.test(finalValue)) {
      return {
        valid: false,
        error: `${field.replace(/_/g, " ")} "${finalValue}" must be in MM/DD/YYYY or MM-DD-YYYY format`,
      };
    }

    const [month, day, year] = finalValue.split(/[\/-]/).map(Number);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return {
        valid: false,
        error: `${field.replace(/_/g, " ")} "${finalValue}" is an invalid date (example: 09-30-2000)`,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return {
        valid: false,
        error: `${field.replace(/_/g, " ")} cannot be earlier than today`,
      };
    }
  }

  return { valid: true };
}
