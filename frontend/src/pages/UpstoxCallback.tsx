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
            console.log("Processing Auth Code:", code);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

            // Invoke Edge Function via Fetch for debugging
            // const { data, error } = await supabase.functions.invoke('exchange-upstox-token', { ... });

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            console.log("Debug: Using Token:", token ? "YES (Length " + token.length + ")" : "NO");

            // Construct URL dynamically
            // Extract project ref from URL or just use the known structure
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const functionUrl = `${supabaseUrl}/functions/v1/exchange-upstox-token`;

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    code,
                    user_id: user.id,
                    redirect_uri: window.location.origin + '/callback'
                })
            });

            let data;
            try {
                data = await response.json();
            } catch (e) {
                console.error("Failed to parse JSON response");
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            if (!response.ok) {
                console.error("Function Error Response:", data);
                throw new Error(data.message || `Function failed with status ${response.status}`);
            }

            // Standardize success check
            if (!data.success && !data.message) {
                // Sometimes success true is implicit if 200 OK
            }


            if (!data?.success) throw new Error(data?.message || 'Exchange failed');

            setStatus('success');
            setMessage('Secure Connection Established.');

            setTimeout(() => {
                navigate('/settings');
            }, 2000);

        } catch (error: any) {
            console.error("Upstox Auth Error Details:", error);
            if (error && typeof error === 'object') {
                console.log("Error Context:", JSON.stringify(error, null, 2));
            }
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
