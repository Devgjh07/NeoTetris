import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: "0.0.0.0", // 외부 모든 IP 접근 허용
    port: 5173,      // 필요시 포트 변경
  }
});

