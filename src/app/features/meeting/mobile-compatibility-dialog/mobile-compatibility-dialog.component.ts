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
  templateUrl: './mobile-compatibility-dialog.component.html',
  styleUrls: ['./mobile-compatibility-dialog.component.scss']
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