# Documentação: Download e Armazenamento de Imagens do Instagram

Este documento explica a implementação simplificada para baixar e armazenar imagens do Instagram no bucket do Supabase.

## Visão Geral

A funcionalidade de download de imagens foi reescrita para ser a mais simples possível, utilizando uma abordagem direta de download seguido de upload para o Supabase Storage.

## Como Funciona

A solução segue um fluxo simples:

1. **Validação da URL** - Verifica se a URL é válida
2. **Verificação do Bucket** - Garante que o bucket existe no Supabase
3. **Download da Imagem** - Usa axios para baixar a imagem como array buffer
4. **Upload para o Supabase** - Faz upload do buffer para o Supabase Storage
5. **Obtenção de URL Pública** - Retorna a URL pública da imagem armazenada
6. **Fallback** - Em caso de falha, retorna a URL original

### Implementação

```javascript
// Fluxo simplificado
try {
  // 1. Baixar a imagem como array buffer
  const response = await axios.get(imageUrl, {
    responseType: 'arraybuffer'
  });
  
  // 2. Upload do buffer para o Supabase
  const { data, error } = await supabaseAdmin.storage
    .from(bucketName)
    .upload(path, response.data, {
      contentType: 'image/jpeg',
      upsert: true
    });
    
  // 3. Obter a URL pública
  const { data: urlData } = supabaseAdmin.storage
    .from(bucketName)
    .getPublicUrl(path);
    
  return urlData.publicUrl;
} catch (error) {
  // Fallback: retornar URL original
  return imageUrl;
}
```

## Vantagens da Abordagem Simplificada

1. **Simplicidade** - Menos código, menos pontos de falha
2. **Manutenção** - Fácil de entender e manter
3. **Robustez** - Fallback automático para a URL original em caso de falha
4. **Compatibilidade** - Funciona em qualquer ambiente (desenvolvimento ou produção)

## Executando Testes

Para testar a funcionalidade:

```
npm run test:images
```

Este comando executa o script `test-image-storage.js` que testa o bucket do Supabase e tenta fazer o download e armazenamento de uma imagem de teste.

## Solução de Problemas Comuns

### CORS Bloqueando o Download

Em alguns casos, o navegador pode bloquear o download direto com erro CORS. Isto acontece porque o Instagram bloqueia requisições cross-origin.

**Solução**: O método atual contorna isso realizando:
1. Download do lado do cliente como arraybuffer
2. Upload direto do buffer para o Supabase

### URLs Expiradas ou Inválidas

Algumas URLs de imagens do Instagram podem expirar ou ficar inválidas após algum tempo.

**Solução**: A função retorna a URL original como fallback quando o download falha, garantindo que alguma imagem seja sempre exibida.

## Segurança

- A solução usa a chave secreta do Supabase (service_key) para operações de armazenamento
- As imagens são armazenadas com nomes de arquivos únicos (timestamp + hash aleatório)
- O bucket do Supabase é configurado com as políticas de segurança apropriadas 