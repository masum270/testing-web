export interface VideoItem {
  id: string;
  videoId: string;
  title: string;
  subject: string;
  chapter: string;
  duration: string;
  views: string;
  thumbnail: string;
  description: string;
}

export function getEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
}

export interface ChannelInfo {
  title: string;
  description: string;
  customUrl: string;
  avatar: string;
  subscriberCount: string;
  videoCount: string;
  viewCount: string;
}
