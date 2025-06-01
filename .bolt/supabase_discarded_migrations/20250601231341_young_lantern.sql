-- Script de configuração do bucket do Supabase para imagens do Instagram
-- Execute este script no Editor SQL do Supabase

-- Verificar se o bucket já existe e criar se necessário
INSERT INTO storage.buckets (id, name, public)
VALUES ('instagram-images', 'instagram-images', true)
ON CONFLICT (id) DO NOTHING;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload" ON storage.objects;
DROP POLICY IF EXISTS "Qualquer pessoa pode ver arquivos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar seus próprios arquivos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem excluir seus próprios arquivos" ON storage.objects;

-- Política para permitir que usuários autenticados façam upload
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'instagram-images'
);

-- Política para permitir leitura de arquivos para qualquer pessoa
CREATE POLICY "Qualquer pessoa pode ver arquivos"
ON storage.objects FOR SELECT TO public
USING (
    bucket_id = 'instagram-images'
);

-- Política para permitir que usuários autenticados atualizem seus próprios arquivos
CREATE POLICY "Usuários autenticados podem atualizar seus próprios arquivos"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'instagram-images'
);

-- Política para permitir que usuários autenticados excluam seus próprios arquivos
CREATE POLICY "Usuários autenticados podem excluir seus próprios arquivos"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'instagram-images'
);