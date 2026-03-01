// ============================================================
// Recent Trades — Real-time trade feed from Binance
// Design: Compact scrolling trade list
// ============================================================

interface Trade {
  price: number;
  qty: number;
  isBuyerMaker: boolean;
  time: number;
}

interface Props {
  trades: Trade[];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

export default function RecentTrades({ trades }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="panel-header">Recent Trades</div>
      <div className="flex items-center px-2 py-1 text-[10px] text-[#848E9C] border-b border-[rgba(255,255,255,0.04)]">
        <span className="w-20">Price</span>
        <span className="flex-1 text-right">Qty</span>
        <span className="w-16 text-right">Time</span>
      </div>
      <div className="flex-1 overflow-hidden">
        {trades.slice(0, 20).map((trade, i) => (
          <div key={i} className="flex items-center px-2 py-[2px] text-[11px] font-mono">
            <span className={`w-20 ${trade.isBuyerMaker ? 'text-[#F6465D]' : 'text-[#0ECB81]'}`}>
              {trade.price.toFixed(4)}
            </span>
            <span className="flex-1 text-right text-[#D1D4DC]">{trade.qty.toFixed(1)}</span>
            <span className="w-16 text-right text-[#848E9C]">{formatTime(trade.time)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
