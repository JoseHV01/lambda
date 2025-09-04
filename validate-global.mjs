export async function validateGlobal(results) {
  const ENPOINT_CHECK_EMAIL = process.env.ENPOINT_CHECK_EMAIL;

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
      const response = await fetch(`${ENPOINT_CHECK_EMAIL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      console.log(response);

      if (!response.ok) {
        throw new Error(`Error checking emails: ${response.statusText}`);
      }

      const { existingEmails } = await response.json();

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
