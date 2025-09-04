import * as accountsProcessor from "./core/accounts/index.mjs";

export const handler = async (event) => {
  try {
    console.log("Lambda event:", event);

    switch (event.entity) {
      case "accounts":
        return await accountsProcessor.handler(event);

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Entity '${event.entity}' not supported` }),
        };
    }
  } catch (err) {
    console.error("Dispatcher error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
