package org.cgdi.cgdimeeting.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "recording_files")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecordingFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * LiveKit Egress ID
     */
    @Column(name = "egress_id", unique = true, nullable = false)
    private String egressId;

    /**
     * 房间名称
     */
    @Column(name = "room_name", nullable = false)
    private String roomName;

    /**
     * 录制发起用户ID
     */
    @Column(name = "user_id")
    private String userId;

    /**
     * 录制发起用户名
     */
    @Column(name = "user_name")
    private String userName;

    /**
     * 录制状态
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private RecordingStatus status;

    /**
     * 文件名
     */
    @Column(name = "file_name")
    private String fileName;

    /**
     * 文件路径（在存储系统中的路径）
     */
    @Column(name = "file_path")
    private String filePath;

    /**
     * 文件大小（字节）
     */
    @Column(name = "file_size")
    private Long fileSize;

    /**
     * 录制时长（秒）
     */
    @Column(name = "duration_seconds")
    private Long durationSeconds;

    /**
     * 文件格式
     */
    @Column(name = "file_format")
    private String fileFormat;

    /**
     * 存储类型（MinIO, S3, 等）
     */
    @Column(name = "storage_type")
    private String storageType;

    /**
     * 存储桶名称
     */
    @Column(name = "bucket_name")
    private String bucketName;

    /**
     * 对象键（在存储系统中的唯一标识）
     */
    @Column(name = "object_key")
    private String objectKey;

    /**
     * 缩略图路径
     */
    @Column(name = "thumbnail_path")
    private String thumbnailPath;

    /**
     * 下载URL（预签名URL或公开URL）
     */
    @Column(name = "download_url", length = 1000)
    private String downloadUrl;

    /**
     * URL过期时间
     */
    @Column(name = "url_expires_at")
    private LocalDateTime urlExpiresAt;

    /**
     * 录制开始时间
     */
    @Column(name = "started_at")
    private LocalDateTime startedAt;

    /**
     * 录制结束时间
     */
    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    /**
     * 创建时间
     */
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /**
     * 更新时间
     */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * 错误信息（如果录制失败）
     */
    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    /**
     * LiveKit 回调的原始数据
     */
    @Column(name = "callback_data", columnDefinition = "TEXT")
    private String callbackData;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * 录制状态枚举
     */
    public enum RecordingStatus {
        STARTING,    // 开始录制
        RECORDING,   // 录制中
        COMPLETED,   // 录制完成
        FAILED,      // 录制失败
        PROCESSING,  // 处理中
        READY,       // 可用（处理完成）
        DELETED      // 已删除
    }
}