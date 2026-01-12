import { supabase } from '../lib/supabase';

export const getSystemStatus = async () => {
    // In Vercel architecture, we read latest state from DB
    const { data: state } = await supabase
        .from('daily_state')
        .select('*')
        .eq('date', new Date().toISOString().split('T')[0])
        .single();

    const { data: risk } = await supabase
        .from('risk_state')
        .select('*')
        .eq('date', new Date().toISOString().split('T')[0])
        .single();

    return {
        algo_state: state || { algo: null, locked: false },
        risk_stats: risk || { daily_trades: 0, max_trades: 25 },
        market_data: true // Worker updates this heartbeat usually
    };
};

export const selectAlgo = async (algoName: string) => {
    const today = new Date().toISOString().split('T')[0];

    // 1. Check if allowed (Client side check, Row Level Security handles backend check)
    const { data: current } = await supabase
        .from('daily_state')
        .select('*')
        .eq('date', today)
        .single();

    if (current?.is_locked) {
        throw new Error("Algo already locked for today");
    }

    // 2. Upsert selection
    const { error } = await supabase
        .from('daily_state')
        .upsert({
            date: today,
            algo_name: algoName,
            is_locked: true,
            is_running: true
        }, { onConflict: 'date' });

    if (error) throw error;
    return { status: "success" };
};

export const startSimulation = async () => {
    // Send command via DB
    const today = new Date().toISOString().split('T')[0];
    await supabase
        .from('daily_state')
        .update({ is_running: true })
        .eq('date', today);
};
