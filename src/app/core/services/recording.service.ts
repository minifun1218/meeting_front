import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { 
  RecordingFileListResponse, 
  RecordingFileResponse,
  RecordingDownloadResponse,
  RecordingCompletedEvent
} from '../models/recording.models';
import { environment } from '../../../environments/environment';

interface RecordingState {
  isRecording: boolean;
  roomName: string | null;
  startTime: Date | null;
  recordingId: string | null;
  userId: string | null;
  recordingName: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class RecordingService {
  private readonly apiUrl = environment.recordServiceUrl || 'http://localhost:8083/api/recordings';
  
  private recordingStateSubject = new BehaviorSubject<RecordingState>({
    isRecording: false,
    roomName: null,
    startTime: null,
    recordingId: null,
    userId: null,
    recordingName: null
  });
  
  public recordingState$ = this.recordingStateSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * 提取后端返回的录制会话ID，兼容多种响应结构
   */
  private resolveRecordingId(response: any, fallback?: string | null): string | null {
    if (!response) {
      return fallback || null;
    }

    return (
      response.recordingId ??
      response.id ??
      response.egressId ??
      response.recording?.id ??
      response.data?.recordingId ??
      response.data?.id ??
      fallback ??
      null
    );
  }

  /**
   * 根据房间名查询录制文件列表
   */
  getRecordingsByRoom(roomName: string, page: number = 0, size: number = 20): Observable<RecordingFileListResponse> {
    return this.http.get<RecordingFileListResponse>(
      `${this.apiUrl}/room/${roomName}?page=${page}&size=${size}`
    );
  }

  /**
   * 根据用户ID查询录制文件列表
   */
  getRecordingsByUser(userId: string, page: number = 0, size: number = 20): Observable<RecordingFileListResponse> {
    return this.http.get<RecordingFileListResponse>(
      `${this.apiUrl}/user/${userId}?page=${page}&size=${size}`
    );
  }

  /**
   * 根据ID获取录制文件详情
   */
  getRecordingById(id: number): Observable<RecordingFileResponse> {
    return this.http.get<RecordingFileResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * 生成录制文件下载链接
   */
  generateDownloadUrl(id: number): Observable<RecordingDownloadResponse> {
    return this.http.post<RecordingDownloadResponse>(`${this.apiUrl}/${id}/download`, {});
  }

  /**
   * 获取录制文件下载链接（GET方式）
   */
  getDownloadUrl(id: number): Observable<RecordingDownloadResponse> {
    return this.http.get<RecordingDownloadResponse>(`${this.apiUrl}/${id}/download`);
  }

  /**
   * 根据房间名和时间范围查询录制文件
   */
  getRecordingsByRoomAndTimeRange(
    roomName: string, 
    startTime?: string, 
    endTime?: string, 
    page: number = 0, 
    size: number = 20
  ): Observable<RecordingFileListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (startTime) {
      params = params.set('startTime', startTime);
    }
    if (endTime) {
      params = params.set('endTime', endTime);
    }

    return this.http.get<RecordingFileListResponse>(
      `${this.apiUrl}/room/${roomName}/range`,
      { params }
    );
  }

  /**
   * 搜索录制文件
   */
  searchRecordings(
    filters: {
      roomName?: string;
      userId?: string;
      userName?: string;
      status?: string;
      fileName?: string;
    },
    page: number = 0,
    size: number = 20
  ): Observable<RecordingFileListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params = params.set(key, value);
      }
    });

    return this.http.get<RecordingFileListResponse>(`${this.apiUrl}/search`, { params });
  }

  /**
   * 获取录制文件统计信息
   */
  getRecordingStats(roomName?: string, userId?: string): Observable<any> {
    let params = new HttpParams();
    
    if (roomName) {
      params = params.set('roomName', roomName);
    }
    if (userId) {
      params = params.set('userId', userId);
    }

    return this.http.get(`${this.apiUrl}/stats`, { params });
  }

  /**
   * 健康检查
   */
  checkHealth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }

  /**
   * 获取服务信息
   */
  getServiceInfo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/info`);
  }

  /**
   * 开始录制 - 调用后端API开始录制
   */
  startRecording(
    roomName: string,
    userId?: string,
    recordingName?: string,
    format: string = 'mp4',
    quality: string = 'high'
  ): Observable<any> {
    const startRequest = {
      roomName: roomName,
      userId: userId || '',
      recordingName: recordingName || `${roomName}_${new Date().getTime()}`,
      format: format,
      quality: quality,
      startTime: new Date().toISOString()
    };

    return new Observable(observer => {
      this.http.post(`${this.apiUrl}/start`, startRequest).subscribe({
        next: (response) => {
          const recordingId = this.resolveRecordingId(response, startRequest.recordingName);
          // 更新本地状态
          this.recordingStateSubject.next({
            isRecording: true,
            roomName,
            startTime: new Date(),
            recordingId,
            userId: startRequest.userId || null,
            recordingName: startRequest.recordingName
          });
          observer.next(response);
          observer.complete();
        },
        error: (error) => {
          console.error('开始录制失败:', error);
          observer.error(error);
        }
      });
    });
  }

  /**
   * 停止录制 - 调用后端API停止录制
   */
  stopRecording(): Observable<any> {
    const currentState = this.recordingStateSubject.value;
    if (!currentState.isRecording || !currentState.roomName) {
      return new Observable(observer => {
        observer.error('当前没有正在进行的录制');
      });
    }

    const recordingId = currentState.recordingId || currentState.recordingName;
    const userId = currentState.userId;

    if (!recordingId) {
      return new Observable(observer => {
        observer.error('无法确定当前录制会话ID');
      });
    }

    if (!userId) {
      return new Observable(observer => {
        observer.error('无法确定当前用户，无法停止录制');
      });
    }

    const stopRequest = {
      roomName: currentState.roomName,
      recordingId,
      userId,
      endTime: new Date().toISOString()
    };
    
    return new Observable(observer => {
      this.http.post(`${this.apiUrl}/stop`, stopRequest).subscribe({
        next: (response) => {
          // 更新本地状态
          this.recordingStateSubject.next({
            isRecording: false,
            roomName: null,
            startTime: null,
            recordingId: null,
            userId: null,
            recordingName: null
          });
          observer.next(response);
          observer.complete();
        },
        error: (error) => {
          console.error('停止录制失败:', error);
          observer.error(error);
        }
      });
    });
  }

  /**
   * 强制停止录制 - 仅更新本地状态（用于异常情况）
   */
  forceStopRecording(): void {
    this.recordingStateSubject.next({
      isRecording: false,
      roomName: null,
      startTime: null,
      recordingId: null,
      userId: null,
      recordingName: null
    });
  }

  /**
   * 获取当前录制状态
   */
  getRecordingState(): RecordingState {
    return this.recordingStateSubject.value;
  }

  /**
   * 检查是否正在录制
   */
  isRecording(): boolean {
    return this.recordingStateSubject.value.isRecording;
  }

  /**
   * 处理录制完成事件
   */
  handleRecordingCompleted(event: RecordingCompletedEvent): void {
    // 可以在这里添加通知逻辑
    console.log('录制完成:', event);
    
    // 如果是当前录制的房间，更新状态
    const currentState = this.recordingStateSubject.value;
    if (currentState.roomName === event.roomName) {
      this.stopRecording();
    }
  }

  /**
   * 下载录制文件
   */
  downloadRecording(downloadUrl: string, fileName: string): void {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * 删除录制文件
   */
  deleteRecording(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /**
   * 批量删除录制文件
   */
  batchDeleteRecordings(ids: number[]): Observable<any> {
    return this.http.delete(`${this.apiUrl}/batch`, {
      body: { ids }
    });
  }

  /**
   * 更新录制文件信息
   */
  updateRecording(id: number, updateData: Partial<RecordingFileResponse>): Observable<RecordingFileResponse> {
    return this.http.put<RecordingFileResponse>(`${this.apiUrl}/${id}`, updateData);
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 格式化录制时长
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}
