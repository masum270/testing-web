import React from 'react';
import { VideoItem, getEmbedUrl } from '../types/video.js';
import { X, Youtube, Share2, ExternalLink } from 'lucide-react';

interface VideoPlayerModalProps {
  video: VideoItem;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ video, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[92vh]"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div 
          className="p-4 px-5 flex items-center justify-between border-b"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
              <Youtube className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[11px] font-bold text-[#6C5CE7] bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded-md">
                {video.subject} • {video.chapter}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center transition-all cursor-pointer"
            style={{ color: 'var(--text-main)' }}
            aria-label="ভিডিও বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Container (16:9 Aspect Ratio) */}
        <div className="relative w-full aspect-video bg-black">
          <iframe
            src={getEmbedUrl(video.videoId)}
            title={video.title}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Bottom Details & Subscribe Banner */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold leading-snug" style={{ color: 'var(--text-main)' }}>
                {video.title}
              </h2>
              <div className="flex items-center gap-3 text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                <span>সময়কাল: {video.duration}</span>
                <span>•</span>
                <span>দেখেছেন: {video.views} শিক্ষার্থী</span>
              </div>
            </div>

            {/* Subscribe Button */}
            <a
              href="https://www.youtube.com/@TensionFreeScience?sub_confirmation=1"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-red-200/50 shrink-0 self-start active:scale-95 transition-all"
            >
              <Youtube className="w-4 h-4 fill-white" />
              <span>YouTube Channel e Subscribe Koro</span>
              <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
            </a>
          </div>

          <p className="text-sm leading-relaxed p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border" style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
            {video.description}
          </p>
        </div>
      </div>
    </div>
  );
};
