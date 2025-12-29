import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import {
  JoinMeetingRequest,
  JoinMeetingResponse,
  CreateRoomRequest,
  MeetingRoom,
  MeetingEvent,
  Participant,
  InvitationRequest,
  InvitationResponse,
  InvitationCodeRequest,
  InvitationValidationResponse,
  ShareInvitationRequest, CreateRoomResponse, CreateRoomStatus
} from '../models/meeting.models';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class MeetingService {
  private readonly apiUrl = environment.meetingServiceUrl || 'http://localhost:8082/api/meetings';

  private participantsSubject = new BehaviorSubject<Participant[]>([]);
  public participants$ = this.participantsSubject.asObservable();

  private meetingEventsSubject = new BehaviorSubject<MeetingEvent | null>(null);
  public meetingEvents$ = this.meetingEventsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHttpHeaders(): HttpHeaders {
    const user = this.authService.getCurrentUser();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-User-ID': user?.id || '',
      'X-User-Role': user?.role || ''
    });
  }

  /**
   * 加入会议 - 获取LiveKit access token
   */
  joinMeeting(request: JoinMeetingRequest): Observable<JoinMeetingResponse> {
    return this.http.post<JoinMeetingResponse>(
      `${this.apiUrl}/join`,
      request,
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * 创建会议房间
   */
  createRoom(request: CreateRoomRequest): Observable<CreateRoomResponse> {

    return this.http.post<CreateRoomResponse>(
      `${this.apiUrl}/rooms`,
      request,
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * 结束会议房间
   */
  endRoom(roomName: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/rooms/${roomName}/end`,
      {},
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * 获取用户的会议房间列表
   */
  getUserRooms(): Observable<MeetingRoom[]> {
    return this.http.get<MeetingRoom[]>(
      `${this.apiUrl}/rooms/my`,
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * 获取活跃的会议房间列表
   */
  getActiveRooms(): Observable<MeetingRoom[]> {
    return this.http.get<MeetingRoom[]>(`${this.apiUrl}/rooms/active`);
  }

  /**
   * 健康检查
   */
  checkHealth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }

  /**
   * 更新参与者列表
   */
  updateParticipants(participants: Participant[]): void {
    this.participantsSubject.next(participants);
  }

  /**
   * 添加参与者
   */
  addParticipant(participant: Participant): void {
    const currentParticipants = this.participantsSubject.value;
    const existingIndex = currentParticipants.findIndex(p => p.userId === participant.userId);

    if (existingIndex >= 0) {
      currentParticipants[existingIndex] = participant;
    } else {
      currentParticipants.push(participant);
    }

    this.participantsSubject.next([...currentParticipants]);
  }

  /**
   * 移除参与者
   */
  removeParticipant(userId: string): void {
    const currentParticipants = this.participantsSubject.value;
    const filteredParticipants = currentParticipants.filter(p => p.userId !== userId);
    this.participantsSubject.next(filteredParticipants);
  }

  /**
   * 更新参与者状态
   */
  updateParticipantStatus(userId: string, updates: Partial<Participant>): void {
    const currentParticipants = this.participantsSubject.value;
    const participantIndex = currentParticipants.findIndex(p => p.userId === userId);

    if (participantIndex >= 0) {
      currentParticipants[participantIndex] = {
        ...currentParticipants[participantIndex],
        ...updates
      };
      this.participantsSubject.next([...currentParticipants]);
    }
  }

  /**
   * 获取当前参与者列表
   */
  getCurrentParticipants(): Participant[] {
    return this.participantsSubject.value;
  }

  /**
   * 发布会议事件
   */
  publishMeetingEvent(event: MeetingEvent): void {
    this.meetingEventsSubject.next(event);
  }

  /**
   * 清空参与者列表
   */
  clearParticipants(): void {
    this.participantsSubject.next([]);
  }

  // 邀请功能相关方法

  /**
   * 生成会议邀请链接和邀请码
   */
  generateInvitation(request: InvitationRequest): Observable<InvitationResponse> {
    return this.http.post<InvitationResponse>(
      `${this.apiUrl}/invitations`,
      request,
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * 验证邀请码
   */
  validateInvitationCode(request: InvitationCodeRequest): Observable<InvitationValidationResponse> {
    return this.http.post<InvitationValidationResponse>(
      `${this.apiUrl}/invitations/validate`,
      request,
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * 通过邀请码加入会议
   */
  joinMeetingByInvitationCode(request: InvitationCodeRequest): Observable<JoinMeetingResponse> {
    return this.http.post<JoinMeetingResponse>(
      `${this.apiUrl}/invitations/join`,
      request,
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * 获取会议的邀请列表
   */
  getRoomInvitations(roomName: string): Observable<InvitationResponse[]> {
    return this.http.get<InvitationResponse[]>(
      `${this.apiUrl}/rooms/${roomName}/invitations`,
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * 撤销邀请
   */
  revokeInvitation(invitationId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/invitations/${invitationId}`,
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * 分享邀请
   */
  shareInvitation(request: ShareInvitationRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/invitations/share`,
      request,
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * 生成邀请二维码
   */
  generateInvitationQRCode(invitationId: string): Observable<{ qrCodeUrl: string }> {
    return this.http.get<{ qrCodeUrl: string }>(
      `${this.apiUrl}/invitations/${invitationId}/qrcode`,
      { headers: this.getHttpHeaders() }
    );
  }
}
