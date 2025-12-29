import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error) => {
      let errorMessage = '发生未知错误';

      if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // 401错误 - 未授权
      if (error.status === 401) {
        errorMessage = '登录已过期，请重新登录';
        authService.logout();
      }
      // 403错误 - 禁止访问
      else if (error.status === 403) {
        errorMessage = '没有权限访问此资源';
      }
      // 404错误 - 资源不存在
      else if (error.status === 404) {
        errorMessage = '请求的资源不存在';
      }
      // 500错误 - 服务器内部错误
      else if (error.status === 500) {
        errorMessage = '服务器内部错误，请稍后重试';
      }
      // 网络错误
      else if (error.status === 0) {
        errorMessage = '网络连接错误，请检查网络设置';
      }

      // 显示错误消息
      snackBar.open(errorMessage, '关闭', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });

      return throwError(() => error);
    })
  );
};
