"use client";

import { io, Socket } from "socket.io-client";
import { WebSocketMessage } from "@/lib/websocket/types";

export class SocketIOClient {
  private socket: Socket | null = null;
  private url: string;
  private token: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private messageQueue: WebSocketMessage[] = [];
  private listeners: Map<string, Set<(message: WebSocketMessage) => void>> = new Map();
  private onConnectCallback?: () => void;
  private onDisconnectCallback?: () => void;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    try {
      this.socket = io(this.url, {
        auth: {
          token: this.token,
        },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.socket.on("connect", () => {
        console.log("[CLIENT] Socket.IO connected, socket ID:", this.socket?.id);
        console.log("[CLIENT] Socket.IO URL:", this.url);
        console.log("[CLIENT] Socket.IO auth token:", this.token ? "PRESENT" : "MISSING");
        // Store reference globally for debugging
        if (typeof window !== "undefined") {
          (window as any).__socketIOClient = this;
        }
        this.reconnectAttempts = 0;
        this.onConnectCallback?.();

        // Send queued messages
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift();
          if (message) {
            this.send(message);
          }
        }
      });

      this.socket.on("disconnect", (reason) => {
        console.log("Socket.IO disconnected:", reason);
        this.onDisconnectCallback?.();
      });

      this.socket.on("connect_error", (error) => {
        console.error("Socket.IO connection error:", error);
        this.reconnectAttempts++;
      });

      // Listen for messages
      this.socket.on("message", (message: WebSocketMessage) => {
        console.log("Socket.IO received message:", message.type, message);
        this.handleMessage(message);
      });

      // Handle ping/pong
      this.socket.on("ping", () => {
        this.socket?.emit("pong");
      });
    } catch (error) {
      console.error("Error creating Socket.IO connection:", error);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  send(message: WebSocketMessage): void {
    console.log("[CLIENT] send() called, message type:", message.type, "connected:", this.socket?.connected);
    if (this.socket?.connected) {
      // Map message types to Socket.IO events
      const eventName = message.type;
      console.log(`[CLIENT] Emitting event "${eventName}" with message:`, message);
      this.socket.emit(eventName, message);
      console.log("[CLIENT] Message emitted successfully");
    } else {
      // Queue message if not connected
      this.messageQueue.push(message);
      // Try to reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.connect();
      }
    }
  }

  on(messageType: string, callback: (message: WebSocketMessage) => void): () => void {
    console.log(`[CLIENT] on() called for message type: ${messageType}`);
    if (!this.listeners.has(messageType)) {
      this.listeners.set(messageType, new Set());
    }
    this.listeners.get(messageType)!.add(callback);
    console.log(`[CLIENT] Total listeners for ${messageType}: ${this.listeners.get(messageType)!.size}`);

    // Return unsubscribe function
    return () => {
      this.listeners.get(messageType)?.delete(callback);
      console.log(`[CLIENT] Unsubscribed from ${messageType}`);
    };
  }

  onConnect(callback: () => void): void {
    this.onConnectCallback = callback;
    if (this.socket?.connected) {
      callback();
    }
  }

  onDisconnect(callback: () => void): void {
    this.onDisconnectCallback = callback;
  }

  private handleMessage(message: WebSocketMessage): void {
    console.log("Handling message type:", message.type, "Listeners:", this.listeners.size);
    // Call specific type listeners
    const typeListeners = this.listeners.get(message.type);
    if (typeListeners) {
      console.log(`Calling ${typeListeners.size} listeners for type: ${message.type}`);
      typeListeners.forEach((callback) => callback(message));
    }

    // Call wildcard listeners
    const wildcardListeners = this.listeners.get("*");
    if (wildcardListeners) {
      wildcardListeners.forEach((callback) => callback(message));
    }
  }

  get readyState(): number {
    if (!this.socket) return 3; // CLOSED
    if (this.socket.connected) return 1; // OPEN
    return 0; // CONNECTING
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

