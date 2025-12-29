import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, interval, timeout } from 'rxjs';
import { BehaviorSubject, Observable } from 'rxjs';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

import {LiveKitParticipant, LiveKitService} from '../../../core/services/livekit.service';
import { VideoPresets } from 'livekit-client';
import { ChatService } from '../../../core/services/chat.service';
import { RecordingService } from '../../../core/services/recording.service';
import { AuthService } from '../../../core/services/auth.service';
import { MeetingService } from '../../../core/services/meeting.service';
import { Participant, JoinMeetingRequest } from '../../../core/models/meeting.models';
import { User, UserRole } from '../../../core/models/auth.models';

import { ParticipantsListComponent } from '../participants-list/participants-list.component';
import { ChatPanelComponent } from '../chat-panel/chat-panel.component';
import { VideoGridComponent } from '../video-grid/video-grid.component';
import { InviteDialogComponent } from '../invite-dialog/invite-dialog.component';
import { MobileCompatibilityDialogComponent, MobileCompatibilityData } from '../mobile-compatibility-dialog/mobile-compatibility-dialog.component';

@Component({
  selector: 'app-meeting-room',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatBadgeModule,
    MatTooltipModule,
    ParticipantsListComponent,
    ChatPanelComponent,
    VideoGridComponent
  ],
  template: `
    <div class="meeting-room-container full-height">
      <!-- 顶部工具栏 -->
      <mat-toolbar class="meeting-toolbar">
        <div class="toolbar-content">
          <div class="meeting-info">
            <h3>{{roomName}}</h3>
            <span class="participant-count">{{participants.length}} 人参与</span>
          </div>

          <div class="toolbar-actions">
            <!-- 录制指示器 -->
            <div *ngIf="isRecording" class="recording-indicator">
              <div class="recording-dot"></div>
              <span>录制中 {{formatRecordingTime()}}</span>
            </div>

            <!-- 侧边栏切换按钮 -->
            <button mat-icon-button
                    (click)="toggleParticipants()"
                    matTooltip="参与者列表">
              <mat-icon [matBadge]="participants.length"
                        matBadgeColor="primary"
                        matBadgeSize="small">
                people
              </mat-icon>
            </button>

            <button mat-icon-button
                    (click)="toggleChat()"
                    matTooltip="聊天">
              <mat-icon [matBadge]="unreadCount > 0 ? unreadCount : null"
                        matBadgeColor="warn"
                        matBadgeSize="small">
                chat
              </mat-icon>
            </button>

            <button mat-icon-button
                    (click)="leaveRoom()"
                    matTooltip="离开会议"
                    class="leave-button">
              <mat-icon>exit_to_app</mat-icon>
            </button>
          </div>
        </div>
      </mat-toolbar>

      <!-- 主要会议区域 -->
      <div class="meeting-content">
        <mat-sidenav-container class="sidenav-container">
          <!-- 参与者列表侧边栏 -->
          <mat-sidenav #participantsSidenav
                       mode="side"
                       position="start"
                       [opened]="showParticipants"
                       class="participants-sidenav">
            <app-participants-list
              [participants]="participants"
              [currentUserId]="currentUser?.id || ''">
            </app-participants-list>
          </mat-sidenav>

          <!-- 聊天侧边栏 -->
          <mat-sidenav #chatSidenav
                       mode="side"
                       position="end"
                       [opened]="showChat"
                       class="chat-sidenav">
            <app-chat-panel
              [roomName]="roomName"
              (onClose)="toggleChat()">
            </app-chat-panel>
          </mat-sidenav>

          <!-- 视频网格区域 -->
          <mat-sidenav-content class="video-content">
            <!-- 录制状态指示器 -->
            <div *ngIf="isRecording" class="recording-indicator">
              <div class="recording-dot"></div>
              <span class="recording-text">正在录制</span>
              <span class="recording-time">{{ formatRecordingTime() }}</span>
            </div>

            <app-video-grid
              [participants]="participants"
              [localParticipant]="localParticipant">
            </app-video-grid>

            <!-- 底部控制栏 -->
            <div class="meeting-controls">
              <div class="controls-group">
                <!-- 音频控制 -->
                <button mat-fab
                        [color]="isAudioEnabled ? 'primary' : 'warn'"
                        (click)="toggleAudio()"
                        matTooltip="{{isAudioEnabled ? '静音' : '取消静音'}}">
                  <mat-icon>{{isAudioEnabled ? 'mic' : 'mic_off'}}</mat-icon>
                </button>

                <!-- 视频控制 -->
                <button mat-fab
                        [color]="isVideoEnabled ? 'primary' : 'warn'"
                        (click)="toggleVideo()"
                        matTooltip="{{isVideoEnabled ? '关闭摄像头' : '开启摄像头'}}">
                  <mat-icon>{{isVideoEnabled ? 'videocam' : 'videocam_off'}}</mat-icon>
                </button>

                <!-- 摄像头诊断 -->
                <button mat-fab
                        color="accent"
                        (click)="diagnoseCameraAndShowHelp()"
                        matTooltip="摄像头诊断">
                  <mat-icon>camera_enhance</mat-icon>
                </button>

                <!-- 屏幕共享 -->
                <button mat-fab
                        [color]="isScreenSharing ? 'accent' : 'primary'"
                        (click)="toggleScreenShare()"
                        matTooltip="{{isScreenSharing ? '停止共享' : '共享屏幕'}}">
                  <mat-icon>{{isScreenSharing ? 'stop_screen_share' : 'screen_share'}}</mat-icon>
                </button>

                <!-- 录制控制 -->
                <button mat-fab
                        *ngIf="canRecord"
                        [color]="isRecording ? 'warn' : 'primary'"
                        (click)="toggleRecording()"
                        matTooltip="{{isRecording ? '停止录制' : '开始录制'}}">
                  <mat-icon>{{isRecording ? 'stop' : 'fiber_manual_record'}}</mat-icon>
                </button>

                <!-- 截图 -->
                <button mat-fab
                        color="primary"
                        (click)="takeScreenshot()"
                        matTooltip="截图">
                  <mat-icon>camera_alt</mat-icon>
                </button>

                <!-- 邀请 -->
                <button mat-fab
                        color="primary"
                        (click)="openInviteDialog()"
                        matTooltip="邀请参与者">
                  <mat-icon>person_add</mat-icon>
                </button>

                <!-- 离开会议 -->
                <button mat-fab
                        color="warn"
                        (click)="leaveRoom()"
                        matTooltip="离开会议"
                        class="leave-fab">
                  <mat-icon>call_end</mat-icon>
                </button>
              </div>
            </div>
          </mat-sidenav-content>
        </mat-sidenav-container>
      </div>

      <!-- 移动端侧边栏切换按钮 -->
      <button *ngIf="isMobile"
              mat-fab
              class="mobile-sidebar-toggle participants-toggle"
              (click)="toggleParticipants()">
        <mat-icon [matBadge]="participants.length"
                  matBadgeColor="primary"
                  matBadgeSize="small">
          people
        </mat-icon>
      </button>

      <button *ngIf="isMobile"
              mat-fab
              class="mobile-sidebar-toggle chat-toggle"
              (click)="toggleChat()">
        <mat-icon [matBadge]="unreadCount > 0 ? unreadCount : null"
                  matBadgeColor="warn"
                  matBadgeSize="small">
          chat
        </mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .meeting-room-container {
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
      color: white;
      overflow: hidden;
      position: relative;
    }

    .meeting-room-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
                  radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.15) 0%, transparent 50%),
                  radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.1) 0%, transparent 50%);
      pointer-events: none;
      z-index: 0;
    }

    .meeting-toolbar {
      background: rgba(15, 15, 35, 0.95);
      backdrop-filter: blur(20px);
      color: white;
      border-bottom: 1px solid rgba(120, 119, 198, 0.2);
      box-shadow: 0 4px 32px rgba(0, 0, 0, 0.3);
      z-index: 10;
      position: relative;
    }

    .toolbar-content {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      z-index: 1;
    }

    .meeting-info h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      background: linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .participant-count {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
      margin-left: 8px;
      background: rgba(120, 119, 198, 0.2);
      padding: 4px 12px;
      border-radius: 16px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(120, 119, 198, 0.3);
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .toolbar-actions button {
      background: rgba(255, 255, 255, 0.1) !important;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .toolbar-actions button:hover {
      background: rgba(120, 119, 198, 0.3) !important;
      border-color: rgba(120, 119, 198, 0.5);
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(120, 119, 198, 0.3);
    }

    .recording-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #ff4757 0%, #ff3742 100%);
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 4px 20px rgba(255, 71, 87, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.2);
      animation: recording-glow 2s ease-in-out infinite;
    }

    .recording-dot {
      width: 8px;
      height: 8px;
      background: white;
      border-radius: 50%;
      animation: recording-pulse 1.5s ease-in-out infinite;
    }

    @keyframes recording-glow {
      0%, 100% {
        box-shadow: 0 4px 20px rgba(255, 71, 87, 0.4);
      }
      50% {
        box-shadow: 0 4px 30px rgba(255, 71, 87, 0.7);
      }
    }

    @keyframes recording-pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.6;
        transform: scale(1.2);
      }
    }

    .leave-button {
      color: #ff4757 !important;
      background: rgba(255, 71, 87, 0.1) !important;
    }

    .leave-button:hover {
      background: rgba(255, 71, 87, 0.2) !important;
      box-shadow: 0 8px 25px rgba(255, 71, 87, 0.3);
    }

    .meeting-content {
      flex: 1;
      height: calc(100vh - 68px); /* 减去工具栏高度 */
      min-height: calc(100vh - 68px);
      overflow: hidden;
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
    }

    .sidenav-container {
      height: 100%;
      min-height: calc(100vh - 68px); /* 减去工具栏高度 */
      background: transparent;
      display: flex;
      flex: 1;
    }

    .participants-sidenav, .chat-sidenav {
      width: 320px;
      background: rgba(15, 15, 35, 0.95);
      backdrop-filter: blur(20px);
      border: none;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .participants-sidenav {
      border-right: 1px solid rgba(120, 119, 198, 0.2);
    }

    .chat-sidenav {
      border-left: 1px solid rgba(120, 119, 198, 0.2);
    }

    .video-content {
      position: relative;
      height: 100vh; /* 设置视频网格占据页面100%高度 */
      background: rgba(120, 119, 198, 0.2);;
      backdrop-filter: blur(10px);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 100vh; /* 最小高度也设为100vh */
      z-index: 1;
      border-radius: 0;
      flex: 1;
    }

    .meeting-controls {
      position: fixed;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      pointer-events: none;
    }

    .controls-group {
      display: flex;
      gap: 20px;
      align-items: center;
      background: rgba(15, 15, 35, 0.95);
      backdrop-filter: blur(25px);
      padding: 20px 32px;
      border-radius: 50px;
      border: 1px solid rgba(120, 119, 198, 0.3);
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
      pointer-events: auto;
      position: relative;
    }

    .controls-group::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(120, 119, 198, 0.1) 0%, rgba(255, 119, 198, 0.05) 100%);
      border-radius: 50px;
      pointer-events: none;
    }

    .controls-group button {
      width: 60px;
      height: 60px;
      position: relative;
      z-index: 1;
      background: rgba(255, 255, 255, 0.1) !important;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .controls-group button:hover {
      transform: translateY(-3px) scale(1.05);
      box-shadow: 0 12px 30px rgba(120, 119, 198, 0.4);
      background: rgba(120, 119, 198, 0.3) !important;
      border-color: rgba(120, 119, 198, 0.5);
    }

    .controls-group button[color="primary"] {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      border-color: rgba(102, 126, 234, 0.5);
    }

    .controls-group button[color="warn"] {
      background: linear-gradient(135deg, #ff4757 0%, #ff3742 100%) !important;
      border-color: rgba(255, 71, 87, 0.5);
    }

    .controls-group button[color="accent"] {
      background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%) !important;
      border-color: rgba(255, 152, 0, 0.5);
    }

    .leave-fab {
      background: linear-gradient(135deg, #ff4757 0%, #ff3742 100%) !important;
      border-color: rgba(255, 71, 87, 0.5) !important;
    }

    .leave-fab:hover {
      box-shadow: 0 12px 30px rgba(255, 71, 87, 0.5) !important;
    }

    .mobile-sidebar-toggle {
      position: fixed;
      z-index: 1000;
    }

    .participants-toggle {
      top: 50%;
      left: 16px;
      transform: translateY(-50%);
    }

    .chat-toggle {
      top: 50%;
      right: 16px;
      transform: translateY(-50%);
    }

    /* 录制状态指示器 */
    .video-content .recording-indicator {
      position: absolute;
      top: 20px;
      left: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(244, 67, 54, 0.9);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      z-index: 1000;
      backdrop-filter: blur(4px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .video-content .recording-dot {
      width: 8px;
      height: 8px;
      background: #fff;
      border-radius: 50%;
      animation: recording-pulse 1.5s ease-in-out infinite;
    }

    @keyframes recording-pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.5;
        transform: scale(1.2);
      }
    }

    .video-content .recording-text {
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    .video-content .recording-time {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      opacity: 0.9;
    }

    /* 响应式设计 */
    /* 4K分辨率优化 (3840x2160及以上) */
    @media (min-width: 3840px) {
      .meeting-toolbar {
        height: 80px;
        padding: 0 32px;
      }

      .meeting-content {
        height: calc(100vh - 80px);
        min-height: calc(100vh - 80px);
      }

      .video-content {
        height: 100vh;
        min-height: 100vh;
      }

      .meeting-info h3 {
        font-size: 28px;
      }

      .participant-count {
        font-size: 18px;
      }

      .participants-sidenav, .chat-sidenav {
        width: 480px;
      }

      .controls-group {
        padding: 24px 48px;
        gap: 24px;
        border-radius: 60px;
      }

      .controls-group button {
        width: 80px;
        height: 80px;
      }

      .meeting-controls {
        bottom: 40px;
      }

      .video-content .recording-indicator {
        top: 32px;
        left: 32px;
        padding: 16px 24px;
        font-size: 18px;
        border-radius: 30px;
      }

      .video-content .recording-time {
        font-size: 16px;
      }

      .mobile-sidebar-toggle {
        width: 80px;
        height: 80px;
      }
    }

    /* 2K分辨率优化 (2560x1440) */
    @media (min-width: 2560px) and (max-width: 3839px) {
      .meeting-toolbar {
        height: 72px;
        padding: 0 24px;
      }

      .meeting-content {
        height: calc(100vh - 72px);
        min-height: calc(100vh - 72px);
      }

      .sidenav-container {
        min-height: calc(100vh - 72px);
      }

      .video-content {
        height: 100vh;
        min-height: 100vh;
      }

      .meeting-info h3 {
        font-size: 24px;
      }

      .participant-count {
        font-size: 16px;
      }

      .participants-sidenav, .chat-sidenav {
        width: 400px;
      }

      .controls-group {
        padding: 20px 36px;
        gap: 20px;
        border-radius: 50px;
      }

      .controls-group button {
        width: 68px;
        height: 68px;
      }

      .meeting-controls {
        bottom: 32px;
      }

      .video-content .recording-indicator {
        top: 24px;
        left: 24px;
        padding: 12px 20px;
        font-size: 16px;
        border-radius: 25px;
      }

      .video-content .recording-time {
        font-size: 14px;
      }

      .mobile-sidebar-toggle {
        width: 68px;
        height: 68px;
      }
    }

    /* 1K分辨率优化 (1920x1080) */
    @media (min-width: 1920px) and (max-width: 2559px) {
      .meeting-toolbar {
        height: 68px;
        padding: 0 20px;
      }

      .meeting-info h3 {
        font-size: 20px;
      }

      .participant-count {
        font-size: 15px;
      }

      .participants-sidenav, .chat-sidenav {
        width: 350px;
      }

      .controls-group {
        padding: 18px 30px;
        gap: 18px;
        border-radius: 45px;
      }

      .controls-group button {
        width: 60px;
        height: 60px;
      }

      .meeting-controls {
        bottom: 28px;
      }

      .video-content .recording-indicator {
        top: 22px;
        left: 22px;
        padding: 10px 18px;
        font-size: 15px;
        border-radius: 22px;
      }

      .video-content .recording-time {
        font-size: 13px;
      }

      .mobile-sidebar-toggle {
        width: 60px;
        height: 60px;
      }
    }

    /* 标准桌面分辨率优化 (1366x768 - 1919x1079) */
    @media (min-width: 1025px) and (max-width: 1919px) {
      .participants-sidenav, .chat-sidenav {
        width: 320px;
      }
    }

    /* 平板分辨率优化 */
    @media (max-width: 1024px) {
      .participants-sidenav, .chat-sidenav {
        width: 280px;
      }
    }

    /* 移动端分辨率优化 */
    @media (max-width: 768px) {
      .meeting-toolbar {
        padding: 0 8px;
      }

      .toolbar-content {
        font-size: 14px;
      }

      .meeting-info h3 {
        font-size: 16px;
      }

      .toolbar-actions {
        gap: 4px;
      }

      .participants-sidenav, .chat-sidenav {
        position: fixed;
        top: 0;
        bottom: 0;
        width: 100vw;
        z-index: 2000;
      }

      .controls-group {
        padding: 12px 16px;
        gap: 12px;
      }

      .controls-group button {
        width: 48px;
        height: 48px;
      }

      .meeting-controls {
        bottom: 16px;
      }

      .video-content .recording-indicator {
        top: 10px;
        left: 10px;
        padding: 6px 12px;
        font-size: 12px;
      }

      .video-content .recording-time {
        font-size: 11px;
      }
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.7; }
      100% { opacity: 1; }
    }
  `]
})
export class MeetingRoomComponent implements OnInit, OnDestroy {


  @ViewChild('participantsSidenav') participantsSidenav!: any;
  @ViewChild('chatSidenav') chatSidenav!: any;

  private destroy$ = new Subject<void>();
  private recordingStartTime?: Date;
  private resizeListener?: () => void;

  // 私有属性
  private participantsSubject = new BehaviorSubject<Participant[]>([]);
  public participants$ = this.participantsSubject.asObservable();

  // 公共属性
  roomName!: string;
  currentUser: User | null = null;
  participants: Participant[] = [];
  localParticipant: any = null;

  // UI状态
  showParticipants = false;
  showChat = false;
  isMobile = false;

  // 会议状态
  isAudioEnabled = true;
  isVideoEnabled = true;
  isScreenSharing = false;
  isRecording = false;
  canRecord = false;

  // 聊天相关
  unreadCount = 0;

  constructor (
    private route: ActivatedRoute,
    private router: Router,
    private liveKitService: LiveKitService,
    private chatService: ChatService,
    private recordingService: RecordingService,
    private authService: AuthService,
    private meetingService: MeetingService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {
    this.checkMobile();
  }

  ngOnInit(): void {
    this.roomName = this.route.snapshot.paramMap.get('roomName') || '';

    this.currentUser = this.authService.getCurrentUser();

    // 修复录制权限判断 - 只使用枚举值比较
    this.canRecord = this.currentUser?.role === UserRole.ADMIN ||
                     this.currentUser?.role === UserRole.HOST;

    this.initializeMeeting();
    this.setupSubscriptions();
  }

  ngOnDestroy(): void {
    // 清理resize事件监听器
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = undefined;
    }

    this.destroy$.next();
    this.destroy$.complete();
    this.leaveMeeting();
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth <= 768;

    // 创建resize事件监听器
    this.resizeListener = () => {
      this.isMobile = window.innerWidth <= 768;
      this.cdr.detectChanges();
    };

    // 监听窗口大小变化
    window.addEventListener('resize', this.resizeListener);
  }

  private async initializeMeeting(): Promise<void> {
    try {
      const navigation = this.router.getCurrentNavigation();
      const state = history.state;
      // 如果没有会议参数，尝试重新获取
      if (!state?.['livekitToken'] || !state?.['serverUrl']) {
        console.log('会议参数缺失，尝试重新获取token');
        await this.rejoinMeeting();
        return;
      }

      // 移动端优化的连接选项
      const connectionOptions = this.isMobile ? {
        adaptiveStream: true,
        dynacast: false, // 移动端关闭dynacast以提高兼容性
        videoCaptureDefaults: {
          resolution: { width: 640, height: 480 }, // 移动端使用较低分辨率
          facingMode: 'user' as 'user'
        },
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true
        }
      } : undefined;

      // 连接到LiveKit
      await this.liveKitService.connectToRoom(
        state['serverUrl'],
        state['livekitToken'],
        connectionOptions
      );

      // 通知后端用户加入
      this.chatService.notifyUserJoined(this.roomName).subscribe({
        next: () => console.log('用户加入通知发送成功'),
        error: (error) => console.error('用户加入通知失败:', error)
      });

      this.snackBar.open(
        this.isMobile ? '成功加入会议！' : '成功加入会议！',
        '确定',
        { duration: 3000 }
      );
      this.participants = this.liveKitService.getAllParticipants();
      console.log(this.participants, 'participants');

    } catch (error: any) {
      console.error('初始化会议失败:', error);

      let errorMessage = '加入会议失败，请重试';
      let actionText = '确定';
      let showRetryOption = false;

      // 根据错误类型提供更具体的提示
      if (error instanceof Error) {
        if (error.message.includes('WebRTC') || error.message.includes('ICE') || error.message.includes('网络连接失败')) {
          errorMessage = this.isMobile ?
            '网络连接失败，请尝试：\n1. 切换到WiFi网络\n2. 关闭VPN或代理\n3. 重启浏览器\n4. 使用Chrome浏览器' :
            'WebRTC连接失败，请检查网络设置';
          showRetryOption = this.isMobile;
        } else if (error.message.includes('token') || error.message.includes('令牌')) {
          errorMessage = '会议令牌已过期，请返回首页重新加入';
        } else if (error.message.includes('timeout') || error.message.includes('超时')) {
          errorMessage = this.isMobile ?
            '连接超时，移动网络可能不稳定。请尝试：\n1. 切换到稳定的WiFi\n2. 移动到信号更好的位置\n3. 重新加入会议' :
            '连接超时，请检查网络连接后重试';
          showRetryOption = this.isMobile;
        } else if (error.message.includes('NotAllowedError') || error.message.includes('permission') || error.message.includes('权限')) {
          errorMessage = this.isMobile ?
            '摄像头或麦克风权限被拒绝。请：\n1. 在浏览器地址栏点击摄像头图标\n2. 允许摄像头和麦克风权限\n3. 刷新页面重试' :
            '摄像头或麦克风权限被拒绝，请允许权限后重试';
          actionText = '重新尝试';
          showRetryOption = true;
        } else if (error.message.includes('NotFoundError') || error.message.includes('未找到')) {
          errorMessage = this.isMobile ?
            '未找到摄像头或麦克风设备。请检查：\n1. 设备是否被其他应用占用\n2. 重启浏览器\n3. 检查设备设置' :
            '未找到摄像头或麦克风设备，请检查设备连接';
        } else if (error.message.includes('NotSupportedError') || error.message.includes('不支持')) {
          errorMessage = this.isMobile ?
            '当前浏览器不支持视频通话功能。请：\n1. 使用Chrome、Safari或Firefox浏览器\n2. 更新浏览器到最新版本\n3. 确保使用HTTPS访问' :
            '浏览器不支持WebRTC功能，请使用现代浏览器';
        } else if (error.message.includes('network') || error.message.includes('连接')) {
          errorMessage = this.isMobile ?
            '网络不稳定，建议切换到WiFi网络后重试' :
            '网络连接异常，请检查网络后重试';
          showRetryOption = this.isMobile;
        } else if (error.message.includes('移动端连接失败')) {
          errorMessage = error.message;
          showRetryOption = true;
          actionText = '重新尝试';
        }
      }

      // 显示错误信息
      const snackBarRef = this.snackBar.open(errorMessage, actionText, {
        duration: this.isMobile ? 8000 : 5000,
        panelClass: ['error-snackbar']
      });

      // 如果显示重试选项，处理重试逻辑
      if (showRetryOption) {
        snackBarRef.onAction().subscribe(() => {
          // 重新尝试初始化会议
          this.initializeMeeting().catch(retryError => {
            console.error('重试失败:', retryError);
            // 重试失败后返回首页
            setTimeout(() => {
              this.router.navigate(['/home']);
            }, 1000);
          });
        });
      }

      // 移动端延迟跳转，给用户时间阅读错误信息和选择重试
      const delay = this.isMobile ? (showRetryOption ? 8000 : 5000) : 3000;
      setTimeout(() => {
        if (!showRetryOption) {
          this.router.navigate(['/home']);
        }
      }, delay);
    }
  }

  /**
   * 重新加入会议 - 当会议参数缺失时调用
   */
  private async rejoinMeeting(): Promise<void> {
    if (!this.currentUser) {
      this.snackBar.open('用户信息缺失，请重新登录', '确定');
      this.router.navigate(['/login']);
      return;
    }

    // 移动端兼容性检查
    if (this.isMobile) {
      console.log('重新加入会议前进行移动端兼容性检查...');
      const compatibility = await this.liveKitService.checkMobileBrowserCompatibility();

      if (!compatibility.canProceed) {
        console.error('移动端兼容性检查失败:', compatibility);

        let errorMessage = '移动端浏览器兼容性检查失败，无法重新加入会议：\n';
        compatibility.recommendations.forEach((rec, index) => {
          errorMessage += `${index + 1}. ${rec}\n`;
        });

        this.showMobileCompatibilityDialog(compatibility);

        return;
      }
    }

    // 移动端特殊处理：显示更友好的加载提示
    const loadingMessage = this.isMobile ?
      '正在为您重新连接会议，请稍候...' :
      '正在重新加入会议...';

    const loadingSnackBar = this.snackBar.open(loadingMessage, '', {
      duration: this.isMobile ? 5000 : 2000
    });

    let retryCount = 0;
    const maxRetries = this.isMobile ? 3 : 2; // 移动端增加重试次数

    while (retryCount < maxRetries) {
      try {
        console.log(`尝试重新加入会议 (第${retryCount + 1}次)`);

        const request: JoinMeetingRequest = {
          roomName: this.roomName,
          userId: this.currentUser.id,
          userName: this.currentUser.displayName,
          role: this.currentUser.role === 'admin' ? 'host' : 'participant'
        };

        // 移动端使用更长的超时时间
        const timeoutMs = this.isMobile ? 15000 : 10000;
        const response = await Promise.race([
          this.meetingService.joinMeeting(request).toPromise(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('请求超时')), timeoutMs)
          )
        ]) as any;

        if (!response) {
          throw new Error('获取会议token失败');
        }

        // 移动端使用优化的连接选项
        const connectionOptions = this.isMobile ? {
          adaptiveStream: true,
          dynacast: false, // 移动端关闭dynacast以提高兼容性
          videoCaptureDefaults: {
            resolution: { width: 640, height: 480 }, // 移动端使用较低分辨率
            facingMode: 'user' as 'user'
          },
          audioCaptureDefaults: {
            autoGainControl: true,
            echoCancellation: true,
            noiseSuppression: true
          }
        } : undefined;

        // 连接到LiveKit
        await this.liveKitService.connectToRoom(
          response.serverUrl,
          response.livekitJwt,
          connectionOptions
        );

        // 通知后端用户加入
        this.chatService.notifyUserJoined(this.roomName).subscribe({
          next: () => console.log('用户加入通知发送成功'),
          error: (error) => console.error('用户加入通知失败:', error)
        });

        loadingSnackBar.dismiss();
        this.snackBar.open(
          this.isMobile ? '成功重新连接会议！' : '成功重新加入会议！',
          '确定',
          { duration: 3000 }
        );
        return; // 成功，退出重试循环

      } catch (error) {
        retryCount++;
        console.error(`重新加入会议失败 (第${retryCount}次):`, error);

        // 如果还有重试机会，等待后重试
        if (retryCount < maxRetries) {
          const waitTime = this.isMobile ? 2000 : 1000; // 移动端等待更长时间
          console.log(`等待${waitTime}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        // 所有重试都失败了
        loadingSnackBar.dismiss();

        let errorMessage = '重新加入会议失败，请返回首页重试';

        // 根据错误类型提供更具体的提示
        if (error instanceof Error) {
          if (error.message.includes('超时') || error.message.includes('timeout')) {
            errorMessage = this.isMobile ?
              '网络连接超时，请检查网络后返回首页重试' :
              '连接超时，请返回首页重试';
          } else if (error.message.includes('token') || error.message.includes('令牌')) {
            errorMessage = '会议令牌已过期，请返回首页重新加入';
          } else if (error.message.includes('WebRTC') || error.message.includes('ICE')) {
            errorMessage = this.isMobile ?
              '网络连接问题，建议切换网络后重试' :
              'WebRTC连接失败，请返回首页重试';
          }
        }

        this.snackBar.open(errorMessage, '返回首页', {
          duration: this.isMobile ? 8000 : 5000
        }).onAction().subscribe(() => {
          this.router.navigate(['/home']);
        });

        // 延迟自动跳转，给用户时间阅读错误信息
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, this.isMobile ? 8000 : 5000);

        break; // 退出重试循环
      }
    }
  }

  /**
   * 设置各种订阅监听器，用于监听LiveKit状态、参与者事件、聊天未读消息和录制状态的变化
   */
  private setupSubscriptions(): void {
    // 监听LiveKit状态变化（如音频/视频启用状态、屏幕共享状态等）
    this.liveKitService.state$
      .pipe(takeUntil(this.destroy$)) // 使用takeUntil确保在组件销毁时自动取消订阅
      .subscribe(state => {
        // 更新本地状态变量
        this.isAudioEnabled = state.isAudioEnabled;    // 音频是否启用
        this.isVideoEnabled = state.isVideoEnabled;    // 视频是否启用
        this.isScreenSharing = state.isScreenSharing;  // 是否正在屏幕共享
        this.localParticipant = state.localParticipant; // 本地参与者信息
      });


    // 监听参与者相关事件（如加入、离开、媒体状态改变等）
    this.liveKitService.participantEvents$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        console.log('参与者事件:', event); // 记录事件日志
        this.participants = this.liveKitService.getAllParticipants(); // 更新参与者列表
        console.log(this.participants, '变更完成!');
        this.cdr.detectChanges(); // 触发变更检测
      });

    // 监听聊天未读消息数量变化
    this.chatService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadCount = count; // 更新未读消息数量
        this.cdr.detectChanges(); // 触发变更检测
      });

    // 监听录制状态变化
    this.recordingService.recordingState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.isRecording = state.isRecording; // 更新录制状态
        if (state.startTime) {
          this.recordingStartTime = state.startTime; // 如果有开始时间则更新
        }
        this.cdr.detectChanges(); // 触发变更检测
      });
  }

  /**
   * 切换音频状态（开启/关闭麦克风）
   * @returns Promise<void>
   */
  async toggleAudio(): Promise<void> {
    try {
      // 调用LiveKit服务切换音频状态，并等待结果
      const newState = await this.liveKitService.toggleAudio();

      // 更新组件状态以确保UI与服务状态同步
      this.isAudioEnabled = newState;
      this.cdr.detectChanges(); // 手动触发变更检测以更新视图

      // 显示操作成功提示
      this.snackBar.open(
        newState ? '麦克风已开启' : '麦克风已静音',
        '确定',
        { duration: 2000 } // 提示显示2秒
      );
    } catch (error) {
      // 捕获并记录错误
      console.error('切换音频失败:', error);
      // 显示错误提示
      this.snackBar.open('音频操作失败', '确定');
    }
  }

  /**
   * 切换视频状态（开启/关闭摄像头）
   * @returns Promise<void>
   */
  async toggleVideo(): Promise<void> {
    try {
      // 调用LiveKit服务切换视频状态，并等待结果
      const newState = await this.liveKitService.toggleVideo();

      // 检查返回的状态
      if (newState !== false) {
        // 状态正常，更新组件状态并同步UI
        this.isVideoEnabled = newState;
        this.cdr.detectChanges(); // 手动触发变更检测以更新视图

        // 显示操作成功提示
        this.snackBar.open(
          newState ? '摄像头已开启' : '摄像头已关闭',
          '确定',
          { duration: 2000 } // 提示显示2秒
        );
      } else {
        // 当返回false时，表示摄像头操作失败或不可用
        // 确保状态设置为关闭并进行摄像头诊断
        this.isVideoEnabled = false;
        this.cdr.detectChanges(); // 更新UI状态
        await this.diagnoseCameraAndShowHelp(); // 进行摄像头问题诊断并显示帮助
      }
    } catch (error) {
      // 捕获并记录错误
      console.error('切换视频失败:', error);
      // 发生错误时，确保状态设置为关闭
      this.isVideoEnabled = false;
      this.cdr.detectChanges(); // 更新UI状态
      await this.diagnoseCameraAndShowHelp(); // 进行摄像头问题诊断并显示帮助
    }
  }

  /**
   * 诊断摄像头问题并显示帮助信息
   */
  async diagnoseCameraAndShowHelp(): Promise<void> {
    try {
      const diagnosis = await this.liveKitService.diagnoseCameraIssues();

      let message = '摄像头无法启用：\n';
      diagnosis.recommendations.forEach((rec, index) => {
        message += `${index + 1}. ${rec}\n`;
      });

      // 如果可以自动修复，提供修复选项
      if (diagnosis.canAutoFix) {
        const snackBarRef = this.snackBar.open(
          '摄像头问题检测完成，是否尝试自动修复？',
          '自动修复',
          { duration: 8000 }
        );

        snackBarRef.onAction().subscribe(async () => {
          const fixed = await this.liveKitService.autoFixCamera();
          if (fixed) {
            this.snackBar.open('摄像头修复成功！', '确定', { duration: 3000 });
          } else {
            this.showDetailedCameraHelp(diagnosis);
          }
        });

        // 如果用户没有点击修复，显示详细帮助
        setTimeout(() => {
          if (snackBarRef) {
            this.showDetailedCameraHelp(diagnosis);
          }
        }, 8000);
      } else {
        this.showDetailedCameraHelp(diagnosis);
      }

    } catch (error) {
      console.error('摄像头诊断失败:', error);
      this.snackBar.open(
        '摄像头诊断失败，请检查浏览器控制台获取更多信息',
        '确定',
        { duration: 5000 }
      );
    }
  }

  /**
   * 显示详细的摄像头帮助信息
   */
  private showDetailedCameraHelp(diagnosis: any): void {
    let helpMessage = '摄像头问题诊断结果：\n\n';

    helpMessage += `浏览器支持: ${diagnosis.browserSupport ? '✓' : '✗'}\n`;
    helpMessage += `HTTPS环境: ${diagnosis.httpsContext ? '✓' : '✗'}\n`;
    helpMessage += `检测到设备: ${diagnosis.hasDevice ? '✓' : '✗'}\n`;
    helpMessage += `设备权限: ${diagnosis.hasPermission ? '✓' : '✗'}\n`;
    helpMessage += `设备可用: ${diagnosis.deviceWorking ? '✓' : '✗'}\n`;

    if (diagnosis.deviceInUse) {
      helpMessage += `设备占用: ✗ (被其他应用占用)\n`;
    }

    helpMessage += '\n解决建议：\n';
    diagnosis.recommendations.forEach((rec: string, index: number) => {
      helpMessage += `${index + 1}. ${rec}\n`;
    });

    // 显示详细的帮助对话框
    alert(helpMessage);
  }

  async toggleScreenShare(): Promise<void> {
    try {
      const newState = await this.liveKitService.toggleScreenShare();

      // 更新组件状态以确保UI同步
      this.isScreenSharing = newState;
      this.cdr.detectChanges();

      this.snackBar.open(
        newState ? '开始屏幕共享' : '停止屏幕共享',
        '确定',
        { duration: 2000 }
      );
    } catch (error) {
      console.error('切换屏幕共享失败:', error);
      // 发生错误时，保持当前状态不变
      this.snackBar.open('屏幕共享操作失败', '确定');
    }
  }

  /**
   * 切换录制状态 - 开始或停止录制
   */
  toggleRecording(): void {
    if (!this.canRecord) {
      this.snackBar.open('您没有录制权限', '确定');
      return;
    }

    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  /**
   * 开始录制
   */
  private startRecording(): void {
    // 显示确认对话框
    const confirmMessage = '确定要开始录制会议吗？录制文件将保存到您的账户中。';
    if (!confirm(confirmMessage)) {
      return;
    }

    this.snackBar.open('正在开始录制...', '', { duration: 2000 });

    this.recordingService.startRecording(this.roomName).subscribe({
      next: (response) => {
        console.log('录制开始成功:', response);
        this.snackBar.open('🔴 录制已开始', '确定', { duration: 3000 });

        // 通知其他参与者录制已开始
        this.chatService.sendSystemMessage(this.roomName, '会议录制已开始').subscribe({
          next: () => console.log('录制开始通知发送成功'),
          error: (error) => console.error('录制开始通知失败:', error)
        });
      },
      error: (error) => {
        console.error('开始录制失败:', error);
        let errorMessage = '开始录制失败';

        if (error.status === 403) {
          errorMessage = '您没有录制权限';
        } else if (error.status === 409) {
          errorMessage = '会议已在录制中';
        } else if (error.status === 500) {
          errorMessage = '服务器错误，请稍后重试';
        }

        this.snackBar.open(errorMessage, '确定', { duration: 3000 });
      }
    });
  }

  /**
   * 停止录制
   */
  private stopRecording(): void {
    // 显示确认对话框
    const confirmMessage = '确定要停止录制吗？录制文件将自动保存并可在录制管理中查看。';
    if (!confirm(confirmMessage)) {
      return;
    }

    this.snackBar.open('正在停止录制...', '', { duration: 2000 });

    this.recordingService.stopRecording().subscribe({
      next: (response) => {
        console.log('录制停止成功:', response);
        this.snackBar.open('⏹️ 录制已停止，文件正在处理中', '确定', { duration: 3000 });

        // 通知其他参与者录制已停止
        this.chatService.sendSystemMessage(this.roomName, '会议录制已停止').subscribe({
          next: () => console.log('录制停止通知发送成功'),
          error: (error) => console.error('录制停止通知失败:', error)
        });
      },
      error: (error) => {
        console.error('停止录制失败:', error);
        let errorMessage = '停止录制失败';

        if (error.status === 404) {
          errorMessage = '未找到活动的录制会话';
          // 如果服务器说没有录制会话，强制更新本地状态
          this.recordingService.forceStopRecording();
        } else if (error.status === 500) {
          errorMessage = '服务器错误，请稍后重试';
        }

        this.snackBar.open(errorMessage, '确定', { duration: 3000 });
      }
    });
  }

  async takeScreenshot(): Promise<void> {
    try {
      const screenshot = await this.liveKitService.captureScreenshot();
      if (screenshot) {
        // 创建下载链接
        const link = document.createElement('a');
        link.href = screenshot;
        link.download = `screenshot-${this.roomName}-${Date.now()}.png`;
        link.click();

        this.snackBar.open('截图已保存', '确定', { duration: 3000 });
      } else {
        this.snackBar.open('截图失败', '确定');
      }
    } catch (error) {
      console.error('截图失败:', error);
      this.snackBar.open('截图失败', '确定');
    }
  }

  /**
   * 打开邀请对话框
   */
  openInviteDialog(): void {
    const dialogRef = this.dialog.open(InviteDialogComponent, {
      width: '500px',
      data: {
        roomName: this.roomName,
        currentUser: this.currentUser
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('邀请对话框关闭:', result);
      }
    });
  }

  toggleParticipants(): void {
    this.showParticipants = !this.showParticipants;
    if (this.showParticipants && this.showChat) {
      this.showChat = false;
    }
  }

  toggleChat(): void {
    this.showChat = !this.showChat;
    if (this.showChat) {
      this.showParticipants = false;
      this.chatService.markAsRead();
    }
  }

  formatRecordingTime(): string {
    if (!this.recordingStartTime) return '';

    const elapsed = Date.now() - this.recordingStartTime.getTime();
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  }

  private showMobileCompatibilityDialog(compatibility: any): void {
    const dialogRef = this.dialog.open(MobileCompatibilityDialogComponent, {
      width: '90vw',
      maxWidth: '500px',
      disableClose: true,
      data: {
        browserInfo: compatibility.browserInfo,
        recommendations: compatibility.recommendations,
        canProceed: compatibility.canProceed
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'home') {
        this.router.navigate(['/home']);
      } else if (result === 'retry') {
        // 重新尝试兼容性检查
        window.location.reload();
      }
    });
  }

  async leaveRoom(): Promise<void> {
    await this.leaveMeeting();
  }

  private async leaveMeeting(): Promise<void> {
    try {
      // 通知后端用户离开
      if (this.roomName) {
        this.chatService.notifyUserLeft(this.roomName).subscribe({
          next: () => console.log('用户离开通知发送成功'),
          error: (error) => console.error('用户离开通知失败:', error)
        });
      }

      // 断开LiveKit连接
      await this.liveKitService.disconnectFromRoom();

      // 清理聊天状态
      this.chatService.clearMessages();
      this.setupSubscriptions();
      console.log('成功离开会议，正在跳转到主页...');
      this.router.navigate(['/home']); // 或者你主页的路由路径
      this.snackBar.open('成功离开会议', '关闭', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });

    } catch (error) {
      console.error('离开会议失败:', error);
    }
  }


}
