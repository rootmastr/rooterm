const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

console.log('🚀 RooTerm API URL:', API_URL);

export { API_URL, SOCKET_URL };
