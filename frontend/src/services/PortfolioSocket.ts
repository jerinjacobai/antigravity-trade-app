type PortfolioCallback = (data: any) => void;
type EventType = 'open' | 'close' | 'message' | 'error' | 'reconnecting';

class PortfolioSocket {
    private socket: WebSocket | null = null;
    private eventListeners: Map<EventType, Set<Function>> = new Map();
    private token: string | null = null;

    // Auto Reconnect Config
    private autoReconnectEnabled: boolean = true;
    private reconnectInterval: number = 5000;
    private maxRetries: number = 10;
    private retryCount: number = 0;
    private reconnectTimer: any = null;

    private isConnected: boolean = false;

    // Callbacks
    public on(event: EventType, callback: Function) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)?.add(callback);
    }

    private emit(event: EventType, data?: any) {
        this.eventListeners.get(event)?.forEach(cb => cb(data));
    }

    public async connect(token: string) {
        if (this.socket?.readyState === WebSocket.OPEN) return;
        this.token = token;

        // Portfolio Feed URL (from docs)
        const url = `wss://api.upstox.com/v3/feed/portfolio-stream-feed`;

        try {
            this.socket = new WebSocket(url);
            // Portfolio feed sends JSON usually, but Upstox might use Proto?
            // Docs say "Portfolio Stream Feed API" but don't explicitly mention Proto like Market Feed.
            // However, most V3 APIs use Proto. Let's assume JSON first unless verified otherwise 
            // OR check the "MarketDataFeedV3" proto... wait, that's for Market Data.
            // User docs for Portfolio say: "Connecting... straightforward... on_message print(message)".
            // If it was Proto, the Python example would likely show decoding steps or use a typed client.
            // The Python example `streamer = upstox_client.PortfolioDataStreamer(...)` handles decoding internally.
            // We'll treat it as text/JSON for now, or ArrayBuffer if it fails.

            this.socket.onopen = () => {
                console.log("Portfolio Socket Connected");
                this.isConnected = true;
                this.retryCount = 0;
                this.emit('open');
            };

            this.socket.onmessage = (event) => {
                // Assuming JSON text frames for now based on typical Order Update feeds
                // If this is binary, we will need the Proto file for Portfolio which was NOT provided.
                try {
                    const data = JSON.parse(event.data);
                    this.emit('message', data);
                } catch (e) {
                    console.log("Non-JSON message received", event.data);
                    this.emit('message', event.data);
                }
            };

            this.socket.onclose = () => {
                console.log("Portfolio Socket Closed");
                this.isConnected = false;
                this.emit('close');
                this.handleReconnect();
            };

            this.socket.onerror = (err) => {
                console.error("Portfolio Socket Error", err);
                this.emit('error', err);
            };

        } catch (err) {
            this.emit('error', err);
            this.handleReconnect();
        }
    }

    public auto_reconnect(enable: boolean, interval: number = 5000, retryCount: number = 10) {
        this.autoReconnectEnabled = enable;
        this.reconnectInterval = interval * 1000;
        this.maxRetries = retryCount;
    }

    private handleReconnect() {
        if (!this.autoReconnectEnabled || this.retryCount >= this.maxRetries) {
            return;
        }

        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

        this.reconnectTimer = setTimeout(() => {
            this.retryCount++;
            this.emit('reconnecting', `Attempt ${this.retryCount}/${this.maxRetries}`);
            if (this.token) this.connect(this.token);
        }, this.reconnectInterval);
    }

    public disconnect() {
        this.autoReconnectEnabled = false;
        this.token = null;
        if (this.socket) {
            this.socket.close();
        }
    }
}

export const portfolioSocket = new PortfolioSocket();
