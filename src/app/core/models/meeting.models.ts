import {ERROR} from '@angular/compiler-cli/src/ngtsc/logging/src/console_logger';

export interface JoinMeetingRequest {
  roomName: string;
  userId: string;
  role: 'host' | 'participant' | 'observer';
  userName: string;
}

export interface JoinMeetingResponse {
  livekitJwt: string;
  serverUrl: string;
  roomName: string;
  userId: string;
  role: string;
  expiresAt: number;
}

export interface CreateRoomRequest {
  roomName: string;
  maxParticipants?: number;
  enableRecording?: boolean;
  description?: string;
}


export interface MeetingRoom {
  id: number;
  roomName: string;
  description: string;
  maxParticipants: number;
  currentParticipants: number;
  status: MeetingStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  enableRecording: boolean;
}


export enum CreateRoomStatus {
  ERROR = 0,
  SUCCESS = 1,
}

export interface CreateRoomResponse {
  status: CreateRoomStatus;
  message: string;
  meetingRoom: MeetingRoom;
}


export enum MeetingStatus {
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  SCHEDULED = 'SCHEDULED',
  CREATING = 'CREATING'
}

// UserRole 已在 auth.models.ts 中定义，这里引用
import { UserRole } from './auth.models';
import {LiveKitParticipant} from '@core/services/livekit.service';

export interface MeetingEvent {
  eventType: string;
  roomName: string;
  userId: string;
  userName: string;
  timestamp: string;
  data?: any;
}

export interface Participant extends LiveKitParticipant{
  userId: string;
  userName: string;
  role: UserRole;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  joinedAt: Date;
  lastSeen: Date;
}

// 邀请功能相关接口
export interface InvitationRequest {
  roomName: string;
  inviterUserId: string;
  inviterUserName: string;
  expiresInHours?: number; // 邀请链接有效期（小时），默认24小时
  maxUses?: number; // 最大使用次数，默认无限制
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';


export interface InvitationResponse {
  /**
   * 邀请ID
   */
  invitationId: string;

  /**
   * 房间名称
   */
  roomName: string;

  /**
   * 邀请人ID
   */
  inviterId: string;

  /**
   * 邀请码使用次数
   */
  usageCount: number;

  /**
   * 邀请码
   */
  invitationCode: string;

  /**
   * 邀请码使用时间
   */
  usedAt: string | null; // LocalDateTime → ISO 字符串或 null

  /**
   * 邀请消息
   */
  message: string | null;

  /**
   * 邀请状态
   */
  status: InvitationStatus | string; // 可根据需要替换为具体枚举类型 InvitationStatus

  /**
   * 是否允许转发
   */
  allowForward: boolean;

  /**
   * 过期时间
   */
  expiresAt: string; // ISO 字符串

  /**
   * 创建时间
   */
  createdAt: string;

  /**
   * 更新时间
   */
  updatedAt: string;

  /**
   * 拒绝原因（如果被拒绝）
   */
  rejectReason: string | null;

  /**
   * 邀请链接
   */
  invitationLink: string;
}

export interface InvitationCodeRequest {
  invitationCode: string;
  userId: string;
  userName: string;
}

export interface InvitationValidationResponse {
  isValid: boolean;
  roomName?: string;
  inviterName?: string;
  expiresAt?: string;
  message?: string;
}

export interface ShareInvitationRequest {
  invitationId: string;
  shareMethod: 'email' | 'sms' | 'copy' | 'qrcode';
  recipients?: string[]; // 邮箱或手机号列表
}
