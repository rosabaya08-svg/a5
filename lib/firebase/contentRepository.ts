import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseAuthClient, getFirebaseDb, getFirebaseStorageClient } from "@/lib/firebase/client";

export type CmsCollectionName =
  | "marketing_banners"
  | "marketing_videos"
  | "brands"
  | "product_detail_pages"
  | "home_sections"
  | "tablet_home_configs"
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

export type CmsUploadScope = {
  companyId?: string;
  nurseryId?: string;
  roomId?: string;
  tabletId?: string;
  productId?: string;
};

export function createCmsId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeFileName(name: string) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "upload";
}

function assetTypeFor(file: File) {
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "image/gif") return "gif";
  if (file.type.startsWith("image/")) return "image";
  return "document";
}

function cmsStoragePath(collectionName: CmsCollectionName, recordId: string, file: File, scope?: CmsUploadScope) {
  const assetType = assetTypeFor(file);
  const fileName = `${Date.now()}-${safeFileName(file.name)}`;
  const companyId = scope?.companyId ?? "company-sanho-care";
  const productId = scope?.productId || recordId;

  if (collectionName === "product_detail_pages") {
    const folder = assetType === "video" ? "videos" : assetType === "gif" ? "gifs" : "images";
    return `companies/${companyId}/products/${productId}/${folder}/${fileName}`;
  }

  if (collectionName === "marketing_banners" || collectionName === "marketing_videos") {
    return `companies/${companyId}/ad-materials/${collectionName}/${recordId}/${fileName}`;
  }

  if (collectionName === "brands") {
    return `public/storefront/brands/${recordId}/${fileName}`;
  }

  if (collectionName === "home_sections" || collectionName === "tablet_home_configs") {
    return `public/storefront/${collectionName}/${recordId}/${fileName}`;
  }

  return `public/storefront/media_assets/${recordId}/${fileName}`;
}

function waitForFirebaseUser(timeoutMs = 5000): Promise<User | null> {
  const auth = getFirebaseAuthClient();

  if (!auth) {
    return Promise.resolve(null);
  }

  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      unsubscribe();
      resolve(auth.currentUser);
    }, timeoutMs);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      window.clearTimeout(timeout);
      unsubscribe();
      resolve(user);
    });
  });
}

function isSuperAdminUser(user: User) {
  return Promise.resolve((user.email?.trim().toLowerCase() ?? "") === "rosabaya08@gmail.com");
}

function requiresMasterAdmin(collectionName: CmsCollectionName) {
  return collectionName === "brands" ||
    collectionName === "home_sections" ||
    collectionName === "tablet_home_configs" ||
    collectionName === "marketing_banners" ||
    collectionName === "marketing_videos" ||
    collectionName === "media_assets";
}

async function requireCmsSession(collectionName: CmsCollectionName) {
  const user = await waitForFirebaseUser();

  if (!user) {
    throw new Error("Firebase Auth login is required. Please sign in again.");
  }

  if (requiresMasterAdmin(collectionName) && !(await isSuperAdminUser(user))) {
    throw new Error("Only the master admin account rosabaya08@gmail.com can edit home banners, ads, and official brands.");
  }

  return user;
}

export function subscribeCmsRecords(
  collectionName: CmsCollectionName,
  onChange: (records: CmsRecord[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  let unsubscribe: Unsubscribe = () => undefined;

  void requireCmsSession(collectionName)
    .then(() => {
      const db = getFirebaseDb();

      if (!db) {
        onError("Firebase web config is missing. Add NEXT_PUBLIC_FIREBASE_* values to enable live sync.");
        return;
      }

      unsubscribe = onSnapshot(
        collection(db, collectionName),
        (snapshot) => {
          onChange(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        },
        (error) => onError(error.message),
      );
    })
    .catch((error) => onError(error instanceof Error ? error.message : "Firebase anonymous auth failed."));

  return () => unsubscribe();
}

export async function saveCmsRecord(collectionName: CmsCollectionName, record: CmsRecord) {
  await requireCmsSession(collectionName);

  const db = getFirebaseDb();

  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  const { id, ...data } = record;

  await setDoc(
    doc(db, collectionName, id),
    {
      ...data,
      demo_read_enabled: true,
      guest_write_enabled: true,
      source: "cms_beta",
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
  scope?: CmsUploadScope,
): Promise<{ url: string; path: string; assetType: string }> {
  await requireCmsSession(collectionName);

  const storage = getFirebaseStorageClient();

  if (!storage) {
    throw new Error("Firebase Storage is not configured.");
  }

  const assetType = assetTypeFor(file);
  const path = cmsStoragePath(collectionName, recordId, file, scope);
  const uploadRef = ref(storage, path);

  await uploadBytes(uploadRef, file, {
    contentType: file.type || "application/octet-stream",
    customMetadata: {
      collectionName,
      recordId,
      assetType,
      source: "a5-cms-beta",
    },
  });

  const url = await getDownloadURL(uploadRef);

  return { url, path, assetType };
}
