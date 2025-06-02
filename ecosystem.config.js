module.exports = {
    apps: [{
        name: 'instagram-proxy',
        script: 'proxy-server.js',
        instances: 2, // Usar 2 processos para redundância
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'production',
            PORT: 3001
        },
        env_production: {
            NODE_ENV: 'production',
            PORT: 3001
        },
        // Configurações de monitoramento
        watch: false,
        ignore_watch: ['node_modules', 'logs'],
        max_memory_restart: '1G',

        // Logs
        log_file: '/var/log/pm2/instagram-proxy-combined.log',
        out_file: '/var/log/pm2/instagram-proxy-out.log',
        error_file: '/var/log/pm2/instagram-proxy-error.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

        // Auto restart configurações
        restart_delay: 4000,
        max_restarts: 10,
        min_uptime: '10s',

        // Health check
        health_check_grace_period: 3000,
        health_check_fatal_exceptions: true
    }]
}; 