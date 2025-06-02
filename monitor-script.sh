#!/bin/bash

# Script de monitoramento do proxy Instagram
# Arquivo: /usr/local/bin/monitor-instagram-proxy.sh

LOG_FILE="/var/log/instagram-proxy-monitor.log"
PROXY_URL="http://localhost:3001/health"
ALERT_EMAIL="seu-email@exemplo.com"  # Configure seu email

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

check_proxy_health() {
    response=$(curl -s -w "%{http_code}" $PROXY_URL)
    http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        log_message "✅ Proxy OK - HTTP $http_code"
        return 0
    else
        log_message "❌ Proxy ERRO - HTTP $http_code"
        return 1
    fi
}

restart_proxy() {
    log_message "🔄 Reiniciando proxy..."
    pm2 restart instagram-proxy
    sleep 5
    
    if check_proxy_health; then
        log_message "✅ Proxy reiniciado com sucesso"
    else
        log_message "❌ Falha ao reiniciar proxy"
        # Enviar alerta por email (configure sendmail ou similar)
        # echo "Proxy Instagram falhou após tentativa de restart" | mail -s "ALERTA: Proxy Instagram" $ALERT_EMAIL
    fi
}

# Verificar saúde do proxy
if ! check_proxy_health; then
    restart_proxy
fi

# Verificar uso de memória do PM2
memory_usage=$(pm2 jlist | jq '.[0].monit.memory' 2>/dev/null || echo "0")
memory_mb=$((memory_usage / 1024 / 1024))

if [ $memory_mb -gt 800 ]; then
    log_message "⚠️ Alto uso de memória: ${memory_mb}MB"
fi

# Verificar logs de erro recentes
error_count=$(tail -n 100 /var/log/pm2/instagram-proxy-error.log | grep "$(date '+%Y-%m-%d')" | wc -l)
if [ $error_count -gt 10 ]; then
    log_message "⚠️ Muitos erros hoje: $error_count"
fi

log_message "📊 Status: Memória ${memory_mb}MB | Erros hoje: $error_count" 