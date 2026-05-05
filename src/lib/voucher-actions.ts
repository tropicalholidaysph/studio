'use client';

import { initializeFirebase } from "@/firebase";
import { 
  collection, 
  setDoc,
  doc,
  getDocs, 
  getDoc, 
  query, 
  orderBy, 
  writeBatch,
  updateDoc,
  deleteDoc,
  Firestore,
  where
} from "firebase/firestore";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Voucher, Ledger } from "./types";

const getDb = () => initializeFirebase().firestore;

const VOUCHERS_COLLECTION = "vouchers";
const LEDGERS_COLLECTION = "ledgers";

// --- Ledger Actions ---

export async function getLedgers(): Promise<Ledger[]> {
  const db = getDb();
  const q = query(collection(db, LEDGERS_COLLECTION), orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ledger));
}

export async function createLedger(name: string, db: Firestore): Promise<Ledger> {
  const docRef = doc(collection(db, LEDGERS_COLLECTION));
  const ledger = {
    id: docRef.id,
    name,
    createdAt: new Date().toISOString()
  };
  
  await setDoc(docRef, ledger).catch(err => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: docRef.path,
      operation: 'create',
      requestResourceData: ledger
    }));
  });
  
  return ledger;
}

export async function renameLedger(id: string, newName: string) {
  const db = getDb();
  const docRef = doc(db, LEDGERS_COLLECTION, id);
  updateDoc(docRef, { name: newName }).catch(err => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: docRef.path,
      operation: 'update',
      requestResourceData: { name: newName }
    }));
  });
}

export async function deleteLedger(id: string) {
  const db = getDb();
  const docRef = doc(db, LEDGERS_COLLECTION, id);
  deleteDoc(docRef).catch(err => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: docRef.path,
      operation: 'delete'
    }));
  });
}

// --- Voucher Actions ---

export async function bulkImportVouchers(vouchers: Omit<Voucher, 'id' | 'createdAt'>[]) {
  const db = getDb();
  const chunkSize = 400; 
  const now = new Date().toISOString();

  for (let i = 0; i < vouchers.length; i += chunkSize) {
    const chunk = vouchers.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    
    chunk.forEach((v) => {
      const docRef = doc(collection(db, VOUCHERS_COLLECTION));
      batch.set(docRef, {
        ...v,
        createdAt: now,
      });
    });
    
    await batch.commit();
  }
  
  return { success: true, count: vouchers.length };
}

export async function bulkDeleteVouchers(ids: string[]) {
  const db = getDb();
  const chunkSize = 400;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    
    chunk.forEach((id) => {
      const docRef = doc(db, VOUCHERS_COLLECTION, id);
      batch.delete(docRef);
    });
    
    await batch.commit();
  }
  
  return { success: true };
}

export function createVoucher(voucher: Omit<Voucher, 'id' | 'createdAt'>, db: Firestore) {
  const docRef = doc(collection(db, VOUCHERS_COLLECTION));
  const id = docRef.id;
  const data = {
    ...voucher,
    createdAt: new Date().toISOString(),
  };

  setDoc(docRef, data).catch((error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: docRef.path,
      operation: 'create',
      requestResourceData: data
    }));
  });

  return { success: true, id };
}

export async function updateVoucher(id: string, voucherData: Partial<Voucher>, db: Firestore) {
  const docRef = doc(db, VOUCHERS_COLLECTION, id);
  
  await updateDoc(docRef, voucherData).catch((error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: docRef.path,
      operation: 'update',
      requestResourceData: voucherData
    }));
  });

  return { success: true };
}

export async function getVoucherById(id: string): Promise<Voucher | null> {
  const db = getDb();
  try {
    const docRef = doc(db, VOUCHERS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Voucher;
    }
    return null;
  } catch (error) {
    return null;
  }
}
