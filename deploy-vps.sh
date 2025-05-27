#!/bin/bash

# Script de instalação completa para VPS
# Execute como: bash deploy-vps.sh

echo "🚀 Iniciando configuração da VPS para Instagram Analytics..."

# Atualizar sistema
echo "📦 Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18+
echo "📦 Instalando Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 para gerenciamento de processos
echo "📦 Instalando PM2..."
sudo npm install -g pm2

# Instalar Nginx
echo "📦 Instalando Nginx..."
sudo apt install -y nginx

# Instalar Git
echo "📦 Instalando Git..."
sudo apt install -y git

# Instalar certbot para SSL
echo "📦 Instalando Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Criar usuário para a aplicação
echo "👤 Criando usuário da aplicação..."
sudo useradd -m -s /bin/bash instagram-app
sudo usermod -aG sudo instagram-app

# Criar diretórios
echo "📁 Criando estrutura de diretórios..."
sudo mkdir -p /var/www/instagram-analytics
sudo chown instagram-app:instagram-app /var/www/instagram-analytics

echo "✅ Dependências instaladas com sucesso!"
echo "🔄 Próximo passo: fazer upload do código da aplicação" 