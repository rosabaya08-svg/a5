import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";

export type CmsCollectionName =
  | "banner_campaigns"
  | "ad_video_campaigns"
  | "product_detail_pages"
  | "theme_configs"
  | "content_targets"
  | "media_assets";

export type CmsRecord = {
  id: string;
  title?: string;
  placement?: string;
  target?: string;
  approval_status?: string;
  status?: string;
  asset_url?: string;
  asset_path?: string;
  asset_type?: string;
  updated_at?: unknown;
  [key: string]: unknown;
};

export function createCmsId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function subscribeCmsRecords(
  collectionName: CmsCollectionName,
  onChange: (records: CmsRecord[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  const db = getFirebaseDb();

  if (!db) {
    onError("Firebase web config is missing. Add NEXT_PUBLIC_FIREBASE_* values to enable live sync.");
    return () => undefined;
  }

  return onSnapshot(
    collection(db, collectionName),
    (snapshot) => {
      onChange(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    },
    (error) => onError(error.message),
  );
}

export async function saveCmsRecord(collectionName: CmsCollectionName, record: CmsRecord) {
  const db = getFirebaseDb();

  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  const { id, ...data } = record;

  await setDoc(
    doc(db, collectionName, id),
    {
      ...data,
      updated_at: serverTimestamp(),
    },
    { merge: true },
  );

  return id;
}

export async function uploadCmsFile(
  collectionName: CmsCollectionName,
  recordId: string,
  file: File,
): Promise<{ url: string; path: string; assetType: string }> {
  void collectionName;
  void recordId;
  void file;

  throw new Error("Firebase Storage upload is blocked for this phase. Use mock placeholders until separate approval.");
}
