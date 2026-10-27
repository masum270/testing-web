import React, { useState, useEffect } from 'react';
import { SubjectInfo, ExamSessionConfig, ExamResult, UserProfile, MCQ } from './types/quiz.js';
import { AuthUser } from './types/auth.js';
import { ThemeId } from './types/theme.js';
import { SUBJECTS } from './data/subjects.js';
import mcqsData from './data/mcqs.json';
import { selectExamQuestions } from './utils/quizLogic.js';
import { getUserProfile, saveUserProfile, recordExamCompletion, DEFAULT_USER_PROFILE } from './utils/storage.js';
import { getCurrentUser, logoutUser, checkRedirectResult } from './utils/auth.js';
import {
  auth,
  db,
  onAuthStateChanged,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
  collection,
  addDoc,
  arrayUnion,
  getDoc
} from './firebase.js';

// Modular Components & Pages
import { Navbar } from './components/Navbar.js';
import { HomePage } from './components/HomePage.js';
import { VideosPage } from './components/VideosPage.js';
import { LoginPage } from './components/LoginPage.js';
import { RegisterPage } from './components/RegisterPage.js';
import { ForgotPasswordModal } from './components/ForgotPasswordModal.js';
import { ExamSetupModal } from './components/ExamSetupModal.js';
import { ExamHall } from './components/ExamHall.js';
import { ResultPage } from './components/ResultPage.js';
import { LeaderboardPage } from './pages/LeaderboardPage.js';
import { SecureAdminPage } from './pages/SecureAdminPage.js';
import { ProfileModal } from './components/ProfileModal.js';
import { PracticePage } from './components/PracticePage.js';
import { WeeklyMegaExamPage } from './components/WeeklyMegaExamPage.js';
import { DailyStreak } from './components/DailyStreak.js';
import { Youtube, FlaskConical } from 'lucide-react';

// Application version control & storage sync
const APP_VERSION = '3.0.0';
if (typeof window !== 'undefined') {
  try {
    const activeVer = localStorage.getItem('tfs_app_version');
    if (activeVer !== APP_VERSION) {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('tfs_app_version', APP_VERSION);
    }
  } catch (e) {
    console.warn('Storage version sync notice:', e);
  }
}

const ADMIN_ROUTE = '/tfs-admin-2024-secure-x9k2';

export default function App() {
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [currentTheme, setCurrentTheme] = useState<ThemeId>('light');

  // Firestore answered question IDs for no-repeat exam logic
  const [firestoreAnsweredIds, setFirestoreAnsweredIds] = useState<string[]>([]);

  // Path routing
  const [pathname, setPathname] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      const clean = p.toLowerCase().replace(/\/$/, '');
      if (clean === '/admin') {
        window.history.replaceState(null, '', ADMIN_ROUTE);
        return ADMIN_ROUTE;
      }
      if (clean === ADMIN_ROUTE.toLowerCase()) {
        return ADMIN_ROUTE;
      }
      return p;
    }
    return '/';
  });

  // Navigation view router
  const [currentView, setCurrentView] = useState<
    'home' | 'videos' | 'exam' | 'result' | 'leaderboard' | 'practice' | 'mega-exam' | 'login' | 'register'
  >(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.toLowerCase().replace(/\/$/, '');
      if (p === '/leaderboard') return 'leaderboard';
      if (p === '/practice') return 'practice';
      if (p === '/mega-exam') return 'mega-exam';
    }
    return 'home';
  });

  const [redirectMessage, setRedirectMessage] = useState<string | undefined>(undefined);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const [selectedSubject, setSelectedSubject] = useState<SubjectInfo | null>(null);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Active Exam state
  const [activeQuestions, setActiveQuestions] = useState<MCQ[]>([]);
  const [activeConfig, setActiveConfig] = useState<ExamSessionConfig | null>(null);
  const [latestResult, setLatestResult] = useState<ExamResult | null>(null);

  // Listen to popstate (back / forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      let path = window.location.pathname;
      const clean = path.toLowerCase().replace(/\/$/, '');
      if (clean === '/admin') {
        window.history.replaceState(null, '', ADMIN_ROUTE);
        path = ADMIN_ROUTE;
      }
      setPathname(path);
      if (clean === '/leaderboard') {
        setCurrentView('leaderboard');
      } else if (clean === '/practice') {
        setCurrentView('practice');
      } else if (clean === '/mega-exam') {
        setCurrentView('mega-exam');
      } else if (clean === ADMIN_ROUTE.toLowerCase()) {
        // Will render SecureAdminPage
      } else if (clean === '' || clean === '/') {
        setCurrentView('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (
    newPath: string,
    view?: 'home' | 'videos' | 'exam' | 'result' | 'leaderboard' | 'practice' | 'mega-exam' | 'login' | 'register'
  ) => {
    let targetPath = newPath;
    if (targetPath.toLowerCase().replace(/\/$/, '') === '/admin') {
      targetPath = ADMIN_ROUTE;
    }
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', targetPath);
    }
    setPathname(targetPath.split('?')[0]);
    if (view) {
      setCurrentView(view);
    } else {
      const clean = targetPath.toLowerCase().replace(/\/$/, '');
      if (clean === '/leaderboard' || clean.startsWith('/leaderboard')) {
        setCurrentView('leaderboard');
      } else if (clean === '/practice') {
        setCurrentView('practice');
      } else if (clean === '/mega-exam') {
        setCurrentView('mega-exam');
      } else if (clean === '/' || clean === '') {
        setCurrentView('home');
      }
    }
  };

  // 1. Initialize Theme from localStorage
  useEffect(() => {
    const savedTheme = (localStorage.getItem('tfs_theme') as ThemeId) || 'light';
    setCurrentTheme(savedTheme);
    document.documentElement.className = `theme-${savedTheme}`;
  }, []);

  const handleThemeChange = (newTheme: ThemeId) => {
    setCurrentTheme(newTheme);
    localStorage.setItem('tfs_theme', newTheme);
    document.documentElement.className = `theme-${newTheme}`;
  };

  // 2. Initialize Auth state and User Profile
  useEffect(() => {
    const current = getCurrentUser();
    if (current) {
      setAuthUser(current);
      const loaded = getUserProfile();
      setUser({
        ...loaded,
        name: current.name,
        school: current.school || loaded.school
      });
    } else {
      const loaded = getUserProfile();
      setUser(loaded);
    }

    // Check if returning from Google OAuth redirect flow
    checkRedirectResult().then((redirectUser) => {
      if (redirectUser) {
        setAuthUser(redirectUser);
        setUser((prev) => ({
          ...prev,
          name: redirectUser.name,
          school: redirectUser.school || prev.school
        }));
      }
    });
  }, []);

  // 3. User Login Analytics Tracking (users & login_history)
  useEffect(() => {
    let heartbeatInterval: any = null;
    let hasLoggedThisSession = false;

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const displayName = u.displayName || u.email?.split('@')[0] || 'শিক্ষার্থী';
        setAuthUser((prev) => prev || {
          id: u.uid,
          name: displayName,
          email: u.email || '',
          passwordHash: '',
          studentClass: '10',
          school: 'বাংলাদেশ মাধ্যমিক বিদ্যালয়',
          isVerified: u.emailVerified,
          createdAt: new Date().toISOString(),
          totalXP: 0,
          level: 1,
          totalExams: 0,
          totalCorrect: 0,
          totalAttempted: 0,
          avatar: u.photoURL || ''
        });

        const userRef = doc(db, 'users', u.uid);
        try {
          await setDoc(
            userRef,
            {
              uid: u.uid,
              email: u.email,
              displayName: displayName,
              photoURL: u.photoURL || '',
              lastLoginAt: serverTimestamp(),
              lastActiveAt: serverTimestamp(),
              loginCount: increment(1),
              firstLoginAt: serverTimestamp(),
              school: '',
              level: 1,
              avatar: u.photoURL || ''
            },
            { merge: true }
          );

          try {
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const uData = userSnap.data();
              if (Array.isArray(uData.answeredQuestionIds)) {
                setFirestoreAnsweredIds(uData.answeredQuestionIds);
              }
              setUser((prev) => ({
                ...prev,
                name: uData.displayName || prev.name,
                school: uData.school || prev.school,
                totalExams: uData.totalExams ?? prev.totalExams ?? 0,
                totalXP: uData.xp ?? uData.totalXP ?? prev.totalXP ?? 0,
                totalCorrect: uData.totalCorrect ?? prev.totalCorrect ?? 0,
                totalAttempted: uData.totalAttempted ?? prev.totalAttempted ?? 0,
                level: Math.max(1, uData.level || prev.level || 1)
              }));
            }
          } catch (err) {
            // Ignore offline read
          }

          if (!hasLoggedThisSession) {
            hasLoggedThisSession = true;
            const sessionId = Date.now().toString();
            localStorage.setItem('analytics_session_id', sessionId);
            localStorage.setItem('login_start_time', Date.now().toString());

            await addDoc(collection(db, 'login_history'), {
              uid: u.uid,
              email: u.email,
              displayName: displayName,
              photoURL: u.photoURL || '',
              loginAt: serverTimestamp(),
              loginTimestamp: Date.now(),
              sessionId: sessionId,
              device: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 150) : 'Web',
              ip: 'unknown'
            });
          }

          if (heartbeatInterval) clearInterval(heartbeatInterval);
          heartbeatInterval = setInterval(async () => {
            const start = parseInt(localStorage.getItem('login_start_time') || '0');
            const spent = Math.floor((Date.now() - (start || Date.now())) / 1000);
            try {
              await updateDoc(userRef, {
                lastActiveAt: serverTimestamp(),
                totalTimeSpentSeconds: increment(60),
                currentSessionSpent: spent
              });
            } catch (err) {
              // Ignore offline update error
            }
          }, 60000);
        } catch (e) {
          console.warn('Analytics tracking notice:', e);
        }
      } else {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        const start = localStorage.getItem('login_start_time');
        if (start) {
          const spent = Math.floor((Date.now() - parseInt(start)) / 1000);
          console.log('Session spent:', spent, 'seconds');
        }
        localStorage.removeItem('analytics_session_id');
        localStorage.removeItem('login_start_time');
      }
    });

    return () => {
      unsub();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, []);

  // Quick Start Gated by Auth
  const handleQuickStart = () => {
    if (!authUser) {
      setRedirectMessage('পরীক্ষা দেওয়ার জন্য অনুগ্রহ করে প্রথমে লগইন করুন।');
      setCurrentView('login');
      return;
    }
    const quickSub = SUBJECTS.find((s) => s.id === 'physics') || SUBJECTS[0];
    setSelectedSubject(quickSub);
    setIsSetupOpen(true);
  };

  // Subject Selection Gated by Auth
  const handleSelectSubject = (subject: SubjectInfo) => {
    if (!authUser) {
      setRedirectMessage('পরীক্ষা দেওয়ার জন্য অনুগ্রহ করে প্রথমে লগইন করুন।');
      setCurrentView('login');
      return;
    }
    setSelectedSubject(subject);
    setIsSetupOpen(true);
  };

  // Start Exam flow with No Repeat Question Logic
  const handleStartExam = (config: ExamSessionConfig) => {
    if (!authUser) {
      setRedirectMessage('পরীক্ষা শুরু করার জন্য অনুগ্রহ করে লগইন করুন।');
      setCurrentView('login');
      return;
    }

    setIsSetupOpen(false);

    // Combine attempted IDs from local cache and Firestore answered question history
    const attemptedPool = Array.from(new Set([...(user.attemptedIds || []), ...firestoreAnsweredIds]));

    let examQuestions = selectExamQuestions(
      mcqsData as MCQ[],
      config.subject,
      config.chapter,
      config.questionCount,
      attemptedPool,
      config.selectedChapters
    );

    // Reset pool if exhausted so student can continuously practice without getting stuck
    if (examQuestions.length < config.questionCount) {
      examQuestions = selectExamQuestions(
        mcqsData as MCQ[],
        config.subject,
        config.chapter,
        config.questionCount,
        [],
        config.selectedChapters
      );
    }

    setActiveQuestions(examQuestions);
    setActiveConfig(config);
    setCurrentView('exam');
  };

  // Start exam from Practice photo card
  const handleStartExamWithFilter = (subject: string, chapter: string, type: string) => {
    if (!authUser) {
      setRedirectMessage('অনুশীলন শুরু করার জন্য অনুগ্রহ করে লগইন করুন।');
      setCurrentView('login');
      return;
    }

    let pool = (mcqsData as MCQ[]).filter((q) => {
      const matchSub = !subject || subject === 'all' || q.subject.trim() === subject.trim();
      const matchCh = !chapter || chapter === 'all' || q.chapter.trim() === chapter.trim();
      const matchType = !type || type === 'All' || type === 'All Type' || q.type === type;
      return matchSub && matchCh && matchType;
    });

    if (pool.length === 0) {
      pool = (mcqsData as MCQ[]).filter((q) => !chapter || chapter === 'all' || q.chapter.trim() === chapter.trim());
    }
    if (pool.length === 0) {
      pool = (mcqsData as MCQ[]).filter((q) => !subject || subject === 'all' || q.subject.trim() === subject.trim());
    }

    const attemptedPool = Array.from(new Set([...(user.attemptedIds || []), ...firestoreAnsweredIds]));
    let unattempted = pool.filter((q) => !attemptedPool.includes(q.id));
    if (unattempted.length < 10) {
      unattempted = pool;
    }

    const targetQuestions = unattempted.length > 0 ? unattempted.slice(0, 20) : pool.slice(0, 20);

    setActiveQuestions(targetQuestions);
    setActiveConfig({
      subject: subject || 'সাধারণ বিজ্ঞান',
      chapter: chapter || 'সকল অধ্যায়',
      questionCount: targetQuestions.length,
      timeLimitSeconds: targetQuestions.length * 60
    });
    setCurrentView('exam');
  };

  // Finish exam flow
  const handleFinishExam = (result: ExamResult) => {
    const updatedUser = recordExamCompletion(result);
    setUser(updatedUser);
    setLatestResult(result);

    // Save answered question IDs to Firestore users collection using arrayUnion
    const questionIds = (result.answers || []).map((a) => a.question.id);
    if (authUser && questionIds.length > 0) {
      setFirestoreAnsweredIds((prev) => Array.from(new Set([...prev, ...questionIds])));
      updateDoc(doc(db, 'users', authUser.id), {
        answeredQuestionIds: arrayUnion(...questionIds)
      }).catch((err) => console.warn('Could not save answeredQuestionIds:', err));
    }

    setCurrentView('result');
  };

  // Retake exam with fresh questions
  const handleRetakeExam = () => {
    if (activeConfig && selectedSubject) {
      handleStartExam(activeConfig);
    } else if (latestResult) {
      const subjectObj = SUBJECTS.find((s) => s.name === latestResult.subject) || SUBJECTS[0];
      setSelectedSubject(subjectObj);
      handleStartExam({
        subject: latestResult.subject,
        chapter: latestResult.chapter === 'সকল অধ্যায়' ? 'all' : latestResult.chapter,
        questionCount: latestResult.totalQuestions,
        timeLimitSeconds: latestResult.totalQuestions * 60
      });
    } else {
      navigateTo('/', 'home');
    }
  };

  // Auth Handlers
  const handleLoginSuccess = (loggedUser: AuthUser) => {
    setAuthUser(loggedUser);
    setUser((prev) => ({
      ...prev,
      name: loggedUser.name,
      school: loggedUser.school || prev.school
    }));
    setRedirectMessage(undefined);
    navigateTo('/', 'home');
  };

  const handleRegisterSuccess = (registeredUser: AuthUser) => {
    handleLoginSuccess(registeredUser);
  };

  const handleLogout = () => {
    logoutUser();
    setAuthUser(null);
    navigateTo('/', 'home');
  };

  const handleUpdateProfile = (updated: UserProfile) => {
    setUser(updated);
    saveUserProfile(updated);
  };

  const handleResetData = () => {
    if (window.confirm('তুমি কি সমস্ত পরীক্ষার তথ্য ও এক্সপি রিসেট করতে চাও?')) {
      localStorage.removeItem('class910_livemcq_user_v1');
      setUser(DEFAULT_USER_PROFILE);
      saveUserProfile(DEFAULT_USER_PROFILE);
      setIsProfileOpen(false);
    }
  };

  // Route 1: Secret Admin Route (and /admin redirect)
  const normalizedPath = (pathname.split('?')[0].replace(/\/$/, '') || '/').toLowerCase();
  const currentWindowPath =
    typeof window !== 'undefined' ? window.location.pathname.toLowerCase().replace(/\/$/, '') : '';

  if (normalizedPath === '/admin' || currentWindowPath === '/admin') {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', ADMIN_ROUTE);
    }
    return (
      <SecureAdminPage
        currentUser={authUser}
        onNavigateHome={() => navigateTo('/', 'home')}
        onNavigateLogin={() => navigateTo('/login', 'login')}
      />
    );
  }

  if (normalizedPath === ADMIN_ROUTE.toLowerCase() || currentWindowPath === ADMIN_ROUTE.toLowerCase()) {
    return (
      <SecureAdminPage
        currentUser={authUser}
        onNavigateHome={() => navigateTo('/', 'home')}
        onNavigateLogin={() => navigateTo('/login', 'login')}
      />
    );
  }

  return (
    <div
      className="min-h-screen font-sans selection:bg-[#6C5CE7] selection:text-white flex flex-col transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-main)' }}
    >
      {/* Navbar is visible on non-exam views */}
      {currentView !== 'exam' && (
        <Navbar
          user={user}
          authUser={authUser}
          currentTheme={currentTheme}
          onThemeChange={handleThemeChange}
          currentView={currentView}
          onNavigate={(view) => {
            setRedirectMessage(undefined);
            if (view === 'leaderboard') {
              navigateTo('/leaderboard', 'leaderboard');
            } else if (view === 'practice') {
              navigateTo('/practice', 'practice');
            } else if (view === 'mega-exam') {
              navigateTo('/mega-exam', 'mega-exam');
            } else if (view === 'home') {
              navigateTo('/', 'home');
            } else {
              setCurrentView(view);
            }
          }}
          onOpenProfile={() => setIsProfileOpen(true)}
          onLogout={handleLogout}
        />
      )}

      {/* Main Dynamic View Router */}
      <main className="flex-1">
        {currentView === 'home' && (
          <HomePage
            user={user}
            authUser={authUser}
            isLoggedIn={!!authUser}
            onSelectSubject={handleSelectSubject}
            onQuickStart={handleQuickStart}
            onNavigateVideos={() => setCurrentView('videos')}
            onNavigatePractice={() => navigateTo('/practice', 'practice')}
            onNavigateLogin={() => {
              setRedirectMessage('পরীক্ষা দেওয়ার জন্য অনুগ্রহ করে লগইন করুন।');
              setCurrentView('login');
            }}
          />
        )}

        {currentView === 'practice' && (
          <PracticePage
            currentUser={authUser}
            onStartExamWithFilter={handleStartExamWithFilter}
            onNavigateHome={() => navigateTo('/', 'home')}
          />
        )}

        {currentView === 'mega-exam' && (
          <WeeklyMegaExamPage
            currentUser={authUser}
            onNavigateLogin={() => {
              setRedirectMessage('মেগা এক্সামে অংশগ্রহণের জন্য অনুগ্রহ করে প্রথমে লগইন করুন।');
              setCurrentView('login');
            }}
            onNavigateHome={() => navigateTo('/', 'home')}
          />
        )}

        {currentView === 'videos' && (
          <VideosPage onBack={() => navigateTo('/', 'home')} />
        )}

        {currentView === 'login' && (
          <LoginPage
            onSuccess={handleLoginSuccess}
            onNavigateRegister={() => setCurrentView('register')}
            onNavigateForgotPassword={() => setIsForgotPasswordOpen(true)}
            onNavigateHome={() => navigateTo('/', 'home')}
            redirectMessage={redirectMessage}
          />
        )}

        {currentView === 'register' && (
          <RegisterPage
            onSuccess={handleRegisterSuccess}
            onNavigateLogin={() => setCurrentView('login')}
            onNavigateHome={() => navigateTo('/', 'home')}
          />
        )}

        {currentView === 'exam' && activeConfig && (
          <ExamHall
            subject={activeConfig.subject}
            chapter={activeConfig.chapter}
            initialQuestions={activeQuestions}
            timeLimitSeconds={activeConfig.timeLimitSeconds}
            currentUser={authUser}
            onFinishExam={handleFinishExam}
            onExitExam={() => navigateTo('/', 'home')}
          />
        )}

        {currentView === 'result' && latestResult && (
          <ResultPage
            result={latestResult}
            onRetake={handleRetakeExam}
            onViewLeaderboard={() => {
              const url = `/leaderboard?subject=${encodeURIComponent(latestResult.subject)}`;
              navigateTo(url, 'leaderboard');
            }}
            onGoHome={() => navigateTo('/', 'home')}
          />
        )}

        {currentView === 'leaderboard' && (
          <LeaderboardPage
            currentUser={authUser}
            onNavigateHome={() => navigateTo('/', 'home')}
            initialSubject={latestResult?.subject || selectedSubject?.name}
            onStartExam={(subjectName) => {
              if (!authUser) {
                setRedirectMessage('পরীক্ষা দেওয়ার জন্য অনুগ্রহ করে প্রথমে লগইন করুন।');
                setCurrentView('login');
              } else {
                const target = subjectName
                  ? SUBJECTS.find((s) => s.name === subjectName) || SUBJECTS[0]
                  : SUBJECTS[0];
                setSelectedSubject(target);
                setIsSetupOpen(true);
              }
            }}
          />
        )}
      </main>

      {/* Exam Setup Modal */}
      {isSetupOpen && selectedSubject && (
        <ExamSetupModal
          subject={selectedSubject}
          onClose={() => setIsSetupOpen(false)}
          onStartExam={handleStartExam}
        />
      )}

      {/* Forgot Password Modal */}
      {isForgotPasswordOpen && (
        <ForgotPasswordModal
          onClose={() => setIsForgotPasswordOpen(false)}
          onSuccess={() => {
            setCurrentView('login');
          }}
        />
      )}

      {/* Profile & Stats Modal */}
      {isProfileOpen && (
        <ProfileModal
          user={user}
          onClose={() => setIsProfileOpen(false)}
          onUpdateProfile={handleUpdateProfile}
          onResetData={handleResetData}
        />
      )}

      {/* Tension Free Science Footer */}
      {currentView !== 'exam' && (
        <footer
          className="border-t py-6 text-center text-xs transition-colors"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--card-border)',
            color: 'var(--text-muted)'
          }}
        >
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-[#6C5CE7]" />
              <span className="font-bold" style={{ color: 'var(--text-main)' }}>Tension Free Science</span>
              <span>—</span>
              <span>ভয় নয়, বিজ্ঞান হবে সহজ</span>
            </div>
            <div className="text-center text-xs sm:text-sm text-slate-500 dark:text-white/60">
              Developed with ❤️ by <span className="text-[#6C5CE7] dark:text-purple-400 font-bold">Kawsar Kayesh</span> | Powered by Tension Free Science Team
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://www.youtube.com/@TensionFreeScience"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-red-600 hover:underline font-bold"
              >
                <Youtube className="w-3.5 h-3.5" />
                <span>@TensionFreeScience</span>
              </a>
              <p className="text-slate-400">
                © ২০২৬ Tension Free Science. সর্বস্বত্ব সংরক্ষিত।
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
