-- Script para ajustar políticas de segurança de linha (RLS) para a tabela instagram_profiles
-- Este script deve ser executado no SQL Editor do painel do Supabase

-- Verificar políticas existentes
SELECT * FROM pg_policies WHERE tablename = 'instagram_profiles';

-- Desativar RLS temporariamente para diagnóstico (use com cuidado!)
-- ALTER TABLE public.instagram_profiles DISABLE ROW LEVEL SECURITY;

-- Criar política para permitir operações de exclusão para usuários autenticados (seus próprios dados)
DROP POLICY IF EXISTS "Usuários podem excluir seus próprios perfis" ON public.instagram_profiles;
CREATE POLICY "Usuários podem excluir seus próprios perfis"
  ON public.instagram_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Criar política para permitir que funções administrativas (via chave de serviço) excluam qualquer perfil
DROP POLICY IF EXISTS "Admins podem excluir qualquer perfil" ON public.instagram_profiles;
CREATE POLICY "Admins podem excluir qualquer perfil"
  ON public.instagram_profiles
  FOR DELETE
  USING (
    -- Esta condição é verdadeira quando a requisição vem através da chave de serviço
    (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')
  );

-- Certifique-se de que RLS está ativado
ALTER TABLE public.instagram_profiles ENABLE ROW LEVEL SECURITY;

-- Quando executado através da chave de serviço, o seguinte comando deve funcionar:
-- DELETE FROM public.instagram_profiles WHERE id = 'seu-id-de-perfil-aqui'; 