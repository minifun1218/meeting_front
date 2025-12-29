# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a video conferencing frontend application built with Angular 17, supporting up to 50 simultaneous participants. The application integrates with LiveKit for real-time audio/video communication, and connects to multiple backend microservices for meetings, chat, and recording functionality.

**Project Name**: zhck-meeting-frontend (智慧课堂会议前端)

## Development Commands

### Starting Development Server
```bash
npm start
# or
ng serve
# or with custom host/port
npm run serve  # runs on 0.0.0.0:4200
```

The dev server uses a proxy configuration (`proxy.conf.json`) that routes `/api/*` requests to `http://localhost:8080`.

### Building
```bash
# Development build
npm run build
# or
ng build --configuration development

# Production build
ng build --configuration production
# or
ng build
```

Production builds are output to `dist/zhck-meeting-frontend/`.

### Testing
```bash
# Run all tests
npm test
# or
ng test
```

Tests use Karma + Jasmine.

### Watch Mode
```bash
npm run watch
```

Continuously builds in development mode when files change.

## Architecture Overview

### Application Structure

This is an Angular 17 standalone components application (no NgModules). The architecture follows a feature-based structure:

```
src/app/
├── core/                    # Core singleton services and infrastructure
│   ├── guards/             # Route guards (auth.guard.ts)
│   ├── interceptors/       # HTTP interceptors (auth, error handling)
│   ├── models/             # TypeScript interfaces and types
│   └── services/           # Core services (auth, meeting, chat, recording, livekit)
├── features/               # Feature modules (lazy-loaded)
│   ├── auth/              # Authentication (login)
│   ├── home/              # Home dashboard
│   ├── meeting/           # Meeting-related components
│   │   ├── meeting-room/  # Main meeting room component
│   │   ├── chat-panel/    # Chat sidebar
│   │   ├── participants-list/  # Participants sidebar
│   │   └── join/          # Join meeting flow
│   └── recordings/        # Recording management
├── shared/                # Shared components and utilities
├── app.component.ts       # Root component
├── app.config.ts          # Application configuration (providers)
└── app.routes.ts          # Route definitions
```

### Core Services Architecture

The application uses five main services that manage different aspects of the video conferencing system:

#### 1. AuthService (`core/services/auth.service.ts`)
- Handles user authentication and JWT token management
- Stores tokens in localStorage
- Provides current user information
- Token expiration checking

#### 2. MeetingService (`core/services/meeting.service.ts`)
- Manages meeting room lifecycle (create, join, end)
- Communicates with meeting microservice at `/api/meetings`
- Handles meeting invitations and invitation codes
- Manages participant state via RxJS BehaviorSubjects
- Key methods: `joinMeeting()`, `createRoom()`, `endRoom()`, `generateInvitation()`

#### 3. LiveKitService (`core/services/livekit.service.ts`)
- **Critical service** for real-time audio/video communication
- Wraps the LiveKit client SDK
- Manages WebRTC connections, tracks, and participants
- Provides observables for connection state, participants, and local tracks
- Key methods:
  - `connect()` / `connectToRoom()`: Connect to LiveKit room with token
  - `disconnect()` / `disconnectFromRoom()` / `leaveMeeting()`: Disconnect from room
  - `toggleCamera()` / `toggleVideo()`: Enable/disable video
  - `toggleMicrophone()` / `toggleAudio()`: Enable/disable audio
  - `toggleScreenShare()`: Start/stop screen sharing
  - `getAllParticipants()`: Get list of all participants (local + remote)
  - `diagnoseCameraIssues()`, `autoFixCamera()`: Camera troubleshooting utilities

#### 4. ChatService (`core/services/chat.service.ts`)
- Manages real-time chat messaging
- Communicates with chat microservice at `/api/chat`
- Maintains message history and unread count via BehaviorSubjects
- Handles chat events (MESSAGE_SENT, USER_JOINED, USER_LEFT)
- Key methods: `sendMessage()`, `getChatHistory()`, `handleChatEvent()`

#### 5. RecordingService (`core/services/recording.service.ts`)
- Manages meeting recordings
- Communicates with recording microservice at `/api/recordings`
- Handles recording start/stop, download, and listing

### HTTP Interceptors

Configured in `app.config.ts` with functional interceptors:

1. **authInterceptor**: Automatically adds `Authorization: Bearer <token>` header to requests
2. **errorInterceptor**: Centralized error handling for HTTP requests

### Route Guards

- **authGuard**: Protects routes requiring authentication, redirects to `/login` with `returnUrl` query param

### State Management

The application uses **RxJS BehaviorSubjects** for state management (no NgRx or other state library):

- Services expose observables (e.g., `participants$`, `messages$`, `connectionState$`)
- Components subscribe to these observables
- Services provide methods to update state

### Backend Integration

The application connects to multiple microservices:

- **API Gateway**: `http://localhost:8080` (proxied via `/api` in development)
- **Meeting Service**: `/api/meetings` (port 8082 in production)
- **Chat Service**: `/api/chat` (port 8081 in production)
- **Recording Service**: `/api/recordings` (port 8083 in production)
- **LiveKit Server**: WebSocket connection (default: `ws://10.0.11.181:7880`)

Environment configuration is in `src/environments/environment.ts` (dev) and `environment.prod.ts` (prod).

## Key Implementation Patterns

### Lazy Loading
All feature routes use lazy loading with `loadComponent`:
```typescript
{
  path: 'meeting/:roomName',
  loadComponent: () => import('./features/meeting/meeting-room/meeting-room.component')
    .then(m => m.MeetingRoomComponent),
  canActivate: [authGuard]
}
```

### Standalone Components
All components are standalone (Angular 17 pattern):
```typescript
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule, MatButtonModule, ...],
  templateUrl: './example.component.html'
})
```

### Service Communication Pattern
Services use RxJS patterns:
- BehaviorSubject for state that needs initial value
- Subject for events
- Observable exposure with `asObservable()`

### LiveKit Integration Flow
1. User joins meeting → `MeetingService.joinMeeting()` gets LiveKit token from backend
2. Connect to LiveKit → `LiveKitService.connect(serverUrl, token)`
3. Enable media → `toggleCamera()`, `toggleMicrophone()`
4. LiveKit events update participants list automatically
5. On leave → `LiveKitService.disconnect()`

## Important Notes

### LiveKit Service Method Aliases
The LiveKitService has multiple method names for the same operations (for backward compatibility):
- `connect()` = `connectToRoom()`
- `disconnect()` = `disconnectFromRoom()` = `leaveMeeting()`
- `toggleCamera()` = `toggleVideo()`
- `toggleMicrophone()` = `toggleAudio()`

When adding new code, prefer the shorter method names (`connect`, `disconnect`, `toggleCamera`, `toggleMicrophone`).

### Authentication Flow
1. User logs in via `AuthService.login()`
2. JWT token stored in localStorage
3. `authInterceptor` adds token to all HTTP requests
4. `authGuard` protects routes by checking token validity
5. On token expiration, user redirected to login

### Proxy Configuration
In development, the Angular dev server proxies API requests to avoid CORS issues. The proxy is configured in `proxy.conf.json` and enabled via `angular.json` (development configuration).

### Material Design + Bootstrap
The app uses both Angular Material and Bootstrap 5:
- Material for dialogs, snackbars, and some UI components
- Bootstrap for grid layout and utility classes
- Custom SCSS in `src/styles.scss`

### Browser Compatibility
The app requires WebRTC support. Use `LiveKitService.checkMobileBrowserCompatibility()` to verify browser capabilities before joining meetings.

## Common Tasks

### Adding a New Feature Component
1. Generate component: `ng generate component features/my-feature --standalone`
2. Add route in `app.routes.ts` with lazy loading
3. Import required standalone modules in component
4. Add route guard if authentication required

### Adding a New Service
1. Generate service: `ng generate service core/services/my-service`
2. Service is automatically `providedIn: 'root'` (singleton)
3. Inject HttpClient if needed for API calls
4. Use BehaviorSubject/Subject for state management

### Modifying API Endpoints
Update the service URLs in `src/environments/environment.ts` and `environment.prod.ts`.

### Debugging LiveKit Issues
Use the diagnostic methods in LiveKitService:
- `diagnoseCameraIssues()`: Check camera availability and permissions
- `autoFixCamera()`: Attempt to automatically fix camera problems
- `checkMobileBrowserCompatibility()`: Verify browser support

## Testing Accounts
Demo accounts from README:
- `admin / admin123` - Administrator
- `teacher / teacher123` - Teacher
- `student / student123` - Student
