import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { Router } from '@angular/router';

export interface MobileCompatibilityData {
  browserInfo: {
    name: string;
    version: string;
    isSupported: boolean;
  };
  recommendations: string[];
  canRetry: boolean;
}

@Component({
  selector: 'app-mobile-compatibility-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatListModule
  ],
  template: `
    <div class="compatibility-dialog">
      <div class="dialog-header">
        <mat-icon class="warning-icon">warning</mat-icon>
        <h2 mat-dialog-title>移动端浏览器兼容性问题</h2>
      </div>
      
      <mat-dialog-content class="dialog-content">
        <div class="browser-info">
          <div class="browser-details">
            <mat-icon>{{getBrowserIcon()}}</mat-icon>
            <div class="browser-text">
              <span class="browser-name">{{data.browserInfo.name}} {{data.browserInfo.version}}</span>
              <span class="support-status" [class.unsupported]="!data.browserInfo.isSupported">
                {{data.browserInfo.isSupported ? '版本支持' : '版本过低'}}
              </span>
            </div>
          </div>
        </div>

        <div class="recommendations">
          <h3>建议解决方案：</h3>
          <mat-list>
            <mat-list-item *ngFor="let recommendation of data.recommendations; let i = index">
              <mat-icon matListItemIcon>{{getRecommendationIcon(i)}}</mat-icon>
              <div matListItemTitle>{{recommendation}}</div>
            </mat-list-item>
          </mat-list>
        </div>

        <div class="additional-tips">
          <div class="tip-item">
            <mat-icon>info</mat-icon>
            <span>如果问题持续存在，请尝试使用桌面版浏览器</span>
          </div>
          <div class="tip-item">
            <mat-icon>wifi</mat-icon>
            <span>建议在稳定的WiFi网络环境下使用</span>
          </div>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="goHome()" class="secondary-button">
          <mat-icon>home</mat-icon>
          返回首页
        </button>
        <button *ngIf="data.canRetry" 
                mat-raised-button 
                color="primary" 
                (click)="retry()"
                class="primary-button">
          <mat-icon>refresh</mat-icon>
          重新尝试
        </button>
        <button *ngIf="!data.canRetry" 
                mat-raised-button 
                color="primary" 
                (click)="goHome()"
                class="primary-button">
          <mat-icon>arrow_forward</mat-icon>
          继续使用
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .compatibility-dialog {
      max-width: 500px;
      width: 90vw;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 24px 0;
      color: #ff9800;
    }

    .warning-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }

    .dialog-content {
      padding: 16px 24px;
    }

    .browser-info {
      background: rgba(255, 152, 0, 0.1);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }

    .browser-details {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .browser-details mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: #666;
    }

    .browser-text {
      display: flex;
      flex-direction: column;
    }

    .browser-name {
      font-weight: 500;
      font-size: 16px;
    }

    .support-status {
      font-size: 12px;
      color: #4caf50;
    }

    .support-status.unsupported {
      color: #f44336;
    }

    .recommendations {
      margin-bottom: 20px;
    }

    .recommendations h3 {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 500;
      color: #333;
    }

    .recommendations mat-list {
      padding: 0;
    }

    .recommendations mat-list-item {
      height: auto;
      min-height: 48px;
      padding: 8px 0;
    }

    .recommendations mat-icon {
      color: #2196f3;
      margin-right: 8px;
    }

    .additional-tips {
      background: rgba(33, 150, 243, 0.1);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .tip-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 14px;
      color: #666;
    }

    .tip-item:last-child {
      margin-bottom: 0;
    }

    .tip-item mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #2196f3;
    }

    .dialog-actions {
      padding: 16px 24px;
      gap: 12px;
      justify-content: flex-end;
    }

    .secondary-button {
      color: #666;
    }

    .primary-button {
      min-width: 120px;
    }

    .primary-button mat-icon,
    .secondary-button mat-icon {
      margin-right: 8px;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    @media (max-width: 480px) {
      .compatibility-dialog {
        width: 95vw;
      }
      
      .dialog-header {
        padding: 12px 16px 0;
      }
      
      .dialog-content {
        padding: 12px 16px;
      }
      
      .dialog-actions {
        padding: 12px 16px;
        flex-direction: column;
      }
      
      .dialog-actions button {
        width: 100%;
        margin: 4px 0;
      }
    }
  `]
})
export class MobileCompatibilityDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<MobileCompatibilityDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MobileCompatibilityData,
    private router: Router
  ) {}

  getBrowserIcon(): string {
    const browserName = this.data.browserInfo.name.toLowerCase();
    if (browserName.includes('chrome')) return 'web';
    if (browserName.includes('safari')) return 'web';
    if (browserName.includes('firefox')) return 'web';
    if (browserName.includes('edge')) return 'web';
    return 'web_asset';
  }

  getRecommendationIcon(index: number): string {
    const icons = ['update', 'web', 'clear_all', 'refresh', 'settings', 'security'];
    return icons[index % icons.length];
  }

  retry(): void {
    this.dialogRef.close('retry');
  }

  goHome(): void {
    this.dialogRef.close('home');
    this.router.navigate(['/home']);
  }
}