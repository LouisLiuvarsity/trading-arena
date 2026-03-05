import { useT } from '@/lib/i18n';
import { Globe } from 'lucide-react';

interface Props {
  /** Compact mode for tight spaces like mobile status bar */
  compact?: boolean;
}

export default function LanguageToggle({ compact }: Props) {
  const { lang, setLang } = useT();

  if (compact) {
    return (
      <button
        onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold text-[#848E9C] hover:text-[#D1D4DC] bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
      >
        <Globe className="w-2.5 h-2.5" />
        {lang === 'zh' ? 'EN' : '中文'}
      </button>
    );
  }

  return (
    <button
      onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-[#848E9C] hover:text-[#D1D4DC] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.1] transition-all"
    >
      <Globe className="w-3.5 h-3.5" />
      {lang === 'zh' ? 'English' : '中文'}
    </button>
  );
}
