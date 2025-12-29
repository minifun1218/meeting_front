export const environment = {
  production: true,
  apiUrl: '/api',
  meetingServiceUrl: '/api/meetings',
  chatServiceUrl: '/api/chat',
  recordServiceUrl: '/api/recordings',
  livekitServerUrl: 'ws://10.0.11.181:7880', // 本地LiveKit服务器
  socketUrl: '',
  features: {
    recording: true,
    screenShare: true,
    chat: true,
    maxParticipants: 50
  }
};
