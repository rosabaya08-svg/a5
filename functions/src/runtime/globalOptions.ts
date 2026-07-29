import { setGlobalOptions } from "firebase-functions/v2";

const connector = String(process.env.PAYUP_VPC_CONNECTOR ?? "").trim();

setGlobalOptions({
  region: "asia-northeast3",
  ...(connector
    ? {
        vpcConnector: connector,
        vpcConnectorEgressSettings: "ALL_TRAFFIC" as const,
      }
    : {}),
});
