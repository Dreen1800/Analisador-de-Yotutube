# Configuração do Scraper de Instagram com Supabase Storage

Este guia explica como configurar a integração entre o scraper de Instagram e o Storage do Supabase para armazenar imagens.

## 1. Pré-requisitos

- Conta no Supabase (gratuita ou paga)
- Credenciais de API do Supabase (URL e chave anon/service)
- Ambiente Node.js configurado
- API key do Apify (para scraping do Instagram)

## 2. Configuração do Bucket no Supabase

1. Acesse o Dashboard do seu projeto no Supabase
2. Navegue até a seção "Storage" no menu lateral
3. Crie um novo bucket chamado `instagram-images` se ainda não existir
4. Certifique-se de que o bucket esteja marcado como público

### Configurando Permissões (RLS)

Execute o seguinte script SQL no Editor SQL do Supabase para configurar as políticas de segurança:

```sql
-- Verificar se o bucket já existe e criar se necessário
INSERT INTO storage.buckets (id, name, public)
VALUES ('instagram-images', 'instagram-images', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir que usuários autenticados façam upload
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'instagram-images'
)
ON CONFLICT DO NOTHING;

-- Política para permitir leitura de arquivos para qualquer pessoa
CREATE POLICY "Qualquer pessoa pode ver arquivos"
ON storage.objects FOR SELECT TO public
USING (
    bucket_id = 'instagram-images'
)
ON CONFLICT DO NOTHING;

-- Política para permitir que usuários autenticados atualizem seus próprios arquivos
CREATE POLICY "Usuários autenticados podem atualizar seus próprios arquivos"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'instagram-images'
)
ON CONFLICT DO NOTHING;

-- Política para permitir que usuários autenticados excluam seus próprios arquivos
CREATE POLICY "Usuários autenticados podem excluir seus próprios arquivos"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'instagram-images'
)
ON CONFLICT DO NOTHING;
```

> **Nota**: O script acima está disponível no arquivo `supabase/setup-bucket.sql` no projeto.

## 3. Testando a Configuração

Para verificar se o bucket está corretamente configurado, use o script de teste incluído:

```bash
# Execute no terminal
node test-bucket.js URL_DO_SUPABASE CHAVE_ANONIMA_DO_SUPABASE
```

Substitua `URL_DO_SUPABASE` e `CHAVE_ANONIMA_DO_SUPABASE` com suas credenciais.

O script vai:
1. Verificar se o bucket existe
2. Testar permissões de leitura/escrita
3. Fazer upload de uma imagem de teste
4. Verificar se a URL pública está acessível

## 4. Executando Migrações do Banco de Dados

Se você ainda não executou as migrações do banco de dados, é necessário aplicar as migrações para criar as tabelas necessárias:

1. Execute a migração principal:
   ```sql
   -- Arquivo: supabase/migrations/20250501195000_instagram_tables.sql
   ```

2. Execute a migração que adiciona os campos para controle de imagens do Supabase:
   ```sql
   -- Arquivo: supabase/migrations/20250501195001_add_supabase_image_flags.sql
   ```

## 5. Configuração de Variáveis de Ambiente

Certifique-se de que seu arquivo `.env` contenha as seguintes variáveis:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

## 6. Uso da API do Instagram

O sistema usa a integração com o Apify para realizar o scraping do Instagram. Você precisa:

1. Criar uma conta no Apify se ainda não tiver
2. Obter sua API key
3. Adicionar a API key no sistema através da interface do usuário (seção Configurações)

## 7. Funcionamento

A integração implementada:

- Faz o scraping de perfis e posts do Instagram usando Apify
- Baixa as imagens de perfil e posts
- Armazena as imagens no bucket do Supabase
- Substitui as URLs originais por URLs do Supabase Storage
- Mantém flags nos registros indicando quais imagens estão no Supabase

## 8. Solução de Problemas

### Erro "new row violates row-level security policy"

Este erro ocorre quando as políticas de segurança não estão corretamente configuradas. Certifique-se de:

1. Ter executado o script SQL para configurar as políticas
2. Estar usando um usuário autenticado para fazer upload
3. Verificar se o bucket existe e está configurado como público

### Imagens não são salvas no Supabase

Caso as imagens não sejam salvas, verifique:

1. Os logs do console para erros específicos
2. Se o bucket `instagram-images` existe
3. Se há permissões de RLS configuradas corretamente
4. Se há problemas de conectividade com as URLs de origem das imagens

### Teste de Upload Falha

Execute o script de teste para diagnóstico detalhado:

```bash
node test-bucket.js URL_DO_SUPABASE CHAVE_ANONIMA_DO_SUPABASE
```

## 9. Informações Adicionais

O sistema implementa quatro métodos diferentes para baixar imagens, usando:

1. Fetch API com headers personalizados
2. Proxy Google para contornar limitações de CORS
3. CORS Anywhere como alternativa
4. Axios para casos onde o fetch falha

Isso garante a maior taxa de sucesso possível ao baixar imagens de diversas fontes. 