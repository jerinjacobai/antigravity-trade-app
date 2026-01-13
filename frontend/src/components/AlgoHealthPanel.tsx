import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, Wifi, WifiOff, Server, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

interface HealthState {
    status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
    lastHeartbeat: Date | null;
    marketDataStatus: string;
    component: string;
}

export default function AlgoHealthPanel() {
    const [health, setHealth] = useState<HealthState>({
        status: 'OFFLINE',
        lastHeartbeat: null,
        marketDataStatus: 'Unknown',
        component: 'WORKER'
    });

    useEffect(() => {
        fetchHealth();

        // Subscribe to Heartbeats
        const channel = supabase.channel('health_monitor')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_events', filter: "event_type=eq.HEARTBEAT" }, (payload) => {
                const event = payload.new;
                updateHealth(event);
            })
            .subscribe();

        // Staleness Check Loop (every 10s)
        const interval = setInterval(checkStaleness, 10000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, []);

    const updateHealth = (event: any) => {
        // Parse message "System Healthy. Market Data: OK"
        const msg = event.message || "";
        const mdStatus = msg.includes("Market Data: ") ? msg.split("Market Data: ")[1] : "Unknown";

        setHealth({
            status: 'ONLINE',
            lastHeartbeat: new Date(event.created_at),
            marketDataStatus: mdStatus,
            component: event.component
        });
    };

    const fetchHealth = async () => {
        // Get latest heartbeat
        const { data } = await supabase.from('system_events')
            .select('*')
            .eq('event_type', 'HEARTBEAT')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (data) {
            const hbTime = new Date(data.created_at);
            // Check if stale immediately
            if ((new Date().getTime() - hbTime.getTime()) > 70000) { // > 70s considered offline
                setHealth(prev => ({ ...prev, status: 'OFFLINE', lastHeartbeat: hbTime }));
            } else {
                updateHealth(data);
            }
        }
    };

    const checkStaleness = () => {
        setHealth(prev => {
            if (!prev.lastHeartbeat) return prev;
            const diff = new Date().getTime() - prev.lastHeartbeat.getTime();
            if (diff > 90000) { // 90s grace
                return { ...prev, status: 'OFFLINE' };
            }
            return prev;
        });
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-lg",
                    health.status === 'ONLINE' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                )}>
                    {health.status === 'ONLINE' ? <Activity size={20} /> : <WifiOff size={20} />}
                </div>
                <div>
                    <div className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                        ALGO ENGINE
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded border",
                            health.status === 'ONLINE' ? "border-green-800 text-green-500 bg-green-900/20" : "border-red-800 text-red-500 bg-red-900/20"
                        )}>
                            {health.status}
                        </span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                        <Server size={10} /> {health.component}
                        <span className="mx-1">•</span>
                        <span>Last Heartbeat: {health.lastHeartbeat ? health.lastHeartbeat.toLocaleTimeString() : 'Never'}</span>
                    </div>
                </div>
            </div>

            {/* Market Data Status */}
            <div className="flex flex-col items-end">
                <div className="text-xs text-zinc-500 mb-1">Market Data Link</div>
                <div className="flex items-center gap-2">
                    {health.marketDataStatus === 'OK' ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-green-400">
                            <Wifi size={14} /> Connected
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-yellow-500">
                            <AlertTriangle size={14} /> {health.marketDataStatus}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
