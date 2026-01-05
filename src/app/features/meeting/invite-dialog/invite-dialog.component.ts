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
  templateUrl: './invite-dialog.component.html',
  styleUrls: ['./invite-dialog.component.scss']
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