import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { ensureAnonymousFirebaseUser, getFirebaseDb } from "@/lib/firebase/client";

export type LiveShopCollection =
  | "carts"
  | "qr_payment_sessions"
  | "orders"
  | "order_items";

export type LiveShopSaveResult = {
  mode: "firebase" | "local";
  message: string;
};

export async function saveLiveShopDocument(
  collectionName: LiveShopCollection,
  id: string,
  data: Record<string, unknown>,
): Promise<LiveShopSaveResult> {
  const db = getFirebaseDb();

  if (!db) {
    return {
      mode: "local",
      message: "Firebase env missing. Saved in browser storage only.",
    };
  }

  try {
    const user = await ensureAnonymousFirebaseUser();
    const ownedData = user && data.owner_uid === undefined ? { ...data, owner_uid: user.uid } : data;
    await setDoc(
      doc(db, collectionName, id),
      {
        ...ownedData,
        updated_at: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    return {
      mode: "local",
      message: error instanceof Error ? `Browser storage saved. Firebase skipped: ${error.message}` : "Browser storage saved. Firebase skipped.",
    };
  }

  return {
    mode: "firebase",
    message: `Saved to ${collectionName}/${id}.`,
  };
}
