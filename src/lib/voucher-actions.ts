
import { db } from "./firebase";
import { 
  collection, 
  setDoc,
  doc,
  getDocs, 
  getDoc, 
  query, 
  orderBy, 
  Timestamp,
  writeBatch
} from "firebase/firestore";
import { Voucher } from "./types";
import { convertAmountToWords } from "./amount-utils";

const VOUCHERS_COLLECTION = "vouchers";

/**
 * Creates a voucher non-blockingly for instant UI response.
 */
export function createVoucher(voucher: Omit<Voucher, 'id' | 'createdAt'>) {
  const docRef = doc(collection(db, VOUCHERS_COLLECTION));
  const id = docRef.id;

  setDoc(docRef, {
    ...voucher,
    createdAt: Timestamp.now().toDate().toISOString(),
  }).catch((error) => {
    console.error("Background Firestore write failed:", error);
  });

  return { success: true, id };
}

/**
 * Bulk imports vouchers from an array of data.
 */
export async function bulkImportVouchers(vouchers: Omit<Voucher, 'id' | 'createdAt'>[]) {
  const batch = writeBatch(db);
  const results: string[] = [];

  vouchers.forEach((v) => {
    const docRef = doc(collection(db, VOUCHERS_COLLECTION));
    batch.set(docRef, {
      ...v,
      createdAt: Timestamp.now().toDate().toISOString(),
    });
    results.push(docRef.id);
  });

  await batch.commit();
  return results;
}

export async function getVouchers(): Promise<Voucher[]> {
  try {
    const q = query(collection(db, VOUCHERS_COLLECTION), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Voucher[];
  } catch (error) {
    console.error("Error fetching vouchers:", error);
    return [];
  }
}

export async function getVoucherById(id: string): Promise<Voucher | null> {
  try {
    const docRef = doc(db, VOUCHERS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Voucher;
    }
    return null;
  } catch (error) {
    console.error("Error fetching voucher:", error);
    return null;
  }
}
