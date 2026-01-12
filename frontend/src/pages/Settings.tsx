import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save, ShieldCheck, Key, Zap, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [paperMode, setPaperMode] = useState(true);
    const [showWarning, setShowWarning] = useState(false);
    const [killSwitchActive, setKillSwitchActive] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (data) {
            // Check if we should migrate from old table or use new one
            // separate credentials table is deprecated in Phase 3, merging into profiles logic
            // providing backwards compat requires migration, for now assuming new user starts fresh
            // or we carry over values if we did a migration script.

            // For Phase 3, we expect user to re-enter or migration to run.
            // Let's assume blank defaults for now or logic to read from old table if new is empty.
        }

        // Also fetch from depreciated table for seamless transition if profiles is empty
        const { data: creds } = await supabase.from('user_credentials').select('*').single();
        if (creds) {
            setApiKey(creds.upstox_api_key || '');
            setApiSecret(creds.upstox_api_secret || '');
            setPaperMode(creds.is_paper_trading);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Save to user_profiles (Phase 3 centralized table)
        const { error } = await supabase
            .from('user_profiles')
            .upsert({
                user_id: user.id,
                // We don't store raw API Key/Secret here ideally in Phase 3 if doing pure OAuth, 
                // but for "User App" creation we need them locally or stored to generate token.
                // Re-using user_credentials columns logic or storing in profiles.
                // Let's stick to user_credentials for raw keys and profiles for tokens/status.
                is_paper_trading: paperMode,
                kill_switch_active: killSwitchActive,
                updated_at: new Date().toISOString()
            });

        // Sync to legacy table for backend compat until full migration
        await supabase.from('user_credentials').upsert({
            user_id: user.id,
            upstox_api_key: apiKey,
            upstox_api_secret: apiSecret,
            is_paper_trading: paperMode
        });

        if (error) {
            alert('Error saving profile: ' + error.message);
        } else {
            alert('Configuration Secured.');
        }
        setLoading(false);
    };

    const handleConnectUpstox = () => {
        if (!apiKey) return alert("Please save API Key first.");
        const redirectUri = window.location.origin + '/callback';
        const url = `https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=${apiKey}&redirect_uri=${redirectUri}`;
        window.location.href = url;
    };

    const toggleLiveMode = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.checked) {
            setPaperMode(true); // Switch back to paper easily
        } else {
            setShowWarning(true); // Warn before enabling Live
        }
    };

    const confirmLiveMode = () => {
        setPaperMode(false);
        setShowWarning(false);
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 font-mono">

            {/* Warning Modal */}
            {showWarning && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
                    <div className="bg-red-950/20 border border-red-500 rounded-2xl p-8 max-w-md text-center">
                        <ShieldAlert size={48} className="mx-auto text-red-500 mb-6" />
                        <h2 className="text-2xl font-bold text-red-500 mb-4">STOP & ENTER LIVE MODE?</h2>
                        <p className="text-zinc-300 mb-8">
                            You are about to enable Real Money Execution.
                            Losses can exceed your capital.
                            Algo logic will execute autonomously.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <button onClick={() => setShowWarning(false)} className="px-6 py-3 rounded-lg border border-zinc-700 hover:bg-zinc-900">Cancel</button>
                            <button onClick={confirmLiveMode} className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-500 font-bold">I UNDERSTAND THE RISK</button>
                        </div>
                    </div>
                </div>
            )}

            <header className="max-w-2xl mx-auto flex items-center gap-4 mb-8">
                <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold">Protocol Configuration</h1>
            </header>

            <div className="max-w-2xl mx-auto space-y-6">

                {/* 1. Credentials */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                            <Key className="text-blue-500" size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Broker Connection</h2>
                            <p className="text-zinc-400 text-sm">Upstox API Access</p>
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
                        <button
                            onClick={handleConnectUpstox}
                            className="w-full py-3 bg-[#5300F2] hover:bg-[#4a00db] text-white rounded-lg font-bold transition-colors"
                        >
                            Authorize with Upstox
                        </button>
                    </div>
                </div>

                {/* 2. Trading Mode */}
                <div className={`border rounded-xl p-6 flex items-center justify-between transition-colors ${paperMode ? 'bg-zinc-900 border-zinc-800' : 'bg-red-950/10 border-red-900/50'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${paperMode ? 'bg-purple-500/10' : 'bg-red-500/10'}`}>
                            {paperMode ? <ShieldCheck className="text-purple-500" size={24} /> : <Zap className="text-red-500" size={24} />}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">{paperMode ? 'Paper Trading' : 'LIVE EXECUTION'}</h2>
                            <p className="text-zinc-400 text-sm">{paperMode ? 'Simulated environment active.' : 'REAL MONEY ORDERS ENABLED.'}</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={!paperMode}
                            onChange={toggleLiveMode}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                </div>

                {/* 3. Kill Switch */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h2 className="text-lg font-bold mb-4 text-red-500">Emergency Controls</h2>
                    <button
                        onClick={() => setKillSwitchActive(!killSwitchActive)}
                        className={`w-full py-4 rounded-xl font-black tracking-widest transition-all ${killSwitchActive
                            ? 'bg-red-600 animate-pulse text-white shadow-[0_0_20px_rgba(220,38,38,0.5)]'
                            : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                            }`}
                    >
                        {killSwitchActive ? '⚠️ KILL SWITCH ACTIVE - TRADING HALTED' : 'ACTIVATE KILL SWITCH'}
                    </button>
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
