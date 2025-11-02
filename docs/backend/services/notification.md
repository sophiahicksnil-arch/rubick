# 通知服务

## 概述

通知服务是 Rubick 后端的核心服务之一，负责处理系统通知、用户消息、邮件发送、推送通知等功能。本文档详细介绍通知服务的设计、实现和使用方法。

## 功能特性

- 实时通知推送
- 邮件通知
- 站内消息
- 通知模板管理
- 通知偏好设置
- 批量通知处理
- 通知历史记录
- 多渠道通知支持

## 数据模型

### 通知模型

```go
// internal/models/notification.go
package models

import (
    "time"
    "gorm.io/gorm"
)

// Notification 通知模型
type Notification struct {
    ID          uint              `json:"id" gorm:"primaryKey"`
    UUID        string            `json:"uuid" gorm:"type:varchar(36);uniqueIndex;not null"`
    Title       string            `json:"title" gorm:"type:varchar(255);not null"`
    Content     string            `json:"content" gorm:"type:text;not null"`
    Type        NotificationType  `json:"type" gorm:"type:varchar(50);not null"`
    Category    string            `json:"category" gorm:"type:varchar(100)"`
    Priority    NotificationPriority `json:"priority" gorm:"type:varchar(20);default:'normal'"`
    Status      NotificationStatus `json:"status" gorm:"type:varchar(20);default:'pending'"`
    SenderID    *uint             `json:"sender_id" gorm:"index"`
    RecipientID uint              `json:"recipient_id" gorm:"not null;index"`
    ReadAt      *time.Time        `json:"read_at"`
    SentAt      *time.Time        `json:"sent_at"`
    ExpiresAt   *time.Time        `json:"expires_at"`
    Metadata    string            `json:"metadata" gorm:"type:json"`
    CreatedAt   time.Time         `json:"created_at"`
    UpdatedAt   time.Time         `json:"updated_at"`
    DeletedAt   gorm.DeletedAt    `json:"-" gorm:"index"`
    
    // 关联
    Sender    *User                `json:"sender,omitempty" gorm:"foreignKey:SenderID"`
    Recipient *User                `json:"recipient,omitempty" gorm:"foreignKey:RecipientID"`
    Channels  []NotificationChannel `json:"channels,omitempty" gorm:"foreignKey:NotificationID"`
}

// NotificationType 通知类型
type NotificationType string

const (
    NotificationTypeSystem    NotificationType = "system"
    NotificationTypeUser     NotificationType = "user"
    NotificationTypePlugin   NotificationType = "plugin"
    NotificationTypeSecurity NotificationType = "security"
    NotificationTypeUpdate   NotificationType = "update"
    NotificationTypeReminder NotificationType = "reminder"
)

// NotificationPriority 通知优先级
type NotificationPriority string

const (
    NotificationPriorityLow    NotificationPriority = "low"
    NotificationPriorityNormal NotificationPriority = "normal"
    NotificationPriorityHigh   NotificationPriority = "high"
    NotificationPriorityUrgent NotificationPriority = "urgent"
)

// NotificationStatus 通知状态
type NotificationStatus string

const (
    NotificationStatusPending  NotificationStatus = "pending"
    NotificationStatusSent     NotificationStatus = "sent"
    NotificationStatusDelivered NotificationStatus = "delivered"
    NotificationStatusRead     NotificationStatus = "read"
    NotificationStatusFailed   NotificationStatus = "failed"
    NotificationStatusExpired  NotificationStatus = "expired"
)

// NotificationChannel 通知渠道
type NotificationChannel struct {
    ID             uint                `json:"id" gorm:"primaryKey"`
    NotificationID uint                `json:"notification_id" gorm:"not null;index"`
    ChannelType    ChannelType         `json:"channel_type" gorm:"type:varchar(50);not null"`
    Status         ChannelStatus       `json:"status" gorm:"type:varchar(20);default:'pending'"`
    SentAt         *time.Time          `json:"sent_at"`
    DeliveredAt    *time.Time          `json:"delivered_at"`
    Error          string              `json:"error" gorm:"type:text"`
    RetryCount     int                 `json:"retry_count" gorm:"default:0"`
    CreatedAt      time.Time           `json:"created_at"`
    UpdatedAt      time.Time           `json:"updated_at"`
    
    // 关联
    Notification *Notification `json:"notification,omitempty" gorm:"foreignKey:NotificationID"`
}

// ChannelType 渠道类型
type ChannelType string

const (
    ChannelTypeInApp    ChannelType = "in_app"
    ChannelTypeEmail    ChannelType = "email"
    ChannelTypeSMS      ChannelType = "sms"
    ChannelTypePush     ChannelType = "push"
    ChannelTypeWebhook  ChannelType = "webhook"
)

// ChannelStatus 渠道状态
type ChannelStatus string

const (
    ChannelStatusPending   ChannelStatus = "pending"
    ChannelStatusSent      ChannelStatus = "sent"
    ChannelStatusDelivered ChannelStatus = "delivered"
    ChannelStatusFailed    ChannelStatus = "failed"
)

// NotificationTemplate 通知模板
type NotificationTemplate struct {
    ID          uint                `json:"id" gorm:"primaryKey"`
    Name        string              `json:"name" gorm:"type:varchar(100);uniqueIndex;not null"`
    Type        NotificationType    `json:"type" gorm:"type:varchar(50);not null"`
    Category    string              `json:"category" gorm:"type:varchar(100)"`
    Title       string              `json:"title" gorm:"type:varchar(255);not null"`
    Content     string              `json:"content" gorm:"type:text;not null"`
    Variables   string              `json:"variables" gorm:"type:json"`
    Channels    string              `json:"channels" gorm:"type:json"`
    IsActive    bool                `json:"is_active" gorm:"default:true"`
    CreatedAt   time.Time           `json:"created_at"`
    UpdatedAt   time.Time           `json:"updated_at"`
    
    // 关联
    Versions []NotificationTemplateVersion `json:"versions,omitempty" gorm:"foreignKey:TemplateID"`
}

// NotificationTemplateVersion 通知模板版本
type NotificationTemplateVersion struct {
    ID         uint      `json:"id" gorm:"primaryKey"`
    TemplateID uint      `json:"template_id" gorm:"not null;index"`
    Version    string    `json:"version" gorm:"type:varchar(20);not null"`
    Title      string    `json:"title" gorm:"type:varchar(255);not null"`
    Content    string    `json:"content" gorm:"type:text;not null"`
    Variables  string    `json:"variables" gorm:"type:json"`
    Channels   string    `json:"channels" gorm:"type:json"`
    IsActive   bool      `json:"is_active" gorm:"default:true"`
    CreatedAt  time.Time `json:"created_at"`
    
    // 关联
    Template *NotificationTemplate `json:"template,omitempty" gorm:"foreignKey:TemplateID"`
}

// NotificationPreference 通知偏好
type NotificationPreference struct {
    ID         uint                `json:"id" gorm:"primaryKey"`
    UserID     uint                `json:"user_id" gorm:"not null;uniqueIndex;not null"`
    Type       NotificationType    `json:"type" gorm:"type:varchar(50);not null"`
    Category   string              `json:"category" gorm:"type:varchar(100)"`
    Channels   string              `json:"channels" gorm:"type:json"`
    IsEnabled  bool                `json:"is_enabled" gorm:"default:true"`
    CreatedAt  time.Time           `json:"created_at"`
    UpdatedAt  time.Time           `json:"updated_at"`
    
    // 关联
    User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}
```

## 服务实现

### 通知服务接口

```go
// internal/services/notification_service.go
package services

import (
    "context"
    "errors"
    "fmt"
    "time"
    
    "github.com/rubick/internal/models"
    "github.com/rubick/internal/repositories"
    "github.com/rubick/internal/config"
    "github.com/google/uuid"
)

// NotificationService 通知服务接口
type NotificationService interface {
    // 发送通知
    SendNotification(ctx context.Context, req *SendNotificationRequest) (*NotificationResponse, error)
    
    // 批量发送通知
    SendBulkNotifications(ctx context.Context, req *SendBulkNotificationsRequest) (*BulkNotificationResponse, error)
    
    // 发送模板通知
    SendTemplateNotification(ctx context.Context, req *SendTemplateNotificationRequest) (*NotificationResponse, error)
    
    // 获取通知列表
    ListNotifications(ctx context.Context, req *ListNotificationsRequest) (*ListNotificationsResponse, error)
    
    // 获取通知详情
    GetNotification(ctx context.Context, notificationID uint) (*NotificationResponse, error)
    
    // 标记通知为已读
    MarkAsRead(ctx context.Context, notificationID uint, userID uint) error
    
    // 批量标记通知为已读
    MarkMultipleAsRead(ctx context.Context, notificationIDs []uint, userID uint) error
    
    // 标记所有通知为已读
    MarkAllAsRead(ctx context.Context, userID uint) error
    
    // 删除通知
    DeleteNotification(ctx context.Context, notificationID uint, userID uint) error
    
    // 批量删除通知
    DeleteMultipleNotifications(ctx context.Context, notificationIDs []uint, userID uint) error
    
    // 获取未读通知数量
    GetUnreadCount(ctx context.Context, userID uint) (int64, error)
    
    // 获取通知偏好
    GetNotificationPreferences(ctx context.Context, userID uint) ([]*NotificationPreferenceResponse, error)
    
    // 更新通知偏好
    UpdateNotificationPreferences(ctx context.Context, userID uint, req *UpdateNotificationPreferencesRequest) error
    
    // 创建通知模板
    CreateNotificationTemplate(ctx context.Context, req *CreateNotificationTemplateRequest) (*NotificationTemplateResponse, error)
    
    // 获取通知模板列表
    ListNotificationTemplates(ctx context.Context, req *ListNotificationTemplatesRequest) (*ListNotificationTemplatesResponse, error)
    
    // 更新通知模板
    UpdateNotificationTemplate(ctx context.Context, templateID uint, req *UpdateNotificationTemplateRequest) (*NotificationTemplateResponse, error)
    
    // 删除通知模板
    DeleteNotificationTemplate(ctx context.Context, templateID uint) error
    
    // 处理通知队列
    ProcessNotificationQueue(ctx context.Context) error
    
    // 重试失败的通知
    RetryFailedNotifications(ctx context.Context) error
}

// notificationService 通知服务实现
type notificationService struct {
    notificationRepo repositories.NotificationRepository
    templateRepo      repositories.NotificationTemplateRepository
    preferenceRepo   repositories.NotificationPreferenceRepository
    userRepo         repositories.UserRepository
    emailService     EmailService
    pushService      PushService
    smsService       SMSService
    config           *config.Config
}

// NewNotificationService 创建通知服务
func NewNotificationService(
    notificationRepo repositories.NotificationRepository,
    templateRepo repositories.NotificationTemplateRepository,
    preferenceRepo repositories.NotificationPreferenceRepository,
    userRepo repositories.UserRepository,
    emailService EmailService,
    pushService PushService,
    smsService SMSService,
    config *config.Config,
) NotificationService {
    return &notificationService{
        notificationRepo: notificationRepo,
        templateRepo:      templateRepo,
        preferenceRepo:   preferenceRepo,
        userRepo:         userRepo,
        emailService:     emailService,
        pushService:      pushService,
        smsService:       smsService,
        config:           config,
    }
}

// SendNotificationRequest 发送通知请求
type SendNotificationRequest struct {
    Title       string                    `json:"title" validate:"required,max=255"`
    Content     string                    `json:"content" validate:"required"`
    Type        models.NotificationType   `json:"type" validate:"required"`
    Category    string                    `json:"category" validate:"max=100"`
    Priority    models.NotificationPriority `json:"priority"`
    SenderID    *uint                     `json:"sender_id"`
    RecipientID uint                      `json:"recipient_id" validate:"required"`
    Channels    []models.ChannelType      `json:"channels"`
    ExpiresAt   *time.Time                `json:"expires_at"`
    Metadata    map[string]interface{}    `json:"metadata"`
}

// SendBulkNotificationsRequest 批量发送通知请求
type SendBulkNotificationsRequest struct {
    Title       string                    `json:"title" validate:"required,max=255"`
    Content     string                    `json:"content" validate:"required"`
    Type        models.NotificationType   `json:"type" validate:"required"`
    Category    string                    `json:"category" validate:"max=100"`
    Priority    models.NotificationPriority `json:"priority"`
    SenderID    *uint                     `json:"sender_id"`
    RecipientIDs []uint                   `json:"recipient_ids" validate:"required,min=1"`
    Channels    []models.ChannelType      `json:"channels"`
    ExpiresAt   *time.Time                `json:"expires_at"`
    Metadata    map[string]interface{}    `json:"metadata"`
}

// SendTemplateNotificationRequest 发送模板通知请求
type SendTemplateNotificationRequest struct {
    TemplateName string                 `json:"template_name" validate:"required"`
    RecipientID  uint                   `json:"recipient_id" validate:"required"`
    Variables    map[string]interface{} `json:"variables"`
    Channels     []models.ChannelType   `json:"channels"`
    ExpiresAt    *time.Time             `json:"expires_at"`
}

// NotificationResponse 通知响应
type NotificationResponse struct {
    ID          uint                        `json:"id"`
    UUID        string                      `json:"uuid"`
    Title       string                      `json:"title"`
    Content     string                      `json:"content"`
    Type        models.NotificationType     `json:"type"`
    Category    string                      `json:"category"`
    Priority    models.NotificationPriority `json:"priority"`
    Status      models.NotificationStatus   `json:"status"`
    SenderID    *uint                       `json:"sender_id"`
    RecipientID uint                        `json:"recipient_id"`
    ReadAt      *time.Time                  `json:"read_at"`
    SentAt      *time.Time                  `json:"sent_at"`
    ExpiresAt   *time.Time                  `json:"expires_at"`
    Metadata    map[string]interface{}      `json:"metadata"`
    CreatedAt   time.Time                   `json:"created_at"`
    UpdatedAt   time.Time                   `json:"updated_at"`
    Channels    []*NotificationChannelResponse `json:"channels,omitempty"`
    Sender      *UserResponse               `json:"sender,omitempty"`
    Recipient   *UserResponse               `json:"recipient,omitempty"`
}

// NotificationChannelResponse 通知渠道响应
type NotificationChannelResponse struct {
    ID             uint                  `json:"id"`
    ChannelType    models.ChannelType    `json:"channel_type"`
    Status         models.ChannelStatus  `json:"status"`
    SentAt         *time.Time            `json:"sent_at"`
    DeliveredAt    *time.Time            `json:"delivered_at"`
    Error          string                `json:"error"`
    RetryCount     int                   `json:"retry_count"`
    CreatedAt      time.Time             `json:"created_at"`
    UpdatedAt      time.Time             `json:"updated_at"`
}

// BulkNotificationResponse 批量通知响应
type BulkNotificationResponse struct {
    SuccessCount int                    `json:"success_count"`
    FailureCount int                    `json:"failure_count"`
    Notifications []*NotificationResponse `json:"notifications"`
    Errors       []string               `json:"errors"`
}

// ListNotificationsRequest 获取通知列表请求
type ListNotificationsRequest struct {
    Page       int                      `json:"page" validate:"min=1"`
    PageSize   int                      `json:"page_size" validate:"min=1,max=100"`
    UserID     uint                     `json:"user_id"`
    Type       models.NotificationType   `json:"type"`
    Category   string                   `json:"category"`
    Status     models.NotificationStatus `json:"status"`
    IsRead     *bool                    `json:"is_read"`
    StartDate  *time.Time               `json:"start_date"`
    EndDate    *time.Time               `json:"end_date"`
}

// ListNotificationsResponse 获取通知列表响应
type ListNotificationsResponse struct {
    Notifications []*NotificationResponse `json:"notifications"`
    Total         int64                   `json:"total"`
    Page          int                     `json:"page"`
    PageSize      int                     `json:"page_size"`
    TotalPages    int                     `json:"total_pages"`
    UnreadCount   int64                   `json:"unread_count"`
}

// NotificationPreferenceResponse 通知偏好响应
type NotificationPreferenceResponse struct {
    ID        uint                      `json:"id"`
    Type      models.NotificationType   `json:"type"`
    Category  string                    `json:"category"`
    Channels  []models.ChannelType      `json:"channels"`
    IsEnabled bool                      `json:"is_enabled"`
    CreatedAt time.Time                 `json:"created_at"`
    UpdatedAt time.Time                 `json:"updated_at"`
}

// UpdateNotificationPreferencesRequest 更新通知偏好请求
type UpdateNotificationPreferencesRequest struct {
    Preferences []*NotificationPreferenceItem `json:"preferences" validate:"required,dive"`
}

// NotificationPreferenceItem 通知偏好项
type NotificationPreferenceItem struct {
    Type      models.NotificationType `json:"type" validate:"required"`
    Category  string                  `json:"category"`
    Channels  []models.ChannelType    `json:"channels"`
    IsEnabled bool                    `json:"is_enabled"`
}

// CreateNotificationTemplateRequest 创建通知模板请求
type CreateNotificationTemplateRequest struct {
    Name      string                    `json:"name" validate:"required,max=100"`
    Type      models.NotificationType   `json:"type" validate:"required"`
    Category  string                    `json:"category" validate:"max=100"`
    Title     string                    `json:"title" validate:"required,max=255"`
    Content   string                    `json:"content" validate:"required"`
    Variables []TemplateVariable        `json:"variables"`
    Channels  []models.ChannelType      `json:"channels"`
}

// TemplateVariable 模板变量
type TemplateVariable struct {
    Name        string `json:"name" validate:"required"`
    Description string `json:"description"`
    Type        string `json:"type"`
    Required    bool   `json:"required"`
}

// NotificationTemplateResponse 通知模板响应
type NotificationTemplateResponse struct {
    ID          uint                      `json:"id"`
    Name        string                    `json:"name"`
    Type        models.NotificationType   `json:"type"`
    Category    string                    `json:"category"`
    Title       string                    `json:"title"`
    Content     string                    `json:"content"`
    Variables   []TemplateVariable       `json:"variables"`
    Channels    []models.ChannelType      `json:"channels"`
    IsActive    bool                      `json:"is_active"`
    CreatedAt   time.Time                 `json:"created_at"`
    UpdatedAt   time.Time                 `json:"updated_at"`
}

// ListNotificationTemplatesRequest 获取通知模板列表请求
type ListNotificationTemplatesRequest struct {
    Page     int                      `json:"page" validate:"min=1"`
    PageSize int                      `json:"page_size" validate:"min=1,max=100"`
    Type     models.NotificationType   `json:"type"`
    Category string                   `json:"category"`
    IsActive *bool                    `json:"is_active"`
}

// ListNotificationTemplatesResponse 获取通知模板列表响应
type ListNotificationTemplatesResponse struct {
 Templates  []*NotificationTemplateResponse `json:"templates"`
 Total      int64                            `json:"total"`
 Page       int                              `json:"page"`
 PageSize   int                              `json:"page_size"`
 TotalPages int                              `json:"total_pages"`
}

// UpdateNotificationTemplateRequest 更新通知模板请求
type UpdateNotificationTemplateRequest struct {
    Name      string                    `json:"name" validate:"max=100"`
    Type      models.NotificationType   `json:"type"`
    Category  string                    `json:"category" validate:"max=100"`
    Title     string                    `json:"title" validate:"max=255"`
    Content   string                    `json:"content"`
    Variables []TemplateVariable        `json:"variables"`
    Channels  []models.ChannelType      `json:"channels"`
    IsActive  *bool                     `json:"is_active"`
}
```

### 通知服务实现

```go
// internal/services/notification_service_impl.go
package services

import (
    "context"
    "encoding/json"
    "errors"
    "fmt"
    "strings"
    "text/template"
    "time"
    
    "github.com/rubick/internal/models"
    "github.com/rubick/internal/utils"
)

// SendNotification 发送通知
func (s *notificationService) SendNotification(ctx context.Context, req *SendNotificationRequest) (*NotificationResponse, error) {
    // 验证接收者是否存在
    recipient, err := s.userRepo.GetByID(ctx, req.RecipientID)
    if err != nil {
        return nil, fmt.Errorf("recipient not found: %w", err)
    }
    
    // 验证发送者是否存在（如果提供了发送者 ID）
    var sender *models.User
    if req.SenderID != nil {
        sender, err = s.userRepo.GetByID(ctx, *req.SenderID)
        if err != nil {
            return nil, fmt.Errorf("sender not found: %w", err)
        }
    }
    
    // 获取用户通知偏好
    preferences, err := s.getUserPreferences(ctx, req.RecipientID, req.Type, req.Category)
    if err != nil {
        return nil, fmt.Errorf("failed to get user preferences: %w", err)
    }
    
    // 检查是否允许发送通知
    if !preferences.IsEnabled {
        return nil, errors.New("notification is disabled for this user")
    }
    
    // 确定通知渠道
    channels := req.Channels
    if len(channels) == 0 {
        channels = preferences.Channels
    }
    
    // 序列化元数据
    metadataJSON, _ := json.Marshal(req.Metadata)
    
    // 创建通知
    notification := &models.Notification{
        UUID:        uuid.New().String(),
        Title:       req.Title,
        Content:     req.Content,
        Type:        req.Type,
        Category:    req.Category,
        Priority:    req.Priority,
        Status:      models.NotificationStatusPending,
        SenderID:    req.SenderID,
        RecipientID: req.RecipientID,
        ExpiresAt:   req.ExpiresAt,
        Metadata:    string(metadataJSON),
    }
    
    if err := s.notificationRepo.Create(ctx, notification); err != nil {
        return nil, fmt.Errorf("failed to create notification: %w", err)
    }
    
    // 创建通知渠道
    for _, channelType := range channels {
        channel := &models.NotificationChannel{
            NotificationID: notification.ID,
            ChannelType:    channelType,
            Status:         models.ChannelStatusPending,
        }
        
        if err := s.notificationRepo.CreateChannel(ctx, channel); err != nil {
            return nil, fmt.Errorf("failed to create notification channel: %w", err)
        }
    }
    
    // 异步发送通知
    go s.processNotificationChannels(context.Background(), notification.ID)
    
    // 设置关联数据
    notification.Sender = sender
    notification.Recipient = recipient
    
    return s.toNotificationResponse(notification), nil
}

// SendBulkNotifications 批量发送通知
func (s *notificationService) SendBulkNotifications(ctx context.Context, req *SendBulkNotificationsRequest) (*BulkNotificationResponse, error) {
    var notifications []*NotificationResponse
    var errorsList []string
    successCount := 0
    failureCount := 0
    
    // 为每个接收者创建通知
    for _, recipientID := range req.RecipientIDs {
        singleReq := &SendNotificationRequest{
            Title:       req.Title,
            Content:     req.Content,
            Type:        req.Type,
            Category:    req.Category,
            Priority:    req.Priority,
            SenderID:    req.SenderID,
            RecipientID: recipientID,
            Channels:    req.Channels,
            ExpiresAt:   req.ExpiresAt,
            Metadata:    req.Metadata,
        }
        
        notification, err := s.SendNotification(ctx, singleReq)
        if err != nil {
            failureCount++
            errorsList = append(errorsList, fmt.Sprintf("Failed to send notification to user %d: %v", recipientID, err))
            continue
        }
        
        notifications = append(notifications, notification)
        successCount++
    }
    
    return &BulkNotificationResponse{
        SuccessCount:  successCount,
        FailureCount:  failureCount,
        Notifications: notifications,
        Errors:        errorsList,
    }, nil
}

// SendTemplateNotification 发送模板通知
func (s *notificationService) SendTemplateNotification(ctx context.Context, req *SendTemplateNotificationRequest) (*NotificationResponse, error) {
    // 获取通知模板
    template, err := s.templateRepo.GetByName(ctx, req.TemplateName)
    if err != nil {
        return nil, fmt.Errorf("template not found: %w", err)
    }
    
    if !template.IsActive {
        return nil, errors.New("template is not active")
    }
    
    // 渲染模板
    title, content, err := s.renderTemplate(template.Title, template.Content, req.Variables)
    if err != nil {
        return nil, fmt.Errorf("failed to render template: %w", err)
    }
    
    // 确定通知渠道
    channels := req.Channels
    if len(channels) == 0 {
        // 从模板获取默认渠道
        channels = s.getTemplateChannels(template)
    }
    
    // 创建通知请求
    notificationReq := &SendNotificationRequest{
        Title:       title,
        Content:     content,
        Type:        template.Type,
        Category:    template.Category,
        RecipientID: req.RecipientID,
        Channels:    channels,
        ExpiresAt:   req.ExpiresAt,
    }
    
    return s.SendNotification(ctx, notificationReq)
}

// ListNotifications 获取通知列表
func (s *notificationService) ListNotifications(ctx context.Context, req *ListNotificationsRequest) (*ListNotificationsResponse, error) {
    // 设置默认值
    if req.Page <= 0 {
        req.Page = 1
    }
    if req.PageSize <= 0 {
        req.PageSize = 20
    }
    
    // 计算偏移量
    offset := (req.Page - 1) * req.PageSize
    
    // 获取通知列表
    notifications, total, err := s.notificationRepo.List(ctx, &repositories.ListNotificationsOptions{
        Offset:    offset,
        Limit:     req.PageSize,
        UserID:    req.UserID,
        Type:      req.Type,
        Category:  req.Category,
        Status:    req.Status,
        IsRead:    req.IsRead,
        StartDate: req.StartDate,
        EndDate:   req.EndDate,
    })
    if err != nil {
        return nil, fmt.Errorf("failed to list notifications: %w", err)
    }
    
    // 获取未读通知数量
    unreadCount, err := s.notificationRepo.CountUnread(ctx, req.UserID)
    if err != nil {
        return nil, fmt.Errorf("failed to count unread notifications: %w", err)
    }
    
    // 转换响应
    notificationResponses := make([]*NotificationResponse, len(notifications))
    for i, notification := range notifications {
        notificationResponses[i] = s.toNotificationResponse(notification)
    }
    
    // 计算总页数
    totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))
    
    return &ListNotificationsResponse{
        Notifications: notificationResponses,
        Total:         total,
        Page:          req.Page,
        PageSize:      req.PageSize,
        TotalPages:    totalPages,
        UnreadCount:   unreadCount,
    }, nil
}

// GetNotification 获取通知详情
func (s *notificationService) GetNotification(ctx context.Context, notificationID uint) (*NotificationResponse, error) {
    notification, err := s.notificationRepo.GetByID(ctx, notificationID)
    if err != nil {
        return nil, fmt.Errorf("failed to get notification: %w", err)
    }
    
    return s.toNotificationResponse(notification), nil
}

// MarkAsRead 标记通知为已读
func (s *notificationService) MarkAsRead(ctx context.Context, notificationID uint, userID uint) error {
    // 获取通知
    notification, err := s.notificationRepo.GetByID(ctx, notificationID)
    if err != nil {
        return fmt.Errorf("failed to get notification: %w", err)
    }
    
    // 检查权限
    if notification.RecipientID != userID {
        return errors.New("unauthorized to mark this notification as read")
    }
    
    // 检查是否已读
    if notification.ReadAt != nil {
        return nil // 已经是已读状态
    }
    
    // 标记为已读
    now := time.Now()
    notification.ReadAt = &now
    notification.Status = models.NotificationStatusRead
    
    if err := s.notificationRepo.Update(ctx, notification); err != nil {
        return fmt.Errorf("failed to update notification: %w", err)
    }
    
    return nil
}

// MarkMultipleAsRead 批量标记通知为已读
func (s *notificationService) MarkMultipleAsRead(ctx context.Context, notificationIDs []uint, userID uint) error {
    for _, notificationID := range notificationIDs {
        if err := s.MarkAsRead(ctx, notificationID, userID); err != nil {
            return fmt.Errorf("failed to mark notification %d as read: %w", notificationID, err)
        }
    }
    return nil
}

// MarkAllAsRead 标记所有通知为已读
func (s *notificationService) MarkAllAsRead(ctx context.Context, userID uint) error {
    // 获取所有未读通知
    notifications, err := s.notificationRepo.List(ctx, &repositories.ListNotificationsOptions{
        UserID: userID,
        IsRead: utils.BoolPtr(false),
    })
    if err != nil {
        return fmt.Errorf("failed to list unread notifications: %w", err)
    }
    
    // 批量标记为已读
    for _, notification := range notifications {
        now := time.Now()
        notification.ReadAt = &now
        notification.Status = models.NotificationStatusRead
        
        if err := s.notificationRepo.Update(ctx, notification); err != nil {
            return fmt.Errorf("failed to update notification %d: %w", notification.ID, err)
        }
    }
    
    return nil
}

// DeleteNotification 删除通知
func (s *notificationService) DeleteNotification(ctx context.Context, notificationID uint, userID uint) error {
    // 获取通知
    notification, err := s.notificationRepo.GetByID(ctx, notificationID)
    if err != nil {
        return fmt.Errorf("failed to get notification: %w", err)
    }
    
    // 检查权限
    if notification.RecipientID != userID {
        return errors.New("unauthorized to delete this notification")
    }
    
    // 删除通知
    if err := s.notificationRepo.Delete(ctx, notificationID); err != nil {
        return fmt.Errorf("failed to delete notification: %w", err)
    }
    
    return nil
}

// DeleteMultipleNotifications 批量删除通知
func (s *notificationService) DeleteMultipleNotifications(ctx context.Context, notificationIDs []uint, userID uint) error {
    for _, notificationID := range notificationIDs {
        if err := s.DeleteNotification(ctx, notificationID, userID); err != nil {
            return fmt.Errorf("failed to delete notification %d: %w", notificationID, err)
        }
    }
    return nil
}

// GetUnreadCount 获取未读通知数量
func (s *notificationService) GetUnreadCount(ctx context.Context, userID uint) (int64, error) {
    return s.notificationRepo.CountUnread(ctx, userID)
}

// GetNotificationPreferences 获取通知偏好
func (s *notificationService) GetNotificationPreferences(ctx context.Context, userID uint) ([]*NotificationPreferenceResponse, error) {
    preferences, err := s.preferenceRepo.GetByUserID(ctx, userID)
    if err != nil {
        return nil, fmt.Errorf("failed to get notification preferences: %w", err)
    }
    
    // 转换响应
    preferenceResponses := make([]*NotificationPreferenceResponse, len(preferences))
    for i, preference := range preferences {
        preferenceResponses[i] = &NotificationPreferenceResponse{
            ID:        preference.ID,
            Type:      preference.Type,
            Category:  preference.Category,
            Channels:  s.parseChannels(preference.Channels),
            IsEnabled: preference.IsEnabled,
            CreatedAt: preference.CreatedAt,
            UpdatedAt: preference.UpdatedAt,
        }
    }
    
    return preferenceResponses, nil
}

// UpdateNotificationPreferences 更新通知偏好
func (s *notificationService) UpdateNotificationPreferences(ctx context.Context, userID uint, req *UpdateNotificationPreferencesRequest) error {
    for _, pref := range req.Preferences {
        // 序列化渠道
        channelsJSON, _ := json.Marshal(pref.Channels)
        
        // 查找现有偏好
        existingPref, err := s.preferenceRepo.GetByUserTypeCategory(ctx, userID, pref.Type, pref.Category)
        if err != nil {
            // 创建新偏好
            preference := &models.NotificationPreference{
                UserID:    userID,
                Type:      pref.Type,
                Category:  pref.Category,
                Channels:  string(channelsJSON),
                IsEnabled: pref.IsEnabled,
            }
            
            if err := s.preferenceRepo.Create(ctx, preference); err != nil {
                return fmt.Errorf("failed to create notification preference: %w", err)
            }
        } else {
            // 更新现有偏好
            existingPref.Channels = string(channelsJSON)
            existingPref.IsEnabled = pref.IsEnabled
            
            if err := s.preferenceRepo.Update(ctx, existingPref); err != nil {
                return fmt.Errorf("failed to update notification preference: %w", err)
            }
        }
    }
    
    return nil
}

// CreateNotificationTemplate 创建通知模板
func (s *notificationService) CreateNotificationTemplate(ctx context.Context, req *CreateNotificationTemplateRequest) (*NotificationTemplateResponse, error) {
    // 序列化变量和渠道
    variablesJSON, _ := json.Marshal(req.Variables)
    channelsJSON, _ := json.Marshal(req.Channels)
    
    // 创建模板
    template := &models.NotificationTemplate{
        Name:      req.Name,
        Type:      req.Type,
        Category:  req.Category,
        Title:     req.Title,
        Content:   req.Content,
        Variables: string(variablesJSON),
        Channels:  string(channelsJSON),
        IsActive:  true,
    }
    
    if err := s.templateRepo.Create(ctx, template); err != nil {
        return nil, fmt.Errorf("failed to create notification template: %w", err)
    }
    
    return s.toNotificationTemplateResponse(template), nil
}

// ListNotificationTemplates 获取通知模板列表
func (s *notificationService) ListNotificationTemplates(ctx context.Context, req *ListNotificationTemplatesRequest) (*ListNotificationTemplatesResponse, error) {
    // 设置默认值
    if req.Page <= 0 {
        req.Page = 1
    }
    if req.PageSize <= 0 {
        req.PageSize = 20
    }
    
    // 计算偏移量
    offset := (req.Page - 1) * req.PageSize
    
    // 获取模板列表
    templates, total, err := s.templateRepo.List(ctx, &repositories.ListNotificationTemplatesOptions{
        Offset:   offset,
        Limit:    req.PageSize,
        Type:     req.Type,
        Category: req.Category,
        IsActive: req.IsActive,
    })
    if err != nil {
        return nil, fmt.Errorf("failed to list notification templates: %w", err)
    }
    
    // 转换响应
    templateResponses := make([]*NotificationTemplateResponse, len(templates))
    for i, template := range templates {
        templateResponses[i] = s.toNotificationTemplateResponse(template)
    }
    
    // 计算总页数
    totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))
    
    return &ListNotificationTemplatesResponse{
        Templates:  templateResponses,
        Total:      total,
        Page:       req.Page,
        PageSize:   req.PageSize,
        TotalPages: totalPages,
    }, nil
}

// UpdateNotificationTemplate 更新通知模板
func (s *notificationService) UpdateNotificationTemplate(ctx context.Context, templateID uint, req *UpdateNotificationTemplateRequest) (*NotificationTemplateResponse, error) {
    // 获取模板
    template, err := s.templateRepo.GetByID(ctx, templateID)
    if err != nil {
        return nil, fmt.Errorf("failed to get notification template: %w", err)
    }
    
    // 更新字段
    if req.Name != "" {
        template.Name = req.Name
    }
    if req.Type != "" {
        template.Type = req.Type
    }
    if req.Category != "" {
        template.Category = req.Category
    }
    if req.Title != "" {
        template.Title = req.Title
    }
    if req.Content != "" {
        template.Content = req.Content
    }
    if req.Variables != nil {
        variablesJSON, _ := json.Marshal(req.Variables)
        template.Variables = string(variablesJSON)
    }
    if req.Channels != nil {
        channelsJSON, _ := json.Marshal(req.Channels)
        template.Channels = string(channelsJSON)
    }
    if req.IsActive != nil {
        template.IsActive = *req.IsActive
    }
    
    // 更新模板
    if err := s.templateRepo.Update(ctx, template); err != nil {
        return nil, fmt.Errorf("failed to update notification template: %w", err)
    }
    
    return s.toNotificationTemplateResponse(template), nil
}

// DeleteNotificationTemplate 删除通知模板
func (s *notificationService) DeleteNotificationTemplate(ctx context.Context, templateID uint) error {
    if err := s.templateRepo.Delete(ctx, templateID); err != nil {
        return fmt.Errorf("failed to delete notification template: %w", err)
    }
    return nil
}

// ProcessNotificationQueue 处理通知队列
func (s *notificationService) ProcessNotificationQueue(ctx context.Context) error {
    // 获取待处理的通知
    notifications, err := s.notificationRepo.ListPending(ctx, 100)
    if err != nil {
        return fmt.Errorf("failed to list pending notifications: %w", err)
    }
    
    // 处理每个通知
    for _, notification := range notifications {
        if err := s.processNotificationChannels(ctx, notification.ID); err != nil {
            // 记录错误但继续处理其他通知
            continue
        }
    }
    
    return nil
}

// RetryFailedNotifications 重试失败的通知
func (s *notificationService) RetryFailedNotifications(ctx context.Context) error {
    // 获取失败的通知渠道
    channels, err := s.notificationRepo.ListFailedChannels(ctx, 100)
    if err != nil {
        return fmt.Errorf("failed to list failed channels: %w", err)
    }
    
    // 重试每个失败的渠道
    for _, channel := range channels {
        if channel.RetryCount >= 3 {
            // 超过最大重试次数，标记为最终失败
            channel.Status = models.ChannelStatusFailed
            channel.Error = "Max retry count exceeded"
            s.notificationRepo.UpdateChannel(ctx, channel)
            continue
        }
        
        // 增加重试次数
        channel.RetryCount++
        channel.Status = models.ChannelStatusPending
        
        if err := s.notificationRepo.UpdateChannel(ctx, channel); err != nil {
            continue
        }
        
        // 重新处理通知渠道
        go s.processNotificationChannel(context.Background(), channel)
    }
    
    return nil
}

// 辅助方法

// getUserPreferences 获取用户通知偏好
func (s *notificationService) getUserPreferences(ctx context.Context, userID uint, notificationType models.NotificationType, category string) (*models.NotificationPreference, error) {
    // 尝试获取特定类型和类别的偏好
    preference, err := s.preferenceRepo.GetByUserTypeCategory(ctx, userID, notificationType, category)
    if err == nil {
        return preference, nil
    }
    
    // 尝试获取仅类型的偏好
    preference, err = s.preferenceRepo.GetByUserType(ctx, userID, notificationType)
    if err == nil {
        return preference, nil
    }
    
    // 返回默认偏好
    channelsJSON, _ := json.Marshal([]models.ChannelType{models.ChannelTypeInApp})
    return &models.NotificationPreference{
        UserID:    userID,
        Type:      notificationType,
        Category:  category,
        Channels:  string(channelsJSON),
        IsEnabled: true,
    }, nil
}

// renderTemplate 渲染模板
func (s *notificationService) renderTemplate(titleTemplate, contentTemplate string, variables map[string]interface{}) (string, string, error) {
    // 渲染标题
    title, err := s.renderText(titleTemplate, variables)
    if err != nil {
        return "", "", fmt.Errorf("failed to render title: %w", err)
    }
    
    // 渲染内容
    content, err := s.renderText(contentTemplate, variables)
    if err != nil {
        return "", "", fmt.Errorf("failed to render content: %w", err)
    }
    
    return title, content, nil
}

// renderText 渲染文本
func (s *notificationService) renderText(textTemplate string, variables map[string]interface{}) (string, error) {
    tmpl, err := template.New("notification").Parse(textTemplate)
    if err != nil {
        return "", err
    }
    
    var buf strings.Builder
    if err := tmpl.Execute(&buf, variables); err != nil {
        return "", err
    }
    
    return buf.String(), nil
}

// getTemplateChannels 获取模板渠道
func (s *notificationService) getTemplateChannels(template *models.NotificationTemplate) []models.ChannelType {
    var channels []models.ChannelType
    if err := json.Unmarshal([]byte(template.Channels), &channels); err != nil {
        // 默认返回应用内通知
        return []models.ChannelType{models.ChannelTypeInApp}
    }
    return channels
}

// parseChannels 解析渠道
func (s *notificationService) parseChannels(channelsJSON string) []models.ChannelType {
    var channels []models.ChannelType
    if err := json.Unmarshal([]byte(channelsJSON), &channels); err != nil {
        return []models.ChannelType{models.ChannelTypeInApp}
    }
    return channels
}

// processNotificationChannels 处理通知渠道
func (s *notificationService) processNotificationChannels(ctx context.Context, notificationID uint) error {
    // 获取通知
    notification, err := s.notificationRepo.GetByID(ctx, notificationID)
    if err != nil {
        return fmt.Errorf("failed to get notification: %w", err)
    }
    
    // 获取通知渠道
    channels, err := s.notificationRepo.GetChannelsByNotificationID(ctx, notificationID)
    if err != nil {
        return fmt.Errorf("failed to get notification channels: %w", err)
    }
    
    // 处理每个渠道
    for _, channel := range channels {
        go s.processNotificationChannel(context.Background(), channel)
    }
    
    // 更新通知状态为已发送
    now := time.Now()
    notification.SentAt = &now
    notification.Status = models.NotificationStatusSent
    s.notificationRepo.Update(ctx, notification)
    
    return nil
}

// processNotificationChannel 处理单个通知渠道
func (s *notificationService) processNotificationChannel(ctx context.Context, channel *models.NotificationChannel) error {
    // 获取通知
    notification, err := s.notificationRepo.GetByID(ctx, channel.NotificationID)
    if err != nil {
        return fmt.Errorf("failed to get notification: %w", err)
    }
    
    // 获取接收者
    recipient, err := s.userRepo.GetByID(ctx, notification.RecipientID)
    if err != nil {
        return fmt.Errorf("failed to get recipient: %w", err)
    }
    
    var err error
    now := time.Now()
    
    // 根据渠道类型发送通知
    switch channel.ChannelType {
    case models.ChannelTypeInApp:
        // 应用内通知（无需额外操作）
        channel.Status = models.ChannelStatusDelivered
        channel.DeliveredAt = &now
        
    case models.ChannelTypeEmail:
        err = s.sendEmailNotification(ctx, notification, recipient)
        if err == nil {
            channel.Status = models.ChannelStatusSent
            channel.SentAt = &now
        }
        
    case models.ChannelTypeSMS:
        err = s.sendSMSNotification(ctx, notification, recipient)
        if err == nil {
            channel.Status = models.ChannelStatusSent
            channel.SentAt = &now
        }
        
    case models.ChannelTypePush:
        err = s.sendPushNotification(ctx, notification, recipient)
        if err == nil {
            channel.Status = models.ChannelStatusSent
            channel.SentAt = &now
        }
        
    case models.ChannelTypeWebhook:
        err = s.sendWebhookNotification(ctx, notification, recipient)
        if err == nil {
            channel.Status = models.ChannelStatusSent
            channel.SentAt = &now
        }
        
    default:
        err = fmt.Errorf("unsupported channel type: %s", channel.ChannelType)
    }
    
    // 更新渠道状态
    if err != nil {
        channel.Status = models.ChannelStatusFailed
        channel.Error = err.Error()
    }
    
    s.notificationRepo.UpdateChannel(ctx, channel)
    
    return err
}

// sendEmailNotification 发送邮件通知
func (s *notificationService) sendEmailNotification(ctx context.Context, notification *models.Notification, recipient *models.User) error {
    req := &SendEmailRequest{
        To:      recipient.Email,
        Subject: notification.Title,
        Body:    notification.Content,
        Type:    EmailTypeNotification,
    }
    
    return s.emailService.SendEmail(ctx, req)
}

// sendSMSNotification 发送短信通知
func (s *notificationService) sendSMSNotification(ctx context.Context, notification *models.Notification, recipient *models.User) error {
    // 这里需要实现短信发送逻辑
    // 由于短信服务可能需要额外的配置和第三方集成，这里只是示例
    return nil
}

// sendPushNotification 发送推送通知
func (s *notificationService) sendPushNotification(ctx context.Context, notification *models.Notification, recipient *models.User) error {
    // 这里需要实现推送通知逻辑
    // 由于推送服务可能需要额外的配置和第三方集成，这里只是示例
    return nil
}

// sendWebhookNotification 发送 Webhook 通知
func (s *notificationService) sendWebhookNotification(ctx context.Context, notification *models.Notification, recipient *models.User) error {
    // 这里需要实现 Webhook 通知逻辑
    // 由于 Webhook 服务可能需要额外的配置，这里只是示例
    return nil
}

// toNotificationResponse 转换通知响应
func (s *notificationService) toNotificationResponse(notification *models.Notification) *NotificationResponse {
    response := &NotificationResponse{
        ID:          notification.ID,
        UUID:        notification.UUID,
        Title:       notification.Title,
        Content:     notification.Content,
        Type:        notification.Type,
        Category:    notification.Category,
        Priority:    notification.Priority,
        Status:      notification.Status,
        SenderID:    notification.SenderID,
        RecipientID: notification.RecipientID,
        ReadAt:      notification.ReadAt,
        SentAt:      notification.SentAt,
        ExpiresAt:   notification.ExpiresAt,
        CreatedAt:   notification.CreatedAt,
        UpdatedAt:   notification.UpdatedAt,
    }
    
    // 解析元数据
    if notification.Metadata != "" {
        var metadata map[string]interface{}
        if err := json.Unmarshal([]byte(notification.Metadata), &metadata); err == nil {
            response.Metadata = metadata
        }
    }
    
    // 转换渠道
    if len(notification.Channels) > 0 {
        response.Channels = make([]*NotificationChannelResponse, len(notification.Channels))
        for i, channel := range notification.Channels {
            response.Channels[i] = &NotificationChannelResponse{
                ID:          channel.ID,
                ChannelType: channel.ChannelType,
                Status:      channel.Status,
                SentAt:      channel.SentAt,
                DeliveredAt: channel.DeliveredAt,
                Error:       channel.Error,
                RetryCount:  channel.RetryCount,
                CreatedAt:   channel.CreatedAt,
                UpdatedAt:   channel.UpdatedAt,
            }
        }
    }
    
    // 转换发送者
    if notification.Sender != nil {
        response.Sender = &UserResponse{
            ID:       notification.Sender.ID,
            UUID:     notification.Sender.UUID,
            Username: notification.Sender.Username,
            Email:    notification.Sender.Email,
            Nickname: notification.Sender.Nickname,
            Avatar:   notification.Sender.Avatar,
        }
    }
    
    // 转换接收者
    if notification.Recipient != nil {
        response.Recipient = &UserResponse{
            ID:       notification.Recipient.ID,
            UUID:     notification.Recipient.UUID,
            Username: notification.Recipient.Username,
            Email:    notification.Recipient.Email,
            Nickname: notification.Recipient.Nickname,
            Avatar:   notification.Recipient.Avatar,
        }
    }
    
    return response
}

// toNotificationTemplateResponse 转换通知模板响应
func (s *notificationService) toNotificationTemplateResponse(template *models.NotificationTemplate) *NotificationTemplateResponse {
    response := &NotificationTemplateResponse{
        ID:        template.ID,
        Name:      template.Name,
        Type:      template.Type,
        Category:  template.Category,
        Title:     template.Title,
        Content:   template.Content,
        IsActive:  template.IsActive,
        CreatedAt: template.CreatedAt,
        UpdatedAt: template.UpdatedAt,
    }
    
    // 解析变量
    if template.Variables != "" {
        var variables []TemplateVariable
        if err := json.Unmarshal([]byte(template.Variables), &variables); err == nil {
            response.Variables = variables
        }
    }
    
    // 解析渠道
    if template.Channels != "" {
        var channels []models.ChannelType
        if err := json.Unmarshal([]byte(template.Channels), &channels); err == nil {
            response.Channels = channels
        }
    }
    
    return response
}
```

## 仓储接口

```go
// internal/repositories/notification_repository.go
package repositories

import (
    "context"
    "github.com/rubick/internal/models"
)

// NotificationRepository 通知仓储接口
type NotificationRepository interface {
    // 创建通知
    Create(ctx context.Context, notification *models.Notification) error
    
    // 获取通知（通过 ID）
    GetByID(ctx context.Context, id uint) (*models.Notification, error)
    
    // 获取通知（通过 UUID）
    GetByUUID(ctx context.Context, uuid string) (*models.Notification, error)
    
    // 更新通知
    Update(ctx context.Context, notification *models.Notification) error
    
    // 删除通知
    Delete(ctx context.Context, id uint) error
    
    // 获取通知列表
    List(ctx context.Context, opts *ListNotificationsOptions) ([]*models.Notification, int64, error)
    
    // 获取待处理的通知
    ListPending(ctx context.Context, limit int) ([]*models.Notification, error)
    
    // 获取未读通知数量
    CountUnread(ctx context.Context, userID uint) (int64, error)
    
    // 创建通知渠道
    CreateChannel(ctx context.Context, channel *models.NotificationChannel) error
    
    // 更新通知渠道
    UpdateChannel(ctx context.Context, channel *models.NotificationChannel) error
    
    // 获取通知渠道（通过通知 ID）
    GetChannelsByNotificationID(ctx context.Context, notificationID uint) ([]*models.NotificationChannel, error)
    
    // 获取失败的渠道
    ListFailedChannels(ctx context.Context, limit int) ([]*models.NotificationChannel, error)
}

// ListNotificationsOptions 获取通知列表选项
type ListNotificationsOptions struct {
    Offset    int
    Limit     int
    UserID    uint
    Type      models.NotificationType
    Category  string
    Status    models.NotificationStatus
    IsRead    *bool
    StartDate *time.Time
    EndDate   *time.Time
}

// NotificationTemplateRepository 通知模板仓储接口
type NotificationTemplateRepository interface {
    // 创建通知模板
    Create(ctx context.Context, template *models.NotificationTemplate) error
    
    // 获取通知模板（通过 ID）
    GetByID(ctx context.Context, id uint) (*models.NotificationTemplate, error)
    
    // 获取通知模板（通过名称）
    GetByName(ctx context.Context, name string) (*models.NotificationTemplate, error)
    
    // 更新通知模板
    Update(ctx context.Context, template *models.NotificationTemplate) error
    
    // 删除通知模板
    Delete(ctx context.Context, id uint) error
    
    // 获取通知模板列表
    List(ctx context.Context, opts *ListNotificationTemplatesOptions) ([]*models.NotificationTemplate, int64, error)
}

// ListNotificationTemplatesOptions 获取通知模板列表选项
type ListNotificationTemplatesOptions struct {
    Offset   int
    Limit    int
    Type     models.NotificationType
    Category string
    IsActive *bool
}

// NotificationPreferenceRepository 通知偏好仓储接口
type NotificationPreferenceRepository interface {
    // 创建通知偏好
    Create(ctx context.Context, preference *models.NotificationPreference) error
    
    // 获取通知偏好（通过 ID）
    GetByID(ctx context.Context, id uint) (*models.NotificationPreference, error)
    
    // 获取通知偏好（通过用户 ID）
    GetByUserID(ctx context.Context, userID uint) ([]*models.NotificationPreference, error)
    
    // 获取通知偏好（通过用户 ID、类型和类别）
    GetByUserTypeCategory(ctx context.Context, userID uint, notificationType models.NotificationType, category string) (*models.NotificationPreference, error)
    
    // 获取通知偏好（通过用户 ID 和类型）
    GetByUserType(ctx context.Context, userID uint, notificationType models.NotificationType) (*models.NotificationPreference, error)
    
    // 更新通知偏好
    Update(ctx context.Context, preference *models.NotificationPreference) error
    
    // 删除通知偏好
    Delete(ctx context.Context, id uint) error
}
```

## API 控制器

```go
// internal/controllers/notification_controller.go
package controllers

import (
    "net/http"
    "strconv"
    
    "github.com/gin-gonic/gin"
    "github.com/rubick/internal/services"
    "github.com/rubick/internal/middleware"
    "github.com/rubick/internal/utils"
)

// NotificationController 通知控制器
type NotificationController struct {
    notificationService services.NotificationService
}

// NewNotificationController 创建通知控制器
func NewNotificationController(notificationService services.NotificationService) *NotificationController {
    return &NotificationController{
        notificationService: notificationService,
    }
}

// RegisterRoutes 注册路由
func (c *NotificationController) RegisterRoutes(router *gin.RouterGroup) {
    // 需要认证的路由
    protected := router.Group("/notifications")
    protected.Use(middleware.AuthMiddleware())
    {
        protected.GET("", c.ListNotifications)
        protected.GET("/:id", c.GetNotification)
        protected.POST("/:id/read", c.MarkAsRead)
        protected.POST("/read-multiple", c.MarkMultipleAsRead)
        protected.POST("/read-all", c.MarkAllAsRead)
        protected.DELETE("/:id", c.DeleteNotification)
        protected.DELETE("/multiple", c.DeleteMultipleNotifications)
        protected.GET("/unread-count", c.GetUnreadCount)
        protected.GET("/preferences", c.GetNotificationPreferences)
        protected.PUT("/preferences", c.UpdateNotificationPreferences)
    }
    
    // 管理员路由
    admin := router.Group("/admin/notifications")
    admin.Use(middleware.AuthMiddleware(), middleware.RoleMiddleware("admin"))
    {
        admin.POST("", c.SendNotification)
        admin.POST("/bulk", c.SendBulkNotifications)
        admin.POST("/template", c.SendTemplateNotification)
        admin.GET("/templates", c.ListNotificationTemplates)
        admin.POST("/templates", c.CreateNotificationTemplate)
        admin.PUT("/templates/:id", c.UpdateNotificationTemplate)
        admin.DELETE("/templates/:id", c.DeleteNotificationTemplate)
        admin.POST("/process-queue", c.ProcessNotificationQueue)
        admin.POST("/retry-failed", c.RetryFailedNotifications)
    }
}

// ListNotifications 获取通知列表
func (c *NotificationController) ListNotifications(ctx *gin.Context) {
    userID := middleware.GetUserID(ctx)
    
    // 解析查询参数
    page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
    pageSize, _ := strconv.Atoi(ctx.DefaultQuery("page_size", "20"))
    typeStr := ctx.Query("type")
    category := ctx.Query("category")
    statusStr := ctx.Query("status")
    isReadStr := ctx.Query("is_read")
    
    req := &services.ListNotificationsRequest{
        Page:     page,
        PageSize: pageSize,
        UserID:   userID,
        Type:     models.NotificationType(typeStr),
        Category: category,
        Status:   models.NotificationStatus(statusStr),
    }
    
    if isReadStr != "" {
        isRead := isReadStr == "true"
        req.IsRead = &isRead
    }
    
    if err := utils.ValidateStruct(req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Validation failed", err)
        return
    }
    
    response, err := c.notificationService.ListNotifications(ctx.Request.Context(), req)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to list notifications", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "Notifications retrieved successfully", response)
}

// GetNotification 获取通知详情
func (c *NotificationController) GetNotification(ctx *gin.Context) {
    userID := middleware.GetUserID(ctx)
    idStr := ctx.Param("id")
    id, err := strconv.ParseUint(idStr, 10, 32)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid notification ID", err)
        return
    }
    
    notification, err := c.notificationService.GetNotification(ctx.Request.Context(), uint(id))
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusNotFound, "Notification not found", err)
        return
    }
    
    // 检查权限
    if notification.RecipientID != userID {
        utils.ErrorResponse(ctx, http.StatusForbidden, "Access denied", nil)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "Notification retrieved successfully", notification)
}

// MarkAsRead 标记通知为已读
func (c *NotificationController) MarkAsRead(ctx *gin.Context) {
    userID := middleware.GetUserID(ctx)
    idStr := ctx.Param("id")
    id, err := strconv.ParseUint(idStr, 10, 32)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid notification ID", err)
        return
    }
    
    if err := c.notificationService.MarkAsRead(ctx.Request.Context(), uint(id), userID); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to mark notification as read", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "Notification marked as read successfully", nil)
}

// MarkMultipleAsRead 批量标记通知为已读
func (c *NotificationController) MarkMultipleAsRead(ctx *gin.Context) {
    userID := middleware.GetUserID(ctx)
    
    var req struct {
        NotificationIDs []uint `json:"notification_ids" validate:"required,min=1"`
    }
    
    if err := ctx.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request body", err)
        return
    }
    
    if err := utils.ValidateStruct(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Validation failed", err)
        return
    }
    
    if err := c.notificationService.MarkMultipleAsRead(ctx.Request.Context(), req.NotificationIDs, userID); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to mark notifications as read", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "Notifications marked as read successfully", nil)
}

// MarkAllAsRead 标记所有通知为已读
func (c *NotificationController) MarkAllAsRead(ctx *gin.Context) {
    userID := middleware.GetUserID(ctx)
    
    if err := c.notificationService.MarkAllAsRead(ctx.Request.Context(), userID); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to mark all notifications as read", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "All notifications marked as read successfully", nil)
}

// DeleteNotification 删除通知
func (c *NotificationController) DeleteNotification(ctx *gin.Context) {
    userID := middleware.GetUserID(ctx)
    idStr := ctx.Param("id")
    id, err := strconv.ParseUint(idStr, 10, 32)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid notification ID", err)
        return
    }
    
    if err := c.notificationService.DeleteNotification(ctx.Request.Context(), uint(id), userID); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to delete notification", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "Notification deleted successfully", nil)
}

// DeleteMultipleNotifications 批量删除通知
func (c *NotificationController) DeleteMultipleNotifications(ctx *gin.Context) {
    userID := middleware.GetUserID(ctx)
    
    var req struct {
        NotificationIDs []uint `json:"notification_ids" validate:"required,min=1"`
    }
    
    if err := ctx.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request body", err)
        return
    }
    
    if err := utils.ValidateStruct(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Validation failed", err)
        return
    }
    
    if err := c.notificationService.DeleteMultipleNotifications(ctx.Request.Context(), req.NotificationIDs, userID); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to delete notifications", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "Notifications deleted successfully", nil)
}

// GetUnreadCount 获取未读通知数量
func (c *NotificationController) GetUnreadCount(ctx *gin.Context) {
    userID := middleware.GetUserID(ctx)
    
    count, err := c.notificationService.GetUnreadCount(ctx.Request.Context(), userID)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to get unread count", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "Unread count retrieved successfully", map[string]interface{}{
        "unread_count": count,
    })
}

// GetNotificationPreferences 获取通知偏好
func (c *NotificationController) GetNotificationPreferences(ctx *gin.Context) {
    userID := middleware.GetUserID(ctx)
    
    preferences, err := c.notificationService.GetNotificationPreferences(ctx.Request.Context(), userID)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to get notification preferences", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "Notification preferences retrieved successfully", preferences)
}

// UpdateNotificationPreferences 更新通知偏好
func (c *NotificationController) UpdateNotificationPreferences(ctx *gin.Context) {
    userID := middleware.GetUserID(ctx)
    
    var req services.UpdateNotificationPreferencesRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request body", err)
        return
    }
    
    if err := utils.ValidateStruct(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Validation failed", err)
        return
    }
    
    if err := c.notificationService.UpdateNotificationPreferences(ctx.Request.Context(), userID, &req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to update notification preferences", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "Notification preferences updated successfully", nil)
}

// SendNotification 发送通知（管理员）
func (c *NotificationController) SendNotification(ctx *gin.Context) {
    var req services.SendNotificationRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request body", err)
        return
    }
    
    if err := utils.ValidateStruct(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Validation failed", err)
        return
    }
    
    notification, err := c.notificationService.SendNotification(ctx.Request.Context(), &req)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to send notification", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusCreated, "Notification sent successfully", notification)
}

// SendBulkNotifications 批量发送通知（管理员）
func (c *NotificationController) SendBulkNotifications(ctx *gin.Context) {
    var req services.SendBulkNotificationsRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request body", err)
        return
    }
    
    if err := utils.ValidateStruct(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Validation failed", err)
        return
    }
    
    response, err := c.notificationService.SendBulkNotifications(ctx.Request.Context(), &req)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to send bulk notifications", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusCreated, "Bulk notifications sent successfully", response)
}

// SendTemplateNotification 发送模板通知（管理员）
func (c *NotificationController) SendTemplateNotification(ctx *gin.Context) {
    var req services.SendTemplateNotificationRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request body", err)
        return
    }
    
    if err := utils.ValidateStruct(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Validation failed", err)
        return
    }
    
    notification, err := c.notificationService.SendTemplateNotification(ctx.Request.Context(), &req)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to send template notification", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusCreated, "Template notification sent successfully", notification)
}

// ListNotificationTemplates 获取通知模板列表（管理员）
func (c *NotificationController) ListNotificationTemplates(ctx *gin.Context) {
    // 解析查询参数
    page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
    pageSize, _ := strconv.Atoi(ctx.DefaultQuery("page_size", "20"))
    typeStr := ctx.Query("type")
    category := ctx.Query("category")
    isActiveStr := ctx.Query("is_active")
    
    req := &services.ListNotificationTemplatesRequest{
        Page:     page,
        PageSize: pageSize,
        Type:     models.NotificationType(typeStr),
        Category: category,
    }
    
    if isActiveStr != "" {
        isActive := isActiveStr == "true"
        req.IsActive = &isActive
    }
    
    if err := utils.ValidateStruct(req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Validation failed", err)
        return
    }
    
    response, err := c.notificationService.ListNotificationTemplates(ctx.Request.Context(), req)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to list notification templates", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "Notification templates retrieved successfully", response)
}

// CreateNotificationTemplate 创建通知模板（管理员）
func (c *NotificationController) CreateNotificationTemplate(ctx *gin.Context) {
    var req services.CreateNotificationTemplateRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request body", err)
        return
    }
    
    if err := utils.ValidateStruct(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Validation failed", err)
        return
    }
    
    template, err := c.notificationService.CreateNotificationTemplate(ctx.Request.Context(), &req)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to create notification template", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusCreated, "Notification template created successfully", template)
}

// UpdateNotificationTemplate 更新通知模板（管理员）
func (c *NotificationController) UpdateNotificationTemplate(ctx *gin.Context) {
    idStr := ctx.Param("id")
    id, err := strconv.ParseUint(idStr, 10, 32)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid template ID", err)
        return
    }
    
    var req services.UpdateNotificationTemplateRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request body", err)
        return
    }
    
    if err := utils.ValidateStruct(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Validation failed", err)
        return
    }
    
    template, err := c.notificationService.UpdateNotificationTemplate(ctx.Request.Context(), uint(id), &req)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to update notification template", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "Notification template updated successfully", template)
}

// DeleteNotificationTemplate 删除通知模板（管理员）
func (c *NotificationController) DeleteNotificationTemplate(ctx *gin.Context) {
    idStr := ctx.Param("id")
    id, err := strconv.ParseUint(idStr, 10, 32)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid template ID", err)
        return
    }
    
    if err := c.notificationService.DeleteNotificationTemplate(ctx.Request.Context(), uint(id)); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to delete notification template", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "Notification template deleted successfully", nil)
}

// ProcessNotificationQueue 处理通知队列（管理员）
func (c *NotificationController) ProcessNotificationQueue(ctx *gin.Context) {
    if err := c.notificationService.ProcessNotificationQueue(ctx.Request.Context()); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to process notification queue", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "Notification queue processed successfully", nil)
}

// RetryFailedNotifications 重试失败的通知（管理员）
func (c *NotificationController) RetryFailedNotifications(ctx *gin.Context) {
    if err := c.notificationService.RetryFailedNotifications(ctx.Request.Context()); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to retry failed notifications", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "Failed notifications retried successfully", nil)
}
```

## 邮件服务

```go
// internal/services/email_service.go
package services

import (
    "context"
    "fmt"
    "net/smtp"
    "strings"
    
    "github.com/rubick/internal/config"
    "github.com/rubick/internal/utils"
)

// EmailType 邮件类型
type EmailType string

const (
    EmailTypeNotification EmailType = "notification"
    EmailTypeVerification EmailType = "verification"
    EmailTypeResetPassword EmailType = "reset_password"
    EmailTypeWelcome      EmailType = "welcome"
)

// EmailService 邮件服务接口
type EmailService interface {
    // 发送邮件
    SendEmail(ctx context.Context, req *SendEmailRequest) error
    
    // 发送模板邮件
    SendTemplateEmail(ctx context.Context, req *SendTemplateEmailRequest) error
    
    // 发送验证邮件
    SendVerificationEmail(ctx context.Context, email, token string) error
    
    // 发送密码重置邮件
    SendResetPasswordEmail(ctx context.Context, email, token string) error
    
    // 发送欢迎邮件
    SendWelcomeEmail(ctx context.Context, email, username string) error
}

// SendEmailRequest 发送邮件请求
type SendEmailRequest struct {
    To      string    `json:"to" validate:"required,email"`
    Subject string    `json:"subject" validate:"required,max=255"`
    Body    string    `json:"body" validate:"required"`
    Type    EmailType `json:"type"`
    IsHTML  bool      `json:"is_html"`
}

// SendTemplateEmailRequest 发送模板邮件请求
type SendTemplateEmailRequest struct {
    To        string                 `json:"to" validate:"required,email"`
    Template  string                 `json:"template" validate:"required"`
    Subject   string                 `json:"subject" validate:"required,max=255"`
    Variables map[string]interface{} `json:"variables"`
    Type      EmailType              `json:"type"`
}

// emailService 邮件服务实现
type emailService struct {
    config *config.Config
}

// NewEmailService 创建邮件服务
func NewEmailService(config *config.Config) EmailService {
    return &emailService{
        config: config,
    }
}

// SendEmail 发送邮件
func (s *emailService) SendEmail(ctx context.Context, req *SendEmailRequest) error {
    // 构建邮件内容
    message := s.buildMessage(req.To, req.Subject, req.Body, req.IsHTML)
    
    // 发送邮件
    auth := smtp.PlainAuth("", s.config.Email.User, s.config.Email.Password, s.config.Email.Host)
    
    err := smtp.SendMail(
        fmt.Sprintf("%s:%d", s.config.Email.Host, s.config.Email.Port),
        auth,
        s.config.Email.From,
        []string{req.To},
        []byte(message),
    )
    
    if err != nil {
        return fmt.Errorf("failed to send email: %w", err)
    }
    
    return nil
}

// SendTemplateEmail 发送模板邮件
func (s *emailService) SendTemplateEmail(ctx context.Context, req *SendTemplateEmailRequest) error {
    // 获取邮件模板
    template, err := s.getEmailTemplate(req.Template)
    if err != nil {
        return fmt.Errorf("failed to get email template: %w", err)
    }
    
    // 渲染模板
    subject, body, err := s.renderEmailTemplate(template, req.Subject, req.Variables)
    if err != nil {
        return fmt.Errorf("failed to render email template: %w", err)
    }
    
    // 发送邮件
    sendReq := &SendEmailRequest{
        To:      req.To,
        Subject: subject,
        Body:    body,
        Type:    req.Type,
        IsHTML:  template.IsHTML,
    }
    
    return s.SendEmail(ctx, sendReq)
}

// SendVerificationEmail 发送验证邮件
func (s *emailService) SendVerificationEmail(ctx context.Context, email, token string) error {
    variables := map[string]interface{}{
        "token": token,
        "link":  fmt.Sprintf("%s/verify?token=%s", s.config.App.BaseURL, token),
    }
    
    req := &SendTemplateEmailRequest{
        To:        email,
        Template:  "verification",
        Subject:   "Verify your email address",
        Variables: variables,
        Type:      EmailTypeVerification,
    }
    
    return s.SendTemplateEmail(ctx, req)
}

// SendResetPasswordEmail 发送密码重置邮件
func (s *emailService) SendResetPasswordEmail(ctx context.Context, email, token string) error {
    variables := map[string]interface{}{
        "token": token,
        "link":  fmt.Sprintf("%s/reset-password?token=%s", s.config.App.BaseURL, token),
    }
    
    req := &SendTemplateEmailRequest{
        To:        email,
        Template:  "reset_password",
        Subject:   "Reset your password",
        Variables: variables,
        Type:      EmailTypeResetPassword,
    }
    
    return s.SendTemplateEmail(ctx, req)
}

// SendWelcomeEmail 发送欢迎邮件
func (s *emailService) SendWelcomeEmail(ctx context.Context, email, username string) error {
    variables := map[string]interface{}{
        "username": username,
        "link":     s.config.App.BaseURL,
    }
    
    req := &SendTemplateEmailRequest{
        To:        email,
        Template:  "welcome",
        Subject:   "Welcome to Rubick",
        Variables: variables,
        Type:      EmailTypeWelcome,
    }
    
    return s.SendTemplateEmail(ctx, req)
}

// 辅助方法

// buildMessage 构建邮件消息
func (s *emailService) buildMessage(to, subject, body string, isHTML bool) string {
    var message strings.Builder
    
    message.WriteString(fmt.Sprintf("From: %s\r\n", s.config.Email.From))
    message.WriteString(fmt.Sprintf("To: %s\r\n", to))
    message.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
    
    if isHTML {
        message.WriteString("MIME-version: 1.0;\r\nContent-Type: text/html; charset=\"UTF-8\";\r\n\r\n")
    } else {
        message.WriteString("MIME-version: 1.0;\r\nContent-Type: text/plain; charset=\"UTF-8\";\r\n\r\n")
    }
    
    message.WriteString(body)
    
    return message.String()
}

// getEmailTemplate 获取邮件模板
func (s *emailService) getEmailTemplate(templateName string) (*EmailTemplate, error) {
    // 这里可以从数据库或文件系统获取邮件模板
    // 为了简化，这里使用硬编码的模板
    switch templateName {
    case "verification":
        return &EmailTemplate{
            Subject: "Verify your email address",
            Body:    `<p>Please click the following link to verify your email address: <a href="{{.link}}">{{.link}}</a></p>`,
            IsHTML:  true,
        }, nil
    case "reset_password":
        return &EmailTemplate{
            Subject: "Reset your password",
            Body:    `<p>Please click the following link to reset your password: <a href="{{.link}}">{{.link}}</a></p>`,
            IsHTML:  true,
        }, nil
    case "welcome":
        return &EmailTemplate{
            Subject: "Welcome to Rubick",
            Body:    `<p>Welcome to Rubick, {{.username}}! Please click the following link to get started: <a href="{{.link}}">{{.link}}</a></p>`,
            IsHTML:  true,
        }, nil
    default:
        return nil, fmt.Errorf("email template not found: %s", templateName)
    }
}

// renderEmailTemplate 渲染邮件模板
func (s *emailService) renderEmailTemplate(template *EmailTemplate, subject string, variables map[string]interface{}) (string, string, error) {
    // 渲染主题
    renderedSubject, err := utils.RenderTemplate(subject, variables)
    if err != nil {
        return "", "", fmt.Errorf("failed to render subject: %w", err)
    }
    
    // 渲染内容
    renderedBody, err := utils.RenderTemplate(template.Body, variables)
    if err != nil {
        return "", "", fmt.Errorf("failed to render body: %w", err)
    }
    
    return renderedSubject, renderedBody, nil
}

// EmailTemplate 邮件模板
type EmailTemplate struct {
    Subject string
    Body    string
    IsHTML  bool
}
```

## 测试

### 单元测试

```go
// internal/services/notification_service_test.go
package services_test

import (
    "context"
    "testing"
    "time"
    
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    "github.com/rubick/internal/models"
    "github.com/rubick/internal/services"
    "github.com/rubick/internal/repositories/mocks"
)

func TestNotificationService_SendNotification(t *testing.T) {
    // 创建模拟对象
    mockNotificationRepo := new(mocks.NotificationRepository)
    mockTemplateRepo := new(mocks.NotificationTemplateRepository)
    mockPreferenceRepo := new(mocks.NotificationPreferenceRepository)
    mockUserRepo := new(mocks.UserRepository)
    mockEmailService := new(mocks.EmailService)
    mockPushService := new(mocks.PushService)
    mockSMSService := new(mocks.SMSService)
    
    // 创建服务
    notificationService := services.NewNotificationService(
        mockNotificationRepo,
        mockTemplateRepo,
        mockPreferenceRepo,
        mockUserRepo,
        mockEmailService,
        mockPushService,
        mockSMSService,
        &config.Config{},
    )
    
    // 测试数据
    req := &services.SendNotificationRequest{
        Title:       "Test Notification",
        Content:     "This is a test notification",
        Type:        models.NotificationTypeSystem,
        Category:    "test",
        Priority:    models.NotificationPriorityNormal,
        RecipientID: 1,
        Channels:    []models.ChannelType{models.ChannelTypeInApp},
    }
    
    // 创建测试用户
    recipient := &models.User{
        ID:       1,
        UUID:     "test-uuid",
        Username: "testuser",
        Email:    "test@example.com",
    }
    
    // 创建测试偏好
    preference := &models.NotificationPreference{
        UserID:    1,
        Type:      models.NotificationTypeSystem,
        Category:  "test",
        Channels:  `[{"type": "in_app"}]`,
        IsEnabled: true,
    }
    
    // 设置模拟期望
    mockUserRepo.On("GetByID", mock.Anything, req.RecipientID).Return(recipient, nil)
    mockPreferenceRepo.On("GetByUserTypeCategory", mock.Anything, req.RecipientID, req.Type, req.Category).Return(preference, nil)
    mockNotificationRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Notification")).Return(nil)
    mockNotificationRepo.On("CreateChannel", mock.Anything, mock.AnythingOfType("*models.NotificationChannel")).Return(nil)
    
    // 执行测试
    notification, err := notificationService.SendNotification(context.Background(), req)
    
    // 断言
    assert.NoError(t, err)
    assert.NotNil(t, notification)
    assert.Equal(t, req.Title, notification.Title)
    assert.Equal(t, req.Content, notification.Content)
    assert.Equal(t, req.Type, notification.Type)
    assert.Equal(t, req.Category, notification.Category)
    assert.Equal(t, req.Priority, notification.Priority)
    assert.Equal(t, req.RecipientID, notification.RecipientID)
    
    // 验证模拟调用
    mockUserRepo.AssertExpectations(t)
    mockPreferenceRepo.AssertExpectations(t)
    mockNotificationRepo.AssertExpectations(t)
}
```

## 性能优化

### 批量处理

```go
// internal/services/notification_service_batch.go
package services

import (
    "context"
    "fmt"
    "sync"
    "time"
    
    "github.com/rubick/internal/models"
)

// BatchNotificationService 批量通知服务
type BatchNotificationService struct {
    notificationService NotificationService
    batchSize          int
    maxConcurrency     int
}

// NewBatchNotificationService 创建批量通知服务
func NewBatchNotificationService(
    notificationService NotificationService,
    batchSize int,
    maxConcurrency int,
) *BatchNotificationService {
    return &BatchNotificationService{
        notificationService: notificationService,
        batchSize:          batchSize,
        maxConcurrency:     maxConcurrency,
    }
}

// SendBulkNotificationsOptimized 优化的批量发送通知
func (s *BatchNotificationService) SendBulkNotificationsOptimized(ctx context.Context, req *SendBulkNotificationsRequest) (*BulkNotificationResponse, error) {
    var notifications []*NotificationResponse
    var errorsList []string
    successCount := 0
    failureCount := 0
    
    // 分批处理
    batches := s.createBatches(req.RecipientIDs, s.batchSize)
    
    // 使用通道控制并发
    results := make(chan *batchResult, len(batches))
    
    // 启动工作协程
    var wg sync.WaitGroup
    semaphore := make(chan struct{}, s.maxConcurrency)
    
    for i, batch := range batches {
        wg.Add(1)
        go func(batchIndex int, recipientBatch []uint) {
            defer wg.Done()
            
            // 获取信号量
            semaphore <- struct{}{}
            defer func() { <-semaphore }()
            
            // 处理批次
            result := s.processBatch(ctx, req, recipientBatch)
            results <- result
        }(i, batch)
    }
    
    // 等待所有批次完成
    go func() {
        wg.Wait()
        close(results)
    }()
    
    // 收集结果
    for result := range results {
        notifications = append(notifications, result.Notifications...)
        errorsList = append(errorsList, result.Errors...)
        successCount += result.SuccessCount
        failureCount += result.FailureCount
    }
    
    return &BulkNotificationResponse{
        SuccessCount:  successCount,
        FailureCount:  failureCount,
        Notifications: notifications,
        Errors:        errorsList,
    }, nil
}

// batchResult 批次结果
type batchResult struct {
        Notifications []*NotificationResponse
        Errors        []string
        SuccessCount  int
        FailureCount  int
}

// createBatches 创建批次
func (s *BatchNotificationService) createBatches(items []uint, batchSize int) [][]uint {
    var batches [][]uint
    
    for batchSize < len(items) {
        items, batches = items[batchSize:], append(batches, items[0:batchSize:batchSize])
    }
    
    batches = append(batches, items)
    
    return batches
}

// processBatch 处理批次
func (s *BatchNotificationService) processBatch(ctx context.Context, req *SendBulkNotificationsRequest, recipientIDs []uint) *batchResult {
    var notifications []*NotificationResponse
    var errorsList []string
    successCount := 0
    failureCount := 0
    
    // 为批次中的每个接收者创建通知
    for _, recipientID := range recipientIDs {
        singleReq := &SendNotificationRequest{
            Title:       req.Title,
            Content:     req.Content,
            Type:        req.Type,
            Category:    req.Category,
            Priority:    req.Priority,
            SenderID:    req.SenderID,
            RecipientID: recipientID,
            Channels:    req.Channels,
            ExpiresAt:   req.ExpiresAt,
            Metadata:    req.Metadata,
        }
        
        notification, err := s.notificationService.SendNotification(ctx, singleReq)
        if err != nil {
            failureCount++
            errorsList = append(errorsList, fmt.Sprintf("Failed to send notification to user %d: %v", recipientID, err))
            continue
        }
        
        notifications = append(notifications, notification)
        successCount++
    }
    
    return &batchResult{
        Notifications: notifications,
        Errors:        errorsList,
        SuccessCount:  successCount,
        FailureCount:  failureCount,
    }
}
```

## 更多资源

- [Go 邮件发送最佳实践](https://github.com/go-gomail/gomail)
- [WebSocket 实时通知](https://github.com/gorilla/websocket)
- [消息队列设计模式](https://redis.io/docs/manual/patterns/)
- [Go 并发编程](https://golang.org/doc/effective_go#concurrency)
- [Go 测试最佳实践](https://github.com/golang/go/wiki/Testing)