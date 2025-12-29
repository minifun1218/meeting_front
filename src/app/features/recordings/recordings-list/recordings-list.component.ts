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
  template: `
    <div class="recordings-container full-height">
      <!-- 顶部工具栏 -->
      <mat-toolbar class="toolbar">
        <div class="toolbar-content">
          <div class="toolbar-title">
            <button mat-icon-button [routerLink]="['/home']">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <mat-icon class="title-icon">video_library</mat-icon>
            <span>录制文件管理</span>
          </div>
          
          <div class="toolbar-actions">
            <button mat-icon-button 
                    (click)="refreshRecordings()"
                    [disabled]="isLoading"
                    matTooltip="刷新">
              <mat-icon>refresh</mat-icon>
            </button>
            
            <button mat-button [routerLink]="['/home']">
              <mat-icon>home</mat-icon>
              返回主页
            </button>
          </div>
        </div>
      </mat-toolbar>

      <!-- 主要内容区域 -->
      <div class="main-content">
        <div class="container">
          <!-- 搜索和筛选区域 -->
          <mat-card class="filters-card">
            <mat-card-content>
              <form [formGroup]="searchForm" class="search-form">
                <div class="search-row">
                  <mat-form-field class="search-field" appearance="outline">
                    <mat-label>搜索录制文件</mat-label>
                    <input matInput 
                           formControlName="searchText"
                           placeholder="输入房间名称或文件名">
                    <mat-icon matSuffix>search</mat-icon>
                  </mat-form-field>
                  
                  <mat-form-field class="filter-field" appearance="outline">
                    <mat-label>状态</mat-label>
                    <mat-select formControlName="status">
                      <mat-option value="">全部状态</mat-option>
                      <mat-option value="COMPLETED">已完成</mat-option>
                      <mat-option value="PROCESSING">处理中</mat-option>
                      <mat-option value="FAILED">失败</mat-option>
                      <mat-option value="UPLOADING">上传中</mat-option>
                    </mat-select>
                  </mat-form-field>
                  
                  <mat-form-field class="filter-field" appearance="outline">
                    <mat-label>开始日期</mat-label>
                    <input matInput 
                           [matDatepicker]="startPicker" 
                           formControlName="startDate">
                    <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
                    <mat-datepicker #startPicker></mat-datepicker>
                  </mat-form-field>
                  
                  <mat-form-field class="filter-field" appearance="outline">
                    <mat-label>结束日期</mat-label>
                    <input matInput 
                           [matDatepicker]="endPicker" 
                           formControlName="endDate">
                    <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
                    <mat-datepicker #endPicker></mat-datepicker>
                  </mat-form-field>
                  
                  <button mat-raised-button 
                          color="primary"
                          (click)="applyFilters()"
                          [disabled]="isLoading">
                    搜索
                  </button>
                  
                  <button mat-button 
                          (click)="clearFilters()">
                    清空
                  </button>
                </div>
              </form>
            </mat-card-content>
          </mat-card>

          <!-- 统计信息 -->
          <div class="stats-row" *ngIf="!isLoading">
            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-content">
                  <mat-icon class="stat-icon">video_library</mat-icon>
                  <div class="stat-info">
                    <div class="stat-value">{{totalRecordings}}</div>
                    <div class="stat-label">总录制文件</div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
            
            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-content">
                  <mat-icon class="stat-icon completed">check_circle</mat-icon>
                  <div class="stat-info">
                    <div class="stat-value">{{completedRecordings}}</div>
                    <div class="stat-label">已完成</div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
            
            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-content">
                  <mat-icon class="stat-icon processing">autorenew</mat-icon>
                  <div class="stat-info">
                    <div class="stat-value">{{processingRecordings}}</div>
                    <div class="stat-label">处理中</div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
            
            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-content">
                  <mat-icon class="stat-icon storage">storage</mat-icon>
                  <div class="stat-info">
                    <div class="stat-value">{{formatTotalSize(totalSize)}}</div>
                    <div class="stat-label">总大小</div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>

          <!-- 录制文件列表 -->
          <div class="recordings-section">
            <!-- 加载状态 -->
            <div class="loading-container" *ngIf="isLoading">
              <mat-spinner diameter="40"></mat-spinner>
              <p>加载录制文件...</p>
            </div>

            <!-- 录制文件网格 -->
            <div class="recordings-grid" *ngIf="!isLoading && recordings.length > 0">
              <mat-card *ngFor="let recording of recordings; trackBy: trackByRecordingId" 
                        class="recording-card">
                <!-- 缩略图或图标 -->
                <div class="recording-thumbnail">
                  <img *ngIf="recording.thumbnailPath" 
                       [src]="recording.thumbnailPath" 
                       [alt]="recording.fileName"
                       class="thumbnail-image">
                  <div *ngIf="!recording.thumbnailPath" class="thumbnail-placeholder">
                    <mat-icon>play_circle_outline</mat-icon>
                  </div>
                  
                  <!-- 状态覆盖层 -->
                  <div class="status-overlay">
                    <mat-chip [class]="getStatusClass(recording.status)">
                      {{getStatusDisplayName(recording.status)}}
                    </mat-chip>
                  </div>
                  
                  <!-- 时长显示 -->
                  <div class="duration-overlay" *ngIf="recording.duration">
                    {{formatDuration(recording.duration)}}
                  </div>
                </div>

                <mat-card-content>
                  <div class="recording-info">
                    <h3 class="recording-title" [matTooltip]="recording.fileName">
                      {{recording.fileName}}
                    </h3>
                    
                    <div class="recording-details">
                      <div class="detail-item">
                        <mat-icon class="detail-icon">meeting_room</mat-icon>
                        <span>{{recording.roomName}}</span>
                      </div>
                      
                      <div class="detail-item">
                        <mat-icon class="detail-icon">schedule</mat-icon>
                        <span>{{formatDate(recording.createdAt)}}</span>
                      </div>
                      
                      <div class="detail-item">
                        <mat-icon class="detail-icon">folder</mat-icon>
                        <span>{{formatFileSize(recording.fileSize)}}</span>
                      </div>
                      
                      <div class="detail-item" *ngIf="recording.duration">
                        <mat-icon class="detail-icon">timer</mat-icon>
                        <span>{{formatDuration(recording.duration)}}</span>
                      </div>
                    </div>
                  </div>
                </mat-card-content>

                <mat-card-actions>
                  <button mat-button 
                          color="primary"
                          (click)="downloadRecording(recording)"
                          [disabled]="recording.status !== 'COMPLETED'"
                          matTooltip="下载录制文件">
                    <mat-icon>download</mat-icon>
                    下载
                  </button>
                  
                  <button mat-button 
                          (click)="viewRecordingDetails(recording)"
                          matTooltip="查看详情">
                    <mat-icon>info</mat-icon>
                    详情
                  </button>
                  
                  <button mat-icon-button 
                          [matMenuTriggerFor]="recordingMenu"
                          [matMenuTriggerData]="{recording: recording}"
                          matTooltip="更多操作">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                </mat-card-actions>
              </mat-card>
            </div>

            <!-- 空状态 -->
            <div class="empty-state" *ngIf="!isLoading && recordings.length === 0">
              <mat-icon class="empty-icon">video_library</mat-icon>
              <h3>暂无录制文件</h3>
              <p>开始一个会议并启用录制功能</p>
              <button mat-raised-button color="primary" [routerLink]="['/home']">
                创建会议
              </button>
            </div>

            <!-- 分页器 -->
            <mat-paginator 
              *ngIf="!isLoading && recordings.length > 0"
              [length]="totalElements"
              [pageSize]="pageSize"
              [pageIndex]="currentPage"
              [pageSizeOptions]="[10, 20, 50, 100]"
              (page)="onPageChange($event)"
              showFirstLastButtons>
            </mat-paginator>
          </div>
        </div>
      </div>

      <!-- 录制文件操作菜单 -->
      <mat-menu #recordingMenu="matMenu">
        <ng-template matMenuContent let-recording="recording">
          <button mat-menu-item 
                  (click)="downloadRecording(recording)"
                  [disabled]="recording.status !== 'COMPLETED'">
            <mat-icon>download</mat-icon>
            <span>下载</span>
          </button>
          
          <button mat-menu-item 
                  (click)="copyShareLink(recording)">
            <mat-icon>share</mat-icon>
            <span>复制分享链接</span>
          </button>
          
          <button mat-menu-item 
                  (click)="viewRecordingDetails(recording)">
            <mat-icon>info</mat-icon>
            <span>查看详情</span>
          </button>
          
          <mat-divider></mat-divider>
          
          <button mat-menu-item 
                  class="warn-action"
                  (click)="deleteRecording(recording)">
            <mat-icon>delete</mat-icon>
            <span>删除</span>
          </button>
        </ng-template>
      </mat-menu>
    </div>
  `,
  styles: [`
    .recordings-container {
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

    .main-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    /* 搜索筛选区域 */
    .filters-card {
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .search-form {
      width: 100%;
    }

    .search-row {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
    }

    .search-field {
      flex: 2;
      min-width: 300px;
    }

    .filter-field {
      flex: 1;
      min-width: 150px;
    }

    /* 统计信息 */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .stat-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #2196f3;
    }

    .stat-icon.completed {
      color: #4caf50;
    }

    .stat-icon.processing {
      color: #ff9800;
    }

    .stat-icon.storage {
      color: #9c27b0;
    }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 500;
      color: #333;
    }

    .stat-label {
      font-size: 14px;
      color: #666;
    }

    /* 录制文件网格 */
    .recordings-section {
      margin-top: 24px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 60px 20px;
      color: #666;
    }

    .loading-container p {
      margin-top: 16px;
    }

    .recordings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;
      margin-bottom: 24px;
    }

    .recording-card {
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: box-shadow 0.2s ease, transform 0.2s ease;
      overflow: hidden;
    }

    .recording-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    /* 录制文件缩略图 */
    .recording-thumbnail {
      position: relative;
      height: 180px;
      background: #000;
      overflow: hidden;
    }

    .thumbnail-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .thumbnail-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .thumbnail-placeholder mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
    }

    .status-overlay {
      position: absolute;
      top: 8px;
      left: 8px;
    }

    .duration-overlay {
      position: absolute;
      bottom: 8px;
      right: 8px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    /* 状态样式 */
    .status-completed {
      background: #4caf50 !important;
      color: white !important;
    }

    .status-processing {
      background: #ff9800 !important;
      color: white !important;
    }

    .status-failed {
      background: #f44336 !important;
      color: white !important;
    }

    .status-uploading {
      background: #2196f3 !important;
      color: white !important;
    }

    /* 录制文件信息 */
    .recording-info {
      padding: 16px 0;
    }

    .recording-title {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 500;
      color: #333;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .recording-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #666;
    }

    .detail-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #999;
    }

    /* 空状态 */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      color: #666;
      text-align: center;
    }

    .empty-icon {
      font-size: 80px;
      width: 80px;
      height: 80px;
      color: #ccc;
      margin-bottom: 24px;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      font-weight: 400;
    }

    .empty-state p {
      margin: 0 0 24px 0;
      color: #999;
    }

    /* 菜单样式 */
    .warn-action {
      color: #f44336 !important;
    }

    /* 响应式设计 */
    @media (max-width: 768px) {
      .main-content {
        padding: 16px;
      }

      .search-row {
        flex-direction: column;
        align-items: stretch;
      }

      .search-field, .filter-field {
        flex: none;
        min-width: auto;
      }

      .stats-row {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .recordings-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .stat-content {
        gap: 12px;
      }

      .stat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      .stat-value {
        font-size: 20px;
      }
    }
  `]
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
