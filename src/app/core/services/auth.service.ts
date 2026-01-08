import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, User, AuthState, PublicKeyResponse } from '../models/auth.models';
import { environment } from '../../../environments/environment';
import { CryptoUtil } from '../utils/crypto.util';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly AUTH_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private readonly API_URL = environment.apiUrl || 'http://localhost:8080/api';
  private readonly REFRESH_ENDPOINT = `${this.API_URL}/auth/refresh`;

  private authState = signal<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
  });

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const token = localStorage.getItem(this.AUTH_KEY);
    const userStr = localStorage.getItem(this.USER_KEY);

    if (token && userStr && !this.isTokenExpired(token)) {
      try {
        const user = JSON.parse(userStr);
        this.updateAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
        this.currentUserSubject.next(user);
      } catch (error) {
        this.logout();
      }
    }
  }

  // 获取 RSA 公钥和 UUID
  getPublicKey(): Observable<PublicKeyResponse> {
    return this.http.get<PublicKeyResponse>(`${this.API_URL}/auth/public-key`).pipe(
      catchError(error => {
        const errorMessage = error.error?.message || '获取公钥失败';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  // 真实登录 - 连接到后端认证服务
  login(credentials: LoginRequest, publicKey: string, uuid: string): Observable<LoginResponse> {
    this.updateAuthState({ ...this.authState(), isLoading: true, error: null });

    // 使用 RSA + AES 混合加密密码
    const { encryptedPassword, encryptedKey } = CryptoUtil.encryptPassword(
      credentials.password,
      publicKey,
      uuid
    );

    const encryptedCredentials = {
      username: credentials.username,
      password: encryptedPassword,
      encryptedKey: encryptedKey,
      uuid: uuid
    };

    return this.http.post<LoginResponse>(`${this.API_URL}/auth/login`, encryptedCredentials).pipe(
      tap(response => {
        this.handleLoginSuccess(response);
      }),
      catchError(error => {
        const errorMessage = error.error?.message || '登录失败，请检查用户名和密码';
        this.updateAuthState({
          ...this.authState(),
          isLoading: false,
          error: errorMessage
        });
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  // 用户注册
  register(registerData: RegisterRequest, publicKey: string, uuid: string): Observable<RegisterResponse> {
    this.updateAuthState({ ...this.authState(), isLoading: true, error: null });

    // 使用 RSA + AES 混合加密密码
    const { encryptedPassword, encryptedKey } = CryptoUtil.encryptPassword(
      registerData.password,
      publicKey,
      uuid
    );

    const encryptedRegisterData = {
      username: registerData.username,
      email: registerData.email,
      displayName: registerData.displayName,
      role: registerData.role,
      password: encryptedPassword,
      encryptedKey: encryptedKey,
      uuid: uuid
    };

    return this.http.post<RegisterResponse>(`${this.API_URL}/auth/register`, encryptedRegisterData).pipe(
      tap(response => {
        this.updateAuthState({ ...this.authState(), isLoading: false, error: null });
      }),
      catchError(error => {
        const errorMessage = error.error?.message || '注册失败，请稍后重试';
        this.updateAuthState({
          ...this.authState(),
          isLoading: false,
          error: errorMessage
        });
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  private handleLoginSuccess(response: LoginResponse): void {
    localStorage.setItem(this.AUTH_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
    
    this.updateAuthState({
      user: response.user,
      token: response.token,
      isAuthenticated: true,
      isLoading: false,
      error: null
    });
    
    this.currentUserSubject.next(response.user);
  }

  logout(): void {
    localStorage.removeItem(this.AUTH_KEY);
    localStorage.removeItem(this.USER_KEY);
    
    this.updateAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
    
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.authState().token;
  }

  getCurrentUser(): User | null {
    return this.authState().user;
  }

  isAuthenticated(): boolean {
    return this.authState().isAuthenticated;
  }

  getAuthState(): AuthState {
    return this.authState();
  }

  private updateAuthState(newState: AuthState): void {
    this.authState.set(newState);
  }

  // 检查token是否过期
  isTokenExpired(token?: string): boolean {
    const activeToken = token ?? this.getToken() ?? undefined;
    if (!activeToken) return true;
    
    try {
      const payload = this.decodeTokenPayload(activeToken);
      const exp = payload?.['exp'];
      if (!exp) {
        return true;
      }
      const currentTime = Math.floor(Date.now() / 1000);
      return exp <= currentTime;
    } catch {
      return true;
    }
  }

  // 刷新token
  refreshToken(): Observable<LoginResponse> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('当前没有可刷新token'));
    }

    return this.http.post<LoginResponse>(this.REFRESH_ENDPOINT, { token }).pipe(
      tap(response => this.handleLoginSuccess(response)),
      catchError(error => {
        const errorMessage = error.error?.message || '刷新登录状态失败，请重新登录';
        this.logout();
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  private decodeTokenPayload(token: string): Record<string, any> | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    try {
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(payload);
      const json = decodeURIComponent(
        decoded
          .split('')
          .map(char => `%${('00' + char.charCodeAt(0).toString(16)).slice(-2)}`)
          .join('')
      );
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}
