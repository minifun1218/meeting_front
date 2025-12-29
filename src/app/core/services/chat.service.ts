import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { 
  SendMessageRequest, 
  ChatHistoryResponse, 
  ChatMessageDto,
  ChatMessageEvent 
} from '../models/chat.models';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly apiUrl = environment.chatServiceUrl || 'http://localhost:8081/api/chat';
  
  private messagesSubject = new BehaviorSubject<ChatMessageDto[]>([]);
  public messages$ = this.messagesSubject.asObservable();
  
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHttpHeaders(): HttpHeaders {
    const user = this.authService.getCurrentUser();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-User-ID': user?.id || '',
      'X-User-Name': user?.displayName || ''
    });
  }

  /**
   * 发送消息
   */
  sendMessage(roomName: string, content: string): Observable<{ status: string; message: string; clientMessageId: string }> {
    const user = this.authService.getCurrentUser();
    if (!user) {
      throw new Error('用户未登录');
    }

    const request: SendMessageRequest = {
      roomName,
      userId: user.id,
      userName: user.displayName,
      content,
      clientMessageId: uuidv4()
    };

    return this.http.post<{ status: string; message: string; clientMessageId: string }>(
      `${this.apiUrl}/messages`,
      request,
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * 获取聊天历史记录
   */
  getChatHistory(roomName: string, page: number = 0, size: number = 50): Observable<ChatHistoryResponse> {
    return this.http.get<ChatHistoryResponse>(
      `${this.apiUrl}/messages/${roomName}?page=${page}&size=${size}`
    );
  }

  /**
   * 获取最近的消息
   */
  getRecentMessages(roomName: string, limit: number = 20): Observable<ChatMessageDto[]> {
    return this.http.get<ChatMessageDto[]>(
      `${this.apiUrl}/messages/${roomName}/recent?limit=${limit}`
    );
  }

  /**
   * 获取房间消息统计
   */
  getMessageStats(roomName: string): Observable<{ roomName: string; messageCount: number }> {
    return this.http.get<{ roomName: string; messageCount: number }>(
      `${this.apiUrl}/messages/${roomName}/stats`
    );
  }

  /**
   * 用户加入房间通知
   */
  notifyUserJoined(roomName: string): Observable<{ status: string; message: string }> {
    return this.http.post<{ status: string; message: string }>(
      `${this.apiUrl}/rooms/${roomName}/join`,
      {},
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * 用户离开房间通知
   */
  notifyUserLeft(roomName: string): Observable<{ status: string; message: string }> {
    return this.http.post<{ status: string; message: string }>(
      `${this.apiUrl}/rooms/${roomName}/leave`,
      {},
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * 发送系统消息
   */
  sendSystemMessage(roomName: string, content: string): Observable<{ status: string; message: string }> {
    const request = {
      roomName,
      content,
      messageType: 'SYSTEM'
    };

    return this.http.post<{ status: string; message: string }>(
      `${this.apiUrl}/messages/system`,
      request,
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * 健康检查
   */
  checkHealth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }

  /**
   * 添加消息到本地状态
   */
  addMessage(message: ChatMessageDto): void {
    const currentMessages = this.messagesSubject.value;
    const updatedMessages = [...currentMessages, message].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    this.messagesSubject.next(updatedMessages);
  }

  /**
   * 更新本地消息列表
   */
  updateMessages(messages: ChatMessageDto[]): void {
    const sortedMessages = messages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    this.messagesSubject.next(sortedMessages);
  }

  /**
   * 清空消息
   */
  clearMessages(): void {
    this.messagesSubject.next([]);
    this.unreadCountSubject.next(0);
  }

  /**
   * 获取当前消息列表
   */
  getCurrentMessages(): ChatMessageDto[] {
    return this.messagesSubject.value;
  }

  /**
   * 标记消息为已读
   */
  markAsRead(): void {
    this.unreadCountSubject.next(0);
  }

  /**
   * 增加未读计数
   */
  incrementUnreadCount(): void {
    const current = this.unreadCountSubject.value;
    this.unreadCountSubject.next(current + 1);
  }

  /**
   * 获取未读消息数量
   */
  getUnreadCount(): number {
    return this.unreadCountSubject.value;
  }

  /**
   * 处理实时消息事件
   */
  handleChatEvent(event: ChatMessageEvent): void {
    switch (event.eventType) {
      case 'MESSAGE_SENT':
        if (event.content) {
          const message: ChatMessageDto = {
            id: Date.now(), // 临时ID，实际应该从服务器获取
            roomName: event.roomName,
            userId: event.userId,
            userName: event.userName,
            content: event.content,
            timestamp: event.timestamp
          };
          this.addMessage(message);
          
          // 如果不是当前用户发送的消息，增加未读计数
          const currentUser = this.authService.getCurrentUser();
          if (currentUser && event.userId !== currentUser.id) {
            this.incrementUnreadCount();
          }
        }
        break;
      case 'USER_JOINED':
        // 可以添加系统消息显示用户加入
        break;
      case 'USER_LEFT':
        // 可以添加系统消息显示用户离开
        break;
    }
  }
}
