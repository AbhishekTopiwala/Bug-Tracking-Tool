import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

// ── Auto-detect APP_ENV from git branch ──────────────────────────────────
// Branch mapping:  stage → stage,  pre-prod → pre-prod,  * → production
// The .env VITE_APP_ENV value overrides this if explicitly set.
function detectAppEnv(mode) {
  if (mode === 'development') return 'development';
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    const branchEnvMap = {
      'stage': 'stage',
      'pre-prod': 'pre-prod',
      'main': 'production',
    };
    return branchEnvMap[branch] || 'production';
  } catch {
    return 'production';
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const detectedEnv = detectAppEnv(mode);

  // Log which environment is active (visible in terminal on npm run dev)
  console.log(`\n  🔧 Branch-detected APP_ENV: ${detectedEnv}\n`);

  return {
    plugins: [react()],
    // Inject VITE_APP_ENV so paymentService.js picks it up via import.meta.env
    // .env value takes priority if set; otherwise branch detection kicks in
    define: {
      'import.meta.env.VITE_APP_ENV': JSON.stringify(
        process.env.VITE_APP_ENV || detectedEnv
      ),
    },
    server: {
      proxy: {
        // Proxy /api/* to local Vercel dev server (run: npx vercel dev --listen 3005)
        // ⚠️  NEVER point this to production (qualia-hq.vercel.app)
        '/api': {
          target: 'http://localhost:3005',
          changeOrigin: true,
        }
      }
    }
  };
})

