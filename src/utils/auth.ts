import { AuthUser, AuthSession } from '../types/auth.js';
import { ExamResult } from '../types/quiz.js';
import {
  auth,
  db,
  googleProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut
} from '../services/firebase.js';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const TFS_USERS_KEY = 'tfs_users';
const USERS_STORAGE_KEY = 'tfs_registered_users_v1';
const SESSION_STORAGE_KEY = 'tfs_auth_session_v1';

export function hashPassword(plain: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(`TFS_SALT_${plain}_SECURE`);
  }
  return plain;
}

export function verifyPassword(plain: string, hash: string): boolean {
  return hashPassword(plain) === hash;
}

export function getRegisteredUsers(): AuthUser[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TFS_USERS_KEY) || localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    return [];
  }
}

export function saveRegisteredUsers(users: AuthUser[]): void {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(users);
    localStorage.setItem(TFS_USERS_KEY, serialized);
    localStorage.setItem(USERS_STORAGE_KEY, serialized);
    window.dispatchEvent(new Event('tfs_leaderboard_updated'));
  } catch (e) {
    console.error('Error saving registered users:', e);
  }
}

export function updateUserExamStats(
  identifier: string,
  stats: {
    totalXP: number;
    level: number;
    totalExams: number;
    totalCorrect: number;
    totalAttempted: number;
    school?: string;
    avatar?: string;
    latestExam?: ExamResult;
  }
): void {
  const users = getRegisteredUsers();
  const normalized = identifier.trim().toLowerCase();
  let updated = false;

  const newUsers = users.map((u) => {
    if (u.id === identifier || u.email.toLowerCase() === normalized || u.name.toLowerCase() === normalized) {
      updated = true;
      const history = [...(u.examHistory || [])];
      if (stats.latestExam && !history.some((h) => h.id === stats.latestExam?.id)) {
        history.unshift(stats.latestExam);
      }
      return {
        ...u,
        totalXP: stats.totalXP,
        level: stats.level,
        totalExams: stats.totalExams,
        totalCorrect: stats.totalCorrect,
        totalAttempted: stats.totalAttempted,
        school: stats.school || u.school,
        avatar: stats.avatar || u.avatar,
        examHistory: history
      };
    }
    return u;
  });

  if (updated) {
    saveRegisteredUsers(newUsers);

    // Also async update in Firestore if user is authenticated
    if (auth.currentUser) {
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        setDoc(
          userDocRef,
          {
            totalXP: stats.totalXP,
            level: stats.level,
            totalExams: stats.totalExams,
            totalCorrect: stats.totalCorrect,
            totalAttempted: stats.totalAttempted,
            school: stats.school || '',
            avatar: stats.avatar || ''
          },
          { merge: true }
        ).catch((err) => console.warn('Firestore user update deferred:', err));
      } catch (err) {
        // Ignored in offline
      }
    }
  }
}

/**
 * Real Firebase Registration with Real Email Verification sent to Gmail
 */
export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  studentClass: '9' | '10';
  school?: string;
  phoneNumber?: string;
}): Promise<{ success: boolean; message: string; user?: AuthUser; emailSent?: boolean }> {
  const normalizedEmail = data.email.trim().toLowerCase();
  if (!normalizedEmail.includes('@') || !normalizedEmail.includes('.')) {
    return { success: false, message: 'অনুগ্রহ করে একটি সঠিক ইমেইল এড্রেস লিখুন।' };
  }

  try {
    // 1. Create real Firebase user
    const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, data.password);
    const fbUser = userCredential.user;

    // 2. Send REAL verification email to Gmail inbox
    await sendEmailVerification(fbUser);

    const newUser: AuthUser = {
      id: fbUser.uid,
      name: data.name.trim(),
      email: normalizedEmail,
      phoneNumber: data.phoneNumber,
      passwordHash: hashPassword(data.password),
      studentClass: data.studentClass,
      school: data.school?.trim() || 'বাংলাদেশ মাধ্যমিক বিদ্যালয়',
      district: 'ঢাকা',
      isVerified: fbUser.emailVerified,
      createdAt: new Date().toISOString(),
      totalXP: 0,
      level: 0,
      totalExams: 0,
      totalCorrect: 0,
      totalAttempted: 0,
      avatar: '',
      examHistory: []
    };

    // Save in Firestore
    try {
      await setDoc(doc(db, 'users', fbUser.uid), newUser);
    } catch (e) {
      console.warn('Firestore write warning:', e);
    }

    const users = getRegisteredUsers();
    users.push(newUser);
    saveRegisteredUsers(users);
    createSession(newUser);

    return {
      success: true,
      message: `আপনার Gmail (${normalizedEmail}) এ ভেরিফিকেশন লিংক পাঠানো হয়েছে! অনুগ্রহ করে ইনবক্স বা স্প্যাম ফোল্ডার চেক করে লিংকে ক্লিক করুন।`,
      user: newUser,
      emailSent: true
    };
  } catch (error: any) {
    console.error('Firebase Register Error:', error);
    let msg = error.message || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।';
    if (error.code === 'auth/email-already-in-use') {
      msg = 'এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা আছে। অনুগ্রহ করে লগইন করুন।';
    } else if (error.code === 'auth/weak-password') {
      msg = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।';
    } else if (error.code === 'auth/invalid-email') {
      msg = 'ইমেইল এড্রেসটি সঠিক নয়।';
    }
    return { success: false, message: msg };
  }
}

/**
 * Real Firebase Email/Password Login
 */
export async function loginUser(
  email: string,
  plainPass: string
): Promise<{ success: boolean; message: string; user?: AuthUser; needsVerification?: boolean }> {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, plainPass);
    const fbUser = userCredential.user;

    // Fetch user document from Firestore or local
    let appUser: AuthUser | null = null;
    try {
      const snap = await getDoc(doc(db, 'users', fbUser.uid));
      if (snap.exists()) {
        appUser = snap.data() as AuthUser;
      }
    } catch (e) {
      // fallback
    }

    if (!appUser) {
      const localUsers = getRegisteredUsers();
      appUser = localUsers.find((u) => u.id === fbUser.uid || u.email === normalizedEmail) || {
        id: fbUser.uid,
        name: fbUser.displayName || 'শিক্ষার্থী',
        email: normalizedEmail,
        passwordHash: hashPassword(plainPass),
        studentClass: '10',
        school: 'বাংলাদেশ মাধ্যমিক বিদ্যালয়',
        district: 'ঢাকা',
        isVerified: fbUser.emailVerified,
        createdAt: new Date().toISOString(),
        totalXP: 0,
        level: 0,
        totalExams: 0,
        totalCorrect: 0,
        totalAttempted: 0,
        avatar: '',
        examHistory: []
      };
    }

    appUser.isVerified = fbUser.emailVerified;
    createSession(appUser);

    if (!fbUser.emailVerified) {
      return {
        success: true,
        message: 'লগইন সফল, তবে আপনার Gmail অ্যাকাউন্টটি এখনও ভেরিফাই করা হয়নি। ভেরিফিকেশন লিংকের জন্য ইনবক্স চেক করুন।',
        user: appUser,
        needsVerification: true
      };
    }

    return { success: true, message: 'সফলভাবে লগইন সম্পন্ন হয়েছে!', user: appUser };
  } catch (error: any) {
    console.error('Firebase Login Error:', error);
    let msg = 'লগইন ব্যর্থ হয়েছে।';
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      msg = 'ইমেইল বা পাসওয়ার্ড সঠিক নয়। রেজিস্টার করুন অথবা সঠিক তথ্য দিন।';
    } else if (error.code === 'auth/wrong-password') {
      msg = 'পাসওয়ার্ড সঠিক নয়! আবার চেষ্টা করুন।';
    } else if (error.code === 'auth/too-many-requests') {
      msg = 'অনেকবার ভুল চেষ্টা করা হয়েছে। নিরাপত্তা কারণে ৫ মিনিট পর চেষ্টা করুন।';
    }
    return { success: false, message: msg };
  }
}

/**
 * Resend Real Verification Email to Gmail
 */
export async function resendVerificationEmail(): Promise<{ success: boolean; message: string }> {
  try {
    if (!auth.currentUser) {
      return { success: false, message: 'লগইন করা ব্যবহারকারী পাওয়া যায়নি।' };
    }
    await sendEmailVerification(auth.currentUser);
    return {
      success: true,
      message: `আপনার Gmail (${auth.currentUser.email}) এ নতুন ভেরিফিকেশন লিংক পাঠানো হয়েছে!`
    };
  } catch (error: any) {
    if (error.code === 'auth/too-many-requests') {
      return { success: false, message: 'একটু অপেক্ষা করে পুনরায় চেষ্টা করুন।' };
    }
    return { success: false, message: error.message || 'ভেরিফিকেশন ইমেইল পাঠানো যায়নি।' };
  }
}

/**
 * Helper to normalize and synchronize Google user profile into Firestore and local store
 */
export async function syncGoogleUserData(fbUser: any): Promise<AuthUser | null> {
  if (!fbUser || !fbUser.email) return null;

  const realEmail = fbUser.email.trim().toLowerCase();
  const realName = fbUser.displayName?.trim() || realEmail.split('@')[0] || 'গুগল শিক্ষার্থী';
  const realPhoto = fbUser.photoURL || '';

  let appUser: AuthUser | null = null;
  try {
    const snap = await getDoc(doc(db, 'users', fbUser.uid));
    if (snap.exists()) {
      appUser = snap.data() as AuthUser;
    }
  } catch (e) {
    // Ignored
  }

  if (!appUser) {
    const localUsers = getRegisteredUsers();
    const existingLocal = localUsers.find((u) => u.email.toLowerCase() === realEmail);

    appUser = {
      id: fbUser.uid,
      name: realName,
      email: realEmail,
      phoneNumber: fbUser.phoneNumber || existingLocal?.phoneNumber || undefined,
      passwordHash: hashPassword('google_oauth_authorized'),
      studentClass: existingLocal?.studentClass || '10',
      school: existingLocal?.school || 'গুগল ভেরিফাইড শিক্ষার্থী',
      district: existingLocal?.district || 'ঢাকা',
      isVerified: true,
      createdAt: existingLocal?.createdAt || new Date().toISOString(),
      totalXP: existingLocal?.totalXP || 0,
      level: existingLocal?.level || 0,
      totalExams: existingLocal?.totalExams || 0,
      totalCorrect: existingLocal?.totalCorrect || 0,
      totalAttempted: existingLocal?.totalAttempted || 0,
      avatar: realPhoto || existingLocal?.avatar || '',
      examHistory: existingLocal?.examHistory || []
    };

    try {
      await setDoc(doc(db, 'users', fbUser.uid), appUser);
    } catch (e) {
      // Ignored
    }
  } else {
    let changed = false;
    if (realPhoto && (!appUser.avatar || appUser.avatar !== realPhoto)) {
      appUser.avatar = realPhoto;
      changed = true;
    }
    if (realName && (!appUser.name || appUser.name === 'শিক্ষার্থী')) {
      appUser.name = realName;
      changed = true;
    }
    appUser.isVerified = true;

    if (changed) {
      try {
        await setDoc(doc(db, 'users', fbUser.uid), appUser, { merge: true });
      } catch (e) {
        // Ignored
      }
    }
  }

  const users = getRegisteredUsers();
  const existingIndex = users.findIndex((u) => u.id === appUser!.id || u.email.toLowerCase() === realEmail);
  if (existingIndex >= 0) {
    users[existingIndex] = { ...users[existingIndex], ...appUser };
  } else {
    users.push(appUser);
  }
  saveRegisteredUsers(users);

  createSession(appUser);
  return appUser;
}

/**
 * Real Single-Click Google Authentication via Firebase with automatic redirect fallback
 */
export async function loginWithGoogle(): Promise<{
  success: boolean;
  message: string;
  user?: AuthUser;
  isPopupBlocked?: boolean;
  isRedirecting?: boolean;
}> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const appUser = await syncGoogleUserData(result.user);
    if (!appUser) {
      return { success: false, message: 'Google একাউন্ট থেকে ইমেইল এড্রেস পাওয়া যায়নি।' };
    }
    return { success: true, message: 'গুগল অ্যাকাউন্টের মাধ্যমে সফলভাবে লগইন সম্পন্ন হয়েছে!', user: appUser };
  } catch (error: any) {
    if (
      error.code === 'auth/popup-blocked' ||
      error.code === 'auth/popup-closed-by-user' ||
      error.code === 'auth/cancelled-popup-request'
    ) {
      // Auto fallback to redirect
      console.log('Popup blocked, trying redirect...', error.code);
      try {
        await signInWithRedirect(auth, googleProvider);
        return {
          success: true,
          message: 'পপ-আপের পরিবর্তে Google লগইন পেজে রিডাইরেক্ট করা হচ্ছে...',
          isRedirecting: true
        };
      } catch (redirectError: any) {
        console.warn('Redirect sign-in fallback also encountered:', redirectError);
        return {
          success: false,
          message: 'ব্রাউজার বা আইফ্রেমের কারণে গুগল পপ-আপ ব্লক হয়েছে। অ্যাড্রেস বারে Pop-up Allowed করুন অথবা নতুন ট্যাবে অ্যাপটি খুলুন।',
          isPopupBlocked: true
        };
      }
    }

    if (error.code === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'current-domain';
      return {
        success: false,
        message: `Domain not authorized in Firebase Console (${currentHost})। Firebase Console > Authentication > Settings > Authorized domains এ "${currentHost}" যুক্ত করুন।`
      };
    }

    if (error.code === 'auth/operation-not-allowed') {
      return {
        success: false,
        message: 'Firebase Console এ Google Sign-in মেথড সক্রিয় করা নেই।'
      };
    }

    console.warn('Google Sign-in notice:', error.code || error.message);
    return { success: false, message: error.message || 'গুগল দিয়ে লগইন করতে সমস্যা হয়েছে।' };
  }
}

/**
 * Instant Demo Student Login (bypasses OAuth domain authorization hurdles during preview/demo)
 */
export function loginAsDemoStudent(customName?: string): AuthUser {
  const demoId = `demo_${Date.now()}`;
  const demoUser: AuthUser = {
    id: demoId,
    name: customName || 'বিজ্ঞান শিক্ষার্থী',
    email: 'student.demo@tfs.edu.bd',
    passwordHash: hashPassword('tfs_demo_student'),
    studentClass: '10',
    school: 'বাংলাদেশ মাধ্যমিক বিজ্ঞান বিদ্যালয়',
    district: 'ঢাকা',
    isVerified: true,
    createdAt: new Date().toISOString(),
    totalXP: 140,
    level: 1,
    totalExams: 2,
    totalCorrect: 14,
    totalAttempted: 16,
    avatar: '',
    examHistory: []
  };

  const users = getRegisteredUsers();
  users.push(demoUser);
  saveRegisteredUsers(users);
  createSession(demoUser);
  return demoUser;
}

/**
 * Checks if user is returning from a Google signInWithRedirect flow
 */
export async function checkRedirectResult(): Promise<AuthUser | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      return await syncGoogleUserData(result.user);
    }
  } catch (e) {
    // Ignored in non-redirect flow
  }
  return null;
}

/**
 * Direct Google redirect flow
 */
export async function loginWithGoogleRedirect(): Promise<void> {
  await signInWithRedirect(auth, googleProvider);
}



/**
 * Real Firebase Password Reset Email
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  try {
    await sendPasswordResetEmail(auth, normalizedEmail);
    return {
      success: true,
      message: `আপনার Gmail (${normalizedEmail}) এ আসল পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে! অনুগ্রহ করে ইনবক্স চেক করুন।`
    };
  } catch (error: any) {
    console.error('Firebase Password Reset error:', error);
    let msg = 'পাসওয়ার্ড রিসেট ইমেইল পাঠানো যায়নি।';
    if (error.code === 'auth/user-not-found') {
      msg = 'এই ইমেইলে কোনো অ্যাকাউন্ট খুঁজে পাওয়া যায়নি।';
    } else if (error.code === 'auth/invalid-email') {
      msg = 'সঠিক ইমেইল এড্রেস লিখুন।';
    }
    return { success: false, message: msg };
  }
}

export function createSession(user: AuthUser): AuthSession {
  const session: AuthSession = {
    token: `tfs_jwt_${user.id}_${Date.now()}`,
    userId: user.id,
    email: user.email,
    name: user.name,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }
  return session;
}

export function getActiveSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (Date.now() > session.expiresAt || session.userId === 'user_tfs_demo') {
      logoutUser();
      return null;
    }
    return session;
  } catch (e) {
    return null;
  }
}

export function getCurrentUser(): AuthUser | null {
  const session = getActiveSession();
  if (!session) return null;
  const users = getRegisteredUsers();
  return users.find((u) => u.id === session.userId) || null;
}

export function logoutUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_STORAGE_KEY);
  signOut(auth).catch(() => {});
}

export function clearAllUsersForFreshStart() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TFS_USERS_KEY);
    localStorage.removeItem(USERS_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}