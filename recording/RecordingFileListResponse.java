package org.cgdi.cgdimeeting.dto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 录制文件列表响应 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecordingFileListResponse {

    /**
     * 录制文件列表
     */
    private List<RecordingFileResponse> recordings;

    /**
     * 分页信息
     */
    private PageInfo pageInfo;

    /**
     * 统计信息
     */
    private StatisticsInfo statistics;

    /**
     * 获取总元素数量
     * 便于直接访问分页信息中的总元素数
     */
    public Long getTotalElements() {
        return pageInfo != null ? pageInfo.getTotalElements() : 0L;
    }

    /**
     * 分页信息
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PageInfo {
        private int currentPage;
        private int pageSize;
        private long totalElements;
        private int totalPages;
        private boolean hasNext;
        private boolean hasPrevious;
    }

    /**
     * 统计信息
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StatisticsInfo {
        private long totalRecordings;
        private long totalFileSize;
        private String totalFileSizeFormatted;
        private long totalDuration;
        private String totalDurationFormatted;
    }
}


