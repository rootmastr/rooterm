// Paksa menggunakan port 3001 (Langsung ke Backend)
const API_URL = import.meta.env.VITE_API_URL || 'http://rootmastr.space:3001';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://rootmastr.space:3001';

export { API_URL, SOCKET_URL };
