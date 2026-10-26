import { db } from '../firebase.js';
import {
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp
} from 'firebase/firestore';

export interface AIProviderConfig {
  id: 'gemini' | 'groq' | 'deepseek';
  name: string;
  apiUrl: string;
  key: string;
  freeLimit: number;
  used: number;
  role: string;
  model: string;
}

export interface QualityFilterConfig {
  minLength: number;
  mustHaveLatex: boolean;
  mustHaveExplanation: boolean;
  banWords: string[];
  autoApproveScore?: number;
}

export interface GeneratedMCQQueueItem {
  id?: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  subject: string;
  chapter: string;
  type: string;
  difficulty: 'Medium' | 'Hard' | 'Easy';
  aiGeneratedBy: string;
  qualityScore: number;
  isApproved: boolean;
  isRejected: boolean;
  rejectionReason?: string;
  createdAt: any;
  date: string;
  promptId?: string;
}

export interface GroqModelConfig {
  id: string;
  name: string;
  isDefault?: boolean;
}

export const GROQ_MODELS: GroqModelConfig[] = [
  { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B Versatile', isDefault: true },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', isDefault: false },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B 32k', isDefault: false },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B IT', isDefault: false }
];

export const DEFAULT_AI_KEYS = {
  gemini: 'AQ.Ab8RN6JLgxZ4SpotVvhP3O80iuSv57JE4fVyEzKNk3Moj0DiCg',
  groq: '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',
  deepseek: 'sk-682f0d9fb7564cb4b9794c06d0a84b4f'
};

export const AI_PROVIDERS: Record<'gemini' | 'groq' | 'deepseek', AIProviderConfig> = {
  gemini: {
    id: 'gemini',
    name: 'Gemini 1.5 Flash',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=',
    key: (typeof window !== 'undefined' && localStorage.getItem('gemini_key')) || DEFAULT_AI_KEYS.gemini,
    freeLimit: 999999, // Unlimited Mode
    used: 0,
    role: 'MAIN MCQ MAKER - Medium quality basic clear',
    model: 'gemini-1.5-flash'
  },
  groq: {
    id: 'groq',
    name: 'Groq Llama 3.1',
    apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
    key: (typeof window !== 'undefined' && localStorage.getItem('groq_key')) || DEFAULT_AI_KEYS.groq,
    freeLimit: 999999, // Unlimited Mode
    used: 0,
    role: 'HARD MCQ MAKER - Hard + Admission type',
    model: 'llama-3.1-70b-versatile'
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek Chat',
    apiUrl: 'https://api.deepseek.com/chat/completions',
    key: (typeof window !== 'undefined' && localStorage.getItem('deepseek_key')) || DEFAULT_AI_KEYS.deepseek,
    freeLimit: 999999, // Unlimited Mode
    used: 0,
    role: 'MEGA EXAM + EXPLANATION MAKER - Mega exam special + Detailed explanation',
    model: 'deepseek-chat'
  }
};

/**
 * Get today date key YYYY-MM-DD
 */
export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Sync active provider keys from localStorage and Firestore
 */
export function refreshProviderKeys() {
  if (typeof window === 'undefined') return;
  AI_PROVIDERS.gemini.key = localStorage.getItem('gemini_key') || DEFAULT_AI_KEYS.gemini;
  AI_PROVIDERS.groq.key = localStorage.getItem('groq_key') || DEFAULT_AI_KEYS.groq;
  AI_PROVIDERS.deepseek.key = localStorage.getItem('deepseek_key') || DEFAULT_AI_KEYS.deepseek;

  const savedGroqModel = localStorage.getItem('groq_model');
  if (savedGroqModel) {
    AI_PROVIDERS.groq.model = savedGroqModel;
  }
}

export function saveProviderKey(provider: 'gemini' | 'groq' | 'deepseek', key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`${provider}_key`, key);
    AI_PROVIDERS[provider].key = key;
  }
}

export function saveGroqModel(model: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('groq_model', model);
    AI_PROVIDERS.groq.model = model;
  }
}

/**
 * Load today's usage stats
 */
export function getTodayUsage(): { [key in 'gemini' | 'groq' | 'deepseek']: number } {
  if (typeof window === 'undefined') return { gemini: 0, groq: 0, deepseek: 0 };
  const today = getTodayKey();
  try {
    const raw = localStorage.getItem(`ai_usage_stats_${today}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        gemini: parsed.gemini || 0,
        groq: parsed.groq || 0,
        deepseek: parsed.deepseek || 0
      };
    }
  } catch {}
  return { gemini: 0, groq: 0, deepseek: 0 };
}

export function recordUsage(provider: 'gemini' | 'groq' | 'deepseek', count: number) {
  if (typeof window === 'undefined') return;
  const today = getTodayKey();
  const current = getTodayUsage();
  current[provider] = (current[provider] || 0) + count;
  AI_PROVIDERS[provider].used = current[provider];
  localStorage.setItem(`ai_usage_stats_${today}`, JSON.stringify(current));
}

/**
 * Unlimited mode rotation:
 * Returns first AI with a key set. If a preferred AI is specified, uses that if configured.
 * Never blocks on daily limit.
 */
export function getAvailableAI(
  preferred?: 'gemini' | 'groq' | 'deepseek' | 'auto'
): AIProviderConfig | null {
  refreshProviderKeys();
  const usage = getTodayUsage();
  AI_PROVIDERS.gemini.used = usage.gemini;
  AI_PROVIDERS.groq.used = usage.groq;
  AI_PROVIDERS.deepseek.used = usage.deepseek;

  if (preferred && preferred !== 'auto') {
    const prov = AI_PROVIDERS[preferred];
    if (prov.key && prov.key.trim().length > 0) {
      return prov;
    }
  }

  // Priority order: gemini -> groq -> deepseek
  const order: ('gemini' | 'groq' | 'deepseek')[] = ['gemini', 'groq', 'deepseek'];
  for (const p of order) {
    const prov = AI_PROVIDERS[p];
    if (prov.key && prov.key.trim().length > 0) {
      return prov;
    }
  }

  return AI_PROVIDERS.gemini;
}

/**
 * Extract JSON array safely from model output
 */
function cleanAndParseJSON(rawText: string): any[] {
  let cleaned = rawText.trim();

  // Strip Markdown code block if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }

  cleaned = cleaned.trim();

  // Find array bounds [ ... ]
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');

  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const jsonSub = cleaned.substring(firstBracket, lastBracket + 1);
    try {
      const parsed = JSON.parse(jsonSub);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  // Fallback to direct parse
  const direct = JSON.parse(cleaned);
  if (Array.isArray(direct)) return direct;
  if (direct && Array.isArray(direct.questions)) return direct.questions;
  if (direct && Array.isArray(direct.mcqs)) return direct.mcqs;
  throw new Error('Could not parse valid JSON array from AI response');
}

/**
 * Direct call to specified AI provider with automatic model fallback for Groq
 * and automatic 402 balance fallback for DeepSeek
 */
export async function callAI(
  prompt: string,
  provider: AIProviderConfig,
  groqModelOverride?: string
): Promise<any[]> {
  if (!provider.key) {
    throw new Error(`${provider.name} এর API Key প্রদান করা হয়নি!`);
  }

  if (provider.id === 'gemini') {
    const endpoint = `${provider.apiUrl}${encodeURIComponent(provider.key.trim())}`;
    const payload = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.6,
        responseMimeType: 'application/json'
      }
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API Error (${res.status}): ${errText.substring(0, 200)}`);
    }

    const data = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Gemini response did not contain candidates or content');
    }
    return cleanAndParseJSON(candidateText);
  } else if (provider.id === 'groq') {
    // Groq model fallback list: default + fallbacks
    const candidateModels = groqModelOverride
      ? [groqModelOverride, ...GROQ_MODELS.map((m) => m.id).filter((id) => id !== groqModelOverride)]
      : [provider.model || 'llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'];

    let lastError: Error | null = null;

    for (const modelName of candidateModels) {
      try {
        const payload = {
          model: modelName,
          messages: [
            {
              role: 'system',
              content:
                'You are a high-standard NCTB Bangladesh HSC & Admission question setter. Always respond strictly in valid JSON array format. Never wrap output in commentary.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 8000
        };

        const res = await fetch(provider.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${provider.key.trim()}`
          },
          body: JSON.stringify(payload)
        });

        if (res.status === 404) {
          // Model deprecated or not found on Groq, try next fallback
          console.warn(`Groq model ${modelName} returned 404, falling back to next model...`);
          continue;
        }

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Groq (${modelName}) Error (${res.status}): ${errText.substring(0, 150)}`);
        }

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error(`Groq (${modelName}) returned empty choice content`);
        }
        return cleanAndParseJSON(content);
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error('All Groq candidate models failed');
  } else if (provider.id === 'deepseek') {
    const payload = {
      model: provider.model || 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content:
            'You are a high-standard NCTB Bangladesh HSC & Admission question setter. Always respond strictly in valid JSON array format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 4096
    };

    const res = await fetch(provider.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.key.trim()}`
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 402) {
      // 402 Insufficient Balance: Automatically fallback to Gemini as requested
      console.warn('DeepSeek balance finished (402), switching to Gemini...');
      return callAI(prompt, AI_PROVIDERS.gemini);
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`DeepSeek Error (${res.status}): ${errText.substring(0, 200)}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('DeepSeek returned empty choice content');
    }
    return cleanAndParseJSON(content);
  }

  throw new Error(`Unsupported provider: ${provider.id}`);
}

/**
 * Universal fallback call: try Gemini ➔ Groq ➔ DeepSeek ➔ Gemini
 */
export async function callWithFallback(prompt: string): Promise<any[]> {
  refreshProviderKeys();

  // Try 1: Gemini
  try {
    return await callAI(prompt, AI_PROVIDERS.gemini);
  } catch (err1) {
    console.warn('Gemini call failed, trying Groq...', err1);
  }

  // Try 2: Groq with primary model
  try {
    return await callAI(prompt, AI_PROVIDERS.groq, 'llama-3.1-70b-versatile');
  } catch (err2) {
    console.warn('Groq primary failed, trying Groq fallback (llama-3.1-8b-instant)...', err2);
  }

  // Try 3: Groq with instant fallback
  try {
    return await callAI(prompt, AI_PROVIDERS.groq, 'llama-3.1-8b-instant');
  } catch (err3) {
    console.warn('Groq instant failed, trying DeepSeek...', err3);
  }

  // Try 4: DeepSeek
  try {
    return await callAI(prompt, AI_PROVIDERS.deepseek);
  } catch (err4) {
    console.warn('DeepSeek failed, final attempt with Gemini...', err4);
  }

  // Final fallback to Gemini
  return await callAI(prompt, AI_PROVIDERS.gemini);
}

/**
 * Quality Score Calculator (0 - 100)
 */
export function calculateQuality(
  q: any,
  filter?: QualityFilterConfig
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const minLen = filter?.minLength || 20;
  const questionText = (q.question || '').trim();

  // 1. Length Check (+20 pts)
  if (questionText.length >= minLen) {
    score += 20;
  } else {
    reasons.push(`প্রশ্ন খুব ছোট (${questionText.length} < ${minLen})`);
  }

  // 2. LaTeX Check (+25 pts)
  const hasLatex =
    questionText.includes('$') ||
    questionText.includes('\\frac') ||
    questionText.includes('\\sqrt') ||
    questionText.includes('\\vec') ||
    (q.explanation || '').includes('$');

  if (hasLatex) {
    score += 25;
  } else if (filter?.mustHaveLatex) {
    reasons.push('প্রয়োজনীয় LaTeX চিহ্ন নেই');
  } else {
    score += 15;
  }

  // 3. Explanation Check (+25 pts)
  const explanation = (q.explanation || '').trim();
  if (explanation.length >= 15) {
    score += 25;
  } else if (explanation.length > 0) {
    score += 10;
  } else if (filter?.mustHaveExplanation) {
    reasons.push('কোনো ব্যাখ্যা দেওয়া হয়নি');
  }

  // 4. Options Quality Check (+15 pts)
  const options = Array.isArray(q.options) ? q.options : [];
  if (options.length === 4) {
    const trimmed = options.map((o: any) => String(o).trim());
    const unique = new Set(trimmed);
    if (unique.size === 4 && !trimmed.some((t: string) => t.length === 0)) {
      score += 15;
    } else {
      reasons.push('অপশন ডুপ্লিকেট বা অসম্পূর্ণ');
    }
  } else {
    reasons.push(`অপশন ৪টি নেই (আছে ${options.length}টি)`);
  }

  // 5. Correct Answer Index (+15 pts)
  const ansIdx = Number(q.correctAnswer);
  if (!isNaN(ansIdx) && ansIdx >= 0 && ansIdx <= 3) {
    score += 15;
  } else {
    reasons.push('সঠিক উত্তরের সূচক ভুল (০-৩ হতে হবে)');
  }

  // 6. Ban Words Deduction (-35 pts)
  const banList = filter?.banWords || ['sohoj', 'easy question', 'aul faul', 'ফালতু', 'সহজ প্রশ্ন'];
  const fullText = `${questionText} ${options.join(' ')} ${explanation}`.toLowerCase();
  for (const b of banList) {
    if (b.trim() && fullText.includes(b.trim().toLowerCase())) {
      score = Math.max(0, score - 35);
      reasons.push(`নিষিদ্ধ শব্দ (${b}) পাওয়া গেছে`);
      break;
    }
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reasons
  };
}

/**
 * 3 AI Rotation MCQ Generation System with Unlimited Mode
 */
export async function generateWithRotation(options: {
  subject: string;
  chapter: string;
  type: string;
  count: number;
  promptTemplate: string;
  qualityFilter?: QualityFilterConfig;
  promptId?: string;
  preferredAI?: 'gemini' | 'groq' | 'deepseek' | 'auto';
  onProgress?: (progress: {
    generatedCount: number;
    totalTarget: number;
    currentAI: string;
    logMessage: string;
  }) => void;
  checkIsActive?: () => Promise<boolean>;
}): Promise<{
  generated: GeneratedMCQQueueItem[];
  stats: {
    totalRequested: number;
    totalGenerated: number;
    byAI: { [key: string]: number };
    goodCount: number;
    badCount: number;
  };
}> {
  const {
    subject,
    chapter,
    type,
    count,
    promptTemplate,
    qualityFilter,
    promptId,
    preferredAI = 'auto',
    onProgress,
    checkIsActive
  } = options;

  let remaining = count;
  const results: GeneratedMCQQueueItem[] = [];
  const byAIStats: { [key: string]: number } = { gemini: 0, groq: 0, deepseek: 0 };
  let goodCount = 0;
  let badCount = 0;
  const today = getTodayKey();

  const providerOrder: ('gemini' | 'groq' | 'deepseek')[] = ['gemini', 'groq', 'deepseek'];
  let currentProviderIndex = preferredAI !== 'auto' ? providerOrder.indexOf(preferredAI) : 0;
  if (currentProviderIndex === -1) currentProviderIndex = 0;

  while (remaining > 0) {
    if (checkIsActive) {
      const active = await checkIsActive();
      if (!active) {
        onProgress?.({
          generatedCount: results.length,
          totalTarget: count,
          currentAI: 'Stopped',
          logMessage: 'কারখানা অ্যাডমিন কর্তৃক বন্ধ করা হয়েছে।'
        });
        break;
      }
    }

    const providerId = providerOrder[currentProviderIndex % providerOrder.length];
    const ai = AI_PROVIDERS[providerId];
    const batchSize = Math.min(remaining, 15);

    onProgress?.({
      generatedCount: results.length,
      totalTarget: count,
      currentAI: ai.name,
      logMessage: `${ai.name} দিয়ে ${batchSize}টি প্রশ্ন তৈরি হচ্ছে (${chapter})...`
    });

    let formattedPrompt = promptTemplate
      .replace(/\{count\}/g, String(batchSize))
      .replace(/\{subject\}/g, subject)
      .replace(/\{chapter\}/g, chapter)
      .replace(/\{type\}/g, type)
      .replace(/\{difficulty\}/g, type.includes('মেডিকেল') || type.includes('ভার্সিটি') ? 'Hard' : 'Medium');

    try {
      const rawMcqs = await callAI(formattedPrompt, ai);

      if (!Array.isArray(rawMcqs) || rawMcqs.length === 0) {
        throw new Error('AI returned an empty array of MCQs');
      }

      recordUsage(ai.id, rawMcqs.length);
      byAIStats[ai.id] = (byAIStats[ai.id] || 0) + rawMcqs.length;

      for (const item of rawMcqs) {
        const { score, reasons } = calculateQuality(item, qualityFilter);
        const isGood = score >= 70;
        if (isGood) goodCount++;
        else badCount++;

        const queueItem: GeneratedMCQQueueItem = {
          question: item.question || '',
          options: Array.isArray(item.options) ? item.options.map(String) : [],
          correctAnswer: Number(item.correctAnswer ?? 0),
          explanation: item.explanation || '',
          subject: subject,
          chapter: chapter,
          type: type,
          difficulty: item.difficulty === 'Hard' ? 'Hard' : 'Medium',
          aiGeneratedBy: ai.name,
          qualityScore: score,
          isApproved: false,
          isRejected: score < 40,
          rejectionReason: score < 40 ? reasons.join(', ') : undefined,
          createdAt: serverTimestamp(),
          date: today,
          promptId: promptId || 'default'
        };

        try {
          const docRef = await addDoc(collection(db, 'ai_questions_queue'), queueItem);
          queueItem.id = docRef.id;
        } catch (dbErr) {
          console.warn('Queue save warning:', dbErr);
        }

        results.push(queueItem);
      }

      remaining -= rawMcqs.length;

      onProgress?.({
        generatedCount: results.length,
        totalTarget: count,
        currentAI: ai.name,
        logMessage: `${ai.name} সফলভাবে ${rawMcqs.length}টি প্রশ্ন তৈরি করেছে!`
      });

      // Rotate to next AI for fair distributed workload
      currentProviderIndex++;
    } catch (err: any) {
      console.warn(`AI call failed with ${ai.name}, rotating to next AI:`, err);
      onProgress?.({
        generatedCount: results.length,
        totalTarget: count,
        currentAI: ai.name,
        logMessage: `${ai.name} ব্যর্থ হয়েছে (${err.message?.slice(0, 70)})। পরবর্তী AI তে সুইচ করা হচ্ছে...`
      });
      currentProviderIndex++;
    }
  }

  try {
    const dailyStatsRef = doc(db, 'ai_daily_stats', today);
    await setDoc(
      dailyStatsRef,
      {
        date: today,
        totalGenerated: increment(results.length),
        totalApproved: increment(0),
        totalRejected: increment(badCount),
        [`bySubject.${subject}`]: increment(results.length),
        [`byChapter.${chapter}`]: increment(results.length),
        'byAI.gemini': increment(byAIStats.gemini || 0),
        'byAI.groq': increment(byAIStats.groq || 0),
        'byAI.deepseek': increment(byAIStats.deepseek || 0),
        lastUpdated: serverTimestamp()
      },
      { merge: true }
    );

    await addDoc(collection(db, 'ai_generation_logs'), {
      date: today,
      timestamp: serverTimestamp(),
      subject,
      chapter,
      type,
      requestedCount: count,
      generatedCount: results.length,
      approvedCount: 0,
      rejectedCount: badCount,
      aiUsed: Object.keys(byAIStats).filter((k) => byAIStats[k] > 0).join(', ') || 'None',
      status: results.length > 0 ? 'success' : 'failed',
      promptUsed: promptTemplate.substring(0, 200)
    });
  } catch (statErr) {
    console.warn('Logging error:', statErr);
  }

  return {
    generated: results,
    stats: {
      totalRequested: count,
      totalGenerated: results.length,
      byAI: byAIStats,
      goodCount,
      badCount
    }
  };
}

export const DEFAULT_PROMPTS = [
  {
    id: 'gemini-main',
    subject: 'পদার্থবিজ্ঞান',
    chapter: 'ভেক্টর',
    type: 'বোর্ড প্রশ্ন',
    role: 'Gemini (Main Medium Basic Clear)',
    promptTemplate: `You are an expert Bangladeshi HSC/Admission teacher for Tension Free Science.
Create {count} HIGH QUALITY MCQ for Subject: {subject} Chapter: {chapter} Type: {type} Difficulty: Medium.
RULES:
- ONLY from NCTB + Dr. Shahjahan Tapan/Amir Hossain Ishak book for this chapter.
- Clear concept teaching, 30/30 in exam.
- Math: Use LaTeX format like: $\\sqrt{x}$, $\\frac{a}{b}$, $\\vec{A} \\cdot \\vec{B} = AB\\cos\\theta$, $H_2SO_4$.
- Output strictly a JSON array without markdown formatting:
[{"question":"LaTeX...","options":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":0,"explanation":"Bangla explanation with LaTeX","subject":"{subject}","chapter":"{chapter}","type":"{type}","difficulty":"Medium"}]
- Exactly {count} items, valid JSON.`,
    qualityFilter: {
      minLength: 20,
      mustHaveLatex: true,
      mustHaveExplanation: true,
      banWords: ['sohoj', 'easy question', 'aul faul']
    },
    difficultyDistribution: { medium: 70, hard: 30 },
    isActive: true
  },
  {
    id: 'groq-hard',
    subject: 'পদার্থবিজ্ঞান',
    chapter: 'ভেক্টর',
    type: 'মেডিকেল ও ভার্সিটি টাইপ',
    role: 'Groq (Hard Admission)',
    promptTemplate: `You are an expert Bangladeshi HSC & University Admission question maker for Tension Free Science.
Create {count} HARD & ADMISSION STYLE MCQ for Subject: {subject} Chapter: {chapter} Type: {type} Difficulty: Hard.
RULES:
- Calculation heavy, tricky, from past Dhaka University, BUET, Medical admission question patterns.
- High level analytical thinking, no simple textbook definition questions.
- Math: Use proper LaTeX syntax: $\\vec{P} \\times \\vec{Q}$, $\\sin^2\\theta$, $\\Delta t = \\frac{d}{v}$.
- Output strictly a JSON array without markdown formatting:
[{"question":"LaTeX...","options":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":0,"explanation":"Bangla step-by-step calculation with LaTeX","subject":"{subject}","chapter":"{chapter}","type":"{type}","difficulty":"Hard"}]
- Exactly {count} items, valid JSON.`,
    qualityFilter: {
      minLength: 25,
      mustHaveLatex: true,
      mustHaveExplanation: true,
      banWords: ['easy', 'সহজ']
    },
    difficultyDistribution: { medium: 30, hard: 70 },
    isActive: true
  },
  {
    id: 'deepseek-mega',
    subject: 'পদার্থবিজ্ঞান',
    chapter: 'ভেক্টর',
    type: 'মেগা এক্সাম স্পেশাল',
    role: 'DeepSeek (Mega Exam + Explanation)',
    promptTemplate: `You are a Senior Academic Specialist creating Model Test & Mega Exam questions for Tension Free Science.
Create {count} MEGA EXAM SPECIAL MCQ for Subject: {subject} Chapter: {chapter} Type: {type}.
RULES:
- 30% basic concept, 70% deep analytical questions.
- DETAILED EXPLANATION in Bengali explaining why the correct option is right AND why other 3 options are wrong.
- Math: Use LaTeX format: $\\int_{a}^{b} f(x)dx$, $\\lambda = \\frac{h}{p}$.
- Output strictly a JSON array without markdown formatting:
[{"question":"LaTeX...","options":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":0,"explanation":"Detailed Bengali explanation with LaTeX proof","subject":"{subject}","chapter":"{chapter}","type":"{type}","difficulty":"Hard"}]
- Exactly {count} items, valid JSON.`,
    qualityFilter: {
      minLength: 25,
      mustHaveLatex: true,
      mustHaveExplanation: true,
      banWords: ['aul faul']
    },
    difficultyDistribution: { medium: 40, hard: 60 },
    isActive: true
  }
];
