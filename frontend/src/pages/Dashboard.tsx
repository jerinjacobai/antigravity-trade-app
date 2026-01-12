import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getSystemStatus, startSimulation } from '../services/api';
import { cn } from '../lib/utils';
import { LineChart, ShieldAlert, Terminal, Play } from 'lucide-react';

// Types
interface Log {
    timestamp: string;
    message: string;
    level: string;
}

interface Tick {
    symbol: string;
    price: number;
    timestamp: number;
}

const Dashboard = () => {
    const [logs, setLogs] = useState<Log[]>([]);
    const [price, setPrice] = useState<number>(21500.00);
    const [risk, setRisk] = useState({ pnl: 0, trades: 0, max_trades: 25 });
    const [activeAlgo, setActiveAlgo] = useState<string | null>(null);

    useEffect(() => {
        // 1. Initial Fetch
        const init = async () => {
            const status = await getSystemStatus();
            setRisk(prev => ({ ...prev, ...status.risk_stats })); // Merge
            setActiveAlgo(status.algo_state.algo_name);
        };
        init();

        // 2. Realtime Subscriptions
        const channel = supabase.channel('dashboard_realtime')
            // Listen for Logs
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trade_logs' }, (payload) => {
                const newLog = payload.new as any;
                setLogs(prev => [{ timestamp: newLog.timestamp, message: newLog.message, level: newLog.level }, ...prev].slice(0, 50));
            })
            // Listen for Mock/Real Ticks (Broadcast)
            .on('broadcast', { event: 'market_tick' }, (payload) => {
                const tick = payload.payload as Tick;
                if (tick.symbol.includes('Nifty')) {
                    setPrice(tick.price);
                }
            })
            // Listen for Orders/Risk Updates (Optional, can poll or subscribe to table)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleStart = async () => {
        await startSimulation();
        // Optimistic Log
        setLogs(prev => [{ timestamp: new Date().toISOString(), message: "Start Command Sent to Worker", level: "INFO" }, ...prev]);
    };

    return (
        <div className="min-h-screen bg-black text-zinc-100 p-6 font-mono selection:bg-blue-500/30">
            {/* Header */}
            <header className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
                    <h1 className="text-xl font-bold tracking-tight">ANTIGRAVITY <span className="text-zinc-500">TERMINAL</span></h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="px-3 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs">
                        Strategy: <span className="text-blue-400 font-bold">{activeAlgo || 'LOADING...'}</span>
                    </div>
                    <button
                        onClick={handleStart}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-sm font-semibold transition-all"
                    >
                        <Play size={14} /> Start Engine
                    </button>
                </div>
            </header>

            {/* Grid Layout */}
            <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)]">

                {/* Left Col: Market & Risk */}
                <div className="col-span-8 flex flex-col gap-6">
                    {/* Market Ticker */}
                    <div className="h-1/2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute top-4 left-4 flex items-center gap-2 text-zinc-400 text-sm">
                            <LineChart size={16} /> LIVE MARKET
                        </div>
                        <div className="text-8xl font-black tracking-tighter bg-gradient-to-b from-white to-zinc-600 bg-clip-text text-transparent">
                            {price.toFixed(2)}
                        </div>
                        <div className="text-green-500 mt-2 font-medium flex items-center gap-2">
                            NIFTY 50 <span className="text-xs bg-green-500/10 px-2 py-0.5 rounded">+0.45%</span>
                        </div>
                    </div>

                    {/* Risk Monitor */}
                    <div className="h-1/2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-6">
                            <ShieldAlert size={16} /> RISK MONITOR
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 rounded-lg bg-black border border-zinc-800">
                                <div className="text-zinc-500 text-xs uppercase mb-1">Daily PnL</div>
                                <div className={cn("text-2xl font-bold", risk.pnl >= 0 ? "text-green-400" : "text-red-400")}>
                                    ₹{risk.pnl.toFixed(2)}
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-black border border-zinc-800">
                                <div className="text-zinc-500 text-xs uppercase mb-1">Trades</div>
                                <div className="text-2xl font-bold text-white">
                                    {risk.trades} <span className="text-zinc-600 text-sm">/ {risk.max_trades}</span>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-black border border-zinc-800">
                                <div className="text-zinc-500 text-xs uppercase mb-1">Status</div>
                                <div className="text-2xl font-bold text-blue-400">ACTIVE</div>
                            </div>
                        </div>
                        {/* Risk Bar */}
                        <div className="mt-6">
                            <div className="flex justify-between text-xs text-zinc-500 mb-2">
                                <span>Drawdown Limit</span>
                                <span>2% Used</span>
                            </div>
                            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 w-[2%] shadow-[0_0_10px_#22c55e]" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Col: Logs */}
                <div className="col-span-4 rounded-xl border border-zinc-800 bg-black flex flex-col">
                    <div className="p-4 border-b border-zinc-800 flex items-center gap-2 text-zinc-400 text-sm">
                        <Terminal size={16} /> SYSTEM LOGS
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
                        {logs.map((log, i) => (
                            <div key={i} className="flex gap-2">
                                <span className="text-zinc-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                <span className={cn(
                                    log.level === 'ERROR' ? 'text-red-500' :
                                        log.level === 'WARN' ? 'text-yellow-500' : 'text-zinc-300'
                                )}>
                                    {log.message}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
