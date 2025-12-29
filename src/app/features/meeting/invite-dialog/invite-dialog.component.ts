import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
// import { QRCodeModule } from 'angularx-qrcode';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { QRCodeModule } from 'angularx-qrcode';

import { MeetingService } from '../../../core/services/meeting.service';
import { AuthService } from '../../../core/services/auth.service';
import { 
  InvitationRequest, 
  InvitationResponse, 
  InvitationCodeRequest,
  ShareInvitationRequest 
} from '../../../core/models/meeting.models';
import { User } from '../../../core/models/auth.models';

export interface InviteDialogData {
  roomName: string;
}

@Component({
  selector: 'app-invite-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatTabsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatDividerModule,
    MatTooltipModule,
    MatSelectModule,
    QRCodeModule,
    ClipboardModule
  ],
  template: `
    <div class="invite-dialog">
      <div class="dialog-header">
        <h2 mat-dialog-title>
          <mat-icon>person_add</mat-icon>
          邀请参与者
        </h2>
        <button mat-icon-button mat-dialog-close>
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content>
        <mat-tab-group>
          <!-- 生成邀请 -->
          <mat-tab label="生成邀请">
            <div class="tab-content">
              <form [formGroup]="inviteForm" (ngSubmit)="generateInvitation()">
                <mat-form-field class="full-width" appearance="outline">
                  <mat-label>邀请有效期（小时）</mat-label>
                  <mat-select formControlName="expiresInHours">
                    <mat-option [value]="1">1小时</mat-option>
                    <mat-option [value]="6">6小时</mat-option>
                    <mat-option [value]="24">24小时</mat-option>
                    <mat-option [value]="72">3天</mat-option>
                    <mat-option [value]="168">7天</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field class="full-width" appearance="outline">
                  <mat-label>最大使用次数</mat-label>
                  <mat-select formControlName="maxUses">
                    <mat-option [value]="0">无限制</mat-option>
                    <mat-option [value]="1">1次</mat-option>
                    <mat-option [value]="5">5次</mat-option>
                    <mat-option [value]="10">10次</mat-option>
                    <mat-option [value]="20">20次</mat-option>
                  </mat-select>
                </mat-form-field>

                <div class="form-actions">
                  <button mat-raised-button 
                          color="primary" 
                          type="submit"
                          [disabled]="inviteForm.invalid || isGenerating">
                    <mat-spinner *ngIf="isGenerating" diameter="20" class="mr-1"></mat-spinner>
                    {{isGenerating ? '生成中...' : '生成邀请'}}
                  </button>
                </div>
              </form>

              <!-- 邀请结果 -->
              <div *ngIf="currentInvitation" class="invitation-result">
                <mat-divider class="my-3"></mat-divider>
                
                <mat-card class="invitation-card">
                  <mat-card-header>
                    <mat-card-title>邀请已生成</mat-card-title>
                  </mat-card-header>
                  
                  <mat-card-content>
                    <!-- 邀请链接 -->
                    <div class="invitation-item">
                      <label>邀请链接：</label>
                      <div class="copy-field">
                        <input readonly [value]="currentInvitation.invitationLink" class="copy-input">
                        <button mat-icon-button 
                                [cdkCopyToClipboard]="currentInvitation.invitationLink"
                                (cdkCopyToClipboardCopied)="onCopied('邀请链接已复制到剪贴板')"
                                matTooltip="复制链接">
                          <mat-icon>content_copy</mat-icon>
                        </button>
                      </div>
                    </div>

                    <!-- 邀请码 -->
                    <div class="invitation-item">
                      <label>邀请码：</label>
                      <div class="copy-field">
                        <input readonly [value]="currentInvitation.invitationCode" class="copy-input code-input">
                        <button mat-icon-button 
                                [cdkCopyToClipboard]="currentInvitation.invitationCode"
                                (cdkCopyToClipboardCopied)="onCopied('邀请码已复制到剪贴板')"
                                matTooltip="复制邀请码">
                          <mat-icon>content_copy</mat-icon>
                        </button>
                      </div>
                    </div>

                    <!-- 邀请信息 -->
                    <div class="invitation-info">
                      <p><strong>有效期至：</strong>{{formatDate(currentInvitation.expiresAt)}}</p>
                      <p><strong>使用次数：</strong>{{currentInvitation.usageCount}}</p>
                    </div>

                    <!-- 二维码 -->
                    <div class="qrcode-section" *ngIf="showQRCode">
                      <h4>扫码加入</h4>
                      <div class="qr-code">
                        <qrcode 
                          [qrdata]="currentInvitation.invitationLink" 
                          [width]="200" 
                          [errorCorrectionLevel]="'M'"
                          [colorDark]="'#000000'"
                          [colorLight]="'#ffffff'">
                        </qrcode>
                      </div>
                      <p class="qr-hint">使用手机扫描二维码快速加入会议</p>
                    </div>
                  </mat-card-content>
                  
                  <mat-card-actions>
                    <button mat-button (click)="toggleQRCode()">
                      <mat-icon>{{showQRCode ? 'visibility_off' : 'qr_code'}}</mat-icon>
                      {{showQRCode ? '隐藏二维码' : '显示二维码'}}
                    </button>
                    
                    <button mat-button color="warn" (click)="revokeInvitation()">
                      <mat-icon>delete</mat-icon>
                      撤销邀请
                    </button>
                  </mat-card-actions>
                </mat-card>
              </div>
            </div>
          </mat-tab>

          <!-- 使用邀请码 -->
          <mat-tab label="使用邀请码">
            <div class="tab-content">
              <form [formGroup]="joinForm" (ngSubmit)="joinByInvitationCode()">
                <mat-form-field class="full-width" appearance="outline">
                  <mat-label>邀请码</mat-label>
                  <input matInput 
                         formControlName="invitationCode" 
                         placeholder="输入6位邀请码"
                         maxlength="6">
                  <mat-error *ngIf="joinForm.get('invitationCode')?.hasError('required')">
                    请输入邀请码
                  </mat-error>
                  <mat-error *ngIf="joinForm.get('invitationCode')?.hasError('pattern')">
                    邀请码格式不正确
                  </mat-error>
                </mat-form-field>

                <div class="form-actions">
                  <button mat-raised-button 
                          color="primary" 
                          type="submit"
                          [disabled]="joinForm.invalid || isJoining">
                    <mat-spinner *ngIf="isJoining" diameter="20" class="mr-1"></mat-spinner>
                    {{isJoining ? '验证中...' : '验证并加入'}}
                  </button>
                </div>
              </form>
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-dialog-content>
    </div>
  `,
  styles: [`
    .invite-dialog {
      width: 500px;
      max-width: 90vw;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 24px;
      border-bottom: 1px solid #e0e0e0;
    }

    .dialog-header h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
    }

    .tab-content {
      padding: 24px 0;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
    }

    .invitation-result {
      margin-top: 24px;
    }

    .invitation-card {
      margin-top: 16px;
    }

    .invitation-item {
      margin-bottom: 16px;
    }

    .invitation-item label {
      display: block;
      font-weight: 500;
      margin-bottom: 8px;
      color: #666;
    }

    .copy-field {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .copy-input {
      flex: 1;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: #f5f5f5;
      font-family: monospace;
      font-size: 14px;
    }

    .code-input {
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 2px;
    }

    .invitation-info {
      margin: 16px 0;
      padding: 12px;
      background: #f0f7ff;
      border-radius: 4px;
    }

    .invitation-info p {
      margin: 4px 0;
      font-size: 14px;
    }

    .qrcode-section {
      text-align: center;
      margin-top: 16px;
      padding: 16px;
      border: 1px dashed #ddd;
      border-radius: 4px;
    }

    .qrcode-section h4 {
      margin-bottom: 16px;
      color: #666;
    }

    .qr-code {
      display: inline-block;
      margin-bottom: 12px;
    }

    .qr-hint {
      margin: 8px 0 0 0;
      font-size: 12px;
      color: #666;
    }

    .mr-1 {
      margin-right: 8px;
    }

    .my-3 {
      margin: 24px 0;
    }

    @media (max-width: 600px) {
      .invite-dialog {
        width: 100%;
        max-width: 100%;
      }
      
      .copy-field {
        flex-direction: column;
        align-items: stretch;
      }
      
      .copy-input {
        margin-bottom: 8px;
      }
    }
  `]
})
export class InviteDialogComponent implements OnInit {
  inviteForm: FormGroup;
  joinForm: FormGroup;
  currentUser: User | null = null;
  currentInvitation: InvitationResponse | null = null;
  showQRCode = false;
  isGenerating = false;
  isJoining = false;

  constructor(
    private fb: FormBuilder,
    private meetingService: MeetingService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<InviteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: InviteDialogData
  ) {
    this.inviteForm = this.fb.group({
      expiresInHours: [24, [Validators.required]],
      maxUses: [0, [Validators.required]]
    });

    this.joinForm = this.fb.group({
      invitationCode: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]{6}$/)]]
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
  }

  /**
   * 生成邀请链接和邀请码
   */
  generateInvitation(): void {
    if (this.inviteForm.invalid || !this.currentUser) return;

    this.isGenerating = true;
    const formValue = this.inviteForm.value;

    const request: InvitationRequest = {
      roomName: this.data.roomName,
      inviterUserId: this.currentUser.id,
      inviterUserName: this.currentUser.displayName,
      expiresInHours: formValue.expiresInHours,
      maxUses: formValue.maxUses || undefined
    };

    this.meetingService.generateInvitation(request).subscribe({
      next: (response) => {
        this.isGenerating = false;
        this.currentInvitation = response;
        this.snackBar.open('邀请已生成！', '确定', { duration: 3000 });
      },
      error: (error) => {
        this.isGenerating = false;
        console.error('生成邀请失败:', error);
        this.snackBar.open('生成邀请失败，请重试', '确定');
      }
    });
  }

  /**
   * 通过邀请码加入会议
   */
  joinByInvitationCode(): void {
    if (this.joinForm.invalid || !this.currentUser) return;

    this.isJoining = true;
    const formValue = this.joinForm.value;

    const request: InvitationCodeRequest = {
      invitationCode: formValue.invitationCode.toUpperCase(),
      userId: this.currentUser.id,
      userName: this.currentUser.displayName
    };

    // 先验证邀请码
    this.meetingService.validateInvitationCode(request).subscribe({
      next: (validation) => {
        if (validation.isValid) {
          // 验证成功，加入会议
          this.meetingService.joinMeetingByInvitationCode(request).subscribe({
            next: (response) => {
              this.isJoining = false;
              this.snackBar.open('验证成功！正在加入会议...', '确定', { duration: 3000 });
              this.dialogRef.close({ joinResponse: response });
            },
            error: (error) => {
              this.isJoining = false;
              console.error('加入会议失败:', error);
              this.snackBar.open('加入会议失败，请重试', '确定');
            }
          });
        } else {
          this.isJoining = false;
          this.snackBar.open(validation.message || '邀请码无效', '确定');
        }
      },
      error: (error) => {
        this.isJoining = false;
        console.error('验证邀请码失败:', error);
        this.snackBar.open('验证失败，请检查邀请码', '确定');
      }
    });
  }

  /**
   * 撤销邀请
   */
  revokeInvitation(): void {
    if (!this.currentInvitation) return;

    this.meetingService.revokeInvitation(this.currentInvitation.invitationId).subscribe({
      next: () => {
        this.snackBar.open('邀请已撤销', '确定', { duration: 3000 });
        this.currentInvitation = null;
        this.showQRCode = false;
      },
      error: (error) => {
        console.error('撤销邀请失败:', error);
        this.snackBar.open('撤销邀请失败，请重试', '确定');
      }
    });
  }

  /**
   * 切换二维码显示
   */
  toggleQRCode(): void {
    this.showQRCode = !this.showQRCode;
  }

  /**
   * 复制成功回调
   */
  onCopied(message: string): void {
    this.snackBar.open(message, '确定', { duration: 2000 });
  }

  /**
   * 格式化日期
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  }
}