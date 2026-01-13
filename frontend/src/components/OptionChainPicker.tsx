import React, { useState, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface OptionChainPickerProps {
    spotPrice: number;
    index: 'NIFTY' | 'SENSEX';
    onSelect: (symbol: string) => void;
}

export default function OptionChainPicker({ spotPrice, index, onSelect }: OptionChainPickerProps) {
    const [expiry, setExpiry] = useState<string>('Current Week');
    const [selectedStrike, setSelectedStrike] = useState<number | null>(null);
    const [optionType, setOptionType] = useState<'CE' | 'PE'>('CE');
    const [strikes, setStrikes] = useState<number[]>([]);

    useEffect(() => {
        // Generate strikes based on Index logic
        if (!spotPrice) return;

        const step = index === 'NIFTY' ? 50 : 100;
        const range = 10; // Number of strikes OTM/ITM to show

        // Find ATM Strike
        const atm = Math.round(spotPrice / step) * step;

        const newStrikes = [];
        for (let i = -range; i <= range; i++) {
            newStrikes.push(atm + (i * step));
        }
        setStrikes(newStrikes);

        // Auto-select ATM if nothing selected
        if (!selectedStrike) {
            setSelectedStrike(atm);
        }

    }, [spotPrice, index]);

    // Construct Symbol (Mock format for now, needs to match Upstox format eventually)
    // Upstox Format often: "NIFTY24JAN21500CE" or similar. 
    // For V1 Paper, we use readable format "NIFTY 21500 CE" which our engine parses.
    useEffect(() => {
        if (selectedStrike) {
            const sym = `${index} ${selectedStrike} ${optionType}`;
            onSelect(sym);
        }
    }, [selectedStrike, optionType, index, onSelect]);

    return (
        <div className="space-y-4">
            {/* Controls Row */}
            <div className="flex gap-2">
                {/* Option Type Toggle */}
                <div className="flex p-1 bg-black rounded-lg border border-zinc-800 w-full">
                    <button
                        onClick={() => setOptionType('CE')}
                        className={cn("flex-1 text-xs font-bold py-1.5 rounded transition-all", optionType === 'CE' ? "bg-green-600/20 text-green-400" : "text-zinc-500 hover:text-zinc-300")}
                    >
                        CE
                    </button>
                    <button
                        onClick={() => setOptionType('PE')}
                        className={cn("flex-1 text-xs font-bold py-1.5 rounded transition-all", optionType === 'PE' ? "bg-red-600/20 text-red-400" : "text-zinc-500 hover:text-zinc-300")}
                    >
                        PE
                    </button>
                </div>
            </div>

            {/* Strikes Grid */}
            <div className="h-48 overflow-y-auto pr-1 custom-scrollbar space-y-1 bg-black/40 rounded-lg p-2 border border-zinc-800/50">
                {strikes.map((strike) => {
                    const isATM = Math.abs(strike - spotPrice) < (index === 'NIFTY' ? 25 : 50);
                    const isSelected = selectedStrike === strike;

                    return (
                        <button
                            key={strike}
                            onClick={() => setSelectedStrike(strike)}
                            className={cn(
                                "w-full flex justify-between items-center px-3 py-2 rounded text-sm font-mono transition-all",
                                isSelected ? "bg-indigo-600 text-white" : "hover:bg-zinc-800 text-zinc-400",
                                isATM && !isSelected && "bg-zinc-800/50 text-yellow-500"
                            )}
                        >
                            <span>{strike}</span>
                            {isATM && <span className="text-[10px] uppercase bg-yellow-500/20 text-yellow-500 px-1 rounded">ATM</span>}
                            {isSelected && <Check size={14} />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
