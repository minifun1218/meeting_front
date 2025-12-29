import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RecordingService } from '../../../core/services/recording.service';
import { RecordingFileResponse, RecordingStatus } from '../../../core/models/recording.models';

/**
 * 录制详情对话框组件
 */
@Component({
  selector: 'app-recording-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2 mat-dialog-title>录制详情</h2>
        <button mat-icon-button mat-dialog-close>
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content">
        <div class="recording-info">
          <!-- 基本信息 -->
          <div class="info-section">
            <h3>基本信息</h3>
            <div class="info-grid">
              <div class="info-item">
                <label>文件名:</label>
                <span>{{ recording.fileName }}</span>
              </div>
              <div class="info-item">
                <label>房间名称:</label>
                <span>{{ recording.roomName }}</span>
              </div>
              <div class="info-item">
                <label>状态:</label>
                <span class="status-badge" [ngClass]="getStatusClass(recording.status)">
                  {{ getStatusDisplayName(recording.status) }}
                </span>
              </div>
              <div class="info-item">
                <label>创建时间:</label>
                <span>{{ formatDate(recording.createdAt) }}</span>
              </div>
              <div class="info-item">
                <label>文件大小:</label>
                <span>{{ formatFileSize(recording.fileSize) }}</span>
              </div>
              <div class="info-item">
                <label>录制时长:</label>
                <span>{{ formatDuration(recording.duration) }}</span>
              </div>
            </div>
          </div>

          <!-- 技术信息 -->
          <div class="info-section" *ngIf="recording.metadata">
            <h3>技术信息</h3>
            <div class="info-grid">
              <div class="info-item" *ngIf="recording.metadata.resolution">
                <label>分辨率:</label>
                <span>{{ recording.metadata.resolution }}</span>
              </div>
              <div class="info-item" *ngIf="recording.metadata.frameRate">
                <label>帧率:</label>
                <span>{{ recording.metadata.frameRate }} fps</span>
              </div>
              <div class="info-item" *ngIf="recording.metadata.bitrate">
                <label>比特率:</label>
                <span>{{ recording.metadata.bitrate }} kbps</span>
              </div>
              <div class="info-item" *ngIf="recording.metadata.codec">
                <label>编码格式:</label>
                <span>{{ recording.metadata.codec }}</span>
              </div>
            </div>
          </div>

          <!-- 编辑信息 -->
          <div class="info-section">
            <h3>编辑信息</h3>
            <form [formGroup]="editForm" class="edit-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>文件名</mat-label>
                <input matInput formControlName="fileName" placeholder="输入文件名">
                <mat-error *ngIf="editForm.get('fileName')?.hasError('required')">
                  文件名不能为空
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>描述</mat-label>
                <textarea matInput formControlName="description" 
                         placeholder="添加录制描述" rows="3"></textarea>
              </mat-form-field>

              <div class="form-actions">
                <button mat-raised-button color="primary" 
                        (click)="updateRecording()" 
                        [disabled]="editForm.invalid || isUpdating">
                  <mat-icon *ngIf="isUpdating">hourglass_empty</mat-icon>
                  <mat-icon *ngIf="!isUpdating">save</mat-icon>
                  {{ isUpdating ? '保存中...' : '保存更改' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="copyShareLink()">
          <mat-icon>share</mat-icon>
          复制分享链接
        </button>
        
        <button mat-button color="primary" 
                (click)="downloadRecording()" 
                [disabled]="recording.status !== 'COMPLETED'">
          <mat-icon>download</mat-icon>
          下载
        </button>
        
        <button mat-button color="warn" (click)="deleteRecording()">
          <mat-icon>delete</mat-icon>
          删除
        </button>
        
        <button mat-button mat-dialog-close>关闭</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      width: 100%;
      max-width: 600px;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 24px;
      border-bottom: 1px solid #e0e0e0;
    }

    .dialog-header h2 {
      margin: 0;
      font-weight: 500;
    }

    .dialog-content {
      padding: 24px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .info-section {
      margin-bottom: 32px;
    }

    .info-section h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 500;
      color: #333;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-item label {
      font-size: 12px;
      color: #666;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-item span {
      font-size: 14px;
      color: #333;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-completed {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .status-processing {
      background-color: #fff3e0;
      color: #f57c00;
    }

    .status-failed {
      background-color: #ffebee;
      color: #d32f2f;
    }

    .status-uploading {
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .edit-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .full-width {
      width: 100%;
    }

    .form-actions {
      display: flex;
      justify-content: flex-start;
    }

    .dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    @media (max-width: 600px) {
      .dialog-container {
        max-width: 100vw;
        margin: 0;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }

      .dialog-actions {
        flex-wrap: wrap;
      }
    }
  `]
})
export class RecordingDetailDialogComponent implements OnInit {
  recording: RecordingFileResponse;
  editForm!: FormGroup;
  isUpdating = false;

  constructor(
    private fb: FormBuilder,
    private recordingService: RecordingService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<RecordingDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { recording: RecordingFileResponse }
  ) {
    this.recording = data.recording;
  }

  ngOnInit(): void {
    this.createEditForm();
  }

  /**
   * 创建编辑表单
   */
  private createEditForm(): void {
    this.editForm = this.fb.group({
      fileName: [this.recording.fileName, [Validators.required]],
      description: [this.recording.description || '']
    });
  }

  /**
   * 更新录制信息
   */
  updateRecording(): void {
    if (this.editForm.invalid) return;

    this.isUpdating = true;
    const updateData = this.editForm.value;

    this.recordingService.updateRecording(this.recording.id, updateData)
      .subscribe({
        next: (updatedRecording) => {
          this.recording = updatedRecording;
          this.isUpdating = false;
          this.snackBar.open('录制信息更新成功', '确定', { duration: 3000 });
        },
        error: (error) => {
          console.error('更新录制信息失败:', error);
          this.isUpdating = false;
          this.snackBar.open('更新录制信息失败', '确定', { duration: 3000 });
        }
      });
  }

  /**
   * 下载录制文件
   */
  downloadRecording(): void {
    if (this.recording.status !== RecordingStatus.COMPLETED) {
      this.snackBar.open('录制文件尚未完成，无法下载', '确定');
      return;
    }

    this.recordingService.generateDownloadUrl(this.recording.id)
      .subscribe({
        next: (response) => {
          this.recordingService.downloadRecording(response.downloadUrl, response.fileName);
          this.snackBar.open('开始下载录制文件', '确定', { duration: 3000 });
        },
        error: (error) => {
          console.error('生成下载链接失败:', error);
          this.snackBar.open('生成下载链接失败', '确定');
        }
      });
  }

  /**
   * 复制分享链接
   */
  copyShareLink(): void {
    const shareUrl = `${window.location.origin}/recordings/${this.recording.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      this.snackBar.open('分享链接已复制到剪贴板', '确定', { duration: 3000 });
    }).catch(() => {
      this.snackBar.open('复制分享链接失败', '确定');
    });
  }

  /**
   * 删除录制文件
   */
  deleteRecording(): void {
    const confirmMessage = `确定要删除录制文件 "${this.recording.fileName}" 吗？此操作不可恢复。`;
    
    if (confirm(confirmMessage)) {
      this.recordingService.deleteRecording(this.recording.id)
        .subscribe({
          next: () => {
            this.snackBar.open('录制文件删除成功', '确定', { duration: 3000 });
            this.dialogRef.close({ deleted: true });
          },
          error: (error) => {
            console.error('删除录制文件失败:', error);
            this.snackBar.open('删除录制文件失败', '确定', { duration: 3000 });
          }
        });
    }
  }

  /**
   * 获取状态样式类
   */
  getStatusClass(status: RecordingStatus): string {
    return `status-${status.toLowerCase()}`;
  }

  /**
   * 获取状态显示名称
   */
  getStatusDisplayName(status: RecordingStatus): string {
    const statusMap = {
      [RecordingStatus.COMPLETED]: '已完成',
      [RecordingStatus.PROCESSING]: '处理中',
      [RecordingStatus.FAILED]: '失败',
      [RecordingStatus.UPLOADING]: '上传中'
    };
    return statusMap[status] || status;
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes: number): string {
    return this.recordingService.formatFileSize(bytes);
  }

  /**
   * 格式化录制时长
   */
  formatDuration(seconds: number): string {
    return this.recordingService.formatDuration(seconds);
  }

  /**
   * 格式化日期
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}