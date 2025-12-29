import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { LoginRequest, LoginResponse, User, AuthState } from '../models/auth.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly AUTH_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  
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
    
    if (token && userStr) {
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

  // 模拟登录 - 在实际应用中应该连接到真实的认证服务
  login(credentials: LoginRequest): Observable<LoginResponse> {
    this.updateAuthState({ ...this.authState(), isLoading: true, error: null });

    // 模拟API调用
    return of({
      token: 'mock-jwt-token-' + Date.now(),
      user: {
        id: 'user-' + Date.now(),
        username: credentials.username,
        email: credentials.username + '@example.com',
        displayName: credentials.username,
        role: credentials.username === 'admin' ? 'admin' as any : 'participant' as any,
        createdAt: new Date(),
        lastLoginAt: new Date()
      },
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24小时后过期
    }).pipe(
      tap(response => {
        this.handleLoginSuccess(response);
      }),
      catchError(error => {
        this.updateAuthState({ 
          ...this.authState(), 
          isLoading: false, 
          error: '登录失败：' + error.message 
        });
        throw error;
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
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    
    try {
      // 在实际应用中，应该解析JWT token来检查过期时间
      // 这里简单模拟
      return false;
    } catch {
      return true;
    }
  }

  // 刷新token
  refreshToken(): Observable<LoginResponse> {
    // 在实际应用中实现token刷新逻辑
    return of({} as LoginResponse);
  }
}
