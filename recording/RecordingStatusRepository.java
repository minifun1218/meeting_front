package org.cgdi.cgdimeeting.repository;

import org.cgdi.cgdimeeting.entity.RecordingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 录制状态数据访问层
 * 提供录制状态的数据库操作接口
 */
@Repository
public interface RecordingStatusRepository extends JpaRepository<RecordingStatus, Long> {

    /**
     * 根据录制ID查找录制状态
     * @param recordingId 录制ID
     * @return 录制状态
     */
    Optional<RecordingStatus> findByRecordingId(String recordingId);

    /**
     * 根据录制ID和用户ID查找录制状态
     * @param recordingId 录制ID
     * @param createdBy 创建者ID
     * @return 录制状态
     */
    Optional<RecordingStatus> findByRecordingIdAndCreatedBy(String recordingId, String createdBy);

    /**
     * 根据创建者ID查找录制状态列表
     * @param createdBy 创建者ID
     * @param pageable 分页参数
     * @return 录制状态分页列表
     */
    Page<RecordingStatus> findByCreatedByAndIsDeletedOrderByCreatedAtDesc(String createdBy, Integer isDeleted, Pageable pageable);

    /**
     * 根据会议房间名称查找录制状态列表
     * @param roomName 会议房间名称
     * @param pageable 分页参数
     * @return 录制状态分页列表
     */
    Page<RecordingStatus> findByRoomNameAndIsDeletedOrderByCreatedAtDesc(String roomName, Integer isDeleted, Pageable pageable);

    /**
     * 根据状态查找录制状态列表
     * @param status 录制状态
     * @param pageable 分页参数
     * @return 录制状态分页列表
     */
    Page<RecordingStatus> findByStatusAndIsDeletedOrderByCreatedAtDesc(String status, Integer isDeleted, Pageable pageable);

    /**
     * 查找正在录制的状态
     * @return 正在录制的状态列表
     */
    @Query("SELECT rs FROM RecordingStatus rs WHERE rs.status IN ('recording', 'paused') AND rs.isDeleted = 0 ORDER BY rs.startTime DESC")
    List<RecordingStatus> findActiveRecordingStatuses();

    /**
     * 根据创建者ID查找正在录制的状态
     * @param createdBy 创建者ID
     * @return 正在录制的状态列表
     */
    @Query("SELECT rs FROM RecordingStatus rs WHERE rs.createdBy = :createdBy AND rs.status IN ('recording', 'paused') AND rs.isDeleted = 0 ORDER BY rs.startTime DESC")
    List<RecordingStatus> findActiveRecordingStatusesByCreatedBy(@Param("createdBy") String createdBy);

    /**
     * 根据会议房间名称查找正在录制的状态
     * @param roomName 会议房间名称
     * @return 正在录制的状态列表
     */
    @Query("SELECT rs FROM RecordingStatus rs WHERE rs.roomName = :roomName AND rs.status IN ('recording', 'paused') AND rs.isDeleted = 0 ORDER BY rs.startTime DESC")
    List<RecordingStatus> findActiveRecordingStatusesByRoomName(@Param("roomName") String roomName);

    /**
     * 查找指定时间范围内的录制状态
     * @param startTime 开始时间
     * @param endTime 结束时间
     * @param pageable 分页参数
     * @return 录制状态分页列表
     */
    @Query("SELECT rs FROM RecordingStatus rs WHERE rs.createdAt BETWEEN :startTime AND :endTime AND rs.isDeleted = 0 ORDER BY rs.createdAt DESC")
    Page<RecordingStatus> findByCreatedAtBetween(@Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime, Pageable pageable);

    /**
     * 统计用户的录制状态数量
     * @param createdBy 创建者ID
     * @return 录制状态数量
     */
    @Query("SELECT COUNT(rs) FROM RecordingStatus rs WHERE rs.createdBy = :createdBy AND rs.isDeleted = 0")
    Long countByCreatedBy(@Param("createdBy") String createdBy);

    /**
     * 统计会议房间的录制状态数量
     * @param roomName 会议房间名称
     * @return 录制状态数量
     */
    @Query("SELECT COUNT(rs) FROM RecordingStatus rs WHERE rs.roomName = :roomName AND rs.isDeleted = 0")
    Long countByRoomName(@Param("roomName") String roomName);

    /**
     * 根据状态统计录制数量
     * @param status 录制状态
     * @return 录制数量
     */
    @Query("SELECT COUNT(rs) FROM RecordingStatus rs WHERE rs.status = :status AND rs.isDeleted = 0")
    Long countByStatus(@Param("status") String status);

    /**
     * 查找失败的录制状态
     * @param pageable 分页参数
     * @return 失败的录制状态分页列表
     */
    @Query("SELECT rs FROM RecordingStatus rs WHERE rs.status = 'failed' AND rs.isDeleted = 0 ORDER BY rs.updatedAt DESC")
    Page<RecordingStatus> findFailedRecordings(Pageable pageable);

    /**
     * 查找长时间未更新的录制状态（可能异常）
     * @param beforeTime 指定时间之前
     * @return 长时间未更新的录制状态列表
     */
    @Query("SELECT rs FROM RecordingStatus rs WHERE rs.status IN ('recording', 'paused') AND rs.updatedAt < :beforeTime AND rs.isDeleted = 0")
    List<RecordingStatus> findStaleRecordings(@Param("beforeTime") LocalDateTime beforeTime);

    /**
     * 软删除录制状态
     * @param recordingId 录制ID
     * @param updatedAt 更新时间
     */
    @Query("UPDATE RecordingStatus rs SET rs.isDeleted = 1, rs.updatedAt = :updatedAt WHERE rs.recordingId = :recordingId")
    void softDeleteByRecordingId(@Param("recordingId") String recordingId, @Param("updatedAt") LocalDateTime updatedAt);

    /**
     * 根据录制ID删除录制状态
     * @param recordingId 录制ID
     */
    void deleteByRecordingId(String recordingId);

    /**
     * 检查录制ID是否存在
     * @param recordingId 录制ID
     * @return 是否存在
     */
    boolean existsByRecordingIdAndIsDeleted(String recordingId, Integer isDeleted);
}