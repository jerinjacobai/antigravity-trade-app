import React from 'react';
import { cn } from '../lib/utils';
// Arrows removed as they were unused

interface Quote {
    bidP: number;
    bidQ: string; // Proto uses int64/string for large nums
    askP: number;
    askQ: string;
}

interface MarketDepthPanelProps {
    symbol: string;
    data: Quote[];
}

const MarketDepthPanel: React.FC<MarketDepthPanelProps> = ({ symbol, data }) => {
    // Show top 5 standard
    const depth = data.slice(0, 5);

    const totalBid = depth.reduce((acc, curr) => acc + Number(curr.bidQ), 0);
    const totalAsk = depth.reduce((acc, curr) => acc + Number(curr.askQ), 0);
    const sentiment = totalBid > totalAsk ? 'bullish' : 'bearish';
    const percentMap = totalBid + totalAsk > 0 ? (totalBid / (totalBid + totalAsk)) * 100 : 50;

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 font-mono text-xs">
            <div className="flex justify-between items-center mb-4">
                <span className="text-zinc-400 font-bold">{symbol || 'MARKET DEPTH'}</span>
                <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                    sentiment === 'bullish' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                    {sentiment}
                </span>
            </div>

            {/* Header */}
            <div className="grid grid-cols-2 gap-2 mb-2 text-zinc-500 uppercase text-[10px]">
                <div className="flex justify-between px-2">
                    <span>Bid Qty</span>
                    <span>Bid</span>
                </div>
                <div className="flex justify-between px-2">
                    <span>Ask</span>
                    <span>Ask Qty</span>
                </div>
            </div>

            {/* Rows */}
            <div className="space-y-1">
                {depth.map((row, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2 relative">
                        {/* Bid Side */}
                        <div className="flex justify-between items-center px-2 py-1 rounded bg-green-900/10 relative overflow-hidden group">
                            {/* Visual Bar Background */}
                            <div className="absolute right-0 top-0 bottom-0 bg-green-500/10 transition-all duration-300"
                                style={{ width: `${Math.min((Number(row.bidQ) / totalBid) * 500, 100)}%` }} />
                            <span className="relative z-10 text-zinc-300">{row.bidQ}</span>
                            <span className="relative z-10 text-green-400 font-bold">{row.bidP.toFixed(2)}</span>
                        </div>

                        {/* Ask Side */}
                        <div className="flex justify-between items-center px-2 py-1 rounded bg-red-900/10 relative overflow-hidden">
                            {/* Visual Bar Background */}
                            <div className="absolute left-0 top-0 bottom-0 bg-red-500/10 transition-all duration-300"
                                style={{ width: `${Math.min((Number(row.askQ) / totalAsk) * 500, 100)}%` }} />
                            <span className="relative z-10 text-red-400 font-bold">{row.askP.toFixed(2)}</span>
                            <span className="relative z-10 text-zinc-300">{row.askQ}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Total Bar */}
            <div className="mt-4">
                <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                    <span>Total Bid: {(totalBid / 1000).toFixed(1)}k</span>
                    <span>Total Ask: {(totalAsk / 1000).toFixed(1)}k</span>
                </div>
                <div className="h-1.5 w-full bg-red-900/30 rounded-full overflow-hidden flex">
                    <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${percentMap}%` }} />
                </div>
            </div>
        </div>
    );
};

export default MarketDepthPanel;
