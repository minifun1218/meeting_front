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
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../../core/services/auth.service';
import { LoginRequest, PublicKeyResponse } from '../../../core/models/auth.models';

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
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  hidePassword = true;
  isLoading = false;
  returnUrl = '/home';
  publicKeyData: PublicKeyResponse | null = null;

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
      return;
    }

    // 恢复保存的表单数据
    this.restoreFormData();

    // 获取公钥和 UUID
    this.authService.getPublicKey().subscribe({
      next: (data) => {
        this.publicKeyData = data;
      },
      error: (error) => {
        this.snackBar.open('获取加密密钥失败，请刷新页面重试', '关闭', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
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

    // 检查是否已获取公钥
    if (!this.publicKeyData) {
      this.snackBar.open('加密密钥未就绪，请稍后重试', '关闭', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.isLoading = true;
    const credentials: LoginRequest = this.loginForm.value;

    this.authService.login(
      credentials,
      this.publicKeyData.publicKey,
      this.publicKeyData.uuid
    ).subscribe({
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

        // 保存表单数据
        this.saveFormData();

        // 显示错误提示
        this.snackBar.open(error.message || '登录失败，页面即将刷新', '关闭', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });

        // 3秒后自动刷新页面
        setTimeout(() => {
          window.location.reload();
        }, 3000);
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

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  /**
   * 保存表单数据到 sessionStorage
   */
  private saveFormData(): void {
    const formData = {
      username: this.loginForm.get('username')?.value || '',
      password: this.loginForm.get('password')?.value || ''
    };
    sessionStorage.setItem('loginFormData', JSON.stringify(formData));
  }

  /**
   * 从 sessionStorage 恢复表单数据
   */
  private restoreFormData(): void {
    const savedData = sessionStorage.getItem('loginFormData');
    if (savedData) {
      try {
        const formData = JSON.parse(savedData);
        this.loginForm.patchValue(formData);
        // 恢复后清除保存的数据
        sessionStorage.removeItem('loginFormData');
      } catch (error) {
        console.error('恢复表单数据失败:', error);
      }
    }
  }
}
