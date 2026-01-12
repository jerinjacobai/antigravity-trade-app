import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap, Shield, TrendingUp, ChevronRight, Lock } from 'lucide-react';

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-black text-white overflow-hidden font-sans selection:bg-blue-500/30">
            {/* Nav */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500" />
                        <span className="font-bold tracking-tight text-lg">QuantMind</span>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => navigate('/login')}
                            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="px-4 py-2 text-sm font-medium bg-white text-black rounded-full hover:bg-zinc-200 transition-colors"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_#1e1b4b_0%,_transparent_50%)] -z-10" />

                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
                            Institutional Grade <br />
                            <span className="text-white">Algo Trading.</span>
                        </h1>
                        <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Automate your NIFTY & SENSEX option trades with precision.
                            Features daily strategy locks, hard risk stops, and low-latency execution via Upstox.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button
                                onClick={() => navigate('/login')}
                                className="group px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
                            >
                                Launch Console <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                            <span className="text-sm text-zinc-500 flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                Systems Operational
                            </span>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Feature Grid */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                    <FeatureCard
                        icon={<TrendingUp className="text-blue-400" />}
                        title="Multiple Strategies"
                        desc="Switch between VPMS, Trend Rider, and ORB based on daily market conditions."
                    />
                    <FeatureCard
                        icon={<Shield className="text-purple-400" />}
                        title="Risk Guard"
                        desc="Hard-coded risk stops. Max 2% drawdown per day. Auto-square off at 3:15 PM."
                    />
                    <FeatureCard
                        icon={<Zap className="text-yellow-400" />}
                        title="Low Latency"
                        desc="Direct Upstox WebSocket integration for millisecond-level tick processing."
                    />
                </div>
            </section>

            {/* How It Works */}
            <section className="py-24 px-6 bg-zinc-900/30 border-y border-white/5">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-16">Workflow Engineered for Discipline</h2>

                    <div className="grid md:grid-cols-3 gap-12 relative">
                        {/* Connecting Line */}
                        <div className="hidden md:block absolute top-12 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-900 to-transparent" />

                        <Step
                            n="01"
                            title="Pre-Market"
                            desc="Log in locally to generate your secure daily Upstox token."
                        />
                        <Step
                            n="02"
                            title="Select Algo"
                            desc="Choose one strategy for the day. System locks your choice to prevent overtrading."
                        />
                        <Step
                            n="03"
                            title="Auto-Execute"
                            desc="Worker handles entry, exit, and risk management automatically."
                        />
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 text-center">
                <h2 className="text-4xl font-bold mb-6">Ready to deploy?</h2>
                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => navigate('/login')}
                        className="px-8 py-3 bg-white text-black rounded-lg font-bold hover:bg-zinc-200 transition-colors"
                    >
                        Enter Dashboard
                    </button>
                    <a
                        href="https://upstox.com"
                        target="_blank"
                        className="px-8 py-3 bg-zinc-900 border border-zinc-800 text-white rounded-lg font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2"
                    >
                        Get Upstox API <Lock size={14} />
                    </a>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 text-center text-zinc-600 text-sm border-t border-white/5">
                © 2024 QuantMind. Built for Retail, Engineered like Insti.
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="p-8 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-blue-500/30 transition-colors">
            <div className="mb-4 bg-black w-fit p-3 rounded-lg border border-zinc-800">{icon}</div>
            <h3 className="text-xl font-bold mb-3">{title}</h3>
            <p className="text-zinc-400 leading-relaxed">{desc}</p>
        </div>
    );
}

function Step({ n, title, desc }: { n: string, title: string, desc: string }) {
    return (
        <div className="relative z-10 text-center">
            <div className="w-24 h-24 mx-auto bg-black border border-zinc-800 rounded-2xl flex items-center justify-center text-2xl font-bold text-zinc-700 mb-6 shadow-xl">
                {n}
            </div>
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-zinc-400 text-sm">{desc}</p>
        </div>
    );
}
