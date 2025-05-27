#!/bin/bash

# Script de Deploy para Produção
# Execute na VPS como: bash deploy-production.sh

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy da aplicação Instagram Analytics..."

# Variáveis
APP_DIR="/var/www/instagram-analytics"
NGINX_CONFIG="/etc/nginx/sites-available/instagram-analytics"
DOMAIN="seu-dominio.com"  # Altere para seu domínio

# Verificar se está rodando como usuário correto
if [ "$USER" != "instagram-app" ]; then
    echo "⚠️  Execute este script como usuário instagram-app"
    echo "   sudo su - instagram-app"
    echo "   bash deploy-production.sh"
    exit 1
fi

# Navegar para diretório da aplicação
cd $APP_DIR

# Fazer backup da versão atual (se existir)
if [ -d "current" ]; then
    echo "📦 Fazendo backup da versão atual..."
    mv current backup-$(date +%Y%m%d-%H%M%S) || true
fi

# Clonar/atualizar código
if [ -d ".git" ]; then
    echo "🔄 Atualizando código..."
    git pull origin main
else
    echo "📥 Clonando repositório..."
    git clone https://github.com/seu-usuario/seu-repositorio.git .
fi

# Instalar dependências
echo "📦 Instalando dependências..."
npm ci --production

# Instalar dependências do servidor proxy
echo "📦 Instalando dependências do servidor proxy..."
cd server
npm ci --production
cd ..

# Criar diretórios necessários
echo "📁 Criando diretórios..."
mkdir -p logs
mkdir -p /var/log/instagram-analytics

# Copiar arquivo de ambiente
if [ ! -f ".env" ]; then
    echo "📝 Configurando arquivo de ambiente..."
    cp env.production.example .env
    echo "⚠️  IMPORTANTE: Edite o arquivo .env com suas configurações reais!"
    echo "   nano .env"
fi

# Build da aplicação React
echo "🏗️  Fazendo build da aplicação..."
npm run build

# Configurar Nginx (se não estiver configurado)
if [ ! -f "$NGINX_CONFIG" ]; then
    echo "🌐 Configurando Nginx..."
    sudo cp nginx-config.conf $NGINX_CONFIG
    
    # Substituir domínio no arquivo de configuração
    sudo sed -i "s/seu-dominio.com/$DOMAIN/g" $NGINX_CONFIG
    
    # Ativar site
    sudo ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/
    
    # Remover configuração padrão
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Testar configuração
    sudo nginx -t
    
    # Recarregar Nginx
    sudo systemctl reload nginx
fi

# Configurar SSL (se não estiver configurado)
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "🔒 Configurando SSL..."
    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
fi

# Parar PM2 se estiver rodando
echo "🔄 Gerenciando processos PM2..."
pm2 stop all || true

# Iniciar aplicação com PM2
echo "🚀 Iniciando aplicação..."
pm2 start ecosystem.config.js --env production

# Salvar configuração PM2
pm2 save

# Configurar PM2 para iniciar no boot
pm2 startup || true

# Verificar status
echo "📊 Status da aplicação:"
pm2 status

# Verificar se o proxy está respondendo
echo "🔍 Testando servidor proxy..."
sleep 5
curl -f http://localhost:3001/health || echo "⚠️  Proxy não está respondendo"

# Verificar se o Nginx está funcionando
echo "🔍 Testando Nginx..."
curl -f http://localhost/ || echo "⚠️  Nginx não está respondendo"

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "🌐 Sua aplicação está disponível em:"
echo "   https://$DOMAIN"
echo ""
echo "📊 Para monitorar a aplicação:"
echo "   pm2 status"
echo "   pm2 logs"
echo "   pm2 monit"
echo ""
echo "🔧 Para atualizar a aplicação:"
echo "   bash deploy-production.sh"
echo ""
echo "📝 Não esqueça de:"
echo "   1. Configurar o arquivo .env com suas credenciais reais"
echo "   2. Configurar o DNS do seu domínio para apontar para esta VPS"
echo "   3. Configurar o Supabase Storage com o script SQL" 