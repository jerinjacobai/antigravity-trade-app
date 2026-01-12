import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

export default function DashboardLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex bg-black min-h-screen text-white">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full z-40 bg-zinc-950 border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500" />
                    <span className="font-bold tracking-tight text-white">QuantMind</span>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="text-zinc-400 hover:text-white"
                >
                    <Menu size={24} />
                </button>
            </div>

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 overflow-y-auto h-screen">
                <Outlet />
            </main>
        </div>
    );
}
