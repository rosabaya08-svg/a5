import { FieldValue, type Firestore } from "firebase-admin/firestore";

export type A5NurseryScopeInput = {
  requestedNurseryId?: string;
  businessRegistrationNo?: string;
  externalNurseryId?: string;
};

export type A5NurseryScope = {
  nurseryId: string;
  requestedNurseryId: string;
  businessRegistrationNo: string;
  businessRegistrationNoNormalized: string;
  externalNurseryId: string;
  aliasNurseryIds: string[];
  resolutionSource: string;
};

type ScopeCandidate = {
  nurseryId: string;
  businessRegistrationNo: string;
  externalNurseryId: string;
  source: string;
  score: number;
};

const businessNoFields = [
  "business_registration_no_normalized",
  "businessRegistrationNoNormalized",
  "business_registration_no",
  "businessRegistrationNo",
  "business_registration_number",
  "businessRegistrationNumber",
  "business_number",
  "businessNumber",
  "business_no",
  "businessNo",
  "biz_no",
  "bizNo",
  "biz_num",
  "bizNum",
  "biznum",
  "brn",
  "registration_no",
  "registrationNo",
  "registration_number",
  "registrationNumber",
  "company_registration_no",
  "companyRegistrationNo",
  "company_registration_number",
  "companyRegistrationNumber",
];

const nurseryIdFields = [
  "nursery_id",
  "nurseryId",
  "canonical_nursery_id",
  "canonicalNurseryId",
  "a5_nursery_id",
  "a5NurseryId",
  "id",
];

const externalNurseryIdFields = [
  "a4_external_nursery_id",
  "a4ExternalNurseryId",
  "external_nursery_id",
  "externalNurseryId",
];

function optionalString(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "";
}

export function normalizeBusinessRegistrationNo(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function unique(items: Array<string | undefined>) {
  return [...new Set(items.map((item) => item?.trim()).filter(Boolean) as string[])];
}

function businessNoCandidates(value: string) {
  const normalized = normalizeBusinessRegistrationNo(value);
  const formattedTenDigit =
    normalized.length === 10 ? `${normalized.slice(0, 3)}-${normalized.slice(3, 5)}-${normalized.slice(5)}` : "";
  return unique([value, normalized, formattedTenDigit]);
}

function fieldString(data: Record<string, unknown>, ...names: string[]) {
  for (const name of names) {
    const value = optionalString(data[name]);
    if (value) return value;
  }
  return "";
}

function normalizedFromData(data: Record<string, unknown>, fallback = "") {
  const value = fieldString(data, ...businessNoFields) || fallback;
  return normalizeBusinessRegistrationNo(value);
}

function generatedNurseryIds(normalizedBusinessNo: string) {
  return unique([
    `a4-${normalizedBusinessNo}`,
    `nursery-${normalizedBusinessNo}`,
    `business-${normalizedBusinessNo}`,
    `a1-nursery-${normalizedBusinessNo}`,
    `nursery-auto-${normalizedBusinessNo}`,
    normalizedBusinessNo,
  ]);
}

function isGeneratedNurseryId(value: string, normalizedBusinessNo: string) {
  return generatedNurseryIds(normalizedBusinessNo).includes(value);
}

function aliasIds(input: A5NurseryScopeInput, normalizedBusinessNo: string, canonicalNurseryId = "") {
  return unique([
    canonicalNurseryId,
    input.requestedNurseryId,
    input.externalNurseryId,
    ...generatedNurseryIds(normalizedBusinessNo),
  ]);
}

function candidateFromData(
  id: string,
  data: Record<string, unknown>,
  source: string,
  score: number,
  normalizedBusinessNo: string,
): ScopeCandidate | null {
  const dataBusinessNo = normalizedFromData(data, normalizedBusinessNo);
  if (normalizedBusinessNo && dataBusinessNo && dataBusinessNo !== normalizedBusinessNo) return null;

  const nurseryId = fieldString(data, ...nurseryIdFields) || id;
  if (!nurseryId) return null;

  return {
    nurseryId,
    businessRegistrationNo: fieldString(data, ...businessNoFields) || normalizedBusinessNo,
    externalNurseryId: fieldString(data, ...externalNurseryIdFields),
    source,
    score,
  };
}

async function readByDocId(targetDb: Firestore, collectionPath: string, docId: string, normalizedBusinessNo: string, score: number) {
  const snapshot = await targetDb.collection(collectionPath).doc(docId).get();
  if (!snapshot.exists) return null;
  return candidateFromData(snapshot.id, snapshot.data() ?? {}, `${collectionPath}:doc`, score, normalizedBusinessNo);
}

async function queryNurseryByBusinessNo(targetDb: Firestore, normalizedBusinessNo: string) {
  const candidates = businessNoCandidates(normalizedBusinessNo);

  for (const field of businessNoFields) {
    const snapshot = await targetDb.collection("nurseries").where(field, "in", candidates).limit(1).get();
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return candidateFromData(doc.id, doc.data(), `nurseries:${field}`, 420, normalizedBusinessNo);
    }
  }

  return null;
}

async function queryOperationalScopeByBusinessNo(targetDb: Firestore, normalizedBusinessNo: string) {
  const collections = ["rooms", "tablets", "qr_payment_sessions"];
  const candidates = businessNoCandidates(normalizedBusinessNo);

  for (const collectionPath of collections) {
    for (const field of businessNoFields) {
      const snapshot = await targetDb.collection(collectionPath).where(field, "in", candidates).limit(1).get();
      if (snapshot.empty) continue;

      const doc = snapshot.docs[0];
      const data = doc.data();
      const nurseryId = fieldString(data, "nursery_id", "nurseryId");
      if (nurseryId) {
        return {
          nurseryId,
          businessRegistrationNo: fieldString(data, ...businessNoFields) || normalizedBusinessNo,
          externalNurseryId: fieldString(data, ...externalNurseryIdFields),
          source: `${collectionPath}:${field}`,
          score: 500,
        } satisfies ScopeCandidate;
      }
    }
  }

  return null;
}

export async function resolveA5NurseryScope(targetDb: Firestore, input: A5NurseryScopeInput): Promise<A5NurseryScope> {
  const requestedNurseryId = optionalString(input.requestedNurseryId);
  let normalizedBusinessNo = normalizeBusinessRegistrationNo(input.businessRegistrationNo ?? "");
  const candidates: ScopeCandidate[] = [];

  if (!normalizedBusinessNo && requestedNurseryId) {
    const requestedDoc = await readByDocId(targetDb, "nurseries", requestedNurseryId, "", 300);
    if (requestedDoc?.businessRegistrationNo) {
      normalizedBusinessNo = normalizeBusinessRegistrationNo(requestedDoc.businessRegistrationNo);
      candidates.push(requestedDoc);
    }
  }

  if (normalizedBusinessNo) {
    const indexed = await readByDocId(targetDb, "nursery_business_index", normalizedBusinessNo, normalizedBusinessNo, 520);
    if (indexed) candidates.push(indexed);

    const operational = await queryOperationalScopeByBusinessNo(targetDb, normalizedBusinessNo);
    if (operational) candidates.push(operational);

    for (const docId of aliasIds(input, normalizedBusinessNo)) {
      const byDocId = await readByDocId(targetDb, "nurseries", docId, normalizedBusinessNo, docId === requestedNurseryId ? 440 : 410);
      if (byDocId) candidates.push(byDocId);
    }

    const byBusiness = await queryNurseryByBusinessNo(targetDb, normalizedBusinessNo);
    if (byBusiness) candidates.push(byBusiness);
  }

  if (!normalizedBusinessNo && requestedNurseryId) {
    return {
      nurseryId: requestedNurseryId,
      requestedNurseryId,
      businessRegistrationNo: "",
      businessRegistrationNoNormalized: "",
      externalNurseryId: optionalString(input.externalNurseryId),
      aliasNurseryIds: unique([requestedNurseryId, input.externalNurseryId]),
      resolutionSource: "requested_without_business_no",
    };
  }

  const sorted = candidates
    .filter((candidate) => candidate.nurseryId)
    .sort((left, right) => right.score - left.score);
  const selected = sorted[0];
  const fallbackNurseryId =
    requestedNurseryId && !isGeneratedNurseryId(requestedNurseryId, normalizedBusinessNo)
      ? requestedNurseryId
      : `a4-${normalizedBusinessNo}`;
  const nurseryId = selected?.nurseryId || fallbackNurseryId;
  const businessRegistrationNo = selected?.businessRegistrationNo || input.businessRegistrationNo || normalizedBusinessNo;
  const externalNurseryId = selected?.externalNurseryId || optionalString(input.externalNurseryId);

  return {
    nurseryId,
    requestedNurseryId,
    businessRegistrationNo,
    businessRegistrationNoNormalized: normalizedBusinessNo,
    externalNurseryId,
    aliasNurseryIds: aliasIds(input, normalizedBusinessNo, nurseryId),
    resolutionSource: selected?.source || "generated_a4_business_no",
  };
}

export async function ensureNurseryScopeIndex(targetDb: Firestore, scope: A5NurseryScope) {
  if (!scope.businessRegistrationNoNormalized || !scope.nurseryId) return;

  const now = FieldValue.serverTimestamp();
  const aliases = unique(scope.aliasNurseryIds);

  await targetDb.collection("nursery_business_index").doc(scope.businessRegistrationNoNormalized).set(
    {
      nursery_id: scope.nurseryId,
      business_registration_no: scope.businessRegistrationNo,
      business_registration_no_normalized: scope.businessRegistrationNoNormalized,
      external_nursery_id: scope.externalNurseryId || null,
      alias_nursery_ids: aliases,
      resolution_source: scope.resolutionSource,
      updated_at: now,
    },
    { merge: true },
  );

  const batch = targetDb.batch();
  aliases.forEach((alias) => {
    batch.set(
      targetDb.collection("nursery_aliases").doc(alias.replace(/[\\/#[\]?]+/g, "-")),
      {
        alias_nursery_id: alias,
        nursery_id: scope.nurseryId,
        business_registration_no_normalized: scope.businessRegistrationNoNormalized,
        updated_at: now,
      },
      { merge: true },
    );
  });
  await batch.commit();
}
