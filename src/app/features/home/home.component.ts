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
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
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
