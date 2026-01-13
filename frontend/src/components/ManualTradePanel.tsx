import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface ManualTradePanelProps {
    symbol: string;
    onOrderPlaced: () => void;
}

export default function ManualTradePanel({ symbol, onOrderPlaced }: ManualTradePanelProps) {
    const [quantity, setQuantity] = useState<number>(50);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTrade = async (side: 'BUY' | 'SELL') => {
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError("User not authenticated");
                return;
            }

            // In V1, we just insert directly into paper_orders to simulate the request.
            // The Backend Worker (Virtual Engine) should ideally pick this up, OR 
            // we can call an Edge Function / API endpoint.
            // For now, let's assume we call a backend endpoint (mocked here as simple DB insert to poll)
            // But wait, our VirtualEngine is in Python. We need to trigger it.
            // Let's insert into 'paper_orders' with status 'PENDING' and trust the worker polls it?
            // Yes, checking VirtualEngine implementation... it doesn't POLL yet, it expects a method call.
            // We need an API endpoint. 
            // For this phase, I will simulate the API call by inserting to DB and assuming a hypothetical watcher.

            // ACTUALLY: The correct way for V1 without a full API server is to INSERT to DB 
            // and have a 'Realtime Subscription' in the Python worker? 
            // Or just use the Supabase Client in Python to poll 'paper_orders' where status='PENDING'.
            // I will assume the Python Worker will be updated to poll 'paper_orders' for these manual trades.

            const { error: dbError } = await supabase.from('paper_orders').insert({
                user_id: user.id,
                symbol: symbol,
                transaction_type: side,
                quantity: quantity,
                order_type: 'MARKET',
                status: 'PENDING',
                algo_name: 'MANUAL'
            });

            if (dbError) throw dbError;

            onOrderPlaced();
            alert(`Order Placed: ${side} ${quantity} ${symbol}`);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-medium">Manual Trade</h3>
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">{symbol}</span>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-xs text-zinc-500 block mb-1">Quantity</label>
                    <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-full bg-black border border-zinc-700 rounded p-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                </div>

                {error && (
                    <div className="text-red-400 text-xs">{error}</div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => handleTrade('BUY')}
                        disabled={loading}
                        className="bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/50 py-3 rounded-lg font-medium transition-all disabled:opacity-50"
                    >
                        {loading ? '...' : 'BUY'}
                    </button>
                    <button
                        onClick={() => handleTrade('SELL')}
                        disabled={loading}
                        className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/50 py-3 rounded-lg font-medium transition-all disabled:opacity-50"
                    >
                        {loading ? '...' : 'SELL'}
                    </button>
                </div>
            </div>
        </div>
    );
}
