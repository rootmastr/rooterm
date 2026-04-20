--- a/src/config.js
+++ b/src/config.js
@@ -1,3 +1,5 @@
-const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
-const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
+// Paksa menggunakan alamat domain rootmastr.space
+const API_URL = import.meta.env.VITE_API_URL || 'http://rootmastr.space:8087';
+const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://rootmastr.space:8087';
+
 export { API_URL, SOCKET_URL };

