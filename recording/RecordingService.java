package org.cgdi.cgdimeeting.service;

import org.cgdi.cgdimeeting.dto.RecordingCompletedEvent;
import org.cgdi.cgdimeeting.dto.RecordingDownloadResponse;
import org.cgdi.cgdimeeting.dto.RecordingFileListResponse;
import org.cgdi.cgdimeeting.dto.RecordingFileResponse;
import org.cgdi.cgdimeeting.entity.RecordingFile;
import org.cgdi.cgdimeeting.entity.RecordingInfo;
import org.cgdi.cgdimeeting.entity.RecordingStatus;
import org.cgdi.cgdimeeting.repository.RecordingFileRepository;
import org.cgdi.cgdimeeting.repository.RecordingInfoRepository;
import org.cgdi.cgdimeeting.repository.RecordingStatusRepository;
import org.cgdi.cgdimeeting.config.MinioConfig;
import io.minio.MinioClient;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.http.Method;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
/**
 * 录制服务
 * 管理录制文件元数据的核心业务逻辑
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RecordingService {

    private final RecordingFileRepository recordingFileRepository;
    private final RecordingInfoRepository recordingInfoRepository;
    private final RecordingStatusRepository recordingStatusRepository;
    private final FileStorageService fileStorageService;
    private final MinioClient minioClient;
    private final MinioConfig.MinioProperties minioProperties;

    /**
     * 保存录制文件信息
     */
    @Transactional
    public RecordingFile saveRecordingFile(RecordingCompletedEvent event) {
        try {
            log.info("保存录制文件信息: egressId={}, fileName={}",
                    event.getEgressId(), event.getFileName());

            // 检查是否已存在
            Optional<RecordingFile> existingFile = recordingFileRepository.findByEgressId(event.getEgressId());

            RecordingFile recordingFile;
            if (existingFile.isPresent()) {
                // 更新现有记录
                recordingFile = existingFile.get();
                updateRecordingFileFromEvent(recordingFile, event);
                log.info("更新现有录制文件记录: id={}, egressId={}",
                        recordingFile.getId(), event.getEgressId());
            } else {
                // 创建新记录
                recordingFile = createRecordingFileFromEvent(event);
                log.info("创建新录制文件记录: egressId={}", event.getEgressId());
            }

            // 设置文件存储信息
            if (StringUtils.hasText(event.getFileLocation())) {
                updateFileStorageInfo(recordingFile, event.getFileLocation());
            }

            // 生成下载URL
            if (StringUtils.hasText(recordingFile.getObjectKey())) {
                String downloadUrl = fileStorageService.generateDownloadUrl(
                        recordingFile.getBucketName(), recordingFile.getObjectKey());
                recordingFile.setDownloadUrl(downloadUrl);
                recordingFile.setUrlExpiresAt(fileStorageService.calculateUrlExpiration());
            }

            recordingFile.setUpdatedAt(LocalDateTime.now());
            RecordingFile savedFile = recordingFileRepository.save(recordingFile);

            log.info("录制文件信息保存成功: id={}, egressId={}, fileName={}",
                    savedFile.getId(), savedFile.getEgressId(), savedFile.getFileName());

            return savedFile;

        } catch (Exception e) {
            log.error("保存录制文件信息异常: egressId={}, error={}",
                    event.getEgressId(), e.getMessage(), e);
            throw new RuntimeException("保存录制文件信息失败: " + e.getMessage(), e);
        }
    }

    /**
     * 标记录制失败
     */
    @Transactional
    public void markRecordingFailed(String egressId, String errorMessage) {
        try {
            log.warn("标记录制失败: egressId={}, error={}", egressId, errorMessage);

            Optional<RecordingFile> recordingFile = recordingFileRepository.findByEgressId(egressId);

            if (recordingFile.isPresent()) {
                RecordingFile file = recordingFile.get();
                file.setStatus(RecordingFile.RecordingStatus.FAILED);
                file.setErrorMessage(errorMessage);
                file.setUpdatedAt(LocalDateTime.now());
                recordingFileRepository.save(file);

                log.info("录制失败状态已更新: id={}, egressId={}", file.getId(), egressId);
            } else {
                // 创建失败记录
                RecordingFile failedFile = RecordingFile.builder()
                        .egressId(egressId)
                        .status(RecordingFile.RecordingStatus.FAILED)
                        .errorMessage(errorMessage)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();
                recordingFileRepository.save(failedFile);

                log.info("创建录制失败记录: egressId={}", egressId);
            }

        } catch (Exception e) {
            log.error("标记录制失败异常: egressId={}, error={}", egressId, e.getMessage(), e);
            throw new RuntimeException("标记录制失败异常: " + e.getMessage(), e);
        }
    }

    /**
     * 更新录制状态
     */
    @Transactional
    public void updateRecordingStatus(String egressId, String status) {
        try {
            log.info("更新录制状态: egressId={}, status={}", egressId, status);

            Optional<RecordingFile> recordingFile = recordingFileRepository.findByEgressId(egressId);

            if (recordingFile.isPresent()) {
                RecordingFile file = recordingFile.get();
                file.setStatus(RecordingFile.RecordingStatus.valueOf(status.toUpperCase()));
                file.setUpdatedAt(LocalDateTime.now());
                recordingFileRepository.save(file);

                log.info("录制状态已更新: id={}, egressId={}, status={}",
                        file.getId(), egressId, status);
            } else {
                log.warn("未找到录制文件记录: egressId={}", egressId);
            }

        } catch (Exception e) {
            log.error("更新录制状态异常: egressId={}, error={}", egressId, e.getMessage(), e);
            throw new RuntimeException("更新录制状态失败: " + e.getMessage(), e);
        }
    }

    /**
     * 更新录制文件信息
     */
    @Transactional
    public void updateRecordingFileInfo(String egressId, String fileName, String downloadUrl) {
        try {
            log.info("更新录制文件信息: egressId={}, fileName={}", egressId, fileName);

            Optional<RecordingFile> recordingFile = recordingFileRepository.findByEgressId(egressId);

            if (recordingFile.isPresent()) {
                RecordingFile file = recordingFile.get();
                if (StringUtils.hasText(fileName)) {
                    file.setFileName(fileName);
                }
                if (StringUtils.hasText(downloadUrl)) {
                    file.setDownloadUrl(downloadUrl);
                    file.setUrlExpiresAt(fileStorageService.calculateUrlExpiration());
                }
                file.setUpdatedAt(LocalDateTime.now());
                recordingFileRepository.save(file);

                log.info("录制文件信息已更新: id={}, egressId={}", file.getId(), egressId);
            } else {
                log.warn("未找到录制文件记录: egressId={}", egressId);
            }

        } catch (Exception e) {
            log.error("更新录制文件信息异常: egressId={}, error={}", egressId, e.getMessage(), e);
            throw new RuntimeException("更新录制文件信息失败: " + e.getMessage(), e);
        }
    }

    /**
     * 清理录制记录
     */
    @Transactional
    public void cleanupRecording(String egressId, String reason) {
        try {
            log.info("清理录制记录: egressId={}, reason={}", egressId, reason);

            Optional<RecordingFile> recordingFile = recordingFileRepository.findByEgressId(egressId);

            if (recordingFile.isPresent()) {
                RecordingFile file = recordingFile.get();
                file.setStatus(RecordingFile.RecordingStatus.DELETED);
                file.setErrorMessage(reason);
                file.setUpdatedAt(LocalDateTime.now());
                recordingFileRepository.save(file);

                log.info("录制记录已标记为删除: id={}, egressId={}", file.getId(), egressId);
            } else {
                log.warn("未找到要清理的录制文件记录: egressId={}", egressId);
            }

        } catch (Exception e) {
            log.error("清理录制记录异常: egressId={}, error={}", egressId, e.getMessage(), e);
            throw new RuntimeException("清理录制记录失败: " + e.getMessage(), e);
        }
    }

    /**
     * 记录录制事件日志
     */
    public void logRecordingEvent(RecordingCompletedEvent event) {
        try {
            log.info("记录录制事件: type={}, egressId={}, roomName={}",
                    event.getEventType(), event.getEgressId(), event.getRoomName());

            // 这里可以将事件记录到专门的日志表或文件中
            // 暂时只记录到应用日志

        } catch (Exception e) {
            log.error("记录录制事件异常: egressId={}, error={}",
                    event.getEgressId(), e.getMessage(), e);
        }
    }

    /**
     * 记录死信事件
     */
    public void logDeadLetterEvent(RecordingCompletedEvent event, Map<String, Object> headers) {
        try {
            log.error("记录死信事件: egressId={}, eventType={}, headers={}",
                    event.getEgressId(), event.getEventType(), headers);

            // 这里可以将死信事件记录到专门的表中用于后续分析
            // 或者发送告警通知

        } catch (Exception e) {
            log.error("记录死信事件异常: egressId={}, error={}",
                    event.getEgressId(), e.getMessage(), e);
        }
    }

    /**
     * 根据房间名查询录制文件
     */
    public RecordingFileListResponse getRecordingsByRoom(
            String roomName, int page, int size) {
        try {
            log.info("查询房间录制文件: roomName={}, page={}, size={}", roomName, page, size);

            Pageable pageable = PageRequest.of(page, size,
                    Sort.by(Sort.Direction.DESC, "createdAt"));
            Page<RecordingFile> recordingPage = recordingFileRepository.findByRoomNameOrderByCreatedAtDesc(
                    roomName, pageable);

            List<RecordingFileResponse> recordings = recordingPage.getContent().stream()
                    .map(this::convertToResponse)
                    .collect(Collectors.toList());

            RecordingFileListResponse.PageInfo pageInfo =
                    RecordingFileListResponse.PageInfo.builder()
                            .currentPage(page)
                            .pageSize(size)
                            .totalElements(recordingPage.getTotalElements())
                            .totalPages(recordingPage.getTotalPages())
                            .hasNext(recordingPage.hasNext())
                            .hasPrevious(recordingPage.hasPrevious())
                            .build();

            return RecordingFileListResponse.builder()
                    .recordings(recordings)
                    .pageInfo(pageInfo)
                    .build();

        } catch (Exception e) {
            log.error("查询房间录制文件异常: roomName={}, error={}", roomName, e.getMessage(), e);
            throw new RuntimeException("查询录制文件失败: " + e.getMessage(), e);
        }
    }

    /**
     * 根据用户ID查询录制文件
     */
    public RecordingFileListResponse getRecordingsByUser(
            String userId, int page, int size) {
        try {
            log.info("查询用户录制文件: userId={}, page={}, size={}", userId, page, size);

            Pageable pageable = PageRequest.of(page, size,
                    Sort.by(Sort.Direction.DESC, "createdAt"));
            Page<RecordingFile> recordingPage = recordingFileRepository.findByUserIdOrderByCreatedAtDesc(
                    userId, pageable);

            List<RecordingFileResponse> recordings = recordingPage.getContent().stream()
                    .map(this::convertToResponse)
                    .collect(Collectors.toList());

            RecordingFileListResponse.PageInfo pageInfo =
                    RecordingFileListResponse.PageInfo.builder()
                            .currentPage(page)
                            .pageSize(size)
                            .totalElements(recordingPage.getTotalElements())
                            .totalPages(recordingPage.getTotalPages())
                            .hasNext(recordingPage.hasNext())
                            .hasPrevious(recordingPage.hasPrevious())
                            .build();

            return RecordingFileListResponse.builder()
                    .recordings(recordings)
                    .pageInfo(pageInfo)
                    .build();

        } catch (Exception e) {
            log.error("查询用户录制文件异常: userId={}, error={}", userId, e.getMessage(), e);
            throw new RuntimeException("查询录制文件失败: " + e.getMessage(), e);
        }
    }

    /**
     * 根据ID获取录制文件详情
     */
    public RecordingFileResponse getRecordingById(Long id) {
        try {
            log.info("获取录制文件详情: id={}", id);

            Optional<RecordingFile> recordingFile = recordingFileRepository.findById(id);

            if (recordingFile.isPresent()) {
                RecordingFile file = recordingFile.get();

                // 检查下载URL是否过期，如果过期则重新生成
                if (file.getUrlExpiresAt() != null && file.getUrlExpiresAt().isBefore(LocalDateTime.now())) {
                    if (StringUtils.hasText(file.getObjectKey())) {
                        String newDownloadUrl = fileStorageService.generateDownloadUrl(
                                file.getBucketName(), file.getObjectKey());
                        file.setDownloadUrl(newDownloadUrl);
                        file.setUrlExpiresAt(fileStorageService.calculateUrlExpiration());
                        recordingFileRepository.save(file);

                        log.info("下载URL已更新: id={}, egressId={}", id, file.getEgressId());
                    }
                }

                return convertToResponse(file);
            } else {
                log.warn("未找到录制文件: id={}", id);
                throw new RuntimeException("录制文件不存在: " + id);
            }

        } catch (Exception e) {
            log.error("获取录制文件详情异常: id={}, error={}", id, e.getMessage(), e);
            throw new RuntimeException("获取录制文件详情失败: " + e.getMessage(), e);
        }
    }

    /**
     * 生成录制文件下载链接
     */
    public RecordingDownloadResponse generateDownloadUrl(Long id) {
        try {
            log.info("生成录制文件下载链接: id={}", id);

            Optional<RecordingFile> recordingFile = recordingFileRepository.findById(id);

            if (recordingFile.isPresent()) {
                RecordingFile file = recordingFile.get();

                if (!StringUtils.hasText(file.getObjectKey())) {
                    throw new RuntimeException("录制文件对象键为空");
                }

                String downloadUrl = fileStorageService.generateDownloadUrl(
                        file.getBucketName(), file.getObjectKey());
                LocalDateTime expiresAt = fileStorageService.calculateUrlExpiration();

                // 更新数据库中的URL和过期时间
                file.setDownloadUrl(downloadUrl);
                file.setUrlExpiresAt(expiresAt);
                file.setUpdatedAt(LocalDateTime.now());
                recordingFileRepository.save(file);

                return RecordingDownloadResponse.builder()
                        .fileName(file.getFileName())
                        .downloadUrl(downloadUrl)
                        .expiresAt(expiresAt)
                        .fileSize(file.getFileSize())
                        .fileFormat(file.getFileFormat())
                        .isTemporary(true)
                        .message("下载链接已生成，请在过期前完成下载")
                        .build();

            } else {
                log.warn("未找到录制文件: id={}", id);
                throw new RuntimeException("录制文件不存在: " + id);
            }

        } catch (Exception e) {
            log.error("生成下载链接异常: id={}, error={}", id, e.getMessage(), e);
            throw new RuntimeException("生成下载链接失败: " + e.getMessage(), e);
        }
    }

    /**
     * 从事件创建录制文件实体
     */
    private RecordingFile createRecordingFileFromEvent(RecordingCompletedEvent event) {
        return RecordingFile.builder()
                .egressId(event.getEgressId())
                .roomName(event.getRoomName())
                .userId(event.getUserId())
                .userName(event.getUserName())
                .status(event.isRecordingSuccessful() ?
                        RecordingFile.RecordingStatus.COMPLETED : RecordingFile.RecordingStatus.FAILED)
                .fileName(event.getFileName())
                .filePath(event.getFileLocation())
                .fileSize(event.getFileSize())
                .durationSeconds(event.getDurationSeconds())
                .fileFormat(event.getFileExtension())
                .startedAt(event.getStartedAt())
                .endedAt(event.getEndedAt())
                .errorMessage(event.getErrorMessage())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    /**
     * 从事件更新录制文件实体
     */
    private void updateRecordingFileFromEvent(RecordingFile file, RecordingCompletedEvent event) {
        if (StringUtils.hasText(event.getRoomName())) {
            file.setRoomName(event.getRoomName());
        }
        if (StringUtils.hasText(event.getUserId())) {
            file.setUserId(event.getUserId());
        }
        if (StringUtils.hasText(event.getUserName())) {
            file.setUserName(event.getUserName());
        }
        if (StringUtils.hasText(event.getFileName())) {
            file.setFileName(event.getFileName());
        }
        if (StringUtils.hasText(event.getFileLocation())) {
            file.setFilePath(event.getFileLocation());
        }
        if (event.getFileSize() != null && event.getFileSize() > 0) {
            file.setFileSize(event.getFileSize());
        }
        if (event.getDurationSeconds() != null && event.getDurationSeconds() > 0) {
            file.setDurationSeconds(event.getDurationSeconds());
        }
        if (event.getStartedAt() != null) {
            file.setStartedAt(event.getStartedAt());
        }
        if (event.getEndedAt() != null) {
            file.setEndedAt(event.getEndedAt());
        }
        if (StringUtils.hasText(event.getErrorMessage())) {
            file.setErrorMessage(event.getErrorMessage());
        }
        if (StringUtils.hasText(event.getOriginalCallbackData())) {
            file.setCallbackData(event.getOriginalCallbackData());
        }

        file.setStatus(event.isRecordingSuccessful() ?
                RecordingFile.RecordingStatus.COMPLETED : RecordingFile.RecordingStatus.FAILED);
    }

    /**
     * 更新文件存储信息
     */
    private void updateFileStorageInfo(RecordingFile file, String fileLocation) {
        try {
            // 解析文件位置，提取存储桶和对象键
            String bucketName = fileStorageService.getBucketName();
            String objectKey = fileStorageService.extractObjectKeyFromLocation(fileLocation);
            file.setBucketName(bucketName);
            file.setObjectKey(objectKey);
            file.setStorageType(fileStorageService.getStorageType());

        } catch (Exception e) {
            log.error("更新文件存储信息异常: fileLocation={}, error={}",
                    fileLocation, e.getMessage(), e);
        }
    }

    /**
     * 转换为响应对象
     */
    private RecordingFileResponse convertToResponse(RecordingFile file) {
        return RecordingFileResponse.builder()
                .id(file.getId())
                .egressId(file.getEgressId())
                .roomName(file.getRoomName())
                .userId(file.getUserId())
                .userName(file.getUserName())
                .status(file.getStatus().name())
                .fileName(file.getFileName())
                .fileSize(file.getFileSize())
                .durationSeconds(file.getDurationSeconds())
                .fileFormat(file.getFileFormat())
                .downloadUrl(file.getDownloadUrl())
                .urlExpiresAt(file.getUrlExpiresAt())
                .thumbnailPath(file.getThumbnailPath())
                .startedAt(file.getStartedAt())
                .endedAt(file.getEndedAt())
                .createdAt(file.getCreatedAt())
                .updatedAt(file.getUpdatedAt())
                .errorMessage(file.getErrorMessage())
                .build();
    }

    // ==================== 录制控制相关方法 ====================

    /**
     * 开始录制会议
     */
    @Transactional
    public RecordingInfo startRecording(String roomName, String userId, String recordingName, String format, String quality) {
        try {
            log.info("开始录制会议: roomName={}, userId={}, recordingName={}", roomName, userId, recordingName);

            // 验证参数
            if (!StringUtils.hasText(roomName) || !StringUtils.hasText(userId)) {
                throw new IllegalArgumentException("房间名称和用户ID不能为空");
            }

            // 如果录制名称为空，生成默认名称
            if (!StringUtils.hasText(recordingName)) {
                recordingName = roomName + "_recording_" + System.currentTimeMillis();
            }

            // 生成录制ID
            String recordingId = "rec_" + System.currentTimeMillis() + "_" + userId;

            // 创建录制信息
            RecordingInfo recordingInfo = RecordingInfo.builder()
                    .recordingId(recordingId)
                    .roomName(roomName)
                    .recordingName(recordingName)
                    .createdBy(userId)
                    .status("recording")
                    .format(format != null ? format : "mp4")
                    .quality(quality != null ? quality : "720p")
                    .minioBucket("recordings")
                    .fileName(recordingName + "_" + System.currentTimeMillis() + "." + (format != null ? format : "mp4"))
                    .participants(1)
                    .startTime(LocalDateTime.now())
                    .build();

            // 保存录制信息
            recordingInfo = recordingInfoRepository.save(recordingInfo);

            // 创建录制状态
            RecordingStatus recordingStatus = RecordingStatus.builder()
                    .recordingId(recordingId)
                    .roomName(roomName)
                    .createdBy(userId)
                    .status("recording")
                    .format(format != null ? format : "mp4")
                    .quality(quality != null ? quality : "720p")
                    .currentDuration(0)
                    .pauseDuration(0)
                    .participants(1)
                    .startTime(LocalDateTime.now())
                    .progress(0)
                    .build();

            recordingStatusRepository.save(recordingStatus);

            log.info("录制开始成功: recordingId={}", recordingId);
            return recordingInfo;

        } catch (Exception e) {
            log.error("开始录制失败: roomName={}, userId={}, error={}", roomName, userId, e.getMessage(), e);
            throw new RuntimeException("开始录制失败: " + e.getMessage(), e);
        }
    }

    /**
     * 停止录制会议
     */
    @Transactional
    public RecordingInfo stopRecording(String recordingId, String userId) {
        try {
            log.info("停止录制会议: recordingId={}, userId={}", recordingId, userId);

            // 验证参数
            if (!StringUtils.hasText(recordingId) || !StringUtils.hasText(userId)) {
                throw new IllegalArgumentException("录制ID和用户ID不能为空");
            }

            // 查找录制信息
            Optional<RecordingInfo> recordingInfoOpt = recordingInfoRepository.findById(recordingId);
            if (!recordingInfoOpt.isPresent()) {
                throw new IllegalArgumentException("录制不存在: " + recordingId);
            }

            RecordingInfo recordingInfo = recordingInfoOpt.get();

            // 验证权限
            if (!recordingInfo.getCreatedBy().equals(userId)) {
                throw new IllegalArgumentException("无权限停止此录制");
            }

            // 更新录制信息
            recordingInfo.setStatus("stopped");
            recordingInfo.setEndTime(LocalDateTime.now());
            
            // 计算录制时长
            if (recordingInfo.getStartTime() != null) {
                long duration = java.time.Duration.between(recordingInfo.getStartTime(), LocalDateTime.now()).getSeconds();
                recordingInfo.setDuration((int) duration);
            }

            recordingInfo = recordingInfoRepository.save(recordingInfo);

            // 更新录制状态
            Optional<RecordingStatus> statusOpt = recordingStatusRepository.findByRecordingId(recordingId);
            if (statusOpt.isPresent()) {
                RecordingStatus status = statusOpt.get();
                status.setStatus("stopped");
                status.setProgress(100);
                recordingStatusRepository.save(status);
            }

            log.info("录制停止成功: recordingId={}", recordingId);
            return recordingInfo;

        } catch (Exception e) {
            log.error("停止录制失败: recordingId={}, userId={}, error={}", recordingId, userId, e.getMessage(), e);
            throw new RuntimeException("停止录制失败: " + e.getMessage(), e);
        }
    }

    /**
     * 暂停录制会议
     */
    @Transactional
    public RecordingInfo pauseRecording(String recordingId, String userId) {
        try {
            log.info("暂停录制会议: recordingId={}, userId={}", recordingId, userId);

            // 验证参数
            if (!StringUtils.hasText(recordingId) || !StringUtils.hasText(userId)) {
                throw new IllegalArgumentException("录制ID和用户ID不能为空");
            }

            // 查找录制信息
            Optional<RecordingInfo> recordingInfoOpt = recordingInfoRepository.findById(recordingId);
            if (!recordingInfoOpt.isPresent()) {
                throw new IllegalArgumentException("录制不存在: " + recordingId);
            }

            RecordingInfo recordingInfo = recordingInfoOpt.get();

            // 验证权限和状态
            if (!recordingInfo.getCreatedBy().equals(userId)) {
                throw new IllegalArgumentException("无权限暂停此录制");
            }

            if (!"recording".equals(recordingInfo.getStatus())) {
                throw new IllegalArgumentException("只能暂停正在录制的会议");
            }

            // 更新录制信息
            recordingInfo.setStatus("paused");
            recordingInfo = recordingInfoRepository.save(recordingInfo);

            // 更新录制状态
            Optional<RecordingStatus> statusOpt = recordingStatusRepository.findByRecordingId(recordingId);
            if (statusOpt.isPresent()) {
                RecordingStatus status = statusOpt.get();
                status.setStatus("paused");
                status.setLastPauseTime(LocalDateTime.now());
                recordingStatusRepository.save(status);
            }

            log.info("录制暂停成功: recordingId={}", recordingId);
            return recordingInfo;

        } catch (Exception e) {
            log.error("暂停录制失败: recordingId={}, userId={}, error={}", recordingId, userId, e.getMessage(), e);
            throw new RuntimeException("暂停录制失败: " + e.getMessage(), e);
        }
    }

    /**
     * 继续录制会议
     */
    @Transactional
    public RecordingInfo resumeRecording(String recordingId, String userId) {
        try {
            log.info("继续录制会议: recordingId={}, userId={}", recordingId, userId);

            // 验证参数
            if (!StringUtils.hasText(recordingId) || !StringUtils.hasText(userId)) {
                throw new IllegalArgumentException("录制ID和用户ID不能为空");
            }

            // 查找录制信息
            Optional<RecordingInfo> recordingInfoOpt = recordingInfoRepository.findById(recordingId);
            if (!recordingInfoOpt.isPresent()) {
                throw new IllegalArgumentException("录制不存在: " + recordingId);
            }

            RecordingInfo recordingInfo = recordingInfoOpt.get();

            // 验证权限和状态
            if (!recordingInfo.getCreatedBy().equals(userId)) {
                throw new IllegalArgumentException("无权限恢复此录制");
            }

            if (!"paused".equals(recordingInfo.getStatus())) {
                throw new IllegalArgumentException("只能恢复已暂停的录制");
            }

            // 更新录制信息
            recordingInfo.setStatus("recording");
            recordingInfo = recordingInfoRepository.save(recordingInfo);

            // 更新录制状态
            Optional<RecordingStatus> statusOpt = recordingStatusRepository.findByRecordingId(recordingId);
            if (statusOpt.isPresent()) {
                RecordingStatus status = statusOpt.get();
                status.setStatus("recording");
                status.setLastResumeTime(LocalDateTime.now());
                recordingStatusRepository.save(status);
            }

            log.info("录制恢复成功: recordingId={}", recordingId);
            return recordingInfo;

        } catch (Exception e) {
            log.error("恢复录制失败: recordingId={}, userId={}, error={}", recordingId, userId, e.getMessage(), e);
            throw new RuntimeException("恢复录制失败: " + e.getMessage(), e);
        }
    }

    /**
     * 获取录制状态
     */
    public RecordingStatus getRecordingStatus(String recordingId, String userId) {
        try {
            log.info("获取录制状态: recordingId={}, userId={}", recordingId, userId);

            // 验证参数
            if (!StringUtils.hasText(recordingId) || !StringUtils.hasText(userId)) {
                throw new IllegalArgumentException("录制ID和用户ID不能为空");
            }

            // 查找录制状态
            Optional<RecordingStatus> statusOpt = recordingStatusRepository.findByRecordingId(recordingId);
            if (!statusOpt.isPresent()) {
                throw new IllegalArgumentException("录制状态不存在: " + recordingId);
            }

            RecordingStatus status = statusOpt.get();

            // 验证权限
            if (!status.getCreatedBy().equals(userId)) {
                throw new IllegalArgumentException("无权限查看此录制状态");
            }

            log.info("获取录制状态成功: recordingId={}, status={}", recordingId, status.getStatus());
            return status;

        } catch (Exception e) {
            log.error("获取录制状态失败: recordingId={}, userId={}, error={}", recordingId, userId, e.getMessage(), e);
            throw new RuntimeException("获取录制状态失败: " + e.getMessage(), e);
        }
    }

    /**
     * 初始化 MinIO 存储桶
     */
    private void initializeBucket() {
        try {
            String bucketName = minioProperties.getBucketName();
            boolean bucketExists = minioClient.bucketExists(BucketExistsArgs.builder()
                    .bucket(bucketName)
                    .build());
            
            if (!bucketExists) {
                minioClient.makeBucket(MakeBucketArgs.builder()
                        .bucket(bucketName)
                        .region(minioProperties.getRegion())
                        .build());
                log.info("MinIO 存储桶创建成功: {}", bucketName);
            }
        } catch (Exception e) {
            log.error("初始化 MinIO 存储桶失败: {}", e.getMessage(), e);
            throw new RuntimeException("初始化 MinIO 存储桶失败", e);
        }
    }

    /**
     * 生成录制文件的 MinIO 路径
     */
    private String generateMinioPath(String recordingId, String fileName) {
        String pathPrefix = minioProperties.getPathPrefix();
        if (!pathPrefix.endsWith("/")) {
            pathPrefix += "/";
        }
        return pathPrefix + recordingId + "/" + fileName;
    }

    /**
     * 获取录制文件的预签名下载 URL
     */
    public String getRecordingDownloadUrl(String recordingId, String userId) {
        try {
            // 验证权限
            Optional<RecordingInfo> recordingInfoOpt = recordingInfoRepository.findById(recordingId);
            if (!recordingInfoOpt.isPresent()) {
                throw new IllegalArgumentException("录制不存在: " + recordingId);
            }

            RecordingInfo recordingInfo = recordingInfoOpt.get();
            if (!recordingInfo.getCreatedBy().equals(userId)) {
                throw new IllegalArgumentException("无权限下载此录制文件");
            }

            // 生成预签名 URL
            String objectName = recordingInfo.getMinioPath();
            String url = minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(minioProperties.getBucketName())
                            .object(objectName)
                            .expiry(minioProperties.getUrlExpiration(), TimeUnit.SECONDS)
                            .build());

            log.info("生成录制文件下载 URL 成功: recordingId={}", recordingId);
            return url;

        } catch (Exception e) {
            log.error("生成录制文件下载 URL 失败: recordingId={}, error={}", recordingId, e.getMessage(), e);
            throw new RuntimeException("生成下载 URL 失败: " + e.getMessage(), e);
        }
    }

    /**
     * 检查录制文件格式是否允许
     */
    private boolean isAllowedFormat(String contentType) {
        if (!StringUtils.hasText(contentType)) {
            return false;
        }
        
        String[] allowedTypes = minioProperties.getAllowedContentTypes();
        for (String allowedType : allowedTypes) {
            if (contentType.toLowerCase().contains(allowedType.toLowerCase())) {
                return true;
            }
        }
        return false;
    }

    /**
     * 验证文件大小是否在允许范围内
     */
    private boolean isValidFileSize(long fileSize) {
        return fileSize > 0 && fileSize <= minioProperties.getMaxFileSize();
    }
}
