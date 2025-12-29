export interface SendMessageRequest {
  roomName: string;
  userId: string;
  userName: string;
  content: string;
  clientMessageId: string;
}

export interface ChatMessage {
  id: number;
  roomName: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
  clientMessageId?: string;
}

export interface ChatHistoryResponse {
  messages: ChatMessageDto[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ChatMessageDto {
  id: number;
  roomName: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
  clientMessageId?: string;
}

export interface ChatMessageEvent {
  eventType: 'MESSAGE_SENT' | 'USER_JOINED' | 'USER_LEFT';
  roomName: string;
  userId: string;
  userName: string;
  content?: string;
  timestamp: string;
}
