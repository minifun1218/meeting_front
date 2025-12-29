import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MeetingService } from '../../../core/services/meeting.service';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/auth.models';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-join',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="join-container">
      <div class="join-content">
        <mat-spinner diameter="50"></mat-spinner>
        <h2>正在验证邀请码...</h2>
        <p>请稍候，我们正在为您加入会议</p>
      </div>
    </div>
  `,
  styles: [`
    .join-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    .join-content {
      text-align: center;
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      max-width: 400px;
      width: 90%;
    }
    
    h2 {
      margin: 1rem 0 0.5rem 0;
      color: #333;
      font-weight: 500;
    }
    
    p {
      color: #666;
      margin: 0;
    }
    
    mat-spinner {
      margin: 0 auto 1rem auto;
    }
  `]
})
export class JoinComponent implements OnInit {
  private destroy$ = new Subject<void>();
  private currentUser: User | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private meetingService: MeetingService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  /**
   * 组件初始化
   */
  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    
    // 如果用户未登录，先跳转到登录页面
    if (!this.currentUser) {
      const currentUrl = this.router.url;
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: currentUrl }
      });
      return;
    }

    // 获取URL参数
    const code = this.route.snapshot.queryParams['code'];
    const room = this.route.snapshot.queryParams['room'];

    if (!code) {
      this.showError('邀请码缺失');
      return;
    }

    // 验证邀请码并加入会议
    this.joinMeetingByInviteCode(code, room);
  }

  /**
   * 通过邀请码加入会议
   */
  private joinMeetingByInviteCode(inviteCode: string, expectedRoom?: string): void {
    if (!this.currentUser) return;

    this.meetingService.joinMeetingByInvitationCode({
      invitationCode: inviteCode,
      userId: this.currentUser.id,
      userName: this.currentUser.displayName
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: any) => {
        // 验证房间名是否匹配（如果提供了expectedRoom参数）
        if (expectedRoom && response.roomName !== expectedRoom) {
          this.showError('邀请码与指定房间不匹配');
          return;
        }
        
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
        console.error('通过邀请码加入会议失败:', error);
        
        let errorMessage = '加入会议失败';
        if (error.status === 404) {
          errorMessage = '邀请码无效或已过期';
        } else if (error.status === 403) {
          errorMessage = '没有权限加入此会议';
        } else if (error.status === 409) {
          errorMessage = '会议室已满或已结束';
        }
        
        this.showError(errorMessage);
      }
    });
  }

  /**
   * 显示错误信息并跳转到首页
   */
  private showError(message: string): void {
    this.snackBar.open(message, '确定', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
    
    // 3秒后跳转到首页
    setTimeout(() => {
      this.router.navigate(['/home']);
    }, 3000);
  }

  /**
   * 组件销毁时清理资源
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}