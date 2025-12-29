import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <div class="app-container full-height">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      flex-direction: column;
      background: #f5f5f5;
    }
  `]
})
export class AppComponent {
  title = ' - 视频会议系统';
}
