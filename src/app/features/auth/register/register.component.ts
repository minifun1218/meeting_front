import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../../core/services/auth.service';
import { RegisterRequest, UserRole, PublicKeyResponse } from '../../../core/models/auth.models';

@Component({
  selector: 'app-register',
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
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  hidePassword = true;
  hideConfirmPassword = true;
  isLoading = false;
  publicKeyData: PublicKeyResponse | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
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
    this.registerForm = this.fb.group({
      username: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(20),
        Validators.pattern(/^[a-zA-Z0-9_]+$/)
      ]],
      email: ['', [
        Validators.required,
        Validators.email
      ]],
      displayName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(50),
        this.passwordStrengthValidator
      ]],
      confirmPassword: ['', [Validators.required]],
      role: [UserRole.PARTICIPANT]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) {
      return null;
    }

    const hasNumber = /[0-9]/.test(value);
    const hasLetter = /[a-zA-Z]/.test(value);
    const isValid = hasNumber && hasLetter;

    return isValid ? null : { weakPassword: true };
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
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
    const { username, email, password, displayName, role } = this.registerForm.value;
    const registerData: RegisterRequest = {
      username,
      email,
      password,
      displayName,
      role
    };

    this.authService.register(
      registerData,
      this.publicKeyData.publicKey,
      this.publicKeyData.uuid
    ).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.snackBar.open('注册成功！请登录', '关闭', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.isLoading = false;

        // 保存表单数据（不保存密码）
        this.saveFormData();

        // 显示错误提示
        this.snackBar.open(error.message || '注册失败，页面即将刷新', '关闭', {
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

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  getPasswordErrorMessage(): string {
    const passwordControl = this.registerForm.get('password');
    if (passwordControl?.hasError('required')) {
      return '密码不能为空';
    }
    if (passwordControl?.hasError('minlength')) {
      return '密码至少6位';
    }
    if (passwordControl?.hasError('weakPassword')) {
      return '密码必须包含字母和数字';
    }
    return '';
  }

  /**
   * 保存表单数据到 sessionStorage（不保存密码）
   */
  private saveFormData(): void {
    const formData = {
      username: this.registerForm.get('username')?.value || '',
      email: this.registerForm.get('email')?.value || '',
      displayName: this.registerForm.get('displayName')?.value || '',
      role: this.registerForm.get('role')?.value || 'PARTICIPANT'
    };
    sessionStorage.setItem('registerFormData', JSON.stringify(formData));
  }

  /**
   * 从 sessionStorage 恢复表单数据
   */
  private restoreFormData(): void {
    const savedData = sessionStorage.getItem('registerFormData');
    if (savedData) {
      try {
        const formData = JSON.parse(savedData);
        this.registerForm.patchValue(formData);
        // 恢复后清除保存的数据
        sessionStorage.removeItem('registerFormData');
      } catch (error) {
        console.error('恢复表单数据失败:', error);
      }
    }
  }
}
