import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatChipsModule } from '@angular/material/chips';

/**
 * 响应式设计测试组件
 * 用于测试会议页面在不同分辨率下的显示效果
 */
@Component({
  selector: 'app-responsive-test',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatToolbarModule,
    MatChipsModule
  ],
  template: `
    <div class="responsive-test-container">
      <!-- 顶部工具栏 -->
      <mat-toolbar class="test-toolbar">
        <span>响应式设计测试</span>
        <div class="toolbar-spacer"></div>
        <span class="current-resolution">{{currentResolution}}</span>
      </mat-toolbar>

      <!-- 分辨率信息卡片 -->
      <div class="resolution-info">
        <mat-card class="info-card">
          <mat-card-header>
            <mat-card-title>当前屏幕信息</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="resolution-details">
              <div class="detail-item">
                <strong>屏幕分辨率:</strong> {{screenWidth}} × {{screenHeight}}
              </div>
              <div class="detail-item">
                <strong>窗口大小:</strong> {{windowWidth}} × {{windowHeight}}
              </div>
              <div class="detail-item">
                <strong>设备像素比:</strong> {{devicePixelRatio}}
              </div>
              <div class="detail-item">
                <strong>分辨率类型:</strong> 
                <mat-chip [class]="getResolutionClass()">{{getResolutionType()}}</mat-chip>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- 测试预览区域 -->
      <div class="test-preview">
        <mat-card class="preview-card">
          <mat-card-header>
            <mat-card-title>会议界面预览</mat-card-title>
            <mat-card-subtitle>模拟不同分辨率下的会议页面布局</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <!-- 模拟会议工具栏 -->
            <div class="mock-meeting-toolbar">
              <div class="mock-meeting-info">
                <h3>测试会议室</h3>
                <span class="mock-participant-count">5 人参与</span>
              </div>
              <div class="mock-toolbar-actions">
                <button mat-icon-button><mat-icon>people</mat-icon></button>
                <button mat-icon-button><mat-icon>chat</mat-icon></button>
                <button mat-icon-button><mat-icon>exit_to_app</mat-icon></button>
              </div>
            </div>

            <!-- 模拟视频网格 -->
            <div class="mock-video-grid" [class]="getVideoGridClass()">
              <div class="mock-video-container" *ngFor="let video of mockVideos; trackBy: trackByIndex">
                <div class="mock-video-placeholder">
                  <mat-icon>person</mat-icon>
                  <span>参与者 {{video.id}}</span>
                </div>
                <div class="mock-video-overlay">
                  <span class="mock-participant-name">用户{{video.id}}</span>
                  <div class="mock-controls">
                    <mat-icon [class.muted]="video.muted">{{video.muted ? 'mic_off' : 'mic'}}</mat-icon>
                  </div>
                </div>
              </div>
            </div>

            <!-- 模拟控制栏 -->
            <div class="mock-meeting-controls">
              <div class="mock-controls-group">
                <button mat-fab color="primary"><mat-icon>mic</mat-icon></button>
                <button mat-fab color="primary"><mat-icon>videocam</mat-icon></button>
                <button mat-fab color="primary"><mat-icon>screen_share</mat-icon></button>
                <button mat-fab color="warn"><mat-icon>call_end</mat-icon></button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- 分辨率测试按钮 -->
      <div class="test-controls">
        <mat-card class="controls-card">
          <mat-card-header>
            <mat-card-title>分辨率测试</mat-card-title>
            <mat-card-subtitle>点击按钮模拟不同分辨率的显示效果</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="resolution-buttons">
              <button mat-raised-button 
                      color="primary" 
                      (click)="simulateResolution(3840, 2160)"
                      [class.active]="isActiveResolution(3840, 2160)">
                <mat-icon>4k</mat-icon>
                4K (3840×2160)
              </button>
              <button mat-raised-button 
                      color="primary" 
                      (click)="simulateResolution(2560, 1440)"
                      [class.active]="isActiveResolution(2560, 1440)">
                <mat-icon>hd</mat-icon>
                2K (2560×1440)
              </button>
              <button mat-raised-button 
                      color="primary" 
                      (click)="simulateResolution(1920, 1080)"
                      [class.active]="isActiveResolution(1920, 1080)">
                <mat-icon>hd</mat-icon>
                1K (1920×1080)
              </button>
              <button mat-raised-button 
                      (click)="resetToActual()"
                      [class.active]="!isSimulating">
                <mat-icon>refresh</mat-icon>
                实际分辨率
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .responsive-test-container {
      min-height: 100vh;
      background: #f5f5f5;
      padding-bottom: 20px;
    }

    .test-toolbar {
      background: #1976d2;
      color: white;
      margin-bottom: 20px;
    }

    .toolbar-spacer {
      flex: 1;
    }

    .current-resolution {
      font-family: 'Courier New', monospace;
      background: rgba(255, 255, 255, 0.2);
      padding: 4px 8px;
      border-radius: 4px;
    }

    .resolution-info {
      max-width: 1200px;
      margin: 0 auto 20px;
      padding: 0 16px;
    }

    .info-card {
      margin-bottom: 20px;
    }

    .resolution-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .detail-item {
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }

    .test-preview {
      max-width: 1200px;
      margin: 0 auto 20px;
      padding: 0 16px;
    }

    .preview-card {
      margin-bottom: 20px;
    }

    /* 模拟会议界面样式 */
    .mock-meeting-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .mock-meeting-info h3 {
      margin: 0;
      font-size: 18px;
    }

    .mock-participant-count {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);
    }

    .mock-toolbar-actions {
      display: flex;
      gap: 8px;
    }

    .mock-video-grid {
      display: grid;
      gap: 8px;
      margin-bottom: 16px;
      min-height: 300px;
    }

    .mock-video-container {
      position: relative;
      background: #1a1a1a;
      border-radius: 8px;
      overflow: hidden;
      aspect-ratio: 16/9;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .mock-video-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: white;
      text-align: center;
    }

    .mock-video-placeholder mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 8px;
    }

    .mock-video-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0,0,0,0.8));
      color: white;
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .mock-participant-name {
      font-size: 14px;
      font-weight: 500;
    }

    .mock-controls mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .mock-controls mat-icon.muted {
      color: #f44336;
    }

    .mock-meeting-controls {
      display: flex;
      justify-content: center;
      margin-top: 16px;
    }

    .mock-controls-group {
      display: flex;
      gap: 12px;
      background: rgba(0, 0, 0, 0.7);
      padding: 12px 24px;
      border-radius: 40px;
    }

    .mock-controls-group button {
      width: 48px;
      height: 48px;
    }

    .test-controls {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 16px;
    }

    .controls-card {
      margin-bottom: 20px;
    }

    .resolution-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: center;
    }

    .resolution-buttons button {
      min-width: 160px;
      padding: 12px 16px;
    }

    .resolution-buttons button.active {
      background: #4caf50 !important;
      color: white;
    }

    .resolution-buttons button mat-icon {
      margin-right: 8px;
    }

    /* 不同分辨率的视频网格样式 */
    .video-grid-4k {
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    }

    .video-grid-2k {
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }

    .video-grid-1k {
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    }

    .video-grid-standard {
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }

    /* 分辨率类型芯片样式 */
    .resolution-4k {
      background: #4caf50 !important;
      color: white !important;
    }

    .resolution-2k {
      background: #2196f3 !important;
      color: white !important;
    }

    .resolution-1k {
      background: #ff9800 !important;
      color: white !important;
    }

    .resolution-standard {
      background: #9c27b0 !important;
      color: white !important;
    }

    .resolution-mobile {
      background: #f44336 !important;
      color: white !important;
    }

    /* 响应式设计 */
    @media (max-width: 768px) {
      .resolution-details {
        grid-template-columns: 1fr;
      }

      .resolution-buttons {
        flex-direction: column;
        align-items: center;
      }

      .resolution-buttons button {
        width: 100%;
        max-width: 300px;
      }

      .mock-video-placeholder mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      .mock-controls-group {
        padding: 8px 16px;
        gap: 8px;
      }

      .mock-controls-group button {
        width: 40px;
        height: 40px;
      }
    }
  `]
})
export class ResponsiveTestComponent implements OnInit, OnDestroy {
  screenWidth = 0;
  screenHeight = 0;
  windowWidth = 0;
  windowHeight = 0;
  devicePixelRatio = 1;
  currentResolution = '';
  
  // 模拟状态
  isSimulating = false;
  simulatedWidth = 0;
  simulatedHeight = 0;

  // 模拟视频数据
  mockVideos = [
    { id: 1, muted: false },
    { id: 2, muted: true },
    { id: 3, muted: false },
    { id: 4, muted: false },
    { id: 5, muted: true },
    { id: 6, muted: false }
  ];

  private resizeListener?: () => void;

  ngOnInit(): void {
    this.updateResolutionInfo();
    
    // 创建resize事件监听器
    this.resizeListener = () => {
      if (!this.isSimulating) {
        this.updateResolutionInfo();
      }
    };
    
    // 监听窗口大小变化
    window.addEventListener('resize', this.resizeListener);
  }

  ngOnDestroy(): void {
    // 清理resize事件监听器
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = undefined;
    }
  }

  /**
   * 更新分辨率信息
   */
  private updateResolutionInfo(): void {
    this.screenWidth = screen.width;
    this.screenHeight = screen.height;
    this.windowWidth = window.innerWidth;
    this.windowHeight = window.innerHeight;
    this.devicePixelRatio = window.devicePixelRatio || 1;
    this.currentResolution = `${this.windowWidth} × ${this.windowHeight}`;
  }

  /**
   * 获取分辨率类型
   */
  getResolutionType(): string {
    const width = this.isSimulating ? this.simulatedWidth : this.windowWidth;
    
    if (width >= 3840) return '4K超高清';
    if (width >= 2560) return '2K高清';
    if (width >= 1920) return '1K全高清';
    if (width >= 1366) return '标准桌面';
    if (width >= 768) return '平板';
    return '移动端';
  }

  /**
   * 获取分辨率类型的CSS类
   */
  getResolutionClass(): string {
    const width = this.isSimulating ? this.simulatedWidth : this.windowWidth;
    
    if (width >= 3840) return 'resolution-4k';
    if (width >= 2560) return 'resolution-2k';
    if (width >= 1920) return 'resolution-1k';
    if (width >= 1366) return 'resolution-standard';
    return 'resolution-mobile';
  }

  /**
   * 获取视频网格的CSS类
   */
  getVideoGridClass(): string {
    const width = this.isSimulating ? this.simulatedWidth : this.windowWidth;
    
    if (width >= 3840) return 'video-grid-4k';
    if (width >= 2560) return 'video-grid-2k';
    if (width >= 1920) return 'video-grid-1k';
    return 'video-grid-standard';
  }

  /**
   * 模拟指定分辨率
   */
  simulateResolution(width: number, height: number): void {
    this.isSimulating = true;
    this.simulatedWidth = width;
    this.simulatedHeight = height;
    this.currentResolution = `${width} × ${height} (模拟)`;
  }

  /**
   * 重置为实际分辨率
   */
  resetToActual(): void {
    this.isSimulating = false;
    this.updateResolutionInfo();
  }

  /**
   * 检查是否为当前激活的分辨率
   */
  isActiveResolution(width: number, height: number): boolean {
    return this.isSimulating && 
           this.simulatedWidth === width && 
           this.simulatedHeight === height;
  }

  /**
   * 跟踪函数用于ngFor
   */
  trackByIndex(index: number): number {
    return index;
  }
}