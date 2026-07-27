import { companyAccountSecurityHandler } from "../functions/lib/company/accountSecurity.js";
import { companyOrderOperationsHandler } from "../functions/lib/company/orderOperations.js";
import { companyProductLifecycleHandler } from "../functions/lib/company/productLifecycle.js";
import { companyIntegrationEventRetryHandler } from "../functions/lib/integrations/companyAdmin/handlers.js";

function request(body) {
  return {
    method: "POST",
    body,
    query: {},
    get() {
      return "";
    },
  };
}

function response() {
  const state = { status: 0, body: null };
  return {
    state,
    status(code) {
      state.status = code;
      return this;
    },
    json(body) {
      state.body = body;
      return this;
    },
    set() {
      return this;
    },
  };
}

async function expectStatus(name, handler, body, expected) {
  const res = response();
  await handler(request(body), res);
  if (res.state.status !== expected) {
    throw new Error(
      `${name}: expected HTTP ${expected}, received ${res.state.status} ${JSON.stringify(res.state.body)}`,
    );
  }
  console.log(`PASS ${name}: HTTP ${expected}`);
}

await expectStatus(
  "product lifecycle requires Firebase token",
  companyProductLifecycleHandler,
  { productId: "guard-test", action: "suspend" },
  401,
);
await expectStatus(
  "order and inventory operations require Firebase token",
  companyOrderOperationsHandler,
  { action: "inventory_adjust", productId: "guard-test", delta: 1, reason: "guard" },
  401,
);
await expectStatus(
  "account password change requires Firebase token",
  companyAccountSecurityHandler,
  { action: "change_password" },
  401,
);
await expectStatus(
  "integration retry requires Firebase token",
  companyIntegrationEventRetryHandler,
  { companyId: "guard-company", eventId: "guard-event" },
  401,
);

console.log("PASS company admin server guard contract 4/4");
