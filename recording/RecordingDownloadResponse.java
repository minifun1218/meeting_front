package org.cgdi.cgdimeeting.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
/**
 * 录制文件下载响应 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecordingDownloadResponse {

    /**
     * 下载URL
     */
    private String downloadUrl;

    /**
     * URL过期时间
     */
    private LocalDateTime expiresAt;

    /**
     * 文件名
     */
    private String fileName;

    /**
     * 文件大小
     */
    private Long fileSize;

    /**
     * 文件格式
     */
    private String fileFormat;

    /**
     * 是否为临时URL
     */
    private boolean isTemporary;

    /**
     * 下载提示信息
     */
    private String message;
}