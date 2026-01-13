import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getSystemStatus, startSimulation } from '../services/api';
import { cn } from '../lib/utils';
import { LineChart, ShieldAlert, Terminal, Play, Activity } from 'lucide-react';
import PaperWalletCard from '../components/PaperWalletCard';
import ManualTradePanel from '../components/ManualTradePanel';
import PaperAnalytics from '../components/PaperAnalytics';
import AlgoHealthPanel from '../components/AlgoHealthPanel';

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
    source?: 'PUBLIC' | 'BROKER';
}

const Dashboard = () => {
    const [logs, setLogs] = useState<Log[]>([]);
    const [niftyPrice, setNiftyPrice] = useState<number>(21500.00);
    const [sensexPrice, setSensexPrice] = useState<number>(71500.00);
    const [risk, setRisk] = useState({ pnl: 0, trades: 0, max_trades: 25 });
    const [activeAlgo, setActiveAlgo] = useState<string | null>(null);
    const [mode, setMode] = useState<'LIVE' | 'PAPER'>('PAPER'); // Default to Paper for safety
    const [dataSource, setDataSource] = useState<'PUBLIC' | 'BROKER'>('PUBLIC');

    useEffect(() => {
        // 1. Initial Fetch
        const init = async () => {
            const status = await getSystemStatus();
            setRisk(prev => ({ ...prev, ...status.risk_stats })); // Merge
            setActiveAlgo(status.algo_state.algo_name);
            setMode(status.algo_state.mode === 'live' ? 'LIVE' : 'PAPER');
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
                if (tick.source) setDataSource(tick.source); // Update Source Indicator

                if (tick.symbol === 'NSE_INDEX|Nifty 50') {
                    setNiftyPrice(tick.price);
                } else if (tick.symbol === 'BSE_INDEX|SENSEX') {
                    setSensexPrice(tick.price);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleStart = async () => {
        await startSimulation();
        setLogs(prev => [{ timestamp: new Date().toISOString(), message: "Start Command Sent to Worker", level: "INFO" }, ...prev]);
    };

    const handlePaperOrder = () => {
        setLogs(prev => [{ timestamp: new Date().toISOString(), message: "Manual Paper Order Placed", level: "INFO" }, ...prev]);
    };

    return (
        <div className="h-full font-mono text-zinc-100 p-2 md:p-0">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-zinc-900 pb-4 gap-4">
                <div className="flex items-center gap-3">
                    <div className={cn("h-3 w-3 rounded-full animate-pulse shadow-[0_0_10px]", mode === 'LIVE' ? "bg-red-500 shadow-red-500" : "bg-blue-500 shadow-blue-500")} />
                    <h1 className="text-xl font-bold tracking-tight">QUANTMIND <span className="text-zinc-500">TERMINAL</span></h1>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* Data Source Badge */}
                    <div className={cn("px-3 py-1 rounded text-xs font-bold border flex items-center gap-2",
                        dataSource === 'BROKER' ? "bg-green-900/20 border-green-900 text-green-500" : "bg-yellow-900/20 border-yellow-900 text-yellow-500")}>
                        {dataSource === 'BROKER' ? (
                            <><span>●</span> DATA: BROKER (LIVE)</>
                        ) : (
                            <><span>○</span> DATA: PUBLIC (DELAYED)</>
                        )}
                    </div>

                    {/* Mode Toggle Display (Read Only for V1) */}
                    <div className={cn("px-3 py-1 rounded text-xs font-bold border", mode === 'LIVE' ? "bg-red-900/20 border-red-900 text-red-500" : "bg-blue-900/20 border-blue-900 text-blue-400")}>
                        {mode} MODE
                    </div>

                    <div className="px-3 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hidden md:block">
                        Algo: <span className="text-blue-400 font-bold">{activeAlgo || 'NONE'}</span>
                    </div>
                    <button
                        onClick={handleStart}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-sm font-semibold transition-all"
                    >
                        <Play size={14} /> Start Engine
                    </button>
                </div>
            </header>

            {/* Algo Health Panel (Full Width) */}
            <div className="mb-6">
                <AlgoHealthPanel />
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-6">

                {/* Left Col: Market & Risk/Wallet */}
                <div className="col-span-1 md:col-span-8 flex flex-col gap-6">
                    {/* Market Tickers */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* NIFTY */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 md:p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                            <div className="absolute top-4 left-4 flex items-center gap-2 text-zinc-500 text-xs font-bold tracking-wider">
                                <LineChart size={14} /> NSE INDEX
                            </div>
                            <div className="text-3xl md:text-5xl font-black tracking-tighter text-white group-hover:scale-105 transition-transform duration-500 mt-4 md:mt-0">
                                {niftyPrice.toFixed(2)}
                            </div>
                            <div className="text-green-500 mt-2 font-medium flex items-center gap-2 text-sm md:text-base">
                                NIFTY 50 <span className="text-xs bg-green-500/10 px-2 py-0.5 rounded">+0.45%</span>
                            </div>
                        </div>

                        {/* SENSEX */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 md:p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                            <div className="absolute top-4 left-4 flex items-center gap-2 text-zinc-500 text-xs font-bold tracking-wider">
                                <LineChart size={14} /> BSE INDEX
                            </div>
                            <div className="text-3xl md:text-5xl font-black tracking-tighter text-white group-hover:scale-105 transition-transform duration-500 mt-4 md:mt-0">
                                {sensexPrice.toFixed(2)}
                            </div>
                            <div className="text-green-500 mt-2 font-medium flex items-center gap-2 text-sm md:text-base">
                                SENSEX <span className="text-xs bg-green-500/10 px-2 py-0.5 rounded">+0.21%</span>
                            </div>
                        </div>
                    </div>

                    {/* Mode Specific Panel: Paper Wallet vs Live Risk */}
                    {mode === 'PAPER' ? (
                        <div className="flex flex-col gap-4">
                            <PaperWalletCard />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <ManualTradePanel symbol="NIFTY" spotPrice={niftyPrice} onOrderPlaced={handlePaperOrder} />
                                <ManualTradePanel symbol="SENSEX" spotPrice={sensexPrice} onOrderPlaced={handlePaperOrder} />
                            </div>
                        </div>
                    ) : (
                        <div className="h-auto md:h-1/2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 relative overflow-hidden">
                            {/* Emergency Overlay */}
                            <div className="absolute top-4 right-4 z-10">
                                <button
                                    onClick={async () => {
                                        if (window.confirm("⚠️ EMERGENCY KILL SWITCH\n\n- Stop all Algos\n- Cancel all Orders\n- Disable Trading\n\nAre you sure?")) {
                                            try {
                                                const { emergencyStop } = await import('../services/api');
                                                await emergencyStop();
                                                alert("System Stopped. Trading Disabled.");
                                            } catch (e) {
                                                alert("Kill Switch Failed. CONTACT ADMIN.");
                                            }
                                        }
                                    }}
                                    className="bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white border border-red-700 px-3 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1.5"
                                >
                                    <ShieldAlert size={12} /> KILL SWITCH
                                </button>
                            </div>

                            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-6">
                                <ShieldAlert size={16} /> LIVE RISK MONITOR
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
                            {/* Visual Risk Bar */}
                            <div className="mt-6">
                                <div className="flex justify-between text-xs text-zinc-500 mb-2">
                                    <span>Max Drawdown Limit ({((risk.pnl / -2000) * 100).toFixed(0)}% Used)</span>
                                    <span>Target: ₹2000 Loss</span>
                                </div>
                                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                    {/* Simple calculation: If PnL is negative, show red bar based on max loss (e.g. 2000) */}
                                    {/* If PnL positive, show green bar (Profit target e.g. 5000) */}
                                    {risk.pnl < 0 ? (
                                        <div
                                            className="h-full bg-red-500 shadow-[0_0_10px_#ef4444]"
                                            style={{ width: `${Math.min(Math.abs(risk.pnl) / 2000 * 100, 100)}%` }}
                                        />
                                    ) : (
                                        <div
                                            className="h-full bg-green-500 shadow-[0_0_10px_#22c55e]"
                                            style={{ width: `${Math.min(Math.abs(risk.pnl) / 5000 * 100, 100)}%` }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>



                {/* Right Col: Logs or Analytics */}
                <div className="col-span-1 md:col-span-4 rounded-xl border border-zinc-800 bg-black flex flex-col h-[500px] md:h-auto">
                    {mode === 'PAPER' ? (
                        <>
                            <div className="p-4 border-b border-zinc-800 flex items-center gap-2 text-zinc-400 text-sm">
                                <Activity size={16} /> PAPER ANALYTICS
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                <PaperAnalytics />
                            </div>
                        </>
                    ) : (
                        <>
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
                        </>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
