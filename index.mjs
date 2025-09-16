import * as accountsHandler from "./core/accounts/index.mjs";
import * as policiesHandler from "./core/policies/index.mjs";

export const handler = async (event) => {
  const entity = event.entity;

  switch (entity) {
    case "accounts":
      return await accountsHandler.handler(event);
    case "policies":
      return await policiesHandler.handler(event);
    default:
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Entity '${entity}' not supported` }),
      };
  }
};
