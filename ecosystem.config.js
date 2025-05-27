module.exports = {
    apps: [
        {
            name: 'instagram-proxy',
            script: './server/instagram-proxy-production.js',
            instances: 2, // Número de instâncias (ajuste conforme CPU)
            exec_mode: 'cluster',
            env: {
                NODE_ENV: 'production',
                PORT: 3001,
                PROXY_PORT: 3001
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 3001,
                PROXY_PORT: 3001
            },
            // Configurações de monitoramento
            max_memory_restart: '500M',
            error_file: './logs/proxy-error.log',
            out_file: './logs/proxy-out.log',
            log_file: './logs/proxy-combined.log',
            time: true,

            // Auto restart em caso de crash
            autorestart: true,
            watch: false,
            max_restarts: 10,
            min_uptime: '10s',

            // Configurações de cluster
            listen_timeout: 3000,
            kill_timeout: 5000,
        }
    ],

    deploy: {
        production: {
            user: 'instagram-app',
            host: 'seu-ip-da-vps',
            ref: 'origin/main',
            repo: 'https://github.com/seu-usuario/seu-repositorio.git',
            path: '/var/www/instagram-analytics',
            'pre-deploy-local': '',
            'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
            'pre-setup': ''
        }
    }
}; 