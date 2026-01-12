import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function DashboardLayout() {
    return (
        <div className="flex bg-black min-h-screen text-white">
            <Sidebar />
            <main className="flex-1 ml-0 md:ml-64 p-8 overflow-y-auto h-screen">
                <Outlet />
            </main>
        </div>
    );
}
