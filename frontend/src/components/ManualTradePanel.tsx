import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronDown } from 'lucide-react';
import OptionChainPicker from './OptionChainPicker';

interface ManualTradePanelProps {
    symbol: string; // Deprecated but kept for compatibility, usage acts as "Index Name"
    spotPrice: number; // New Prop needed for Picker
    onOrderPlaced: () => void;
}

export default function ManualTradePanel({ symbol, spotPrice, onOrderPlaced }: ManualTradePanelProps) {
    const [selectedSymbol, setSelectedSymbol] = useState<string>(symbol);
    const [quantity, setQuantity] = useState<number>(50);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPicker, setShowPicker] = useState(false);

    const handleTrade = async (side: 'BUY' | 'SELL') => {
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError("User not authenticated");
                return;
            }

            const { error: dbError } = await supabase.from('paper_orders').insert({
                user_id: user.id,
                symbol: selectedSymbol,
                transaction_type: side,
                quantity: quantity,
                order_type: 'MARKET',
                status: 'PENDING',
                algo_name: 'MANUAL'
            });

            if (dbError) throw dbError;

            onOrderPlaced();

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
                <div className="relative">
                    <button
                        onClick={() => setShowPicker(!showPicker)}
                        className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full hover:bg-indigo-500/20 transition-colors"
                    >
                        {selectedSymbol} <ChevronDown size={14} />
                    </button>

                    {/* Picker Dropdown */}
                    {showPicker && (
                        <div className="absolute right-0 top-8 z-50 w-64 bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl p-4">
                            <OptionChainPicker
                                spotPrice={spotPrice}
                                index={selectedSymbol.includes('NIFTY') ? 'NIFTY' : 'SENSEX'}
                                onSelect={(sym) => {
                                    setSelectedSymbol(sym);
                                    setShowPicker(false);
                                }}
                            />
                        </div>
                    )}
                </div>
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
