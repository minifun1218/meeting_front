import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { LiveKitParticipant } from '../../../core/services/livekit.service';

import { Participant } from '../../../core/models/meeting.models';
import { UserRole } from '../../../core/models/auth.models';

@Component({
  selector: 'app-participants-list',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDividerModule
  ],
  template: `
    <div class="participants-panel">
      <!-- 参与者头部 -->
      <div class="participants-header">
        <div class="header-title">
          <mat-icon>people</mat-icon>
          <span>参与者 ({{participants.length}})</span>
        </div>

        <div class="header-actions">
          <button mat-icon-button
                  matTooltip="邀请其他人">
            <mat-icon>person_add</mat-icon>
          </button>
        </div>
      </div>

      <!-- 参与者列表 -->
      <div class="participants-list">
        <!-- 主持人/管理员 -->
        <div class="participants-section" *ngIf="hosts.length > 0">
          <div class="section-header">
            <mat-icon class="section-icon">admin_panel_settings</mat-icon>
            <span>主持人</span>
          </div>

          <div class="participant-item"
               *ngFor="let participant of hosts; trackBy: trackByParticipantId">
            <div class="participant-info">
              <div class="participant-avatar" [class.speaking]="participant.isAudioEnabled">
                {{getInitials(participant.userName)}}
              </div>

              <div class="participant-details">
                <div class="participant-name">
                  {{participant.userName}}
                  <span class="local-badge" *ngIf="participant.userId === currentUserId">（我）</span>
                </div>
                <div class="participant-role">{{getRoleDisplayName(participant.role)}}</div>
              </div>
            </div>

            <div class="participant-status">
              <!-- 音频状态 -->
              <div class="status-indicator audio"
                   [class.muted]="!participant.isAudioEnabled"
                   [matTooltip]="participant.isAudioEnabled ? '音频开启' : '音频关闭'">
                <mat-icon>{{participant.isAudioEnabled ? 'mic' : 'mic_off'}}</mat-icon>
              </div>

              <!-- 视频状态 -->
              <div class="status-indicator video"
                   [class.off]="!participant.isVideoEnabled"
                   [matTooltip]="participant.isVideoEnabled ? '视频开启' : '视频关闭'">
                <mat-icon>{{participant.isVideoEnabled ? 'videocam' : 'videocam_off'}}</mat-icon>
              </div>

              <!-- 屏幕共享状态 -->
              <div class="status-indicator screen-share"
                   *ngIf="participant.isScreenSharing"
                   matTooltip="正在共享屏幕">
                <mat-icon>screen_share</mat-icon>
              </div>

              <!-- 操作菜单 -->
              <button mat-icon-button
                      [matMenuTriggerFor]="participantMenu"
                      [matMenuTriggerData]="{participant: participant}"
                      *ngIf="canManageParticipant(participant)"
                      matTooltip="更多操作">
                <mat-icon>more_vert</mat-icon>
              </button>
            </div>
          </div>
        </div>

        <mat-divider *ngIf="hosts.length > 0 && regularParticipants.length > 0"></mat-divider>

        <!-- 普通参与者 -->
        <div class="participants-section" *ngIf="regularParticipants.length > 0">
          <div class="section-header" *ngIf="hosts.length > 0">
            <mat-icon class="section-icon">people</mat-icon>
            <span>参与者</span>
          </div>

          <div class="participant-item"
               *ngFor="let participant of regularParticipants; trackBy: trackByParticipantId">
            <div class="participant-info">
              <div class="participant-avatar" [class.speaking]="participant.isAudioEnabled">
                {{getInitials(participant.userName)}}
              </div>

              <div class="participant-details">
                <div class="participant-name">
                  {{participant.userName}}
                  <span class="local-badge" *ngIf="participant.userId === currentUserId">（我）</span>
                </div>
                <div class="participant-role">{{getRoleDisplayName(participant.role)}}</div>
              </div>
            </div>

            <div class="participant-status">
              <!-- 音频状态 -->
              <div class="status-indicator audio"
                   [class.muted]="!participant.isAudioEnabled"
                   [matTooltip]="participant.isAudioEnabled ? '音频开启' : '音频关闭'">
                <mat-icon>{{participant.isAudioEnabled ? 'mic' : 'mic_off'}}</mat-icon>
              </div>

              <!-- 视频状态 -->
              <div class="status-indicator video"
                   [class.off]="!participant.isVideoEnabled"
                   [matTooltip]="participant.isVideoEnabled ? '视频开启' : '视频关闭'">
                <mat-icon>{{participant.isVideoEnabled ? 'videocam' : 'videocam_off'}}</mat-icon>
              </div>

              <!-- 屏幕共享状态 -->
              <div class="status-indicator screen-share"
                   *ngIf="participant.isScreenSharing"
                   matTooltip="正在共享屏幕">
                <mat-icon>screen_share</mat-icon>
              </div>

              <!-- 操作菜单 -->
              <button mat-icon-button
                      [matMenuTriggerFor]="participantMenu"
                      [matMenuTriggerData]="{participant: participant}"
                      *ngIf="canManageParticipant(participant)"
                      matTooltip="更多操作">
                <mat-icon>more_vert</mat-icon>
              </button>
            </div>
          </div>
        </div>

        <!-- 观察者 -->
        <div class="participants-section" *ngIf="observers.length > 0">
          <mat-divider></mat-divider>

          <div class="section-header">
            <mat-icon class="section-icon">visibility</mat-icon>
            <span>观察者</span>
          </div>

          <div class="participant-item"
               *ngFor="let participant of observers; trackBy: trackByParticipantId">
            <div class="participant-info">
              <div class="participant-avatar observer">
                {{getInitials(participant.userName)}}
              </div>

              <div class="participant-details">
                <div class="participant-name">
                  {{participant.userName}}
                  <span class="local-badge" *ngIf="participant.userId === currentUserId">（我）</span>
                </div>
                <div class="participant-role">{{getRoleDisplayName(participant.role)}}</div>
              </div>
            </div>

            <div class="participant-status">
              <!-- 观察者通常只能看不能说 -->
              <div class="status-indicator observer-mode" matTooltip="观察模式">
                <mat-icon>visibility</mat-icon>
              </div>

              <!-- 操作菜单 -->
              <button mat-icon-button
                      [matMenuTriggerFor]="participantMenu"
                      [matMenuTriggerData]="{participant: participant}"
                      *ngIf="canManageParticipant(participant)"
                      matTooltip="更多操作">
                <mat-icon>more_vert</mat-icon>
              </button>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div class="empty-participants" *ngIf="participants.length === 0">
          <mat-icon class="empty-icon">people_outline</mat-icon>
          <p>暂无其他参与者</p>
        </div>
      </div>

      <!-- 参与者操作菜单 -->
      <mat-menu #participantMenu="matMenu">
        <ng-template matMenuContent let-participant="participant">
          <button mat-menu-item
                  (click)="onMuteParticipant.emit(participant.userId)"
                  *ngIf="participant.userId !== currentUserId && participant.isAudioEnabled">
            <mat-icon>mic_off</mat-icon>
            <span>静音</span>
          </button>

          <button mat-menu-item
                  (click)="onMuteParticipant.emit(participant.userId)"
                  *ngIf="participant.userId !== currentUserId && !participant.isAudioEnabled">
            <mat-icon>mic</mat-icon>
            <span>取消静音</span>
          </button>

          <button mat-menu-item
                  *ngIf="participant.userId !== currentUserId">
            <mat-icon>chat</mat-icon>
            <span>私聊</span>
          </button>

          <button mat-menu-item
                  *ngIf="participant.userId !== currentUserId">
            <mat-icon>visibility</mat-icon>
            <span>关注视频</span>
          </button>

          <mat-divider *ngIf="participant.userId !== currentUserId"></mat-divider>

          <button mat-menu-item
                  class="warn-action"
                  (click)="onRemoveParticipant.emit(participant.userId)"
                  *ngIf="participant.userId !== currentUserId">
            <mat-icon>remove_circle</mat-icon>
            <span>移除参与者</span>
          </button>
        </ng-template>
      </mat-menu>
    </div>
  `,
  styles: [`
    .participants-panel {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: rgba(15, 15, 35, 0.95);
      backdrop-filter: blur(20px);
      color: white;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid rgba(120, 119, 198, 0.2);
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3);
    }

    /* 头部 */
    .participants-header {
      padding: 20px;
      border-bottom: 1px solid rgba(120, 119, 198, 0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, rgba(120, 119, 198, 0.1) 0%, rgba(255, 119, 198, 0.05) 100%);
      backdrop-filter: blur(10px);
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 600;
      font-size: 16px;
      background: linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .header-title mat-icon {
      color: rgba(120, 119, 198, 0.8);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .header-actions button {
      background: rgba(120, 119, 198, 0.2) !important;
      border: 1px solid rgba(120, 119, 198, 0.3);
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
    }

    .header-actions button:hover {
      background: rgba(120, 119, 198, 0.4) !important;
      transform: scale(1.05);
      box-shadow: 0 4px 15px rgba(120, 119, 198, 0.3);
    }

    /* 参与者列表 */
    .participants-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .participants-section {
      margin-bottom: 16px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.7);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .section-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    /* 参与者项 */
    .participant-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-radius: 12px;
      margin-bottom: 6px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid transparent;
    }

    .participant-item:hover {
      background: rgba(120, 119, 198, 0.1);
      border-color: rgba(120, 119, 198, 0.3);
      transform: translateX(4px);
      box-shadow: 0 4px 15px rgba(120, 119, 198, 0.2);
    }

    .participant-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;
    }

    .participant-avatar {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(120, 119, 198, 0.8) 0%, rgba(33, 150, 243, 0.8) 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 600;
      flex-shrink: 0;
      position: relative;
      border: 2px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(10px);
      text-transform: uppercase;
      transition: all 0.3s ease;
    }

    .participant-avatar.speaking {
      box-shadow: 0 0 0 3px #4caf50, 0 4px 15px rgba(0, 0, 0, 0.2);
      animation: speaking 1.5s ease-in-out infinite alternate;
    }

    .participant-avatar.observer {
      background: linear-gradient(135deg, rgba(117, 117, 117, 0.8) 0%, rgba(97, 97, 97, 0.8) 100%);
    }

    @keyframes speaking {
      from {
        box-shadow: 0 0 0 3px #4caf50, 0 4px 15px rgba(0, 0, 0, 0.2);
        transform: scale(1);
      }
      to {
        box-shadow: 0 0 0 6px rgba(76, 175, 80, 0.4), 0 6px 20px rgba(76, 175, 80, 0.3);
        transform: scale(1.05);
      }
    }

    .participant-details {
      flex: 1;
      min-width: 0;
    }

    .participant-name {
      font-size: 15px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .local-badge {
      font-size: 11px;
      color: #4caf50;
      font-weight: 600;
      background: rgba(76, 175, 80, 0.2);
      padding: 2px 8px;
      border-radius: 12px;
      border: 1px solid rgba(76, 175, 80, 0.3);
      backdrop-filter: blur(5px);
    }

    .participant-role {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
      margin-top: 4px;
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 6px;
      border-radius: 8px;
      display: inline-block;
      font-weight: 500;
    }

    /* 参与者状态 */
    .participant-status {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .status-indicator {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .status-indicator:hover {
      transform: scale(1.1);
    }

    .status-indicator mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .status-indicator.audio.muted {
      background: linear-gradient(135deg, rgba(244, 67, 54, 0.9) 0%, rgba(229, 57, 53, 0.9) 100%);
      border-color: rgba(244, 67, 54, 0.5);
      box-shadow: 0 4px 15px rgba(244, 67, 54, 0.4);
    }

    .status-indicator.video.off {
      background: linear-gradient(135deg, rgba(255, 152, 0, 0.9) 0%, rgba(245, 124, 0, 0.9) 100%);
      border-color: rgba(255, 152, 0, 0.5);
      box-shadow: 0 4px 15px rgba(255, 152, 0, 0.4);
    }

    .status-indicator.screen-share {
      background: linear-gradient(135deg, rgba(156, 39, 176, 0.9) 0%, rgba(142, 36, 170, 0.9) 100%);
      border-color: rgba(156, 39, 176, 0.5);
      box-shadow: 0 4px 15px rgba(156, 39, 176, 0.4);
    }

    .status-indicator.observer-mode {
      background: linear-gradient(135deg, rgba(117, 117, 117, 0.9) 0%, rgba(97, 97, 97, 0.9) 100%);
      border-color: rgba(117, 117, 117, 0.5);
      box-shadow: 0 4px 15px rgba(117, 117, 117, 0.4);
    }

    /* 空状态 */
    .empty-participants {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
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

    .empty-participants p {
      margin: 0;
      font-size: 14px;
    }

    /* 菜单样式 */
    .warn-action {
      color: #f44336 !important;
    }

    /* 滚动条 */
    .participants-list::-webkit-scrollbar {
      width: 6px;
    }

    .participants-list::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }

    .participants-list::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 3px;
    }

    .participants-list::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.5);
    }

    /* 响应式设计 */
    @media (max-width: 768px) {
      .participants-header {
        padding: 12px;
      }

      .participants-list {
        padding: 4px;
      }

      .participant-item {
        padding: 6px 8px;
      }

      .participant-avatar {
        width: 32px;
        height: 32px;
        font-size: 12px;
      }

      .participant-name {
        font-size: 13px;
      }

      .participant-role {
        font-size: 11px;
      }

      .status-indicator {
        width: 20px;
        height: 20px;
      }

      .status-indicator mat-icon {
        font-size: 12px;
        width: 12px;
        height: 12px;
      }
    }
  `]
})
export class ParticipantsListComponent implements OnInit {
  @Input() participants: Participant[] = [];
  @Input() currentUserId: string = '';
  @Output() onMuteParticipant = new EventEmitter<string>();
  @Output() onRemoveParticipant = new EventEmitter<string>();

  hosts: Participant[] = [];
  regularParticipants: Participant[] = [];
  observers: Participant[] = [];

  ngOnInit(): void {
    this.categorizeParticipants();
  }

  ngOnChanges(): void {
    this.categorizeParticipants();
  }

  private categorizeParticipants(): void {
    this.hosts = this.participants.filter(p =>
      p.role === UserRole.HOST || p.role === UserRole.ADMIN
    );

    this.regularParticipants = this.participants.filter(p =>
      p.role === UserRole.PARTICIPANT
    );

    this.observers = this.participants.filter(p =>
      p.role === UserRole.OBSERVER
    );
  }

  canManageParticipant(participant: Participant): boolean {
    // 只有主持人可以管理其他参与者，且不能管理自己
    return participant.userId !== this.currentUserId &&
           this.isCurrentUserHost();
  }

  private isCurrentUserHost(): boolean {
    const currentUser = this.participants.find(p => p.userId === this.currentUserId);
    return currentUser?.role === 'host' || currentUser?.role === 'admin';
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getRoleDisplayName(role: string): string {
    const roleMap: { [key: string]: string } = {
      'admin': '管理员',
      'host': '主持人',
      'participant': '参与者',
      'observer': '观察者'
    };
    return roleMap[role] || '参与者';
  }

  trackByParticipantId(index: number, participant: Participant): string {
    return participant.userId;
  }
}
