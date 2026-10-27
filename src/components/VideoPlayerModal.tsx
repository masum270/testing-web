import React, { useEffect } from 'react';
import { VideoItem, getEmbedUrl } from '../types/video.js';
import { X, ExternalLink, Eye, Clock } from 'lucide-react';

interface VideoPlayerModalProps {
  video: VideoItem;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ video, onClose }) => {
  // Close on Escape and lock background scroll while open
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
    >
      <div
        className="relative w-full max-w-4xl rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[92vh]"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--card-border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full aspect-video bg-black">
          <iframe
            className="absolute inset-0 w-full h-full"
            src={getEmbedUrl(video.videoId)}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto">
          <h3 className="text-base sm:text-lg font-bold leading-snug" style={{ color: 'var(--text-main)' }}>
            {video.title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            {video.subject && <span className="font-semibold text-[#6C5CE7]">{video.subject}</span>}
            {video.duration && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {video.duration}
              </span>
            )}
            {video.views && (
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {video.views} ভিউ
              </span>
            )}
          </div>
          {video.description && (
            <p className="mt-3 text-sm whitespace-pre-line" style={{ color: 'var(--text-muted)' }}>
              {video.description}
            </p>
          )}
          <a
            href={`https://www.youtube.com/watch?v=${video.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#6C5CE7] hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            YouTube-এ দেখুন
          </a>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          aria-label="বন্ধ করুন"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
