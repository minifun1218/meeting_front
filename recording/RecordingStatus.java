package org.cgdi.cgdimeeting.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 录制状态实体类
 * 用于存储会议录制的实时状态信息到 MySQL 数据库
 */
@Entity
@Table(name = "recording_status")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecordingStatus {

    /**
     * 状态ID，主键，自增
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    /**
     * 录制ID，关联 recording_info 表
     */
    @Column(name = "recording_id", nullable = false, length = 64)
    private String recordingId;

    /**
     * 会议房间名称
     */
    @Column(name = "room_name", nullable = false, length = 100)
    private String roomName;

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
     * 当前文件大小（字节）
     */
    @Column(name = "file_size")
    private Long fileSize;

    /**
     * 当前录制时长（秒）
     */
    @Column(name = "current_duration")
    private Integer currentDuration;

    /**
     * 暂停总时长（秒）
     */
    @Column(name = "pause_duration")
    private Integer pauseDuration;

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
     * 最后暂停时间
     */
    @Column(name = "last_pause_time")
    private LocalDateTime lastPauseTime;

    /**
     * 最后恢复时间
     */
    @Column(name = "last_resume_time")
    private LocalDateTime lastResumeTime;

    /**
     * 预计结束时间
     */
    @Column(name = "estimated_end_time")
    private LocalDateTime estimatedEndTime;

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
     * 错误信息（如果状态为 failed）
     */
    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    /**
     * 进度百分比 (0-100)
     */
    @Column(name = "progress")
    private Integer progress;

    /**
     * 是否删除 (0: 未删除, 1: 已删除)
     */
    @Column(name = "is_deleted", nullable = false)
    private Integer isDeleted = 0;

    /**
     * 创建时自动设置创建时间
     */
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    /**
     * 更新时自动设置更新时间
     */
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}