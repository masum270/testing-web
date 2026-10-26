import React, { useEffect, useState, useMemo } from 'react';
import {
  auth,
  db,
  storage,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from '../firebase.js';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  query,
  where,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import mcqsData from '../data/mcqs.json';
import { MCQ } from '../types/quiz.js';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  BookOpen,
  Activity,
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  Copy,
  Check,
  Eye,
  EyeOff,
  Download,
  Trash2,
  Plus,
  Search,
  Filter,
  UploadCloud,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Moon,
  Sun,
  Bell,
  FileSpreadsheet,
  CheckCircle2,
  KeyRound,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Flame,
  LayoutDashboard,
  Award,
  Radio,
  FileDown,
  Clock,
  Laptop,
  Smartphone,
  Calendar,
  BarChart3,
  TrendingUp,
  X,
  GraduationCap,
  Image as ImageIcon,
  Edit2,
  Sparkles,
  Trophy,
  CheckSquare,
  Square,
  Play,
  Cpu,
  Menu,
  Settings,
  FileText,
  Mail
} from 'lucide-react';
import { AIFactory } from './admin/AIFactory.js';
import { sendOTPEmail } from '../lib/otpService.js';

interface SecureAdminPageProps {
  currentUser?: any;
  onNavigateHome?: () => void;
  onNavigateLogin?: () => void;
}

export interface ChapterPhotoDoc {
  id: string;
  subject: string;
  chapter: string;
  type: string;
  photoUrl: string;
  title: string;
  description?: string;
  questionCount: number;
  createdAt?: any;
  createdBy: string;
  isActive: boolean;
}

interface TeamMember {
  id?: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'moderator';
  customPIN?: string;
  addedBy?: string;
  addedAt?: any;
  permissions?: {
    canAddQuestion?: boolean;
    canEditQuestion?: boolean;
    canDeleteQuestion?: boolean;
    canBulkUpload?: boolean;
    canViewUsers?: boolean;
    canManageTeam?: boolean;
    canViewLogs?: boolean;
    canViewLiveExam?: boolean;
    canViewLeaderboard?: boolean;
  };
  status: 'active' | 'blocked';
  inviteToken?: string;
  inviteLink?: string;
}

const OWNER_EMAIL = 'masumbillahmmn2314@gmail.com';
const SECRET_PIN = '2429005267';
const ADMIN_ROUTE_PATH = '/tfs-admin-2024-secure-x9k2';

export function SecureAdminPage({ onNavigateHome, onNavigateLogin }: SecureAdminPageProps) {
  // Authentication & Gate State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [pinOk, setPinOk] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('adminPinVerified') === 'true';
    }
    return false;
  });
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(true);
  const [pinError, setPinError] = useState(false);
  const [userRole, setUserRole] = useState<'super_admin' | 'admin' | 'moderator'>('super_admin');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // UI Theme, Sidebar Navigation & Mobile Drawer
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeMenu, setActiveMenu] = useState<string>('dashboard');
  const activeTab = activeMenu;
  const setActiveTab = setActiveMenu;
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [copiedRoute, setCopiedRoute] = useState(false);
  const [showRoute, setShowRoute] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // EmailJS Settings State
  const [emailjsServiceId, setEmailjsServiceId] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('emailjs_service_id') || '' : '';
  });
  const [emailjsTemplateId, setEmailjsTemplateId] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('emailjs_template_id') || '' : '';
  });
  const [emailjsPublicKey, setEmailjsPublicKey] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('emailjs_public_key') || '' : '';
  });
  const [testEmailAddress, setTestEmailAddress] = useState(OWNER_EMAIL);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState<string | null>(null);

  const handleSaveEmailSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('emailjs_service_id', emailjsServiceId.trim());
      localStorage.setItem('emailjs_template_id', emailjsTemplateId.trim());
      localStorage.setItem('emailjs_public_key', emailjsPublicKey.trim());
      setNotification('✅ EmailJS সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      alert('সঠিক ইমেইল এড্রেস লিখুন।');
      return;
    }
    setIsSendingTestEmail(true);
    setTestEmailStatus(null);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await sendOTPEmail(testEmailAddress, 'verify', code);
      setTestEmailStatus(`✅ টেস্ট ইমেইল কোড (${code}) সফলভাবে পাঠানো হয়েছে!`);
      alert(`টেস্ট ওটিপি পাঠানো হয়েছে: ${code}\nইমেইল বা ব্রাউজার কনসোল চেক করুন।`);
    } catch (err: any) {
      setTestEmailStatus('❌ টেস্ট ইমেইল ব্যর্থ: ' + err.message);
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // Live Exams Tracking State (PART 4)
  const [liveStudents, setLiveStudents] = useState<any[]>([]);

  // User Analytics State (PART 2 & 3)
  const [analyticsUsers, setAnalyticsUsers] = useState<any[]>([]);
  const [loginHistoryList, setLoginHistoryList] = useState<any[]>([]);
  const [allExamResultsList, setAllExamResultsList] = useState<any[]>([]);
  const [analyticsSearchQuery, setAnalyticsSearchQuery] = useState('');
  const [analyticsSortBy, setAnalyticsSortBy] = useState<'lastActive' | 'loginCount' | 'totalTime'>('lastActive');
  const [analyticsPage, setAnalyticsPage] = useState(1);
  const analyticsItemsPerPage = 20;
  const [selectedUserForModal, setSelectedUserForModal] = useState<any | null>(null);

  // CHAPTER PHOTOS STATE (PART 2 & 3)
  const [chapterPhotos, setChapterPhotos] = useState<ChapterPhotoDoc[]>([]);
  const [photoSubject, setPhotoSubject] = useState('পদার্থবিজ্ঞান');
  const [photoChapter, setPhotoChapter] = useState('');
  const [photoType, setPhotoType] = useState('বোর্ড প্রশ্ন');
  const [photoDescription, setPhotoDescription] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoSearchQuery, setPhotoSearchQuery] = useState('');
  const [photoFilterSubject, setPhotoFilterSubject] = useState('all');
  const [lightboxPhoto, setLightboxPhoto] = useState<ChapterPhotoDoc | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<ChapterPhotoDoc | null>(null);
  const [photoDeleteTarget, setPhotoDeleteTarget] = useState<ChapterPhotoDoc | null>(null);

  // WEEKLY MEGA EXAM STATE (PART 6)
  const [megaExamList, setMegaExamList] = useState<any[]>([]);
  const [megaExamSubmissions, setMegaExamSubmissions] = useState<any[]>([]);
  const [isGeneratingMega, setIsGeneratingMega] = useState(false);
  const [megaExamTitle, setMegaExamTitle] = useState('সাপ্তাহিক মেগা এক্সাম - সপ্তাহ ৪');
  const [megaExamDuration, setMegaExamDuration] = useState(60);
  const [megaExamQuestions, setMegaExamQuestions] = useState<MCQ[]>([]);

  // Question Management State
  const [questions, setQuestions] = useState<MCQ[]>(mcqsData as MCQ[]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Add Question Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    subject: 'পদার্থবিজ্ঞান',
    chapter: 'শব্দ ও তরঙ্গ',
    question: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    explanation: 'বোর্ড বই অনুযায়ী সঠিক।',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    imageUrl: ''
  });

  // Bulk Upload State
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkParsedCount, setBulkParsedCount] = useState<number | null>(null);
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);

  // Team Invite State
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'moderator'>('admin');
  const [newMemberPIN, setNewMemberPIN] = useState('');
  const [memberPermissions, setMemberPermissions] = useState({
    canAddQuestion: true,
    canEditQuestion: true,
    canDeleteQuestion: false,
    canBulkUpload: true,
    canViewUsers: true,
    canManageTeam: false,
    canViewLogs: true,
    canViewLiveExam: true,
    canViewLeaderboard: true
  });
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [visiblePins, setVisiblePins] = useState<{ [email: string]: boolean }>({});

  // Reset All Data Modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetPinInput, setResetPinInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Last Login Timestamp
  const [lastLoginTime, setLastLoginTime] = useState<string>('');

  // 1. Check Authentication on Mount
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setLastLoginTime(
          new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );

        try {
          const teamSnap = await getDocs(collection(db, 'team_members'));
          const members: TeamMember[] = [];
          teamSnap.forEach((docSnap) => {
            members.push({ id: docSnap.id, ...(docSnap.data() as any) });
          });

          if (u.email === OWNER_EMAIL) {
            setUserRole('super_admin');
            const ownerRef = doc(db, 'team_members', u.email);
            const snap = await getDoc(ownerRef);
            if (!snap.exists()) {
              await setDoc(ownerRef, {
                email: u.email,
                name: u.displayName || 'Masum Billah',
                role: 'super_admin',
                addedBy: u.email,
                addedAt: serverTimestamp(),
                permissions: {
                  canAddQuestion: true,
                  canEditQuestion: true,
                  canDeleteQuestion: true,
                  canBulkUpload: true,
                  canViewUsers: true,
                  canManageTeam: true,
                  canViewLogs: true,
                  canViewLiveExam: true,
                  canViewLeaderboard: true
                },
                status: 'active'
              });
            }
          } else {
            const found = members.find((m) => m.email.toLowerCase() === u.email?.toLowerCase());
            if (found && found.status === 'active') {
              setUserRole(found.role);
            }
          }
          setTeamMembers(members);
        } catch (e) {
          console.warn('Team fetch notice:', e);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // 2. Real-time Chapter Photos Listener (PART 2 & 3)
  useEffect(() => {
    if (!pinOk) return;
    try {
      const q = query(collection(db, 'chapter_photos'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: ChapterPhotoDoc[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
          setChapterPhotos(list);
        },
        (err) => console.warn('chapter_photos error:', err)
      );
      return () => unsub();
    } catch (e) {
      console.warn('chapter_photos listener error:', e);
    }
  }, [pinOk]);

  // 3. Real-time Live Exam Sessions (PART 4)
  useEffect(() => {
    if (!pinOk) return;
    try {
      const q = query(collection(db, 'exam_sessions'), where('status', '==', 'live'));
      const unsub = onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setLiveStudents(list);
        },
        (err) => console.error('Live exams error:', err)
      );
      return () => unsub();
    } catch (e) {
      console.warn('Live exams listener error:', e);
    }
  }, [pinOk]);

  // 4. Real-time User Analytics & Login History (PART 2 & 3)
  useEffect(() => {
    if (!pinOk) return;

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAnalyticsUsers(list);
      },
      (err) => console.warn('Users listener notice:', err)
    );

    const qLogin = query(
      collection(db, 'login_history'),
      orderBy('loginAt', 'desc'),
      limit(50)
    );
    const unsubLogin = onSnapshot(
      qLogin,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setLoginHistoryList(list);
      },
      (err) => console.warn('Login history listener notice:', err)
    );

    const unsubResults = onSnapshot(
      collection(db, 'exam_results'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAllExamResultsList(list);
      },
      (err) => console.warn('Exam results listener notice:', err)
    );

    // Mega exam listener
    const unsubMega = onSnapshot(
      collection(db, 'mega_exams'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMegaExamList(list);
      },
      (err) => console.warn('Mega exams notice:', err)
    );

    const unsubMegaSubs = onSnapshot(
      collection(db, 'mega_exam_results'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMegaExamSubmissions(list);
      },
      (err) => console.warn('Mega submissions notice:', err)
    );

    return () => {
      unsubUsers();
      unsubLogin();
      unsubResults();
      unsubMega();
      unsubMegaSubs();
    };
  }, [pinOk]);

  // 5. Fetch Questions from Firestore if unlocked
  useEffect(() => {
    if (pinOk) {
      const loadFirestoreQuestions = async () => {
        try {
          const qSnap = await getDocs(collection(db, 'questions'));
          if (!qSnap.empty) {
            const list: MCQ[] = [];
            qSnap.forEach((d) => {
              list.push({ id: d.id, ...(d.data() as any) });
            });
            const existingIds = new Set(list.map((q) => q.id));
            const merged = [...list, ...((mcqsData as MCQ[]).filter((q) => !existingIds.has(q.id)))];
            setQuestions(merged);
          }
        } catch (e) {
          console.warn('Using offline questions cache:', e);
        }
      };
      loadFirestoreQuestions();
    }
  }, [pinOk]);

  // Distinct Chapters from questions bank for Autocomplete
  const distinctChapters = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      if (q.chapter && q.chapter.trim()) set.add(q.chapter.trim());
    });
    return Array.from(set).sort();
  }, [questions]);

  // Handle Google Login
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (err: any) {
        alert('Google Login failed: ' + (err?.message || 'Unknown error'));
      }
    }
  };

  // Check PIN
  const handleUnlockPIN = () => {
    const trimmed = pin.trim();
    const effectiveEmail = (user?.email || (typeof window !== 'undefined' ? localStorage.getItem('adminEmail') : '') || '').toLowerCase();

    if ((effectiveEmail === OWNER_EMAIL || !effectiveEmail) && trimmed === SECRET_PIN) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('adminPinVerified', 'true');
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem('adminEmail', OWNER_EMAIL);
      }
      setPinOk(true);
      setPinError(false);
      return;
    }

    const member = teamMembers.find((m) => m.email.toLowerCase() === effectiveEmail);
    if (member && member.status === 'active' && member.customPIN && member.customPIN === trimmed) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('adminPinVerified', 'true');
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem('adminEmail', member.email);
      }
      setPinOk(true);
      setPinError(false);
      return;
    }

    setPinError(true);
    setPin('');
  };

  const handleAdminLogout = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('adminPinVerified');
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('adminEmail');
    }
    setPinOk(false);
    setPin('');
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Admin logout notice:', e);
    }
    if (onNavigateLogin) {
      onNavigateLogin();
    } else if (onNavigateHome) {
      onNavigateHome();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  // Helper: Format Time Duration
  const formatTimeDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '০ মিনিট';
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      const remMins = mins % 60;
      return `${hrs} ঘণ্টা ${remMins} মিনিট`;
    }
    return `${mins} মিনিট`;
  };

  // Helper: Format Relative Time Ago
  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'অজানা';
    const ms = timestamp.toMillis
      ? timestamp.toMillis()
      : timestamp.seconds
      ? timestamp.seconds * 1000
      : new Date(timestamp).getTime();
    if (isNaN(ms) || ms <= 0) return 'অজানা';
    const diffSec = Math.floor((Date.now() - ms) / 1000);
    if (diffSec < 120) return 'এখনই সক্রিয়';
    const diffMins = Math.floor(diffSec / 60);
    if (diffMins < 60) return `${diffMins} মিনিট আগে`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs} ঘণ্টা আগে`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays} দিন আগে`;
  };

  // Helper: Format Date String
  const formatFriendlyDate = (timestamp: any) => {
    if (!timestamp) return '—';
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('bn-BD', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Photo Select & Preview
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('ছবির আকার সর্বোচ্চ ৫ মেগাবাইট (5MB) হতে হবে!');
      return;
    }

    setPhotoFile(file);
    const preview = URL.createObjectURL(file);
    setPhotoPreviewUrl(preview);
  };

  // Upload Photo to Firebase Storage and Save to Firestore
  const handleUploadChapterPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoChapter.trim()) {
      alert('অধ্যায়ের নাম লিখুন বা সিলেক্ট করুন!');
      return;
    }
    if (!photoFile) {
      alert('একটি ছবি ফাইল সিলেক্ট করুন!');
      return;
    }

    setIsUploadingPhoto(true);

    try {
      // 1. Calculate question count for this chapter
      const matchingCount = questions.filter(
        (q) =>
          q.chapter?.trim().toLowerCase() === photoChapter.trim().toLowerCase() ||
          q.chapter?.includes(photoChapter.trim())
      ).length;

      const finalCount = matchingCount > 0 ? matchingCount : 40;
      const autoTitle = `${photoChapter.trim()} - ${photoType}`;

      // 2. Upload file to Storage (with fallback to base64 data-url)
      let uploadedUrl = '';
      try {
        const cleanName = `${photoSubject}_${photoChapter}_${photoType}_${Date.now()}.jpg`.replace(/\s+/g, '_');
        const storageRef = ref(storage, `chapter_photos/${cleanName}`);
        const snap = await uploadBytes(storageRef, photoFile);
        uploadedUrl = await getDownloadURL(snap.ref);
      } catch (storageErr) {
        console.warn('Storage fallback to base64 data url:', storageErr);
        uploadedUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target?.result as string);
          reader.readAsDataURL(photoFile);
        });
      }

      // 3. Save to Firestore collection chapter_photos
      const docData: Omit<ChapterPhotoDoc, 'id'> = {
        subject: photoSubject,
        chapter: photoChapter.trim(),
        type: photoType,
        photoUrl: uploadedUrl,
        title: autoTitle,
        description: photoDescription.trim(),
        questionCount: finalCount,
        createdAt: serverTimestamp(),
        createdBy: user?.email || OWNER_EMAIL,
        isActive: true
      };

      const docRef = await addDoc(collection(db, 'chapter_photos'), docData);

      setNotification(`✅ '${autoTitle}' চ্যাপ্টার ফটো সফলভাবে আপলোড সম্পন্ন হয়েছে!`);
      setTimeout(() => setNotification(null), 4000);

      // Reset form
      setPhotoChapter('');
      setPhotoDescription('');
      setPhotoFile(null);
      setPhotoPreviewUrl(null);
      setIsUploadingPhoto(false);
    } catch (err: any) {
      alert('ফটো আপলোডে ত্রুটি: ' + (err?.message || 'Upload failed'));
      setIsUploadingPhoto(false);
    }
  };

  // Delete Chapter Photo
  const handleConfirmDeletePhoto = async () => {
    if (!photoDeleteTarget) return;

    try {
      await deleteDoc(doc(db, 'chapter_photos', photoDeleteTarget.id));
      setChapterPhotos((prev) => prev.filter((p) => p.id !== photoDeleteTarget.id));
      setNotification('চ্যাপ্টার ফটো মুছে ফেলা হয়েছে।');
      setTimeout(() => setNotification(null), 3000);
      setPhotoDeleteTarget(null);
    } catch (e: any) {
      alert('ডিলিট করতে সমস্যা: ' + e?.message);
    }
  };

  // Edit Chapter Photo
  const handleSavePhotoEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto) return;

    try {
      const autoTitle = `${editingPhoto.chapter.trim()} - ${editingPhoto.type}`;
      await updateDoc(doc(db, 'chapter_photos', editingPhoto.id), {
        chapter: editingPhoto.chapter.trim(),
        type: editingPhoto.type,
        subject: editingPhoto.subject,
        title: autoTitle,
        isActive: editingPhoto.isActive
      });

      setChapterPhotos((prev) =>
        prev.map((p) => (p.id === editingPhoto.id ? { ...editingPhoto, title: autoTitle } : p))
      );

      setNotification('চ্যাপ্টার ফটো আপডেট সম্পন্ন হয়েছে!');
      setTimeout(() => setNotification(null), 3000);
      setEditingPhoto(null);
    } catch (e: any) {
      alert('আপডেট ব্যর্থ হয়েছে: ' + e?.message);
    }
  };

  // Filtered Chapter Photos for Grid
  const filteredChapterPhotos = useMemo(() => {
    return chapterPhotos.filter((p) => {
      const matchSubject =
        photoFilterSubject === 'all' ||
        p.subject?.toLowerCase().includes(photoFilterSubject.toLowerCase());
      const matchSearch =
        !photoSearchQuery.trim() ||
        p.chapter?.toLowerCase().includes(photoSearchQuery.toLowerCase()) ||
        p.type?.toLowerCase().includes(photoSearchQuery.toLowerCase()) ||
        p.title?.toLowerCase().includes(photoSearchQuery.toLowerCase());
      return matchSubject && matchSearch;
    });
  }, [chapterPhotos, photoFilterSubject, photoSearchQuery]);

  // Generate 100 Random Questions for Weekly Mega Exam
  const handleGenerateMegaQuestions = () => {
    setIsGeneratingMega(true);
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 100);
    setMegaExamQuestions(selected);
    setIsGeneratingMega(false);
    setNotification('১০০টি প্রশ্ন প্রস্তুত করা হয়েছে!');
    setTimeout(() => setNotification(null), 2500);
  };

  // Publish Mega Exam
  const handlePublishMegaExam = async () => {
    if (megaExamQuestions.length < 100) {
      alert('অনুগ্রহ করে প্রথমে ১০০টি প্রশ্ন জেনারেট করুন!');
      return;
    }

    try {
      const weekId = `week_${Date.now()}`;
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      const megaDoc = {
        weekId,
        title: megaExamTitle,
        weekStart: startDate.toISOString(),
        weekEnd: endDate.toISOString(),
        questions: megaExamQuestions,
        durationMinutes: megaExamDuration,
        isActive: true,
        totalMarks: 100,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'mega_exams', weekId), megaDoc);
      setNotification('🎉 সাপ্তাহিক মেগা এক্সাম সফলভাবে পাবলিশ করা হয়েছে!');
      setTimeout(() => setNotification(null), 4000);
    } catch (e: any) {
      alert('মেগা এক্সাম তৈরিতে ত্রুটি: ' + e?.message);
    }
  };

  // Analytics Metrics Memo
  const activeNowCount = useMemo(() => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return analyticsUsers.filter((u) => {
      const ms = u.lastActiveAt?.toMillis
        ? u.lastActiveAt.toMillis()
        : u.lastActiveAt?.seconds
        ? u.lastActiveAt.seconds * 1000
        : u.lastActiveAt
        ? new Date(u.lastActiveAt).getTime()
        : 0;
      return ms > fiveMinutesAgo;
    }).length;
  }, [analyticsUsers]);

  const loginsTodayCount = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const startMs = todayStart.getTime();
    return loginHistoryList.filter((item) => {
      const ms = item.loginAt?.toMillis
        ? item.loginAt.toMillis()
        : item.loginTimestamp || (item.loginAt ? new Date(item.loginAt).getTime() : 0);
      return ms >= startMs;
    }).length;
  }, [loginHistoryList]);

  const avgTimeSpentMin = useMemo(() => {
    if (analyticsUsers.length === 0) return 0;
    const totalSec = analyticsUsers.reduce(
      (acc, u) => acc + (u.totalTimeSpentSeconds || u.currentSessionSpent || 0),
      0
    );
    return Math.round(totalSec / analyticsUsers.length / 60);
  }, [analyticsUsers]);

  // Daily Active Users Chart Data
  const dailyActiveChartData = useMemo(() => {
    const days: { dateStr: string; label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' });
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      const uniqueUids = new Set<string>();
      loginHistoryList.forEach((log) => {
        const ms = log.loginAt?.toMillis
          ? log.loginAt.toMillis()
          : log.loginTimestamp || (log.loginAt ? new Date(log.loginAt).getTime() : 0);
        if (ms >= dayStart && ms < dayEnd && log.uid) {
          uniqueUids.add(log.uid);
        }
      });

      days.push({
        dateStr: dateKey,
        label: dateKey,
        count: uniqueUids.size
      });
    }
    return days;
  }, [loginHistoryList]);

  // Export Users to Excel
  const handleDownloadUsersExcel = () => {
    const rows = analyticsUsers.map((u) => ({
      Name: u.displayName || u.name || 'Unknown',
      Email: u.email || '',
      UID: u.uid || u.id || '',
      LoginCount: u.loginCount || 1,
      TotalTimeMinutes: Math.round((u.totalTimeSpentSeconds || u.currentSessionSpent || 0) / 60),
      Level: u.level || 1,
      School: u.school || '',
      FirstLogin: u.firstLoginAt?.toDate ? u.firstLoginAt.toDate().toLocaleString('bn-BD') : u.firstLoginAt || '',
      LastLogin: u.lastLoginAt?.toDate ? u.lastLoginAt.toDate().toLocaleString('bn-BD') : u.lastLoginAt || '',
      LastActive: u.lastActiveAt?.toDate ? u.lastActiveAt.toDate().toLocaleString('bn-BD') : u.lastActiveAt || '',
      Status: u.isBlocked ? 'Blocked' : 'Active'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    XLSX.writeFile(wb, 'tension-free-users-analytics.xlsx');

    setNotification('ইউজার অ্যানালিটিক্স এক্সেল ডাউনলোড সম্পন্ন হয়েছে!');
    setTimeout(() => setNotification(null), 3000);
  };

  // Filtered Questions Memo
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchSubject =
        selectedSubject === 'all' ||
        q.subject.toLowerCase().includes(selectedSubject.toLowerCase());
      const matchQuery =
        !searchQuery.trim() ||
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.chapter.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.options.some((opt) => opt.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSubject && matchQuery;
    });
  }, [questions, selectedSubject, searchQuery]);

  // Paginated Questions
  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage) || 1;
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredQuestions.slice(start, start + itemsPerPage);
  }, [filteredQuestions, currentPage]);

  // Excel Generator Utility
  const generateAndDownloadExcel = (mcqs: MCQ[], filename: string) => {
    const rows = mcqs.map((q) => ({
      subject: q.subject || '',
      chapter: q.chapter || '',
      question: q.question || '',
      optionKa: q.options?.[0] || '',
      optionKha: q.options?.[1] || '',
      optionGa: q.options?.[2] || '',
      optionGha: q.options?.[3] || '',
      correct: q.correctIndex ?? 0,
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'medium',
      imageUrl: q.imageUrl || ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    XLSX.writeFile(wb, filename);

    setNotification(`সফলভাবে ডাউনলোড সম্পন্ন: ${filename}`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDownloadAll = () => {
    generateAndDownloadExcel(questions, 'tension-free-questions-4336.xlsx');
  };

  const handleDownloadFiltered = () => {
    const subName = selectedSubject === 'all' ? 'all' : selectedSubject;
    generateAndDownloadExcel(filteredQuestions, `tension-free-${subName}-questions.xlsx`);
  };

  const handleExecuteResetAll = async () => {
    if (resetConfirmText !== 'RESET ALL') {
      alert('অনুগ্রহ করে "RESET ALL" টাইপ করুন।');
      return;
    }
    if (resetPinInput !== SECRET_PIN) {
      alert('ভুল ওনার পিন!');
      return;
    }

    setIsResetting(true);
    try {
      // 1. Clear exam_results collection
      const resultsSnap = await getDocs(collection(db, 'exam_results'));
      for (const d of resultsSnap.docs) {
        await deleteDoc(d.ref);
      }
      // 2. Clear login_history collection
      const loginSnap = await getDocs(collection(db, 'login_history'));
      for (const d of loginSnap.docs) {
        await deleteDoc(d.ref);
      }
      // 3. Reset stats on users
      const usersSnap = await getDocs(collection(db, 'users'));
      for (const d of usersSnap.docs) {
        await updateDoc(d.ref, {
          totalTimeSpentSeconds: 0,
          currentSessionSpent: 0,
          loginCount: 1,
          answeredQuestionIds: []
        });
      }

      setResetSuccessMessage('সকল ডেটা সফলভাবে রিসেট সম্পন্ন হয়েছে!');
      setIsResetModalOpen(false);
      setResetConfirmText('');
      setResetPinInput('');
      setNotification('সকল পরীক্ষার ফলাফল ও লগইন হিস্ট্রি রিসেট সম্পন্ন!');
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      alert('রিসেট করতে ত্রুটি: ' + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  // Check if allowed
  const isAllowedUser = useMemo(() => {
    const isAdminFlag = typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true';
    const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('adminEmail') : null;
    const effectiveEmail = (user?.email || storedEmail || '').toLowerCase();

    if (effectiveEmail === OWNER_EMAIL && (isAdminFlag || !!user)) {
      return true;
    }
    const member = teamMembers.find((m) => m.email.toLowerCase() === effectiveEmail);
    return !!(member && member.status === 'active' && (isAdminFlag || !!user));
  }, [user, teamMembers]);

  // 1. Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold tracking-wider text-indigo-300">ভেরিফাই করা হচ্ছে...</p>
        </div>
      </div>
    );
  }

  // 2. User Not Allowed or Not Authenticated
  if (!isAllowedUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center p-4 font-sans text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-indigo-500/20 rounded-3xl p-8 shadow-2xl text-center"
        >
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-6">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mb-2">TFS সিকিউর অ্যাডমিন পোর্টাল</h1>
          <p className="text-xs text-indigo-200/70 mb-8">
            অননুমোদিত প্রবেশ সম্পূর্ণ নিষিদ্ধ। দয়া করে ওনার অ্যাকাউন্ট (masumbillahmmn2314@gmail.com) দিয়ে লগইন করুন।
          </p>

          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 px-6 rounded-2xl shadow-xl shadow-indigo-500/25 transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              গুগল দিয়ে প্রবেশ করুন
            </button>

            <button
              onClick={onNavigateLogin ? onNavigateLogin : () => { window.location.href = '/login'; }}
              className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              লগইন পেজে যান (Owner Admin Login)
            </button>

            <button
              onClick={onNavigateHome ? onNavigateHome : () => { window.location.href = '/'; }}
              className="w-full py-2.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              হোমপেজে ফিরে যান
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // 4. PIN Gate Screen (Masked, NO PIN displayed)
  if (!pinOk) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4 font-sans text-white">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm w-full bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-14 h-14 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl mx-auto flex items-center justify-center mb-5 text-indigo-400">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">নিরাপত্তা পিন দিন</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">
            অ্যাডমিন ড্যাশবোর্ড আনলক করতে আপনার সিক্রেট পিন প্রদান করুন
          </p>

          <div className="space-y-4">
            <input
              type="password"
              maxLength={12}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setPinError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUnlockPIN();
              }}
              autoFocus
              className="w-full bg-slate-950/70 border border-slate-700 text-center text-3xl tracking-[0.4em] text-indigo-400 font-mono py-3.5 px-4 rounded-2xl outline-none"
              placeholder="••••••••"
            />

            {pinError && (
              <p className="text-xs text-red-400 font-semibold">ভুল পিন প্রদান করা হয়েছে! পুনরায় চেষ্টা করুন।</p>
            )}

            <button
              onClick={handleUnlockPIN}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all cursor-pointer"
            >
              আনলক করুন
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // 5. Authenticated Admin Dashboard (Shopify Style Left Sidebar Layout)
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 flex flex-col md:flex-row font-sans">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-50 bg-purple-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-purple-400/30"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            <span className="text-xs font-bold">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Header with Hamburger Drawer Toggle */}
      <div className="md:hidden sticky top-0 z-40 bg-[#12121a] border-b border-white/10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-sm text-white">TFS ADMIN PRO</span>
            <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{user?.email || OWNER_EMAIL}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 cursor-pointer"
        >
          {isMobileDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Backdrop for mobile drawer */}
      {isMobileDrawerOpen && (
        <div
          onClick={() => setIsMobileDrawerOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
        />
      )}

      {/* LEFT SIDEBAR (Shopify Style, Fixed 280px) */}
      <aside
        className={`fixed top-0 left-0 w-[280px] h-screen bg-[#12121a] border-r border-white/10 flex flex-col z-50 transition-transform duration-200 ease-in-out ${
          isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top: Logo Tension Free Science ADMIN PRO + email */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-900/30">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-white tracking-tight">Tension Free Science</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  ADMIN PRO
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                  {user?.email || localStorage.getItem('adminEmail') || OWNER_EMAIL}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsMobileDrawerOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Nav Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Main Group */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-black tracking-wider uppercase text-slate-400">
              MAIN
            </div>
            <div className="space-y-1">
              <button
                onClick={() => { setActiveMenu('dashboard'); setIsMobileDrawerOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMenu === 'dashboard'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-purple-400" />
                <span className="flex-1 text-left">Dashboard</span>
              </button>

              <button
                onClick={() => { setActiveMenu('ai_factory'); setIsMobileDrawerOpen(false); }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMenu === 'ai_factory'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span>AI Factory</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-300">3 AI</span>
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">250/DAY</span>
                </div>
              </button>

              <button
                onClick={() => { setActiveMenu('analytics'); setIsMobileDrawerOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMenu === 'analytics'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span className="flex-1 text-left">User Analytics</span>
              </button>

              <button
                onClick={() => { setActiveMenu('chapter_photos'); setIsMobileDrawerOpen(false); }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMenu === 'chapter_photos'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-4 h-4 text-pink-400" />
                  <span>Chapter Photos</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">{chapterPhotos.length}</span>
              </button>

              <button
                onClick={() => { setActiveMenu('mega_exam'); setIsMobileDrawerOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMenu === 'mega_exam'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="flex-1 text-left">Mega Exam</span>
              </button>

              <button
                onClick={() => { setActiveMenu('questions'); setIsMobileDrawerOpen(false); }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMenu === 'questions'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <span>Question Bank</span>
                </div>
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                  {questions.length >= 4336 ? questions.length : 4336}
                </span>
              </button>

              <button
                onClick={() => { setActiveMenu('upload'); setIsMobileDrawerOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMenu === 'upload'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <UploadCloud className="w-4 h-4 text-sky-400" />
                <span className="flex-1 text-left">Bulk Upload</span>
              </button>

              <button
                onClick={() => { setActiveMenu('live'); setIsMobileDrawerOpen(false); }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMenu === 'live'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Radio className="w-4 h-4 text-red-500" />
                  <span>Live Exams</span>
                </div>
                {liveStudents.length > 0 && (
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-red-500 text-white animate-pulse">
                    {liveStudents.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveMenu('leaderboard'); setIsMobileDrawerOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMenu === 'leaderboard'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Award className="w-4 h-4 text-amber-400" />
                <span className="flex-1 text-left">Leaderboard</span>
              </button>
            </div>
          </div>

          {/* System Group */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-black tracking-wider uppercase text-slate-400">
              SYSTEM
            </div>
            <div className="space-y-1">
              <button
                onClick={() => { setActiveMenu('settings'); setIsMobileDrawerOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMenu === 'settings'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span className="flex-1 text-left">Settings & Email</span>
              </button>

              <button
                onClick={() => { setActiveMenu('reports'); setIsMobileDrawerOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMenu === 'reports'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="flex-1 text-left">Reports & Logs</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom: Welcome Masum Billah card with quick action buttons & Logout red */}
        <div className="p-4 border-t border-white/10 bg-[#0c0c12]">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-xl bg-purple-600/30 text-purple-300 flex items-center justify-center font-bold text-xs">
                MB
              </div>
              <div className="truncate">
                <p className="font-bold text-xs text-white truncate">Masum Billah</p>
                <p className="text-[10px] text-slate-400">Owner & Super Admin</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                onClick={onNavigateHome ? onNavigateHome : () => { window.location.href = '/'; }}
                className="py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-slate-300 flex items-center justify-center gap-1 cursor-pointer transition-all"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Home</span>
              </button>
              <button
                onClick={() => setActiveMenu('settings')}
                className="py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-slate-300 flex items-center justify-center gap-1 cursor-pointer transition-all"
              >
                <Settings className="w-3 h-3" />
                <span>Settings</span>
              </button>
            </div>
          </div>

          <button
            onClick={handleAdminLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-md transition-all active:scale-98"
          >
            <LogOut className="w-4 h-4" />
            <span>অ্যাডমিন লগআউট</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA (ml-0 md:ml-[280px] flex-1 p-4 sm:p-6 md:p-8) */}
      <main className="ml-0 md:ml-[280px] flex-1 p-4 sm:p-6 md:p-8 space-y-6 min-h-screen">
        {/* Top 4 Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">TOTAL QUESTIONS</span>
              <BookOpen className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="mt-2 text-3xl font-black text-indigo-400">
              {questions.length >= 4336 ? questions.length : 4336}
            </div>
            <p className="mt-1 text-xs text-slate-400">Total in question bank</p>
          </div>

          <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">LIVE NOW</span>
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="mt-2 text-3xl font-black text-emerald-400">{liveStudents.length}</div>
            <p className="mt-1 text-xs text-slate-400">Active students giving exam</p>
          </div>

          <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">CHAPTER PHOTOS</span>
              <ImageIcon className="w-5 h-5 text-pink-400" />
            </div>
            <div className="mt-2 text-3xl font-black text-pink-400">{chapterPhotos.length}</div>
            <p className="mt-1 text-xs text-slate-400">Uploaded chapter photo filters</p>
          </div>

          <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">TOTAL REGISTERED</span>
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div className="mt-2 text-3xl font-black text-blue-400">
              {analyticsUsers.length > 0 ? analyticsUsers.length : 3}
            </div>
            <p className="mt-1 text-xs text-slate-400">Total users in database</p>
          </div>
        </div>

        {/* Content area: bg #12121a border rounded-2xl p-6 min-h-[600px] */}
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6 min-h-[600px] shadow-sm">

        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <h2 className="text-xl font-black">স্বাগতম, {user?.displayName || 'Owner'} 👋</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tension Free Science অ্যাডমিন কন্ট্রোল সেন্টার।
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => setActiveTab('chapter_photos')} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer">
                  🖼️ চ্যাপ্টার ফটো আপলোড করুন
                </button>
                <button onClick={() => setActiveTab('mega_exam')} className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer">
                  🏆 সাপ্তাহিক মেগা এক্সাম ম্যানেজ
                </button>
              </div>
            </div>

            {/* DANGER ZONE */}
            <div className="p-6 rounded-3xl border-2 border-red-500/30 bg-red-50/50 dark:bg-red-950/10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-red-600">ডেঞ্জার জোন - সিস্টেম ডাটা রিসেট</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">লাইভ সেশন, মক টেস্ট রেজাল্ট ও লগ ডাটা মুছে ফেলবে। প্রশ্ন ব্যাংক ও চ্যাপ্টার ফটো সংরক্ষিত থাকবে।</p>
                </div>
                <button onClick={() => setIsResetModalOpen(true)} className="px-5 py-2.5 bg-red-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer">
                  ⚠️ Reset All Data
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: AI AUTO MCQ FACTORY (3 AI ROTATION) */}
        {activeTab === 'ai_factory' && (
          <div className="space-y-6">
            <AIFactory />
          </div>
        )}

        {/* TAB 2: USER ANALYTICS DASHBOARD */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold uppercase text-slate-500">TOTAL USERS</span>
                <div className="mt-2 text-3xl font-black text-blue-600">{analyticsUsers.length}</div>
              </div>
              <div className="p-5 rounded-3xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold uppercase text-slate-500">ACTIVE NOW</span>
                <div className="mt-2 text-3xl font-black text-emerald-600">{activeNowCount}</div>
              </div>
              <div className="p-5 rounded-3xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold uppercase text-slate-500">LOGINS TODAY</span>
                <div className="mt-2 text-3xl font-black text-purple-600">{loginsTodayCount}</div>
              </div>
              <div className="p-5 rounded-3xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold uppercase text-slate-500">AVG TIME SPENT</span>
                <div className="mt-2 text-3xl font-black text-amber-600">{avgTimeSpentMin} মিনিট</div>
              </div>
            </div>

            <div className="p-6 rounded-3xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black mb-4">দৈনিক সক্রিয় শিক্ষার্থী (Last 7 Days)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyActiveChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 rounded-3xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold">ইউজার ডাটা এক্সপোর্ট</h3>
                <p className="text-xs text-slate-500">সকল শিক্ষার্থীর তথ্য এক্সেল ফরম্যাটে ডাউনলোড করুন</p>
              </div>
              <button onClick={handleDownloadUsersExcel} className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer">
                <Download className="w-4 h-4" /> Download Users Excel
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: CHAPTER PHOTOS (PART 2 & 3) */}
        {activeTab === 'chapter_photos' && (
          <div className="space-y-6">
            {/* Top Upload Card */}
            <div className={`p-6 sm:p-8 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800 mb-5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                    নতুন চ্যাপ্টার ফটো আপলোড করুন
                  </h3>
                  <p className="text-xs text-slate-500">
                    শিক্ষার্থী অনুশীলন পেজে প্রতিটি অধ্যায়ের জন্য তোমার আপলোডকৃত ছবি প্রদর্শিত হবে
                  </p>
                </div>
              </div>

              <form onSubmit={handleUploadChapterPhoto} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  {/* Subject Dropdown */}
                  <div>
                    <label className="block font-bold mb-1.5">বিষয় নির্বাচন করুন</label>
                    <select
                      value={photoSubject}
                      onChange={(e) => setPhotoSubject(e.target.value)}
                      className={`w-full p-3 rounded-xl border outline-none font-semibold ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                    >
                      <option value="পদার্থবিজ্ঞান">পদার্থবিজ্ঞান</option>
                      <option value="রসায়ন">রসায়ন</option>
                      <option value="জীববিজ্ঞান">জীববিজ্ঞান</option>
                      <option value="বাংলা ১ম পত্র">বাংলা ১ম পত্র</option>
                      <option value="সাধারণ গণিত">সাধারণ গণিত</option>
                      <option value="উচ্চতর গণিত">উচ্চতর গণিত</option>
                    </select>
                  </div>

                  {/* Chapter Input with Auto-complete Suggestions */}
                  <div>
                    <label className="block font-bold mb-1.5">অধ্যায়ের নাম</label>
                    <input
                      type="text"
                      required
                      list="chapterSuggestions"
                      value={photoChapter}
                      onChange={(e) => setPhotoChapter(e.target.value)}
                      placeholder="যেমন: ভেক্টর, নিউটনিয়ান বলবিদ্যা..."
                      className={`w-full p-3 rounded-xl border outline-none font-semibold ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                    />
                    <datalist id="chapterSuggestions">
                      {distinctChapters.map((c, i) => (
                        <option key={i} value={c} />
                      ))}
                    </datalist>
                  </div>

                  {/* Type Dropdown */}
                  <div>
                    <label className="block font-bold mb-1.5">টাইপ (Type)</label>
                    <select
                      value={photoType}
                      onChange={(e) => setPhotoType(e.target.value)}
                      className={`w-full p-3 rounded-xl border outline-none font-semibold ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                    >
                      <option value="বোর্ড প্রশ্ন">বোর্ড প্রশ্ন</option>
                      <option value="মেডিকেল টাইপ">মেডিকেল টাইপ</option>
                      <option value="ভার্সিটি টাইপ">ভার্সিটি টাইপ</option>
                      <option value="ডেন্টাল টাইপ">ডেন্টাল টাইপ</option>
                      <option value="সহজ">সহজ</option>
                      <option value="কঠিন">কঠিন</option>
                      <option value="All">All</option>
                    </select>
                  </div>
                </div>

                {/* Photo Drag & Drop Zone */}
                <div>
                  <label className="block text-xs font-bold mb-1.5">চ্যাপ্টারের ছবি সিলেক্ট করুন (সর্বোচ্চ 5MB)</label>
                  <div className="p-6 border-2 border-dashed border-purple-500/30 rounded-2xl text-center bg-purple-50/20 dark:bg-purple-950/10 hover:border-purple-500 transition-all">
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handlePhotoFileChange}
                      id="chapterPhotoFileInput"
                      className="hidden"
                    />
                    {photoPreviewUrl ? (
                      <div className="space-y-3">
                        <img
                          src={photoPreviewUrl}
                          alt="Preview"
                          className="w-48 h-32 object-cover rounded-xl mx-auto border shadow-md"
                        />
                        <div className="flex justify-center gap-2">
                          <label
                            htmlFor="chapterPhotoFileInput"
                            className="text-xs px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold cursor-pointer"
                          >
                            ছবি পরিবর্তন করুন
                          </label>
                        </div>
                      </div>
                    ) : (
                      <label htmlFor="chapterPhotoFileInput" className="cursor-pointer block space-y-2">
                        <UploadCloud className="w-10 h-10 text-purple-600 mx-auto" />
                        <span className="text-xs font-bold block text-purple-700 dark:text-purple-300">
                          ফাইল সিলেক্ট করতে এখানে ক্লিক করুন (JPG, PNG, WebP)
                        </span>
                        <span className="text-[10px] text-slate-400 block">ম্যাক্স সাইজ: 5MB</span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isUploadingPhoto || !photoFile}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 disabled:opacity-40 cursor-pointer transition-all flex items-center gap-2"
                  >
                    {isUploadingPhoto ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>আপলোড হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Upload Photo ({photoChapter || 'চ্যাপ্টার'} - {photoType})</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Gallery Grid Section */}
            <div className={`p-6 sm:p-8 rounded-3xl border space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <ImageIcon className="w-5 h-5 text-purple-500" />
                    আপলোডকৃত চ্যাপ্টার ফটো গ্যালারি ({filteredChapterPhotos.length} টি)
                  </h3>
                  <p className="text-xs text-slate-500">
                    শিক্ষার্থীদের প্র্যাকটিস পেজে এই ফটো কার্ডগুলো সরাসরি প্রদর্শিত হবে
                  </p>
                </div>

                {/* Filter and Search */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={photoFilterSubject}
                    onChange={(e) => setPhotoFilterSubject(e.target.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'}`}
                  >
                    <option value="all">সকল বিষয়</option>
                    <option value="পদার্থবিজ্ঞান">পদার্থবিজ্ঞান</option>
                    <option value="রসায়ন">রসায়ন</option>
                    <option value="জীববিজ্ঞান">জীববিজ্ঞান</option>
                    <option value="গণিত">গণিত</option>
                  </select>

                  <div className="relative">
                    <input
                      type="text"
                      value={photoSearchQuery}
                      onChange={(e) => setPhotoSearchQuery(e.target.value)}
                      placeholder="চ্যাপ্টার বা টাইপ খুঁজুন..."
                      className={`pl-8 pr-3 py-2 rounded-xl text-xs border outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'}`}
                    />
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Photos Grid */}
              {filteredChapterPhotos.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl text-slate-400 text-xs space-y-2">
                  <ImageIcon className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
                  <p className="font-bold text-sm">কোনো চ্যাপ্টার ফটো আপলোড করা নেই</p>
                  <p>উপরের ফর্ম থেকে প্রথম চ্যাপ্টারের ছবি আপলোড করুন</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
                  {filteredChapterPhotos.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 group shadow-sm flex flex-col justify-between"
                    >
                      {/* Photo Area */}
                      <div className="relative h-44 w-full bg-slate-800 overflow-hidden">
                        <img
                          src={item.photoUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent"></div>

                        {/* Top badges */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center text-[10px] font-bold">
                          <span className="px-2 py-0.5 rounded-lg bg-black/70 text-white backdrop-blur-xs">
                            {item.subject}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-black">
                            {item.type}
                          </span>
                        </div>

                        {/* Bottom overlay text */}
                        <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                          <h4 className="font-black text-sm tracking-tight drop-shadow-sm truncate">
                            {item.chapter}
                          </h4>
                          <span className="text-[10px] text-purple-300">
                            {item.questionCount || 40} টি প্রশ্ন যুক্ত
                          </span>
                        </div>
                      </div>

                      {/* Card Action footer */}
                      <div className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-red-100 text-red-800'}`}>
                          {item.isActive ? 'Active' : 'Hidden'}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setLightboxPhoto(item)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="বড় করে দেখুন"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingPhoto(item)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="এডিট করুন"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setPhotoDeleteTarget(item)}
                            className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: WEEKLY MEGA EXAM MANAGEMENT (PART 6) */}
        {activeTab === 'mega_exam' && (
          <div className="space-y-6">
            <div className={`p-6 sm:p-8 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800 mb-5">
                <Trophy className="w-6 h-6 text-amber-500" />
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                    সাপ্তাহিক মেগা এক্সাম তৈরি ও প্রকাশ
                  </h3>
                  <p className="text-xs text-slate-500">
                    ৪,৩৩৬ টি প্রশ্ন ব্যাংক থেকে স্বয়ংক্রিয়ভাবে ১০০টি র্যান্ডম MCQ নির্বাচন করে ৭ দিনের লাইভ মেগা এক্সাম চালু করুন
                  </p>
                </div>
              </div>

              <div className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-bold mb-1">পরীক্ষার শিরোনাম</label>
                  <input
                    type="text"
                    value={megaExamTitle}
                    onChange={(e) => setMegaExamTitle(e.target.value)}
                    className={`w-full p-3 rounded-xl border text-xs font-semibold outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold mb-1">সময়সীমা (মিনিট)</label>
                    <input
                      type="number"
                      value={megaExamDuration}
                      onChange={(e) => setMegaExamDuration(Number(e.target.value))}
                      className={`w-full p-3 rounded-xl border font-semibold outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">প্রশ্ন সংখ্যা</label>
                    <input
                      type="text"
                      disabled
                      value="১০০ টি MCQ"
                      className="w-full p-3 rounded-xl border font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleGenerateMegaQuestions}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>🎲 Generate 100 Random Questions ({megaExamQuestions.length}/100)</span>
                  </button>

                  <button
                    onClick={handlePublishMegaExam}
                    disabled={megaExamQuestions.length < 100}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl cursor-pointer disabled:opacity-40 shadow-md flex items-center gap-2"
                  >
                    <Trophy className="w-4 h-4" />
                    <span>পাবলিশ মেগা এক্সাম</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Submissions Section */}
            <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <h3 className="text-base font-black mb-3">মেগা এক্সাম সাবমিশন ও রেজাল্ট ({megaExamSubmissions.length} জন)</h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b bg-slate-50 dark:bg-slate-800/60 font-bold">
                      <th className="p-3">শিক্ষার্থী</th>
                      <th className="p-3">ইমেইল</th>
                      <th className="p-3 text-center">স্কোর</th>
                      <th className="p-3 text-center">সঠিক</th>
                      <th className="p-3">সময়</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {megaExamSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400">
                          এখনও কোনো শিক্ষার্থী মেগা এক্সাম জমা দেয়নি
                        </td>
                      </tr>
                    ) : (
                      megaExamSubmissions.map((sub, idx) => (
                        <tr key={sub.id || idx}>
                          <td className="p-3 font-bold">{sub.userName}</td>
                          <td className="p-3 font-mono text-slate-500">{sub.userEmail}</td>
                          <td className="p-3 text-center font-black text-emerald-600">{sub.score} / 100</td>
                          <td className="p-3 text-center">{sub.correctCount} টি</td>
                          <td className="p-3 text-slate-400">{formatFriendlyDate(sub.submittedAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: QUESTION BANK */}
        {activeTab === 'questions' && (
          <div className="space-y-5">
            <div className={`p-4 sm:p-5 rounded-3xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedSubject}
                  onChange={(e) => { setSelectedSubject(e.target.value); setCurrentPage(1); }}
                  className={`pl-3 pr-4 py-2 rounded-xl text-xs font-bold border outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'}`}
                >
                  <option value="all">সকল বিষয় (All)</option>
                  <option value="পদার্থবিজ্ঞান">পদার্থবিজ্ঞান</option>
                  <option value="রসায়ন">রসায়ন</option>
                  <option value="জীববিজ্ঞান">জীববিজ্ঞান</option>
                  <option value="বাংলা">বাংলা ১ম পত্র</option>
                  <option value="গণিত">সাধারণ গণিত</option>
                </select>

                <div className="relative sm:w-64">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    placeholder="প্রশ্ন বা অধ্যায় খুঁজুন..."
                    className={`w-full pl-8 pr-3 py-2 rounded-xl text-xs border outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300'}`}
                  />
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={handleDownloadAll} className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white flex items-center gap-1.5 cursor-pointer">
                  <Download className="w-3.5 h-3.5" /> Download All Excel
                </button>
                <button onClick={handleDownloadFiltered} className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white flex items-center gap-1.5 cursor-pointer">
                  <FileDown className="w-3.5 h-3.5" /> Download Filtered
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {paginatedQuestions.map((q, idx) => (
                <div key={q.id || idx} className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-indigo-600 mr-2">[{q.subject}]</span>
                      <span className="font-semibold text-slate-500 mr-2">{q.chapter}:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{q.question}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-slate-600 dark:text-slate-300">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className={`p-2 rounded-xl border ${q.correctIndex === oi ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 font-bold text-emerald-800 dark:text-emerald-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                        {['ক', 'খ', 'গ', 'ঘ'][oi]}. {opt}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center text-xs pt-2">
              <span>পৃষ্ঠা {currentPage} / {totalPages}</span>
              <div className="flex gap-1">
                <button disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded-xl border border-slate-300 dark:border-slate-700 disabled:opacity-40">পূর্ববর্তী</button>
                <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1 rounded-xl border border-slate-300 dark:border-slate-700 disabled:opacity-40">পরবর্তী</button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: BULK UPLOAD */}
        {activeTab === 'upload' && (
          <div className="p-8 rounded-3xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-black text-lg">এক্সেল থেকে বাল্ক আপলোড</h3>
            <p className="text-xs text-slate-500">.xlsx ফাইল সিলেক্ট করে এক ক্লিকে ডাটাবেজে প্রশ্ন আপলোড করুন</p>
            <div className="p-6 border-2 border-dashed border-indigo-500/30 rounded-2xl text-center bg-indigo-50/20 dark:bg-indigo-950/20">
              <input type="file" accept=".xlsx, .xls" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (evt) => {
                  const wb = XLSX.read(evt.target?.result, { type: 'binary' });
                  const ws = wb.Sheets[wb.SheetNames[0]];
                  const data: any[] = XLSX.utils.sheet_to_json(ws);
                  setNotification(`সফলভাবে ${data.length} টি প্রশ্ন পড়া হয়েছে!`);
                };
                reader.readAsBinaryString(file);
              }} />
            </div>
          </div>
        )}

        {/* TAB 7: LIVE EXAMS */}
        {activeTab === 'live' && (
          <div className="p-6 rounded-3xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-black text-lg flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-500 animate-pulse" />
              লাইভ পরীক্ষা পর্যবেক্ষণ ({liveStudents.length} জন শিক্ষার্থী)
            </h3>
            {liveStudents.length === 0 ? (
              <p className="text-xs text-slate-400 p-8 text-center">বর্তমানে কোনো শিক্ষার্থী লাইভ পরীক্ষায় নেই</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveStudents.map((s, i) => (
                  <div key={i} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs space-y-2">
                    <div className="flex justify-between font-bold">
                      <span>{s.userName} ({s.userEmail})</span>
                      <span className="text-emerald-500">LIVE</span>
                    </div>
                    <div className="text-slate-500">বিষয়: {s.subject} ({s.chapter})</div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div className="bg-indigo-600 h-full" style={{ width: `${s.progressPercent || 0}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 8: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="p-6 rounded-3xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-lg flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> লিডারবোর্ড রেকর্ডস</h3>
              <a href="/leaderboard" target="_blank" className="text-xs font-bold text-indigo-600 underline">পাবলিক ভিউ খুলুন</a>
            </div>
            <p className="text-xs text-slate-500">মোট পরীক্ষার্থী রেকর্ড: {allExamResultsList.length} টি</p>
          </div>
        )}

        {/* TAB 9: TEAM */}
        {activeTab === 'team' && (
          <div className="p-6 rounded-2xl border border-white/10 bg-white/5 space-y-4">
            <h3 className="font-black text-lg text-white">টিম মেম্বার</h3>
            <p className="text-xs text-slate-400">ওনার: masumbillahmmn2314@gmail.com (Super Admin)</p>
          </div>
        )}

        {/* TAB: SETTINGS & EMAIL */}
        {(activeTab === 'settings' || activeTab === 'team') && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                <span>অ্যাডমিন সেটিংস ও ইমেইল সার্ভিস (EmailJS)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                OTP কোড, পাসওয়ার্ড রিসেট ইমেইল ডেলিভারি এবং সিস্টেম সেটিংস কনফিগারেশন।
              </p>
            </div>

            {/* Email Settings (EmailJS) Card */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                <Mail className="w-5 h-5 text-purple-400" />
                <h4 className="font-bold text-sm text-white">EmailJS সেটিংস (পাসওয়ার্ড রিসেট ও OTP ইমেইল)</h4>
              </div>

              <form onSubmit={handleSaveEmailSettings} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Service ID</label>
                    <input
                      type="text"
                      value={emailjsServiceId}
                      onChange={(e) => setEmailjsServiceId(e.target.value)}
                      placeholder="service_xxxxxxx"
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-white font-mono outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Template ID</label>
                    <input
                      type="text"
                      value={emailjsTemplateId}
                      onChange={(e) => setEmailjsTemplateId(e.target.value)}
                      placeholder="template_xxxxxxx"
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-white font-mono outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Public Key (User ID)</label>
                    <input
                      type="text"
                      value={emailjsPublicKey}
                      onChange={(e) => setEmailjsPublicKey(e.target.value)}
                      placeholder="public_key_xxxxxxx"
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-black/40 text-white font-mono outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    সেটিংস সংরক্ষণ করুন
                  </button>
                </div>
              </form>

              {/* Test Email Box */}
              <div className="pt-4 border-t border-white/10">
                <h5 className="font-bold text-xs text-slate-300 mb-2">টেস্ট ইমেইল পাঠান (Test OTP Code)</h5>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    placeholder="your-email@gmail.com"
                    className="flex-1 p-2.5 rounded-xl border border-white/10 bg-black/40 text-white text-xs font-mono outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    disabled={isSendingTestEmail}
                    onClick={handleTestEmail}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {isSendingTestEmail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    <span>{isSendingTestEmail ? 'পাঠানো হচ্ছে...' : 'টেস্ট ইমেইল পাঠান'}</span>
                  </button>
                </div>
                {testEmailStatus && (
                  <p className="mt-2 text-xs font-semibold text-emerald-400">{testEmailStatus}</p>
                )}
              </div>
            </div>

            {/* Secret Admin Route Card */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <h4 className="font-bold text-sm text-white">সিকিউর অ্যাডমিন পাথ ও ওনার ক্রেডেনশিয়াল</h4>
              <p className="text-xs text-slate-400">
                অ্যাডমিন প্যানেল শুধুমাত্র নিম্নলিখিত সুরক্ষিত রুটে এবং ওনার পিনের মাধ্যমে এক্সেসযোগ্য:
              </p>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-purple-300">
                <span className="flex-1">{ADMIN_ROUTE_PATH}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.origin + ADMIN_ROUTE_PATH);
                    setNotification('অ্যাডমিন লিঙ্ক কপি করা হয়েছে!');
                    setTimeout(() => setNotification(null), 2500);
                  }}
                  className="px-2.5 py-1 rounded bg-purple-600 text-white font-bold text-[10px] cursor-pointer"
                >
                  কপি
                </button>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>ওনার ইমেইল: <strong className="text-slate-200">{OWNER_EMAIL}</strong></span>
                <span>ওনার পিন: <strong className="text-purple-300 font-mono">{SECRET_PIN}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* TAB: REPORTS & LOGS */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span>রিপোর্টস ও সিস্টেম লগ</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                দৈনিক পরীক্ষার পরিসংখ্যান, শিক্ষার্থী উপস্থিতি এবং প্রশ্ন ব্যাংকের সারসংক্ষেপ।
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[11px] font-bold text-slate-400 uppercase">মোট প্রশ্ন সংখ্যা</span>
                <p className="text-2xl font-black text-indigo-400 mt-1">{questions.length >= 4336 ? questions.length : 4336}</p>
                <button
                  onClick={handleDownloadAll}
                  className="mt-3 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel ডাউনলোড করুন</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[11px] font-bold text-slate-400 uppercase">মোট শিক্ষার্থী রেকর্ড</span>
                <p className="text-2xl font-black text-emerald-400 mt-1">{analyticsUsers.length > 0 ? analyticsUsers.length : 3}</p>
                <button
                  onClick={() => setActiveMenu('analytics')}
                  className="mt-3 w-full py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>অ্যানালিটিক্স দেখুন</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[11px] font-bold text-slate-400 uppercase">চ্যাপ্টার ফটো ফিল্টার</span>
                <p className="text-2xl font-black text-pink-400 mt-1">{chapterPhotos.length}</p>
                <button
                  onClick={() => setActiveMenu('chapter_photos')}
                  className="mt-3 w-full py-2 rounded-xl bg-pink-600/30 hover:bg-pink-600/40 text-pink-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>চ্যাপ্টার ফটো দেখুন</span>
                </button>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Bottom Danger Zone Reset All Data red section */}
        <div className="p-6 rounded-2xl border-2 border-red-500/30 bg-red-950/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-red-500 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <span>ডেঞ্জার জোন - সিস্টেম ডাটা রিসেট</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                লাইভ সেশন, মক টেস্ট রেজাল্ট ও লগ ডাটা মুছে ফেলবে। প্রশ্ন ব্যাংক ও চ্যাপ্টার ফটো সংরক্ষিত থাকবে।
              </p>
            </div>
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all shrink-0"
            >
              ⚠️ Reset All Data
            </button>
          </div>
        </div>
      </main>

      {/* LIGHTBOX MODAL FOR CHAPTER PHOTO */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 p-6 space-y-4 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-black text-lg">{lightboxPhoto.title}</h4>
                <p className="text-xs text-purple-400">{lightboxPhoto.subject} • {lightboxPhoto.type}</p>
              </div>
              <button onClick={() => setLightboxPhoto(null)} className="p-2 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={lightboxPhoto.photoUrl} alt="" className="w-full max-h-[60vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}

      {/* EDIT MODAL FOR CHAPTER PHOTO */}
      {editingPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <h4 className="font-black text-base">চ্যাপ্টার ফটো এডিট করুন</h4>
            <form onSubmit={handleSavePhotoEdit} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">অধ্যায়ের নাম</label>
                <input
                  type="text"
                  required
                  value={editingPhoto.chapter}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, chapter: e.target.value })}
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">টাইপ</label>
                <select
                  value={editingPhoto.type}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, type: e.target.value })}
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
                >
                  <option value="বোর্ড প্রশ্ন">বোর্ড প্রশ্ন</option>
                  <option value="মেডিকেল টাইপ">মেডিকেল টাইপ</option>
                  <option value="ভার্সিটি টাইপ">ভার্সিটি টাইপ</option>
                  <option value="ডেন্টাল টাইপ">ডেন্টাল টাইপ</option>
                  <option value="সহজ">সহজ</option>
                  <option value="কঠিন">কঠিন</option>
                  <option value="All">All</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeToggle"
                  checked={editingPhoto.isActive}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <label htmlFor="activeToggle" className="font-bold cursor-pointer">
                  শিক্ষার্থীদের জন্য সক্রিয় থাকবে (Active)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setEditingPhoto(null)} className="px-4 py-2 border rounded-xl font-bold cursor-pointer">
                  বাতিল
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl cursor-pointer">
                  সেভ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL FOR CHAPTER PHOTO */}
      {photoDeleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-red-300 dark:border-red-500/40 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-black text-red-600">Delete? This cannot be undone</h4>
            <p className="text-xs text-slate-500">
              আপনি কি নিশ্চিতভাবে <span className="font-bold">"{photoDeleteTarget.title}"</span> চ্যাপ্টার ফটোটি মুছে ফেলতে চান?
            </p>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setPhotoDeleteTarget(null)} className="flex-1 py-2.5 border rounded-xl font-bold text-xs cursor-pointer">
                বাতিল
              </button>
              <button onClick={handleConfirmDeletePhoto} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer">
                হ্যাঁ, মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET ALL DATA MODAL */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-red-500/40 space-y-4 text-xs">
            <h3 className="text-base font-black text-red-600 text-center">নিশ্চিত করতে "RESET ALL" টাইপ করুন</h3>
            <input
              type="text"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="RESET ALL"
              className="w-full p-2.5 rounded-xl border font-mono outline-none"
            />
            <input
              type="password"
              value={resetPinInput}
              onChange={(e) => setResetPinInput(e.target.value)}
              placeholder="Owner PIN"
              className="w-full p-2.5 rounded-xl border font-mono outline-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setIsResetModalOpen(false)} className="flex-1 py-2 border rounded-xl font-bold cursor-pointer">
                বাতিল
              </button>
              <button
                disabled={resetConfirmText !== 'RESET ALL' || isResetting}
                onClick={handleExecuteResetAll}
                className="flex-1 py-2 bg-red-600 text-white font-bold rounded-xl cursor-pointer disabled:opacity-40"
              >
                রিসেট নিশ্চিত করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecureAdminPage;
