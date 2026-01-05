package org.cgdi.cgdimeeting.controller;

import org.cgdi.cgdimeeting.dto.*;
import org.cgdi.cgdimeeting.entity.RecordingInfo;
import org.cgdi.cgdimeeting.entity.RecordingStatus;
import org.cgdi.cgdimeeting.service.RecordingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 录制文件管理控制器
 * 提供用户查询、下载录制文件和截图的接口
 */
@RestController
@RequestMapping("/api/recordings")
@RequiredArgsConstructor
@Validated
@Slf4j
public class RecordingController {

    private final RecordingService recordingService;

    /**
     * 根据房间名查询录制文件列表
     */
    @GetMapping("/room/{roomName}")
    public ResponseEntity<RecordingFileListResponse> getRecordingsByRoom(
            @PathVariable @NotBlank(message = "房间名不能为空") String roomName,
            @RequestParam(defaultValue = "0") @Min(value = 0, message = "页码不能小于0") int page,
            @RequestParam(defaultValue = "20") @Min(value = 1, message = "页面大小不能小于1") int size) {

        try {
            log.info("查询房间录制文件: roomName={}, page={}, size={}", roomName, page, size);

            RecordingFileListResponse response =
                    recordingService.getRecordingsByRoom(roomName, page, size);

            log.info("房间录制文件查询成功: roomName={}, totalElements={}",
                    roomName, response.getTotalElements());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("查询房间录制文件异常: roomName={}, error={}", roomName, e.getMessage(), e);
            throw new RuntimeException("查询录制文件失败: " + e.getMessage(), e);
        }
    }

    /**
     * 根据用户ID查询录制文件列表
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<RecordingFileListResponse> getRecordingsByUser(
            @PathVariable @NotBlank(message = "用户ID不能为空") String userId,
            @RequestParam(defaultValue = "0") @Min(value = 0, message = "页码不能小于0") int page,
            @RequestParam(defaultValue = "20") @Min(value = 1, message = "页面大小不能小于1") int size) {

        try {
            log.info("查询用户录制文件: userId={}, page={}, size={}", userId, page, size);

            RecordingFileListResponse response =
                    recordingService.getRecordingsByUser(userId, page, size);

            log.info("用户录制文件查询成功: userId={}, totalElements={}",
                    userId, response.getTotalElements());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("查询用户录制文件异常: userId={}, error={}", userId, e.getMessage(), e);
            throw new RuntimeException("查询录制文件失败: " + e.getMessage(), e);
        }
    }

    /**
     * 根据ID获取录制文件详情
     */
    @GetMapping("/{id}")
    public ResponseEntity<RecordingFileResponse> getRecordingById(
            @PathVariable @NotNull(message = "录制文件ID不能为空") Long id) {

        try {
            log.info("获取录制文件详情: id={}", id);

            RecordingFileResponse response = recordingService.getRecordingById(id);

            log.info("录制文件详情获取成功: id={}, fileName={}", id, response.getFileName());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("获取录制文件详情异常: id={}, error={}", id, e.getMessage(), e);
            throw new RuntimeException("获取录制文件详情失败: " + e.getMessage(), e);
        }
    }

    /**
     * 生成录制文件下载链接
     */
    @PostMapping("/{id}/download")
    public ResponseEntity<RecordingDownloadResponse> generateDownloadUrl(
            @PathVariable @NotNull(message = "录制文件ID不能为空") Long id) {

        try {
            log.info("生成录制文件下载链接: id={}", id);

            RecordingDownloadResponse response =
                    recordingService.generateDownloadUrl(id);

            log.info("下载链接生成成功: id={}, fileName={}, expiresAt={}",
                    id, response.getFileName(), response.getExpiresAt());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("生成下载链接异常: id={}, error={}", id, e.getMessage(), e);
            throw new RuntimeException("生成下载链接失败: " + e.getMessage(), e);
        }
    }

    /**
     * 获取录制文件下载链接（GET方式）
     */
    @GetMapping("/{id}/download")
    public ResponseEntity<RecordingDownloadResponse> getDownloadUrl(
            @PathVariable @NotNull(message = "录制文件ID不能为空") Long id) {

        return generateDownloadUrl(id);
    }

    /**
     * 根据房间名和时间范围查询录制文件
     */
    @GetMapping("/room/{roomName}/range")
    public ResponseEntity<RecordingFileListResponse> getRecordingsByRoomAndTimeRange(
            @PathVariable @NotBlank(message = "房间名不能为空") String roomName,
            @RequestParam(required = false) String startTime,
            @RequestParam(required = false) String endTime,
            @RequestParam(defaultValue = "0") @Min(value = 0, message = "页码不能小于0") int page,
            @RequestParam(defaultValue = "20") @Min(value = 1, message = "页面大小不能小于1") int size) {

        try {
            log.info("按时间范围查询房间录制文件: roomName={}, startTime={}, endTime={}, page={}, size={}",
                    roomName, startTime, endTime, page, size);

            // 当前示例仍调用基础查询，后续可在 service 中加入时间过滤
            RecordingFileListResponse response =
                    recordingService.getRecordingsByRoom(roomName, page, size);

            log.info("时间范围录制文件查询成功: roomName={}, totalElements={}",
                    roomName, response.getTotalElements());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("按时间范围查询录制文件异常: roomName={}, error={}", roomName, e.getMessage(), e);
            throw new RuntimeException("查询录制文件失败: " + e.getMessage(), e);
        }
    }

    /**
     * 搜索录制文件
     */
    @GetMapping("/search")
    public ResponseEntity<RecordingFileListResponse> searchRecordings(
            @RequestParam(required = false) String roomName,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String userName,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String fileName,
            @RequestParam(defaultValue = "0") @Min(value = 0, message = "页码不能小于0") int page,
            @RequestParam(defaultValue = "20") @Min(value = 1, message = "页面大小不能小于1") int size) {

        try {
            log.info("搜索录制文件: roomName={}, userId={}, userName={}, status={}, fileName={}, page={}, size={}",
                    roomName, userId, userName, status, fileName, page, size);

            RecordingFileListResponse response;

            if (roomName != null && !roomName.trim().isEmpty()) {
                response = recordingService.getRecordingsByRoom(roomName.trim(), page, size);
            } else if (userId != null && !userId.trim().isEmpty()) {
                response = recordingService.getRecordingsByUser(userId.trim(), page, size);
            } else {
                // 无条件时返回空结果
                RecordingFileListResponse.PageInfo pageInfo = RecordingFileListResponse.PageInfo.builder()
                        .totalElements(0L)
                        .totalPages(0)
                        .currentPage(page)
                        .pageSize(size)
                        .hasNext(false)
                        .hasPrevious(false)
                        .build();

                response = RecordingFileListResponse.builder()
                        .recordings(java.util.Collections.emptyList())
                        .pageInfo(pageInfo)
                        .build();
            }

            log.info("录制文件搜索完成: totalElements={}", response.getTotalElements());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("搜索录制文件异常: error={}", e.getMessage(), e);
            throw new RuntimeException("搜索录制文件失败: " + e.getMessage(), e);
        }
    }

    /**
     * 获取录制文件统计信息
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getRecordingStats(
            @RequestParam(required = false) String roomName,
            @RequestParam(required = false) String userId) {

        try {
            log.info("获取录制文件统计: roomName={}, userId={}", roomName, userId);

            Map<String, Object> stats = new HashMap<String, Object>();
            stats.put("totalRecordings", 0);
            stats.put("completedRecordings", 0);
            stats.put("failedRecordings", 0);
            stats.put("totalSize", 0L);
            stats.put("totalDuration", 0L);
            stats.put("lastUpdated", LocalDateTime.now());

            log.info("录制文件统计获取成功");

            return ResponseEntity.ok(stats);

        } catch (Exception e) {
            log.error("获取录制文件统计异常: error={}", e.getMessage(), e);
            throw new RuntimeException("获取统计信息失败: " + e.getMessage(), e);
        }
    }

    /**
     * 开始录制会议
     */
    @PostMapping("/start")
    public ResponseEntity<Map<String, Object>> startRecording(
            @Valid @RequestBody StartRecordingRequest request) {

        try {
            log.info("开始录制会议: roomName={}, userId={}, recordingName={}, format={}, quality={}",
                    request.getRoomName(), request.getUserId(), request.getRecordingName(),
                    request.getFormat(), request.getQuality());

            // 调用录制服务开始录制
            RecordingInfo recordingInfo = recordingService.startRecording(
                    request.getRoomName(),
                    request.getUserId(),
                    request.getRecordingName(),
                    request.getFormat(),
                    request.getQuality());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "录制已开始");
            response.put("recordingId", recordingInfo.getRecordingId());
            response.put("roomName", recordingInfo.getRoomName());
            response.put("recordingName", recordingInfo.getRecordingName());
            response.put("status", recordingInfo.getStatus());
            response.put("startTime", recordingInfo.getStartTime());
            response.put("format", recordingInfo.getFormat());
            response.put("quality", recordingInfo.getQuality());
            response.put("userId", recordingInfo.getCreatedBy());
            response.put("timestamp", LocalDateTime.now());
            
            log.info("录制开始成功: recordingId={}, roomName={}", recordingInfo.getRecordingId(), request.getRoomName());
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            log.warn("开始录制参数错误: roomName={}, userId={}, error={}", request.getRoomName(), request.getUserId(), e.getMessage());

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "参数错误: " + e.getMessage());
            errorResponse.put("roomName", request.getRoomName());
            errorResponse.put("userId", request.getUserId());
            errorResponse.put("timestamp", LocalDateTime.now());

            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            log.error("开始录制失败: roomName={}, userId={}, error={}", request.getRoomName(), request.getUserId(), e.getMessage(), e);

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "开始录制失败: " + e.getMessage());
            errorResponse.put("roomName", request.getRoomName());
            errorResponse.put("userId", request.getUserId());
            errorResponse.put("timestamp", LocalDateTime.now());

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * 停止录制会议
     */
    @PostMapping("/stop")
    public ResponseEntity<Map<String, Object>> stopRecording(
            @Valid @RequestBody StopRecordingRequest request) {

        try {
            log.info("停止录制会议: recordingId={}, userId={}", request.getRecordingId(), request.getUserId());

            // 调用录制服务停止录制
            RecordingInfo recordingInfo = recordingService.stopRecording(request.getRecordingId(), request.getUserId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "录制已停止");
            response.put("recordingId", recordingInfo.getRecordingId());
            response.put("status", recordingInfo.getStatus());
            response.put("endTime", recordingInfo.getEndTime());
            response.put("duration", recordingInfo.getDuration());
            response.put("fileSize", recordingInfo.getFileSize());
            response.put("userId", recordingInfo.getCreatedBy());
            response.put("downloadUrl", "/api/recordings/" + request.getRecordingId() + "/download");
            response.put("timestamp", LocalDateTime.now());
            
            log.info("录制停止成功: recordingId={}, userId={}", request.getRecordingId(), request.getUserId());
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            log.warn("停止录制参数错误: recordingId={}, userId={}, error={}", request.getRecordingId(), request.getUserId(), e.getMessage());

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "参数错误: " + e.getMessage());
            errorResponse.put("recordingId", request.getRecordingId());
            errorResponse.put("userId", request.getUserId());
            errorResponse.put("timestamp", LocalDateTime.now());

            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            log.error("停止录制失败: recordingId={}, userId={}, error={}", request.getRecordingId(), request.getUserId(), e.getMessage(), e);

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "停止录制失败: " + e.getMessage());
            errorResponse.put("recordingId", request.getRecordingId());
            errorResponse.put("userId", request.getUserId());
            errorResponse.put("timestamp", LocalDateTime.now());

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * 暂停录制会议
     */
    @PostMapping("/pause")
    public ResponseEntity<Map<String, Object>> pauseRecording(
            @Valid @RequestBody PauseRecordingRequest request) {

        try {
            log.info("暂停录制会议: recordingId={}, userId={}", request.getRecordingId(), request.getUserId());

            // 调用录制服务暂停录制
            RecordingInfo recordingInfo = recordingService.pauseRecording(request.getRecordingId(), request.getUserId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "录制已暂停");
            response.put("recordingId", recordingInfo.getRecordingId());
            response.put("status", recordingInfo.getStatus());
            response.put("pauseTime", recordingInfo.getPauseTime());
            response.put("userId", recordingInfo.getCreatedBy());
            response.put("currentDuration", recordingInfo.getCurrentDuration());
            response.put("timestamp", LocalDateTime.now());
            
            log.info("录制暂停成功: recordingId={}, userId={}", request.getRecordingId(), request.getUserId());
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            log.warn("暂停录制参数错误: recordingId={}, userId={}, error={}", request.getRecordingId(), request.getUserId(), e.getMessage());

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "参数错误: " + e.getMessage());
            errorResponse.put("recordingId", request.getRecordingId());
            errorResponse.put("userId", request.getUserId());
            errorResponse.put("timestamp", LocalDateTime.now());

            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            log.error("暂停录制失败: recordingId={}, userId={}, error={}", request.getRecordingId(), request.getUserId(), e.getMessage(), e);

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "暂停录制失败: " + e.getMessage());
            errorResponse.put("recordingId", request.getRecordingId());
            errorResponse.put("userId", request.getUserId());
            errorResponse.put("timestamp", LocalDateTime.now());

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * 继续录制会议
     */
    @PostMapping("/resume")
    public ResponseEntity<Map<String, Object>> resumeRecording(
            @Valid @RequestBody ResumeRecordingRequest request) {

        try {
            log.info("继续录制会议: recordingId={}, userId={}", request.getRecordingId(), request.getUserId());

            // 调用录制服务继续录制
            RecordingInfo recordingInfo = recordingService.resumeRecording(request.getRecordingId(), request.getUserId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "录制已继续");
            response.put("recordingId", recordingInfo.getRecordingId());
            response.put("status", recordingInfo.getStatus());
            response.put("resumeTime", recordingInfo.getResumeTime());
            response.put("userId", recordingInfo.getCreatedBy());
            response.put("totalPauseDuration", recordingInfo.getTotalPauseDuration());
            response.put("timestamp", LocalDateTime.now());
            
            log.info("录制继续成功: recordingId={}, userId={}", request.getRecordingId(), request.getUserId());
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            log.warn("继续录制参数错误: recordingId={}, userId={}, error={}", request.getRecordingId(), request.getUserId(), e.getMessage());

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "参数错误: " + e.getMessage());
            errorResponse.put("recordingId", request.getRecordingId());
            errorResponse.put("userId", request.getUserId());
            errorResponse.put("timestamp", LocalDateTime.now());

            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            log.error("继续录制失败: recordingId={}, userId={}, error={}", request.getRecordingId(), request.getUserId(), e.getMessage(), e);

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "继续录制失败: " + e.getMessage());
            errorResponse.put("recordingId", request.getRecordingId());
            errorResponse.put("userId", request.getUserId());
            errorResponse.put("timestamp", LocalDateTime.now());

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * 获取录制状态
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getRecordingStatus(
            @RequestParam @NotBlank(message = "录制ID不能为空") String recordingId,
            @RequestParam @NotBlank(message = "用户ID不能为空") String userId) {

        try {
            log.info("获取录制状态: recordingId={}, userId={}", recordingId, userId);

            // 调用录制服务获取录制状态
            RecordingStatus status = recordingService.getRecordingStatus(recordingId, userId);
            
            Map<String, Object> recordingStatus = new HashMap<>();
            recordingStatus.put("recordingId", status.getRecordingId());
            recordingStatus.put("status", status.getStatus());
            recordingStatus.put("startTime", status.getStartTime());
            recordingStatus.put("currentDuration", status.getCurrentDuration());
            recordingStatus.put("pauseDuration", status.getPauseDuration());
            recordingStatus.put("format", status.getFormat());
            recordingStatus.put("quality", status.getQuality());
            recordingStatus.put("fileSize", status.getFileSize());
            recordingStatus.put("participants", status.getParticipants());
            recordingStatus.put("userId", status.getCreatedBy());
            recordingStatus.put("timestamp", LocalDateTime.now());
            
            log.info("获取录制状态成功: recordingId={}, status={}", recordingId, status.getStatus());
            return ResponseEntity.ok(recordingStatus);
            
        } catch (IllegalArgumentException e) {
            log.warn("获取录制状态参数错误: recordingId={}, userId={}, error={}", recordingId, userId, e.getMessage());
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "参数错误: " + e.getMessage());
            errorResponse.put("recordingId", recordingId);
            errorResponse.put("userId", userId);
            errorResponse.put("timestamp", LocalDateTime.now());
            
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            log.error("获取录制状态失败: recordingId={}, userId={}, error={}", recordingId, userId, e.getMessage(), e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "获取录制状态失败: " + e.getMessage());
            errorResponse.put("recordingId", recordingId);
            errorResponse.put("userId", userId);
            errorResponse.put("timestamp", LocalDateTime.now());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * 获取录制文件下载 URL
     */
    @GetMapping("/{recordingId}/download-url")
    public ResponseEntity<Map<String, Object>> getRecordingDownloadUrl(
            @PathVariable String recordingId,
            @RequestParam String userId) {
        
        try {
            log.info("获取录制文件下载 URL: recordingId={}, userId={}", recordingId, userId);
            
            String downloadUrl = recordingService.getRecordingDownloadUrl(recordingId, userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "获取下载 URL 成功");
            Map<String, Object> data = new HashMap<>();
            data.put("recordingId", recordingId);
            data.put("downloadUrl", downloadUrl);
            data.put("expiresIn", 7200); // 2小时过期
            response.put("data", data);
            
            log.info("获取录制文件下载 URL 成功: recordingId={}", recordingId);
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            log.warn("获取录制文件下载 URL 参数错误: recordingId={}, userId={}, error={}", recordingId, userId, e.getMessage());
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());
            
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            log.error("获取录制文件下载 URL 失败: recordingId={}, userId={}, error={}", recordingId, userId, e.getMessage(), e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "获取下载 URL 失败: " + e.getMessage());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * 健康检查接口
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> resp = new HashMap<String, Object>();
        resp.put("status", "UP");
        resp.put("service", "recording-service-api");
        resp.put("timestamp", LocalDateTime.now());
        resp.put("version", "1.0.0");
        return ResponseEntity.ok(resp);
    }

    /**
     * 获取服务信息
     */
    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> info() {
        Map<String, Object> endpoints = new HashMap<String, Object>();
        endpoints.put("webhook", "/api/webhook/livekit/recording");
        endpoints.put("recordings", "/api/recordings");
        endpoints.put("health", "/api/recordings/health");

        Map<String, Object> resp = new HashMap<String, Object>();
        resp.put("serviceName", "Recording Service");
        resp.put("description", "录制文件管理服务");
        resp.put("version", "1.0.0");
        resp.put("features", java.util.Arrays.asList(
                "录制文件查询",
                "下载链接生成",
                "文件元数据管理",
                "LiveKit Webhook 集成"
        ));
        resp.put("endpoints", endpoints);
        resp.put("timestamp", LocalDateTime.now());

        return ResponseEntity.ok(resp);
    }

    /**
     * 全局异常处理（运行时）
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntimeException(RuntimeException e) {
        log.error("录制控制器运行时异常: error={}", e.getMessage(), e);

        Map<String, Object> resp = new HashMap<String, Object>();
        resp.put("success", false);
        resp.put("message", e.getMessage());
        resp.put("timestamp", LocalDateTime.now());
        return ResponseEntity.badRequest().body(resp);
    }

    /**
     * 参数验证异常处理
     */
    @ExceptionHandler(javax.validation.ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleValidationException(
            javax.validation.ConstraintViolationException e) {

        log.warn("录制控制器参数验证异常: error={}", e.getMessage());

        Map<String, Object> resp = new HashMap<String, Object>();
        resp.put("success", false);
        resp.put("message", "参数验证失败: " + e.getMessage());
        resp.put("timestamp", LocalDateTime.now());
        return ResponseEntity.badRequest().body(resp);
    }

    /**
     * 通用异常处理
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleException(Exception e) {
        log.error("录制控制器异常: error={}", e.getMessage(), e);

        Map<String, Object> resp = new HashMap<String, Object>();
        resp.put("success", false);
        resp.put("message", "服务器内部错误: " + e.getMessage());
        resp.put("timestamp", LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(resp);
    }
}

