export const environment = {
  production: false,
  apiUrl: '/api',
  meetingServiceUrl: '/api/meetings',
  chatServiceUrl: '/api/chat',
  recordServiceUrl: '/api/recordings',
  livekitServerUrl: 'ws://192.168.1.3:7880', // 本地LiveKit服务器
  socketUrl: '/api',
  features: {
    recording: true,
    screenShare: true,
    chat: true,
    maxParticipants: 50
  }
};
