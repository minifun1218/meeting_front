import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { ChatMessageDto } from '../../../core/models/chat.models';
import { User } from '../../../core/models/auth.models';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  template: `
    <div class="chat-panel">
      <!-- 聊天头部 -->
      <div class="chat-header">
        <div class="header-title">
          <mat-icon>chat</mat-icon>
          <span>会议聊天</span>
        </div>
        
        <div class="header-actions">
          <button mat-icon-button 
                  (click)="loadChatHistory()"
                  [disabled]="isLoadingHistory"
                  matTooltip="刷新消息">
            <mat-icon *ngIf="!isLoadingHistory">refresh</mat-icon>
            <mat-spinner *ngIf="isLoadingHistory" diameter="20"></mat-spinner>
          </button>
          
          <button mat-icon-button 
                  (click)="onClose.emit()"
                  matTooltip="关闭聊天">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div class="chat-messages" #messagesContainer>
        <div class="loading-container" *ngIf="isLoadingHistory && messages.length === 0">
          <mat-spinner diameter="30"></mat-spinner>
          <p>加载消息...</p>
        </div>

        <div class="messages-list" *ngIf="messages.length > 0">
          <div *ngFor="let message of messages; trackBy: trackByMessageId" 
               class="message-item"
               [class.own-message]="isOwnMessage(message)"
               [class.other-message]="!isOwnMessage(message)">
            
            <!-- 其他人的消息 -->
            <div *ngIf="!isOwnMessage(message)" class="message-container other">
              <div class="message-avatar">
                {{getInitials(message.userName)}}
              </div>
              
              <div class="message-content">
                <div class="message-header">
                  <span class="sender-name">{{message.userName}}</span>
                  <span class="message-time">{{formatTime(message.timestamp)}}</span>
                </div>
                <div class="message-text">{{message.content}}</div>
              </div>
            </div>

            <!-- 自己的消息 -->
            <div *ngIf="isOwnMessage(message)" class="message-container own">
              <div class="message-content">
                <div class="message-header">
                  <span class="message-time">{{formatTime(message.timestamp)}}</span>
                </div>
                <div class="message-text">{{message.content}}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div class="empty-messages" *ngIf="!isLoadingHistory && messages.length === 0">
          <mat-icon class="empty-icon">chat_bubble_outline</mat-icon>
          <p>还没有消息</p>
          <p class="empty-subtitle">发送第一条消息开始聊天</p>
        </div>
      </div>

      <!-- 消息输入区域 -->
      <div class="chat-input">
        <form [formGroup]="messageForm" (ngSubmit)="sendMessage()" class="input-form">
          <mat-form-field class="message-field" appearance="outline">
            <input matInput 
                   formControlName="content"
                   placeholder="输入消息..."
                   (keydown)="onEnterKey($event)"
                   [disabled]="isSending"
                   autocomplete="off">
            
            <button mat-icon-button 
                    matSuffix 
                    type="submit"
                    [disabled]="messageForm.invalid || isSending"
                    matTooltip="发送消息">
              <mat-icon *ngIf="!isSending">send</mat-icon>
              <mat-spinner *ngIf="isSending" diameter="20"></mat-spinner>
            </button>
          </mat-form-field>
        </form>
        
        <!-- 快捷回复 -->
        <div class="quick-replies" *ngIf="quickReplies.length > 0 && !showQuickReplies">
          <button mat-button 
                  class="toggle-quick-replies"
                  (click)="showQuickReplies = !showQuickReplies">
            <mat-icon>sentiment_satisfied</mat-icon>
            快捷回复
          </button>
        </div>
        
        <div class="quick-replies-list" *ngIf="showQuickReplies">
          <div class="quick-reply-header">
            <span>快捷回复</span>
            <button mat-icon-button (click)="showQuickReplies = false">
              <mat-icon>keyboard_arrow_down</mat-icon>
            </button>
          </div>
          
          <div class="quick-reply-buttons">
            <button *ngFor="let reply of quickReplies" 
                    mat-stroked-button 
                    class="quick-reply-btn"
                    (click)="sendQuickReply(reply)">
              {{reply}}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-panel {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: rgba(40, 40, 40, 0.95);
      color: white;
    }

    /* 聊天头部 */
    .chat-header {
      padding: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(0, 0, 0, 0.3);
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }

    .header-actions {
      display: flex;
      gap: 4px;
    }

    /* 消息列表 */
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      min-height: 0;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px;
      color: rgba(255, 255, 255, 0.7);
    }

    .loading-container p {
      margin-top: 16px;
      font-size: 14px;
    }

    .messages-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .message-item {
      animation: fadeInUp 0.3s ease;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .message-container {
      display: flex;
      gap: 12px;
      max-width: 80%;
    }

    .message-container.own {
      align-self: flex-end;
      flex-direction: row-reverse;
    }

    .message-container.other {
      align-self: flex-start;
    }

    .message-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #2196f3;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 500;
      flex-shrink: 0;
    }

    .message-content {
      min-width: 0;
      flex: 1;
    }

    .message-header {
      display: flex;
      gap: 8px;
      margin-bottom: 4px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
    }

    .own .message-header {
      justify-content: flex-end;
    }

    .sender-name {
      font-weight: 500;
      color: #2196f3;
    }

    .message-time {
      color: rgba(255, 255, 255, 0.5);
    }

    .message-text {
      background: rgba(255, 255, 255, 0.1);
      padding: 8px 12px;
      border-radius: 12px;
      word-break: break-word;
      line-height: 1.4;
    }

    .own .message-text {
      background: #2196f3;
      color: white;
    }

    .other .message-text {
      background: rgba(255, 255, 255, 0.1);
    }

    /* 空状态 */
    .empty-messages {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: rgba(255, 255, 255, 0.5);
      text-align: center;
    }

    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-messages p {
      margin: 4px 0;
    }

    .empty-subtitle {
      font-size: 12px;
      opacity: 0.7;
    }

    /* 输入区域 */
    .chat-input {
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(0, 0, 0, 0.3);
    }

    .input-form {
      padding: 16px;
    }

    .message-field {
      width: 100%;
    }

    .message-field .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }

    /* 快捷回复 */
    .quick-replies {
      padding: 8px 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .toggle-quick-replies {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
    }

    .quick-replies-list {
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      background: rgba(0, 0, 0, 0.2);
    }

    .quick-reply-header {
      padding: 8px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
    }

    .quick-reply-buttons {
      padding: 8px 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .quick-reply-btn {
      font-size: 12px;
      padding: 4px 8px;
      border-color: rgba(255, 255, 255, 0.3);
      color: rgba(255, 255, 255, 0.8);
    }

    .quick-reply-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    /* 滚动条样式 */
    .chat-messages::-webkit-scrollbar {
      width: 6px;
    }

    .chat-messages::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }

    .chat-messages::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 3px;
    }

    .chat-messages::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.5);
    }

    /* 响应式设计 */
    @media (max-width: 768px) {
      .chat-header {
        padding: 12px;
      }
      
      .chat-messages {
        padding: 12px;
      }
      
      .input-form {
        padding: 12px;
      }
      
      .message-container {
        max-width: 90%;
      }
    }
  `]
})
export class ChatPanelComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() roomName!: string;
  @Output() onClose = new EventEmitter<void>();

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  private destroy$ = new Subject<void>();
  private shouldScrollToBottom = false;
  private timeCache = new Map<string, string>();
  private lastUpdateTime = 0;

  currentUser: User | null = null;
  messages: ChatMessageDto[] = [];
  messageForm!: FormGroup;
  
  isLoadingHistory = false;
  isSending = false;
  showQuickReplies = false;

  quickReplies = [
    '👍', '👏', '😊', '❤️',
    '好的', '明白了', '同意', '谢谢',
    '请稍等', '没问题', '收到'
  ];

  constructor(
    private fb: FormBuilder,
    private chatService: ChatService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadChatHistory();
    this.setupSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private createForm(): void {
    this.messageForm = this.fb.group({
      content: ['', [Validators.required, Validators.maxLength(1000)]]
    });
  }

  private setupSubscriptions(): void {
    // 监听新消息
    this.chatService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(messages => {
        const oldCount = this.messages.length;
        this.messages = [...messages];
        
        // 如果有新消息，滚动到底部
        if (messages.length > oldCount) {
          this.shouldScrollToBottom = true;
        }
        
        // 手动触发变更检测
        this.cdr.markForCheck();
      });
  }

  loadChatHistory(): void {
    if (!this.roomName) return;

    this.isLoadingHistory = true;
    this.cdr.markForCheck();
    
    this.chatService.getChatHistory(this.roomName, 0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.chatService.updateMessages(response.messages);
          this.isLoadingHistory = false;
          this.shouldScrollToBottom = true;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('加载聊天历史失败:', error);
          this.isLoadingHistory = false;
          this.snackBar.open('加载聊天记录失败', '确定', { duration: 3000 });
          this.cdr.markForCheck();
        }
      });
  }

  sendMessage(): void {
    if (this.messageForm.invalid || this.isSending) return;

    const content = this.messageForm.value.content.trim();
    if (!content) return;

    this.isSending = true;
    this.cdr.markForCheck();

    this.chatService.sendMessage(this.roomName, content)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.messageForm.reset();
          this.isSending = false;
          this.shouldScrollToBottom = true;
          
          // 立即添加消息到本地状态（优化用户体验）
          if (this.currentUser) {
            const newMessage: ChatMessageDto = {
              id: Date.now(),
              roomName: this.roomName,
              userId: this.currentUser.id,
              userName: this.currentUser.displayName,
              content: content,
              timestamp: new Date().toISOString(),
              clientMessageId: response.clientMessageId
            };
            this.chatService.addMessage(newMessage);
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('发送消息失败:', error);
          this.isSending = false;
          this.snackBar.open('发送消息失败', '确定', { duration: 3000 });
          this.cdr.markForCheck();
        }
      });
  }

  sendQuickReply(reply: string): void {
    this.messageForm.patchValue({ content: reply });
    this.sendMessage();
    this.showQuickReplies = false;
  }

  onEnterKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  isOwnMessage(message: ChatMessageDto): boolean {
    return message.userId === this.currentUser?.id;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  formatTime(timestamp: string): string {
    // 使用缓存避免频繁计算，每30秒更新一次
    const now = Date.now();
    const cacheKey = `${timestamp}_${Math.floor(now / 30000)}`;
    
    if (this.timeCache.has(cacheKey)) {
      return this.timeCache.get(cacheKey)!;
    }
    
    const date = new Date(timestamp);
    const diffMs = now - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    let result: string;
    if (diffMins < 1) {
      result = '刚刚';
    } else if (diffMins < 60) {
      result = `${diffMins}分钟前`;
    } else if (diffMins < 1440) {
      result = `${Math.floor(diffMins / 60)}小时前`;
    } else {
      // 显示时间
      result = date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // 缓存结果
    this.timeCache.set(cacheKey, result);
    
    // 清理旧缓存
    if (now - this.lastUpdateTime > 60000) {
      this.clearOldCache();
      this.lastUpdateTime = now;
    }
    
    return result;
  }

  private clearOldCache(): void {
    const now = Math.floor(Date.now() / 30000);
    const keysToDelete: string[] = [];
    
    this.timeCache.forEach((value, key) => {
      const keyTime = parseInt(key.split('_')[1]);
      if (now - keyTime > 2) { // 保留最近2分钟的缓存
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.timeCache.delete(key));
  }

  trackByMessageId(index: number, message: ChatMessageDto): number {
    return message.id;
  }

  private scrollToBottom(): void {
    try {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    } catch (err) {
      console.warn('滚动到底部失败:', err);
    }
  }
}
