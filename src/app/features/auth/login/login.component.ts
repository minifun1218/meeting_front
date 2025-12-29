import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../../core/services/auth.service';
import { LoginRequest } from '../../../core/models/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="login-container full-height flex-center">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title class="text-center">
            <mat-icon class="title-icon">video_call</mat-icon>
            <h2></h2>
            <p class="subtitle">视频会议系统</p>
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="form-container">
            <mat-form-field class="form-field" appearance="outline">
              <mat-label>用户名</mat-label>
              <input matInput 
                     formControlName="username" 
                     placeholder="请输入用户名"
                     autocomplete="username">
              <mat-icon matSuffix>person</mat-icon>
              <mat-error *ngIf="loginForm.get('username')?.hasError('required')">
                用户名不能为空
              </mat-error>
            </mat-form-field>

            <mat-form-field class="form-field" appearance="outline">
              <mat-label>密码</mat-label>
              <input matInput 
                     [type]="hidePassword ? 'password' : 'text'"
                     formControlName="password" 
                     placeholder="请输入密码"
                     autocomplete="current-password">
              <button mat-icon-button matSuffix 
                      type="button"
                      (click)="hidePassword = !hidePassword">
                <mat-icon>{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
              </button>
              <mat-error *ngIf="loginForm.get('password')?.hasError('required')">
                密码不能为空
              </mat-error>
              <mat-error *ngIf="loginForm.get('password')?.hasError('minlength')">
                密码至少6位
              </mat-error>
            </mat-form-field>

            <button mat-raised-button 
                    color="primary" 
                    type="submit"
                    class="login-button full-width"
                    [disabled]="loginForm.invalid || isLoading">
              <mat-spinner *ngIf="isLoading" diameter="20" class="mr-2"></mat-spinner>
              {{isLoading ? '登录中...' : '登录'}}
            </button>
          </form>
        </mat-card-content>
        
        <mat-card-actions>
          <div class="demo-info">
            <p class="text-center">演示账号：</p>
            <div class="demo-accounts">
              <button mat-button (click)="fillDemoAccount('admin')">管理员</button>
              <button mat-button (click)="fillDemoAccount('teacher')">教师</button>
              <button mat-button (click)="fillDemoAccount('student')">学生</button>
            </div>
          </div>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .login-card {
      max-width: 400px;
      width: 100%;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      border-radius: 16px;
    }

    .title-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #2196f3;
      margin-bottom: 16px;
    }

    .subtitle {
      color: #666;
      font-size: 14px;
      margin: 0;
    }

    .form-container {
      padding: 16px 0;
    }

    .form-field {
      width: 100%;
      margin-bottom: 16px;
    }

    .login-button {
      height: 48px;
      margin-top: 16px;
      border-radius: 24px;
    }

    .demo-info {
      width: 100%;
      text-align: center;
      margin-top: 16px;
    }

    .demo-info p {
      color: #666;
      font-size: 12px;
      margin-bottom: 8px;
    }

    .demo-accounts {
      display: flex;
      justify-content: space-around;
      gap: 8px;
    }

    .demo-accounts button {
      font-size: 12px;
      min-width: 60px;
    }

    .mr-2 {
      margin-right: 8px;
    }

    @media (max-width: 480px) {
      .login-card {
        margin: 0;
        max-width: none;
        width: 100%;
        box-shadow: none;
        border-radius: 0;
      }
      
      .login-container {
        padding: 0;
      }
    }
  `]
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  hidePassword = true;
  isLoading = false;
  returnUrl = '/home';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    // 获取重定向URL
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
    
    // 如果已经登录，直接跳转
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }
  }

  private createForm(): void {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    const credentials: LoginRequest = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.snackBar.open(`欢迎回来，${response.user.displayName}!`, '关闭', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
        this.router.navigate([this.returnUrl]);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('登录失败:', error);
      }
    });
  }

  fillDemoAccount(type: 'admin' | 'teacher' | 'student'): void {
    const accounts = {
      admin: { username: 'admin', password: 'admin123' },
      teacher: { username: 'teacher', password: 'teacher123' },
      student: { username: 'student', password: 'student123' }
    };

    const account = accounts[type];
    this.loginForm.patchValue(account);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }
}
