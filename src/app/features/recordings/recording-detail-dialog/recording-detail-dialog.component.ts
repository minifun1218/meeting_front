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
  templateUrl: './recording-detail-dialog.component.html',
  styleUrls: ['./recording-detail-dialog.component.scss']
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