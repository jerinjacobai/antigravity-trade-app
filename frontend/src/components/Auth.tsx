import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            alert(error.message);
        } else {
            navigate('/select-algo');
        }
        setLoading(false);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-black text-white">
            <div className="w-full max-w-md p-8 space-y-6 bg-zinc-900 rounded-xl border border-zinc-800">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Antigravity Login
                </h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400">Email</label>
                        <input
                            type="email"
                            className="w-full p-3 mt-1 bg-black border border-zinc-700 rounded-lg focus:ring focus:ring-blue-500 focus:outline-none"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-400">Password</label>
                        <input
                            type="password"
                            className="w-full p-3 mt-1 bg-black border border-zinc-700 rounded-lg focus:ring focus:ring-blue-500 focus:outline-none"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-3 font-semibold text-black bg-blue-500 rounded-lg hover:bg-blue-400 transition-colors"
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Enter Terminal'}
                    </button>
                    <p className="text-xs text-center text-zinc-500">
                        Restricted Access. Authorized Personnel Only.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Auth;
