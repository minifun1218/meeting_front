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
  templateUrl: './responsive-test.component.html',
  styleUrls: ['./responsive-test.component.scss']
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