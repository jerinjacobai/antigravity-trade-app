import { useEffect, useState, useRef } from 'react';
import { getSystemStatus, startSimulation } from '../services/api';
import { Activity, Play, Terminal, Wallet, ShieldAlert } from 'lucide-react';
// import { cn } from '../lib/utils';

export default function Dashboard() {
    const [algoState, setAlgoState] = useState<any>(null);
    const [stats, setStats] = useState<any>({ daily_trades: 0, max_trades: 25 });
    const [logs, setLogs] = useState<string[]>([]);
    const [lastTick, setLastTick] = useState<any>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Initial Load
        getSystemStatus().then(data => {
            setAlgoState(data.algo_state);
            setStats(data.risk_stats);
        });

        // Valid WS URL?
        const ws = new WebSocket('ws://localhost:8080/api/ws');

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'tick') {
                setLastTick(msg.data);
            } else if (msg.type === 'order') {
                setLogs(prev => [...prev, `[ORDER] ${msg.data.side} ${msg.data.quantity} ${msg.data.symbol} @ ${msg.data.fill_price}`]);
            }
        };

        return () => ws.close();
    }, []);

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const handleStart = async () => {
        await startSimulation();
        setLogs(prev => [...prev, ">> SIMULATION STARTED..."]);
    };

    if (!algoState) return <div className="text-white p-10">Loading System State...</div>;

    return (
        <div className="min-h-screen bg-background p-6">
            <header className="flex items-center justify-between mb-8 border-b border-border pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="text-primary" /> Active Terminal
                    </h1>
                    <p className="text-text-muted text-sm mt-1">Running Strategy: <span className="text-primary font-mono">{algoState.algo}</span></p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-xs text-text-muted">Total PnL</div>
                        <div className="text-xl font-bold text-green-500 font-mono">+₹0.00</div>
                    </div>
                    <button onClick={handleStart} className="btn btn-primary flex items-center gap-2">
                        <Play size={16} /> Start
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart Area (Mock) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card h-64 flex items-center justify-center bg-surface relative overflow-hidden">
                        {/* Simple visualizer for tick */}
                        <div className="absolute inset-0 bg-blue-500/5" />
                        <div className="text-center z-10">
                            <h2 className="text-text-muted mb-2">LIVE MARKET TICK</h2>
                            <div className="text-5xl font-mono font-bold text-white">
                                {lastTick ? lastTick.ltp.toFixed(2) : 'Waiting...'}
                            </div>
                            <div className="text-primary text-sm mt-2">{lastTick?.symbol}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="card">
                            <div className="flex items-center gap-2 mb-2 text-text-muted text-xs uppercase tracking-wide">
                                <Wallet size={14} /> Risk Budget
                            </div>
                            <div className="text-2xl font-bold text-white">100%</div>
                            <div className="w-full bg-border h-1 mt-2 rounded-full overflow-hidden">
                                <div className="bg-green-500 w-full h-full" />
                            </div>
                        </div>
                        <div className="card">
                            <div className="flex items-center gap-2 mb-2 text-text-muted text-xs uppercase tracking-wide">
                                <ShieldAlert size={14} /> Daily Trades
                            </div>
                            <div className="text-2xl font-bold text-white">{stats.daily_trades} / {stats.max_trades}</div>
                            <div className="w-full bg-border h-1 mt-2 rounded-full overflow-hidden">
                                <div className="bg-blue-500 w-[10%] h-full" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Logs Console */}
                <div className="card h-[calc(100vh-140px)] flex flex-col">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
                        <Terminal size={16} className="text-secondary" />
                        <h3 className="font-semibold text-white">System Logs</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto font-mono text-xs space-y-2 text-text-muted pr-2">
                        {logs.map((log, i) => (
                            <div key={i} className="border-l-2 border-border pl-2 hover:bg-white/5 p-1 rounded">
                                <span className="text-blue-500 opacity-50">[{new Date().toLocaleTimeString()}]</span> {log}
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
}
