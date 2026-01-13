import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen w-full bg-black text-white flex flex-col items-center justify-center p-4 font-mono">
                    <div className="bg-zinc-900 border border-red-900/50 p-6 rounded-xl max-w-lg w-full shadow-2xl">
                        <div className="flex items-center gap-3 text-red-500 mb-4">
                            <AlertTriangle size={32} />
                            <h1 className="text-xl font-bold">System Crash Detected</h1>
                        </div>

                        <p className="text-zinc-400 mb-4 text-sm">
                            The application encountered a critical runtime error.
                        </p>

                        <div className="bg-black/50 p-4 rounded border border-zinc-800 font-mono text-xs text-red-300 mb-6 overflow-auto max-h-40">
                            {this.state.error?.message || "Unknown Error"}
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-red-600 hover:bg-red-500 text-white py-2 rounded font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                            <RefreshCcw size={16} /> Reload System
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
