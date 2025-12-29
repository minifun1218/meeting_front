import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  LocalParticipant,
  Track,
  RemoteTrack,
  RemoteTrackPublication,
  LocalTrackPublication,
  VideoPresets,
  AudioPresets,
  TrackPublication,
  Participant,
  ParticipantEvent,
  RoomOptions,
  VideoCaptureOptions,
  ScreenSharePresets,
  LocalVideoTrack,
  LocalAudioTrack,
  createLocalVideoTrack,
  createLocalAudioTrack,
  createLocalScreenTracks
} from 'livekit-client';
import { environment } from '../../../environments/environment';

export interface LiveKitParticipant {
  identity: string;
  name: string;
  isLocal: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenShareEnabled: boolean;
  videoTrack?: RemoteTrack | LocalVideoTrack;
  audioTrack?: RemoteTrack | LocalAudioTrack;
  screenTrack?: RemoteTrack | LocalVideoTrack;
}

export interface ConnectionState {
  connected: boolean;
  connecting: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LiveKitService {
  private room: Room | null = null;
  private localParticipant: LocalParticipant | null = null;

  // 状态管理
  private connectionStateSubject = new BehaviorSubject<ConnectionState>({
    connected: false,
    connecting: false
  });
  public connectionState$ = this.connectionStateSubject.asObservable();

  private participantsSubject = new BehaviorSubject<LiveKitParticipant[]>([]);
  public participants$ = this.participantsSubject.asObservable();

  private localTracksSubject = new BehaviorSubject<{
    video?: LocalVideoTrack;
    audio?: LocalAudioTrack;
    screen?: LocalVideoTrack;
  }>({});
  public localTracks$ = this.localTracksSubject.asObservable();

  // 事件流
  private participantConnectedSubject = new Subject<RemoteParticipant>();
  public participantConnected$ = this.participantConnectedSubject.asObservable();

  private participantDisconnectedSubject = new Subject<RemoteParticipant>();
  public participantDisconnected$ = this.participantDisconnectedSubject.asObservable();

  private trackSubscribedSubject = new Subject<{ track: RemoteTrack; publication: RemoteTrackPublication; participant: RemoteParticipant }>();
  public trackSubscribed$ = this.trackSubscribedSubject.asObservable();

  private trackUnsubscribedSubject = new Subject<{ track: RemoteTrack; publication: RemoteTrackPublication; participant: RemoteParticipant }>();
  public trackUnsubscribed$ = this.trackUnsubscribedSubject.asObservable();

  // 状态流 - 用于MeetingRoomComponent
  private stateSubject = new BehaviorSubject<{
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;
    localParticipant: LocalParticipant | null;
  }>({
    isAudioEnabled: true,
    isVideoEnabled: true,
    isScreenSharing: false,
    localParticipant: null
  });
  public state$ = this.stateSubject.asObservable();

  // 参与者事件流
  private participantEventsSubject = new Subject<any>();
  public participantEvents$ = this.participantEventsSubject.asObservable();

  constructor() {}

  /**
   * 连接到LiveKit房间 (别名方法)
   */
  async connectToRoom(serverUrl: string, token: string, options?: RoomOptions): Promise<void> {
    return this.connect(serverUrl, token, options);
  }

  /**
   * 连接到LiveKit房间
   */
  async connect(serverUrl: string, token: string, options?: RoomOptions): Promise<void> {
    try {
      this.updateConnectionState({ connected: false, connecting: true });

      // 创建房间实例
      this.room = new Room(options);

      this.setupRoomEventListeners();

      // 连接到房间
      await this.room.connect(serverUrl, token);

      this.localParticipant = this.room.localParticipant;

      this.updateConnectionState({ connected: true, connecting: false });

      // 更新状态
      this.updateState();

      // 更新参与者列表
      this.updateParticipantsList();
    } catch (error) {
      console.error('连接LiveKit房间失败:', error);
      this.updateConnectionState({
        connected: false,
        connecting: false,
        error: error instanceof Error ? error.message : '连接失败'
      });
      throw error;
    }
  }

  /**
   * 断开连接 (别名方法)
   */
  async disconnectFromRoom(): Promise<void> {
    return this.disconnect();
  }

  /**
   * 离开会议 (别名方法)
   */
  async leaveMeeting(): Promise<void> {
    return this.disconnect();
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
      this.localParticipant = null;
    }

    this.updateConnectionState({ connected: false, connecting: false });
      this.participantsSubject.next([]);
      this.localTracksSubject.next({});
      this.updateState();
  }

  /**
   * 启用/禁用视频 (别名方法)
   */
  async toggleVideo(enabled?: boolean): Promise<boolean> {
    return this.toggleCamera(enabled);
  }

  /*
   * 启用/禁用摄像头
   * @param enabled 可选参数，如果为 true 则启用，为 false 则禁用；如果省略则切换当前状态。
   * @returns 返回一个 Promise，解析为摄像头的新状态（true 表示启用，false 表示禁用）。
   */
  async toggleCamera(enabled?: boolean): Promise<boolean> {
    // 检查是否已连接到房间
    if (!this.localParticipant) {
      throw new Error('未连接到房间');
    }

    try {
      // 如果没有指定 enabled，则切换当前摄像头状态
      if (enabled === undefined) {
        enabled = !this.localParticipant.isCameraEnabled;
      }

      if (enabled) {
        // 启用摄像头
        // 创建一个本地视频轨道，并设置分辨率和面对模式
        const videoTrack = await createLocalVideoTrack({
          resolution: VideoPresets.h720.resolution,
          facingMode: 'user'
        });
        // // 发布新创建的视频轨道到房间
        // await this.localParticipant.publishTrack(videoTrack);
        //
        // // 手动更新本地轨道的状态，以便其他地方可以访问
        // const currentTracks = this.localTracksSubject.value;
        // this.localTracksSubject.next({ ...currentTracks, video: videoTrack });
        await this.localParticipant.publishTrack(videoTrack);
      } else {
        // 禁用摄像头
        // 使用 LiveKit SDK 方法禁用摄像头，这会自动取消发布并静音轨道
        await this.localParticipant.setCameraEnabled(false);

        // 手动更新本地轨道的状态
        const currentTracks = this.localTracksSubject.value;
        this.localTracksSubject.next({ ...currentTracks, video: undefined });
      }

      // 更新参与者列表和房间状态，以确保所有订阅者都能获得最新信息
      this.updateParticipantsList();
      this.updateState();
      return enabled; // 返回新状态
    } catch (error) {
      // 捕获并处理所有可能发生的错误，例如权限被拒绝
      console.error('切换摄像头状态失败:', error);
      // 重新抛出错误，以便调用者可以处理
      throw error;
    }
  }

  /**
   * 启用/禁用音频 (别名方法)
   */
  async toggleAudio(enabled?: boolean): Promise<boolean> {
    return this.toggleMicrophone(enabled);
  }

  /**
   * 启用/禁用麦克风
   */
  /**
   * 启用/禁用麦克风
   * @param enabled 可选参数，如果为 true 则启用，为 false 则禁用；如果省略则切换当前状态
   * @returns 返回一个Promise，解析为麦克风的新状态（true 表示启用，false 表示禁用）
   */
  async toggleMicrophone(enabled?: boolean): Promise<boolean> {
    // 检查是否已连接到房间
    if (!this.localParticipant) {
      throw new Error('未连接到房间');
    }

    try {
      // 如果没有指定 enabled，则切换当前麦克风状态
      if (enabled === undefined) {
        enabled = !this.localParticipant.isMicrophoneEnabled;
      }

      if (enabled) {
        // 启用麦克风
        const audioTrack = await createLocalAudioTrack({
          deviceId: undefined, // 自动选择默认设备
          ...AudioPresets.music // 应用预设的音频质量
        });
        // 发布新创建的音频轨道到房间
        await this.localParticipant.publishTrack(audioTrack);

        // 手动更新本地轨道的状态，以便其他地方可以访问
        const currentTracks = this.localTracksSubject.value;
        this.localTracksSubject.next({ ...currentTracks, audio: audioTrack });
      } else {
        // 禁用麦克风
        // 使用 LiveKit SDK 方法禁用麦克风，这会自动取消发布并静音轨道
        await this.localParticipant.setMicrophoneEnabled(false);

        // 手动更新本地轨道的状态
        const currentTracks = this.localTracksSubject.value;
        this.localTracksSubject.next({ ...currentTracks, audio: undefined });
      }

      // 更新参与者列表和房间状态，以确保所有订阅者都能获得最新信息
      this.updateParticipantsList();
      this.updateState();
      return enabled; // 返回新状态
    } catch (error) {
      // 捕获并处理所有可能发生的错误，例如权限被拒绝
      console.error('切换麦克风状态失败:', error);
      // 重新抛出错误，以便调用者可以处理
      throw error;
    }
  }

  /**
   * 开始/停止屏幕共享
   */
  async toggleScreenShare(enabled?: boolean): Promise<boolean> {
    if (!this.localParticipant) {
      throw new Error('未连接到房间');
    }

    try {
      if (enabled === undefined) {
        enabled = !this.localParticipant.isScreenShareEnabled;
      }

      if (enabled) {
        const screenTracks = await createLocalScreenTracks({
          resolution: ScreenSharePresets.h1080fps30.resolution,
          audio: true
        });

        for (const track of screenTracks) {
          await this.localParticipant.publishTrack(track);
          if (track.kind === Track.Kind.Video) {
            const currentTracks = this.localTracksSubject.value;
            this.localTracksSubject.next({ ...currentTracks, screen: track as LocalVideoTrack });
          }
        }
      } else {
        await this.localParticipant.setScreenShareEnabled(false);

        const currentTracks = this.localTracksSubject.value;
        this.localTracksSubject.next({ ...currentTracks, screen: undefined });
      }

      this.updateParticipantsList();
      this.updateState();
      return enabled;
    } catch (error) {
      console.error('切换屏幕共享状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前房间实例
   */
  getRoom(): Room | null {
    return this.room;
  }

  /**
   * 获取本地参与者
   */
  getLocalParticipant(): LocalParticipant | null {
    return this.localParticipant;
  }

  /**
   * 获取远程参与者列表
   */
  getRemoteParticipants(): RemoteParticipant[] {
    return this.room ? Array.from(this.room.remoteParticipants.values()) : [];
  }

  /**
   * 获取所有参与者列表 (包括本地和远程)
   */
  // livekit.service.ts

  /**
   * 获取所有参与者列表 (包括本地和远程)
   */
  getAllParticipants(): any[] {
    // 1. 确保房间实例存在
    if (!this.room) {
      // 如果房间不存在，返回一个空数组
      return [];
    }

    // 2. 从 LiveKit SDK 获取所有参与者的原始对象
    const allLiveKitParticipants = [
      this.room.localParticipant,
      ...Array.from(this.room.remoteParticipants.values())
    ];

    // 3. 将原始对象映射为你需要的 LiveKitParticipant 接口
    return allLiveKitParticipants.map(p => ({
      identity: p.identity,
      name: p.name,
      isLocal: p.isLocal,
      // 从 LiveKit SDK 的原始对象中获取属性
      audioEnabled: p.isMicrophoneEnabled,
      videoEnabled: p.isCameraEnabled,
      screenShareEnabled: p.isScreenShareEnabled,
      // 注意: 原始 LiveKit Participant 对象没有 LiveKitParticipant 接口中的其他属性
    }));
  }

  /**
   * 设置房间事件监听器
   */
  private setupRoomEventListeners(): void {
    if (!this.room) return;

    // 参与者连接
    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('参与者连接:', participant.identity);
      this.participantConnectedSubject.next(participant);
      this.participantEventsSubject.next({ type: 'connected', participant });
      this.updateParticipantsList();
      this.setupParticipantEventListeners(participant);
    });

    // 参与者断开连接
    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('参与者断开连接:', participant.identity);
      this.participantDisconnectedSubject.next(participant);
      this.participantEventsSubject.next({ type: 'disconnected', participant });
      this.updateParticipantsList();
    });

    // 轨道订阅
    this.room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      console.log('轨道订阅:', track.kind, participant.identity);
      this.trackSubscribedSubject.next({ track, publication, participant });
      this.updateParticipantsList();
    });

    // 轨道取消订阅
    this.room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      console.log('轨道取消订阅:', track.kind, participant.identity);
      this.trackUnsubscribedSubject.next({ track, publication, participant });
      this.updateParticipantsList();
    });

    // 连接断开
    this.room.on(RoomEvent.Disconnected, (reason?: any) => {
      console.log('房间连接断开:', reason);
      this.updateConnectionState({
        connected: false,
        connecting: false,
        error: typeof reason === 'string' ? reason : reason?.toString()
      });
    });

    // 连接重新建立
    this.room.on(RoomEvent.Reconnected, () => {
      console.log('房间连接重新建立');
      this.updateConnectionState({ connected: true, connecting: false });
    });

    // 设置本地参与者事件监听器
    if (this.room.localParticipant) {
      this.setupParticipantEventListeners(this.room.localParticipant);
    }

    // 设置现有远程参与者的事件监听器
    this.room.remoteParticipants.forEach(participant => {
      this.setupParticipantEventListeners(participant);
    });
  }

  /**
   * 设置参与者事件监听器
   */
  private setupParticipantEventListeners(participant: Participant): void {
    // 轨道发布
    participant.on(ParticipantEvent.TrackPublished, (publication: TrackPublication) => {
      console.log('轨道发布:', publication.trackSid, participant.identity);
      this.updateParticipantsList();
    });

    // 轨道取消发布
    participant.on(ParticipantEvent.TrackUnpublished, (publication: TrackPublication) => {
      console.log('轨道取消发布:', publication.trackSid, participant.identity);
      this.updateParticipantsList();
    });

    // 轨道静音/取消静音
    participant.on(ParticipantEvent.TrackMuted, (publication: TrackPublication) => {
      console.log('轨道静音:', publication.trackSid, participant.identity);
      this.updateParticipantsList();
    });

    participant.on(ParticipantEvent.TrackUnmuted, (publication: TrackPublication) => {
      console.log('轨道取消静音:', publication.trackSid, participant.identity);
      this.updateParticipantsList();
    });
  }

  /**
   * 更新连接状态
   */
  private updateConnectionState(state: ConnectionState): void {
    this.connectionStateSubject.next(state);
  }

  /**
   * 更新参与者列表
   */
  private updateParticipantsList(): void {
    if (!this.room) {
      this.participantsSubject.next([]);
      return;
    }

    const participants: LiveKitParticipant[] = [];

    // 添加本地参与者
    if (this.localParticipant) {
      const localVideoTrack = this.localParticipant.getTrackPublication(Track.Source.Camera)?.track as LocalVideoTrack;
      const localAudioTrack = this.localParticipant.getTrackPublication(Track.Source.Microphone)?.track as LocalAudioTrack;
      const localScreenTrack = this.localParticipant.getTrackPublication(Track.Source.ScreenShare)?.track as LocalVideoTrack;

      participants.push({
        identity: this.localParticipant.identity,
        name: this.localParticipant.name || this.localParticipant.identity,
        isLocal: true,
        audioEnabled: this.localParticipant.isMicrophoneEnabled,
        videoEnabled: this.localParticipant.isCameraEnabled,
        screenShareEnabled: this.localParticipant.isScreenShareEnabled,
        videoTrack: localVideoTrack,
        audioTrack: localAudioTrack,
        screenTrack: localScreenTrack
      });
    }

    // 添加远程参与者
    this.room.remoteParticipants.forEach(participant => {
      const videoPublication = participant.getTrackPublication(Track.Source.Camera);
      const audioPublication = participant.getTrackPublication(Track.Source.Microphone);
      const screenPublication = participant.getTrackPublication(Track.Source.ScreenShare);

      participants.push({
        identity: participant.identity,
        name: participant.name || participant.identity,
        isLocal: false,
        audioEnabled: audioPublication ? !audioPublication.isMuted : false,
        videoEnabled: videoPublication ? !videoPublication.isMuted : false,
        screenShareEnabled: screenPublication ? !screenPublication.isMuted : false,
        videoTrack: videoPublication?.track as RemoteTrack,
        audioTrack: audioPublication?.track as RemoteTrack,
        screenTrack: screenPublication?.track as RemoteTrack
      });
    });

    this.participantsSubject.next(participants);
  }

  /**
   * 更新状态
   */
  private updateState(): void {
    const state = {
      isAudioEnabled: this.localParticipant ? this.localParticipant.isMicrophoneEnabled : false,
      isVideoEnabled: this.localParticipant ? this.localParticipant.isCameraEnabled : false,
      isScreenSharing: this.localParticipant ? this.localParticipant.isScreenShareEnabled : false,
      localParticipant: this.localParticipant
    };
    this.stateSubject.next(state);
  }

  /**
   * 获取媒体设备列表
   */
  async getMediaDevices(): Promise<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  }> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      return {
        cameras: devices.filter(device => device.kind === 'videoinput'),
        microphones: devices.filter(device => device.kind === 'audioinput'),
        speakers: devices.filter(device => device.kind === 'audiooutput')
      };
    } catch (error) {
      console.error('获取媒体设备失败:', error);
      throw error;
    }
  }

  /**
   * 切换摄像头设备
   */
  async switchCamera(deviceId: string): Promise<void> {
    if (!this.localParticipant) {
      throw new Error('未连接到房间');
    }

    try {
      const videoTrack = await createLocalVideoTrack({
        deviceId,
        resolution: VideoPresets.h720.resolution
      });

      await this.localParticipant.publishTrack(videoTrack, {
        name: 'camera'
      });

      const currentTracks = this.localTracksSubject.value;
      this.localTracksSubject.next({ ...currentTracks, video: videoTrack });

    } catch (error) {
      console.error('切换摄像头失败:', error);
      throw error;
    }
  }

  /**
   * 检查移动端浏览器兼容性
   */
  async checkMobileBrowserCompatibility(): Promise<{
    canProceed: boolean;
    recommendations: string[];
    browserInfo: {
      name: string;
      version: string;
      isMobile: boolean;
    };
  }> {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    let browserName = 'Unknown';
    let browserVersion = 'Unknown';
    const recommendations: string[] = [];
    let canProceed = true;

    // 检测浏览器类型和版本
    if (userAgent.includes('Chrome')) {
      browserName = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browserName = 'Safari';
      const match = userAgent.match(/Version\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Firefox')) {
      browserName = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    }

    // 检查WebRTC支持
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      canProceed = false;
      recommendations.push('当前浏览器不支持WebRTC，请使用Chrome、Safari或Firefox最新版本');
    }

    // 检查HTTPS
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      canProceed = false;
      recommendations.push('请使用HTTPS访问以启用摄像头和麦克风功能');
    }

    // 移动端特殊检查
    if (isMobile) {
      if (browserName === 'Chrome' && parseInt(browserVersion) < 80) {
        recommendations.push('建议更新Chrome浏览器到最新版本以获得最佳体验');
      }
      if (browserName === 'Safari' && parseInt(browserVersion) < 14) {
        recommendations.push('建议更新Safari浏览器到最新版本以获得最佳体验');
      }
      recommendations.push('移动端建议使用WiFi网络以确保稳定连接');
      recommendations.push('建议关闭其他占用摄像头的应用');
    }

    return {
      canProceed,
      recommendations,
      browserInfo: {
        name: browserName,
        version: browserVersion,
        isMobile
      }
    };
  }

  /**
   * 诊断摄像头问题
   */
  async diagnoseCameraIssues(): Promise<{
     hasCamera: boolean;
     hasPermission: boolean;
     isWorking: boolean;
     issues: string[];
     suggestions: string[];
     recommendations: string[];
     canAutoFix: boolean;
   }> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let hasCamera = false;
    let hasPermission = false;
    let isWorking = false;

    try {
      // 检查设备列表
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      hasCamera = cameras.length > 0;

      if (!hasCamera) {
        issues.push('未检测到摄像头设备');
        suggestions.push('请检查摄像头是否正确连接');
        suggestions.push('请确认摄像头驱动程序已安装');
      }

      // 尝试获取摄像头权限
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        hasPermission = true;
        isWorking = true;

        // 立即停止流以释放摄像头
        stream.getTracks().forEach(track => track.stop());
      } catch (permissionError: any) {
        if (permissionError.name === 'NotAllowedError') {
          issues.push('摄像头权限被拒绝');
          suggestions.push('请在浏览器地址栏点击摄像头图标并允许权限');
          suggestions.push('请检查浏览器设置中的摄像头权限');
        } else if (permissionError.name === 'NotFoundError') {
          issues.push('未找到可用的摄像头设备');
          suggestions.push('请检查摄像头是否被其他应用占用');
        } else if (permissionError.name === 'NotSupportedError') {
          issues.push('浏览器不支持摄像头功能');
          suggestions.push('请使用支持WebRTC的现代浏览器');
        } else {
          issues.push(`摄像头访问失败: ${permissionError.message}`);
          suggestions.push('请尝试重启浏览器或重新连接摄像头');
        }
      }

    } catch (error: any) {
      issues.push(`设备检测失败: ${error.message}`);
      suggestions.push('请检查浏览器是否支持媒体设备API');
    }

    return {
       hasCamera,
       hasPermission,
       isWorking,
       issues,
       suggestions,
       recommendations: suggestions, // 使用 suggestions 作为 recommendations
       canAutoFix: hasCamera && !isWorking // 如果有摄像头但不工作，则可以尝试自动修复
     };
  }

  /**
   * 自动修复摄像头问题
   */
  async autoFixCamera(): Promise<{
    success: boolean;
    message: string;
    actions: string[];
  }> {
    const actions: string[] = [];

    try {
      actions.push('开始摄像头自动修复');

      // 1. 停止当前所有视频轨道
      const currentTracks = this.localTracksSubject.value;
      if (currentTracks.video) {
        currentTracks.video.stop();
        actions.push('停止当前视频轨道');
      }

      // 2. 重新获取摄像头权限
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      actions.push('重新获取摄像头权限成功');

      // 3. 创建新的视频轨道
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        actions.push('创建新的视频轨道成功');

        // 4. 如果已连接到房间，发布新轨道
        if (this.localParticipant) {
          const localVideoTrack = await createLocalVideoTrack({
            resolution: VideoPresets.h720.resolution,
            facingMode: 'user'
          });

          await this.localParticipant.publishTrack(localVideoTrack);
          actions.push('发布新视频轨道到房间');

          this.localTracksSubject.next({
            ...this.localTracksSubject.value,
            video: localVideoTrack
          });
        }

        // 停止临时流
        stream.getTracks().forEach(track => track.stop());

        return {
          success: true,
          message: '摄像头修复成功',
          actions
        };
      } else {
        throw new Error('无法创建视频轨道');
      }

    } catch (error: any) {
      actions.push(`修复失败: ${error.message}`);
      return {
        success: false,
        message: `摄像头修复失败: ${error.message}`,
        actions
      };
    }
  }

  /**
   * 截取屏幕截图
   */
  async captureScreenshot(): Promise<string> {
    if (!this.localParticipant) {
      throw new Error('未连接到房间');
    }

    const currentTracks = this.localTracksSubject.value;
    const videoTrack = currentTracks.video;

    if (!videoTrack) {
      throw new Error('没有可用的视频轨道');
    }

    try {
      // 创建canvas元素
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('无法创建canvas上下文');
      }

      // 获取视频元素的尺寸
      const videoElement = videoTrack.attach() as HTMLVideoElement;
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;

      // 绘制当前帧到canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // 转换为base64图片
      const screenshot = canvas.toDataURL('image/png');

      // 清理
      videoElement.remove();

      return screenshot;
    } catch (error) {
      console.error('截图失败:', error);
      throw error;
    }
  }

  /**
   * 切换麦克风设备
   */
  async switchMicrophone(deviceId: string): Promise<void> {
    if (!this.localParticipant) {
      throw new Error('未连接到房间');
    }

    try {
      const audioTrack = await createLocalAudioTrack({
        deviceId,
        ...AudioPresets.music
      });

      await this.localParticipant.publishTrack(audioTrack, {
        name: 'microphone'
      });

      const currentTracks = this.localTracksSubject.value;
      this.localTracksSubject.next({ ...currentTracks, audio: audioTrack });

    } catch (error) {
      console.error('切换麦克风失败:', error);
      throw error;
    }
  }
}
