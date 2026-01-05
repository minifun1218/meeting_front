package org.cgdi.cgdimeeting.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecordingCompletedEvent {

    /**
     * 事件类型
     */
    private String eventType;

    /**
     * Egress ID
     */
    private String egressId;

    /**
     * 房间名称
     */
    private String roomName;

    /**
     * 房间ID
     */
    private String roomId;

    /**
     * 录制状态
     */
    private String status;

    /**
     * 文件名
     */
    private String fileName;

    /**
     * 文件位置
     */
    private String fileLocation;

    /**
     * 文件大小（字节）
     */
    private Long fileSize;

    /**
     * 录制时长（秒）
     */
    private Long durationSeconds;

    /**
     * 下载URL
     */
    private String downloadUrl;

    /**
     * 录制开始时间
     */
    private LocalDateTime startedAt;

    /**
     * 录制结束时间
     */
    private LocalDateTime endedAt;

    /**
     * 事件创建时间
     */
    private LocalDateTime eventCreatedAt;

    /**
     * 错误信息（如果录制失败）
     */
    private String errorMessage;

    /**
     * 原始回调数据（JSON字符串）
     */
    private String originalCallbackData;

    /**
     * 录制发起用户ID
     */
    private String userId;

    /**
     * 录制发起用户名
     */
    private String userName;

    /**
     * 录制是否成功
     */
    private boolean isRecordingSuccessful;

    /**
     * 创建录制完成事件
     */
    public static RecordingCompletedEvent fromLiveKitWebhook(LiveKitWebhookEvent webhook, String originalData) {
        boolean isSuccessful = "EGRESS_COMPLETE".equals(webhook.getEgressInfo().getStatus()) ||
                "COMPLETE".equals(webhook.getEgressInfo().getStatus());
        return RecordingCompletedEvent.builder()
                .eventType("RECORDING_COMPLETED")
                .egressId(webhook.getEgressInfo().getEgressId())
                .roomName(webhook.getEgressInfo().getRoomName())
                .roomId(webhook.getEgressInfo().getRoomId())
                .status(webhook.getEgressInfo().getStatus())
                .fileName(webhook.getFileName())
                .fileLocation(webhook.getFileLocation())
                .fileSize(webhook.getFileSize())
                .durationSeconds(webhook.getDurationInSeconds())
                .downloadUrl(webhook.getDownloadUrl())
                .startedAt(webhook.getFormattedStartedAt())
                .endedAt(webhook.getFormattedEndedAt())
                .eventCreatedAt(LocalDateTime.now())
                .errorMessage(webhook.getEgressInfo().getError())
                .originalCallbackData(originalData)
                .isRecordingSuccessful(isSuccessful)
                .build();
    }

    /**
     * 创建录制失败事件
     */
    public static RecordingCompletedEvent createFailedEvent(String egressId, String roomName,
                                                            String errorMessage, String originalData) {
        return RecordingCompletedEvent.builder()
                .eventType("RECORDING_FAILED")
                .egressId(egressId)
                .roomName(roomName)
                .status("FAILED")
                .errorMessage(errorMessage)
                .eventCreatedAt(LocalDateTime.now())
                .originalCallbackData(originalData)
                .isRecordingSuccessful(false)
                .build();
    }

    /**
     * 检查录制是否成功
     */
    public boolean isSuccessful() {
        return "EGRESS_COMPLETE".equals(status) || "complete".equals(status);
    }

    /**
     * 检查录制是否失败
     */
    public boolean isFailed() {
        return "EGRESS_FAILED".equals(status) || "failed".equals(status) || "FAILED".equals(status);
    }

    /**
     * 获取文件扩展名
     */
    public String getFileExtension() {
        if (fileName != null && fileName.contains(".")) {
            return fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
        }
        return "mp4"; // 默认格式
    }

    /**
     * 获取存储对象键
     */
    public String getObjectKey() {
        if (fileLocation != null) {
            // 从文件位置提取对象键
            if (fileLocation.startsWith("oss://")) {
                String path = fileLocation.substring(6); // 移除 "oss://"
                int firstSlash = path.indexOf('/');
                if (firstSlash > 0) {
                    return path.substring(firstSlash + 1);
                }
            } else if (fileLocation.startsWith("minio://")) {
                String path = fileLocation.substring(8); // 移除 "minio://"
                int firstSlash = path.indexOf('/');
                if (firstSlash > 0) {
                    return path.substring(firstSlash + 1);
                }
            }
            return fileLocation;
        }
        return fileName;
    }

    /**
     * 获取存储桶名称
     */
    public String getBucketName() {
        if (fileLocation != null) {
            if (fileLocation.startsWith("oss://")) {
                String path = fileLocation.substring(6); // 移除 "oss://"
                int firstSlash = path.indexOf('/');
                if (firstSlash > 0) {
                    return path.substring(0, firstSlash);
                }
            } else if (fileLocation.startsWith("minio://")) {
                String path = fileLocation.substring(8); // 移除 "minio://"
                int firstSlash = path.indexOf('/');
                if (firstSlash > 0) {
                    return path.substring(0, firstSlash);
                }
            }
        }
        return "recordings"; // 默认桶名
    }
}
