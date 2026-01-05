package org.cgdi.cgdimeeting.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 录制信息实体类
 * 用于存储会议录制的基本信息到 MySQL 数据库
 */
@Entity
@Table(name = "recording_info")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecordingInfo {

    /**
     * 录制ID，主键
     */
    @Id
    @Column(name = "recording_id", length = 64)
    private String recordingId;

    /**
     * 会议房间名称
     */
    @Column(name = "room_name", nullable = false, length = 100)
    private String roomName;

    /**
     * 录制名称
     */
    @Column(name = "recording_name", nullable = false, length = 200)
    private String recordingName;

    /**
     * 创建者用户ID
     */
    @Column(name = "created_by", nullable = false, length = 64)
    private String createdBy;

    /**
     * 录制状态
     * recording: 录制中
     * paused: 已暂停
     * stopped: 已停止
     * processing: 处理中
     * completed: 已完成
     * failed: 失败
     */
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    /**
     * 录制格式 (mp4, webm, avi等)
     */
    @Column(name = "format", length = 10)
    private String format;

    /**
     * 录制质量 (720p, 1080p, 4K等)
     */
    @Column(name = "quality", length = 10)
    private String quality;

    /**
     * 文件大小（字节）
     */
    @Column(name = "file_size")
    private Long fileSize;

    /**
     * 录制时长（秒）
     */
    @Column(name = "duration")
    private Integer duration;

    /**
     * MinIO 存储路径
     */
    @Column(name = "minio_path", length = 500)
    private String minioPath;

    /**
     * MinIO 存储桶名称
     */
    @Column(name = "minio_bucket", length = 100)
    private String minioBucket;

    /**
     * 文件名
     */
    @Column(name = "file_name", length = 200)
    private String fileName;

    /**
     * 参与人数
     */
    @Column(name = "participants")
    private Integer participants;

    /**
     * 开始时间
     */
    @Column(name = "start_time")
    private LocalDateTime startTime;

    /**
     * 结束时间
     */
    @Column(name = "end_time")
    private LocalDateTime endTime;

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
     * 备注信息
     */
    @Column(name = "remarks", length = 500)
    private String remarks;

    /**
     * 删除状态 (0: 未删除, 1: 已删除)
     */
    @Column(name = "is_deleted", nullable = false)
    private Integer isDeleted = 0;

    /**
     * 暂停时间
     */
    @Column(name = "pause_time")
    private LocalDateTime pauseTime;

    /**
     * 恢复时间
     */
    @Column(name = "resume_time")
    private LocalDateTime resumeTime;

    /**
     * 当前录制时长（秒）
     */
    @Column(name = "current_duration")
    private Long currentDuration = 0L;

    /**
     * 总暂停时长（秒）
     */
    @Column(name = "total_pause_duration")
    private Long totalPauseDuration = 0L;

    /**
     * 自动设置创建时间
     */
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * 自动设置更新时间
     */
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}