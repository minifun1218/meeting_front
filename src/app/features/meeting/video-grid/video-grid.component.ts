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
  template: `
    <div class="video-grid-container" [class.screen-share-mode]="screenShareMode">
      <!-- 屏幕共享区域 -->
      <div class="screen-share-area" *ngIf="screenShareMode && screenShareParticipant">
        <div class="screen-share-video">
          <video
            #screenVideo
            [id]="'screen-' + screenShareParticipant.identity"
            autoplay
            playsinline
            muted="false"
            class="screen-video-element">
          </video>
          <div class="screen-share-info">
            <mat-icon>screen_share</mat-icon>
            <span>{{ screenShareParticipant.name }} 正在共享屏幕</span>
          </div>
        </div>
      </div>

      <!-- 视频网格区域 -->
      <div class="video-grid"
           [style.grid-template-columns]="gridLayout.columns + 'fr '.repeat(gridLayout.columns - 1) + 'fr'"
           [style.grid-template-rows]="gridLayout.rows + 'fr '.repeat(gridLayout.rows - 1) + 'fr'"
           [class.minimized]="screenShareMode">

        <div class="participant-video"
             *ngFor="let participantVideo of participantVideos; trackBy: trackByParticipant"
             [class.local]="participantVideo.participant.isLocal"
             [class.pinned]="participantVideo.isPinned"
             [class.audio-only]="!participantVideo.participant.videoEnabled && !participantVideo.participant.screenShareEnabled">

          <!-- 视频元素 -->
          <video
            #videoElement
            [id]="'video-' + participantVideo.participant.identity"
            autoplay
            playsinline
            [muted]="participantVideo.participant.isLocal"
            class="video-element"
            [style.display]="(participantVideo.participant.videoEnabled || participantVideo.participant.videoTrack) ? 'block' : 'none'">
          </video>

          <!-- 音频元素（仅远程参与者） -->
          <audio
            #audioElement
            *ngIf="!participantVideo.participant.isLocal"
            [id]="'audio-' + participantVideo.participant.identity"
            autoplay
            playsinline>
          </audio>

          <!-- 参与者信息覆盖层 -->
          <div class="participant-overlay">
            <!-- 参与者名称 -->
            <div class="participant-name">
              <mat-icon *ngIf="participantVideo.participant.isLocal" class="local-indicator">person</mat-icon>
              {{ participantVideo.participant.name }}
              <span *ngIf="participantVideo.participant.isLocal" class="local-label">(我)</span>
            </div>

            <!-- 状态指示器 -->
            <div class="status-indicators">
              <mat-icon
                *ngIf="!participantVideo.participant.audioEnabled"
                class="status-icon muted"
                matTooltip="麦克风已静音">
                mic_off
              </mat-icon>

              <mat-icon
                *ngIf="!participantVideo.participant.videoEnabled"
                class="status-icon video-off"
                matTooltip="摄像头已关闭">
                videocam_off
              </mat-icon>

              <mat-icon
                *ngIf="participantVideo.participant.screenShareEnabled"
                class="status-icon screen-share"
                matTooltip="正在共享屏幕">
                screen_share
              </mat-icon>
            </div>

            <!-- 参与者操作菜单 -->
            <div class="participant-actions" *ngIf="!participantVideo.participant.isLocal">
              <button mat-icon-button
                      [matMenuTriggerFor]="participantMenu"
                      class="action-button"
                      matTooltip="更多操作">
                <mat-icon>more_vert</mat-icon>
              </button>

              <mat-menu #participantMenu="matMenu">
                <button mat-menu-item (click)="pinParticipant(participantVideo)">
                  <mat-icon>{{ participantVideo.isPinned ? 'push_pin' : 'push_pin' }}</mat-icon>
                  <span>{{ participantVideo.isPinned ? '取消置顶' : '置顶' }}</span>
                </button>

                <button mat-menu-item (click)="focusParticipant(participantVideo)">
                  <mat-icon>center_focus_strong</mat-icon>
                  <span>聚焦</span>
                </button>
              </mat-menu>
            </div>
          </div>

          <!-- 无视频时的占位符 -->
          <div class="video-placeholder"
               *ngIf="!participantVideo.participant.videoEnabled && !participantVideo.participant.screenShareEnabled">
            <div class="avatar">
              <mat-icon class="avatar-icon">person</mat-icon>
            </div>
            <div class="participant-name-large">
              {{ participantVideo.participant.name }}
            </div>
          </div>

          <!-- 连接状态指示器 -->
          <div class="connection-indicator"
               *ngIf="getConnectionQuality(participantVideo.participant) !== 'excellent'">
            <mat-icon [class]="'quality-' + getConnectionQuality(participantVideo.participant)">
              {{ getConnectionQualityIcon(participantVideo.participant) }}
            </mat-icon>
          </div>
        </div>
      </div>

      <!-- 网格布局控制 -->
      <div class="grid-controls" *ngIf="!screenShareMode">
        <button mat-icon-button
                (click)="toggleGridLayout()"
                matTooltip="切换布局"
                class="control-button">
          <mat-icon>view_module</mat-icon>
        </button>

        <button mat-icon-button
                (click)="toggleFullscreen()"
                matTooltip="全屏"
                class="control-button">
          <mat-icon>{{ isFullscreen ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
        </button>
      </div>
    </div>
  `,
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
  }

  ngAfterViewInit(): void {
    console.log('🔧 ngAfterViewInit: 开始初始化视图');
    
    // 监听视频元素变化
    this.videoElements.changes.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      console.log('📹 视频元素变化检测到，元素数量:', this.videoElements.length);
      // 延迟执行以确保 DOM 完全渲染
      setTimeout(() => {
        this.attachVideoTracks();
        this.monitorVideoElements();
      }, 50);
    });

    this.audioElements.changes.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      console.log('🔊 音频元素变化检测到，元素数量:', this.audioElements.length);
      setTimeout(() => this.attachAudioTracks(), 50);
    });

    this.screenVideoElements.changes.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      console.log('🖥️ 屏幕共享元素变化检测到，元素数量:', this.screenVideoElements.length);
      setTimeout(() => this.attachScreenShareTracks(), 50);
    });

    // 初始化时附加轨道
    setTimeout(() => {
      console.log('🚀 ngAfterViewInit: 初始化附加轨道', {
        videoElementsCount: this.videoElements?.length || 0,
        participantsCount: this.participants.length,
        participantVideosCount: this.participantVideos.length
      });
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
      console.log('👥 参与者列表更新:', {
        previousCount: this.participants.length,
        newCount: participants.length,
        participants: participants.map(p => ({
          identity: p.identity,
          name: p.name,
          isLocal: p.isLocal,
          videoEnabled: p.videoEnabled,
          hasVideoTrack: !!p.videoTrack
        }))
      });
      
      this.participants = participants;
      this.updateParticipantVideos();
      this.updateScreenShareMode();
      this.updateGridLayout();
      this.cdr.detectChanges();
      
      console.log('参与者列表更新后的状态:', {
        participantVideosCount: this.participantVideos.length,
        videoElementsCount: this.videoElements?.length || 0
      });
      
      // 确保在 DOM 更新后附加轨道
      setTimeout(() => {
        console.log('🔄 定时器触发，开始附加所有轨道');
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
      console.log('🎥 轨道订阅事件:', {
        trackKind: track.kind,
        participantId: participant.identity,
        participantName: participant.name,
        trackSid: track.sid
      });

      // 强制更新参与者列表以获取最新的轨道信息
      this.participants = this.liveKitService.getAllParticipants();
      this.updateParticipantVideos();
      this.updateScreenShareMode();
      this.cdr.detectChanges();

      console.log('轨道订阅后的参与者状态:', {
        participantsCount: this.participants.length,
        participantVideosCount: this.participantVideos.length,
        targetParticipant: this.participants.find(p => p.identity === participant.identity)
      });

      // 延迟附加轨道，确保 DOM 已更新
      setTimeout(() => {
        if (track.kind === Track.Kind.Video) {
          console.log('🔄 延迟附加视频轨道');
          this.attachVideoTracks();
        } else if (track.kind === Track.Kind.Audio) {
          console.log('🔄 延迟附加音频轨道');
          this.attachAudioTracks();
        }
      }, 300); // 增加延迟时间确保DOM完全更新
    });

    // 轨道取消订阅事件
    this.liveKitService.trackUnsubscribed$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(({ track, participant }) => {
      console.log('❌ 轨道取消订阅事件:', {
        trackKind: track.kind,
        participantId: participant.identity,
        participantName: participant.name,
        trackSid: track.sid
      });
      
      // 分离轨道
      this.detachTrack(track, participant.identity);
      
      // 更新参与者列表以获取最新状态
      this.participants = this.liveKitService.getAllParticipants();
      this.updateParticipantVideos();
      this.updateScreenShareMode();
      this.cdr.detectChanges();
      
      console.log('轨道取消订阅后的参与者状态:', {
        participantsCount: this.participants.length,
        participantVideosCount: this.participantVideos.length,
        targetParticipant: this.participants.find(p => p.identity === participant.identity)
      });
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
      console.log('👤 参与者连接:', {
        identity: participant.identity,
        name: participant.name
      });
      
      // 更新参与者列表
      this.participants = this.liveKitService.getAllParticipants();
      this.updateParticipantVideos();
      this.cdr.detectChanges();
    });

    // 监听参与者断开连接
    this.liveKitService.participantDisconnected$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(participant => {
      console.log('👤 参与者断开连接:', {
        identity: participant.identity,
        name: participant.name
      });
      
      // 更新参与者列表
      this.participants = this.liveKitService.getAllParticipants();
      this.updateParticipantVideos();
      this.cdr.detectChanges();
    });

    // 监听参与者事件（包含轨道静音/取消静音等状态变化）
    this.liveKitService.participantEvents$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((event: any) => {
      console.log('👤 参与者事件:', event);
      
      // 更新参与者状态
      this.participants = this.liveKitService.getAllParticipants();
      this.updateParticipantVideos();
      this.cdr.detectChanges();
    });
  }

  /**
   * 更新参与者视频列表
   */
  private updateParticipantVideos(): void {
    const previousCount = this.participantVideos.length;
    
    this.participantVideos = this.participants
      .filter(p => !p.screenShareEnabled || p.isLocal) // 过滤掉正在共享屏幕的远程参与者（避免重复显示）
      .map(participant => ({
        participant,
        isPinned: this.pinnedParticipant?.identity === participant.identity
      }));
      
    console.log('📊 更新参与者视频列表:', {
      previousCount,
      newCount: this.participantVideos.length,
      participantVideos: this.participantVideos.map(pv => ({
        identity: pv.participant.identity,
        name: pv.participant.name,
        isLocal: pv.participant.isLocal,
        videoEnabled: pv.participant.videoEnabled,
        hasVideoTrack: !!pv.participant.videoTrack,
        isPinned: pv.isPinned
      }))
    });
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
      console.log('attachVideoTracks: videoElements 不存在');
      return;
    }

    console.log('attachVideoTracks: 开始附加视频轨道', {
      videoElementsCount: this.videoElements.length,
      participantVideosCount: this.participantVideos.length,
      participantsCount: this.participants.length
    });

    this.videoElements.forEach(elementRef => {
      const videoElement = elementRef.nativeElement;
      const participantId = videoElement.id.replace('video-', '');
      
      // 首先在 participantVideos 中查找
      let participant = this.participantVideos.find(pv => pv.participant.identity === participantId)?.participant;
      
      // 如果在 participantVideos 中找不到，直接在 participants 中查找
      if (!participant) {
        participant = this.participants.find(p => p.identity === participantId);
        console.log('在 participants 中查找参与者:', participantId, participant ? '找到' : '未找到');
      }

      console.log('处理视频元素:', {
        participantId,
        hasParticipant: !!participant,
        hasVideoTrack: participant?.videoTrack ? true : false,
        videoEnabled: participant?.videoEnabled,
        participantName: participant?.name
      });

      if (participant && participant.videoTrack) {
        try {
          // 检查是否已经附加了相同的轨道
          const currentSrcObject = videoElement.srcObject as MediaStream;
          const currentTrackId = currentSrcObject?.getTracks()[0]?.id;
          const newTrackId = (participant.videoTrack as any).mediaStreamTrack?.id;
          
          if (currentTrackId === newTrackId) {
            console.log('🔄 轨道已存在，跳过重复附加:', participantId, participant.name);
            return;
          }

          // 只有在轨道不同时才分离现有轨道
          if (currentSrcObject && currentTrackId !== newTrackId) {
            console.log('🔄 分离现有轨道:', participantId, currentTrackId);
            // 使用LiveKit的detach方法而不是直接停止轨道
            try {
              // 尝试从现有轨道中分离
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
          console.log('✅ 视频轨道已成功附加:', participantId, participant.name, newTrackId);

          // 检查视频元素状态
          setTimeout(() => {
            const computedStyle = window.getComputedStyle(videoElement);
            console.log('📺 视频元素状态检查:', {
               participantId,
               participantName: participant?.name,
               display: computedStyle.display,
               visibility: computedStyle.visibility,
               width: videoElement.offsetWidth,
               height: videoElement.offsetHeight,
               videoWidth: videoElement.videoWidth,
               videoHeight: videoElement.videoHeight,
               readyState: videoElement.readyState,
               paused: videoElement.paused,
               srcObject: !!videoElement.srcObject
             });
          }, 100);

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
                console.warn('⚠️ 轨道附加验证失败，尝试重新附加:', {
                  participantId,
                  participantName: participant?.name,
                  tracksCount: tracks.length,
                  videoTracksCount: videoTracks.length,
                  trackStates: videoTracks.map(t => t.readyState)
                });
                
                // 重新尝试附加轨道
                try {
                  participant?.videoTrack?.attach(videoElement);
                  console.log('🔄 重新附加轨道完成:', participantId);
                } catch (retryError) {
                  console.error('❌ 重新附加轨道失败:', participantId, retryError);
                }
              } else {
                console.log('✅ 轨道附加验证成功:', {
                  participantId,
                  participantName: participant?.name,
                  videoTracksCount: videoTracks.length,
                  trackState: videoTracks[0].readyState
                });
              }
            };
            
            verifyAttachment();
          }, 500);

          // 强制触发变更检测
          this.cdr.detectChanges();
        } catch (error) {
          console.error('❌ 附加视频轨道失败:', participantId, error);
        }
      } else {
        console.log('⚠️ 跳过视频轨道附加:', {
          participantId,
          reason: !participant ? '参与者不存在' : '视频轨道不存在',
          participant: participant ? {
            identity: participant.identity,
            name: participant.name,
            videoEnabled: participant.videoEnabled,
            hasVideoTrack: !!participant.videoTrack
          } : null
        });
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
          console.log('音频轨道已附加:', participantId, participant.name);

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
          console.log('屏幕共享轨道已附加:', participantId, participant.name);

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
    console.log('🔄 开始分离轨道:', {
      trackKind: track.kind,
      participantId,
      trackSid: track.sid
    });

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
            console.log('✅ 视频轨道已分离:', participantId, detachingTrackId);
          } else {
            console.log('⚠️ 轨道ID不匹配，跳过分离:', {
              participantId,
              currentTrackId,
              detachingTrackId
            });
          }
        } catch (error) {
          console.error('❌ 分离视频轨道失败:', participantId, error);
        }
      }

      const screenElement = document.getElementById(`screen-${participantId}`) as HTMLVideoElement;
      if (screenElement) {
        try {
          track.detach(screenElement);
          console.log('✅ 屏幕共享轨道已分离:', participantId);
        } catch (error) {
          console.error('❌ 分离屏幕共享轨道失败:', participantId, error);
        }
      }
    } else if (track.kind === Track.Kind.Audio) {
      const audioElement = document.getElementById(`audio-${participantId}`) as HTMLAudioElement;
      if (audioElement) {
        try {
          track.detach(audioElement);
          console.log('✅ 音频轨道已分离:', participantId);
        } catch (error) {
          console.error('❌ 分离音频轨道失败:', participantId, error);
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
    console.log('=== 视频元素调试信息 ===');
    console.log('participantVideos数量:', this.participantVideos.length);
    console.log('videoElements数量:', this.videoElements?.length || 0);
    
    this.participantVideos.forEach((pv, index) => {
      console.log(`参与者 ${index + 1}:`, {
        identity: pv.participant.identity,
        name: pv.participant.name,
        isLocal: pv.participant.isLocal,
        videoEnabled: pv.participant.videoEnabled,
        hasVideoTrack: !!pv.participant.videoTrack,
        videoTrackSid: pv.participant.videoTrack?.sid,
        videoTrackState: pv.participant.videoTrack ? (pv.participant.videoTrack as any).mediaStreamTrack?.readyState : 'no-track'
      });
    });
    
    if (this.videoElements) {
      this.videoElements.forEach((elementRef, index) => {
        const videoElement = elementRef.nativeElement;
        const computedStyle = window.getComputedStyle(videoElement);
        const srcObject = videoElement.srcObject as MediaStream;
        const tracks = srcObject?.getTracks() || [];
        
        console.log(`视频元素 ${index + 1}:`, {
          id: videoElement.id,
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          width: videoElement.offsetWidth,
          height: videoElement.offsetHeight,
          videoWidth: videoElement.videoWidth,
          videoHeight: videoElement.videoHeight,
          readyState: videoElement.readyState,
          paused: videoElement.paused,
          hasSrcObject: !!videoElement.srcObject,
          srcObjectTracks: tracks.length,
          trackStates: tracks.map(track => ({
            id: track.id,
            kind: track.kind,
            readyState: track.readyState,
            enabled: track.enabled,
            muted: track.muted
          }))
        });
      });
    }
    console.log('=== 调试信息结束 ===');
  }
  
  // 监控视频元素状态变化
  private monitorVideoElements(): void {
    if (!this.videoElements) return;
    
    this.videoElements.forEach(elementRef => {
      const videoElement = elementRef.nativeElement;
      
      // 监听视频加载事件
      videoElement.addEventListener('loadstart', () => {
        console.log('📺 视频开始加载:', videoElement.id);
      });
      
      videoElement.addEventListener('loadeddata', () => {
        console.log('📺 视频数据已加载:', videoElement.id);
      });
      
      videoElement.addEventListener('canplay', () => {
        console.log('📺 视频可以播放:', videoElement.id);
      });
      
      videoElement.addEventListener('playing', () => {
        console.log('📺 视频开始播放:', videoElement.id);
      });
      
      videoElement.addEventListener('pause', () => {
        console.log('📺 视频暂停:', videoElement.id);
      });
      
      videoElement.addEventListener('ended', () => {
        console.log('📺 视频结束:', videoElement.id);
      });
      
      videoElement.addEventListener('error', (e) => {
        console.error('❌ 视频错误:', videoElement.id, e);
      });
      
      videoElement.addEventListener('emptied', () => {
        console.log('⚠️ 视频被清空:', videoElement.id);
      });
      
      videoElement.addEventListener('stalled', () => {
        console.log('⚠️ 视频停滞:', videoElement.id);
      });
    });
  }
}
