import XLSX from "xlsx";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { validateField } from "./validate-rules.mjs";
import { validateGlobal } from "./validate-global.mjs";

const s3 = new S3Client({ region: process.env.AWS_REGION });

export const handler = async (event) => {
  console.log(event);
  try {
    const bucket = event.bucket;
    const key = event.key;
    const uploadFileId = event.uploadFileId;

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
      let account = {
        account_name: sheet[`B${row}`]?.v ?? null,
        first_name: sheet[`C${row}`]?.v ?? null,
        last_name: sheet[`D${row}`]?.v ?? null,
        ssn: sheet[`E${row}`]?.v ?? null,
        email: sheet[`F${row}`]?.v ?? null,
        phone_number: sheet[`G${row}`]?.v ?? null,
        address: sheet[`H${row}`]?.v ?? null,
        zip_code: sheet[`I${row}`]?.v ?? null,
        gender: sheet[`J${row}`]?.v ?? null,
        marital_status: sheet[`K${row}`]?.v ?? null,
        date_of_birth: sheet[`L${row}`]?.w ?? sheet[`L${row}`]?.v ?? null,
      };

      const hasAnyValue = Object.values(account).some(
        (v) => v !== null && v !== undefined && v !== ""
      );
      if (!hasAnyValue) continue;

      const errors = [];
      for (const key of Object.keys(account)) {
        const validation = validateField(key, account[key]);
        if (!validation.valid) errors.push(validation.error);
      }

      ["ssn", "phone_number", "zip_code"].forEach((key) => {
        if (account[key] !== null && account[key] !== undefined) {
          account[key] = String(account[key]);
        }
      });

      if (account.date_of_birth) {
        const [month, day, year] = account.date_of_birth.split(/[\/-]/);
        const date = new Date(`${year}-${month}-${day}T04:00:00.000+00:00`);

        if (!isNaN(date.getTime())) {
          account.date_of_birth = date.toISOString();
        } else {
          errors.push(
            `The provided date_of_birth "${account.date_of_birth}" is invalid. Please check the day, month, and year.`
          );
          account.date_of_birth = null;
        }
      }

      results.push({ row, data: account, errors });
    }

    const validatedResults = await validateGlobal(results);

    const success = validatedResults.filter((r) => r.errors.length === 0);
    const failed = validatedResults.filter((r) => r.errors.length > 0);

    const finalResponse = {
      uploadFileId,
      total_rows: validatedResults.length,
      total_rows_success: success.length,
      total_rows_failed: failed.length,
      success,
      failed,
      entity: event.entity
    };

    if (process.env.ENPOINT_CALLBACK_URL) {
      try {
        await fetch(process.env.ENPOINT_CALLBACK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalResponse),
        });
      } catch (err) {
        console.error("Error enviando callback al backend:", err);
      }
    } else {
      console.warn("ENPOINT_CALLBACK_URL no está definido en env vars");
    }

    return finalResponse;
  } catch (err) {
    console.error("Lambda error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
