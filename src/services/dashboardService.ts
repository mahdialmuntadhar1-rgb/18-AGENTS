import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  addDoc, 
  orderBy, 
  limit, 
  getCountFromServer,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { RawBusiness, VerifiedBusiness, AgentTask } from '../types';

export const businessService = {
  async getStats() {
    const [
      rawCount,
      verifiedCount,
      pendingCount,
      approvedCount,
      taskCount
    ] = await Promise.all([
      getCountFromServer(collection(db, 'raw_businesses')),
      getCountFromServer(collection(db, 'businesses')),
      getCountFromServer(query(collection(db, 'businesses'), where('status', '==', 'pending'))),
      getCountFromServer(query(collection(db, 'businesses'), where('status', '==', 'approved'))),
      getCountFromServer(collection(db, 'agent_tasks'))
    ]);

    return {
      rawCount: rawCount.data().count || 0,
      verifiedCount: verifiedCount.data().count || 0,
      pendingCount: pendingCount.data().count || 0,
      approvedCount: approvedCount.data().count || 0,
      taskCount: taskCount.data().count || 0
    };
  },

  async getVerifiedBusinesses(filters: any) {
    let q = query(collection(db, 'businesses'), orderBy('created_at', 'desc'));
    
    if (filters.status && filters.status !== 'All') {
      q = query(q, where('status', '==', filters.status.toLowerCase()));
    }
    if (filters.city && filters.city !== 'All') {
      q = query(q, where('city', '==', filters.city));
    }
    if (filters.category && filters.category !== 'All') {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters.minScore) {
      q = query(q, where('confidence_score', '>=', filters.minScore));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as VerifiedBusiness[];
  },

  async updateStatus(id: string, status: string) {
    const businessRef = doc(db, 'businesses', id);
    await updateDoc(businessRef, { 
      status, 
      approved_at: status === 'approved' ? new Date().toISOString() : null 
    });
  },

  async batchApprove(ids: string[]) {
    const batch = writeBatch(db);
    ids.forEach(id => {
      const businessRef = doc(db, 'businesses', id);
      batch.update(businessRef, { 
        status: 'approved', 
        approved_at: new Date().toISOString() 
      });
    });
    await batch.commit();
  }
};

export const cleaningService = {
  repairText(text: string): string {
    if (!text) return '';
    try {
      return decodeURIComponent(escape(text));
    } catch (e) {
      return text;
    }
  },

  calculateScores(business: Partial<VerifiedBusiness>) {
    let vScore = 0;
    let cScore = 0;

    const hasName = !!(business.name_ar || business.name_ku || business.name_en);
    const hasLocation = !!(business.city);
    const hasPhone = !!business.phone;

    if (hasName) vScore = 1;
    if (hasName && hasLocation) vScore = 2;
    if (hasName && hasLocation && hasPhone) vScore = 3;

    if (hasName) cScore += 40;
    if (hasLocation) cScore += 30;
    if (hasPhone) cScore += 30;

    return { vScore, cScore };
  },

  async pushToRaw(records: any[]) {
    const batch = writeBatch(db);
    records.forEach(record => {
      const newDocRef = doc(collection(db, 'raw_businesses'));
      batch.set(newDocRef, record);
    });
    await batch.commit();
  }
};

export const taskService = {
  async getTasks() {
    const q = query(collection(db, 'agent_tasks'), orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AgentTask[];
  },

  async createTask(task: Partial<AgentTask>) {
    await addDoc(collection(db, 'agent_tasks'), {
      ...task,
      created_at: new Date().toISOString()
    });
  },

  async getLogs(taskId: string) {
    const q = query(
      collection(db, 'agent_logs'), 
      where('record_id', '==', taskId),
      orderBy('created_at', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};
