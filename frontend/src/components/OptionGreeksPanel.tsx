import React from 'react';
import { cn } from '../lib/utils';
import { Sigma, Timer, TrendingUp, Activity, BarChart2 } from 'lucide-react';

interface Greeks {
    delta: number;
    theta: number;
    gamma: number;
    vega: number;
    rho: number;
}

interface OptionGreeksPanelProps {
    symbol: string;
    greeks: Greeks;
    iv?: number;
    oi?: number;
}

const OptionGreeksPanel: React.FC<OptionGreeksPanelProps> = ({ symbol, greeks, iv, oi }) => {

    // Helper to color and format
    const GreekItem = ({ label, value, icon: Icon, color }: any) => (
        <div className="flex flex-col items-center bg-zinc-900/50 border border-zinc-800 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors group">
            <div className={cn("mb-2 p-1.5 rounded-full bg-zinc-950 border border-zinc-800 group-hover:scale-110 transition-transform", color)}>
                <Icon size={14} />
            </div>
            <span className="text-xs text-zinc-500 uppercase tracking-widest text-[10px]">{label}</span>
            <span className="font-bold text-white text-sm md:text-base mt-0.5 font-mono">
                {value?.toFixed(4) || '-'}
            </span>
        </div>
    );

    return (
        <div className="rounded-xl border border-zinc-800 bg-black/40 p-5 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-5 border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                    <Sigma className="text-purple-500" size={18} />
                    <span className="font-bold text-zinc-200">{symbol} GREEKS</span>
                </div>
                {iv && (
                    <div className="text-xs font-mono text-yellow-500 bg-yellow-900/10 px-2 py-1 rounded border border-yellow-900/20">
                        IV: {(iv * 100).toFixed(1)}%
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <GreekItem
                    label="Delta"
                    value={greeks.delta}
                    icon={TrendingUp}
                    color="text-blue-400 border-blue-900/30 bg-blue-900/10"
                />
                <GreekItem
                    label="Theta"
                    value={greeks.theta}
                    icon={Timer}
                    color="text-red-400 border-red-900/30 bg-red-900/10"
                />
                <GreekItem
                    label="Gamma"
                    value={greeks.gamma}
                    icon={Activity}
                    color="text-green-400 border-green-900/30 bg-green-900/10"
                />
                <GreekItem
                    label="Vega"
                    value={greeks.vega}
                    icon={BarChart2}
                    color="text-purple-400 border-purple-900/30 bg-purple-900/10"
                />
                <GreekItem
                    label="Rho"
                    value={greeks.rho}
                    icon={Sigma}
                    color="text-orange-400 border-orange-900/30 bg-orange-900/10"
                />
            </div>

            {/* OI Footer */}
            {oi && (
                <div className="mt-4 pt-4 border-t border-zinc-900 grid grid-cols-2 gap-4">
                    <div>
                        <span className="text-[10px] uppercase text-zinc-600 block mb-1">Open Interest</span>
                        <span className="text-sm font-mono text-zinc-300">
                            {oi.toLocaleString()} <span className="text-[10px] text-zinc-500">Contracts</span>
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OptionGreeksPanel;
