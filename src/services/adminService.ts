import { db } from './firebase.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import {
  TeamMember,
  TeamRole,
  TeamPermissions,
  ExamSessionDoc,
  ExamResultDoc,
  AdminLogDoc,
  SecurityLogDoc
} from '../types/admin.js';
import { MCQ } from '../types/quiz.js';

export const OWNER_EMAIL = 'masumbillahmmn2314@gmail.com';
export const ADMIN_PIN = '2429005267';

export const DEFAULT_SUPER_ADMIN_PERMISSIONS: TeamPermissions = {
  canAddQuestion: true,
  canEditQuestion: true,
  canDeleteQuestion: true,
  canBulkUpload: true,
  canViewUsers: true,
  canManageTeam: true,
  canViewLogs: true,
  canViewLiveExam: true,
  canViewLeaderboard: true
};

export const DEFAULT_ADMIN_PERMISSIONS: TeamPermissions = {
  canAddQuestion: true,
  canEditQuestion: true,
  canDeleteQuestion: true,
  canBulkUpload: true,
  canViewUsers: true,
  canManageTeam: false,
  canViewLogs: true,
  canViewLiveExam: true,
  canViewLeaderboard: true
};

export const DEFAULT_MODERATOR_PERMISSIONS: TeamPermissions = {
  canAddQuestion: true,
  canEditQuestion: true,
  canDeleteQuestion: false,
  canBulkUpload: false,
  canViewUsers: false,
  canManageTeam: false,
  canViewLogs: false,
  canViewLiveExam: true,
  canViewLeaderboard: true
};

/**
 * Layer 1: Check if email is in team_members or is primary owner.
 * Auto-bootstraps owner as super_admin if doc doesn't exist yet.
 */
export async function verifyTeamAccess(email: string, name?: string): Promise<TeamMember | null> {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();

  try {
    const memberRef = doc(db, 'team_members', cleanEmail);
    const snap = await getDoc(memberRef);

    if (snap.exists()) {
      const data = snap.data() as TeamMember;
      if (data.status === 'suspended') return null;
      return data;
    }

    // Auto-create owner as super_admin if not in team_members
    if (cleanEmail === OWNER_EMAIL) {
      const ownerMember: TeamMember = {
        email: cleanEmail,
        name: name || 'Masum Billah (Owner)',
        role: 'super_admin',
        addedBy: 'system',
        addedAt: new Date().toISOString(),
        status: 'active',
        permissions: DEFAULT_SUPER_ADMIN_PERMISSIONS
      };
      await setDoc(memberRef, ownerMember);
      await logAdminAction('AUTO_BOOTSTRAP_OWNER', cleanEmail, 'Auto created owner super_admin in team_members', 'super_admin');
      return ownerMember;
    }
  } catch (err: any) {
    console.warn('verifyTeamAccess Firestore query warning:', err?.message);
    // In case of initial Firestore rules transition, owner always has permission
    if (cleanEmail === OWNER_EMAIL) {
      return {
        email: cleanEmail,
        name: name || 'Masum Billah (Owner)',
        role: 'super_admin',
        addedBy: 'system',
        addedAt: new Date().toISOString(),
        status: 'active',
        permissions: DEFAULT_SUPER_ADMIN_PERMISSIONS
      };
    }
  }

  return null;
}

export async function getAllTeamMembers(): Promise<TeamMember[]> {
  try {
    const colRef = collection(db, 'team_members');
    const snap = await getDocs(colRef);
    const list: TeamMember[] = [];
    snap.forEach((d) => {
      list.push(d.data() as TeamMember);
    });

    // Ensure owner is included
    if (!list.some((m) => m.email.toLowerCase() === OWNER_EMAIL)) {
      list.unshift({
        email: OWNER_EMAIL,
        name: 'Masum Billah (Owner)',
        role: 'super_admin',
        addedBy: 'system',
        addedAt: new Date().toISOString(),
        status: 'active',
        permissions: DEFAULT_SUPER_ADMIN_PERMISSIONS
      });
    }

    return list;
  } catch (err) {
    return [
      {
        email: OWNER_EMAIL,
        name: 'Masum Billah (Owner)',
        role: 'super_admin',
        addedBy: 'system',
        addedAt: new Date().toISOString(),
        status: 'active',
        permissions: DEFAULT_SUPER_ADMIN_PERMISSIONS
      }
    ];
  }
}

export async function saveTeamMember(member: TeamMember, actorEmail: string): Promise<void> {
  const cleanEmail = member.email.trim().toLowerCase();
  const docRef = doc(db, 'team_members', cleanEmail);
  await setDoc(docRef, { ...member, email: cleanEmail }, { merge: true });
  await logAdminAction('SAVE_TEAM_MEMBER', actorEmail, `Updated team member ${cleanEmail} role to ${member.role}`);
}

export async function deleteTeamMember(email: string, actorEmail: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail === OWNER_EMAIL) {
    throw new Error('মূল সুপার অ্যাডমিন (Owner) অ্যাকাউন্ট ডিলিট করা সম্ভব নয়।');
  }
  const docRef = doc(db, 'team_members', cleanEmail);
  await deleteDoc(docRef);
  await logAdminAction('DELETE_TEAM_MEMBER', actorEmail, `Deleted team member ${cleanEmail}`);
}

/* ==================== AUDIT & SECURITY LOGS ==================== */

export async function logAdminAction(action: string, performedBy: string, details: string, userRole?: string): Promise<void> {
  try {
    const logId = `admin_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const logDoc: AdminLogDoc = {
      id: logId,
      action,
      performedBy,
      userRole,
      details,
      timestamp: new Date().toISOString()
    };
    await setDoc(doc(db, 'admin_logs', logId), logDoc);
  } catch (e) {
    console.warn('logAdminAction deferred:', e);
  }
}

export async function logSecurityEvent(event: string, attemptedBy: string, details: string): Promise<void> {
  try {
    const logId = `sec_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const logDoc: SecurityLogDoc = {
      id: logId,
      event,
      attemptedBy,
      details,
      timestamp: new Date().toISOString()
    };
    await setDoc(doc(db, 'security_logs', logId), logDoc);
  } catch (e) {
    console.warn('logSecurityEvent deferred:', e);
  }
}

export async function getAdminLogs(limitCount = 50): Promise<AdminLogDoc[]> {
  try {
    const q = query(collection(db, 'admin_logs'), orderBy('timestamp', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
    const list: AdminLogDoc[] = [];
    snap.forEach((d) => list.push(d.data() as AdminLogDoc));
    return list;
  } catch {
    return [];
  }
}

export async function getSecurityLogs(limitCount = 50): Promise<SecurityLogDoc[]> {
  try {
    const q = query(collection(db, 'security_logs'), orderBy('timestamp', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
    const list: SecurityLogDoc[] = [];
    snap.forEach((d) => list.push(d.data() as SecurityLogDoc));
    return list;
  } catch {
    return [];
  }
}

/* ==================== LIVE EXAM SESSIONS ==================== */

export async function createExamSession(session: ExamSessionDoc): Promise<void> {
  try {
    const docRef = doc(db, 'exam_sessions', session.sessionId);
    await setDoc(docRef, session);
  } catch (e) {
    console.warn('createExamSession error:', e);
  }
}

export async function updateExamSessionProgress(
  sessionId: string,
  answeredCount: number,
  progressPercent: number,
  answers: Record<string, number>,
  currentQuestionIndex?: number
): Promise<void> {
  try {
    const docRef = doc(db, 'exam_sessions', sessionId);
    const updates: Record<string, any> = {
      answeredCount,
      progressPercent,
      lastActiveTime: new Date().toISOString(),
      answers
    };
    if (currentQuestionIndex !== undefined) {
      updates.currentQuestionIndex = currentQuestionIndex;
    }
    await updateDoc(docRef, updates);
  } catch (e) {
    // Session progress update failure should not break user exam flow
  }
}

export async function finishExamSession(sessionId: string): Promise<void> {
  try {
    const docRef = doc(db, 'exam_sessions', sessionId);
    await updateDoc(docRef, {
      status: 'finished',
      lastActiveTime: new Date().toISOString()
    });
  } catch (e) {
    // Ignore
  }
}

export function subscribeLiveExamSessions(callback: (sessions: ExamSessionDoc[]) => void): () => void {
  try {
    const q = query(collection(db, 'exam_sessions'), where('status', '==', 'live'));
    return onSnapshot(
      q,
      (snapshot) => {
        const liveList: ExamSessionDoc[] = [];
        const now = Date.now();
        snapshot.forEach((d) => {
          const item = d.data() as ExamSessionDoc;
          // Only show sessions active in the last 2 hours
          const lastActive = item.lastActiveTime ? new Date(item.lastActiveTime).getTime() : 0;
          if (now - lastActive < 2 * 60 * 60 * 1000) {
            liveList.push(item);
          }
        });
        // Sort newest first
        liveList.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        callback(liveList);
      },
      (error) => {
        console.warn('subscribeLiveExamSessions snapshot error:', error);
        callback([]);
      }
    );
  } catch (e) {
    callback([]);
    return () => {};
  }
}

/* ==================== EXAM RESULTS & LEADERBOARD ==================== */

export async function recordExamResult(
  result: Omit<ExamResultDoc, 'id' | 'submittedAt'> & { id?: string; submittedAt?: string }
): Promise<{ resultId: string; rank: number }> {
  const resultId = result.id || `result_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const cleanResult: ExamResultDoc = {
    ...result,
    id: resultId,
    submittedAt: result.submittedAt || new Date().toISOString()
  };

  try {
    // 1. Save to exam_results collection
    const docRef = doc(db, 'exam_results', resultId);
    await setDoc(docRef, cleanResult);

    // 2. Query all results for same subject to calculate rank
    const q = query(
      collection(db, 'exam_results'),
      where('subject', '==', cleanResult.subject)
    );
    const snap = await getDocs(q);
    const subjectResults: ExamResultDoc[] = [];
    snap.forEach((d) => subjectResults.push(d.data() as ExamResultDoc));

    // Sort descending by score, ascending by timeTaken
    subjectResults.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timeTaken - b.timeTaken;
    });

    const rank = Math.max(1, subjectResults.findIndex((r) => r.id === resultId) + 1);
    await updateDoc(docRef, { rank });
    cleanResult.rank = rank;

    // Save locally to tfs_leaderboard_results for offline cache
    saveLocalResult(cleanResult);

    return { resultId, rank };
  } catch (e) {
    console.warn('recordExamResult Firestore failed, saving locally:', e);
    cleanResult.rank = 1;
    saveLocalResult(cleanResult);
    return { resultId, rank: 1 };
  }
}

function saveLocalResult(result: ExamResultDoc) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('tfs_cloud_results_v1');
    const list: ExamResultDoc[] = raw ? JSON.parse(raw) : [];
    if (!list.some((r) => r.id === result.id)) {
      list.unshift(result);
      localStorage.setItem('tfs_cloud_results_v1', JSON.stringify(list.slice(0, 500)));
    }
  } catch {}
}

export function subscribeExamResults(
  callback: (results: ExamResultDoc[]) => void,
  subjectFilter?: string
): () => void {
  try {
    let q = query(
      collection(db, 'exam_results'),
      orderBy('score', 'desc'),
      limit(200)
    );

    if (subjectFilter && subjectFilter !== 'all' && subjectFilter !== 'সকল') {
      q = query(
        collection(db, 'exam_results'),
        where('subject', '==', subjectFilter),
        limit(200)
      );
    }

    return onSnapshot(
      q,
      (snapshot) => {
        const results: ExamResultDoc[] = [];
        snapshot.forEach((d) => {
          results.push(d.data() as ExamResultDoc);
        });

        // Sort descending by score, ascending by timeTaken
        results.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.timeTaken - b.timeTaken;
        });

        // Assign ranks
        results.forEach((r, idx) => {
          r.rank = idx + 1;
        });

        if (results.length > 0) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('tfs_cloud_results_v1', JSON.stringify(results));
          }
        }
        callback(results);
      },
      (error) => {
        console.warn('subscribeExamResults snapshot error, loading fallback:', error);
        callback(getLocalResults(subjectFilter));
      }
    );
  } catch (e) {
    callback(getLocalResults(subjectFilter));
    return () => {};
  }
}

export function getLocalResults(subjectFilter?: string): ExamResultDoc[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('tfs_cloud_results_v1');
    if (!raw) return [];
    let list: ExamResultDoc[] = JSON.parse(raw);
    if (subjectFilter && subjectFilter !== 'all' && subjectFilter !== 'সকল') {
      list = list.filter((r) => r.subject === subjectFilter);
    }
    list.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timeTaken - b.timeTaken;
    });
    list.forEach((r, idx) => {
      r.rank = idx + 1;
    });
    return list;
  } catch {
    return [];
  }
}

export async function deleteExamResult(id: string, actorEmail: string): Promise<void> {
  const docRef = doc(db, 'exam_results', id);
  await deleteDoc(docRef);
  await logAdminAction('DELETE_EXAM_RESULT', actorEmail, `Deleted exam result record ${id}`);
}

/* ==================== QUESTIONS BANK (FIRESTORE) ==================== */

export async function getQuestionsFromFirestore(): Promise<MCQ[]> {
  try {
    const snap = await getDocs(collection(db, 'questions'));
    const list: MCQ[] = [];
    snap.forEach((d) => {
      list.push(d.data() as MCQ);
    });
    return list;
  } catch {
    return [];
  }
}

export async function addQuestionToFirestore(q: MCQ, actorEmail: string): Promise<void> {
  const qId = q.id || `q_fs_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const clean: MCQ = { ...q, id: qId };
  await setDoc(doc(db, 'questions', qId), clean);
  await logAdminAction('ADD_QUESTION', actorEmail, `Added question "${clean.question.slice(0, 40)}..." for ${clean.subject}`);
}

export async function updateQuestionInFirestore(q: MCQ, actorEmail: string): Promise<void> {
  await setDoc(doc(db, 'questions', q.id), q, { merge: true });
  await logAdminAction('UPDATE_QUESTION', actorEmail, `Updated question ${q.id} in ${q.subject}`);
}

export async function deleteQuestionFromFirestore(id: string, actorEmail: string): Promise<void> {
  await deleteDoc(doc(db, 'questions', id));
  await logAdminAction('DELETE_QUESTION', actorEmail, `Deleted question ID ${id}`);
}

export async function bulkUploadQuestions(
  questionsList: MCQ[],
  actorEmail: string
): Promise<{ successCount: number; errors: string[] }> {
  let successCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < questionsList.length; i++) {
    const q = questionsList[i];
    try {
      if (!q.question || !q.options || q.options.length < 4 || q.correctIndex === undefined) {
        errors.push(`Row ${i + 1}: Invalid format or missing options/answer`);
        continue;
      }
      const qId = q.id || `q_bulk_${Date.now()}_${i}`;
      await setDoc(doc(db, 'questions', qId), { ...q, id: qId });
      successCount++;
    } catch (err: any) {
      errors.push(`Row ${i + 1}: ${err?.message || 'Upload error'}`);
    }
  }

  await logAdminAction(
    'BULK_UPLOAD_QUESTIONS',
    actorEmail,
    `Uploaded ${successCount}/${questionsList.length} questions. Errors: ${errors.length}`
  );

  return { successCount, errors };
}
