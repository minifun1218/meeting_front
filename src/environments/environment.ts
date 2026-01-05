export const environment = {
  production: false,
  apiUrl: '/api',
  meetingServiceUrl: '/api/meetings',
  chatServiceUrl: '/api/chat',
  recordServiceUrl: '/api/recordings',
  livekitServerUrl: 'ws://10.0.81.216:7880', // 本地LiveKit服务器
  socketUrl: '/api',
  features: {
    recording: true,
    screenShare: true,
    chat: true,
    maxParticipants: 50
  }
};
