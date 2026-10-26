import React, { useState, useEffect } from 'react';
import { VideoItem, ChannelInfo } from '../types/video.js';
import defaultVideos from '../data/videos.json' with { type: 'json' };
import { VideoPlayerModal } from './VideoPlayerModal.js';
import {
  Youtube,
  Play,
  Search,
  ExternalLink,
  ChevronLeft,
  RefreshCw,
  Eye,
  Clock,
  Radio,
  Users,
  Video
} from 'lucide-react';

interface VideosPageProps {
  onBack: () => void;
}

export const VideosPage: React.FC<VideosPageProps> = ({ onBack }) => {
  const [videos, setVideos] = useState<VideoItem[]>(defaultVideos as VideoItem[]);
  const [channel, setChannel] = useState<ChannelInfo>({
    title: 'Tension Free Science',
    description: "Bangladesh's Science channel for SSC & HSC students.",
    customUrl: '@tensionfreescience',
    avatar: 'https://yt3.ggpht.com/wr871i462CXIwS3tqtNl06Ef0yk_vSvA9hoD39Yp0f50zT9sjBKnkbrLljDvXj4ji-pFRcAzuA=s240-c-k-c0x00ffffff-no-rj',
    subscriberCount: '৪০',
    videoCount: '৮',
    viewCount: '৭২৩'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveSynced, setIsLiveSynced] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('সকল বিষয়');
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);

  const subjects = ['সকল বিষয়', 'পদার্থবিজ্ঞান', 'রসায়ন', 'জীববিজ্ঞান', 'সাধারণ গণিত', 'উচ্চতর গণিত', 'তথ্য ও যোগাযোগ প্রযুক্তি'];

  const fetchLiveContent = async () => {
    setIsLoading(true);
    try {
      const [videosRes, channelRes] = await Promise.all([
        fetch('/api/youtube/videos'),
        fetch('/api/youtube/channel')
      ]);

      if (videosRes.ok) {
        const text = await videosRes.text();
        if (!text.includes("<!doctype") && !text.includes("<html")) {
          const vData = JSON.parse(text);
          if (vData.videos && vData.videos.length > 0) {
            setVideos(vData.videos);
            setIsLiveSynced(true);
          }
        }
      }

      if (channelRes.ok) {
        const cText = await channelRes.text();
        if (!cText.includes("<!doctype") && !cText.includes("<html")) {
          const cData = JSON.parse(cText);
          if (cData.channel) {
            setChannel(cData.channel);
          }
        }
      }
    } catch (err) {
      console.warn('Using offline video collection:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveContent();
  }, []);

  const filteredVideos = videos.filter((v) => {
    const matchesSubject = selectedSubject === 'সকল বিষয়' || v.subject === selectedSubject;
    const matchesSearch =
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.chapter.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>হোমে ফিরে যাও</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLiveContent}
            disabled={isLoading}
            title="লাইভ চ্যানেল ডেটা রিফ্রেশ করুন"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#6C5CE7]' : ''}`} />
            <span className="hidden sm:inline">রিফ্রেশ</span>
          </button>

          <a
            href="https://www.youtube.com/@TensionFreeScience"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-200/50 active:scale-95 transition-all"
          >
            <Youtube className="w-4 h-4" />
            <span>@TensionFreeScience</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Hero Channel Showcase Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-10 mb-8 border shadow-lg bg-gradient-to-r from-red-600 via-rose-600 to-indigo-700 text-white">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold mb-3">
              <Radio className="w-3.5 h-3.5 text-red-200 animate-pulse" />
              <span>{isLiveSynced ? '🔴 YouTube API লাইভ সিঙ্কড' : 'অফিসিয়াল ইউটিউব ভিডিও ক্লাস'}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {channel.title} ক্লাস
            </h1>
            <p className="mt-2 text-sm sm:text-base text-white/90 leading-relaxed font-normal">
              নবম-দশম শ্রেণির পদার্থবিজ্ঞান, রসায়ন, জীববিজ্ঞান ও গণিতের জটিল টপিকগুলো পানির মতো সহজ ও অ্যানিমেশন সহকারে শিখুন।
            </p>

            {/* Live Stats Pills */}
            <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-bold">
              <span className="px-3 py-1 rounded-lg bg-white/15 backdrop-blur-sm flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5" />
                <span>{channel.videoCount} টি ভিডিও ক্লাস</span>
              </span>
              <span className="px-3 py-1 rounded-lg bg-white/15 backdrop-blur-sm flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>{channel.subscriberCount} সাবস্ক্রাইবার</span>
              </span>
              <span className="px-3 py-1 rounded-lg bg-white/15 backdrop-blur-sm flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>{channel.viewCount} মোট ভিউ</span>
              </span>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="https://www.youtube.com/@TensionFreeScience?sub_confirmation=1"
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-2xl bg-white text-red-600 hover:bg-slate-100 font-extrabold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-2"
              >
                <Youtube className="w-4 h-4 fill-red-600" />
                <span>YouTube Channel e Subscribe Koro</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Channel Avatar badge */}
          <div className="hidden md:flex flex-col items-center p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center shadow-lg">
            <img
              src={channel.avatar}
              alt={channel.title}
              className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover mb-3"
            />
            <span className="font-extrabold text-sm">{channel.title}</span>
            <span className="text-xs text-white/80">{channel.customUrl}</span>
          </div>
        </div>
      </div>

      {/* Search & Subject Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--card-border)' }}>
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedSubject === sub
                  ? 'bg-[#6C5CE7] text-white shadow-xs'
                  : 'border hover:opacity-80'
              }`}
              style={
                selectedSubject !== sub
                  ? {
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--card-border)',
                      color: 'var(--text-muted)'
                    }
                  : {}
              }
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ভিডিও বা অধ্যায় খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 transition-all"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--card-border)',
              color: 'var(--text-main)'
            }}
          />
        </div>
      </div>

      {/* Video Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {filteredVideos.map((video) => (
          <div
            key={video.id}
            onClick={() => setActiveVideo(video)}
            className="group rounded-3xl border overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--card-border)'
            }}
          >
            {/* Thumbnail with duration badge and play icon hover */}
            <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-115 transition-transform">
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                </div>
              </div>

              {/* Duration badge */}
              <span className="absolute bottom-2.5 right-2.5 bg-black/80 text-white text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {video.duration}
              </span>
            </div>

            {/* Video Meta Content */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold text-[#6C5CE7] bg-violet-50 dark:bg-violet-950/40 px-2.5 py-0.5 rounded-full">
                    {video.subject}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {video.chapter}
                  </span>
                </div>

                <h3 className="font-bold text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-[#6C5CE7] transition-colors" style={{ color: 'var(--text-main)' }}>
                  {video.title}
                </h3>
              </div>

              <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {video.views} ভিউ
                </span>
                <span className="font-semibold text-[#6C5CE7] group-hover:underline">
                  ভিডিও দেখুন →
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Video Player */}
      {activeVideo && (
        <VideoPlayerModal video={activeVideo} onClose={() => setActiveVideo(null)} />
      )}
    </div>
  );
};
