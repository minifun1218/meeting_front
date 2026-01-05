package org.cgdi.cgdimeeting.dto;

import org.cgdi.cgdimeeting.entity.RecordingFile;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
/**
 * 录制文件响应 DTO
 * 用于 API 返回录制文件信息
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecordingFileResponse {

    /**
     * 文件ID
     */
    private Long id;

    /**
     * Egress ID
     */
    private String egressId;

    /**
     * 房间名称
     */
    private String roomName;

    /**
     * 录制发起用户ID
     */
    private String userId;

    /**
     * 录制发起用户名
     */
    private String userName;

    /**
     * 录制状态
     */
    private String status;

    /**
     * 文件名
     */
    private String fileName;

    /**
     * 文件大小（字节）
     */
    private Long fileSize;

    /**
     * 文件大小（格式化）
     */
    private String fileSizeFormatted;

    /**
     * 录制时长（秒）
     */
    private Long durationSeconds;

    /**
     * 录制时长（格式化）
     */
    private String durationFormatted;

    /**
     * 文件格式
     */
    private String fileFormat;

    /**
     * 下载URL
     */
    private String downloadUrl;

    /**
     * URL过期时间
     */
    private LocalDateTime urlExpiresAt;

    /**
     * 缩略图路径
     */
    private String thumbnailPath;

    /**
     * 录制开始时间
     */
    private LocalDateTime startedAt;

    /**
     * 录制结束时间
     */
    private LocalDateTime endedAt;

    /**
     * 创建时间
     */
    private LocalDateTime createdAt;

    /**
     * 更新时间
     */
    private LocalDateTime updatedAt;

    /**
     * 错误信息
     */
    private String errorMessage;

    /**
     * 从实体转换为响应 DTO
     */
    public static RecordingFileResponse fromEntity(RecordingFile entity) {
        return RecordingFileResponse.builder()
                .id(entity.getId())
                .egressId(entity.getEgressId())
                .roomName(entity.getRoomName())
                .userId(entity.getUserId())
                .userName(entity.getUserName())
                .status(entity.getStatus().name())
                .fileName(entity.getFileName())
                .fileSize(entity.getFileSize())
                .fileSizeFormatted(formatFileSize(entity.getFileSize()))
                .durationSeconds(entity.getDurationSeconds())
                .durationFormatted(formatDuration(entity.getDurationSeconds()))
                .fileFormat(entity.getFileFormat())
                .downloadUrl(entity.getDownloadUrl())
                .urlExpiresAt(entity.getUrlExpiresAt())
                .thumbnailPath(entity.getThumbnailPath())
                .startedAt(entity.getStartedAt())
                .endedAt(entity.getEndedAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .errorMessage(entity.getErrorMessage())
                .build();
    }

    /**
     * 批量转换实体列表为响应 DTO 列表
     */
    public static List<RecordingFileResponse> fromEntityList(List<RecordingFile> entities) {
        return entities.stream()
                .map(RecordingFileResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * 格式化文件大小
     */
    private static String formatFileSize(Long sizeInBytes) {
        if (sizeInBytes == null || sizeInBytes == 0) {
            return "0 B";
        }

        String[] units = {"B", "KB", "MB", "GB", "TB"};
        int unitIndex = 0;
        double size = sizeInBytes.doubleValue();

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return String.format("%.2f %s", size, units[unitIndex]);
    }

    /**
     * 格式化录制时长
     */
    private static String formatDuration(Long durationInSeconds) {
        if (durationInSeconds == null || durationInSeconds == 0) {
            return "00:00:00";
        }

        long hours = durationInSeconds / 3600;
        long minutes = (durationInSeconds % 3600) / 60;
        long seconds = durationInSeconds % 60;

        return String.format("%02d:%02d:%02d", hours, minutes, seconds);
    }

    /**
     * 检查下载URL是否有效
     */
    public boolean isDownloadUrlValid() {
        return downloadUrl != null &&
                (urlExpiresAt == null || urlExpiresAt.isAfter(LocalDateTime.now()));
    }

    /**
     * 检查文件是否可用
     */
    public boolean isFileAvailable() {
        return "READY".equals(status) || "COMPLETED".equals(status);
    }
}

