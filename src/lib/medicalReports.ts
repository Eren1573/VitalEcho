import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { MedicalReport } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
  return errInfo;
}

// Initial connection test
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore connection check: Client offline or initial sync in progress.");
    }
    return false;
  }
}

const getLocalReports = (userId: string): MedicalReport[] => {
  try {
    const raw = localStorage.getItem(`vital_medical_reports_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const setLocalReports = (userId: string, reports: MedicalReport[]) => {
  try {
    localStorage.setItem(`vital_medical_reports_${userId}`, JSON.stringify(reports));
  } catch (e) {}
};

/**
 * Saves a new or analyzed medical report to the user's subcollection
 * Path: users/{userId}/medical_reports/{reportId}
 */
export async function saveMedicalReport(
  userId: string, 
  report: Omit<MedicalReport, 'id' | 'userId' | 'createdAt'> & { id?: string }
): Promise<MedicalReport> {
  const reportId = report.id || `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `users/${userId}/medical_reports/${reportId}`;
  
  const payload: MedicalReport = {
    id: reportId,
    userId,
    userEmail: report.userEmail || auth.currentUser?.email || 'isowri4ku@gmail.com',
    title: report.title || 'Medical Report Scan',
    reportType: report.reportType || 'general',
    date: report.date || new Date().toISOString().split('T')[0],
    summary: report.summary,
    careInstructions: report.careInstructions || [],
    medications: report.medications || [],
    criticalFlags: report.criticalFlags || [],
    fileName: report.fileName || 'scan_report.jpg',
    thumbnail: report.thumbnail || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Immediately cache locally
  const currentLocal = getLocalReports(userId);
  const updatedLocal = [payload, ...currentLocal.filter(r => r.id !== reportId)];
  setLocalReports(userId, updatedLocal);

  // 2. Commit to Firestore
  try {
    const reportDocRef = doc(db, 'users', userId, 'medical_reports', reportId);
    await setDoc(reportDocRef, payload);
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    // Return payload so the UI and user experience continue without interruption
    return payload;
  }
}

/**
 * Deletes a medical report from the user's subcollection
 */
export async function deleteMedicalReport(userId: string, reportId: string): Promise<void> {
  const path = `users/${userId}/medical_reports/${reportId}`;
  
  // Update local cache first
  const currentLocal = getLocalReports(userId);
  setLocalReports(userId, currentLocal.filter(r => r.id !== reportId));

  try {
    const reportDocRef = doc(db, 'users', userId, 'medical_reports', reportId);
    await deleteDoc(reportDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Sets up a real-time listener for the user's medical reports
 */
export function subscribeToMedicalReports(
  userId: string, 
  onReports: (reports: MedicalReport[]) => void,
  onError?: (err: any) => void
): () => void {
  const path = `users/${userId}/medical_reports`;
  
  // Emit local cache immediately
  const initialLocal = getLocalReports(userId);
  if (initialLocal.length > 0) {
    onReports(initialLocal);
  }

  const reportsCollection = collection(db, 'users', userId, 'medical_reports');
  const q = query(reportsCollection, orderBy('createdAt', 'desc'));

  try {
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const reports: MedicalReport[] = [];
        snapshot.forEach((docSnap) => {
          reports.push(docSnap.data() as MedicalReport);
        });
        
        // Merge with local reports in case of offline additions
        const local = getLocalReports(userId);
        const mergedMap = new Map<string, MedicalReport>();
        reports.forEach(r => mergedMap.set(r.id, r));
        local.forEach(r => {
          if (!mergedMap.has(r.id)) mergedMap.set(r.id, r);
        });
        const finalReports = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setLocalReports(userId, finalReports);
        onReports(finalReports);
      },
      (error) => {
        const errInfo = handleFirestoreError(error, OperationType.LIST, path);
        // Fall back to local storage reports cleanly
        onReports(getLocalReports(userId));
        if (onError) onError(errInfo);
      }
    );
    return unsubscribe;
  } catch (error) {
    const errInfo = handleFirestoreError(error, OperationType.LIST, path);
    onReports(getLocalReports(userId));
    if (onError) onError(errInfo);
    return () => {};
  }
}
