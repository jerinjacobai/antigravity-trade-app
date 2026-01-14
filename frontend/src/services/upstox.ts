import { supabase } from '../lib/supabase';

interface MarketStatusResponse {
    status: string;
    data: {
        exchange: string;
        status: string;
        last_updated: number;
    };
}

export const getUpstoxMarketStatus = async (exchange: string = 'NSE'): Promise<MarketStatusResponse | null> => {
    try {
        // 1. Get User
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // 2. Get Access Token
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('upstox_access_token')
            .eq('user_id', user.id)
            .single();

        if (!profile?.upstox_access_token) {
            console.warn("Upstox: No access token found.");
            return null;
        }

        // 3. Call Upstox API
        const response = await fetch(`https://api.upstox.com/v2/market/status/${exchange}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${profile.upstox_access_token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.warn("Upstox: Token expired or invalid.");
                return null;
            }
            throw new Error(`Upstox API Error: ${response.statusText}`);
        }

        return await response.json();

    } catch (error) {
        console.error("Failed to fetch Upstox market status:", error);
        return null;
    }
};
