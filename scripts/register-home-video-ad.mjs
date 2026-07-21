import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;

  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const raw = trimmed.slice(index + 1).trim();
    if (!process.env[key]) {
      process.env[key] = raw.replace(/^['"]|['"]$/g, "");
    }
  }
}

loadLocalEnv();

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "a5-closed-mall",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "a5-closed-mall.firebasestorage.app",
};

const sourceFilePath = process.argv[2] || "D:\\계절이네\\영상업로드\\1.mp4";
const clickUrl = process.argv[3] || "http://withfarmbaro.co.kr";
const recordId = process.argv[4] || "home-video-withfarmbaro-1";

function firebaseToolsAuthModule() {
  const require = createRequire(import.meta.url);
  const searchPaths = [process.cwd()];

  if (process.env.APPDATA) {
    searchPaths.push(`${process.env.APPDATA}\\npm\\node_modules`);
  }

  const modulePath = require.resolve("firebase-tools/lib/auth.js", { paths: searchPaths });
  return require(modulePath);
}

async function getFirebaseAccessToken() {
  const authModule = firebaseToolsAuthModule();
  const account =
    authModule.getProjectDefaultAccount?.(process.cwd()) ||
    authModule.getGlobalDefaultAccount?.() ||
    authModule.getAllAccounts?.()[0];

  if (!account?.tokens?.refresh_token) {
    throw new Error("Firebase CLI 로그인 계정을 찾지 못했습니다.");
  }

  const tokenResult = await authModule.getAccessToken(account.tokens.refresh_token, [
    "email",
    "openid",
    "https://www.googleapis.com/auth/firebase",
    "https://www.googleapis.com/auth/cloud-platform",
  ]);

  const accessToken = typeof tokenResult === "string" ? tokenResult : tokenResult?.access_token;
  if (!accessToken) throw new Error("Firebase CLI access token 발급에 실패했습니다.");

  return accessToken;
}

function firestoreValue(value) {
  if (value === undefined || value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(firestoreValue) } };
  }

  return { mapValue: { fields: firestoreFields(value) } };
}

function firestoreFields(data) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, firestoreValue(value)]),
  );
}

async function uploadVideo(accessToken) {
  if (!existsSync(sourceFilePath)) {
    throw new Error(`영상 파일을 찾지 못했습니다: ${sourceFilePath}`);
  }

  const token = randomUUID();
  const objectPath = `public/storefront/marketing_videos/${recordId}/${Date.now()}-${basename(sourceFilePath)}`;
  const metadata = {
    name: objectPath,
    contentType: "video/mp4",
    metadata: {
      firebaseStorageDownloadTokens: token,
      source: "a5-admin-home-video",
      recordId,
      clickUrl,
    },
  };

  const delimiter = `a5-video-${randomUUID()}`;
  const bodyPrefix =
    `--${delimiter}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${JSON.stringify(metadata)}\r\n` +
    `--${delimiter}\r\n` +
    "Content-Type: video/mp4\r\n\r\n";
  const bodySuffix = `\r\n--${delimiter}--`;
  const fileBuffer = readFileSync(sourceFilePath);
  const body = Buffer.concat([Buffer.from(bodyPrefix), fileBuffer, Buffer.from(bodySuffix)]);

  const response = await fetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${firebaseConfig.storageBucket}/o?uploadType=multipart`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${delimiter}`,
      },
      body,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Storage upload failed: ${response.status} ${errorText}`);
  }

  const encodedPath = encodeURIComponent(objectPath);
  return {
    asset_url: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${encodedPath}?alt=media&token=${token}`,
    asset_path: objectPath,
    asset_type: "video",
    asset_original_name: basename(sourceFilePath),
    asset_storage_mode: "firebase_storage",
  };
}

async function commitFirestore(accessToken, records) {
  const writes = records.map((record) => {
    const { collection, id, data } = record;
    return {
      update: {
        name: `projects/${firebaseConfig.projectId}/databases/(default)/documents/${collection}/${id}`,
        fields: firestoreFields(data),
      },
    };
  });

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:commit`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ writes }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firestore REST commit failed: ${response.status} ${errorText}`);
  }
}

async function main() {
  const accessToken = await getFirebaseAccessToken();
  const asset = await uploadVideo(accessToken);
  const nowIso = new Date().toISOString();

  const videoRecord = {
    id: recordId,
    title: "위드팜바로 영상 광고",
    eyebrow: "영상 광고",
    body: "",
    placement: "home_video_strip",
    target: "all_nurseries",
    display_order: 0,
    video_action_type: "advertiser_url",
    video_action_target: clickUrl,
    action_type: "advertiser_url",
    action_target: clickUrl,
    href: clickUrl,
    click_target: clickUrl,
    link_url: clickUrl,
    muted_by_default: true,
    tap_sound_enabled: true,
    autoplay_enabled: true,
    loop_enabled: true,
    status: "live",
    approval_status: "approved",
    owner_type: "admin",
    source: "cms_beta",
    source_app: "admin_home_editor",
    demo_read_enabled: true,
    guest_write_enabled: true,
    updated_at: nowIso,
    ...asset,
  };

  await commitFirestore(accessToken, [
    {
      collection: "marketing_videos",
      id: recordId,
      data: videoRecord,
    },
    {
      collection: "media_assets",
      id: `asset-${recordId}`,
      data: {
        title: videoRecord.title,
        source_collection: "marketing_videos",
        source_record_id: recordId,
        owner_type: "admin",
        status: "live",
        approval_status: "live",
        source: "cms_beta",
        source_app: "admin_home_editor",
        demo_read_enabled: true,
        guest_write_enabled: true,
        updated_at: nowIso,
        ...asset,
      },
    },
  ]);

  console.log(`registered marketing_videos/${recordId}`);
  console.log(`asset_url=${asset.asset_url}`);
  console.log(`click_url=${clickUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
