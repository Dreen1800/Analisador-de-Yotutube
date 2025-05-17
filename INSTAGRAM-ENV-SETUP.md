# Configuração de Variáveis de Ambiente para Instagram

Para que o sistema de armazenamento de imagens do Instagram funcione corretamente, você precisa configurar as seguintes variáveis de ambiente no arquivo `.env`:

## Variáveis Supabase

```
# Supabase
VITE_SUPABASE_URL=sua_url_supabase_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
VITE_SUPABASE_SERVICE_KEY=sua_chave_service_role_aqui
```

## Onde encontrar as chaves

1. **URL do Supabase:** Encontrada no painel do Supabase em "Project Settings" > "API"
2. **Chave Anônima:** Encontrada no painel do Supabase em "Project Settings" > "API" > "Project API keys" > "anon public"
3. **Chave de Serviço:** Encontrada no painel do Supabase em "Project Settings" > "API" > "Project API keys" > "service_role key (secret)"

## Importante

- A chave anônima (`VITE_SUPABASE_ANON_KEY`) é usada para operações normais do usuário.
- A chave de serviço (`VITE_SUPABASE_SERVICE_KEY`) é usada para operações administrativas, como gerenciamento de buckets de armazenamento.
- **NUNCA compartilhe sua chave de serviço!** Ela tem acesso total ao seu banco de dados e armazenamento.

## Depois da configuração

Após configurar as variáveis de ambiente, reinicie o servidor de desenvolvimento para que as alterações sejam aplicadas:

```bash
npm run dev
```

Agora o sistema deverá conseguir criar e gerenciar o bucket de armazenamento "instagram-images" corretamente usando a chave de serviço para operações administrativas. 