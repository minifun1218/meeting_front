import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

import { AuthService } from '../../../core/services/auth.service';
import { RecordingService } from '../../../core/services/recording.service';
import { RecordingFileResponse, RecordingStatus } from '../../../core/models/recording.models';
import { User } from '../../../core/models/auth.models';
import { RecordingDetailDialogComponent } from '../recording-detail-dialog/recording-detail-dialog.component';

@Component({
  selector: 'app-recordings-list',
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
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './recordings-list.component.html',
  styleUrls: ['./recordings-list.component.scss']
})
export class RecordingsListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentUser: User | null = null;
  recordings: RecordingFileResponse[] = [];
  searchForm!: FormGroup;

  // 分页相关
  currentPage = 0;
  pageSize = 20;
  totalElements = 0;

  // 状态
  isLoading = false;

  // 统计信息
  totalRecordings = 0;
  completedRecordings = 0;
  processingRecordings = 0;
  totalSize = 0;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private recordingService: RecordingService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.createSearchForm();
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadRecordings();
    this.setupFormSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createSearchForm(): void {
    this.searchForm = this.fb.group({
      searchText: [''],
      status: [''],
      startDate: [null],
      endDate: [null]
    });
  }

  private setupFormSubscriptions(): void {
    // 搜索文本实时搜索
    this.searchForm.get('searchText')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.currentPage = 0;
        this.loadRecordings();
      });
  }

  private loadRecordings(): void {
    if (!this.currentUser) return;

    this.isLoading = true;
    const formValue = this.searchForm.value;

    const filters = {
      userId: this.currentUser.id,
      roomName: formValue.searchText || undefined,
      status: formValue.status || undefined,
      // 可以添加日期范围筛选
    };

    this.recordingService.searchRecordings(filters, this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.recordings = response.recordings;
          this.totalElements = response.pageInfo.totalElements;
          this.updateStatistics();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('加载录制文件失败:', error);
          this.isLoading = false;
          this.snackBar.open('加载录制文件失败', '确定', { duration: 3000 });
        }
      });
  }

  private updateStatistics(): void {
    this.totalRecordings = this.totalElements;
    this.completedRecordings = this.recordings.filter(r => r.status === RecordingStatus.COMPLETED).length;
    this.processingRecordings = this.recordings.filter(r => r.status === RecordingStatus.PROCESSING).length;
    this.totalSize = this.recordings.reduce((sum, r) => sum + r.fileSize, 0);
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.loadRecordings();
  }

  clearFilters(): void {
    this.searchForm.reset();
    this.currentPage = 0;
    this.loadRecordings();
  }

  refreshRecordings(): void {
    this.loadRecordings();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadRecordings();
  }

  downloadRecording(recording: RecordingFileResponse): void {
    if (recording.status !== RecordingStatus.COMPLETED) {
      this.snackBar.open('录制文件尚未完成，无法下载', '确定');
      return;
    }

    this.recordingService.generateDownloadUrl(recording.id)
      .pipe(takeUntil(this.destroy$))
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
   * 查看录制详情
   */
  viewRecordingDetails(recording: RecordingFileResponse): void {
    const dialogRef = this.dialog.open(RecordingDetailDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { recording }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.deleted) {
        // 如果录制被删除，刷新列表
        this.loadRecordings();
      } else if (result?.updated) {
        // 如果录制信息被更新，刷新列表
        this.loadRecordings();
      }
    });
  }

  copyShareLink(recording: RecordingFileResponse): void {
    // 实现分享链接复制
    const shareUrl = `${window.location.origin}/recordings/${recording.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      this.snackBar.open('分享链接已复制到剪贴板', '确定', { duration: 3000 });
    }).catch(() => {
      this.snackBar.open('复制分享链接失败', '确定');
    });
  }

  /**
   * 删除录制文件
   */
  deleteRecording(recording: RecordingFileResponse): void {
    const confirmMessage = `确定要删除录制文件 "${recording.fileName}" 吗？此操作不可恢复。`;
    
    if (confirm(confirmMessage)) {
      this.recordingService.deleteRecording(recording.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.snackBar.open('录制文件删除成功', '确定', { duration: 3000 });
            this.loadRecordings(); // 刷新列表
          },
          error: (error) => {
            console.error('删除录制文件失败:', error);
            this.snackBar.open('删除录制文件失败', '确定', { duration: 3000 });
          }
        });
    }
  }

  getStatusClass(status: RecordingStatus): string {
    return `status-${status.toLowerCase()}`;
  }

  getStatusDisplayName(status: RecordingStatus): string {
    const statusMap = {
      [RecordingStatus.COMPLETED]: '已完成',
      [RecordingStatus.PROCESSING]: '处理中',
      [RecordingStatus.FAILED]: '失败',
      [RecordingStatus.UPLOADING]: '上传中'
    };
    return statusMap[status] || status;
  }

  formatFileSize(bytes: number): string {
    return this.recordingService.formatFileSize(bytes);
  }

  formatDuration(seconds: number): string {
    return this.recordingService.formatDuration(seconds);
  }

  formatTotalSize(bytes: number): string {
    return this.recordingService.formatFileSize(bytes);
  }

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

  trackByRecordingId(index: number, recording: RecordingFileResponse): number {
    return recording.id;
  }
}
