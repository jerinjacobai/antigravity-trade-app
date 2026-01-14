import { Root, load } from 'protobufjs';

type EventType = 'open' | 'close' | 'message' | 'error' | 'reconnecting';

class MarketSocket {
    private socket: WebSocket | null = null;
    private eventListeners: Map<EventType, Set<Function>> = new Map();
    private protoRoot: Root | null = null;
    private token: string | null = null;

    // Auto Reconnect Config
    private autoReconnectEnabled: boolean = true;
    private reconnectInterval: number = 5000;
    private maxRetries: number = 10;
    private retryCount: number = 0;
    private reconnectTimer: any = null;

    private instrumentKeys: Set<string> = new Set();
    private currentMode: 'ltpc' | 'full' | 'full_d30' | 'option_greeks' = 'full_d30';
    private isConnected: boolean = false;

    constructor() {
        this.initProto();
    }

    private async initProto() {
        try {
            this.protoRoot = await load('/MarketDataFeed.proto');
            console.log("Protobuf loaded");
        } catch (e) {
            console.error("Failed to load protobuf", e);
        }
    }

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

        const url = `wss://api.upstox.com/v3/feed/market-data-feed`;

        try {
            this.socket = new WebSocket(url);
            this.socket.binaryType = 'arraybuffer';

            this.socket.onopen = () => {
                console.log("Market Socket Connected");
                this.isConnected = true;
                this.retryCount = 0;
                this.emit('open');
                this.resubscribe();
            };

            this.socket.onmessage = async (event) => {
                if (!this.protoRoot) return;
                const buffer = event.data as ArrayBuffer;
                const FeedResponse = this.protoRoot.lookupType("com.upstox.marketdatafeederv3udapi.rpc.proto.FeedResponse");

                try {
                    const message = FeedResponse.decode(new Uint8Array(buffer));
                    const object = FeedResponse.toObject(message, {
                        longs: String,
                        enums: String,
                        bytes: String,
                    });
                    this.emit('message', object);
                } catch (e) {
                    console.error("Decode Error", e);
                    this.emit('error', e);
                }
            };

            this.socket.onclose = () => {
                console.log("Socket Closed");
                this.isConnected = false;
                this.emit('close');
                this.handleReconnect();
            };

            this.socket.onerror = (err) => {
                console.error("Socket Error", err);
                this.emit('error', err);
            };

        } catch (err) {
            this.emit('error', err);
            this.handleReconnect();
        }
    }

    public subscribe(keys: string[], mode: 'ltpc' | 'full' | 'full_d30' | 'option_greeks' = 'full_d30') {
        keys.forEach(k => this.instrumentKeys.add(k));
        this.currentMode = mode;
        if (this.isConnected) {
            this.sendRequest("sub", keys, mode);
        }
    }

    public unsubscribe(keys: string[]) {
        keys.forEach(k => this.instrumentKeys.delete(k));
        if (this.isConnected) {
            this.sendRequest("unsub", keys, this.currentMode); // Mode ignored for unsub usually
        }
    }

    public changeMode(keys: string[], mode: 'ltpc' | 'full' | 'full_d30' | 'option_greeks') {
        this.currentMode = mode;
        if (this.isConnected) {
            this.sendRequest("change_mode", keys, mode);
        }
    }

    public auto_reconnect(enable: boolean, interval: number = 5000, retryCount: number = 10) {
        this.autoReconnectEnabled = enable;
        this.reconnectInterval = interval * 1000; // SDK says interval in seconds
        this.maxRetries = retryCount;
    }

    private sendRequest(method: string, keys: string[], mode: string) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

        const request = {
            guid: crypto.randomUUID(),
            method: method,
            data: {
                mode: mode,
                instrumentKeys: keys
            }
        };

        this.socket.send(new TextEncoder().encode(JSON.stringify(request)));
    }

    private handleReconnect() {
        if (!this.autoReconnectEnabled || this.retryCount >= this.maxRetries) {
            if (this.retryCount >= this.maxRetries) this.emit('reconnecting', 'Max retries reached');
            return;
        }

        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

        this.reconnectTimer = setTimeout(() => {
            this.retryCount++;
            this.emit('reconnecting', `Attempt ${this.retryCount}/${this.maxRetries}`);
            if (this.token) this.connect(this.token);
        }, this.reconnectInterval);
    }

    private resubscribe() {
        if (this.instrumentKeys.size > 0) {
            this.sendRequest("sub", Array.from(this.instrumentKeys), this.currentMode);
        }
    }

    public disconnect() {
        this.autoReconnectEnabled = false; // Prevent auto reconnect on manual disconnect
        this.token = null;
        if (this.socket) {
            this.socket.close();
        }
    }
}

export const marketSocket = new MarketSocket();
