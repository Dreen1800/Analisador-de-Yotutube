-- Migração para adicionar colunas de rastreamento de imagens
-- Execute este arquivo no SQL Editor do Supabase

-- Adicionar coluna para indicar se a imagem do perfil está no Supabase
ALTER TABLE instagram_profiles 
ADD COLUMN IF NOT EXISTS profile_pic_from_supabase BOOLEAN DEFAULT FALSE;

-- Adicionar coluna para indicar se a imagem do post está no Supabase  
ALTER TABLE instagram_posts 
ADD COLUMN IF NOT EXISTS image_from_supabase BOOLEAN DEFAULT FALSE;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_instagram_profiles_profile_pic_from_supabase 
ON instagram_profiles(profile_pic_from_supabase);

CREATE INDEX IF NOT EXISTS idx_instagram_posts_image_from_supabase 
ON instagram_posts(image_from_supabase);

-- Criar bucket se não existir (pode ser necessário fazer via interface)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('instagram-images', 'instagram-images', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir inserção de imagens
CREATE POLICY "Allow authenticated users to upload instagram images" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'instagram-images' 
    AND auth.role() = 'authenticated'
);

-- Política para permitir leitura pública das imagens
CREATE POLICY "Allow public read access to instagram images" ON storage.objects
FOR SELECT USING (bucket_id = 'instagram-images');

-- Política para permitir atualização das próprias imagens
CREATE POLICY "Allow users to update their own instagram images" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'instagram-images' 
    AND auth.role() = 'authenticated'
);

-- Política para permitir exclusão das próprias imagens
CREATE POLICY "Allow users to delete their own instagram images" ON storage.objects
FOR DELETE USING (
    bucket_id = 'instagram-images' 
    AND auth.role() = 'authenticated'
); 