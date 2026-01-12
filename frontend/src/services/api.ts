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
        risk_stats: risk || { daily_trades: 0, m