import XLSX from "xlsx";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { validateField } from "./validate-rules.mjs";
import { validateGlobal } from "./validate-global.mjs";

const s3 = new S3Client({ region: 'us-west-2' });

export const handler = async (event) => {
  try {
    const bucket = event.bucket;
    const key = event.key;
    const upload_file_id = event.upload_file_id;

    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3.send(command);
    const buffer = await response.Body.transformToByteArray();

    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: false,
      raw: true,
    });
    const sheet = workbook.Sheets["Template"];
    if (!sheet) throw new Error("Sheet 'Template' not found");

    const range = XLSX.utils.decode_range(sheet["!ref"]);
    const results = [];

    for (let row = 5; row <= range.e.r + 1; row++) {
        let policy = {
            account_email: sheet[`B${row}`]?.v ?? null,
            business_line: sheet[`C${row}`]?.v ?? null,
            request_type: sheet[`D${row}`]?.v ?? null,
            policy_number: sheet[`E${row}`]?.v ?? null,
            effective_date: sheet[`F${row}`]?.w ?? sheet[`F${row}`]?.v ?? null,
            expiration_date: sheet[`G${row}`]?.w ?? sheet[`G${row}`]?.v ?? null,
            insurance_company: sheet[`H${row}`]?.v ?? null,
            policy_prime: sheet[`I${row}`]?.v ?? null,
            coverage: sheet[`J${row}`]?.v ?? null,
            deductible: sheet[`K${row}`]?.v ?? null,
            object_to_insured: sheet[`L${row}`]?.v ?? null,
            agent_email: sheet[`M${row}`]?.v ?? null,
            details_for_policy: sheet[`N${row}`]?.v ?? null,
          };

      const hasAnyValue = Object.values(policy).some(
        (v) => v !== null && v !== undefined && v !== ""
      );
      if (!hasAnyValue) continue;

      const errors = [];
      for (const key of Object.keys(policy)) {
        const validation = validateField(key, policy[key]);
        if (!validation.valid) errors.push(validation.error);
      }

      ["policy_prime", "coverage", "deductible"].forEach((key) => {
        if (typeof policy[key] === "string") {
          policy[key] = policy[key].replace(/\$/g, "").trim();
        }
      });

      results.push({ row, data: policy, errors });
    }

    const validatedResults = await validateGlobal(results);

    const success = validatedResults.filter((r) => r.errors.length === 0);
    const failed = validatedResults.filter((r) => r.errors.length > 0);

    const finalResponse = {
      upload_file_id,
      total_rows: validatedResults.length,
      total_rows_success: success.length,
      total_rows_failed: failed.length,
      success,
      failed,
      entity: event.entity,
    };

    const ENDPOINT_CALLBACK_URL = 'https://apistg.mymasterbook.net/upload-file/callback';
    try {
      await fetch(ENDPOINT_CALLBACK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalResponse),
      });
    } catch (err) {
      console.error("Error enviando callback al backend:", err);
    }

    return finalResponse;
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal error inside Lambda Policies",
        message: err.message,
        event: event,
      }),
    };
  }
};
