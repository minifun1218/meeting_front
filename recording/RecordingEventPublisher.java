package org.cgdi.cgdimeeting.service;

import org.cgdi.cgdimeeting.dto.RecordingCompletedEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

/**
 * 录制事件发布服务
 * 负责将录制完成事件发布到消息队列
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RecordingEventPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    private static final String EXCHANGE_NAME = "recording.events";
    private static final String ROUTING_KEY_COMPLETED = "recording.completed";
    private static final String ROUTING_KEY_FAILED = "recording.failed";
    private static final String ROUTING_KEY_STATUS_UPDATE = "recording.status.update";
    private static final String ROUTING_KEY_FILE_PROCESSED = "recording.file.processed";
    private static final String ROUTING_KEY_CLEANUP = "recording.cleanup";

    /**
     * 发布录制完成事件
     */
    public void publishRecordingCompletedEvent(RecordingCompletedEvent event) {
        try {
            log.info("发布录制完成事件: egressId={}, roomName={}, status={}",
                    event.getEgressId(), event.getRoomName(), event.getStatus());

            // 发送消息到RabbitMQ
            rabbitTemplate.convertAndSend(EXCHANGE_NAME, ROUTING_KEY_COMPLETED, event, message -> {
                MessageProperties properties = message.getMessageProperties();
                properties.setHeader("eventType", event.getEventType());
                properties.setHeader("egressId", event.getEgressId());
                properties.setHeader("roomName", event.getRoomName());
                properties.setHeader("status", event.getStatus());
                properties.setHeader("timestamp", System.currentTimeMillis());
                return message;
            });

            log.info("录制完成事件发布成功: egressId={}", event.getEgressId());

        } catch (Exception e) {
            log.error("发布录制完成事件异常: egressId={}, error={}",
                    event.getEgressId(), e.getMessage(), e);
            throw new RuntimeException("发布录制完成事件失败: " + e.getMessage(), e);
        }
    }

    /**
     * 发布录制失败事件
     */
    public void publishRecordingFailedEvent(String egressId, String roomName,
                                            String errorMessage, String originalData) {
        try {
            log.warn("发布录制失败事件: egressId={}, roomName={}, error={}",
                    egressId, roomName, errorMessage);

            RecordingCompletedEvent failedEvent = RecordingCompletedEvent.createFailedEvent(
                    egressId, roomName, errorMessage, originalData);

            publishRecordingCompletedEvent(failedEvent);

        } catch (Exception e) {
            log.error("发布录制失败事件异常: egressId={}, error={}", egressId, e.getMessage(), e);
        }
    }

    /**
     * 发布录制状态更新事件
     */
    public void publishRecordingStatusUpdateEvent(String egressId, String roomName,
                                                  String oldStatus, String newStatus) {
        try {
            log.info("发布录制状态更新事件: egressId={}, roomName={}, {} -> {}",
                    egressId, roomName, oldStatus, newStatus);

            RecordingCompletedEvent statusEvent = RecordingCompletedEvent.builder()
                    .eventType("RECORDING_STATUS_UPDATED")
                    .egressId(egressId)
                    .roomName(roomName)
                    .status(newStatus)
                    .eventCreatedAt(java.time.LocalDateTime.now())
                    .build();

            // 发送消息到RabbitMQ
            rabbitTemplate.convertAndSend(EXCHANGE_NAME, ROUTING_KEY_STATUS_UPDATE, statusEvent, message -> {
                MessageProperties properties = message.getMessageProperties();
                properties.setHeader("eventType", "RECORDING_STATUS_UPDATED");
                properties.setHeader("egressId", egressId);
                properties.setHeader("roomName", roomName);
                properties.setHeader("oldStatus", oldStatus);
                properties.setHeader("newStatus", newStatus);
                properties.setHeader("timestamp", System.currentTimeMillis());
                return message;
            });

        } catch (Exception e) {
            log.error("发布录制状态更新事件异常: egressId={}, error={}", egressId, e.getMessage(), e);
        }
    }

    /**
     * 发布录制文件处理事件
     */
    public void publishRecordingFileProcessedEvent(String egressId, String roomName,
                                                   String fileName, String downloadUrl) {
        try {
            log.info("发布录制文件处理完成事件: egressId={}, fileName={}", egressId, fileName);

            RecordingCompletedEvent processedEvent = RecordingCompletedEvent.builder()
                    .eventType("RECORDING_FILE_PROCESSED")
                    .egressId(egressId)
                    .roomName(roomName)
                    .fileName(fileName)
                    .downloadUrl(downloadUrl)
                    .status("READY")
                    .eventCreatedAt(java.time.LocalDateTime.now())
                    .build();

            // 发送消息到RabbitMQ
            rabbitTemplate.convertAndSend(EXCHANGE_NAME, ROUTING_KEY_FILE_PROCESSED, processedEvent, message -> {
                MessageProperties properties = message.getMessageProperties();
                properties.setHeader("eventType", "RECORDING_FILE_PROCESSED");
                properties.setHeader("egressId", egressId);
                properties.setHeader("roomName", roomName);
                properties.setHeader("fileName", fileName);
                properties.setHeader("timestamp", System.currentTimeMillis());
                return message;
            });

        } catch (Exception e) {
            log.error("发布录制文件处理事件异常: egressId={}, error={}", egressId, e.getMessage(), e);
        }
    }

    /**
     * 发布通用录制事件
     */
    public void publishGenericRecordingEvent(String eventType, String egressId,
                                             String roomName, Object eventData) {
        try {
            log.info("发布通用录制事件: type={}, egressId={}, roomName={}",
                    eventType, egressId, roomName);

            // 发送消息到RabbitMQ
            String routingKey = determineRoutingKey(eventType);
            rabbitTemplate.convertAndSend(EXCHANGE_NAME, routingKey, eventData, message -> {
                MessageProperties properties = message.getMessageProperties();
                properties.setHeader("eventType", eventType);
                properties.setHeader("egressId", egressId);
                properties.setHeader("roomName", roomName);
                properties.setHeader("timestamp", System.currentTimeMillis());
                return message;
            });

        } catch (Exception e) {
            log.error("发布通用录制事件异常: type={}, egressId={}, error={}",
                    eventType, egressId, e.getMessage(), e);
        }
    }

    /**
     * 将对象转换为JSON字符串
     */
    private String toJsonString(Object object) {
        try {
            return objectMapper.writeValueAsString(object);
        } catch (JsonProcessingException e) {
            log.error("对象转JSON失败: {}", e.getMessage());
            return object.toString();
        }
    }

    /**
     * 根据事件类型确定路由键
     */
    private String determineRoutingKey(String eventType) {
        switch (eventType) {
            case "RECORDING_COMPLETED":
                return ROUTING_KEY_COMPLETED;
            case "RECORDING_FAILED":
                return ROUTING_KEY_FAILED;
            case "RECORDING_STATUS_UPDATED":
                return ROUTING_KEY_STATUS_UPDATE;
            case "RECORDING_FILE_PROCESSED":
                return ROUTING_KEY_FILE_PROCESSED;
            case "RECORDING_CLEANUP":
                return ROUTING_KEY_CLEANUP;
            default:
                return "recording.generic";
        }
    }

    /**
     * 发布录制清理事件
     */
    public void publishRecordingCleanupEvent(String egressId, String roomName, String reason) {
        try {
            log.info("发布录制清理事件: egressId={}, roomName={}, reason={}",
                    egressId, roomName, reason);

            RecordingCompletedEvent cleanupEvent = RecordingCompletedEvent.builder()
                    .eventType("RECORDING_CLEANUP")
                    .egressId(egressId)
                    .roomName(roomName)
                    .errorMessage(reason)
                    .eventCreatedAt(java.time.LocalDateTime.now())
                    .build();

            publishRecordingCompletedEvent(cleanupEvent);

        } catch (Exception e) {
            log.error("发布录制清理事件异常: egressId={}, error={}", egressId, e.getMessage(), e);
        }
    }
}