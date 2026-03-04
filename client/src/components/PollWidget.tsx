import { useState, useCallback, useEffect, memo } from 'react';
import type { SocialData, PollVoteData } from '@/lib/types';

interface Props {
  social: SocialData;
  pollData: PollVoteData | null;
  onVote: (direction: 'long' | 'short' | 'neutral') => void;
}

function PollWidget({ social, pollData, onVote }: Props) {
  const [cooldown, setCooldown] = useState(false);

  const handleVote = useCallback((direction: 'long' | 'short' | 'neutral') => {
    if (cooldown) return;
    onVote(direction);
    setCooldown(true);
  }, [cooldown, onVote]);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(false), 5000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const totalVotes = pollData
    ? pollData.longVotes + pollData.shortVotes + pollData.neutralVotes
    : 0;
  const longPollPct = totalVotes > 0 ? Math.round((pollData!.longVotes / totalVotes) * 100) : 0;
  const shortPollPct = totalVotes > 0 ? Math.round((pollData!.shortVotes / totalVotes) * 100) : 0;
  const neutralPollPct = totalVotes > 0 ? 100 - longPollPct - shortPollPct : 0;

  const userVote = pollData?.userVote ?? null;

  return (
    <div className="px-2.5 py-2 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.015)] space-y-1.5">
      {/* Real position sentiment bar */}
      <div className="flex items-center gap-1.5">
        <span className="text-[8px] text-[#848E9C] uppercase tracking-wider shrink-0 w-10">持仓</span>
        <span className="text-[#0ECB81] font-mono text-[9px] font-bold w-8 text-right">{social.longPct}%</span>
        <div className="flex-1 h-1.5 bg-[#F6465D]/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0ECB81] rounded-full transition-all duration-500"
            style={{ width: `${social.longPct}%` }}
          />
        </div>
        <span className="text-[#F6465D] font-mono text-[9px] font-bold w-8">{social.shortPct}%</span>
      </div>

      {/* Opinion vote buttons */}
      <div className="flex items-center gap-1">
        <span className="text-[8px] text-[#848E9C] shrink-0 w-10">观点</span>
        <button
          onClick={() => handleVote('long')}
          disabled={cooldown}
          className={`flex-1 py-1 text-[9px] font-bold rounded transition-all ${
            userVote === 'long'
              ? 'bg-[#0ECB81]/25 text-[#0ECB81] border border-[#0ECB81]/40'
              : 'bg-[#0ECB81]/8 text-[#0ECB81]/60 hover:bg-[#0ECB81]/15 hover:text-[#0ECB81] border border-transparent'
          } ${cooldown ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          LONG{totalVotes > 0 ? ` ${longPollPct}%` : ''}
        </button>
        <button
          onClick={() => handleVote('neutral')}
          disabled={cooldown}
          className={`flex-1 py-1 text-[9px] font-bold rounded transition-all ${
            userVote === 'neutral'
              ? 'bg-[#F0B90B]/25 text-[#F0B90B] border border-[#F0B90B]/40'
              : 'bg-[#F0B90B]/8 text-[#F0B90B]/60 hover:bg-[#F0B90B]/15 hover:text-[#F0B90B] border border-transparent'
          } ${cooldown ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          观望{totalVotes > 0 ? ` ${neutralPollPct}%` : ''}
        </button>
        <button
          onClick={() => handleVote('short')}
          disabled={cooldown}
          className={`flex-1 py-1 text-[9px] font-bold rounded transition-all ${
            userVote === 'short'
              ? 'bg-[#F6465D]/25 text-[#F6465D] border border-[#F6465D]/40'
              : 'bg-[#F6465D]/8 text-[#F6465D]/60 hover:bg-[#F6465D]/15 hover:text-[#F6465D] border border-transparent'
          } ${cooldown ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          SHORT{totalVotes > 0 ? ` ${shortPollPct}%` : ''}
        </button>
        {totalVotes > 0 && (
          <span className="text-[8px] text-[#5E6673] shrink-0 ml-0.5">{totalVotes}</span>
        )}
      </div>
    </div>
  );
}

export default memo(PollWidget);
