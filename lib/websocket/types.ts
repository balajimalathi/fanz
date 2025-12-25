// WebSocket message types for chat system

export type WebSocketMessageType =
  | "message:send"
  | "message:received"
  | "message:read"
  | "typing:start"
  | "typing:stop"
  | "call:initiate"
  | "call:accept"
  | "call:reject"
  | "call:end"
  | "call:ringing"
  | "error"
  | "ping"
  | "pong";

export interface BaseWebSocketMessage {
  type: WebSocketMessageType;
  timestamp: number;
  messageId?: string;
}

export interface MessageSendPayload {
  conversationId: string;
  messageType: "text" | "image" | "audio" | "video";
  content?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
}

export interface MessageSendMessage extends BaseWebSocketMessage {
  type: "message:send";
  payload: MessageSendPayload;
}

export interface MessageReceivedMessage extends BaseWebSocketMessage {
  type: "message:received";
  payload: {
    messageId: string;
    conversationId: string;
  };
}

export interface MessageReadMessage extends BaseWebSocketMessage {
  type: "message:read";
  payload: {
    messageId: string;
    conversationId: string;
  };
}

export interface TypingStartMessage extends BaseWebSocketMessage {
  type: "typing:start";
  payload: {
    conversationId: string;
    userId: string;
  };
}

export interface TypingStopMessage extends BaseWebSocketMessage {
  type: "typing:stop";
  payload: {
    conversationId: string;
    userId: string;
  };
}

export interface CallInitiateMessage extends BaseWebSocketMessage {
  type: "call:initiate";
  payload: {
    callId: string;
    callType: "audio" | "video";
    receiverId: string;
    conversationId?: string;
  };
}

export interface CallAcceptMessage extends BaseWebSocketMessage {
  type: "call:accept";
  payload: {
    callId: string;
    livekitRoomName: string;
    token: string;
  };
}

export interface CallRejectMessage extends BaseWebSocketMessage {
  type: "call:reject";
  payload: {
    callId: string;
    reason?: string;
  };
}

export interface CallEndMessage extends BaseWebSocketMessage {
  type: "call:end";
  payload: {
    callId: string;
    duration?: number;
  };
}

export interface CallRingingMessage extends BaseWebSocketMessage {
  type: "call:ringing";
  payload: {
    callId: string;
  };
}

export interface ErrorMessage extends BaseWebSocketMessage {
  type: "error";
  payload: {
    code: string;
    message: string;
  };
}

export interface PingMessage extends BaseWebSocketMessage {
  type: "ping";
}

export interface PongMessage extends BaseWebSocketMessage {
  type: "pong";
}

export type WebSocketMessage =
  | MessageSendMessage
  | MessageReceivedMessage
  | MessageReadMessage
  | TypingStartMessage
  | TypingStopMessage
  | CallInitiateMessage
  | CallAcceptMessage
  | CallRejectMessage
  | CallEndMessage
  | CallRingingMessage
  | ErrorMessage
  | PingMessage
  | PongMessage;

export interface WebSocketConnection {
  userId: string;
  ws: WebSocket;
  lastPing: number;
  conversations: Set<string>; // Track which conversations user is viewing
}

