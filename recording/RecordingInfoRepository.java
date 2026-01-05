package org.cgdi.cgdimeeting.repository;

import org.cgdi.cgdimeeting.entity.RecordingInfo;
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
 * 录制信息数据访问层
 * 提供录制信息的数据库操作接口
 */
@Repository
public interface RecordingInfoRepository extends JpaRepository<RecordingInfo, String> {

    /**
     * 根据录制ID查找录制信息
     * @param recordingId 录制ID
     * @return 录制信息
     */
    Optional<RecordingInfo> findByRecordingId(String recordingId);

    /**
     * 根据创建者ID查找录制信息列表
     * @param createdBy 创建者ID
     * @param pageable 分页参数
     * @return 录制信息分页列表
     */
    Page<RecordingInfo> findByCreatedByAndIsDeletedOrderByCreatedAtDesc(String createdBy, Integer isDeleted, Pageable pageable);

    /**
     * 根据会议房间名称查找录制信息列表
     * @param roomName 会议房间名称
     * @param pageable 分页参数
     * @return 录制信息分页列表
     */
    Page<RecordingInfo> findByRoomNameAndIsDeletedOrderByCreatedAtDesc(String roomName, Integer isDeleted, Pageable pageable);

    /**
     * 根据状态查找录制信息列表
     * @param status 录制状态
     * @param pageable 分页参数
     * @return 录制信息分页列表
     */
    Page<RecordingInfo> findByStatusAndIsDeletedOrderByCreatedAtDesc(String status, Integer isDeleted, Pageable pageable);

    /**
     * 根据创建者ID和会议房间名称查找录制信息列表
     * @param createdBy 创建者ID
     * @param roomName 会议房间名称
     * @param pageable 分页参数
     * @return 录制信息分页列表
     */
    Page<RecordingInfo> findByCreatedByAndRoomNameAndIsDeletedOrderByCreatedAtDesc(String createdBy, String roomName, Integer isDeleted, Pageable pageable);

    /**
     * 查找指定时间范围内的录制信息
     * @param startTime 开始时间
     * @param endTime 结束时间
     * @param pageable 分页参数
     * @return 录制信息分页列表
     */
    @Query("SELECT r FROM RecordingInfo r WHERE r.createdAt BETWEEN :startTime AND :endTime AND r.isDeleted = 0 ORDER BY r.createdAt DESC")
    Page<RecordingInfo> findByCreatedAtBetween(@Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime, Pageable pageable);

    /**
     * 根据录制名称模糊查询
     * @param recordingName 录制名称关键字
     * @param pageable 分页参数
     * @return 录制信息分页列表
     */
    @Query("SELECT r FROM RecordingInfo r WHERE r.recordingName LIKE %:recordingName% AND r.isDeleted = 0 ORDER BY r.createdAt DESC")
    Page<RecordingInfo> findByRecordingNameContaining(@Param("recordingName") String recordingName, Pageable pageable);

    /**
     * 统计用户的录制数量
     * @param createdBy 创建者ID
     * @return 录制数量
     */
    @Query("SELECT COUNT(r) FROM RecordingInfo r WHERE r.createdBy = :createdBy AND r.isDeleted = 0")
    Long countByCreatedBy(@Param("createdBy") String createdBy);

    /**
     * 统计会议房间的录制数量
     * @param roomName 会议房间名称
     * @return 录制数量
     */
    @Query("SELECT COUNT(r) FROM RecordingInfo r WHERE r.roomName = :roomName AND r.isDeleted = 0")
    Long countByRoomName(@Param("roomName") String roomName);

    /**
     * 查找正在录制的会议
     * @return 正在录制的会议列表
     */
    @Query("SELECT r FROM RecordingInfo r WHERE r.status IN ('recording', 'paused') AND r.isDeleted = 0 ORDER BY r.startTime DESC")
    List<RecordingInfo> findActiveRecordings();

    /**
     * 根据MinIO路径查找录制信息
     * @param minioPath MinIO存储路径
     * @return 录制信息
     */
    Optional<RecordingInfo> findByMinioPathAndIsDeleted(String minioPath, Integer isDeleted);

    /**
     * 根据文件名查找录制信息
     * @param fileName 文件名
     * @return 录制信息列表
     */
    List<RecordingInfo> findByFileNameAndIsDeleted(String fileName, Integer isDeleted);

    /**
     * 软删除录制信息
     * @param recordingId 录制ID
     * @param updatedAt 更新时间
     */
    @Query("UPDATE RecordingInfo r SET r.isDeleted = 1, r.updatedAt = :updatedAt WHERE r.recordingId = :recordingId")
    void softDeleteByRecordingId(@Param("recordingId") String recordingId, @Param("updatedAt") LocalDateTime updatedAt);
}