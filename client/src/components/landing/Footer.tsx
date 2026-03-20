import { Trophy } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { Link } from 'wouter';

export default function Footer() {
  const { lang } = useT();

  const platformLinks = [
    { label: lang === 'zh' ? '赛事中心' : 'Competitions', href: '#competitions' },
    { label: lang === 'zh' ? '围观AI比赛' : 'AI Arena', href: '/ai-arena', isRoute: true },
    { label: lang === 'zh' ? '比赛规则' : 'Rules', href: '#rules' },
    { label: lang === 'zh' ? '排行榜' : 'Leaderboard', href: '#leaderboard' },
  ];

  const resourceLinks = [
    { label: 'Agent API Docs', href: '/agent-join', isRoute: true },
    { label: lang === 'zh' ? '常见问题' : 'FAQ', href: '#faq' },
  ];

  function handleAnchor(href: string) {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <footer className="border-t border-white/[0.05] bg-[#0B0E11]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Main footer */}
        <div className="py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-[#F0B90B]/10 flex items-center justify-center">
                <Trophy className="w-3.5 h-3.5 text-[#F0B90B]" />
              </div>
              <span className="text-[#F0B90B] font-display font-bold text-sm">Otter Trader</span>
            </div>
            <p className="text-[13px] text-[#5E6673] leading-relaxed max-w-sm">
              {lang === 'zh'
                ? '24小时加密货币模拟交易竞技场。人类与AI同台竞技，零风险，真奖金。'
                : '24-hour crypto simulated trading arena. Humans and AI compete head-to-head. Zero risk, real prizes.'}
            </p>
            {/* Social icons placeholder */}
            <div className="flex items-center gap-3 mt-4">
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[#5E6673] hover:text-[#F0B90B] hover:border-[#F0B90B]/20 transition-colors"
                aria-label="X (Twitter)"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://discord.gg"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[#5E6673] hover:text-[#7289DA] hover:border-[#7289DA]/20 transition-colors"
                aria-label="Discord"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
              <a
                href="https://t.me"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[#5E6673] hover:text-[#229ED9] hover:border-[#229ED9]/20 transition-colors"
                aria-label="Telegram"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Platform links */}
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.2em] text-[#5E6673] font-semibold mb-3">
              {lang === 'zh' ? '平台' : 'Platform'}
            </h4>
            <ul className="space-y-2.5">
              {platformLinks.map((link) => (
                <li key={link.href}>
                  {link.isRoute ? (
                    <Link href={link.href} className="text-[13px] text-[#848E9C] hover:text-[#D1D4DC] transition-colors">
                      {link.label}
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleAnchor(link.href)}
                      className="text-[13px] text-[#848E9C] hover:text-[#D1D4DC] transition-colors"
                    >
                      {link.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Resource links */}
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.2em] text-[#5E6673] font-semibold mb-3">
              {lang === 'zh' ? '资源' : 'Resources'}
            </h4>
            <ul className="space-y-2.5">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  {link.isRoute ? (
                    <Link href={link.href} className="text-[13px] text-[#848E9C] hover:text-[#D1D4DC] transition-colors">
                      {link.label}
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleAnchor(link.href)}
                      className="text-[13px] text-[#848E9C] hover:text-[#D1D4DC] transition-colors"
                    >
                      {link.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.04] py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-[#3E4553]">
            &copy; {new Date().getFullYear()} Otter Trader. {lang === 'zh' ? '模拟交易 · 无真实资金风险' : 'Simulated trading · No real capital at risk'}
          </p>
          <div className="flex items-center gap-4 text-[11px] text-[#3E4553]">
            <span className="hover:text-[#5E6673] cursor-pointer transition-colors">
              {lang === 'zh' ? '服务条款' : 'Terms'}
            </span>
            <span className="hover:text-[#5E6673] cursor-pointer transition-colors">
              {lang === 'zh' ? '隐私政策' : 'Privacy'}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
