const appStub = {
  name: "server-firebase-stub",
  options: {},
};

function browserOnly<T>(name: string): T {
  throw new Error(`${name} is browser-only in the A5 Cloudflare Worker server bundle.`);
}

export const browserLocalPersistence = { type: "LOCAL" };
export const browserSessionPersistence = { type: "SESSION" };

export class GoogleAuthProvider {}

export class ReCaptchaV3Provider {
  constructor(public readonly siteKey: string) {}
}

export function getApps() {
  return [appStub];
}

export function getApp() {
  return appStub;
}

export function initializeApp() {
  return appStub;
}

export function getAuth() {
  return { currentUser: null };
}

export function getFirestore() {
  return {};
}

export function getStorage() {
  return {};
}

export function initializeAppCheck() {
  return {};
}

export async function signInAnonymously() {
  return browserOnly("signInAnonymously");
}

export async function setPersistence() {
  return undefined;
}

export async function signInWithCustomToken() {
  return browserOnly("signInWithCustomToken");
}

export async function signInWithPopup() {
  return browserOnly("signInWithPopup");
}

export async function signInWithRedirect() {
  return browserOnly("signInWithRedirect");
}

export async function getRedirectResult() {
  return null;
}

export async function signOut() {
  return undefined;
}

export function onAuthStateChanged() {
  return () => {};
}

export function collection() {
  return {};
}

export function doc() {
  return {};
}

export function query() {
  return {};
}

export function where() {
  return {};
}

export function limit() {
  return {};
}

export function orderBy() {
  return {};
}

export function serverTimestamp() {
  return new Date().toISOString();
}

export async function getDoc() {
  return browserOnly("getDoc");
}

export async function getDocs() {
  return browserOnly("getDocs");
}

export async function setDoc() {
  return browserOnly("setDoc");
}

export async function updateDoc() {
  return browserOnly("updateDoc");
}

export async function deleteDoc() {
  return browserOnly("deleteDoc");
}

export async function addDoc() {
  return browserOnly("addDoc");
}

export function writeBatch() {
  return {
    set() {},
    update() {},
    delete() {},
    commit: async () => browserOnly("writeBatch.commit"),
  };
}

export function onSnapshot() {
  return () => {};
}

export function ref() {
  return {};
}

export async function uploadBytes() {
  return browserOnly("uploadBytes");
}

export async function getDownloadURL() {
  return browserOnly("getDownloadURL");
}
