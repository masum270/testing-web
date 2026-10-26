export type ThemeId = 'light' | 'dark' | 'nature' | 'ocean' | 'sunset' | 'tfs';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  nameEn: string;
  color: string;
  bgPreview: string;
}

export const AVAILABLE_THEMES: ThemeConfig[] = [
  {
    id: 'light',
    name: 'লাইট মোড',
    nameEn: 'Clean White',
    color: '#6C5CE7',
    bgPreview: '#F8F9FF'
  },
  {
    id: 'dark',
    name: 'মিডনাইট ডার্ক',
    nameEn: 'Midnight Blue',
    color: '#818CF8',
    bgPreview: '#0F172A'
  },
  {
    id: 'nature',
    name: 'সবুজ প্রকৃতি',
    nameEn: 'Emerald Nature',
    color: '#059669',
    bgPreview: '#F0FDF4'
  },
  {
    id: 'ocean',
    name: 'নীল সমুদ্র',
    nameEn: 'Ocean Breeze',
    color: '#2563EB',
    bgPreview: '#EFF6FF'
  },
  {
    id: 'sunset',
    name: 'সানসেট অরেঞ্জ',
    nameEn: 'Warm Sunset',
    color: '#EA580C',
    bgPreview: '#FFF7ED'
  },
  {
    id: 'tfs',
    name: 'TFS স্পেশাল',
    nameEn: 'Brand Violet',
    color: '#A78BFA',
    bgPreview: '#1F1947'
  }
];
