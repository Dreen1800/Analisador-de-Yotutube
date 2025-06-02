# Integrações do Analisador de YouTube

Este documento contém a explicação de todas as integrações presentes na aplicação Analisador de YouTube.

## 1. Integração com a API do YouTube

### Serviço: `youtubeService.ts`

O aplicativo faz integração com a API do YouTube para obter dados de canais e vídeos através do serviço `youtubeService.ts`. Abaixo estão as principais funcionalidades:

- **Extração de ID do Canal**: Converte URLs de canal em IDs, suportando vários formatos (canal, handle, etc.)
- **Informações de Canal**: Busca dados gerais como título, inscritos, total de visualizações
- **Lista de Vídeos**: Recupera vídeos de um canal com opção de filtrar ou não shorts
- **Métricas de Vídeos**: Obtém estatísticas detalhadas de cada vídeo (visualizações, likes, comentários)
- **Cálculo de Engajamento**: Processa dados para produzir métricas como taxa de engajamento e visualizações por dia
- **Exportação de Dados**: Gera arquivos CSV e JSON com os resultados da análise

O serviço utiliza autenticação via chaves de API que são armazenadas no banco de dados e gerenciadas pelo `apiKeyStore`.

## 2. Integração com OpenAI

### Componente: `AiChannelAnalyzer.tsx`

A aplicação utiliza a API da OpenAI para gerar análises avançadas com base nos dados coletados do YouTube:

- **Análise de Tendências**: Identifica tendências entre os vídeos mais bem-sucedidos
- **Padrões de Conteúdo**: Detecta formatos e padrões que funcionam bem
- **Potencial Viral**: Sugere nichos com alta probabilidade de viralização
- **Ideias de Conteúdo**: Propõe ideias de vídeos com potencial viral

As chaves de API da OpenAI são gerenciadas pelo `openaiKeyStore`, que permite aos usuários armazenar e alternar entre múltiplas chaves.

## 3. Integração com Supabase

### Cliente: `supabaseClient.ts`

A aplicação utiliza o Supabase como backend, oferecendo:

- **Autenticação de Usuários**: Sistema completo de registro, login e gerenciamento de sessão
- **Armazenamento de Dados**: Tabelas para canais, análises, concorrentes e chaves de API
- **Segurança**: Políticas de RLS (Row Level Security) para proteger os dados de cada usuário

### Tabelas principais:
- `api_keys`: Armazena chaves da API do YouTube
- `openai_keys`: Armazena chaves da API da OpenAI
- `channels`: Informações sobre canais analisados
- `channel_analyses`: Resultados das análises de canais
- `competitors`: Canais concorrentes para comparação
- `ai_analyses`: Análises geradas pela IA
- `instagram_profiles`: Perfis do Instagram analisados
- `instagram_posts`: Posts coletados de perfis do Instagram
- `apify_keys`: Chaves da API Apify para scraping do Instagram

## 4. Integração com interface Dify

### Componente: `ContentCreator.tsx`

O aplicativo incorpora o chatbot Dify através de um iframe que proporciona:

- Interface de conversação para criação de conteúdo
- Acesso a um assistente especializado em criação de conteúdo para YouTube
- Comunicação com a plataforma Dify hospedada em https://dify.nexialab.com.br

## 5. Integração com Apify

### Serviço: `instagramService.ts`

O aplicativo utiliza a API da Apify para fazer scraping de perfis do Instagram através do serviço `instagramService.ts`:

- **Análise de Perfil**: Extrai informações de perfil como seguidores, seguindo, biografia, etc.
- **Coleta de Posts**: Recupera os últimos posts do perfil com métricas de engajamento
- **Processamento Assíncrono**: Gerencia jobs de scraping que podem levar alguns minutos
- **Armazenamento de Dados**: Salva os dados coletados no banco de dados Supabase

As chaves da API Apify são gerenciadas pelo `apifyKeyStore`, permitindo aos usuários armazenar e alternar entre múltiplas chaves.

## 6. Integrações de Estado com Zustand

A aplicação utiliza Zustand para gerenciamento de estado, com as seguintes stores:

- **apiKeyStore**: Gerencia chaves da API do YouTube
- **openaiKeyStore**: Gerencia chaves da API da OpenAI
- **apifyKeyStore**: Gerencia chaves da API da Apify
- **channelStore**: Gerencia canais e análises
- **instagramStore**: Gerencia perfis e posts do Instagram
- **themeStore**: Controla o tema da aplicação (claro/escuro)
- **authStore**: Gerencia o estado de autenticação

Cada store mantém seu próprio estado e fornece métodos para interação com o Supabase, permitindo um fluxo de dados consistente entre a interface do usuário e o backend. 