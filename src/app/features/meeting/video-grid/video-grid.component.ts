import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';

import { LiveKitService, LiveKitParticipant } from '../../../core/services/livekit.service';
import { RemoteTrack, LocalVideoTrack, Track } from 'livekit-client';

export interface VideoGridLayout {
  columns: number;
  rows: number;
  participantWidth: string;
  participantHeight: string;
}

export interface ParticipantVideo {
  participant: LiveKitParticipant;
  videoElement?: HTMLVideoElement;
  isScreenShare?: boolean;
  isPinned?: boolean;
}

@Component({
  selector: 'app-video-grid',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule
  ],
  templateUrl: './video-grid.component.html',
  styleUrls: ['./video-grid.component.scss']
})
export class VideoGridComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChildren('videoElement') videoElements!: QueryList<ElementRef<HTMLVideoElement>>;
  @ViewChildren('audioElement') audioElements!: QueryList<ElementRef<HTMLAudioElement>>;
  @ViewChildren('screenVideo') screenVideoElements!: QueryList<ElementRef<HTMLVideoElement>>;

  @Input() participants: any[] = [];
  @Input() localParticipant: any = null;

  private destroy$ = new Subject<void>();

  // 参与者和视频状态
  participantVideos: ParticipantVideo[] = [];

  // 屏幕共享状态
  screenShareMode = false;
  screenShareParticipant: LiveKitParticipant | null = null;

  // 网格布局
  gridLayout: VideoGridLayout = {
    columns: 2,
    rows: 2,
    participantWidth: '50%',
    participantHeight: '50%'
  };

  // UI状态
  isFullscreen = false;
  pinnedParticipant: LiveKitParticipant | null = null;

  // 布局模式
  layoutModes = ['grid', 'speaker', 'gallery'];
  currentLayoutMode = 'grid';

  constructor(
    private liveKitService: LiveKitService,
    private cdr: ChangeDetectorRef,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.subscribeToParticipants();
    this.subscribeToTrackEvents();
    this.subscribeToTrackStateChanges();
    this.subscribeToLocalTracks();
  }

  ngAfterViewInit(): void {
    // 监听视频元素变化
    this.videoElements.changes.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      setTimeout(() => {
        this.attachVideoTracks();
        this.monitorVideoElements();
      }, 50);
    });

    this.audioElements.changes.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      setTimeout(() => this.attachAudioTracks(), 50);
    });

    this.screenVideoElements.changes.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      setTimeout(() => this.attachScreenShareTracks(), 50);
    });

    // 初始化时附加轨道
    setTimeout(() => {
      this.attachVideoTracks();
      this.attachAudioTracks();
      this.attachScreenShareTracks();
      this.monitorVideoElements();
    }, 200);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * 订阅参与者变化
   */
  private subscribeToParticipants(): void {
    this.liveKitService.participants$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(participants => {
      this.participants = participants;
      this.updateParticipantVideos();
      this.updateScreenShareMode();
      this.updateGridLayout();
      this.cdr.detectChanges();

      // 确保在 DOM 更新后附加轨道
      setTimeout(() => {
        this.attachVideoTracks();
        this.attachAudioTracks();
        this.attachScreenShareTracks();
      }, 150);
    });
  }

  /**
   * 订阅轨道事件
   */
  private subscribeToTrackEvents(): void {
    // 轨道订阅事件
    this.liveKitService.trackSubscribed$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(({ track, participant }) => {
      // participants$ 会自动更新，这里只需更新视频列表和触发变更检测
      this.updateParticipantVideos();
      this.updateScreenShareMode();
      this.cdr.detectChanges();

      // 延迟附加轨道，确保 DOM 已更新
      setTimeout(() => {
        if (track.kind === Track.Kind.Video) {
          this.attachVideoTracks();
        } else if (track.kind === Track.Kind.Audio) {
          this.attachAudioTracks();
        }
      }, 300);
    });

    // 轨道取消订阅事件
    this.liveKitService.trackUnsubscribed$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(({ track, participant }) => {
      // 分离轨道
      this.detachTrack(track, participant.identity);

      // participants$ 会自动更新，这里只需更新视频列表和触发变更检测
      this.updateParticipantVideos();
      this.updateScreenShareMode();
      this.cdr.detectChanges();
    });
  }

  /**
   * 订阅轨道状态变化
   */
  private subscribeToTrackStateChanges(): void {
    // 监听参与者连接状态变化
    this.liveKitService.participantConnected$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(participant => {
      // participants$ 会自动更新，这里只需触发变更检测
      this.cdr.detectChanges();
    });

    // 监听参与者断开连接
    this.liveKitService.participantDisconnected$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(participant => {
      // participants$ 会自动更新，这里只需触发变更检测
      this.cdr.detectChanges();
    });

    // 监听参与者事件（包含轨道静音/取消静音等状态变化）
    this.liveKitService.participantEvents$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((event: any) => {
      // participants$ 会自动更新，这里只需触发变更检测
      this.cdr.detectChanges();
    });
  }

  /**
   * 订阅本地轨道状态变化
   */
  private subscribeToLocalTracks(): void {
    // 监听本地轨道变化（摄像头开关等）
    this.liveKitService.localTracks$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(tracks => {
      // 触发参与者列表更新（通过 participants$ 获取包含 videoTrack 的数据）
      this.cdr.detectChanges();

      // 如果有视频轨道，延迟附加
      if (tracks.video) {
        setTimeout(() => {
          this.attachVideoTracks();
        }, 100);
      }
    });

    // 监听 LiveKit 状态变化（包括 isVideoEnabled 等）
    this.liveKitService.state$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(state => {
      // 触发变更检测，participants$ 会自动更新数据
      this.cdr.detectChanges();
    });
  }

  /**
   * 更新参与者视频列表
   */
  private updateParticipantVideos(): void {
    this.participantVideos = this.participants
      .filter(p => !p.screenShareEnabled || p.isLocal)
      .map(participant => ({
        participant,
        isPinned: this.pinnedParticipant?.identity === participant.identity
      }));
  }

  /**
   * 更新屏幕共享模式
   */
  private updateScreenShareMode(): void {
    const screenShareParticipant = this.participants.find(p => p.screenShareEnabled);

    if (screenShareParticipant) {
      this.screenShareMode = true;
      this.screenShareParticipant = screenShareParticipant;
    } else {
      this.screenShareMode = false;
      this.screenShareParticipant = null;
    }
  }

  /**
   * 更新网格布局
   */
  private updateGridLayout(): void {
    const participantCount = this.participantVideos.length;

    if (participantCount <= 1) {
      this.gridLayout = { columns: 1, rows: 1, participantWidth: '100%', participantHeight: '100%' };
    } else if (participantCount <= 4) {
      this.gridLayout = { columns: 2, rows: 2, participantWidth: '50%', participantHeight: '50%' };
    } else if (participantCount <= 9) {
      this.gridLayout = { columns: 3, rows: 3, participantWidth: '33.33%', participantHeight: '33.33%' };
    } else if (participantCount <= 16) {
      this.gridLayout = { columns: 4, rows: 4, participantWidth: '25%', participantHeight: '25%' };
    } else {
      // 超过16人时使用滚动网格
      this.gridLayout = { columns: 5, rows: Math.ceil(participantCount / 5), participantWidth: '20%', participantHeight: '20%' };
    }

    // 屏幕共享模式下调整布局
    if (this.screenShareMode) {
      this.gridLayout = { columns: Math.min(participantCount, 6), rows: 1, participantWidth: '16.66%', participantHeight: '100%' };
    }
  }

  /**
   * 附加视频轨道到视频元素
   */
  private attachVideoTracks(): void {
    if (!this.videoElements) {
      return;
    }

    this.videoElements.forEach(elementRef => {
      const videoElement = elementRef.nativeElement;
      const participantId = videoElement.id.replace('video-', '');
      
      // 首先在 participantVideos 中查找
      let participant = this.participantVideos.find(pv => pv.participant.identity === participantId)?.participant;

      // 如果在 participantVideos 中找不到，直接在 participants 中查找
      if (!participant) {
        participant = this.participants.find(p => p.identity === participantId);
      }

      if (participant && participant.videoTrack) {
        try {
          // 检查是否已经附加了相同的轨道
          const currentSrcObject = videoElement.srcObject as MediaStream;
          const currentTrackId = currentSrcObject?.getTracks()[0]?.id;
          const newTrackId = (participant.videoTrack as any).mediaStreamTrack?.id;

          if (currentTrackId === newTrackId) {
            return;
          }

          // 只有在轨道不同时才分离现有轨道
          if (currentSrcObject && currentTrackId !== newTrackId) {
            try {
              const existingTracks = currentSrcObject.getTracks();
              existingTracks.forEach(track => {
                currentSrcObject.removeTrack(track);
              });
              videoElement.srcObject = null;
            } catch (detachError) {
              console.warn('分离现有轨道时出错:', detachError);
            }
          }

          // 附加新轨道
          participant.videoTrack.attach(videoElement);

          // 确保视频播放
          videoElement.play().catch(e => {
            console.warn('视频自动播放失败，用户可能需要手动触发:', e);
          });

          // 验证轨道附加是否成功
          setTimeout(() => {
            const verifyAttachment = () => {
              const currentSrcObject = videoElement.srcObject as MediaStream;
              const tracks = currentSrcObject?.getTracks() || [];
              const videoTracks = tracks.filter(track => track.kind === 'video');

              if (videoTracks.length === 0 || videoTracks[0].readyState === 'ended') {
                // 重新尝试附加轨道
                try {
                  participant?.videoTrack?.attach(videoElement);
                } catch (retryError) {
                  console.error('重新附加轨道失败:', participantId, retryError);
                }
              }
            };

            verifyAttachment();
          }, 500);

          // 强制触发变更检测
          this.cdr.detectChanges();
        } catch (error) {
          console.error('附加视频轨道失败:', participantId, error);
        }
      }
    });

    // 调试：输出所有视频元素状态
    setTimeout(() => {
      this.debugVideoElements();
    }, 200);
  }

  /**
   * 附加音频轨道到音频元素
   */
  private attachAudioTracks(): void {
    if (!this.audioElements) return;

    this.audioElements.forEach(elementRef => {
      const audioElement = elementRef.nativeElement;
      const participantId = audioElement.id.replace('audio-', '');
      const participant = this.participantVideos.find(pv => pv.participant.identity === participantId)?.participant;

      if (participant && participant.audioTrack && !participant.isLocal) {
        try {
          participant.audioTrack.attach(audioElement);

          // 确保音频播放
          audioElement.play().catch(e => {
            console.warn('音频自动播放失败:', e);
          });
        } catch (error) {
          console.error('附加音频轨道失败:', participantId, error);
        }
      }
    });
  }

  /**
   * 附加屏幕共享轨道
   */
  private attachScreenShareTracks(): void {
    if (!this.screenVideoElements) return;

    this.screenVideoElements.forEach(elementRef => {
      const videoElement = elementRef.nativeElement;
      const participantId = videoElement.id.replace('screen-', '');
      const participant = this.participants.find(p => p.identity === participantId);

      if (participant && participant.screenTrack) {
        try {
          participant.screenTrack.attach(videoElement);

          // 确保视频播放
          videoElement.play().catch(e => {
            console.warn('屏幕共享自动播放失败:', e);
          });
        } catch (error) {
          console.error('附加屏幕共享轨道失败:', participantId, error);
        }
      }
    });
  }

  /**
   * 分离轨道
   */
  private detachTrack(track: RemoteTrack | LocalVideoTrack, participantId: string): void {
    if (track.kind === Track.Kind.Video) {
      const videoElement = document.getElementById(`video-${participantId}`) as HTMLVideoElement;
      if (videoElement) {
        try {
          // 检查当前轨道是否匹配
          const currentSrcObject = videoElement.srcObject as MediaStream;
          const currentTrackId = currentSrcObject?.getTracks()[0]?.id;
          const detachingTrackId = (track as any).mediaStreamTrack?.id;

          if (currentTrackId === detachingTrackId) {
            track.detach(videoElement);
          }
        } catch (error) {
          console.error('分离视频轨道失败:', participantId, error);
        }
      }

      const screenElement = document.getElementById(`screen-${participantId}`) as HTMLVideoElement;
      if (screenElement) {
        try {
          track.detach(screenElement);
        } catch (error) {
          console.error('分离屏幕共享轨道失败:', participantId, error);
        }
      }
    } else if (track.kind === Track.Kind.Audio) {
      const audioElement = document.getElementById(`audio-${participantId}`) as HTMLAudioElement;
      if (audioElement) {
        try {
          track.detach(audioElement);
        } catch (error) {
          console.error('分离音频轨道失败:', participantId, error);
        }
      }
    }
  }

  /**
   * 置顶参与者
   */
  pinParticipant(participantVideo: ParticipantVideo): void {
    if (participantVideo.isPinned) {
      this.pinnedParticipant = null;
    } else {
      this.pinnedParticipant = participantVideo.participant;
    }

    this.updateParticipantVideos();
    this.snackBar.open(
      participantVideo.isPinned ? '已取消置顶' : '已置顶参与者',
      '关闭',
      { duration: 2000 }
    );
  }

  /**
   * 聚焦参与者
   */
  focusParticipant(participantVideo: ParticipantVideo): void {
    // 实现聚焦逻辑，例如放大显示该参与者
    this.snackBar.open(
      `聚焦到 ${participantVideo.participant.name}`,
      '关闭',
      { duration: 2000 }
    );
  }

  /**
   * 切换网格布局
   */
  toggleGridLayout(): void {
    const currentIndex = this.layoutModes.indexOf(this.currentLayoutMode);
    const nextIndex = (currentIndex + 1) % this.layoutModes.length;
    this.currentLayoutMode = this.layoutModes[nextIndex];

    this.snackBar.open(
      `切换到${this.getLayoutModeName(this.currentLayoutMode)}模式`,
      '关闭',
      { duration: 2000 }
    );
  }

  /**
   * 切换全屏
   */
  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      this.isFullscreen = true;
    } else {
      document.exitFullscreen();
      this.isFullscreen = false;
    }
  }

  /**
   * 获取连接质量
   */
  getConnectionQuality(participant: LiveKitParticipant): 'excellent' | 'good' | 'poor' {
    // 这里可以根据实际的连接质量数据来判断
    // 暂时返回优秀状态
    return 'excellent';
  }

  /**
   * 获取连接质量图标
   */
  getConnectionQualityIcon(participant: LiveKitParticipant): string {
    const quality = this.getConnectionQuality(participant);
    switch (quality) {
      case 'excellent': return 'signal_wifi_4_bar';
      case 'good': return 'signal_wifi_3_bar';
      case 'poor': return 'signal_wifi_1_bar';
      default: return 'signal_wifi_off';
    }
  }

  /**
   * 获取布局模式名称
   */
  private getLayoutModeName(mode: string): string {
    switch (mode) {
      case 'grid': return '网格';
      case 'speaker': return '演讲者';
      case 'gallery': return '画廊';
      default: return '网格';
    }
  }

  /**
   * 轨道标识函数
   */
  trackByParticipant(index: number, item: ParticipantVideo): string {
    return item.participant.identity;
  }

  // 调试方法：检查所有视频元素状态
  debugVideoElements(): void {
    // Debug method - can be enabled when needed for troubleshooting
  }
  
  // 监控视频元素状态变化
  private monitorVideoElements(): void {
    if (!this.videoElements) return;

    this.videoElements.forEach(elementRef => {
      const videoElement = elementRef.nativeElement;

      // 监听视频错误事件
      videoElement.addEventListener('error', (e) => {
        console.error('视频错误:', videoElement.id, e);
      });
    });
  }
}
