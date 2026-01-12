import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Zap, Settings, BookOpen, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

const menuItems = [
    { icon: LayoutDashboard, label: 'Terminal', path: '/dashboard' },
    { icon: Zap, label: 'Strategies', path: '/select-algo' },
    { icon: BookOpen, label: 'Trade Logs', path: '/logs' }, // Placeholder for future
    { icon: Settings, label: 'Configuration', path: '/settings' },
];

export default function Sidebar() {
    const location = useLocation();

    const handleLogout = () => {
        supabase.auth.signOut();
    };

    return (
        <aside className="hidden md:flex flex-col w-64 bg-zinc-950 border-r border-zinc-900 h-screen fixed left-0 top-0">
            <div className="p-6 border-b border-zinc-900">
                <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500" />
                    <span className="font-bold tracking-tight text-white">QuantMind</span>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-blue-600/10 text-blue-500"
                                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                            )}
                        >
                            <item.icon size={18} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-zinc-900">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/10 rounded-lg transition-colors"
                >
                    <LogOut size={18} />
                    Disconnect
                </button>
            </div>
        </aside>
    );
}
