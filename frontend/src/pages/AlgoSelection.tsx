import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSystemStatus, selectAlgo } from '../services/api';
import { Shield, Zap, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';

const algos = [
    {
        id: 'VPMS',
        name: 'VWAP Premium Momentum',
        icon: Zap,
        risk: 'High Frequency',
        desc: 'Scalps quick moves when option premiums decouple from VWAP. Expect 10-25 trades/day.',
        color: 'text-yellow-400',
        border: 'border-yellow-400/20'
    },
    {
        id: 'ITR',
        name: 'Index Trend Rider',
        icon: TrendingUp,
        risk: 'Moderate',
        desc: 'Captures sustained moves using EMA9/21 crossovers on the index spot.',
        color: 'text-blue-400',
        border: 'border-blue-400/20'
    },
    {
        id: 'ORB',
        name: 'Opening Range Breakout',
        icon: Shield,
        risk: 'Medium-High',
        desc: 'Trades the 15-min opening range breakout with premium confirmation.',
        color: 'text-purple-400',
        border: 'border-purple-400/20'
    }
];

export default function AlgoSelection() {
    const navigate = useNavigate();
    // const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check if already locked
        getSystemStatus().then(status => {
            if (status.algo_state.locked) {
                navigate('/dashboard');
            }
        });
    }, [navigate]);

    const handleSelect = async (id: string) => {
        if (!window.confirm(`CONFIRM SELECTION: ${id}\n\nThis will LOCK the algo for the entire day. You cannot undo this.`)) return;

        // setLoading(true);
        try {
            await selectAlgo(id);
            navigate('/dashboard');
        } catch (e) {
            alert("Failed to lock algo. Setup might be restricted.");
            // setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background -z-10" />

            <div className="text-center mb-12 space-y-4">
                <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">
                    Quant Desk
                </h1>
                <p className="text-text-muted text-lg">Select today's algorithm. One shot. No changes.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full">
                {algos.map((algo) => (
                    <div
                        key={algo.id}
                        className={cn(
                            "card hover:scale-105 transition-all duration-300 cursor-pointer group hover:shadow-2xl hover:shadow-primary/10",
                            algo.border
                        )}
                        onClick={() => handleSelect(algo.id)}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <algo.icon className={cn("w-8 h-8", algo.color)} />
                            <span className="text-xs font-mono px-2 py-1 rounded bg-surface border border-border text-text-muted">
                                {algo.id}
                            </span>
                        </div>

                        <h3 className="text-xl font-bold text-text mb-2">{algo.name}</h3>
                        <p className="text-text-muted text-sm mb-6 min-h-[60px]">{algo.desc}</p>

                        <div className="flex items-center justify-between border-t border-border pt-4">
                            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Risk Profile</span>
                            <span className={cn("font-bold text-sm", algo.color)}>{algo.risk}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 text-center text-text-muted text-xs">
                System Time: {new Date().toLocaleTimeString()} • Risk Engine Status: <span className="text-green-500">ACTIVE</span>
            </div>
        </div>
    );
}
