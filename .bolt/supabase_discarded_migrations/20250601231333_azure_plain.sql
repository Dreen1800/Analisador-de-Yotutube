-- Adicionar campos para rastrear imagens do Supabase
ALTER TABLE instagram_profiles ADD COLUMN profile_pic_from_supabase BOOLEAN DEFAULT FALSE;
ALTER TABLE instagram_posts ADD COLUMN image_from_supabase BOOLEAN DEFAULT FALSE;

-- SQL para criar políticas de bucket no Storage
-- NOTA: Execute estas instruções manualmente no Editor SQL do Supabase
/*
-- Primeiro, verifique se o bucket já existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('instagram-images', 'instagram-images', true)
ON CONFLICT (id) DO NOTHING;

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
    bucket_id = 'instagram-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para permitir que usuários autenticados excluam seus próprios arquivos
CREATE POLICY "Usuários autenticados podem excluir seus próprios arquivos"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'instagram-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
);
*/

-- Comentários explicativos para administradores
COMMENT ON COLUMN instagram_profiles.profile_pic_from_supabase IS 'Indica se a imagem de perfil está armazenada no Supabase Storage';
COMMENT ON COLUMN instagram_posts.image_from_supabase IS 'Indica se a imagem do post está armazenada no Supabase Storage';