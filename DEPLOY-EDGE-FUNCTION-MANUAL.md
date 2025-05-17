# Guia para Implantação Manual da Função Edge do Supabase

Como não foi possível instalar o CLI do Supabase ou usar a API REST para implantar automaticamente a função, siga este guia para implantá-la manualmente através da interface web do Supabase.

## Arquivos da Função

A função Edge está localizada em:
- `supabase/functions/download-instagram-image/index.ts` - Arquivo principal
- `supabase/functions/download-instagram-image/config.json` - Configuração da função (CORS)
- `supabase/functions/_shared/cors.ts` - Headers CORS compartilhados

## Passo a Passo para Implantação Manual

1. **Acesse o Dashboard do Supabase**
   - Entre em https://app.supabase.io/
   - Selecione seu projeto

2. **Navegue até a seção de Funções Edge**
   - No menu lateral, clique em "Edge Functions"

3. **Crie uma Nova Função**
   - Clique no botão "New Function"
   - Nome: `download-instagram-image`
   - Clique em "Create Function"

4. **Edite a Função**
   - Selecione a função recém-criada
   - Você verá um editor de código
   - Substitua todo o conteúdo pelo código de `index.ts`

5. **Crie o Arquivo Compartilhado**
   - Clique no botão "New File"
   - Nome: `_shared/cors.ts`
   - Cole o conteúdo do arquivo `_shared/cors.ts` local

6. **Configure a Função**
   - No menu lateral da função, selecione "Settings"
   - Em "HTTP Headers", adicione os headers CORS:
     ```
     Access-Control-Allow-Origin: *
     Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
     Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
     ```
   - Clique em "Save"

7. **Implante a Função**
   - Clique no botão "Deploy Function"
   - Aguarde a conclusão da implantação

## Como Testar a Função

Após a implantação, você pode testar a função usando:

```javascript
// Teste da função de download de imagem
const { data, error } = await supabaseClient.functions.invoke('download-instagram-image', {
  body: JSON.stringify({
    imageUrl: 'https://exemplo.com/imagem.jpg',
    storagePath: 'testes/imagem-teste.jpg',
    bucketName: 'instagram-images'
  })
});

console.log(data, error);
```

## Ajustando a Aplicação

Se a URL da função for diferente da esperada no código, atualize o arquivo `src/services/instagramService.ts` com a URL correta da função.

## Solução de Problemas de CORS

Se ainda houver problemas de CORS após a implantação manual:

1. Verifique se a função está respondendo corretamente às requisições OPTIONS
2. Confirme que os headers CORS estão configurados corretamente na função
3. Tente usar o proxy local do Vite enquanto os problemas não são resolvidos 