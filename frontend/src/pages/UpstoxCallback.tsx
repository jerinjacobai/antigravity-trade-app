import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function UpstoxCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('Exchanging Authorization Code...');

    useEffect(() => {
        const code = searchParams.get('code');
        if (code) {
            handleExchange(code);
        } else {
            setStatus('error');
            setMessage('No authorization code found in URL.');
        }
    }, [searchParams]);

    const handleExchange = async (code: string) => {
        try {
            console.log("Processing Auth Code:", code); // Fix unused var lint
            // In a real production setup, this 'exchange_token' would be an Edge Function
            // or a secure backend endpoint to avoid exposing logic.
            // For this phase, we will invoke a Supabase Function.

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

            // Invoke Edge Function (Mocked for now as we haven't deployed it yet)
            // const { data, error } = await supabase.functions.invoke('exchange-upstox-token', {
            //    body: { code, user_id: user.id }
            // });

            // SIMULATION OF SUCCESSFUL EXCHANGE for Phase 3 Demo:
            // We'll manually store a dummy token to indicate "Connected"
            // REPLACE THIS with actual API call when Edge Function is ready.

            await new Promise(r => setTimeout(r, 1500)); // Fake network delay

            const { error: dbError } = await supabase
                .from('user_profiles')
                .upsert({
                    user_id: user.id,
                    upstox_access_token: "chk_" + Math.random().toString(36).substring(7), // Mock Token
                    token_expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (dbError) throw dbError;

            setStatus('success');
            setMessage('Secure Connection Established.');

            setTimeout(() => {
                navigate('/settings');
            }, 2000);

        } catch (error: any) {
            console.error(error);
            setStatus('error');
            setMessage(error.message || 'Token exchange failed.');
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-mono">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-sm w-full text-center">

                {status === 'processing' && (
                    <>
                        <Loader2 className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold mb-2">Authenticating</h2>
                        <p className="text-zinc-400 text-sm">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold mb-2">Connected!</h2>
                        <p className="text-zinc-400 text-sm">{message}</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold mb-2">Connection Failed</h2>
                        <p className="text-red-400 text-sm mb-6">{message}</p>
                        <button
                            onClick={() => navigate('/settings')}
                            className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm"
                        >
                            Return to Settings
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
