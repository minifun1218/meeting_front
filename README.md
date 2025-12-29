#  - 视频会议前端应用

基于 Angular 17 + LiveKit 的现代化视频会议系统，支持最多50人同时在线视频通话。

## 功能特性

### 🎥 视频会议核心功能
- **多人视频通话**: 支持最多50人同时参与视频会议
- **音视频控制**: 一键开启/关闭麦克风和摄像头
- **屏幕共享**: 支持共享整个屏幕或特定应用窗口
- **动态布局**: 自动适应参与者数量的网格和演讲者视图切换
- **实时音视频**: 基于 LiveKit 的低延迟实时通信

### 💬 实时聊天系统
- **即时消息**: 会议中实时文字聊天
- **快捷回复**: 预设常用回复内容
- **消息历史**: 完整的聊天记录保存和查询
- **未读提示**: 智能未读消息计数和提醒

### 📹 录制和存储
- **会议录制**: 一键开始/停止会议录制
- **屏幕截图**: 支持单独截取参与者画面
- **录制管理**: 完整的录制文件管理和下载功能
- **多格式支持**: 支持多种视频格式和质量设置

### 👥 参与者管理
- **角色权限**: 支持主持人、参与者、观察者等多种角色
- **状态监控**: 实时显示参与者音视频状态
- **会议控制**: 主持人可管理参与者权限
- **参与者列表**: 完整的在线用户列表和状态显示

### 🎨 现代化UI设计
- **响应式布局**: 完美适配桌面端和移动端
- **Material Design**: 基于 Angular Material 的现代设计语言
- **暗色主题**: 适合视频会议的深色界面
- **流畅动画**: 丰富的交互动画和转场效果

## 技术栈

### 前端框架
- **Angular 17**: 最新版本的 Angular 框架
- **TypeScript**: 类型安全的 JavaScript 超集
- **RxJS**: 响应式编程库

### UI组件库
- **Angular Material**: Google Material Design 组件库
- **Bootstrap 5**: 响应式CSS框架
- **自定义SCSS**: 定制化样式系统

### 实时通信
- **LiveKit Client**: 实时音视频通信SDK
- **WebRTC**: 底层实时通信协议
- **Socket.IO**: 实时消息推送

### 工具链
- **Angular CLI**: 项目脚手架和构建工具
- **Webpack**: 模块打包工具
- **TSLint/ESLint**: 代码质量检查
- **Prettier**: 代码格式化工具

## 项目结构

```
frontend/
├── src/
│   ├── app/
│   │   ├── core/                    # 核心模块
│   │   │   ├── models/             # 数据模型
│   │   │   ├── services/           # 核心服务
│   │   │   ├── guards/             # 路由守卫
│   │   │   └── interceptors/       # HTTP拦截器
│   │   ├── features/               # 功能模块
│   │   │   ├── auth/               # 用户认证
│   │   │   ├── home/               # 主页
│   │   │   ├── meeting/            # 会议相关
│   │   │   │   ├── meeting-room/   # 会议室组件
│   │   │   │   ├── video-grid/     # 视频网格
│   │   │   │   ├── chat-panel/     # 聊天面板
│   │   │   │   └── participants-list/ # 参与者列表
│   │   │   └── recordings/         # 录制管理
│   │   ├── shared/                 # 共享组件
│   │   ├── app.component.ts        # 根组件
│   │   ├── app.config.ts           # 应用配置
│   │   └── app.routes.ts           # 路由配置
│   ├── assets/                     # 静态资源
│   ├── environments/               # 环境配置
│   └── styles.scss                 # 全局样式
├── angular.json                    # Angular配置
├── package.json                    # 依赖配置
└── tsconfig.json                   # TypeScript配置
```

## 快速开始

### 环境要求
- Node.js 18.x 或更高版本
- npm 9.x 或更高版本
- Angular CLI 17.x

### 安装依赖
```bash
cd frontend
npm install
```

### 开发环境启动
```bash
npm start
# 或
ng serve
```

应用将在 `http://localhost:4200` 启动

### 构建生产版本
```bash
npm run build
# 或
ng build --configuration production
```

## 环境配置

### 开发环境 (environment.ts)
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  meetingServiceUrl: 'http://localhost:8082/api/meetings',
  chatServiceUrl: 'http://localhost:8081/api/chat',
  recordServiceUrl: 'http://localhost:8083/api/recordings',
  livekitServerUrl: 'ws://localhost:7880',
  // ...
};
```

### 生产环境配置
请根据实际部署环境修改 `environment.prod.ts` 文件中的服务地址。

## 主要功能使用

### 1. 用户登录
```typescript
// 演示账号
admin / admin123      // 管理员账号
teacher / teacher123  // 教师账号  
student / student123  // 学生账号
```

### 2. 创建会议
- 输入会议室名称
- 选择是否启用录制
- 点击"创建会议"按钮

### 3. 加入会议
- 输入会议室名称
- 点击"加入会议"按钮
- 或从活跃会议列表中快速加入

### 4. 会议控制
- **音频控制**: 点击麦克风按钮开启/关闭
- **视频控制**: 点击摄像头按钮开启/关闭
- **屏幕共享**: 点击屏幕共享按钮
- **录制控制**: 主持人可以开始/停止录制
- **截图功能**: 点击相机按钮截取当前画面

### 5. 聊天功能
- 点击聊天按钮打开聊天面板
- 输入消息并发送
- 支持快捷回复和表情

### 6. 录制管理
- 访问录制文件管理页面
- 搜索和筛选录制文件
- 下载或分享录制内容

## API集成

### 会议服务接口
```typescript
// 加入会议
POST /api/meetings/join
{
  "roomName": "string",
  "userId": "string", 
  "userName": "string",
  "role": "host|participant|observer"
}

// 创建会议室
POST /api/meetings/rooms
{
  "roomName": "string",
  "description": "string",
  "maxParticipants": 50,
  "enableRecording": true
}
```

### 聊天服务接口
```typescript
// 发送消息
POST /api/chat/messages
{
  "roomName": "string",
  "userId": "string",
  "userName": "string", 
  "content": "string",
  "clientMessageId": "string"
}

// 获取聊天历史
GET /api/chat/messages/{roomName}?page=0&size=50
```

### 录制服务接口
```typescript
// 获取录制列表
GET /api/recordings/user/{userId}?page=0&size=20

// 生成下载链接
POST /api/recordings/{id}/download
```

## 响应式设计

### 桌面端 (>1024px)
- 三栏布局：参与者列表 + 视频区域 + 聊天面板
- 完整的工具栏和控制按钮
- 大屏幕视频网格显示

### 平板端 (768px-1024px)
- 侧边栏自动隐藏
- 优化的视频网格布局
- 触控友好的控制按钮

### 移动端 (<768px)
- 全屏视频显示
- 底部控制栏
- 侧滑式聊天和参与者面板
- 手势操作支持

## 性能优化

### 1. 代码分割
- 使用 Angular 的懒加载路由
- 按功能模块分割代码包
- 减少初始加载时间

### 2. 视频优化
- 自适应视频质量
- 智能带宽检测
- 按需加载视频流

### 3. 内存管理
- 组件销毁时清理订阅
- 及时释放音视频资源
- 避免内存泄漏

### 4. 网络优化
- HTTP请求合并
- 智能重试机制
- 连接状态监控

## 浏览器兼容性

### 支持的浏览器
- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

### WebRTC支持
确保浏览器支持以下特性：
- getUserMedia API
- RTCPeerConnection
- WebSocket
- MediaRecorder API

## 开发指南

### 代码规范
- 使用 TypeScript 严格模式
- 遵循 Angular Style Guide
- 使用 Prettier 格式化代码
- 编写单元测试

### 组件开发
```typescript
// 使用 Standalone Components
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `...`,
  styles: [`...`]
})
export class ExampleComponent {
  // 组件逻辑
}
```

### 服务开发
```typescript
// 使用 Injectable 装饰器
@Injectable({
  providedIn: 'root'
})
export class ExampleService {
  constructor(private http: HttpClient) {}
  
  // 服务方法
}
```

## 故障排除

### 常见问题

1. **无法连接到视频会议**
   - 检查 LiveKit 服务器状态
   - 确认网络连接
   - 检查浏览器权限

2. **音视频设备无法访问**
   - 检查浏览器权限设置
   - 确认设备驱动正常
   - 尝试重新授权

3. **聊天消息发送失败**
   - 检查聊天服务连接状态
   - 确认用户登录状态
   - 检查网络连接

### 调试工具
- 浏览器开发者工具
- Angular DevTools
- LiveKit Debug 面板

## 部署指南

### Docker 部署
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist/zhck-meeting-frontend /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx 配置
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8080/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 贡献指南

1. Fork 项目仓库
2. 创建功能分支
3. 提交代码变更
4. 推送到分支
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](../LICENSE) 文件了解详情。

## 联系我们

- 项目主页: [GitHub Repository](https://github.com/your-org/zhck-meeting)
- 问题反馈: [Issues](https://github.com/your-org/zhck-meeting/issues)
- 邮箱: support@zhck-meeting.com

---

## 更新日志

### v1.0.0 (2024-01-20)
- ✨ 初始版本发布
- 🎥 基础视频会议功能
- 💬 实时聊天系统
- 📹 录制和截图功能
- 👥 参与者管理
- 🎨 响应式UI设计
