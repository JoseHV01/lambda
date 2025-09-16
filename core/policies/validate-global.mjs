export async function validateGlobal(results) {
  const ENDPOINT_VALIDATE_ROLE = 'https://apistg.mymasterbook.net/account/check-email-and-role';
  const ENDPOINT_VALIDATE_INSURANCE = 'https://apistg.mymasterbook.net/insurance-company/check-serials';

  async function validateEmailsWithRole(emails, role, fieldName) {
    if (!emails.length) return;

    try {
      const response = await fetch(`${ENDPOINT_VALIDATE_ROLE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails, role }),
      });

      if (!response.ok) {
        throw new Error(
          `Error validating ${fieldName} with role ${role}: ${response.statusText}`
        );
      }

      const { invalidEmails = [], notInRole = [] } = await response.json();

      for (const row of results) {
        const value = row.data[fieldName];
        if (!value) continue;

        if (invalidEmails.includes(value)) {
          row.errors.push(
            `${fieldName.replace("_", " ")} '${value}' is not registered in DB`
          );
        }

        if (notInRole.includes(value)) {
          row.errors.push(
            `${fieldName.replace("_", " ")} '${value}' does not have required role '${role}'`
          );
        }
      }
    } catch (err) {
      console.error(`Error validating ${fieldName} in DB:`, err);
    }
  }

  async function validateInsuranceCompanies(serials) {
    if (!serials.length) return;

    try {
      const response = await fetch(`${ENDPOINT_VALIDATE_INSURANCE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serials }),
      });

      if (!response.ok) {
        throw new Error(
          `Error validating insurance companies: ${response.statusText}`
        );
      }

      const { invalidSerials = [] } = await response.json();

      for (const row of results) {
        const value = row.data.insurance_company;
        if (!value) continue;

        if (invalidSerials.includes(value)) {
          row.errors.push(
            `insurance company '${value}' does not exist in DB`
          );
        }
      }
    } catch (err) {
      console.error("Error validating insurance companies in DB:", err);
    }
  }

  const accountEmails = results
    .map((r) => r.data.account_email)
    .filter((e) => e !== null && e !== undefined);
  await validateEmailsWithRole(accountEmails, "Account", "account_email");

  const agentEmails = results
    .map((r) => r.data.agent_email)
    .filter((e) => e !== null && e !== undefined);
  await validateEmailsWithRole(agentEmails, "Agent", "agent_email");

  const insuranceCompanies = results
    .map((r) => r.data.insurance_company)
    .filter((s) => s !== null && s !== undefined);
  await validateInsuranceCompanies(insuranceCompanies);

  return results;
}
