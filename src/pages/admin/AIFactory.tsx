import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase.js';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import {
  AI_PROVIDERS,
  AIProviderConfig,
  QualityFilterConfig,
  GeneratedMCQQueueItem,
  getAvailableAI,
  getTodayKey,
  getTodayUsage,
  saveProviderKey,
  generateWithRotation,
  callAI,
  DEFAULT_PROMPTS,
  GROQ_MODELS,
  saveGroqModel
} from '../../lib/aiFactory.js';
import { LatexRenderer } from '../../components/LatexRenderer.js';
import { SUBJECTS } from '../../data/subjects.js';
import * as XLSX from 'xlsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Cpu,
  Power,
  Play,
  Pause,
  RotateCw,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  Sliders,
  ListFilter,
  FileSpreadsheet,
  Trash2,
  Eye,
  Key,
  ChevronDown,
  ChevronUp,
  Search,
  Plus,
  BookOpen,
  TrendingUp,
  ShieldCheck,
  Check,
  RefreshCw,
  Send
} from 'lucide-react';

interface PromptConfigItem {
  id: string;
  subject: string;
  chapter: string;
  type: string;
  role?: string;
  promptTemplate: string;
  qualityFilter: QualityFilterConfig;
  difficultyDistribution?: { medium: number; hard: number };
  isActive: boolean;
}

export const AIFactory: React.FC = () => {
  // Navigation sub-sections
  const [activeTab, setActiveTab] = useState<'control' | 'queue' | 'prompts' | 'keys' | 'reports'>('control');

  // Master Factory Control State
  const [isFactoryActive, setIsFactoryActive] = useState<boolean>(true);
  const [autoDailyMode, setAutoDailyMode] = useState<boolean>(true);
  const [dailyTargetPerChapter, setDailyTargetPerChapter] = useState<number>(250);
  const [isUnlimitedMode, setIsUnlimitedMode] = useState<boolean>(true);
  const [selectedGroqModel, setSelectedGroqModel] = useState<string>(
    (typeof window !== 'undefined' && localStorage.getItem('groq_model')) || 'llama-3.1-70b-versatile'
  );
  const [lastActionStatus, setLastActionStatus] = useState<string>('কারখানা প্রস্তুত — ৩টি AI সক্রিয় (আনলিমিটেড মোড)');

  // Generation In-Progress State
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState<{
    generatedCount: number;
    totalTarget: number;
    currentAI: string;
    logMessage: string;
  }>({
    generatedCount: 0,
    totalTarget: 0,
    currentAI: 'Gemini',
    logMessage: ''
  });
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  // Generation Form State
  const [genSubject, setGenSubject] = useState<string>('পদার্থবিজ্ঞান');
  const [genChapter, setGenChapter] = useState<string>('ভেক্টর');
  const [genType, setGenType] = useState<string>('মেডিকেল ও ভার্সিটি টাইপ');
  const [genCount, setGenCount] = useState<number>(25);
  const [genPreferredAI, setGenPreferredAI] = useState<'auto' | 'gemini' | 'groq' | 'deepseek'>('auto');

  // AI Keys & Config State
  const [keysInput, setKeysInput] = useState<{ [key in 'gemini' | 'groq' | 'deepseek']: string }>({
    gemini: AI_PROVIDERS.gemini.key,
    groq: AI_PROVIDERS.groq.key,
    deepseek: AI_PROVIDERS.deepseek.key
  });
  const [keyVisibility, setKeyVisibility] = useState<{ [key in 'gemini' | 'groq' | 'deepseek']: boolean }>({
    gemini: false,
    groq: false,
    deepseek: false
  });
  const [testingAI, setTestingAI] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ [provider: string]: string }>({});

  // Prompt Configurations
  const [promptConfigs, setPromptConfigs] = useState<PromptConfigItem[]>(DEFAULT_PROMPTS);
  const [isAddPromptModalOpen, setIsAddPromptModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptConfigItem | null>(null);

  // New Prompt Form
  const [newPromptForm, setNewPromptForm] = useState<PromptConfigItem>({
    id: '',
    subject: 'পদার্থবিজ্ঞান',
    chapter: 'ভেক্টর',
    type: 'বোর্ড প্রশ্ন',
    promptTemplate: DEFAULT_PROMPTS[0].promptTemplate,
    qualityFilter: {
      minLength: 20,
      mustHaveLatex: true,
      mustHaveExplanation: true,
      banWords: ['sohoj', 'easy', 'aul faul']
    },
    difficultyDistribution: { medium: 60, hard: 40 },
    isActive: true
  });
  const [newBanWordInput, setNewBanWordInput] = useState('');

  // Queue State (Review Tab)
  const [queueItems, setQueueItems] = useState<GeneratedMCQQueueItem[]>([]);
  const [queueFilterTab, setQueueFilterTab] = useState<'pending' | 'approved' | 'rejected' | 'good' | 'bad'>('pending');
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]);
  const [queueSearchQuery, setQueueSearchQuery] = useState('');
  const [queueSubjectFilter, setQueueSubjectFilter] = useState('all');
  const [previewItem, setPreviewItem] = useState<GeneratedMCQQueueItem | null>(null);

  // Daily Stats & Logs
  const [dailyStats, setDailyStats] = useState<any>({
    totalGenerated: 0,
    totalApproved: 0,
    totalRejected: 0,
    bySubject: {},
    byChapter: {},
    byAI: { gemini: 0, groq: 0, deepseek: 0 }
  });
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);
  const [reportDateRange, setReportDateRange] = useState<'today' | 'week' | 'all'>('today');

  // Today Usage State
  const [usageState, setUsageState] = useState(getTodayUsage());

  const today = getTodayKey();

  // 1. Load & Sync AI Control Config from Firestore
  useEffect(() => {
    const unsubControl = onSnapshot(doc(db, 'ai_control', 'config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.isFactoryActive === 'boolean') {
          setIsFactoryActive(data.isFactoryActive);
        }
        if (typeof data.autoDailyMode === 'boolean') {
          setAutoDailyMode(data.autoDailyMode);
        }
        if (data.dailyTargetPerChapter) {
          setDailyTargetPerChapter(data.dailyTargetPerChapter);
        }
        if (data.geminiKey) {
          saveProviderKey('gemini', data.geminiKey);
          setKeysInput((prev) => ({ ...prev, gemini: data.geminiKey }));
        }
        if (data.groqKey) {
          saveProviderKey('groq', data.groqKey);
          setKeysInput((prev) => ({ ...prev, groq: data.groqKey }));
        }
        if (data.deepseekKey) {
          saveProviderKey('deepseek', data.deepseekKey);
          setKeysInput((prev) => ({ ...prev, deepseek: data.deepseekKey }));
        }
      } else {
        // Pre-create initial control document
        setDoc(doc(db, 'ai_control', 'config'), {
          isFactoryActive: true,
          autoDailyMode: true,
          dailyTargetPerChapter: 250,
          geminiKey: AI_PROVIDERS.gemini.key,
          groqKey: AI_PROVIDERS.groq.key,
          deepseekKey: AI_PROVIDERS.deepseek.key,
          updatedAt: serverTimestamp()
        }).catch((err) => console.warn('Could not bootstrap ai_control:', err));
      }
    });

    // 2. Load Prompts Config from Firestore
    const unsubPrompts = onSnapshot(collection(db, 'ai_prompts_config'), (snap) => {
      if (!snap.empty) {
        const list: PromptConfigItem[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any)
        }));
        setPromptConfigs(list);
      } else {
        // Pre-seed default prompts
        DEFAULT_PROMPTS.forEach((dp) => {
          setDoc(doc(db, 'ai_prompts_config', dp.id), dp).catch(() => {});
        });
      }
    });

    // 3. Load Questions Queue
    const qQueue = query(collection(db, 'ai_questions_queue'), orderBy('createdAt', 'desc'), limit(150));
    const unsubQueue = onSnapshot(
      qQueue,
      (snap) => {
        const list: GeneratedMCQQueueItem[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any)
        }));
        setQueueItems(list);
      },
      (err) => console.warn('Queue listener error:', err)
    );

    // 4. Load Today's Daily Stats
    const unsubStats = onSnapshot(doc(db, 'ai_daily_stats', today), (snap) => {
      if (snap.exists()) {
        setDailyStats(snap.data());
      }
    });

    // 5. Load Generation Logs
    const qLogs = query(collection(db, 'ai_generation_logs'), orderBy('timestamp', 'desc'), limit(60));
    const unsubLogs = onSnapshot(
      qLogs,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setDailyLogs(list);
      },
      (err) => console.warn('Logs listener error:', err)
    );

    return () => {
      unsubControl();
      unsubPrompts();
      unsubQueue();
      unsubStats();
      unsubLogs();
    };
  }, [today]);

  // Refresh usage state periodically
  useEffect(() => {
    const timer = setInterval(() => {
      setUsageState(getTodayUsage());
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Master Switch Handler
  const handleToggleFactory = async () => {
    const nextState = !isFactoryActive;
    setIsFactoryActive(nextState);
    const msg = nextState
      ? `কারখানা চালু করা হয়েছে (${new Date().toLocaleTimeString('bn-BD')})`
      : `কারখানা অ্যাডমিন কর্তৃক বন্ধ করা হয়েছে (${new Date().toLocaleTimeString('bn-BD')})`;
    setLastActionStatus(msg);

    try {
      await updateDoc(doc(db, 'ai_control', 'config'), {
        isFactoryActive: nextState,
        lastToggled: serverTimestamp()
      });
    } catch {
      await setDoc(
        doc(db, 'ai_control', 'config'),
        { isFactoryActive: nextState, lastToggled: serverTimestamp() },
        { merge: true }
      );
    }
  };

  // Save Keys Handler
  const handleSaveKeys = async () => {
    saveProviderKey('gemini', keysInput.gemini);
    saveProviderKey('groq', keysInput.groq);
    saveProviderKey('deepseek', keysInput.deepseek);

    try {
      await setDoc(
        doc(db, 'ai_control', 'config'),
        {
          geminiKey: keysInput.gemini,
          groqKey: keysInput.groq,
          deepseekKey: keysInput.deepseek,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      alert('সবগুলো AI কী সফলভাবে সেভ করা হয়েছে!');
    } catch (e: any) {
      alert('কী সংরক্ষণ করতে ব্যর্থ: ' + e.message);
    }
  };

  // Test AI Key Connection
  const handleTestKey = async (providerId: 'gemini' | 'groq' | 'deepseek') => {
    setTestingAI(providerId);
    setTestResult((prev) => ({ ...prev, [providerId]: 'টেস্ট করা হচ্ছে...' }));
    const provider = AI_PROVIDERS[providerId];
    provider.key = keysInput[providerId];

    const testPrompt = 'Bangla 1 MCQ question on Physics Vector. Output JSON array strictly with 1 item.';

    try {
      const res = await callAI(testPrompt, provider);
      if (Array.isArray(res) && res.length > 0) {
        setTestResult((prev) => ({
          ...prev,
          [providerId]: '✅ সংযোগ সফল! AI সফলভাবে রেসপন্স করেছে।'
        }));
      } else {
        setTestResult((prev) => ({
          ...prev,
          [providerId]: '⚠️ রেসপন্স পাওয়া গেছে তবে উপযুক্ত ফরম্যাট নয়।'
        }));
      }
    } catch (err: any) {
      setTestResult((prev) => ({
        ...prev,
        [providerId]: `❌ ত্রুটি: ${err.message?.substring(0, 100)}`
      }));
    } finally {
      setTestingAI(null);
    }
  };

  // Manual MCQ Generation Launcher
  const handleStartManualGeneration = async () => {
    if (!isFactoryActive) {
      alert('কারখানা বর্তমানে বন্ধ রয়েছে! অনুগ্রহ করে ওপরের সুইচ থেকে কারখানা চালু করুন।');
      return;
    }

    setIsGenerating(true);
    setTerminalLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] 🚀 জেনারেশন শুরু: ${genSubject} - ${genChapter} (${genCount}টি MCQ)...`,
      ...prev
    ]);

    // Find matching prompt template or use default
    const matchingPrompt =
      promptConfigs.find((p) => p.subject === genSubject && p.chapter === genChapter) ||
      promptConfigs[0] ||
      DEFAULT_PROMPTS[0];

    try {
      const result = await generateWithRotation({
        subject: genSubject,
        chapter: genChapter,
        type: genType,
        count: genCount,
        promptTemplate: matchingPrompt.promptTemplate,
        qualityFilter: matchingPrompt.qualityFilter,
        promptId: matchingPrompt.id,
        preferredAI: genPreferredAI,
        checkIsActive: async () => {
          const snap = await getDoc(doc(db, 'ai_control', 'config'));
          return snap.exists() ? snap.data().isFactoryActive !== false : true;
        },
        onProgress: (p) => {
          setGenProgress(p);
          setTerminalLogs((prev) => [
            `[${new Date().toLocaleTimeString()}] [${p.currentAI}] ${p.logMessage}`,
            ...prev.slice(0, 40)
          ]);
        }
      });

      setTerminalLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] 🎉 সম্পন্ন! মোট তৈরি: ${result.stats.totalGenerated}টি (ভালো: ${result.stats.goodCount}, বাদ: ${result.stats.badCount})`,
        ...prev
      ]);
      setUsageState(getTodayUsage());
    } catch (err: any) {
      const isPerm =
        err?.message?.toLowerCase().includes('permission') ||
        err?.code === 'permission-denied' ||
        err?.message?.includes('Missing or insufficient permissions');
      const errorMsg = isPerm
        ? 'Firestore Rules Publish করুন - Part 1 এর rules (Firebase Console > Firestore > Rules)'
        : err.message;
      setTerminalLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] ❌ জেনারেশন ব্যর্থ: ${errorMsg}`,
        ...prev
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Queue Item Actions (Approve, Reject, Delete)
  const handleApproveItem = async (item: GeneratedMCQQueueItem) => {
    if (!item.id) return;
    try {
      // 1. Add to main questions collection
      await addDoc(collection(db, 'questions'), {
        subject: item.subject,
        chapter: item.chapter,
        question: item.question,
        options: item.options,
        correctIndex: item.correctAnswer,
        explanation: item.explanation,
        difficulty: item.difficulty === 'Hard' ? 'hard' : 'medium',
        isAiGenerated: true,
        aiGeneratedBy: item.aiGeneratedBy,
        qualityScore: item.qualityScore,
        createdAt: serverTimestamp()
      });

      // 2. Mark queue item as approved
      await updateDoc(doc(db, 'ai_questions_queue', item.id), {
        isApproved: true,
        isRejected: false,
        approvedAt: serverTimestamp()
      });

      // 3. Update stats
      await updateDoc(doc(db, 'ai_daily_stats', today), {
        totalApproved: (dailyStats.totalApproved || 0) + 1
      });
    } catch (err: any) {
      alert('অনুমোদনে সমস্যা: ' + err.message);
    }
  };

  const handleRejectItem = async (item: GeneratedMCQQueueItem, reason: string) => {
    if (!item.id) return;
    try {
      await updateDoc(doc(db, 'ai_questions_queue', item.id), {
        isApproved: false,
        isRejected: true,
        rejectionReason: reason,
        rejectedAt: serverTimestamp()
      });
    } catch (err: any) {
      alert('বাতিল করতে সমস্যা: ' + err.message);
    }
  };

  const handleDeleteQueueItem = async (id?: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'ai_questions_queue', id));
    } catch (err: any) {
      alert('মুছে ফেলতে সমস্যা: ' + err.message);
    }
  };

  // Bulk Actions
  const handleBulkApprove = async () => {
    const toApprove = queueItems.filter((q) => q.id && selectedQueueIds.includes(q.id) && !q.isApproved);
    for (const item of toApprove) {
      await handleApproveItem(item);
    }
    setSelectedQueueIds([]);
  };

  const handleBulkReject = async () => {
    const toReject = queueItems.filter((q) => q.id && selectedQueueIds.includes(q.id));
    for (const item of toReject) {
      await handleRejectItem(item, 'Bulk Rejected by Admin');
    }
    setSelectedQueueIds([]);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`আপনি কি নির্বাচিত ${selectedQueueIds.length}টি প্রশ্ন স্থায়ীভাবে মুছে ফেলতে চান?`)) return;
    for (const id of selectedQueueIds) {
      await handleDeleteQueueItem(id);
    }
    setSelectedQueueIds([]);
  };

  // Add / Edit Prompt Config
  const handleSavePromptConfig = async () => {
    try {
      const pId = editingPrompt ? editingPrompt.id : `prompt_${Date.now()}`;
      const payload = {
        ...newPromptForm,
        id: pId,
        updatedAt: serverTimestamp()
      };
      await setDoc(doc(db, 'ai_prompts_config', pId), payload);
      setIsAddPromptModalOpen(false);
      setEditingPrompt(null);
      alert('প্রম্পট কনফিগারেশন সফলভাবে সেভ করা হয়েছে!');
    } catch (err: any) {
      alert('সংরক্ষণ ত্রুটি: ' + err.message);
    }
  };

  const handleDeletePromptConfig = async (id: string) => {
    if (!window.confirm('আপনি কি এই প্রম্পটটি ডিলিট করতে চান?')) return;
    try {
      await deleteDoc(doc(db, 'ai_prompts_config', id));
    } catch (err: any) {
      alert('ডিলিট করতে সমস্যা: ' + err.message);
    }
  };

  // Download Excel Report
  const handleDownloadExcelReport = () => {
    const reportData = dailyLogs.map((log) => ({
      তারিখ: log.date,
      AI: log.aiUsed,
      বিষয়: log.subject,
      অধ্যায়: log.chapter,
      টাইপ: log.type,
      অনুরোধ: log.requestedCount,
      তৈরি: log.generatedCount,
      অনুমোদিত: log.approvedCount,
      বাতিল: log.rejectedCount,
      স্ট্যাটাস: log.status
    }));

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AI_Daily_Logs');
    XLSX.writeFile(wb, `tension-free-ai-report-${today}.xlsx`);
  };

  // Filtered Queue Items
  const filteredQueue = useMemo(() => {
    return queueItems.filter((q) => {
      // Sub-tab filter
      if (queueFilterTab === 'pending' && (q.isApproved || q.isRejected)) return false;
      if (queueFilterTab === 'approved' && !q.isApproved) return false;
      if (queueFilterTab === 'rejected' && !q.isRejected) return false;
      if (queueFilterTab === 'good' && q.qualityScore < 70) return false;
      if (queueFilterTab === 'bad' && q.qualityScore >= 70) return false;

      // Subject filter
      if (queueSubjectFilter !== 'all' && q.subject !== queueSubjectFilter) return false;

      // Search
      if (queueSearchQuery.trim()) {
        const query = queueSearchQuery.toLowerCase();
        return (
          q.question.toLowerCase().includes(query) ||
          q.chapter.toLowerCase().includes(query) ||
          q.explanation.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [queueItems, queueFilterTab, queueSubjectFilter, queueSearchQuery]);

  // Selected Chapter List for Active Subject
  const currentChapters = useMemo(() => {
    const found = SUBJECTS.find((s) => s.name === genSubject);
    return found ? found.chapters : ['ভেক্টর', 'গতিবিদ্যা', 'কাজ ও শক্তি', 'নিউটনিয়ান বলবিদ্যা'];
  }, [genSubject]);

  // Chart Data preparation
  const chartByChapter = useMemo(() => {
    const chapters = dailyStats.byChapter || {};
    return Object.keys(chapters).map((ch) => ({
      name: ch,
      count: chapters[ch] || 0
    }));
  }, [dailyStats]);

  const chartByAI = useMemo(() => {
    const byAI = dailyStats.byAI || {};
    return [
      { name: 'Gemini', value: byAI.gemini || 0, color: '#3B82F6' },
      { name: 'Groq', value: byAI.groq || 0, color: '#F97316' },
      { name: 'DeepSeek', value: byAI.deepseek || 0, color: '#10B981' }
    ].filter((item) => item.value > 0);
  }, [dailyStats]);

  // Active AI rotation indicator
  const availableAI = getAvailableAI(genPreferredAI);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Top Header & Master Switch Bar */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
              isFactoryActive
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-emerald-500/20'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              <Cpu className={`w-6 h-6 ${isFactoryActive ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white">
                  AI Auto MCQ Factory
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  isFactoryActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}>
                  {isFactoryActive ? 'ACTIVE (3 AI ROTATION)' : 'PAUSED'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                প্রতিদিন প্রতি অধ্যায়ে ২৫০টি করে স্বয়ংক্রিয় মানসম্মত MCQ তৈরির কেন্দ্র
              </p>
            </div>
          </div>

          {/* Master Control Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsUnlimitedMode(!isUnlimitedMode)}
              className={`px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all cursor-pointer ${
                isUnlimitedMode
                  ? 'bg-purple-600/30 text-purple-200 border-purple-500/50 hover:bg-purple-600/40 shadow-lg'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="আনলিমিটেড মোড সক্রিয় থাকলে কোনো দৈনিক লিমিটে জেনারেশন থামবে না"
            >
              <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
              <span>Unlimited Mode: {isUnlimitedMode ? 'ON (অবাধ)' : 'OFF'}</span>
            </button>

            <button
              onClick={handleToggleFactory}
              className={`px-6 py-3 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-all cursor-pointer ${
                isFactoryActive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30 active:scale-95'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30 active:scale-95 animate-pulse'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{isFactoryActive ? 'STOP FACTORY' : 'START FACTORY'}</span>
            </button>
          </div>
        </div>

        {/* Status ticker */}
        <div className="mt-4 pt-3 border-t border-slate-700/60 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>বর্তমান সক্রিয় AI: <strong className="text-indigo-300">{availableAI ? availableAI.name : 'সীমা শেষ'}</strong></span>
            <span className="text-slate-600">|</span>
            <span>পরবর্তী সুইচ: <strong className="text-amber-300">Gemini ➔ Groq ➔ DeepSeek</strong></span>
          </div>
          <span className="text-slate-400 italic">{lastActionStatus}</span>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-700/80 pb-3">
        <button
          onClick={() => setActiveTab('control')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'control'
              ? 'bg-[#6C5CE7] text-white shadow-md'
              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>কন্ট্রোল ও জেনারেশন</span>
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer relative ${
            activeTab === 'queue'
              ? 'bg-[#6C5CE7] text-white shadow-md'
              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>রিভিউ কিউ (Review Queue)</span>
          {queueItems.filter((q) => !q.isApproved && !q.isRejected).length > 0 && (
            <span className="bg-amber-500 text-slate-900 text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {queueItems.filter((q) => !q.isApproved && !q.isRejected).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('prompts')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'prompts'
              ? 'bg-[#6C5CE7] text-white shadow-md'
              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>প্রম্পট ফিল্টার সেটআপ</span>
        </button>

        <button
          onClick={() => setActiveTab('keys')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'keys'
              ? 'bg-[#6C5CE7] text-white shadow-md'
              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>৩টি AI কী ও কনফিগ</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-[#6C5CE7] text-white shadow-md'
              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>দৈনিক রিপোর্ট ও লগ</span>
        </button>
      </div>

      {/* SECTION A & D: CONTROL & GENERATION TAB */}
      {activeTab === 'control' && (
        <div className="space-y-6">
          {/* 4 Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>আজকের মোট তৈরি</span>
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-white mt-1">
                {dailyStats.totalGenerated || 0} <span className="text-xs font-normal text-slate-400">MCQ</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">দৈনিক টার্গেট: ২৫০ / অধ্যায়</p>
            </div>

            <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>অনুমোদন ও বাতিল</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                {dailyStats.totalApproved || 0}{' '}
                <span className="text-xs font-normal text-rose-400">
                  / {dailyStats.totalRejected || 0} বাতিল
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">স্বয়ংক্রিয় কোয়ালিটি ফিল্টার প্রয়োগকৃত</p>
            </div>

            <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>৩ AI ব্যবহার (Today)</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-1.5 py-0.5 rounded">
                  Unlimited
                </span>
              </div>
              <div className="space-y-1.5 mt-2">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-300">
                    <span>Gemini 2.5 Flash</span>
                    <span className="text-blue-300 font-bold">{usageState.gemini}টি জেনারেট</span>
                  </div>
                  <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-0.5">
                    <div
                      className="bg-blue-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, Math.max(10, (usageState.gemini % 100)))}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-300">
                    <span className="truncate max-w-[130px]">Groq ({selectedGroqModel.replace('llama-3.1-', '')})</span>
                    <span className="text-orange-300 font-bold">{usageState.groq}টি জেনারেট</span>
                  </div>
                  <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-0.5">
                    <div
                      className="bg-orange-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, Math.max(10, (usageState.groq % 100)))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>সক্রিয় AI রোবট</span>
                <RotateCw className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-lg font-bold text-teal-300 mt-1 truncate">
                {availableAI ? availableAI.name : 'সব লিমিট শেষ'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {availableAI ? availableAI.role : 'আগামীকাল ১২ টায় রিসেট হবে'}
              </p>
            </div>
          </div>

          {/* Generator Console Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-slate-800/80 border border-slate-700 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-white text-base">ম্যানুয়াল ও ব্যাচ জেনারেশন</h3>
                </div>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                  Rotation Engine
                </span>
              </div>

              {/* Subject Select */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">বিষয় নির্বাচন করুন</label>
                <select
                  value={genSubject}
                  onChange={(e) => setGenSubject(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chapter Select */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">অধ্যায়</label>
                <select
                  value={genChapter}
                  onChange={(e) => setGenChapter(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                >
                  {currentChapters.map((ch, idx) => (
                    <option key={idx} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Select */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">টাইপ / ক্যাটাগরি</label>
                <select
                  value={genType}
                  onChange={(e) => setGenType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                >
                  <option value="বোর্ড প্রশ্ন">বোর্ড প্রশ্ন</option>
                  <option value="মেডিকেল ও ভার্সিটি টাইপ">মেডিকেল ও ভার্সিটি টাইপ</option>
                  <option value="মেগা এক্সাম স্পেশাল">মেগা এক্সাম স্পেশাল</option>
                  <option value="সহজ প্র্যাকটিস">সহজ প্র্যাকটিস</option>
                  <option value="কঠিন ও জটিল">কঠিন ও জটিল</option>
                </select>
              </div>

              {/* Count & AI preference */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">MCQ সংখ্যা</label>
                  <select
                    value={genCount}
                    onChange={(e) => setGenCount(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                  >
                    <option value={10}>১০টি (টেস্ট)</option>
                    <option value={25}>২৫টি (১টি ব্যাচ)</option>
                    <option value={50}>৫০টি</option>
                    <option value={100}>১০০টি</option>
                    <option value={250}>২৫০টি (দৈনিক লক্ষ্য)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">AI নির্বাচন</label>
                  <select
                    value={genPreferredAI}
                    onChange={(e) => setGenPreferredAI(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                  >
                    <option value="auto">Auto 3 AI Rotation</option>
                    <option value="gemini">Gemini 2.5 Flash</option>
                    <option value="groq">Groq Llama 3.3</option>
                    <option value="deepseek">DeepSeek Chat</option>
                  </select>
                </div>
              </div>

              {/* Action Button */}
              <button
                disabled={isGenerating || !isFactoryActive}
                onClick={handleStartManualGeneration}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#6C5CE7] to-indigo-500 hover:from-[#5848df] hover:to-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 transition-all active:scale-95"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>প্রশ্ন তৈরি হচ্ছে ({genProgress.generatedCount} / {genCount})...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>এখনই {genCount}টি MCQ তৈরি শুরু করুন</span>
                  </>
                )}
              </button>
            </div>

            {/* Live Terminal & Logs Console */}
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="font-bold text-slate-300">Live AI Factory Terminal</span>
                </div>
                <span className="text-[10px] text-slate-500">Auto-Rotating</span>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[340px] space-y-1.5 p-2 bg-slate-950/80 rounded-xl border border-slate-800/80">
                {terminalLogs.length === 0 ? (
                  <div className="text-slate-600 py-10 text-center italic">
                    কোনো রানিং প্রসেস নেই। "এখনই MCQ তৈরি শুরু করুন" বাটনে ক্লিক করুন।
                  </div>
                ) : (
                  terminalLogs.map((log, index) => (
                    <div
                      key={index}
                      className={`leading-relaxed break-words ${
                        log.includes('❌')
                          ? 'text-rose-400'
                          : log.includes('🎉')
                          ? 'text-emerald-400 font-bold'
                          : log.includes('🚀')
                          ? 'text-indigo-300'
                          : 'text-slate-300'
                      }`}
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION E: QUALITY FILTER & REVIEW QUEUE TAB */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Sub-tabs & Filter Controls */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Queue status filter pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setQueueFilterTab('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    queueFilterTab === 'pending'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-700/60 text-slate-300'
                  }`}
                >
                  পেন্ডিং রিভিউ ({queueItems.filter((q) => !q.isApproved && !q.isRejected).length})
                </button>

                <button
                  onClick={() => setQueueFilterTab('approved')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    queueFilterTab === 'approved'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'bg-slate-700/60 text-slate-300'
                  }`}
                >
                  অনুমোদিত ({queueItems.filter((q) => q.isApproved).length})
                </button>

                <button
                  onClick={() => setQueueFilterTab('rejected')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    queueFilterTab === 'rejected'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'bg-slate-700/60 text-slate-300'
                  }`}
                >
                  বাতিল ({queueItems.filter((q) => q.isRejected).length})
                </button>

                <button
                  onClick={() => setQueueFilterTab('good')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    queueFilterTab === 'good'
                      ? 'bg-blue-500 text-white shadow-xs'
                      : 'bg-slate-700/60 text-slate-300'
                  }`}
                >
                  উচ্চমান (&gt;৭০) ({queueItems.filter((q) => q.qualityScore >= 70).length})
                </button>

                <button
                  onClick={() => setQueueFilterTab('bad')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    queueFilterTab === 'bad'
                      ? 'bg-purple-500 text-white shadow-xs'
                      : 'bg-slate-700/60 text-slate-300'
                  }`}
                >
                  নিম্নমান (&lt;৭০) ({queueItems.filter((q) => q.qualityScore < 70).length})
                </button>
              </div>

              {/* Bulk actions */}
              {selectedQueueIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {selectedQueueIds.length}টি নির্বাচিত
                  </span>
                  <button
                    onClick={handleBulkApprove}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    অনুমোদন করুন
                  </button>
                  <button
                    onClick={handleBulkReject}
                    className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    বাতিল করুন
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    ডিলিট
                  </button>
                </div>
              )}
            </div>

            {/* Search and subject filter */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-700/60">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={queueSearchQuery}
                  onChange={(e) => setQueueSearchQuery(e.target.value)}
                  placeholder="প্রশ্ন বা ব্যাখ্যার মাঝে খুঁজুন..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={queueSubjectFilter}
                onChange={(e) => setQueueSubjectFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
              >
                <option value="all">সকল বিষয়</option>
                {SUBJECTS.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Queue Items List Table */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
            {filteredQueue.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                এই ক্যাটাগরিতে কোনো প্রশ্ন নেই।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/70 border-b border-slate-700/80 text-[11px] font-bold text-slate-400 uppercase">
                      <th className="py-3 px-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={
                            selectedQueueIds.length > 0 &&
                            selectedQueueIds.length === filteredQueue.length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedQueueIds(filteredQueue.map((q) => q.id || ''));
                            } else {
                              setSelectedQueueIds([]);
                            }
                          }}
                        />
                      </th>
                      <th className="py-3 px-3">AI / বিষয় ও অধ্যায়</th>
                      <th className="py-3 px-4">প্রশ্ন (KaTeX রেন্ডার)</th>
                      <th className="py-3 px-3 text-center">স্কোর</th>
                      <th className="py-3 px-3 text-center">স্ট্যাটাস</th>
                      <th className="py-3 px-3 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filteredQueue.map((item) => {
                      const isSelected = !!item.id && selectedQueueIds.includes(item.id);
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-700/30 transition-colors ${
                            isSelected ? 'bg-indigo-950/40' : ''
                          }`}
                        >
                          <td className="py-3.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (!item.id) return;
                                if (e.target.checked) {
                                  setSelectedQueueIds((prev) => [...prev, item.id!]);
                                } else {
                                  setSelectedQueueIds((prev) => prev.filter((id) => id !== item.id));
                                }
                              }}
                            />
                          </td>

                          <td className="py-3.5 px-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-indigo-300 border border-slate-700 inline-block mb-1">
                              {item.aiGeneratedBy}
                            </span>
                            <div className="font-bold text-white text-xs">{item.subject}</div>
                            <div className="text-[11px] text-slate-400">{item.chapter}</div>
                          </td>

                          <td className="py-3.5 px-4 max-w-md">
                            <LatexRenderer
                              text={item.question}
                              className="font-semibold text-slate-200 line-clamp-2"
                            />
                            <div className="mt-1 text-[11px] text-slate-400 line-clamp-1 italic">
                              উ: {item.options[item.correctAnswer] || 'N/A'}
                            </div>
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                item.qualityScore >= 70
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : item.qualityScore >= 50
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {item.qualityScore}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            {item.isApproved ? (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-md border border-emerald-500/40">
                                অনুমোদিত
                              </span>
                            ) : item.isRejected ? (
                              <span
                                title={item.rejectionReason}
                                className="text-[10px] bg-rose-500/20 text-rose-300 font-bold px-2 py-0.5 rounded-md border border-rose-500/40"
                              >
                                বাতিল
                              </span>
                            ) : (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-md border border-amber-500/40">
                                অপেক্ষমান
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setPreviewItem(item)}
                                title="প্রিভিউ দেখুন"
                                className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {!item.isApproved && (
                                <button
                                  onClick={() => handleApproveItem(item)}
                                  title="অনুমোদন করুন"
                                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {!item.isRejected && (
                                <button
                                  onClick={() => handleRejectItem(item, 'Admin Rejected')}
                                  title="বাতিল করুন"
                                  className="p-1.5 rounded-lg bg-amber-600/60 hover:bg-amber-600 text-white cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteQueueItem(item.id)}
                                title="মুছে ফেলুন"
                                className="p-1.5 rounded-lg bg-rose-600/40 hover:bg-rose-600 text-rose-200 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION C: PROMPTS CONFIG SETUP TAB */}
      {activeTab === 'prompts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base">প্রম্পট ফিল্টার ও কোয়ালিটি রুলস</h3>
              <p className="text-xs text-slate-400">
                ৩টি AI রোল অনুযায়ী কাস্টমাইজড প্রম্পট ও ফিল্টারিং রুলস
              </p>
            </div>
            <button
              onClick={() => {
                setEditingPrompt(null);
                setNewPromptForm({
                  id: '',
                  subject: 'পদার্থবিজ্ঞান',
                  chapter: 'ভেক্টর',
                  type: 'বোর্ড প্রশ্ন',
                  promptTemplate: DEFAULT_PROMPTS[0].promptTemplate,
                  qualityFilter: {
                    minLength: 20,
                    mustHaveLatex: true,
                    mustHaveExplanation: true,
                    banWords: ['sohoj', 'easy']
                  },
                  difficultyDistribution: { medium: 60, hard: 40 },
                  isActive: true
                });
                setIsAddPromptModalOpen(true);
              }}
              className="px-4 py-2 bg-[#6C5CE7] hover:bg-[#5848df] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন প্রম্পট যোগ করুন</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {promptConfigs.map((p) => (
              <div
                key={p.id}
                className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 shadow-md flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {p.role || p.type}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        p.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <h4 className="font-bold text-white text-sm">
                    {p.subject} — {p.chapter}
                  </h4>
                  <div className="text-xs text-slate-400 mt-1">
                    টাইপ: <strong className="text-slate-300">{p.type}</strong>
                  </div>

                  <div className="mt-3 p-2.5 bg-slate-900 rounded-xl text-[11px] text-slate-300 line-clamp-4 font-mono">
                    {p.promptTemplate}
                  </div>

                  <div className="mt-3 text-[11px] text-slate-400 space-y-1">
                    <div>কমপক্ষে দৈর্ঘ্য: <strong>{p.qualityFilter?.minLength || 20} অক্ষর</strong></div>
                    <div>LaTeX বাধ্যতামূলক: <strong>{p.qualityFilter?.mustHaveLatex ? 'হ্যাঁ' : 'না'}</strong></div>
                    <div>ব্যাখ্যা বাধ্যতামূলক: <strong>{p.qualityFilter?.mustHaveExplanation ? 'হ্যাঁ' : 'না'}</strong></div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setEditingPrompt(p);
                      setNewPromptForm(p);
                      setIsAddPromptModalOpen(true);
                    }}
                    className="text-xs text-indigo-400 font-bold hover:underline cursor-pointer"
                  >
                    এডিট করুন
                  </button>
                  <button
                    onClick={() => handleDeletePromptConfig(p.id)}
                    className="text-xs text-rose-400 font-bold hover:underline cursor-pointer"
                  >
                    ডিলিট
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION B: 3 AI KEYS & CONFIG TAB */}
      {activeTab === 'keys' && (
        <div className="space-y-6">
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 shadow-lg space-y-5">
            <div>
              <h3 className="font-bold text-white text-base">৩টি AI প্রোভাইডারের এপিআই কী ও রোলস</h3>
              <p className="text-xs text-slate-400">
                এখানে প্রদত্ত কীগুলো ব্রাউজার এবং ফায়ারবেসে স্বয়ংক্রিয়ভাবে সংরক্ষিত থাকে।
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Card 1: Gemini */}
              <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-4 shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                      G
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">Gemini 2.5 Flash</div>
                      <div className="text-[10px] text-blue-300">MAIN MCQ MAKER</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">
                    আনলিমিটেড মোড
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">
                  {AI_PROVIDERS.gemini.role}
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Google AI Studio Key
                  </label>
                  <div className="relative">
                    <input
                      type={keyVisibility.gemini ? 'text' : 'password'}
                      value={keysInput.gemini}
                      onChange={(e) => setKeysInput({ ...keysInput, gemini: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setKeyVisibility({ ...keyVisibility, gemini: !keyVisibility.gemini })}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    disabled={testingAI === 'gemini'}
                    onClick={() => handleTestKey('gemini')}
                    className="w-full py-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {testingAI === 'gemini' ? 'টেস্ট চলছে...' : 'কী সংযোগ টেস্ট করুন'}
                  </button>
                  {testResult.gemini && (
                    <div className="mt-2 text-[10px] text-slate-300 p-2 bg-slate-950 rounded-lg">
                      {testResult.gemini}
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: Groq */}
              <div className="bg-slate-900 border border-orange-500/30 rounded-2xl p-4 shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs">
                      Q
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">Groq Llama 3.1</div>
                      <div className="text-[10px] text-orange-300">HARD MCQ MAKER</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full font-bold">
                    আনলিমিটেড মোড
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">
                  {AI_PROVIDERS.groq.role}
                </p>

                {/* Groq Model Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Groq মডেল (ডিফল্ট: 70b, অটো-ফলব্যাক সক্রিয়)
                  </label>
                  <select
                    value={selectedGroqModel}
                    onChange={(e) => {
                      setSelectedGroqModel(e.target.value);
                      saveGroqModel(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-orange-500"
                  >
                    {GROQ_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Groq Cloud API Key
                  </label>
                  <div className="relative">
                    <input
                      type={keyVisibility.groq ? 'text' : 'password'}
                      value={keysInput.groq}
                      onChange={(e) => setKeysInput({ ...keysInput, groq: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setKeyVisibility({ ...keyVisibility, groq: !keyVisibility.groq })}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    disabled={testingAI === 'groq'}
                    onClick={() => handleTestKey('groq')}
                    className="w-full py-2 bg-orange-600/30 hover:bg-orange-600/50 text-orange-200 border border-orange-500/40 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {testingAI === 'groq' ? 'টেস্ট চলছে...' : 'কী সংযোগ টেস্ট করুন'}
                  </button>
                  {testResult.groq && (
                    <div className="mt-2 text-[10px] text-slate-300 p-2 bg-slate-950 rounded-lg">
                      {testResult.groq}
                    </div>
                  )}
                </div>
              </div>

              {/* Card 3: DeepSeek */}
              <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      D
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">DeepSeek Chat</div>
                      <div className="text-[10px] text-emerald-300">MEGA EXAM & EXP</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    ফলব্যাক সুরক্ষিত
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">
                  {AI_PROVIDERS.deepseek.role} (ব্যালেন্স শেষ হলে স্বয়ংক্রিয়ভাবে Gemini গ্রহণ করবে)
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    DeepSeek API Key
                  </label>
                  <div className="relative">
                    <input
                      type={keyVisibility.deepseek ? 'text' : 'password'}
                      value={keysInput.deepseek}
                      onChange={(e) => setKeysInput({ ...keysInput, deepseek: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setKeyVisibility({ ...keyVisibility, deepseek: !keyVisibility.deepseek })}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    disabled={testingAI === 'deepseek'}
                    onClick={() => handleTestKey('deepseek')}
                    className="w-full py-2 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {testingAI === 'deepseek' ? 'টেস্ট চলছে...' : 'কী সংযোগ টেস্ট করুন'}
                  </button>
                  {testResult.deepseek && (
                    <div className="mt-2 text-[10px] text-slate-300 p-2 bg-slate-950 rounded-lg">
                      {testResult.deepseek}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveKeys}
              className="px-6 py-3 bg-[#6C5CE7] hover:bg-[#5848df] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-2"
            >
              <Key className="w-4 h-4" />
              <span>সবগুলো AI কী স্থায়ীভাবে সংরক্ষণ করুন</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION F: DAILY REPORT & ANALYTICS TAB */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-bold text-white text-base">দৈনিক রিপোর্ট ও অ্যানালিটিক্স</h3>
              <p className="text-xs text-slate-400">প্রতিটি অধ্যায়ের উৎপাদন ও ৩টি AI এর কর্মক্ষমতা</p>
            </div>

            <button
              onClick={handleDownloadExcelReport}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>এক্সেল রিপোর্ট ডাউনলোড করুন (XLSX)</span>
            </button>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-slate-800/80 border border-slate-700 rounded-2xl p-5 shadow-lg">
              <h4 className="font-bold text-white text-xs mb-4">অধ্যায়ভিত্তিক MCQ উৎপাদন চার্ট</h4>
              {chartByChapter.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-500 text-xs italic">
                  আজকে এখনো পর্যন্ত কোনো প্রশ্ন তৈরি করা হয়নি।
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartByChapter}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                      <YAxis stroke="#94A3B8" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', color: '#FFF' }}
                      />
                      <Bar dataKey="count" fill="#6C5CE7" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="lg:col-span-4 bg-slate-800/80 border border-slate-700 rounded-2xl p-5 shadow-lg">
              <h4 className="font-bold text-white text-xs mb-4">AI অনুযায়ী ব্যবহার অনুপাত</h4>
              {chartByAI.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-500 text-xs italic">
                  কোনো AI ব্যবহারের ডেটা নেই।
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartByAI}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartByAI.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', color: '#FFF' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Daily Logs Table */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-700">
              <h4 className="font-bold text-white text-xs">সাম্প্রতিক জেনারেশন লগসমূহ</h4>
            </div>
            {dailyLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">কোনো লগ পাওয়া যায়নি।</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-700 text-[11px] font-bold text-slate-400 uppercase">
                      <th className="py-2.5 px-4">তারিখ ও সময়</th>
                      <th className="py-2.5 px-4">AI</th>
                      <th className="py-2.5 px-4">অধ্যায়</th>
                      <th className="py-2.5 px-4">টাইপ</th>
                      <th className="py-2.5 px-4 text-center">অনুরোধ</th>
                      <th className="py-2.5 px-4 text-center">সফল</th>
                      <th className="py-2.5 px-4 text-right">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {dailyLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-700/20">
                        <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                          {log.date}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-indigo-300">{log.aiUsed}</td>
                        <td className="py-2.5 px-4 font-semibold text-white">{log.chapter}</td>
                        <td className="py-2.5 px-4 text-slate-300">{log.type}</td>
                        <td className="py-2.5 px-4 text-center">{log.requestedCount}</td>
                        <td className="py-2.5 px-4 text-center font-bold text-emerald-400">
                          {log.generatedCount}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.status === 'success'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUESTION PREVIEW MODAL */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                {previewItem.aiGeneratedBy} • {previewItem.subject} - {previewItem.chapter}
              </span>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-slate-400 hover:text-white cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 mb-1">প্রশ্ন (LaTeX):</h4>
              <div className="p-3 bg-slate-900 rounded-xl text-white font-medium text-sm">
                <LatexRenderer text={previewItem.question} />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 mb-2">অপশনসমূহ:</h4>
              <div className="grid grid-cols-2 gap-2">
                {previewItem.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-xs font-medium ${
                      idx === previewItem.correctAnswer
                        ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200 font-bold'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    <LatexRenderer text={opt} />
                  </div>
                ))}
              </div>
            </div>

            {previewItem.explanation && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 mb-1">ব্যাখ্যা:</h4>
                <div className="p-3 bg-slate-900 rounded-xl text-slate-300 text-xs">
                  <LatexRenderer text={previewItem.explanation} />
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 border border-slate-600 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                বন্ধ করুন
              </button>
              <button
                onClick={() => {
                  handleApproveItem(previewItem);
                  setPreviewItem(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                অনুমোদন করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT PROMPT CONFIG MODAL */}
      {isAddPromptModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <h3 className="font-bold text-white text-base">
                {editingPrompt ? 'প্রম্পট কনফিগারেশন এডিট' : 'নতুন প্রম্পট ফিল্টার তৈরি'}
              </h3>
              <button
                onClick={() => setIsAddPromptModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">বিষয়</label>
                <select
                  value={newPromptForm.subject}
                  onChange={(e) => setNewPromptForm({ ...newPromptForm, subject: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white outline-none"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">অধ্যায়</label>
                <input
                  type="text"
                  value={newPromptForm.chapter}
                  onChange={(e) => setNewPromptForm({ ...newPromptForm, chapter: e.target.value })}
                  placeholder="যেমন: ভেক্টর"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">টাইপ</label>
                <select
                  value={newPromptForm.type}
                  onChange={(e) => setNewPromptForm({ ...newPromptForm, type: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white outline-none"
                >
                  <option value="বোর্ড প্রশ্ন">বোর্ড প্রশ্ন</option>
                  <option value="মেডিকেল ও ভার্সিটি টাইপ">মেডিকেল ও ভার্সিটি টাইপ</option>
                  <option value="মেগা এক্সাম স্পেশাল">মেগা এক্সাম স্পেশাল</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                প্রম্পট টেমপ্লেট ({'{count}'}, {'{subject}'}, {'{chapter}'}, {'{type}'})
              </label>
              <textarea
                rows={5}
                value={newPromptForm.promptTemplate}
                onChange={(e) => setNewPromptForm({ ...newPromptForm, promptTemplate: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none font-mono"
              />
            </div>

            <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-3 space-y-2">
              <h4 className="text-xs font-bold text-indigo-300">কোয়ালিটি ফিল্টার রুলস:</h4>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPromptForm.qualityFilter.mustHaveLatex}
                    onChange={(e) =>
                      setNewPromptForm({
                        ...newPromptForm,
                        qualityFilter: { ...newPromptForm.qualityFilter, mustHaveLatex: e.target.checked }
                      })
                    }
                  />
                  <span>LaTeX ($...$) বাধ্যতামূলক</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPromptForm.qualityFilter.mustHaveExplanation}
                    onChange={(e) =>
                      setNewPromptForm({
                        ...newPromptForm,
                        qualityFilter: {
                          ...newPromptForm.qualityFilter,
                          mustHaveExplanation: e.target.checked
                        }
                      })
                    }
                  />
                  <span>ব্যাখ্যা বাধ্যতামূলক</span>
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  নিষিদ্ধ শব্দসমূহ (Ban words):
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {newPromptForm.qualityFilter.banWords.map((word, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[11px] flex items-center gap-1"
                    >
                      <span>{word}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setNewPromptForm({
                            ...newPromptForm,
                            qualityFilter: {
                              ...newPromptForm.qualityFilter,
                              banWords: newPromptForm.qualityFilter.banWords.filter((w) => w !== word)
                            }
                          })
                        }
                        className="cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBanWordInput}
                    onChange={(e) => setNewBanWordInput(e.target.value)}
                    placeholder="নতুন নিষিদ্ধ শব্দ লিখুন..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newBanWordInput.trim()) {
                        setNewPromptForm({
                          ...newPromptForm,
                          qualityFilter: {
                            ...newPromptForm.qualityFilter,
                            banWords: [...newPromptForm.qualityFilter.banWords, newBanWordInput.trim()]
                          }
                        });
                        setNewBanWordInput('');
                      }
                    }}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    যোগ
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setIsAddPromptModalOpen(false)}
                className="px-4 py-2 border border-slate-600 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                onClick={handleSavePromptConfig}
                className="px-5 py-2 bg-[#6C5CE7] hover:bg-[#5848df] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                প্রম্পট সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIFactory;
