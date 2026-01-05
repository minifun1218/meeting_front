import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, interval, timeout } from 'rxjs';
import { BehaviorSubject, Observable } from 'rxjs';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

import {LiveKitParticipant, LiveKitService} from '../../../core/services/livekit.service';
import { VideoPresets } from 'livekit-client';
import { ChatService } from '../../../core/services/chat.service';
import { RecordingService } from '../../../core/services/recording.service';
import { AuthService } from '../../../core/services/auth.service';
import { MeetingService } from '../../../core/services/meeting.service';
import { Participant, JoinMeetingRequest } from '../../../core/models/meeting.models';
import { User, UserRole } from '../../../core/models/auth.models';

import { ParticipantsListComponent } from '../participants-list/participants-list.component';
import { ChatPanelComponent } from '../chat-panel/chat-panel.component';
import { VideoGridComponent } from '../video-grid/video-grid.component';
import { InviteDialogComponent } from '../invite-dialog/invite-dialog.component';
import { MobileCompatibilityDialogComponent, MobileCompatibilityData } from '../mobile-compatibility-dialog/mobile-compatibility-dialog.component';

@Component({
  selector: 'app-meeting-room',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatBadgeModule,
    MatTooltipModule,
    ParticipantsListComponent,
    ChatPanelComponent,
    VideoGridComponent
  ],
  templateUrl: './meeting-room.component.html',
  styleUrls: ['./meeting-room.component.scss']
})
export class MeetingRoomComponent implements OnInit, OnDestroy {


  @ViewChild('participantsSidenav') participantsSidenav!: any;
  @ViewChild('chatSidenav') chatSidenav!: any;

  private destroy$ = new Subject<void>();
  private recordingStartTime?: Date;
  private resizeListener?: () => void;

  // 私有属性
  private participantsSubject = new BehaviorSubject<Participant[]>([]);
  public participants$ = this.participantsSubject.asObservable();

  // 公共属性
  roomName!: string;
  currentUser: User | null = null;
  participants: Participant[] = [];
  localParticipant: any = null;

  // UI状态
  showParticipants = false;
  showChat = false;
  isMobile = false;

  // 会议状态
  isAudioEnabled = true;
  isVideoEnabled = true;
  isScreenSharing = false;
  isRecording = false;
  canRecord = false;

  // 聊天相关
  unreadCount = 0;

  constructor (
    private route: ActivatedRoute,
    private router: Router,
    private liveKitService: LiveKitService,
    private chatService: ChatService,
    private recordingService: RecordingService,
    private authService: AuthService,
    private meetingService: MeetingService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {
    this.checkMobile();
  }

  ngOnInit(): void {
    this.roomName = this.route.snapshot.paramMap.get('roomName') || '';

    this.currentUser = this.authService.getCurrentUser();

    // 修复录制权限判断 - 只使用枚举值比较
    this.canRecord = this.currentUser?.role === UserRole.ADMIN ||
                     this.currentUser?.role === UserRole.HOST;

    this.initializeMeeting();
    this.setupSubscriptions();
  }

  ngOnDestroy(): void {
    // 清理resize事件监听器
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = undefined;
    }

    this.destroy$.next();
    this.destroy$.complete();
    this.leaveMeeting();
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth <= 768;

    // 创建resize事件监听器
    this.resizeListener = () => {
      this.isMobile = window.innerWidth <= 768;
      this.cdr.detectChanges();
    };

    // 监听窗口大小变化
    window.addEventListener('resize', this.resizeListener);
  }

  private async initializeMeeting(): Promise<void> {
    try {
      const navigation = this.router.getCurrentNavigation();
      const state = history.state;
      // 如果没有会议参数，尝试重新获取
      if (!state?.['livekitToken'] || !state?.['serverUrl']) {
        console.log('会议参数缺失，尝试重新获取token');
        await this.rejoinMeeting();
        return;
      }

      // 移动端优化的连接选项
      const connectionOptions = this.isMobile ? {
        adaptiveStream: true,
        dynacast: false, // 移动端关闭dynacast以提高兼容性
        videoCaptureDefaults: {
          resolution: { width: 640, height: 480 }, // 移动端使用较低分辨率
          facingMode: 'user' as 'user'
        },
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true
        }
      } : undefined;

      // 连接到LiveKit
      await this.liveKitService.connectToRoom(
        state['serverUrl'],
        state['livekitToken'],
        connectionOptions
      );

      // 通知后端用户加入
      this.chatService.notifyUserJoined(this.roomName).subscribe({
        next: () => console.log('用户加入通知发送成功'),
        error: (error) => console.error('用户加入通知失败:', error)
      });

      this.snackBar.open(
        this.isMobile ? '成功加入会议！' : '成功加入会议！',
        '确定',
        { duration: 3000 }
      );
      this.participants = this.liveKitService.getAllParticipants();
      console.log(this.participants, 'participants');

    } catch (error: any) {
      console.error('初始化会议失败:', error);

      let errorMessage = '加入会议失败，请重试';
      let actionText = '确定';
      let showRetryOption = false;

      // 根据错误类型提供更具体的提示
      if (error instanceof Error) {
        if (error.message.includes('WebRTC') || error.message.includes('ICE') || error.message.includes('网络连接失败')) {
          errorMessage = this.isMobile ?
            '网络连接失败，请尝试：\n1. 切换到WiFi网络\n2. 关闭VPN或代理\n3. 重启浏览器\n4. 使用Chrome浏览器' :
            'WebRTC连接失败，请检查网络设置';
          showRetryOption = this.isMobile;
        } else if (error.message.includes('token') || error.message.includes('令牌')) {
          errorMessage = '会议令牌已过期，请返回首页重新加入';
        } else if (error.message.includes('timeout') || error.message.includes('超时')) {
          errorMessage = this.isMobile ?
            '连接超时，移动网络可能不稳定。请尝试：\n1. 切换到稳定的WiFi\n2. 移动到信号更好的位置\n3. 重新加入会议' :
            '连接超时，请检查网络连接后重试';
          showRetryOption = this.isMobile;
        } else if (error.message.includes('NotAllowedError') || error.message.includes('permission') || error.message.includes('权限')) {
          errorMessage = this.isMobile ?
            '摄像头或麦克风权限被拒绝。请：\n1. 在浏览器地址栏点击摄像头图标\n2. 允许摄像头和麦克风权限\n3. 刷新页面重试' :
            '摄像头或麦克风权限被拒绝，请允许权限后重试';
          actionText = '重新尝试';
          showRetryOption = true;
        } else if (error.message.includes('NotFoundError') || error.message.includes('未找到')) {
          errorMessage = this.isMobile ?
            '未找到摄像头或麦克风设备。请检查：\n1. 设备是否被其他应用占用\n2. 重启浏览器\n3. 检查设备设置' :
            '未找到摄像头或麦克风设备，请检查设备连接';
        } else if (error.message.includes('NotSupportedError') || error.message.includes('不支持')) {
          errorMessage = this.isMobile ?
            '当前浏览器不支持视频通话功能。请：\n1. 使用Chrome、Safari或Firefox浏览器\n2. 更新浏览器到最新版本\n3. 确保使用HTTPS访问' :
            '浏览器不支持WebRTC功能，请使用现代浏览器';
        } else if (error.message.includes('network') || error.message.includes('连接')) {
          errorMessage = this.isMobile ?
            '网络不稳定，建议切换到WiFi网络后重试' :
            '网络连接异常，请检查网络后重试';
          showRetryOption = this.isMobile;
        } else if (error.message.includes('移动端连接失败')) {
          errorMessage = error.message;
          showRetryOption = true;
          actionText = '重新尝试';
        }
      }

      // 显示错误信息
      const snackBarRef = this.snackBar.open(errorMessage, actionText, {
        duration: this.isMobile ? 8000 : 5000,
        panelClass: ['error-snackbar']
      });

      // 如果显示重试选项，处理重试逻辑
      if (showRetryOption) {
        snackBarRef.onAction().subscribe(() => {
          // 重新尝试初始化会议
          this.initializeMeeting().catch(retryError => {
            console.error('重试失败:', retryError);
            // 重试失败后返回首页
            setTimeout(() => {
              this.router.navigate(['/home']);
            }, 1000);
          });
        });
      }

      // 移动端延迟跳转，给用户时间阅读错误信息和选择重试
      const delay = this.isMobile ? (showRetryOption ? 8000 : 5000) : 3000;
      setTimeout(() => {
        if (!showRetryOption) {
          this.router.navigate(['/home']);
        }
      }, delay);
    }
  }

  /**
   * 重新加入会议 - 当会议参数缺失时调用
   */
  private async rejoinMeeting(): Promise<void> {
    if (!this.currentUser) {
      this.snackBar.open('用户信息缺失，请重新登录', '确定');
      this.router.navigate(['/login']);
      return;
    }

    // 移动端兼容性检查
    if (this.isMobile) {
      console.log('重新加入会议前进行移动端兼容性检查...');
      const compatibility = await this.liveKitService.checkMobileBrowserCompatibility();

      if (!compatibility.canProceed) {
        console.error('移动端兼容性检查失败:', compatibility);

        let errorMessage = '移动端浏览器兼容性检查失败，无法重新加入会议：\n';
        compatibility.recommendations.forEach((rec, index) => {
          errorMessage += `${index + 1}. ${rec}\n`;
        });

        this.showMobileCompatibilityDialog(compatibility);

        return;
      }
    }

    // 移动端特殊处理：显示更友好的加载提示
    const loadingMessage = this.isMobile ?
      '正在为您重新连接会议，请稍候...' :
      '正在重新加入会议...';

    const loadingSnackBar = this.snackBar.open(loadingMessage, '', {
      duration: this.isMobile ? 5000 : 2000
    });

    let retryCount = 0;
    const maxRetries = this.isMobile ? 3 : 2; // 移动端增加重试次数

    while (retryCount < maxRetries) {
      try {
        console.log(`尝试重新加入会议 (第${retryCount + 1}次)`);

        const request: JoinMeetingRequest = {
          roomName: this.roomName,
          userId: this.currentUser.id,
          userName: this.currentUser.displayName,
          role: this.currentUser.role === 'admin' ? 'host' : 'participant'
        };

        // 移动端使用更长的超时时间
        const timeoutMs = this.isMobile ? 15000 : 10000;
        const response = await Promise.race([
          this.meetingService.joinMeeting(request).toPromise(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('请求超时')), timeoutMs)
          )
        ]) as any;

        if (!response) {
          throw new Error('获取会议token失败');
        }

        // 移动端使用优化的连接选项
        const connectionOptions = this.isMobile ? {
          adaptiveStream: true,
          dynacast: false, // 移动端关闭dynacast以提高兼容性
          videoCaptureDefaults: {
            resolution: { width: 640, height: 480 }, // 移动端使用较低分辨率
            facingMode: 'user' as 'user'
          },
          audioCaptureDefaults: {
            autoGainControl: true,
            echoCancellation: true,
            noiseSuppression: true
          }
        } : undefined;

        // 连接到LiveKit
        await this.liveKitService.connectToRoom(
          response.serverUrl,
          response.livekitJwt,
          connectionOptions
        );

        // 通知后端用户加入
        this.chatService.notifyUserJoined(this.roomName).subscribe({
          next: () => console.log('用户加入通知发送成功'),
          error: (error) => console.error('用户加入通知失败:', error)
        });

        loadingSnackBar.dismiss();
        this.snackBar.open(
          this.isMobile ? '成功重新连接会议！' : '成功重新加入会议！',
          '确定',
          { duration: 3000 }
        );
        return; // 成功，退出重试循环

      } catch (error) {
        retryCount++;
        console.error(`重新加入会议失败 (第${retryCount}次):`, error);

        // 如果还有重试机会，等待后重试
        if (retryCount < maxRetries) {
          const waitTime = this.isMobile ? 2000 : 1000; // 移动端等待更长时间
          console.log(`等待${waitTime}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        // 所有重试都失败了
        loadingSnackBar.dismiss();

        let errorMessage = '重新加入会议失败，请返回首页重试';

        // 根据错误类型提供更具体的提示
        if (error instanceof Error) {
          if (error.message.includes('超时') || error.message.includes('timeout')) {
            errorMessage = this.isMobile ?
              '网络连接超时，请检查网络后返回首页重试' :
              '连接超时，请返回首页重试';
          } else if (error.message.includes('token') || error.message.includes('令牌')) {
            errorMessage = '会议令牌已过期，请返回首页重新加入';
          } else if (error.message.includes('WebRTC') || error.message.includes('ICE')) {
            errorMessage = this.isMobile ?
              '网络连接问题，建议切换网络后重试' :
              'WebRTC连接失败，请返回首页重试';
          }
        }

        this.snackBar.open(errorMessage, '返回首页', {
          duration: this.isMobile ? 8000 : 5000
        }).onAction().subscribe(() => {
          this.router.navigate(['/home']);
        });

        // 延迟自动跳转，给用户时间阅读错误信息
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, this.isMobile ? 8000 : 5000);

        break; // 退出重试循环
      }
    }
  }

  /**
   * 设置各种订阅监听器，用于监听LiveKit状态、参与者事件、聊天未读消息和录制状态的变化
   */
  private setupSubscriptions(): void {
    // 监听LiveKit状态变化（如音频/视频启用状态、屏幕共享状态等）
    this.liveKitService.state$
      .pipe(takeUntil(this.destroy$)) // 使用takeUntil确保在组件销毁时自动取消订阅
      .subscribe(state => {
        // 更新本地状态变量
        this.isAudioEnabled = state.isAudioEnabled;    // 音频是否启用
        this.isVideoEnabled = state.isVideoEnabled;    // 视频是否启用
        this.isScreenSharing = state.isScreenSharing;  // 是否正在屏幕共享
        this.localParticipant = state.localParticipant; // 本地参与者信息
      });


    // 监听参与者相关事件（如加入、离开、媒体状态改变等）
    this.liveKitService.participantEvents$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        console.log('参与者事件:', event); // 记录事件日志
        this.participants = this.liveKitService.getAllParticipants(); // 更新参与者列表
        console.log(this.participants, '变更完成!');
        this.cdr.detectChanges(); // 触发变更检测
      });

    // 监听聊天未读消息数量变化
    this.chatService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadCount = count; // 更新未读消息数量
        this.cdr.detectChanges(); // 触发变更检测
      });

    // 监听录制状态变化
    this.recordingService.recordingState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.isRecording = state.isRecording; // 更新录制状态
        if (state.startTime) {
          this.recordingStartTime = state.startTime; // 如果有开始时间则更新
        }
        this.cdr.detectChanges(); // 触发变更检测
      });
  }

  /**
   * 切换音频状态（开启/关闭麦克风）
   * @returns Promise<void>
   */
  async toggleAudio(): Promise<void> {
    try {
      // 调用LiveKit服务切换音频状态，并等待结果
      const newState = await this.liveKitService.toggleAudio();

      // 更新组件状态以确保UI与服务状态同步
      this.isAudioEnabled = newState;
      this.cdr.detectChanges(); // 手动触发变更检测以更新视图

      // 显示操作成功提示
      this.snackBar.open(
        newState ? '麦克风已开启' : '麦克风已静音',
        '确定',
        { duration: 2000 } // 提示显示2秒
      );
    } catch (error) {
      // 捕获并记录错误
      console.error('切换音频失败:', error);
      // 显示错误提示
      this.snackBar.open('音频操作失败', '确定');
    }
  }

  /**
   * 切换视频状态（开启/关闭摄像头）
   * @returns Promise<void>
   */
  async toggleVideo(): Promise<void> {
    try {
      // 调用LiveKit服务切换视频状态，并等待结果
      const newState = await this.liveKitService.toggleVideo();

      // 更新组件状态并同步UI
      this.isVideoEnabled = newState;
      this.cdr.detectChanges();

      // 显示操作成功提示
      this.snackBar.open(
        newState ? '摄像头已开启' : '摄像头已关闭',
        '确定',
        { duration: 2000 }
      );
    } catch (error) {
      // 捕获并记录错误
      console.error('切换视频失败:', error);
      // 发生错误时，确保状态设置为关闭
      this.isVideoEnabled = false;
      this.cdr.detectChanges();
      // 只有在发生错误时才进行摄像头诊断
      await this.diagnoseCameraAndShowHelp();
    }
  }

  /**
   * 诊断摄像头问题并显示帮助信息
   */
  async diagnoseCameraAndShowHelp(): Promise<void> {
    try {
      const diagnosis = await this.liveKitService.diagnoseCameraIssues();

      let message = '摄像头无法启用：\n';
      diagnosis.recommendations.forEach((rec, index) => {
        message += `${index + 1}. ${rec}\n`;
      });

      // 如果可以自动修复，提供修复选项
      if (diagnosis.canAutoFix) {
        const snackBarRef = this.snackBar.open(
          '摄像头问题检测完成，是否尝试自动修复？',
          '自动修复',
          { duration: 8000 }
        );

        snackBarRef.onAction().subscribe(async () => {
          const fixed = await this.liveKitService.autoFixCamera();
          if (fixed) {
            this.snackBar.open('摄像头修复成功！', '确定', { duration: 3000 });
          } else {
            this.showDetailedCameraHelp(diagnosis);
          }
        });

        // 如果用户没有点击修复，显示详细帮助
        setTimeout(() => {
          if (snackBarRef) {
            this.showDetailedCameraHelp(diagnosis);
          }
        }, 8000);
      } else {
        this.showDetailedCameraHelp(diagnosis);
      }

    } catch (error) {
      console.error('摄像头诊断失败:', error);
      this.snackBar.open(
        '摄像头诊断失败，请检查浏览器控制台获取更多信息',
        '确定',
        { duration: 5000 }
      );
    }
  }

  /**
   * 显示详细的摄像头帮助信息
   */
  private showDetailedCameraHelp(diagnosis: any): void {
    let helpMessage = '摄像头问题诊断结果：\n\n';

    helpMessage += `浏览器支持: ${diagnosis.browserSupport ? '✓' : '✗'}\n`;
    helpMessage += `HTTPS环境: ${diagnosis.httpsContext ? '✓' : '✗'}\n`;
    helpMessage += `检测到设备: ${diagnosis.hasDevice ? '✓' : '✗'}\n`;
    helpMessage += `设备权限: ${diagnosis.hasPermission ? '✓' : '✗'}\n`;
    helpMessage += `设备可用: ${diagnosis.deviceWorking ? '✓' : '✗'}\n`;

    if (diagnosis.deviceInUse) {
      helpMessage += `设备占用: ✗ (被其他应用占用)\n`;
    }

    helpMessage += '\n解决建议：\n';
    diagnosis.recommendations.forEach((rec: string, index: number) => {
      helpMessage += `${index + 1}. ${rec}\n`;
    });

    // 显示详细的帮助对话框
    alert(helpMessage);
  }

  async toggleScreenShare(): Promise<void> {
    try {
      const newState = await this.liveKitService.toggleScreenShare();

      // 更新组件状态以确保UI同步
      this.isScreenSharing = newState;
      this.cdr.detectChanges();

      this.snackBar.open(
        newState ? '开始屏幕共享' : '停止屏幕共享',
        '确定',
        { duration: 2000 }
      );
    } catch (error) {
      console.error('切换屏幕共享失败:', error);
      // 发生错误时，保持当前状态不变
      this.snackBar.open('屏幕共享操作失败', '确定');
    }
  }

  /**
   * 切换录制状态 - 开始或停止录制
   */
  toggleRecording(): void {
    if (!this.canRecord) {
      this.snackBar.open('您没有录制权限', '确定');
      return;
    }

    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  /**
   * 开始录制
   */
  private async startRecording(): Promise<void> {
    if (!this.currentUser?.id) {
      this.snackBar.open('无法识别当前用户，无法开始录制', '确定', { duration: 3000 });
      return;
    }

    // 检查音视频轨道状态
    const localParticipant = this.liveKitService.getLocalParticipant();
    if (!localParticipant) {
      this.snackBar.open('未连接到会议，无法开始录制', '确定', { duration: 3000 });
      return;
    }

    const hasVideo = localParticipant.isCameraEnabled;
    const hasAudio = localParticipant.isMicrophoneEnabled;

    // 构建确认消息
    let confirmMessage = '确定要开始录制会议吗？录制文件将保存到您的账户中。\n\n';

    if (!hasVideo && !hasAudio) {
      confirmMessage += '⚠️ 检测到您的摄像头和麦克风都已关闭。\n录制需要至少一个音视频源，系统将自动为您启用摄像头和麦克风。';
    } else if (!hasVideo) {
      confirmMessage += '⚠️ 检测到您的摄像头已关闭。\n为确保录制质量，系统将自动为您启用摄像头。';
    } else if (!hasAudio) {
      confirmMessage += '⚠️ 检测到您的麦克风已关闭。\n为确保录制质量，系统将自动为您启用麦克风。';
    }

    // 显示确认对话框
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // 强制启用音视频（如果未启用）
      if (!hasVideo || !hasAudio) {
        this.snackBar.open('正在启用音视频设备...', '', { duration: 2000 });

        if (!hasVideo) {
          console.log('启用摄像头以进行录制...');
          await this.liveKitService.toggleCamera(true);
          this.isVideoEnabled = true;
        }

        if (!hasAudio) {
          console.log('启用麦克风以进行录制...');
          await this.liveKitService.toggleMicrophone(true);
          this.isAudioEnabled = true;
        }

        // 等待轨道发布完成
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('音视频设备启用完成，准备开始录制');
      }

      this.snackBar.open('正在开始录制...', '', { duration: 2000 });

      // 生成录制名称
      const recordingName = `${this.roomName}_${new Date().toISOString().replace(/[:.]/g, '-')}`;
      const userId = this.currentUser.id;
      const format = 'mp4';
      const quality = 'high';

      this.recordingService.startRecording(
        this.roomName,
        userId,
        recordingName,
        format,
        quality
      ).subscribe({
        next: (response) => {
          console.log('录制开始成功:', response);
          this.snackBar.open('🔴 录制已开始', '确定', { duration: 3000 });

          // 通知其他参与者录制已开始
          this.chatService.sendSystemMessage(this.roomName, '会议录制已开始').subscribe({
            next: () => console.log('录制开始通知发送成功'),
            error: (error) => console.error('录制开始通知失败:', error)
          });
        },
        error: (error) => {
          console.error('开始录制失败:', error);
          let errorMessage = '开始录制失败';

          if (error.status === 403) {
            errorMessage = '您没有录制权限';
          } else if (error.status === 409) {
            errorMessage = '会议已在录制中';
          } else if (error.status === 500) {
            errorMessage = '服务器错误，请稍后重试';
          }

          this.snackBar.open(errorMessage, '确定', { duration: 3000 });
        }
      });
    } catch (error) {
      console.error('启用音视频设备失败:', error);
      this.snackBar.open('启用音视频设备失败，无法开始录制', '确定', { duration: 3000 });
    }
  }

  /**
   * 停止录制
   */
  private stopRecording(): void {
    // 显示确认对话框
    const confirmMessage = '确定要停止录制吗？录制文件将自动保存并可在录制管理中查看。';
    if (!confirm(confirmMessage)) {
      return;
    }

    this.snackBar.open('正在停止录制...', '', { duration: 2000 });

    this.recordingService.stopRecording().subscribe({
      next: (response) => {
        console.log('录制停止成功:', response);
        this.snackBar.open('⏹️ 录制已停止，文件正在处理中', '确定', { duration: 3000 });

        // 通知其他参与者录制已停止
        this.chatService.sendSystemMessage(this.roomName, '会议录制已停止').subscribe({
          next: () => console.log('录制停止通知发送成功'),
          error: (error) => console.error('录制停止通知失败:', error)
        });
      },
      error: (error) => {
        console.error('停止录制失败:', error);
        let errorMessage = '停止录制失败';

        if (error.status === 404) {
          errorMessage = '未找到活动的录制会话';
          // 如果服务器说没有录制会话，强制更新本地状态
          this.recordingService.forceStopRecording();
        } else if (error.status === 500) {
          errorMessage = '服务器错误，请稍后重试';
        }

        this.snackBar.open(errorMessage, '确定', { duration: 3000 });
      }
    });
  }

  async takeScreenshot(): Promise<void> {
    try {
      const screenshot = await this.liveKitService.captureScreenshot();
      if (screenshot) {
        // 创建下载链接
        const link = document.createElement('a');
        link.href = screenshot;
        link.download = `screenshot-${this.roomName}-${Date.now()}.png`;
        link.click();

        this.snackBar.open('截图已保存', '确定', { duration: 3000 });
      } else {
        this.snackBar.open('截图失败', '确定');
      }
    } catch (error) {
      console.error('截图失败:', error);
      this.snackBar.open('截图失败', '确定');
    }
  }

  /**
   * 删除房间（仅创建者可删除）
   */
  deleteRoom(): void {
    // 检查是否是房间创建者
    if (!this.isRoomCreator()) {
      this.snackBar.open('只有房间创建者可以删除房间', '确定', { duration: 3000 });
      return;
    }

    // 显示确认对话框
    const confirmMessage = `确定要删除房间 "${this.roomName}" 吗？此操作不可撤销，所有参与者将被移除。`;
    if (!confirm(confirmMessage)) {
      return;
    }

    this.snackBar.open('正在删除房间...', '', { duration: 2000 });

    this.meetingService.deleteRoom(this.roomName).subscribe({
      next: (response) => {
        this.snackBar.open('房间已删除', '确定', { duration: 3000 });
        // 断开连接并返回首页
        this.liveKitService.disconnect();
        this.router.navigate(['/home']);
      },
      error: (error) => {
        console.error('删除房间失败:', error);
        let errorMessage = '删除房间失败';

        if (error.status === 403) {
          errorMessage = '您没有权限删除此房间';
        } else if (error.status === 404) {
          errorMessage = '房间不存在';
        } else if (error.status === 500) {
          errorMessage = '服务器错误，请稍后重试';
        }

        this.snackBar.open(errorMessage, '确定', { duration: 3000 });
      }
    });
  }

  /**
   * 检查当前用户是否是房间创建者
   */
  private isRoomCreator(): boolean {
    return this.currentUser?.role === UserRole.ADMIN ||
           this.currentUser?.role === UserRole.HOST;
  }

  /**
   * 打开邀请对话框
   */
  openInviteDialog(): void {
    const dialogRef = this.dialog.open(InviteDialogComponent, {
      width: '500px',
      data: {
        roomName: this.roomName,
        currentUser: this.currentUser
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('邀请对话框关闭:', result);
      }
    });
  }

  toggleParticipants(): void {
    this.showParticipants = !this.showParticipants;
  }

  toggleChat(): void {
    this.showChat = !this.showChat;
    if (this.showChat) {
      this.chatService.markAsRead();
    }
  }

  formatRecordingTime(): string {
    if (!this.recordingStartTime) return '';

    const elapsed = Date.now() - this.recordingStartTime.getTime();
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  }

  private showMobileCompatibilityDialog(compatibility: any): void {
    const dialogRef = this.dialog.open(MobileCompatibilityDialogComponent, {
      width: '90vw',
      maxWidth: '500px',
      disableClose: true,
      data: {
        browserInfo: compatibility.browserInfo,
        recommendations: compatibility.recommendations,
        canProceed: compatibility.canProceed
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'home') {
        this.router.navigate(['/home']);
      } else if (result === 'retry') {
        // 重新尝试兼容性检查
        window.location.reload();
      }
    });
  }

  async leaveRoom(): Promise<void> {
    await this.leaveMeeting();
  }

  private async leaveMeeting(): Promise<void> {
    try {
      // 通知后端用户离开
      if (this.roomName) {
        this.chatService.notifyUserLeft(this.roomName).subscribe({
          next: () => console.log('用户离开通知发送成功'),
          error: (error) => console.error('用户离开通知失败:', error)
        });
      }

      // 断开LiveKit连接
      await this.liveKitService.disconnectFromRoom();

      // 清理聊天状态
      this.chatService.clearMessages();
      this.setupSubscriptions();
      console.log('成功离开会议，正在跳转到主页...');
      this.router.navigate(['/home']); // 或者你主页的路由路径
      this.snackBar.open('成功离开会议', '关闭', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });

    } catch (error) {
      console.error('离开会议失败:', error);
    }
  }


}
