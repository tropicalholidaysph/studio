'use client';

import { db } from "./firebase";
import { 
  collection, 
  setDoc,
  doc,
  getDocs, 
  getDoc, 
  query, 
  orderBy, 
  where,
  Timestamp,
  writeBatch,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { Voucher, Ledger } from "./types";

const VOUCHERS_COLLECTION = "vouchers";
const LEDGERS_COLLECTION = "ledgers";

// --- Ledger Actions ---

export async function getLedgers(): Promise<Ledger[]> {
  const q = query(collection(db, LEDGERS_COLLECTION), orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ledger));
}

export async function createLedger(name: string): Promise<Ledger> {
  const docRef = doc(collection(db, LEDGERS_COLLECTION));
  const ledger = {
    id: docRef.id,
    name,
    createdAt: new Date().toISOString()
  };
  await setDoc(docRef, ledger);
  return ledger;
}

export async function renameLedger(id: string, newName: string) {
  const docRef = doc(db, LEDGERS_COLLECTION, id);
  await updateDoc(docRef, { name: newName });
}

export async function deleteLedger(id: string) {
  // In this MVP, we just delete the ledger record.
  // Ideally, you'd also delete or reassign associated vouchers.
  await deleteDoc(doc(db, LEDGERS_COLLECTION, id));
}

// --- Voucher Actions ---

/**
 * Robust bulk import that handles the 500-doc limit of Firestore batches.
 */
export async function bulkImportVouchers(vouchers: Omit<Voucher, 'id' | 'createdAt'>[]) {
  const results: string[] = [];
  const chunkSize = 400; // Leave some headroom

  for (let i = 0; i < vouchers.length; i += chunkSize) {
    const chunk = vouchers.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    
    chunk.forEach((v) => {
      const docRef = doc(collection(db, VOUCHERS_COLLECTION));
      batch.set(docRef, {
        ...v,
        createdAt: Timestamp.now().toDate().toISOString(),
      });
      results.push(docRef.id);
    });
    
    await batch.commit();
  }
  
  return results;
}

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

export async function getVouchersByLedger(ledgerId: string): Promise<Voucher[]> {
  try {
    const q = query(
      collection(db, VOUCHERS_COLLECTION), 
      where("ledgerId", "==", ledgerId),
      orderBy("createdAt", "desc")
    );
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
