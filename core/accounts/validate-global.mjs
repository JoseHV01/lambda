export async function validateGlobal(results) {
  const ENDPOINT_CHECK_EMAIL = 'https://apistg.mymasterbook.net/account/check-email';

  const emailSet = new Set();
  for (const row of results) {
    if (row.data.email) {
      if (emailSet.has(row.data.email)) {
        row.errors.push(`email '${row.data.email}' is duplicated in Excel`);
      } else {
        emailSet.add(row.data.email);
      }
    }
  }

  const emails = results
    .map((r) => r.data.email)
    .filter((e) => e !== null && e !== undefined);

  if (emails.length > 0) {
    try {
      const response = await fetch(`${ENDPOINT_CHECK_EMAIL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });

      if (!response.ok) {
        throw new Error(`Error checking emails: ${response.statusText}`);
      }

      const responseJson = await response.json();
      const existingEmails = responseJson.data ?? [];

      for (const row of results) {
        if (row.data.email && existingEmails.includes(row.data.email)) {
          row.errors.push(
            `email '${row.data.email}' is already registered in DB`
          );
        }
      }
    } catch (err) {
      console.error("Error validating emails in DB:", err);
    }
  }

  return results;
}
