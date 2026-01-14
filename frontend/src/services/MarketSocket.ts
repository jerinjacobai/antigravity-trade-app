import { Root, load } from 'protobufjs';

type MarketCallback = (data: any) => void;

class MarketSocket {
    private socket: WebSocket | null = null;
    private subscribers: Set<MarketCallback> = new Set();
    private protoRoot: Root | null = null;
    private token: string | null = null;
    private reconnectTimer: any = null;
    private instrumentKeys: Set<string> = new Set();
    private isConnected: boolean = false;

    constructor() {
        this.initProto();
    }

    private async initProto() {
        try {
            // Load from public folder
            this.protoRoot = await load('/MarketDataFeed.proto');
            console.log("Protobuf loaded");
        } catch (e) {
            console.error("Failed to load protobuf", e);
        }
    }

    public async connect(token: string) {
        if (this.socket?.readyState === WebSocket.OPEN) return;
        this.token = token;

        // Upstox V3 Auth URL (Client should handle Redirect, but browsers do it automatically)
        const url = `wss://api.upstox.com/v3/feed/market-data-feed`;

        this.socket = new WebSocket(url);
        this.socket.binaryType = 'arraybuffer';

        this.socket.onopen = () => {
            console.log("Market Socket Connected");
            this.isConnected = true;
            // Send Auth Init / Handshake if required? 
            // Upstox V3 docs say: "Authorization header" ... wait, standard JS WebSocket API doesn't support headers.
            // Upstox V3 says: "Auto redirect... to authorized endpoint"
            // Usually we need to pass access_token query param if headers not supported, OR the URL is dynamic.
            // Documentation says: 
            // "To connect... use wss: protocol... Authorization: Bearer {token}"
            // BROWSERS DO NOT SUPPORT CUSTOM HEADERS IN WEBSOCKETS.
            // Usually there is a query param fallback `?token=...` or a ticket system.
            // I will try `?token=` first or look for the "authorized endpoint" flow.
            // The docs say "automatically redirect".

            // Wait, if it requires a header and we are in browser, we might be stuck unless there is a cookie or query param.
            // Let's assume standard Upstox method: `https://api.upstox.com/v3/feed/market-data-feed/auth` -> returns 302 -> follows.
            // But WebSocket() constructor follows redirects?

            // For now, I will assume we might need to fetch a specific URL first.
            // But let's try strict connection first.

            this.resubscribe();
        };

        this.socket.onmessage = async (event) => {
            if (!this.protoRoot) return;

            const buffer = event.data as ArrayBuffer;
            const FeedResponse = this.protoRoot.lookupType("com.upstox.marketdatafeederv3udapi.rpc.proto.FeedResponse");

            try {
                // Decode
                const message = FeedResponse.decode(new Uint8Array(buffer));
                const object = FeedResponse.toObject(message, {
                    longs: String,
                    enums: String,
                    bytes: String,
                });

                this.notify(object);
            } catch (e) {
                console.error("Decode Error", e);
            }
        };

        this.socket.onclose = () => {
            console.log("Socket Closed");
            this.isConnected = false;
            this.scheduleReconnect();
        };

        this.socket.onerror = (err) => {
            console.error("Socket Error", err);
        };
    }

    public subscribe(keys: string[]) {
        keys.forEach(k => this.instrumentKeys.add(k));
        if (this.isConnected) {
            this.sendSubscription(keys);
        }
    }

    private sendSubscription(keys: string[]) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

        const request = {
            guid: "some-guid", // random UUID
            method: "sub",
            data: {
                mode: "full",
                instrumentKeys: keys
            }
        };

        // Upstox requires BINARY message for request? 
        // "The WebSocket request message should be sent in binary format, not as a text message."
        // So we need to encode this JSON as utf-8 bytes? Or is there a Proto for Requests?
        // The Docs say "Request structure ... { json }".
        // "sent in binary format" usually means TextEncoder().encode(JSON.stringify(req)).

        this.socket.send(new TextEncoder().encode(JSON.stringify(request)));
    }

    public onMessage(cb: MarketCallback) {
        this.subscribers.add(cb);
        return () => this.subscribers.delete(cb);
    }

    private notify(data: any) {
        this.subscribers.forEach(cb => cb(data));
    }

    private scheduleReconnect() {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
            if (this.token) this.connect(this.token);
        }, 5000);
    }

    private resubscribe() {
        if (this.instrumentKeys.size > 0) {
            this.sendSubscription(Array.from(this.instrumentKeys));
        }
    }

    public disconnect() {
        this.token = null;
        if (this.socket) {
            this.socket.close();
        }
    }
}

export const marketSocket = new MarketSocket();
