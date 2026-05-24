/**
 * ecosystem.config.cjs — PM2 process manager config for the production EC2.
 *
 * Deploy:
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 save
 *   pm2 startup systemd -u ubuntu --hp /home/ubuntu  # follow printed sudo cmd
 *
 * Update (zero-downtime):
 *   git pull && npm ci && npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
 *   npx nx build api
 *   pm2 reload cpo-api
 *
 * Logs:
 *   pm2 logs cpo-api               # live tail
 *   pm2 logs cpo-api --lines 200   # last 200 lines
 *   pm2 monit                      # CPU + memory dashboard
 *
 * Persistent file locations:
 *   /var/log/cpo/api-{out,err}.log   (set up: sudo mkdir -p /var/log/cpo && sudo chown ubuntu:ubuntu /var/log/cpo)
 *   /opt/cpo/apps/api/.env           (chmod 600)
 *   /opt/cpo/apps/api/.secrets/      (chmod 700 — firebase-admin.json + apns.p8 live here)
 */
module.exports = {
  apps: [
    {
      name: 'cpo-api',
      cwd: '/opt/cpo',
      script: './apps/api/dist/main.js',

      // ── Process model ──────────────────────────────────────────────────────
      // Start with 1 instance (fork). Move to 'cluster' + instances:'max' ONLY
      // after you've verified Redis-backed session/rate-limit state holds up
      // under multi-worker (express-rate-limit defaults to in-memory which
      // breaks across workers). For v1, single worker is correct.
      instances: 1,
      exec_mode: 'fork',

      // ── Env file ───────────────────────────────────────────────────────────
      // PM2 5.3+ loads this file at process start. Secrets stay OUT of this
      // ecosystem file (which is committed) — they live in .env (chmod 600,
      // gitignored). If you're on PM2 < 5.3, upgrade: `sudo npm i -g pm2@latest`.
      env_file: '/opt/cpo/apps/api/.env',

      // ── Reliability ────────────────────────────────────────────────────────
      max_memory_restart: '1G',       // restart if RSS climbs above 1 GB
      min_uptime: '10s',              // crash within 10s = bad config, not flapping
      max_restarts: 10,
      restart_delay: 4000,
      autorestart: true,
      kill_timeout: 10000,            // give Express 10s to drain in-flight requests

      // ── Logs ───────────────────────────────────────────────────────────────
      error_file: '/var/log/cpo/api-err.log',
      out_file:   '/var/log/cpo/api-out.log',
      merge_logs: true,
      time: true,                     // prepend timestamps
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // ── Source-map support ─────────────────────────────────────────────────
      // webpack.config.js ships sourcemaps to dist/ — make stack traces useful.
      node_args: '--enable-source-maps',
    },
  ],
};
