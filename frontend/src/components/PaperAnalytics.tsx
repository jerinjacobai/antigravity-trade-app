import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, TrendingDown, Activity, History } from 'lucide-react';
import { cn } from '../lib/utils';

interface AnalyticsHook {
    totalPnL: number;
    winRate: number;
    totalTrades: number;
    openPositions: number;
    recentTrades: any[];
}

export default function PaperAnalytics() {
    const [stats, setStats] = useState<AnalyticsHook>({
        totalPnL: 0,
        winRate: 0,
        totalTrades: 0,
        openPositions: 0,
        recentTrades: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();

        // Subscribe to changes
        const channel = supabase.channel('paper_analytics')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'paper_executions' }, () => fetchAnalytics())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'paper_positions' }, () => fetchAnalytics())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchAnalytics = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Wallet for Open Positions count (or Positions table)
            const { data: positions } = await supabase.from('paper_positions')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'OPEN');

            // 2. Fetch Executions for PnL & Win Rate (Simplified)
            // Ideally we need 'Closed Positions' to calculate Win Rate accurately.
            // For V1, let's use paper_wallet's realized_pnl if available, or calculate from executions?
            // Actually, paper_wallet has 'realized_pnl'.
            const { data: wallet } = await supabase.from('paper_wallet')
                .select('*')
                .eq('user_id', user.id)
                .single();

            // 3. Fetch Recent Executions for History
            const { data: trades } = await supabase.from('paper_executions')
                .select('*')
                .eq('user_id', user.id)
                .order('executed_at', { ascending: false })
                .limit(5);

            setStats({
                totalPnL: wallet?.realized_pnl || 0,
                winRate: calculateWinRate(wallet?.realized_pnl, 0), // Placeholder logic for V1
                totalTrades: trades?.length || 0, // This is just recent fetch length, need count
                openPositions: positions?.length || 0,
                recentTrades: trades || []
            });
        } catch (e) {
            console.error("Analytics Error", e);
        } finally {
            setLoading(false);
        }
    };

    const calculateWinRate = (pnl: number, trades: number) => {
        // TODO: Real implementation needs 'paper_trade_journal' or closed positions
        if (!pnl || pnl === 0) return 0;
        return pnl > 0 ? 100 : 0; // Extremely simplified
    };

    if (loading) return <div className="text-xs text-zinc-500">Loading Analytics...</div>;

    return (
        <div className="flex flex-col gap-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                    <div className="text-zinc-500 text-xs mb-1 flex items-center gap-2"><Activity size={12} /> Realized PnL</div>
                    <div className={cn("text-lg font-bold", stats.totalPnL >= 0 ? "text-green-400" : "text-red-400")}>
                        {stats.totalPnL >= 0 ? '+' : ''}{stats.totalPnL.toFixed(2)}
                    </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                    <div className="text-zinc-500 text-xs mb-1 flex items-center gap-2"><TrendingUp size={12} /> Exp. Win Rate</div>
                    <div className="text-lg font-bold text-blue-400">{stats.winRate}%</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                    <div className="text-zinc-500 text-xs mb-1">Open Pos</div>
                    <div className="text-lg font-bold text-white">{stats.openPositions}</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                    <div className="text-zinc-500 text-xs mb-1">Recent Trades</div>
                    <div className="text-lg font-bold text-white">{stats.recentTrades.length}</div>
                </div>
            </div>

            {/* Recent History Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2 text-sm font-medium text-zinc-300">
                    <History size={16} /> Recent Executions
                </div>
                <div className="p-0">
                    <table className="w-full text-xs text-left">
                        <thead className="text-zinc-500 bg-black/20 font-medium">
                            <tr>
                                <th className="px-4 py-2">Time</th>
                                <th className="px-4 py-2">Symbol</th>
                                <th className="px-4 py-2">Side</th>
                                <th className="px-4 py-2 text-right">Price</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {stats.recentTrades.map((trade) => (
                                <tr key={trade.execution_id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-2 text-zinc-400">{new Date(trade.executed_at).toLocaleTimeString()}</td>
                                    <td className="px-4 py-2 font-medium text-white">{trade.symbol}</td>
                                    <td className={cn("px-4 py-2 font-bold", trade.side === 'BUY' ? "text-green-400" : "text-red-400")}>
                                        {trade.side}
                                    </td>
                                    <td className="px-4 py-2 text-right text-zinc-300">{trade.price.toFixed(2)}</td>
                                </tr>
                            ))}
                            {stats.recentTrades.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-4 text-center text-zinc-600 italic">No trades yet</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
