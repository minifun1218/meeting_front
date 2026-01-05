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
  templateUrl: './chat-panel.component.html',
  styleUrls: ['./chat-panel.component.scss']
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
