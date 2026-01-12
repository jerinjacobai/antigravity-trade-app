import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save, ShieldCheck, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [paperMode, setPaperMode] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('user_credentials')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (data) {
            setApiKey(data.upstox_api_key || '');
            setApiSecret(data.upstox_api_secret || '');
            setPaperMode(data.is_paper_trading);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('user_credentials')
            .upsert({
                user_id: user.id,
                upstox_api_key: apiKey,
                upstox_api_secret: apiSecret,
                is_paper_trading: paperMode,
                updated_at: new Date().toISOString()
            });

        if (error) {
            alert('Error saving settings: ' + error.message);
        } else {
            alert('Settings saved securel!');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 font-mono">
            <header className="max-w-2xl mx-auto flex items-center gap-4 mb-8">
                <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold">Protocol Configuration</h1>
            </header>

            <div className="max-w-2xl mx-auto space-y-6">
                {/* Connection Box */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                            <Key className="text-blue-500" size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Upstox API Credentials</h2>
                            <p className="text-zinc-400 text-sm">Required for order execution.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-zinc-500 text-xs uppercase mb-1">API Key</label>
                            <input
                                type="text"
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                className="w-full bg-black border border-zinc-700 rounded-lg p-3 font-mono text-sm focus:border-blue-500 outline-none"
                                placeholder="Enter your Upstox API Key"
                            />
                        </div>
                        <div>
                            <label className="block text-zinc-500 text-xs uppercase mb-1">API Secret</label>
                            <input
                                type="password"
                                value={apiSecret}
                                onChange={e => setApiSecret(e.target.value)}
                                className="w-full bg-black border border-zinc-700 rounded-lg p-3 font-mono text-sm focus:border-blue-500 outline-none"
                                placeholder="••••••••••••••••••••••••"
                            />
                        </div>
                    </div>
                </div>

                {/* Mode Box */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-500/10 rounded-lg">
                            <ShieldCheck className="text-purple-500" size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Paper Trading Mode</h2>
                            <p className="text-zinc-400 text-sm">Simulate trades without real money.</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={paperMode} onChange={e => setPaperMode(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                    </label>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                >
                    <Save size={18} /> {loading ? 'Encrypting & Saving...' : 'Save Configuration'}
                </button>
            </div>
        </div>
    );
}
