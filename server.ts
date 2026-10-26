import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

// Fallback generator for offline/unauthenticated environments
function generateFallbackMCQs(subject: string, chapter: string, count = 5) {
  const templates = [
    {
      q: `NCTB পাঠ্যপুস্তকের "${chapter}" অধ্যায়ের মূল আলোচ্য বিষয় অনুযায়ী নিচের কোনটি সবচেয়ে সঠিক?`,
      opts: [
        `অধ্যায়ের মৌলিক তত্ত্ব ও ব্যবহারিক প্রয়োগ`,
        `ঐতিহাসিক বিতর্ক ও কাল্পনিক ব্যাখ্যা`,
        `কেবলমাত্র বিদেশি গবেষণার অনুবাদ`,
        `শুধুমাত্র সংজ্ঞা মুখস্থ রাখা`
      ],
      correct: 0,
      exp: `এনসিটিবি নবম-দশম শ্রেণির কারিকুলামে "${chapter}" অধ্যায়ে তত্ত্বের পাশাপাশি বাস্তব জীবনের প্রয়োগের ওপর সর্বোচ্চ গুরুত্ব দেওয়া হয়েছে।`
    },
    {
      q: `"${chapter}" অধ্যায়ে বর্ণিত প্রধান ধারণার গাণিতিক বা সংজ্ঞাগত রূপটি কী?`,
      opts: [
        `বিষয়বস্তুর সুনির্দিষ্ট ও সার্বজনীন বৈজ্ঞানিক নিয়ম`,
        `অস্থির ও পরিবর্তনশীল লোককথা`,
        `কেবলমাত্র আনুমানিক ধারণা`,
        `অনিয়মিত পর্যবেক্ষণ`
      ],
      correct: 0,
      exp: `বোর্ড বইয়ের বর্ণনা অনুসারে সংশ্লিষ্ট অধ্যায়ের মৌলিক নিয়মটি সার্বজনীন ও সুনির্দিষ্ট।`
    },
    {
      q: `"${subject}" বিষয়ে "${chapter}" এর গুরুত্ব পরীক্ষার দৃষ্টিকোণ থেকে কীসের জন্য সবচেয়ে বেশি?`,
      opts: [
        `সৃজনশীল প্রশ্ন ও এমসিকিউ উভয় অংশে মূল ধারণা যাচাই করতে`,
        `কেবলমাত্র অতিরিক্ত পড়াশোনার জন্য`,
        `কোনো পরীক্ষায় এটি থেকে প্রশ্ন হয় না`,
        `শুধু চিত্র অঙ্কন করার জন্য`
      ],
      correct: 0,
      exp: `বোর্ড পরীক্ষায় "${chapter}" অধ্যায় থেকে নিয়মিত এমসিকিউ ও জ্ঞানমূলক/অনুধাবনমূলক প্রশ্ন এসে থাকে।`
    },
    {
      q: `"${chapter}" সম্পর্কিত কোনো সমস্যার সমাধানে শিক্ষার্থীদের প্রথম পদক্ষেপ কোনটি হওয়া উচিত?`,
      opts: [
        `মূল পাঠ্যবই মনোযোগ দিয়ে পড়ে সূত্র ও ধারণা স্পষ্ট করা`,
        `অজানা সূত্র সরাসরি প্রয়োগ করা`,
        `প্রশ্ন সমাধান এড়িয়ে যাওয়া`,
        `কেবলমাত্র অপশন অনুমান করা`
      ],
      correct: 0,
      exp: `সঠিক কনসেপ্ট ক্লিয়ারিং ছাড়া এমসিকিউতে ভালো নম্বর তোলা সম্ভব নয়, তাই পাঠ্যবই পড়া প্রধান শর্ত।`
    },
    {
      q: `নিচের কোন বৈশিষ্ট্যটি "${chapter}" অধ্যায়ের অন্তর্ভুক্ত বিষয়ের সাথে সামঞ্জস্যপূর্ণ?`,
      opts: [
        `যুক্তিগ্রাহ্য বিশ্লেষণ ও ধারাবাহিক সিদ্ধান্ত`,
        `অপ্রাসঙ্গিক অনুমিত তথ্য`,
        `অস্পষ্ট যুক্তি`,
        `কাল্পনিক অনুসিদ্ধান্ত`
      ],
      correct: 0,
      exp: `ক্লাস ৯-১০ এর বোর্ড সিলেবাসে প্রতিটি বৈজ্ঞানিক ও মানবিক ধারণার পেছনে সুনির্দিষ্ট যুক্তি রয়েছে।`
    }
  ];

  return templates.slice(0, count).map((t, idx) => ({
    id: `ai_gen_${Date.now()}_${idx}`,
    subject,
    chapter,
    question: t.q,
    options: t.opts,
    correctIndex: t.correct,
    explanation: t.exp,
    difficulty: 'medium',
    isAiGenerated: true
  }));
}

// API endpoint for generating new MCQs on the fly using Gemini
app.post('/api/generate-mcqs', async (req: Request, res: Response) => {
  const { subject, chapter, count = 5 } = req.body;

  if (!subject || !chapter) {
    return res.status(400).json({ error: 'Subject and chapter are required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({
      success: true,
      mcqs: generateFallbackMCQs(subject, chapter, Number(count)),
      source: 'offline_curated'
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const prompt = `You are an expert Bangladesh NCTB (জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড) curriculum developer and board examiner for Class 9-10 (নবম-দশম শ্রেণি).
Generate exactly ${count} completely new, 100% factually accurate, board-exam-quality Multiple Choice Questions (MCQs) in Bengali language for:
Subject: ${subject}
Chapter: ${chapter}

Each question must strictly adhere to the NCTB Class 9-10 textbook.
Rules:
1. All question text, options, and explanations must be in natural, proper Bengali.
2. Provide exactly 4 distinct options per question.
3. Mark the zero-based index of the correct option (0, 1, 2, or 3).
4. Provide an educational, thorough explanation in Bengali explaining why the answer is correct and educating the student.
5. Provide difficulty: "easy", "medium", or "hard".`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              difficulty: { type: Type.STRING }
            },
            required: ['question', 'options', 'correctIndex', 'explanation', 'difficulty']
          }
        }
      }
    });

    const rawText = response.text?.trim() || '[]';
    const parsed = JSON.parse(rawText);

    const formatted = parsed.map((item: any, idx: number) => ({
      id: `ai_${Date.now()}_${idx}`,
      subject,
      chapter,
      question: item.question,
      options: item.options,
      correctIndex: typeof item.correctIndex === 'number' ? item.correctIndex : 0,
      explanation: item.explanation,
      difficulty: item.difficulty || 'medium',
      isAiGenerated: true
    }));

    return res.json({
      success: true,
      mcqs: formatted,
      source: 'gemini_ai'
    });
  } catch (error: any) {
    console.error('Error generating MCQs with Gemini:', error);
    // Graceful fallback to verified NCTB structure
    return res.json({
      success: true,
      mcqs: generateFallbackMCQs(subject, chapter, Number(count)),
      source: 'offline_fallback'
    });
  }
});

// YouTube Data API Configuration
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "AIzaSyDJg_SEPngUHVDn7kJ1lvhwgokO43m3dyQ";
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "UCq7hbYweN2SwnuXQKL61weg";

function toBengaliNum(num: number | string): string {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
}

function parseIsoDuration(durationStr: string): string {
  if (!durationStr) return '১০:০০';
  const matches = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matches) return '১০:০০';
  const hours = parseInt(matches[1] || '0', 10);
  const minutes = parseInt(matches[2] || '0', 10);
  const seconds = parseInt(matches[3] || '0', 10);

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  let timeStr = '';
  if (hours > 0) {
    timeStr = `${hours}:${pad(minutes)}:${pad(seconds)}`;
  } else {
    timeStr = `${pad(minutes)}:${pad(seconds)}`;
  }
  return toBengaliNum(timeStr);
}

function inferSubjectAndChapter(title: string, desc: string): { subject: string; chapter: string } {
  const combined = `${title} ${desc}`.toLowerCase();
  
  if (combined.includes('chemistry') || combined.includes('রসায়ন') || combined.includes('cucl') || combined.includes('fe²') || combined.includes('মৌল') || combined.includes('জারণ')) {
    let chapter = 'সাধারণ রসায়ন';
    if (combined.includes('পর্যায় সারণি') || combined.includes('transition') || combined.includes('অবস্থান্তর')) chapter = 'পর্যায় সারণি';
    else if (combined.includes('বন্ধন') || combined.includes('যৌগ')) chapter = 'রাসায়নিক বন্ধন';
    else if (combined.includes('জারণ') || combined.includes('বিজারক')) chapter = 'জারণ-বিজারণ';
    else if (combined.includes('পরমাণুর গঠন') || combined.includes('electron')) chapter = 'পরমাণুর গঠন';
    return { subject: 'রসায়ন', chapter };
  }

  if (combined.includes('physics') || combined.includes('পদার্থ') || combined.includes('প্লবতা') || combined.includes('অভিক্ষেপ') || combined.includes('প্রতিধ্বনি') || combined.includes('fb=') || combined.includes('গতি')) {
    let chapter = 'সাধারণ পদার্থবিজ্ঞান';
    if (combined.includes('প্লবতা') || combined.includes('চাপ') || combined.includes('ঘনত্ব')) chapter = 'পদার্থের অবস্থা ও চাপ';
    else if (combined.includes('প্রতিধ্বনি') || combined.includes('শব্দ') || combined.includes('তরঙ্গ')) chapter = 'শব্দ ও তরঙ্গ';
    else if (combined.includes('অভিক্ষেপ') || combined.includes('ভেক্টর')) chapter = 'ভেক্টর ও বলবিদ্যা';
    else if (combined.includes('গতি') || combined.includes('বেগ')) chapter = 'গতি ও বল';
    return { subject: 'পদার্থবিজ্ঞান', chapter };
  }

  if (combined.includes('biology') || combined.includes('জীববিজ্ঞান') || combined.includes('কোষ') || combined.includes('মাইটোসিস')) {
    return { subject: 'জীববিজ্ঞান', chapter: 'কোষ বিভাজন' };
  }

  if (combined.includes('উচ্চতর গণিত') || combined.includes('higher math') || combined.includes('স্থানাঙ্ক')) {
    return { subject: 'উচ্চতর গণিত', chapter: 'স্থানাঙ্ক জ্যামিতি' };
  }

  if (combined.includes('গণিত') || combined.includes('math') || combined.includes('ত্রিকোণমিতি')) {
    return { subject: 'সাধারণ গণিত', chapter: 'ত্রিকোণমিতি' };
  }

  return { subject: 'বিজ্ঞান ও প্রযুক্তি', chapter: 'বোর্ড প্রস্তুতি' };
}

// In-memory cache for YouTube data
let cachedVideos: any[] | null = null;
let lastVideosFetchTime = 0;
let cachedChannelInfo: any | null = null;
let lastChannelFetchTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Endpoint: Fetch real YouTube Videos
app.get('/api/youtube/videos', async (_req: Request, res: Response) => {
  const now = Date.now();
  if (cachedVideos && now - lastVideosFetchTime < CACHE_TTL_MS) {
    return res.json({ success: true, videos: cachedVideos, source: 'cache' });
  }

  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${YOUTUBE_CHANNEL_ID}&part=snippet,id&order=date&maxResults=25&type=video`;
    const searchRes = await fetch(searchUrl);
    
    if (!searchRes.ok) {
      throw new Error(`YouTube API search failed: ${searchRes.statusText}`);
    }

    const searchData: any = await searchRes.json();
    const videoItems = searchData.items || [];
    
    if (videoItems.length === 0) {
      const fallbackPath = path.resolve(__dirname, 'src/data/videos.json');
      const fallbackData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
      return res.json({ success: true, videos: fallbackData, source: 'offline_json' });
    }

    const videoIds = videoItems.map((item: any) => item.id.videoId).join(',');
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?key=${YOUTUBE_API_KEY}&part=snippet,contentDetails,statistics&id=${videoIds}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData: any = await detailsRes.json();
    const detailsMap = new Map<string, any>();
    
    if (detailsData.items) {
      for (const item of detailsData.items) {
        detailsMap.set(item.id, item);
      }
    }

    const formattedVideos = videoItems.map((item: any, idx: number) => {
      const vid = item.id.videoId;
      const details = detailsMap.get(vid);
      const title = item.snippet.title || 'Tension Free Science Class';
      const desc = item.snippet.description || '';
      const { subject, chapter } = inferSubjectAndChapter(title, desc);
      const isoDuration = details?.contentDetails?.duration || 'PT10M';
      const rawViews = details?.statistics?.viewCount ? parseInt(details.statistics.viewCount, 10) : 100;
      const viewsBn = toBengaliNum(rawViews);
      const durationBn = parseIsoDuration(isoDuration);

      return {
        id: `yt_live_${vid}_${idx}`,
        videoId: vid,
        title,
        subject,
        chapter,
        duration: durationBn,
        views: viewsBn,
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        description: desc || `${subject} এর গুরুত্বপূর্ণ কনসেপ্ট ও বোর্ড প্রশ্ন সমাধান।`
      };
    });

    cachedVideos = formattedVideos;
    lastVideosFetchTime = now;

    return res.json({
      success: true,
      videos: formattedVideos,
      source: 'youtube_live'
    });
  } catch (err: any) {
    console.error('Error in /api/youtube/videos:', err.message);
    try {
      const fallbackPath = path.resolve(__dirname, 'src/data/videos.json');
      const fallbackData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
      return res.json({ success: true, videos: fallbackData, source: 'offline_fallback' });
    } catch {
      return res.status(500).json({ error: 'Failed to load videos' });
    }
  }
});

// Endpoint: Fetch Channel Details
app.get('/api/youtube/channel', async (_req: Request, res: Response) => {
  const now = Date.now();
  if (cachedChannelInfo && now - lastChannelFetchTime < CACHE_TTL_MS) {
    return res.json({ success: true, channel: cachedChannelInfo, source: 'cache' });
  }

  try {
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?key=${YOUTUBE_API_KEY}&id=${YOUTUBE_CHANNEL_ID}&part=snippet,statistics`;
    const channelRes = await fetch(channelUrl);
    
    if (!channelRes.ok) {
      throw new Error(`YouTube API channel failed: ${channelRes.statusText}`);
    }

    const channelData: any = await channelRes.json();
    const item = channelData.items?.[0];

    if (!item) {
      throw new Error('Channel not found');
    }

    const channelInfo = {
      title: item.snippet.title,
      description: item.snippet.description,
      customUrl: item.snippet.customUrl || '@tensionfreescience',
      avatar: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      subscriberCount: toBengaliNum(item.statistics.subscriberCount || '40'),
      videoCount: toBengaliNum(item.statistics.videoCount || '8'),
      viewCount: toBengaliNum(item.statistics.viewCount || '723')
    };

    cachedChannelInfo = channelInfo;
    lastChannelFetchTime = now;

    return res.json({ success: true, channel: channelInfo, source: 'youtube_live' });
  } catch (err: any) {
    console.error('Error in /api/youtube/channel:', err.message);
    return res.json({
      success: true,
      channel: {
        title: 'Tension Free Science',
        description: "Bangladesh's Science channel for SSC & HSC students.",
        customUrl: '@tensionfreescience',
        avatar: 'https://yt3.ggpht.com/wr871i462CXIwS3tqtNl06Ef0yk_vSvA9hoD39Yp0f50zT9sjBKnkbrLljDvXj4ji-pFRcAzuA=s240-c-k-c0x00ffffff-no-rj',
        subscriberCount: '৪০',
        videoCount: '৮',
        viewCount: '৭২৩'
      },
      source: 'offline_fallback'
    });
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Class 9-10 LiveMCQ server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
