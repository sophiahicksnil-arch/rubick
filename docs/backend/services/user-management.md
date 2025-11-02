# 用户管理服务

## 概述

用户管理服务是 Rubick 后端的核心服务之一，负责处理用户注册、登录、认证、授权和用户信息管理等功能。本文档详细介绍用户管理服务的设计、实现和使用方法。

## 功能特性

- 用户注册和登录
- JWT 令牌认证
- 基于角色的访问控制 (RBAC)
- 用户信息管理
- 密码重置和找回
- 用户会话管理
- 第三方登录集成
- 用户活动日志

## 数据模型

### 用户模型

```go
// internal/models/user.go
package models

import (
    "time"
    "gorm.io/gorm"
)

// User 用户模型
type User struct {
    ID        uint           `json:"id" gorm:"primaryKey"`
    UUID      string         `json:"uuid" gorm:"type:varchar(36);uniqueIndex;not null"`
    Username  string         `json:"username" gorm:"type:varchar(50);uniqueIndex;not null"`
    Email     string         `json:"email" gorm:"type:varchar(100);uniqueIndex;not null"`
    Password  string         `json:"-" gorm:"type:varchar(255);not null"`
    Nickname  string         `json:"nickname" gorm:"type:varchar(100)"`
    Avatar    string         `json:"avatar" gorm:"type:varchar(255)"`
    Bio       string         `json:"bio" gorm:"type:text"`
    Status    UserStatus     `json:"status" gorm:"type:varchar(20);default:'active'"`
    Role      UserRole       `json:"role" gorm:"type:varchar(20);default:'user'"`
    LastLogin *time.Time     `json:"last_login"`
    CreatedAt time.Time      `json:"created_at"`
    UpdatedAt time.Time      `json:"updated_at"`
    DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
    
    // 关联
    Profiles []UserProfile `json:"profiles,omitempty" gorm:"foreignKey:UserID"`
    Sessions []UserSession `json:"sessions,omitempty" gorm:"foreignKey:UserID"`
    Logs     []UserLog     `json:"logs,omitempty" gorm:"foreignKey:UserID"`
}

// UserStatus 用户状态
type UserStatus string

const (
    UserStatusActive   UserStatus = "active"
    UserStatusInactive UserStatus = "inactive"
    UserStatusBlocked  UserStatus = "blocked"
    UserStatusPending  UserStatus = "pending"
)

// UserRole 用户角色
type UserRole string

const (
    UserRoleAdmin     UserRole = "admin"
    UserRoleModerator UserRole = "moderator"
    UserRoleUser      UserRole = "user"
    UserRoleGuest     UserRole = "guest"
)

// UserProfile 用户配置文件
type UserProfile struct {
    ID          uint      `json:"id" gorm:"primaryKey"`
    UserID      uint      `json:"user_id" gorm:"not null;index"`
    Key         string    `json:"key" gorm:"type:varchar(100);not null"`
    Value       string    `json:"value" gorm:"type:text"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
    
    // 关联
    User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// UserSession 用户会话
type UserSession struct {
    ID           string    `json:"id" gorm:"primaryKey"`
    UserID       uint      `json:"user_id" gorm:"not null;index"`
    Token        string    `json:"token" gorm:"type:varchar(500);not null"`
    RefreshToken string    `json:"refresh_token" gorm:"type:varchar(500)"`
    IPAddress    string    `json:"ip_address" gorm:"type:varchar(45)"`
    UserAgent    string    `json:"user_agent" gorm:"type:varchar(500)"`
    ExpiresAt    time.Time `json:"expires_at"`
    CreatedAt    time.Time `json:"created_at"`
    UpdatedAt    time.Time `json:"updated_at"`
    
    // 关联
    User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// UserLog 用户日志
type UserLog struct {
    ID        uint      `json:"id" gorm:"primaryKey"`
    UserID    uint      `json:"user_id" gorm:"not null;index"`
    Action    string    `json:"action" gorm:"type:varchar(100);not null"`
    Resource  string    `json:"resource" gorm:"type:varchar(100)"`
    Details   string    `json:"details" gorm:"type:text"`
    IPAddress string    `json:"ip_address" gorm:"type:varchar(45)"`
    UserAgent string    `json:"user_agent" gorm:"type:varchar(500)"`
    CreatedAt time.Time `json:"created_at"`
    
    // 关联
    User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}
```

## 服务实现

### 用户服务接口

```go
// internal/services/user_service.go
package services

import (
    "context"
    "errors"
    "fmt"
    "time"
    
    "github.com/rubick/internal/models"
    "github.com/rubick/internal/repositories"
    "github.com/rubick/internal/utils"
    "github.com/rubick/internal/config"
    "golang.org/x/crypto/bcrypt"
)

// UserService 用户服务接口
type UserService interface {
    // 用户注册
    Register(ctx context.Context, req *RegisterRequest) (*UserResponse, error)
    
    // 用户登录
    Login(ctx context.Context, req *LoginRequest) (*LoginResponse, error)
    
    // 刷新令牌
    RefreshToken(ctx context.Context, refreshToken string) (*LoginResponse, error)
    
    // 登出
    Logout(ctx context.Context, token string) error
    
    // 获取用户信息
    GetUserByID(ctx context.Context, userID uint) (*UserResponse, error)
    
    // 获取用户信息（通过 UUID）
    GetUserByUUID(ctx context.Context, uuid string) (*UserResponse, error)
    
    // 更新用户信息
    UpdateUser(ctx context.Context, userID uint, req *UpdateUserRequest) (*UserResponse, error)
    
    // 修改密码
    ChangePassword(ctx context.Context, userID uint, req *ChangePasswordRequest) error
    
    // 重置密码
    ResetPassword(ctx context.Context, req *ResetPasswordRequest) error
    
    // 获取用户列表
    ListUsers(ctx context.Context, req *ListUsersRequest) (*ListUsersResponse, error)
    
    // 删除用户
    DeleteUser(ctx context.Context, userID uint) error
    
    // 更新用户状态
    UpdateUserStatus(ctx context.Context, userID uint, status models.UserStatus) error
    
    // 更新用户角色
    UpdateUserRole(ctx context.Context, userID uint, role models.UserRole) error
    
    // 获取用户会话
    GetUserSessions(ctx context.Context, userID uint) ([]*UserSessionResponse, error)
    
    // 撤销用户会话
    RevokeUserSession(ctx context.Context, userID uint, sessionID string) error
    
    // 撤销所有用户会话
    RevokeAllUserSessions(ctx context.Context, userID uint) error
    
    // 记录用户活动
    LogUserActivity(ctx context.Context, userID uint, action, resource, details, ipAddress, userAgent string) error
}

// userService 用户服务实现
type userService struct {
    userRepo    repositories.UserRepository
    sessionRepo repositories.SessionRepository
    logRepo     repositories.LogRepository
    config      *config.Config
    jwt         *utils.JWT
}

// NewUserService 创建用户服务
func NewUserService(
    userRepo repositories.UserRepository,
    sessionRepo repositories.SessionRepository,
    logRepo repositories.LogRepository,
    config *config.Config,
    jwt *utils.JWT,
) UserService {
    return &userService{
        userRepo:    userRepo,
        sessionRepo: sessionRepo,
        logRepo:     logRepo,
        config:      config,
        jwt:         jwt,
    }
}

// RegisterRequest 注册请求
type RegisterRequest struct {
    Username string `json:"username" validate:"required,min=3,max=50"`
    Email    string `json:"email" validate:"required,email"`
    Password string `json:"password" validate:"required,min=8,max=100"`
    Nickname string `json:"nickname" validate:"max=100"`
}

// LoginRequest 登录请求
type LoginRequest struct {
    Username string `json:"username" validate:"required"`
    Password string `json:"password" validate:"required"`
}

// LoginResponse 登录响应
type LoginResponse struct {
    User         *UserResponse     `json:"user"`
    AccessToken  string            `json:"access_token"`
    RefreshToken string            `json:"refresh_token"`
    ExpiresIn    int64             `json:"expires_in"`
    TokenType    string            `json:"token_type"`
}

// UserResponse 用户响应
type UserResponse struct {
    ID        uint               `json:"id"`
    UUID      string             `json:"uuid"`
    Username  string             `json:"username"`
    Email     string             `json:"email"`
    Nickname  string             `json:"nickname"`
    Avatar    string             `json:"avatar"`
    Bio       string             `json:"bio"`
    Status    models.UserStatus  `json:"status"`
    Role      models.UserRole    `json:"role"`
    LastLogin *time.Time         `json:"last_login"`
    CreatedAt time.Time          `json:"created_at"`
    UpdatedAt time.Time          `json:"updated_at"`
    Profiles  []*UserProfileResponse `json:"profiles,omitempty"`
}

// UserProfileResponse 用户配置文件响应
type UserProfileResponse struct {
    Key       string    `json:"key"`
    Value     string    `json:"value"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

// UpdateUserRequest 更新用户请求
type UpdateUserRequest struct {
    Nickname string `json:"nickname" validate:"max=100"`
    Avatar   string `json:"avatar" validate:"url"`
    Bio      string `json:"bio" validate:"max=500"`
}

// ChangePasswordRequest 修改密码请求
type ChangePasswordRequest struct {
    OldPassword string `json:"old_password" validate:"required"`
    NewPassword string `json:"new_password" validate:"required,min=8,max=100"`
}

// ResetPasswordRequest 重置密码请求
type ResetPasswordRequest struct {
    Email           string `json:"email" validate:"required,email"`
    ResetToken      string `json:"reset_token" validate:"required"`
    NewPassword     string `json:"new_password" validate:"required,min=8,max=100"`
}

// ListUsersRequest 获取用户列表请求
type ListUsersRequest struct {
    Page     int                `json:"page" validate:"min=1"`
    PageSize int                `json:"page_size" validate:"min=1,max=100"`
    Status   models.UserStatus  `json:"status"`
    Role     models.UserRole    `json:"role"`
    Keyword  string             `json:"keyword"`
}

// ListUsersResponse 获取用户列表响应
type ListUsersResponse struct {
    Users      []*UserResponse `json:"users"`
    Total      int64           `json:"total"`
    Page       int             `json:"page"`
    PageSize   int             `json:"page_size"`
    TotalPages int             `json:"total_pages"`
}

// UserSessionResponse 用户会话响应
type UserSessionResponse struct {
    ID        string    `json:"id"`
    IPAddress string    `json:"ip_address"`
    UserAgent string    `json:"user_agent"`
    ExpiresAt time.Time `json:"expires_at"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
```

### 用户服务实现

```go
// internal/services/user_service_impl.go
package services

import (
    "context"
    "errors"
    "fmt"
    "time"
    
    "github.com/google/uuid"
    "github.com/rubick/internal/models"
    "github.com/rubick/internal/utils"
    "golang.org/x/crypto/bcrypt"
)

// Register 用户注册
func (s *userService) Register(ctx context.Context, req *RegisterRequest) (*UserResponse, error) {
    // 检查用户名是否已存在
    existingUser, err := s.userRepo.GetByUsername(ctx, req.Username)
    if err == nil && existingUser != nil {
        return nil, errors.New("username already exists")
    }
    
    // 检查邮箱是否已存在
    existingUser, err = s.userRepo.GetByEmail(ctx, req.Email)
    if err == nil && existingUser != nil {
        return nil, errors.New("email already exists")
    }
    
    // 加密密码
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        return nil, fmt.Errorf("failed to hash password: %w", err)
    }
    
    // 创建用户
    user := &models.User{
        UUID:     uuid.New().String(),
        Username: req.Username,
        Email:    req.Email,
        Password: string(hashedPassword),
        Nickname: req.Nickname,
        Status:   models.UserStatusActive,
        Role:     models.UserRoleUser,
    }
    
    if err := s.userRepo.Create(ctx, user); err != nil {
        return nil, fmt.Errorf("failed to create user: %w", err)
    }
    
    // 记录用户活动
    if err := s.LogUserActivity(ctx, user.ID, "register", "user", "User registered", "", ""); err != nil {
        // 记录日志失败不影响注册流程
    }
    
    return s.toUserResponse(user), nil
}

// Login 用户登录
func (s *userService) Login(ctx context.Context, req *LoginRequest) (*LoginResponse, error) {
    // 获取用户
    user, err := s.userRepo.GetByUsername(ctx, req.Username)
    if err != nil {
        return nil, errors.New("invalid username or password")
    }
    
    // 检查用户状态
    if user.Status != models.UserStatusActive {
        return nil, errors.New("user account is not active")
    }
    
    // 验证密码
    if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
        return nil, errors.New("invalid username or password")
    }
    
    // 生成 JWT 令牌
    accessToken, err := s.jwt.GenerateToken(user.ID, user.UUID, string(user.Role))
    if err != nil {
        return nil, fmt.Errorf("failed to generate access token: %w", err)
    }
    
    refreshToken, err := s.jwt.GenerateRefreshToken(user.ID)
    if err != nil {
        return nil, fmt.Errorf("failed to generate refresh token: %w", err)
    }
    
    // 创建会话
    session := &models.UserSession{
        ID:           uuid.New().String(),
        UserID:       user.ID,
        Token:        accessToken,
        RefreshToken: refreshToken,
        ExpiresAt:    time.Now().Add(s.config.JWT.Expiration),
    }
    
    if err := s.sessionRepo.Create(ctx, session); err != nil {
        return nil, fmt.Errorf("failed to create session: %w", err)
    }
    
    // 更新最后登录时间
    now := time.Now()
    user.LastLogin = &now
    if err := s.userRepo.Update(ctx, user); err != nil {
        // 更新失败不影响登录流程
    }
    
    // 记录用户活动
    if err := s.LogUserActivity(ctx, user.ID, "login", "user", "User logged in", "", ""); err != nil {
        // 记录日志失败不影响登录流程
    }
    
    return &LoginResponse{
        User:         s.toUserResponse(user),
        AccessToken:  accessToken,
        RefreshToken: refreshToken,
        ExpiresIn:    int64(s.config.JWT.Expiration.Seconds()),
        TokenType:    "Bearer",
    }, nil
}

// RefreshToken 刷新令牌
func (s *userService) RefreshToken(ctx context.Context, refreshToken string) (*LoginResponse, error) {
    // 验证刷新令牌
    claims, err := s.jwt.ValidateRefreshToken(refreshToken)
    if err != nil {
        return nil, fmt.Errorf("invalid refresh token: %w", err)
    }
    
    // 获取用户
    user, err := s.userRepo.GetByID(ctx, claims.UserID)
    if err != nil {
        return nil, errors.New("user not found")
    }
    
    // 检查用户状态
    if user.Status != models.UserStatusActive {
        return nil, errors.New("user account is not active")
    }
    
    // 生成新的 JWT 令牌
    accessToken, err := s.jwt.GenerateToken(user.ID, user.UUID, string(user.Role))
    if err != nil {
        return nil, fmt.Errorf("failed to generate access token: %w", err)
    }
    
    newRefreshToken, err := s.jwt.GenerateRefreshToken(user.ID)
    if err != nil {
        return nil, fmt.Errorf("failed to generate refresh token: %w", err)
    }
    
    // 更新会话
    session, err := s.sessionRepo.GetByRefreshToken(ctx, refreshToken)
    if err != nil {
        return nil, errors.New("session not found")
    }
    
    session.Token = accessToken
    session.RefreshToken = newRefreshToken
    session.ExpiresAt = time.Now().Add(s.config.JWT.Expiration)
    
    if err := s.sessionRepo.Update(ctx, session); err != nil {
        return nil, fmt.Errorf("failed to update session: %w", err)
    }
    
    return &LoginResponse{
        User:         s.toUserResponse(user),
        AccessToken:  accessToken,
        RefreshToken: newRefreshToken,
        ExpiresIn:    int64(s.config.JWT.Expiration.Seconds()),
        TokenType:    "Bearer",
    }, nil
}

// Logout 用户登出
func (s *userService) Logout(ctx context.Context, token string) error {
    // 验证令牌
    claims, err := s.jwt.ValidateToken(token)
    if err != nil {
        return fmt.Errorf("invalid token: %w", err)
    }
    
    // 删除会话
    if err := s.sessionRepo.DeleteByToken(ctx, token); err != nil {
        return fmt.Errorf("failed to delete session: %w", err)
    }
    
    // 记录用户活动
    if err := s.LogUserActivity(ctx, claims.UserID, "logout", "user", "User logged out", "", ""); err != nil {
        // 记录日志失败不影响登出流程
    }
    
    return nil
}

// GetUserByID 获取用户信息
func (s *userService) GetUserByID(ctx context.Context, userID uint) (*UserResponse, error) {
    user, err := s.userRepo.GetByID(ctx, userID)
    if err != nil {
        return nil, fmt.Errorf("failed to get user: %w", err)
    }
    
    return s.toUserResponse(user), nil
}

// GetUserByUUID 获取用户信息（通过 UUID）
func (s *userService) GetUserByUUID(ctx context.Context, uuid string) (*UserResponse, error) {
    user, err := s.userRepo.GetByUUID(ctx, uuid)
    if err != nil {
        return nil, fmt.Errorf("failed to get user: %w", err)
    }
    
    return s.toUserResponse(user), nil
}

// UpdateUser 更新用户信息
func (s *userService) UpdateUser(ctx context.Context, userID uint, req *UpdateUserRequest) (*UserResponse, error) {
    user, err := s.userRepo.GetByID(ctx, userID)
    if err != nil {
        return nil, fmt.Errorf("failed to get user: %w", err)
    }
    
    // 更新用户信息
    if req.Nickname != "" {
        user.Nickname = req.Nickname
    }
    if req.Avatar != "" {
        user.Avatar = req.Avatar
    }
    if req.Bio != "" {
        user.Bio = req.Bio
    }
    
    if err := s.userRepo.Update(ctx, user); err != nil {
        return nil, fmt.Errorf("failed to update user: %w", err)
    }
    
    // 记录用户活动
    if err := s.LogUserActivity(ctx, userID, "update", "user", "User profile updated", "", ""); err != nil {
        // 记录日志失败不影响更新流程
    }
    
    return s.toUserResponse(user), nil
}

// ChangePassword 修改密码
func (s *userService) ChangePassword(ctx context.Context, userID uint, req *ChangePasswordRequest) error {
    user, err := s.userRepo.GetByID(ctx, userID)
    if err != nil {
        return fmt.Errorf("failed to get user: %w", err)
    }
    
    // 验证旧密码
    if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword)); err != nil {
        return errors.New("invalid old password")
    }
    
    // 加密新密码
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
    if err != nil {
        return fmt.Errorf("failed to hash password: %w", err)
    }
    
    // 更新密码
    user.Password = string(hashedPassword)
    if err := s.userRepo.Update(ctx, user); err != nil {
        return fmt.Errorf("failed to update password: %w", err)
    }
    
    // 撤销所有会话
    if err := s.RevokeAllUserSessions(ctx, userID); err != nil {
        // 撤销会话失败不影响密码修改
    }
    
    // 记录用户活动
    if err := s.LogUserActivity(ctx, userID, "change_password", "user", "Password changed", "", ""); err != nil {
        // 记录日志失败不影响密码修改
    }
    
    return nil
}

// ResetPassword 重置密码
func (s *userService) ResetPassword(ctx context.Context, req *ResetPasswordRequest) error {
    // 验证重置令牌
    // 这里应该实现令牌验证逻辑
    
    // 获取用户
    user, err := s.userRepo.GetByEmail(ctx, req.Email)
    if err != nil {
        return errors.New("user not found")
    }
    
    // 加密新密码
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
    if err != nil {
        return fmt.Errorf("failed to hash password: %w", err)
    }
    
    // 更新密码
    user.Password = string(hashedPassword)
    if err := s.userRepo.Update(ctx, user); err != nil {
        return fmt.Errorf("failed to update password: %w", err)
    }
    
    // 撤销所有会话
    if err := s.RevokeAllUserSessions(ctx, user.ID); err != nil {
        // 撤销会话失败不影响密码重置
    }
    
    // 记录用户活动
    if err := s.LogUserActivity(ctx, user.ID, "reset_password", "user", "Password reset", "", ""); err != nil {
        // 记录日志失败不影响密码重置
    }
    
    return nil
}

// ListUsers 获取用户列表
func (s *userService) ListUsers(ctx context.Context, req *ListUsersRequest) (*ListUsersResponse, error) {
    // 设置默认值
    if req.Page <= 0 {
        req.Page = 1
    }
    if req.PageSize <= 0 {
        req.PageSize = 20
    }
    
    // 计算偏移量
    offset := (req.Page - 1) * req.PageSize
    
    // 获取用户列表
    users, total, err := s.userRepo.List(ctx, &repositories.ListUsersOptions{
        Offset:  offset,
        Limit:   req.PageSize,
        Status:  req.Status,
        Role:    req.Role,
        Keyword: req.Keyword,
    })
    if err != nil {
        return nil, fmt.Errorf("failed to list users: %w", err)
    }
    
    // 转换响应
    userResponses := make([]*UserResponse, len(users))
    for i, user := range users {
        userResponses[i] = s.toUserResponse(user)
    }
    
    // 计算总页数
    totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))
    
    return &ListUsersResponse{
        Users:      userResponses,
        Total:      total,
        Page:       req.Page,
        PageSize:   req.PageSize,
        TotalPages: totalPages,
    }, nil
}

// DeleteUser 删除用户
func (s *userService) DeleteUser(ctx context.Context, userID uint) error {
    // 获取用户
    user, err := s.userRepo.GetByID(ctx, userID)
    if err != nil {
        return fmt.Errorf("failed to get user: %w", err)
    }
    
    // 软删除用户
    if err := s.userRepo.Delete(ctx, userID); err != nil {
        return fmt.Errorf("failed to delete user: %w", err)
    }
    
    // 撤销所有会话
    if err := s.RevokeAllUserSessions(ctx, userID); err != nil {
        // 撤销会话失败不影响用户删除
    }
    
    // 记录用户活动
    if err := s.LogUserActivity(ctx, userID, "delete", "user", "User deleted", "", ""); err != nil {
        // 记录日志失败不影响用户删除
    }
    
    return nil
}

// UpdateUserStatus 更新用户状态
func (s *userService) UpdateUserStatus(ctx context.Context, userID uint, status models.UserStatus) error {
    // 获取用户
    user, err := s.userRepo.GetByID(ctx, userID)
    if err != nil {
        return fmt.Errorf("failed to get user: %w", err)
    }
    
    // 更新状态
    user.Status = status
    if err := s.userRepo.Update(ctx, user); err != nil {
        return fmt.Errorf("failed to update user status: %w", err)
    }
    
    // 如果状态为非活跃，撤销所有会话
    if status != models.UserStatusActive {
        if err := s.RevokeAllUserSessions(ctx, userID); err != nil {
            // 撤销会话失败不影响状态更新
        }
    }
    
    // 记录用户活动
    if err := s.LogUserActivity(ctx, userID, "update_status", "user", fmt.Sprintf("User status updated to %s", status), "", ""); err != nil {
        // 记录日志失败不影响状态更新
    }
    
    return nil
}

// UpdateUserRole 更新用户角色
func (s *userService) UpdateUserRole(ctx context.Context, userID uint, role models.UserRole) error {
    // 获取用户
    user, err := s.userRepo.GetByID(ctx, userID)
    if err != nil {
        return fmt.Errorf("failed to get user: %w", err)
    }
    
    // 更新角色
    user.Role = role
    if err := s.userRepo.Update(ctx, user); err != nil {
        return fmt.Errorf("failed to update user role: %w", err)
    }
    
    // 撤销所有会话（角色变更需要重新登录）
    if err := s.RevokeAllUserSessions(ctx, userID); err != nil {
        // 撤销会话失败不影响角色更新
    }
    
    // 记录用户活动
    if err := s.LogUserActivity(ctx, userID, "update_role", "user", fmt.Sprintf("User role updated to %s", role), "", ""); err != nil {
        // 记录日志失败不影响角色更新
    }
    
    return nil
}

// GetUserSessions 获取用户会话
func (s *userService) GetUserSessions(ctx context.Context, userID uint) ([]*UserSessionResponse, error) {
    sessions, err := s.sessionRepo.GetByUserID(ctx, userID)
    if err != nil {
        return nil, fmt.Errorf("failed to get user sessions: %w", err)
    }
    
    // 转换响应
    sessionResponses := make([]*UserSessionResponse, len(sessions))
    for i, session := range sessions {
        sessionResponses[i] = &UserSessionResponse{
            ID:        session.ID,
            IPAddress: session.IPAddress,
            UserAgent: session.UserAgent,
            ExpiresAt: session.ExpiresAt,
            CreatedAt: session.CreatedAt,
            UpdatedAt: session.UpdatedAt,
        }
    }
    
    return sessionResponses, nil
}

// RevokeUserSession 撤销用户会话
func (s *userService) RevokeUserSession(ctx context.Context, userID uint, sessionID string) error {
    // 获取会话
    session, err := s.sessionRepo.GetByID(ctx, sessionID)
    if err != nil {
        return fmt.Errorf("failed to get session: %w", err)
    }
    
    // 检查会话是否属于该用户
    if session.UserID != userID {
        return errors.New("session does not belong to user")
    }
    
    // 删除会话
    if err := s.sessionRepo.Delete(ctx, sessionID); err != nil {
        return fmt.Errorf("failed to delete session: %w", err)
    }
    
    // 记录用户活动
    if err := s.LogUserActivity(ctx, userID, "revoke_session", "user", fmt.Sprintf("Session %s revoked", sessionID), "", ""); err != nil {
        // 记录日志失败不影响会话撤销
    }
    
    return nil
}

// RevokeAllUserSessions 撤销所有用户会话
func (s *userService) RevokeAllUserSessions(ctx context.Context, userID uint) error {
    // 删除所有会话
    if err := s.sessionRepo.DeleteByUserID(ctx, userID); err != nil {
        return fmt.Errorf("failed to delete user sessions: %w", err)
    }
    
    // 记录用户活动
    if err := s.LogUserActivity(ctx, userID, "revoke_all_sessions", "user", "All sessions revoked", "", ""); err != nil {
        // 记录日志失败不影响会话撤销
    }
    
    return nil
}

// LogUserActivity 记录用户活动
func (s *userService) LogUserActivity(ctx context.Context, userID uint, action, resource, details, ipAddress, userAgent string) error {
    log := &models.UserLog{
        UserID:    userID,
        Action:    action,
        Resource:  resource,
        Details:   details,
        IPAddress: ipAddress,
        UserAgent: userAgent,
    }
    
    if err := s.logRepo.Create(ctx, log); err != nil {
        return fmt.Errorf("failed to create user log: %w", err)
    }
    
    return nil
}

// toUserResponse 转换用户响应
func (s *userService) toUserResponse(user *models.User) *UserResponse {
    response := &UserResponse{
        ID:        user.ID,
        UUID:      user.UUID,
        Username:  user.Username,
        Email:     user.Email,
        Nickname:  user.Nickname,
        Avatar:    user.Avatar,
        Bio:       user.Bio,
        Status:    user.Status,
        Role:      user.Role,
        LastLogin: user.LastLogin,
        CreatedAt: user.CreatedAt,
        UpdatedAt: user.UpdatedAt,
    }
    
    // 转换用户配置文件
    if len(user.Profiles) > 0 {
        response.Profiles = make([]*UserProfileResponse, len(user.Profiles))
        for i, profile := range user.Profiles {
            response.Profiles[i] = &UserProfileResponse{
                Key:       profile.Key,
                Value:     profile.Value,
                CreatedAt: profile.CreatedAt,
                UpdatedAt: profile.UpdatedAt,
            }
        }
    }
    
    return response
}
```

## 仓储接口

```go
// internal/repositories/user_repository.go
package repositories

import (
    "context"
    "github.com/rubick/internal/models"
)

// UserRepository 用户仓储接口
type UserRepository interface {
    // 创建用户
    Create(ctx context.Context, user *models.User) error
    
    // 获取用户（通过 ID）
    GetByID(ctx context.Context, id uint) (*models.User, error)
    
    // 获取用户（通过 UUID）
    GetByUUID(ctx context.Context, uuid string) (*models.User, error)
    
    // 获取用户（通过用户名）
    GetByUsername(ctx context.Context, username string) (*models.User, error)
    
    // 获取用户（通过邮箱）
    GetByEmail(ctx context.Context, email string) (*models.User, error)
    
    // 更新用户
    Update(ctx context.Context, user *models.User) error
    
    // 删除用户（软删除）
    Delete(ctx context.Context, id uint) error
    
    // 获取用户列表
    List(ctx context.Context, opts *ListUsersOptions) ([]*models.User, int64, error)
    
    // 获取用户总数
    Count(ctx context.Context, opts *CountUsersOptions) (int64, error)
}

// ListUsersOptions 获取用户列表选项
type ListUsersOptions struct {
    Offset  int
    Limit   int
    Status  models.UserStatus
    Role    models.UserRole
    Keyword string
}

// CountUsersOptions 获取用户总数选项
type CountUsersOptions struct {
    Status  models.UserStatus
    Role    models.UserRole
    Keyword string
}

// SessionRepository 会话仓储接口
type SessionRepository interface {
    // 创建会话
    Create(ctx context.Context, session *models.UserSession) error
    
    // 获取会话（通过 ID）
    GetByID(ctx context.Context, id string) (*models.UserSession, error)
    
    // 获取会话（通过令牌）
    GetByToken(ctx context.Context, token string) (*models.UserSession, error)
    
    // 获取会话（通过刷新令牌）
    GetByRefreshToken(ctx context.Context, refreshToken string) (*models.UserSession, error)
    
    // 获取用户会话列表
    GetByUserID(ctx context.Context, userID uint) ([]*models.UserSession, error)
    
    // 更新会话
    Update(ctx context.Context, session *models.UserSession) error
    
    // 删除会话（通过 ID）
    Delete(ctx context.Context, id string) error
    
    // 删除会话（通过令牌）
    DeleteByToken(ctx context.Context, token string) error
    
    // 删除用户所有会话
    DeleteByUserID(ctx context.Context, userID uint) error
    
    // 清理过期会话
    CleanExpiredSessions(ctx context.Context) error
}

// LogRepository 日志仓储接口
type LogRepository interface {
    // 创建日志
    Create(ctx context.Context, log *models.UserLog) error
    
    // 获取用户日志列表
    GetByUserID(ctx context.Context, userID uint, opts *ListLogsOptions) ([]*models.UserLog, int64, error)
    
    // 清理过期日志
    CleanExpiredLogs(ctx context.Context) error
}

// ListLogsOptions 获取日志列表选项
type ListLogsOptions struct {
    Offset int
    Limit  int
    Action string
}
```

## API 控制器

```go
// internal/controllers/user_controller.go
package controllers

import (
    "net/http"
    "strconv"
    
    "github.com/gin-gonic/gin"
    "github.com/rubick/internal/services"
    "github.com/rubick/internal/middleware"
    "github.com/rubick/internal/utils"
)

// UserController 用户控制器
type UserController struct {
    userService services.UserService
}

// NewUserController 创建用户控制器
func NewUserController(userService services.UserService) *UserController {
    return &UserController{
        userService: userService,
    }
}

// RegisterRoutes 注册路由
func (c *UserController) RegisterRoutes(router *gin.RouterGroup) {
    // 公开路由
    public := router.Group("/auth")
    {
        public.POST("/register", c.Register)
        public.POST("/login", c.Login)
        public.POST("/refresh", c.RefreshToken)
        public.POST("/reset-password", c.ResetPassword)
    }
    
    // 需要认证的路由
    protected := router.Group("/users")
    protected.Use(middleware.AuthMiddleware())
    {
        protected.GET("/profile", c.GetProfile)
        protected.PUT("/profile", c.UpdateProfile)
        protected.POST("/change-password", c.ChangePassword)
        protected.POST("/logout", c.Logout)
        protected.GET("/sessions", c.GetSessions)
        protected.DELETE("/sessions/:id", c.RevokeSession)
        protected.DELETE("/sessions", c.RevokeAllSessions)
    }
    
    // 管理员路由
    admin := router.Group("/admin/users")
    admin.Use(middleware.AuthMiddleware(), middleware.RoleMiddleware("admin"))
    {
        admin.GET("", c.ListUsers)
        admin.GET("/:id", c.GetUser)
        admin.PUT("/:id/status", c.UpdateUserStatus)
        admin.PUT("/:id/role", c.UpdateUserRole)
        admin.DELETE("/:id", c.DeleteUser)
    }
}

// Register 用户注册
func (c *UserController) Register(ctx *gin.Context) {
    var req services.RegisterRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request body", err)
        return
    }
    
    if err := utils.ValidateStruct(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Validation failed", err)
        return
    }
    
    user, err := c.userService.Register(ctx.Request.Context(), &req)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Registration failed", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusCreated, "User registered successfully", user)
}

// Login 用户登录
func (c *UserController) Login(ctx *gin.Context) {
    var req services.LoginRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request body", err)
        return
    }
    
    if err := utils.ValidateStruct(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Validation failed", err)
        return
    }
    
    // 获取客户端信息
    ipAddress := ctx.ClientIP()
    userAgent := ctx.GetHeader("User-Agent")
    
    response, err := c.userService.Login(ctx.Request.Context(), &req)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusUnauthorized, "Login failed", err)
        return
    }
    
    // 更新会话信息
    if err := c.userService.UpdateSessionInfo(ctx.Request.Context(), response.RefreshToken, ipAddress, userAgent); err != nil {
        // 更新会话信息失败不影响登录流程
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "Login successful", response)
}

// RefreshToken 刷新令牌
func (c *UserController) RefreshToken(ctx *gin.Context) {
    var req struct {
        RefreshToken string `json:"refresh_token" validate:"required"`
    }
    
    if err := ctx.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request body", err)
        return
    }
    
    if err := utils.ValidateStruct(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Validation failed", err)
        return
    }
    
    response, err := c.userService.RefreshToken(ctx.Request.Context(), req.RefreshToken)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusUnauthorized, "Token refresh failed", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "Token refreshed successfully", response)
}

// ResetPassword 重置密码
func (c *UserController) ResetPassword(ctx *gin.Context) {
    var req services.ResetPasswordRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request body", err)
        return
    }
    
    if err := utils.ValidateStruct(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Validation failed", err)
        return
    }
    
    if err := c.userService.ResetPassword(ctx.Request.Context(), &req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Password reset failed", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "Password reset successfully", nil)
}

// GetProfile 获取用户配置文件
func (c *UserController) GetProfile(ctx *gin.Context) {
    userID := middleware.GetUserID(ctx)
    
    user, err := c.userService.GetUserByID(ctx.Request.Context(), userID)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusNotFound, "User not found", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "User profile retrieved successfully", user)
}

// UpdateProfile 更新用户配置文件
func (c *UserController) UpdateProfile(ctx *gin.Context) {
    userID := middleware.GetUserID(ctx)
    
    var req services.UpdateUserRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request body", err)
        return
    }
    
    if err := utils.ValidateStruct(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Validation failed", err)
        return
    }
    
    user, err := c.userService.UpdateUser(ctx.Request.Context(), userID, &req)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Profile update failed", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "Profile updated successfully", user)
}

// ChangePassword 修改密码
func (c *UserController) ChangePassword(ctx *gin.Context) {
    userID := middleware.GetUserID(ctx)
    
    var req services.ChangePasswordRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request body", err)
        return
    }
    
    if err := utils.ValidateStruct(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Validation failed", err)
        return
    }
    
    if err := c.userService.ChangePassword(ctx.Request.Context(), userID, &req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Password change failed", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "Password changed successfully", nil)
}

// Logout 用户登出
func (c *UserController) Logout(ctx *gin.Context) {
    token := middleware.GetToken(ctx)
    
    if err := c.userService.Logout(ctx.Request.Context(), token); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Logout failed", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "Logout successful", nil)
}

// GetSessions 获取用户会话
func (c *UserController) GetSessions(ctx *gin.Context) {
    userID := middleware.GetUserID(ctx)
    
    sessions, err := c.userService.GetUserSessions(ctx.Request.Context(), userID)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to get sessions", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "Sessions retrieved successfully", sessions)
}

// RevokeSession 撤销用户会话
func (c *UserController) RevokeSession(ctx *gin.Context) {
    userID := middleware.GetUserID(ctx)
    sessionID := ctx.Param("id")
    
    if err := c.userService.RevokeUserSession(ctx.Request.Context(), userID, sessionID); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to revoke session", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "Session revoked successfully", nil)
}

// RevokeAllSessions 撤销所有用户会话
func (c *UserController) RevokeAllSessions(ctx *gin.Context) {
    userID := middleware.GetUserID(ctx)
    
    if err := c.userService.RevokeAllUserSessions(ctx.Request.Context(), userID); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to revoke sessions", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "All sessions revoked successfully", nil)
}

// ListUsers 获取用户列表
func (c *UserController) ListUsers(ctx *gin.Context) {
    // 解析查询参数
    page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
    pageSize, _ := strconv.Atoi(ctx.DefaultQuery("page_size", "20"))
    status := ctx.Query("status")
    role := ctx.Query("role")
    keyword := ctx.Query("keyword")
    
    req := &services.ListUsersRequest{
        Page:     page,
        PageSize: pageSize,
        Status:   models.UserStatus(status),
        Role:     models.UserRole(role),
        Keyword:  keyword,
    }
    
    if err := utils.ValidateStruct(req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Validation failed", err)
        return
    }
    
    response, err := c.userService.ListUsers(ctx.Request.Context(), req)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to list users", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "Users retrieved successfully", response)
}

// GetUser 获取用户
func (c *UserController) GetUser(ctx *gin.Context) {
    idStr := ctx.Param("id")
    id, err := strconv.ParseUint(idStr, 10, 32)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid user ID", err)
        return
    }
    
    user, err := c.userService.GetUserByID(ctx.Request.Context(), uint(id))
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusNotFound, "User not found", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "User retrieved successfully", user)
}

// UpdateUserStatus 更新用户状态
func (c *UserController) UpdateUserStatus(ctx *gin.Context) {
    idStr := ctx.Param("id")
    id, err := strconv.ParseUint(idStr, 10, 32)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid user ID", err)
        return
    }
    
    var req struct {
        Status models.UserStatus `json:"status" validate:"required"`
    }
    
    if err := ctx.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request body", err)
        return
    }
    
    if err := utils.ValidateStruct(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Validation failed", err)
        return
    }
    
    if err := c.userService.UpdateUserStatus(ctx.Request.Context(), uint(id), req.Status); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to update user status", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "User status updated successfully", nil)
}

// UpdateUserRole 更新用户角色
func (c *UserController) UpdateUserRole(ctx *gin.Context) {
    idStr := ctx.Param("id")
    id, err := strconv.ParseUint(idStr, 10, 32)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid user ID", err)
        return
    }
    
    var req struct {
        Role models.UserRole `json:"role" validate:"required"`
    }
    
    if err := ctx.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request body", err)
        return
    }
    
    if err := utils.ValidateStruct(&req); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Validation failed", err)
        return
    }
    
    if err := c.userService.UpdateUserRole(ctx.Request.Context(), uint(id), req.Role); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to update user role", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "User role updated successfully", nil)
}

// DeleteUser 删除用户
func (c *UserController) DeleteUser(ctx *gin.Context) {
    idStr := ctx.Param("id")
    id, err := strconv.ParseUint(idStr, 10, 32)
    if err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid user ID", err)
        return
    }
    
    if err := c.userService.DeleteUser(ctx.Request.Context(), uint(id)); err != nil {
        utils.ErrorResponse(ctx, http.StatusBadRequest, "Failed to delete user", err)
        return
    }
    
    utils.SuccessResponse(ctx, http.StatusOK, "User deleted successfully", nil)
}
```

## 中间件

```go
// internal/middleware/auth.go
package middleware

import (
    "net/http"
    "strings"
    
    "github.com/gin-gonic/gin"
    "github.com/rubick/internal/utils"
    "github.com/rubick/internal/services"
)

// AuthMiddleware 认证中间件
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 获取 Authorization 头
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            utils.ErrorResponse(c, http.StatusUnauthorized, "Authorization header is required", nil)
            c.Abort()
            return
        }
        
        // 检查 Bearer 前缀
        parts := strings.SplitN(authHeader, " ", 2)
        if len(parts) != 2 || parts[0] != "Bearer" {
            utils.ErrorResponse(c, http.StatusUnauthorized, "Invalid authorization header format", nil)
            c.Abort()
            return
        }
        
        // 验证令牌
        claims, err := utils.ValidateToken(parts[1])
        if err != nil {
            utils.ErrorResponse(c, http.StatusUnauthorized, "Invalid token", err)
            c.Abort()
            return
        }
        
        // 设置用户信息到上下文
        c.Set("user_id", claims.UserID)
        c.Set("user_uuid", claims.UserUUID)
        c.Set("user_role", claims.Role)
        c.Set("token", parts[1])
        
        c.Next()
    }
}

// RoleMiddleware 角色中间件
func RoleMiddleware(allowedRoles ...string) gin.HandlerFunc {
    return func(c *gin.Context) {
        // 获取用户角色
        userRole, exists := c.Get("user_role")
        if !exists {
            utils.ErrorResponse(c, http.StatusUnauthorized, "User role not found", nil)
            c.Abort()
            return
        }
        
        // 检查角色权限
        roleStr, ok := userRole.(string)
        if !ok {
            utils.ErrorResponse(c, http.StatusInternalServerError, "Invalid user role type", nil)
            c.Abort()
            return
        }
        
        // 检查是否在允许的角色列表中
        allowed := false
        for _, allowedRole := range allowedRoles {
            if roleStr == allowedRole {
                allowed = true
                break
            }
        }
        
        if !allowed {
            utils.ErrorResponse(c, http.StatusForbidden, "Insufficient permissions", nil)
            c.Abort()
            return
        }
        
        c.Next()
    }
}

// GetUserID 获取用户 ID
func GetUserID(c *gin.Context) uint {
    userID, _ := c.Get("user_id")
    return userID.(uint)
}

// GetUserUUID 获取用户 UUID
func GetUserUUID(c *gin.Context) string {
    userUUID, _ := c.Get("user_uuid")
    return userUUID.(string)
}

// GetUserRole 获取用户角色
func GetUserRole(c *gin.Context) string {
    userRole, _ := c.Get("user_role")
    return userRole.(string)
}

// GetToken 获取令牌
func GetToken(c *gin.Context) string {
    token, _ := c.Get("token")
    return token.(string)
}
```

## 测试

### 单元测试

```go
// internal/services/user_service_test.go
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
    "github.com/rubick/internal/config"
    "github.com/rubick/internal/utils"
)

func TestUserService_Register(t *testing.T) {
    // 创建模拟对象
    mockUserRepo := new(mocks.UserRepository)
    mockSessionRepo := new(mocks.SessionRepository)
    mockLogRepo := new(mocks.LogRepository)
    
    // 创建配置
    cfg := &config.Config{
        JWT: config.JWTConfig{
            Secret:     "test-secret",
            Expiration: 24 * time.Hour,
        },
    }
    
    // 创建 JWT 工具
    jwt, _ := utils.NewJWT(cfg.JWT)
    
    // 创建服务
    userService := services.NewUserService(mockUserRepo, mockSessionRepo, mockLogRepo, cfg, jwt)
    
    // 测试数据
    req := &services.RegisterRequest{
        Username: "testuser",
        Email:    "test@example.com",
        Password: "password123",
        Nickname: "Test User",
    }
    
    // 设置模拟期望
    mockUserRepo.On("GetByUsername", mock.Anything, req.Username).Return(nil, assert.AnError)
    mockUserRepo.On("GetByEmail", mock.Anything, req.Email).Return(nil, assert.AnError)
    mockUserRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.User")).Return(nil)
    mockLogRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.UserLog")).Return(nil)
    
    // 执行测试
    user, err := userService.Register(context.Background(), req)
    
    // 断言
    assert.NoError(t, err)
    assert.NotNil(t, user)
    assert.Equal(t, req.Username, user.Username)
    assert.Equal(t, req.Email, user.Email)
    assert.Equal(t, req.Nickname, user.Nickname)
    assert.Equal(t, models.UserStatusActive, user.Status)
    assert.Equal(t, models.UserRoleUser, user.Role)
    
    // 验证模拟调用
    mockUserRepo.AssertExpectations(t)
    mockLogRepo.AssertExpectations(t)
}

func TestUserService_Login(t *testing.T) {
    // 创建模拟对象
    mockUserRepo := new(mocks.UserRepository)
    mockSessionRepo := new(mocks.SessionRepository)
    mockLogRepo := new(mocks.LogRepository)
    
    // 创建配置
    cfg := &config.Config{
        JWT: config.JWTConfig{
            Secret:     "test-secret",
            Expiration: 24 * time.Hour,
        },
    }
    
    // 创建 JWT 工具
    jwt, _ := utils.NewJWT(cfg.JWT)
    
    // 创建服务
    userService := services.NewUserService(mockUserRepo, mockSessionRepo, mockLogRepo, cfg, jwt)
    
    // 测试数据
    req := &services.LoginRequest{
        Username: "testuser",
        Password: "password123",
    }
    
    // 创建测试用户
    user := &models.User{
        ID:       1,
        UUID:     "test-uuid",
        Username: req.Username,
        Email:    "test@example.com",
        Password: "$2a$10$N9qo8uLOickgx2ZMRZoMye.IY4jLj5W9H5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y", // 加密后的密码
        Status:   models.UserStatusActive,
        Role:     models.UserRoleUser,
    }
    
    // 设置模拟期望
    mockUserRepo.On("GetByUsername", mock.Anything, req.Username).Return(user, nil)
    mockSessionRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.UserSession")).Return(nil)
    mockUserRepo.On("Update", mock.Anything, user).Return(nil)
    mockLogRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.UserLog")).Return(nil)
    
    // 执行测试
    response, err := userService.Login(context.Background(), req)
    
    // 断言
    assert.NoError(t, err)
    assert.NotNil(t, response)
    assert.NotEmpty(t, response.AccessToken)
    assert.NotEmpty(t, response.RefreshToken)
    assert.Equal(t, "Bearer", response.TokenType)
    assert.Equal(t, int64(cfg.JWT.Expiration.Seconds()), response.ExpiresIn)
    assert.Equal(t, user.ID, response.User.ID)
    assert.Equal(t, user.Username, response.User.Username)
    
    // 验证模拟调用
    mockUserRepo.AssertExpectations(t)
    mockSessionRepo.AssertExpectations(t)
    mockLogRepo.AssertExpectations(t)
}
```

### 集成测试

```go
// tests/integration/user_test.go
package integration_test

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
    
    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/suite"
    "github.com/rubick/internal/controllers"
    "github.com/rubick/internal/services"
    "github.com/rubick/internal/repositories"
    "github.com/rubick/internal/database"
    "github.com/rubick/internal/config"
)

type UserIntegrationTestSuite struct {
    suite.Suite
    router       *gin.Engine
    db          *database.DB
    userService services.UserService
}

func (suite *UserIntegrationTestSuite) SetupSuite() {
    // 设置测试数据库
    cfg := &config.Config{
        Database: config.DatabaseConfig{
            Host:     "localhost",
            Port:     5432,
            User:     "test",
            Password: "test",
            Name:     "rubick_test",
            SSLMode:  "disable",
        },
        JWT: config.JWTConfig{
            Secret:     "test-secret",
            Expiration: 24 * time.Hour,
        },
    }
    
    db, err := database.New(cfg.Database)
    suite.Require().NoError(err)
    suite.db = db
    
    // 自动迁移
    err = db.AutoMigrate(&models.User{}, &models.UserSession{}, &models.UserLog{})
    suite.Require().NoError(err)
    
    // 创建仓储
    userRepo := repositories.NewUserRepository(db)
    sessionRepo := repositories.NewSessionRepository(db)
    logRepo := repositories.NewLogRepository(db)
    
    // 创建 JWT 工具
    jwt, err := utils.NewJWT(cfg.JWT)
    suite.Require().NoError(err)
    
    // 创建服务
    suite.userService = services.NewUserService(userRepo, sessionRepo, logRepo, cfg, jwt)
    
    // 创建控制器
    userController := controllers.NewUserController(suite.userService)
    
    // 设置路由
    gin.SetMode(gin.TestMode)
    suite.router = gin.New()
    api := suite.router.Group("/api/v1")
    userController.RegisterRoutes(api)
}

func (suite *UserIntegrationTestSuite) TearDownSuite() {
    // 清理测试数据
    suite.db.Exec("DELETE FROM users")
    suite.db.Exec("DELETE FROM user_sessions")
    suite.db.Exec("DELETE FROM user_logs")
    
    // 关闭数据库连接
    suite.db.Close()
}

func (suite *UserIntegrationTestSuite) TestUserRegistrationAndLogin() {
    // 注册用户
    registerReq := map[string]interface{}{
        "username": "testuser",
        "email":    "test@example.com",
        "password": "password123",
        "nickname": "Test User",
    }
    
    registerReqBody, _ := json.Marshal(registerReq)
    registerReq := httptest.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(registerReqBody))
    registerReq.Header.Set("Content-Type", "application/json")
    
    registerResp := httptest.NewRecorder()
    suite.router.ServeHTTP(registerResp, registerReq)
    
    assert.Equal(suite.T(), http.StatusCreated, registerResp.Code)
    
    var registerRespData map[string]interface{}
    err := json.Unmarshal(registerResp.Body.Bytes(), &registerRespData)
    suite.Require().NoError(err)
    assert.Equal(suite.T(), "User registered successfully", registerRespData["message"])
    
    // 登录用户
    loginReq := map[string]interface{}{
        "username": "testuser",
        "password": "password123",
    }
    
    loginReqBody, _ := json.Marshal(loginReq)
    loginReq := httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(loginReqBody))
    loginReq.Header.Set("Content-Type", "application/json")
    
    loginResp := httptest.NewRecorder()
    suite.router.ServeHTTP(loginResp, loginReq)
    
    assert.Equal(suite.T(), http.StatusOK, loginResp.Code)
    
    var loginRespData map[string]interface{}
    err = json.Unmarshal(loginResp.Body.Bytes(), &loginRespData)
    suite.Require().NoError(err)
    assert.Equal(suite.T(), "Login successful", loginRespData["message"])
    
    data := loginRespData["data"].(map[string]interface{})
    assert.NotEmpty(suite.T(), data["access_token"])
    assert.NotEmpty(suite.T(), data["refresh_token"])
    
    // 获取用户配置文件
    accessToken := data["access_token"].(string)
    profileReq := httptest.NewRequest("GET", "/api/v1/users/profile", nil)
    profileReq.Header.Set("Authorization", "Bearer "+accessToken)
    
    profileResp := httptest.NewRecorder()
    suite.router.ServeHTTP(profileResp, profileReq)
    
    assert.Equal(suite.T(), http.StatusOK, profileResp.Code)
    
    var profileRespData map[string]interface{}
    err = json.Unmarshal(profileResp.Body.Bytes(), &profileRespData)
    suite.Require().NoError(err)
    assert.Equal(suite.T(), "User profile retrieved successfully", profileRespData["message"])
    
    profileData := profileRespData["data"].(map[string]interface{})
    assert.Equal(suite.T(), "testuser", profileData["username"])
    assert.Equal(suite.T(), "test@example.com", profileData["email"])
    assert.Equal(suite.T(), "Test User", profileData["nickname"])
}

func TestUserIntegrationTestSuite(t *testing.T) {
    suite.Run(t, new(UserIntegrationTestSuite))
}
```

## 性能优化

### 缓存策略

```go
// internal/services/user_service_cached.go
package services

import (
    "context"
    "encoding/json"
    "fmt"
    "time"
    
    "github.com/go-redis/redis/v8"
    "github.com/rubick/internal/models"
)

// CachedUserService 带缓存的用户服务
type CachedUserService struct {
    userService services.UserService
    redis      *redis.Client
}

// NewCachedUserService 创建带缓存的用户服务
func NewCachedUserService(userService services.UserService, redis *redis.Client) services.UserService {
    return &CachedUserService{
        userService: userService,
        redis:      redis,
    }
}

// GetUserByID 获取用户信息（带缓存）
func (s *CachedUserService) GetUserByID(ctx context.Context, userID uint) (*UserResponse, error) {
    // 尝试从缓存获取
    cacheKey := fmt.Sprintf("user:%d", userID)
    cached, err := s.redis.Get(ctx, cacheKey).Result()
    if err == nil {
        var user UserResponse
        if err := json.Unmarshal([]byte(cached), &user); err == nil {
            return &user, nil
        }
    }
    
    // 从数据库获取
    user, err := s.userService.GetUserByID(ctx, userID)
    if err != nil {
        return nil, err
    }
    
    // 存入缓存
    userJSON, _ := json.Marshal(user)
    s.redis.Set(ctx, cacheKey, userJSON, 5*time.Minute)
    
    return user, nil
}

// UpdateUser 更新用户信息（清除缓存）
func (s *CachedUserService) UpdateUser(ctx context.Context, userID uint, req *UpdateUserRequest) (*UserResponse, error) {
    // 更新数据库
    user, err := s.userService.UpdateUser(ctx, userID, req)
    if err != nil {
        return nil, err
    }
    
    // 清除缓存
    cacheKey := fmt.Sprintf("user:%d", userID)
    s.redis.Del(ctx, cacheKey)
    
    return user, nil
}
```

### 数据库优化

```go
// internal/repositories/user_repository_optimized.go
package repositories

import (
    "context"
    "fmt"
    
    "github.com/rubick/internal/models"
    "gorm.io/gorm"
)

// OptimizedUserRepository 优化的用户仓储
type OptimizedUserRepository struct {
    db *gorm.DB
}

// NewOptimizedUserRepository 创建优化的用户仓储
func NewOptimizedUserRepository(db *gorm.DB) UserRepository {
    return &OptimizedUserRepository{db: db}
}

// List 获取用户列表（优化版）
func (r *OptimizedUserRepository) List(ctx context.Context, opts *ListUsersOptions) ([]*models.User, int64, error) {
    var users []*models.User
    var total int64
    
    // 构建查询
    query := r.db.WithContext(ctx).Model(&models.User{})
    
    // 添加过滤条件
    if opts.Status != "" {
        query = query.Where("status = ?", opts.Status)
    }
    if opts.Role != "" {
        query = query.Where("role = ?", opts.Role)
    }
    if opts.Keyword != "" {
        query = query.Where("username LIKE ? OR email LIKE ? OR nickname LIKE ?", 
            "%"+opts.Keyword+"%", "%"+opts.Keyword+"%", "%"+opts.Keyword+"%")
    }
    
    // 获取总数
    if err := query.Count(&total).Error; err != nil {
        return nil, 0, fmt.Errorf("failed to count users: %w", err)
    }
    
    // 获取分页数据
    if err := query.Offset(opts.Offset).Limit(opts.Limit).
        Preload("Profiles").Find(&users).Error; err != nil {
        return nil, 0, fmt.Errorf("failed to list users: %w", err)
    }
    
    return users, total, nil
}

// GetByID 获取用户（优化版）
func (r *OptimizedUserRepository) GetByID(ctx context.Context, id uint) (*models.User, error) {
    var user models.User
    
    // 使用索引优化查询
    if err := r.db.WithContext(ctx).
        Preload("Profiles").
        First(&user, id).Error; err != nil {
        return nil, fmt.Errorf("failed to get user: %w", err)
    }
    
    return &user, nil
}
```

## 安全考虑

### 密码策略

```go
// internal/utils/password.go
package utils

import (
    "crypto/rand"
    "encoding/base64"
    "errors"
    "regexp"
    "unicode/utf8"
    
    "golang.org/x/crypto/bcrypt"
)

// PasswordValidator 密码验证器
type PasswordValidator struct {
    MinLength    int
    RequireUpper bool
    RequireLower bool
    RequireDigit bool
    RequireSymbol bool
}

// NewPasswordValidator 创建密码验证器
func NewPasswordValidator() *PasswordValidator {
    return &PasswordValidator{
        MinLength:    8,
        RequireUpper: true,
        RequireLower: true,
        RequireDigit: true,
        RequireSymbol: true,
    }
}

// Validate 验证密码
func (v *PasswordValidator) Validate(password string) error {
    // 检查长度
    if utf8.RuneCountInString(password) < v.MinLength {
        return errors.New("password is too short")
    }
    
    // 检查大写字母
    if v.RequireUpper {
        matched, _ := regexp.MatchString("[A-Z]", password)
        if !matched {
            return errors.New("password must contain at least one uppercase letter")
        }
    }
    
    // 检查小写字母
    if v.RequireLower {
        matched, _ := regexp.MatchString("[a-z]", password)
        if !matched {
            return errors.New("password must contain at least one lowercase letter")
        }
    }
    
    // 检查数字
    if v.RequireDigit {
        matched, _ := regexp.MatchString("[0-9]", password)
        if !matched {
            return errors.New("password must contain at least one digit")
        }
    }
    
    // 检查特殊字符
    if v.RequireSymbol {
        matched, _ := regexp.MatchString("[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]", password)
        if !matched {
            return errors.New("password must contain at least one special character")
        }
    }
    
    return nil
}

// HashPassword 加密密码
func HashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    return string(bytes), err
}

// CheckPassword 验证密码
func CheckPassword(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}

// GenerateRandomPassword 生成随机密码
func GenerateRandomPassword(length int) (string, error) {
    bytes := make([]byte, length)
    if _, err := rand.Read(bytes); err != nil {
        return "", err
    }
    return base64.URLEncoding.EncodeToString(bytes)[:length], nil
}
```

### 速率限制

```go
// internal/middleware/rate_limit.go
package middleware

import (
    "net/http"
    "time"
    
    "github.com/gin-gonic/gin"
    "github.com/go-redis/redis/v8"
    "github.com/rubick/internal/utils"
)

// RateLimitMiddleware 速率限制中间件
func RateLimitMiddleware(redis *redis.Client, requests int, window time.Duration) gin.HandlerFunc {
    return func(c *gin.Context) {
        // 获取客户端 IP
        ip := c.ClientIP()
        
        // 检查速率限制
        allowed, err := utils.CheckRateLimit(redis, ip, requests, window)
        if err != nil {
            utils.ErrorResponse(c, http.StatusInternalServerError, "Rate limit check failed", err)
            c.Abort()
            return
        }
        
        if !allowed {
            utils.ErrorResponse(c, http.StatusTooManyRequests, "Rate limit exceeded", nil)
            c.Abort()
            return
        }
        
        c.Next()
    }
}

// LoginRateLimitMiddleware 登录速率限制中间件
func LoginRateLimitMiddleware(redis *redis.Client) gin.HandlerFunc {
    return RateLimitMiddleware(redis, 5, 15*time.Minute) // 15 分钟内最多 5 次登录尝试
}

// RegisterRateLimitMiddleware 注册速率限制中间件
func RegisterRateLimitMiddleware(redis *redis.Client) gin.HandlerFunc {
    return RateLimitMiddleware(redis, 3, 60*time.Minute) // 60 分钟内最多 3 次注册尝试
}
```

## 更多资源

- [Go 密码加密最佳实践](https://github.com/golang/go/wiki/Security)
- [JWT 认证最佳实践](https://auth0.com/blog/json-web-token-best-practices/)
- [GORM 性能优化](https://gorm.io/docs/performance.html)
- [Redis 缓存策略](https://redis.io/docs/manual/patterns/)
- [Go 测试最佳实践](https://github.com/golang/go/wiki/Testing)