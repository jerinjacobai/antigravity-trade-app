import { useEffect, useState } from 'react';
import { Wallet, TrendingUp, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PaperWallet {
    available_balance: number;
    used_margin: number;
    realized_pnl: number;
    unrealized_pnl: number;
}

export default function PaperWalletCard() {
    const [wallet, setWallet] = useState<PaperWallet | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchWallet = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('paper_wallet')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error) throw error;
            setWallet(data);
        } catch (err) {
            console.error('Error fetching paper wallet:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWallet();

        // Realtime subscription for PnL updates
        const subscription = supabase
            .channel('paper_wallet_changes')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'paper_wallet' },
                (payload) => {
                    setWallet(payload.new as PaperWallet);
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    if (loading) return <div className="animate-pulse h-32 bg-zinc-900 rounded-xl"></div>;

    if (!wallet) return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
            <p className="text-zinc-400">Paper Wallet Not Found</p>
            <button
                onClick={fetchWallet}
                className="mt-2 text-indigo-400 hover:text-indigo-300 text-sm"
            >
                Retry
            </button>
        </div>
    );

    const totalPortfolio = wallet.available_balance + wallet.used_margin + wallet.unrealized_pnl;

    return (
        <div className="bg-gradient-to-br from-indigo-900/20 to-zinc-900 border border-indigo-500/30 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Wallet size={64} className="text-indigo-400" />
            </div>

            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-indigo-400 font-medium text-sm uppercase tracking-wider flex items-center gap-2">
                        <Wallet size={16} /> Paper Trading Account
                    </h3>
                    <div className="mt-1 text-3xl font-bold text-white">
                        ₹{totalPortfolio.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                </div>
                <button onClick={fetchWallet} className="text-zinc-500 hover:text-white transition-colors">
                    <RefreshCw size={18} />
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-zinc-500 text-xs mb-1">Available Margin</div>
                    <div className="font-mono font-medium text-white">
                        ₹{wallet.available_balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-zinc-500 text-xs mb-1">Used Margin</div>
                    <div className="font-mono font-medium text-white">
                        ₹{wallet.used_margin.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-zinc-500 text-xs mb-1">Realized P&L</div>
                    <div className={`font-mono font-medium ${wallet.realized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {wallet.realized_pnl >= 0 ? '+' : ''}{wallet.realized_pnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-zinc-500 text-xs mb-1">Unrealized P&L</div>
                    <div className={`font-mono font-medium ${wallet.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {wallet.unrealized_pnl >= 0 ? '+' : ''}{wallet.unrealized_pnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            <div className="mt-4 flex gap-2 items-center text-xs text-indigo-300/60 bg-indigo-500/10 px-3 py-1.5 rounded-full w-fit">
                <TrendingUp size={12} /> Institutional Simulation Mode Active
            </div>
        </div>
    );
}
