export interface RecordingFile {
  id: number;
  roomName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  duration: number;
  status: RecordingStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  thumbnailPath?: string;
  metadata?: RecordingMetadata;
}

export enum RecordingStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  UPLOADING = 'UPLOADING'
}

export interface RecordingMetadata {
  resolution?: string;
  frameRate?: number;
  bitrate?: number;
  codec?: string;
  audioCodec?: string;
  videoCodec?: string;
  participants?: string[];
}

export interface RecordingFileResponse {
  id: number;
  roomName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  duration: number;
  status: RecordingStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  thumbnailPath?: string;
  downloadUrl?: string;
  description?: string;
  metadata?: RecordingMetadata;
}

export interface RecordingFileListResponse {
  recordings: RecordingFileResponse[];
  pageInfo: {
    totalElements: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface RecordingDownloadResponse {
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  expiresAt: string;
}

export interface RecordingCompletedEvent {
  eventType: string;
  roomName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  duration: number;
  timestamp: string;
}

export interface LiveKitWebhookEvent {
  event: string;
  room: {
    name: string;
    sid: string;
  };
  participant?: {
    identity: string;
    name?: string;
  };
  egress?: {
    egressId: string;
    status: string;
    file?: {
      filename: string;
      size: number;
      duration: number;
    };
  };
  timestamp: number;
}
