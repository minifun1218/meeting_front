import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from '../../core/services/auth.service';
import { MeetingService } from '../../core/services/meeting.service';
import {MeetingRoom, CreateRoomRequest, JoinMeetingRequest, CreateRoomStatus} from '../../core/models/meeting.models';
import { User } from '../../core/models/auth.models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatDialogModule,
    MatMenuModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule
  ],
  template: `
    <div class="home-container full-height">
      <!-- 顶部工具栏 -->
      <mat-toolbar class="toolbar">
        <div class="toolbar-content">
          <div class="toolbar-title">
            <mat-icon class="title-icon">video_call</mat-icon>
            <span></span>
          </div>

          <div class="toolbar-actions">
            <button mat-icon-button [routerLink]="['/recordings']" matTooltip="录制文件">
              <mat-icon>video_library</mat-icon>
            </button>

            <button mat-icon-button [routerLink]="['/responsive-test']" matTooltip="响应式测试">
              <mat-icon>devices</mat-icon>
            </button>

            <button mat-icon-button [matMenuTriggerFor]="userMenu">
              <mat-icon>account_circle</mat-icon>
            </button>

            <mat-menu #userMenu="matMenu">
              <div class="user-info">
                <div class="user-name">{{currentUser?.displayName}}</div>
                <div class="user-role">{{getRoleDisplayName(currentUser?.role)}}</div>
              </div>
              <mat-divider></mat-divider>
              <button mat-menu-item (click)="logout()">
                <mat-icon>exit_to_app</mat-icon>
                <span>退出登录</span>
              </button>
            </mat-menu>
          </div>
        </div>
      </mat-toolbar>

      <!-- 主要内容区域 -->
      <div class="main-content">
        <div class="container">
          <!-- 欢迎区域 -->
          <div class="welcome-section">
            <h1>欢迎回来，{{currentUser?.displayName}}!</h1>
            <p>开始或加入一个视频会议</p>
          </div>

          <!-- 快速操作区域 -->
          <div class="quick-actions">
            <div class="action-cards">
              <!-- 创建会议 -->
              <mat-card class="action-card">
                <mat-card-header>
                  <mat-icon mat-card-avatar>add_circle</mat-icon>
                  <mat-card-title>创建会议</mat-card-title>
                  <mat-card-subtitle>创建一个新的视频会议</mat-card-subtitle>
                </mat-card-header>

                <mat-card-content>
                  <form [formGroup]="createRoomForm" (ngSubmit)="createRoom()">
                    <mat-form-field class="full-width" appearance="outline">
                      <mat-label>会议室名称</mat-label>
                      <input matInput formControlName="roomName" placeholder="输入会议室名称">
                      <mat-error *ngIf="createRoomForm.get('roomName')?.hasError('required')">
                        会议室名称不能为空
                      </mat-error>
                    </mat-form-field>

                    <mat-form-field class="full-width" appearance="outline">
                      <mat-label>会议描述</mat-label>
                      <textarea matInput formControlName="description"
                                placeholder="输入会议描述（可选）" rows="3"></textarea>
                    </mat-form-field>
                  </form>
                </mat-card-content>

                <mat-card-actions>
                  <button mat-raised-button color="primary"
                          (click)="createRoom()"
                          [disabled]="createRoomForm.invalid || isCreatingRoom">
                    <mat-spinner *ngIf="isCreatingRoom" diameter="20" class="mr-1"></mat-spinner>
                    {{isCreatingRoom ? '创建中...' : '创建会议'}}
                  </button>
                </mat-card-actions>
              </mat-card>

              <!-- 加入会议 -->
              <mat-card class="action-card">
                <mat-card-header>
                  <mat-icon mat-card-avatar>meeting_room</mat-icon>
                  <mat-card-title>加入会议</mat-card-title>
                  <mat-card-subtitle>使用会议室名称或邀请码加入</mat-card-subtitle>
                </mat-card-header>

                <mat-card-content>
                  <form [formGroup]="joinRoomForm" (ngSubmit)="joinRoom()">
                    <mat-form-field class="full-width" appearance="outline">
                      <mat-label>会议室名称</mat-label>
                      <input matInput formControlName="roomName" placeholder="输入要加入的会议室名称">
                      <mat-error *ngIf="joinRoomForm.get('roomName')?.hasError('required')">
                        会议室名称不能为空
                      </mat-error>
                    </mat-form-field>

                    <div class="divider-text">或</div>

                    <mat-form-field class="full-width" appearance="outline">
                      <mat-label>邀请码</mat-label>
                      <input matInput formControlName="inviteCode" placeholder="输入6位邀请码">
                      <mat-error *ngIf="joinRoomForm.get('inviteCode')?.hasError('pattern')">
                        邀请码格式不正确
                      </mat-error>
                    </mat-form-field>
                  </form>
                </mat-card-content>

                <mat-card-actions>
                  <button mat-raised-button color="accent"
                          (click)="joinRoom()"
                          [disabled]="!canJoinRoom() || isJoiningRoom">
                    <mat-spinner *ngIf="isJoiningRoom" diameter="20" class="mr-1"></mat-spinner>
                    {{isJoiningRoom ? '加入中...' : '加入会议'}}
                  </button>
                </mat-card-actions>
              </mat-card>
            </div>
          </div>

          <!-- 活跃的会议列表 -->
          <div class="active-meetings-section">
            <h2>活跃的会议</h2>

            <div class="loading-container" *ngIf="isLoadingRooms">
              <mat-spinner diameter="40"></mat-spinner>
              <p>加载会议列表...</p>
            </div>

            <div class="meetings-grid" *ngIf="!isLoadingRooms && activeRooms.length > 0">
              <mat-card *ngFor="let room of activeRooms" class="meeting-card">
                <mat-card-header>
                  <mat-icon mat-card-avatar
                            [class.recording]="room.enableRecording">
                    {{room.enableRecording ? 'fiber_manual_record' : 'videocam'}}
                  </mat-icon>
                  <mat-card-title>{{room.roomName}}</mat-card-title>
                  <mat-card-subtitle>
                    {{room.currentParticipants}}/{{room.maxParticipants}} 参与者
                  </mat-card-subtitle>
                </mat-card-header>

                <mat-card-content>
                  <p *ngIf="room.description" class="room-description">
                    {{room.description}}
                  </p>
                  <div class="room-info">
                    <div class="info-item">
                      <mat-icon class="info-icon">person</mat-icon>
                      <span>创建者: {{room.createdBy}}</span>
                    </div>
                    <div class="info-item">
                      <mat-icon class="info-icon">schedule</mat-icon>
                      <span>{{formatTime(room.createdAt)}}</span>
                    </div>
                  </div>
                </mat-card-content>

                <mat-card-actions>
                  <button mat-button color="primary"
                          (click)="quickJoinRoom(room.roomName)">
                    <mat-icon>play_arrow</mat-icon>
                    快速加入
                  </button>

                  <button mat-button
                          *ngIf="room.createdBy === currentUser?.id"
                          (click)="endRoom(room.roomName)">
                    <mat-icon>stop</mat-icon>
                    结束会议
                  </button>
                </mat-card-actions>
              </mat-card>
            </div>

            <div class="empty-state" *ngIf="!isLoadingRooms && activeRooms.length === 0">
              <mat-icon class="empty-icon">meeting_room</mat-icon>
              <h3>暂无活跃的会议</h3>
              <p>创建一个新的会议开始视频通话</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      background: #f5f5f5;
    }

    .toolbar {
      background: white;
      color: #333;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .toolbar-content {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .toolbar-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 500;
    }

    .title-icon {
      color: #2196f3;
    }

    .toolbar-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .user-info {
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .user-name {
      font-weight: 500;
      font-size: 16px;
    }

    .user-role {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
    }

    .main-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .welcome-section {
      text-align: center;
      margin-bottom: 40px;
    }

    .welcome-section h1 {
      font-size: 32px;
      font-weight: 300;
      margin: 0 0 8px 0;
      color: #333;
    }

    .welcome-section p {
      font-size: 16px;
      color: #666;
      margin: 0;
    }

    .quick-actions {
      margin-bottom: 48px;
    }

    .action-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    .action-card {
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: box-shadow 0.2s ease;
    }

    .action-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    .action-card mat-card-header {
      margin-bottom: 16px;
    }

    .action-card .mat-mdc-card-avatar {
      font-size: 24px;
      width: 40px;
      height: 40px;
      color: #2196f3;
    }

    .full-width {
      width: 100%;
    }

    .mr-1 {
      margin-right: 4px;
    }

    .divider-text {
      text-align: center;
      margin: 16px 0;
      color: #666;
      font-size: 14px;
      position: relative;
    }

    .divider-text::before,
    .divider-text::after {
      content: '';
      position: absolute;
      top: 50%;
      width: 45%;
      height: 1px;
      background: #ddd;
    }

    .divider-text::before {
      left: 0;
    }

    .divider-text::after {
      right: 0;
    }

    .active-meetings-section {
      margin-top: 32px;
    }

    .active-meetings-section h2 {
      font-size: 24px;
      font-weight: 400;
      margin-bottom: 24px;
      color: #333;
    }

    .loading-container {
      text-align: center;
      padding: 40px;
    }

    .loading-container p {
      margin-top: 16px;
      color: #666;
    }

    .meetings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;
    }

    .meeting-card {
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: box-shadow 0.2s ease;
    }

    .meeting-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    .meeting-card .mat-mdc-card-avatar.recording {
      color: #f44336;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }

    .room-description {
      color: #666;
      font-size: 14px;
      margin-bottom: 16px;
    }

    .room-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #666;
    }

    .info-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }

    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ccc;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      font-weight: 400;
    }

    .empty-state p {
      margin: 0;
    }

    @media (max-width: 768px) {
      .main-content {
        padding: 16px;
      }

      .action-cards {
        grid-template-columns: 1fr;
        max-width: none;
      }

      .meetings-grid {
        grid-template-columns: 1fr;
      }

      .welcome-section h1 {
        font-size: 24px;
      }
    }
  `]
})
export class HomeComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentUser: User | null = null;
  activeRooms: MeetingRoom[] = [];
  isLoadingRooms = false;
  isCreatingRoom = false;
  isJoiningRoom = false;

  createRoomForm!: FormGroup;
  joinRoomForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private meetingService: MeetingService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.createForms();
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadActiveRooms();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForms(): void {
    this.createRoomForm = this.fb.group({
      roomName: ['', [Validators.required, Validators.minLength(2)]],
      description: ['']
    });

    this.joinRoomForm = this.fb.group({
      roomName: [''],
      inviteCode: ['', [Validators.pattern(/^[A-Z0-9]{6}$/)]]
    });
  }

  private loadActiveRooms(): void {
    this.isLoadingRooms = true;

    this.meetingService.getActiveRooms()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rooms) => {
          this.activeRooms = rooms;
          this.isLoadingRooms = false;
        },
        error: (error: any) => {
          console.error('加载活跃会议失败:', error);
          this.isLoadingRooms = false;
        }
      });
  }

  createRoom(): void {
    if (this.createRoomForm.invalid) return;

    this.isCreatingRoom = true;
    const formValue = this.createRoomForm.value;

    const request: CreateRoomRequest = {
      roomName: formValue.roomName.trim(),
      description: formValue.description?.trim() || '',
      maxParticipants: 50,
      enableRecording: true
    };

    this.meetingService.createRoom(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (CreateResp) => {

          if(CreateResp.status === 0) {
            this.isCreatingRoom = false;
            this.snackBar.open('会议室创建失败！' + CreateResp.message + '!', '关闭', {
              duration: 3000,
              panelClass: ['default-snackbar']
            });
          }else{
            this.isCreatingRoom = true;
            console.log(CreateResp);
            this.snackBar.open('会议室创建成功！', '关闭', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });

            // 清空表单
            this.createRoomForm.reset();
            console.log(CreateResp.meetingRoom);
            // 重新加载房间列表
            this.loadActiveRooms();

            // 自动加入刚创建的会议
            this.quickJoinRoom(CreateResp.meetingRoom.roomName);
          }

        },
        error: (error: any) => {
          this.isCreatingRoom = false;
          console.error('创建会议室失败:', error);
        }
      });
  }

  /**
   * 检查是否可以加入会议
   */
  canJoinRoom(): boolean {
    const formValue = this.joinRoomForm.value;
    const hasRoomName = formValue.roomName && formValue.roomName.trim();
    const hasValidInviteCode = formValue.inviteCode && /^[A-Z0-9]{6}$/.test(formValue.inviteCode);

    return !!(hasRoomName || hasValidInviteCode);
  }

  /**
   * 加入会议
   */
  joinRoom(): void {
    if (!this.canJoinRoom()) return;

    const formValue = this.joinRoomForm.value;
    const roomName = formValue.roomName?.trim();
    const inviteCode = formValue.inviteCode?.trim();

    if (inviteCode) {
      // 使用邀请码加入
      this.joinByInviteCode(inviteCode);
    } else if (roomName) {
      // 使用房间名加入
      this.quickJoinRoom(roomName);
    }
  }

  /**
   * 通过邀请码加入会议
   */
  private joinByInviteCode(inviteCode: string): void {
    if (!this.currentUser) return;

    this.isJoiningRoom = true;

    this.meetingService.joinMeetingByInvitationCode({
      invitationCode: inviteCode,
      userId: this.currentUser.id,
      userName: this.currentUser.displayName
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: any) => {
        this.isJoiningRoom = false;

        // 导航到会议室
        this.router.navigate(['/meeting', response.roomName], {
          state: {
            livekitToken: response.livekitJwt,
            serverUrl: response.serverUrl,
            userRole: response.role
          }
        });
      },
      error: (error) => {
        this.isJoiningRoom = false;
        console.error('通过邀请码加入会议失败:', error);

        let errorMessage = '加入会议失败';
        if (error.status === 404) {
          errorMessage = '邀请码无效或已过期';
        } else if (error.status === 403) {
          errorMessage = '没有权限加入此会议';
        }

        this.snackBar.open(errorMessage, '关闭', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  /**
   * 快速加入会议
   * @param roomName
   */
  quickJoinRoom(roomName: string): void {
    if (!this.currentUser) return;

    this.isJoiningRoom = true;

    const request: JoinMeetingRequest = {
      roomName,
      userId: this.currentUser.id,
      userName: this.currentUser.displayName,
      role: this.currentUser.role === 'admin' ? 'host' : 'participant'
    };

    this.meetingService.joinMeeting(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log(response.livekitJwt,response.serverUrl,response.role)
          this.isJoiningRoom = false;
          // 导航到会议室
          this.router.navigate(['/meeting', roomName], {
            state: {
              livekitToken: response.livekitJwt,
              serverUrl: response.serverUrl,
              userRole: response.role
            }
          });
        },
        error: (error) => {
          this.isJoiningRoom = false;
          console.error('加入会议失败:', error);
        }
      });
  }

  endRoom(roomName: string): void {
    this.meetingService.endRoom(roomName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('会议已结束', '关闭', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.loadActiveRooms();
        },
        error: (error) => {
          console.error('结束会议失败:', error);
        }
      });
  }

  logout(): void {
    this.authService.logout();
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins}分钟前`;
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)}小时前`;
    } else {
      return date.toLocaleDateString();
    }
  }

  getRoleDisplayName(role?: string): string {
    const roleMap: { [key: string]: string } = {
      'admin': '管理员',
      'host': '主持人',
      'participant': '参与者',
      'observer': '观察者'
    };
    return roleMap[role || ''] || '参与者';
  }
}
