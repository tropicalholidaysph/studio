import { db } from "./firebase";
import { 
  collection, 
  setDoc,
  doc,
  getDocs, 
  getDoc, 
  query, 
  orderBy, 
  Timestamp 
} from "firebase/firestore";
import { Voucher } from "./types";

const VOUCHERS_COLLECTION = "vouchers";

/**
 * Creates a voucher non-blockingly for instant UI response.
 */
export function createVoucher(voucher: Omit<Voucher, 'id' | 'createdAt'>) {
  // Generate a document reference on the client to get the ID immediately
  const docRef = doc(collection(db, VOUCHERS_COLLECTION));
  const id = docRef.id;

  // Initiate the write in the background (optimistic)
  setDoc(docRef, {
    ...voucher,
    createdAt: Timestamp.now().toDate().toISOString(),
  }).catch((error) => {
    // Standard error logging
    console.error("Background Firestore write failed:", error);
  });

  // Return the ID immediately for navigation without waiting for the server
  return { success: true, id };
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
