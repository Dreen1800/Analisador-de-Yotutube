-- Add image tracking columns to Instagram tables
ALTER TABLE public.instagram_profiles 
ADD COLUMN IF NOT EXISTS profile_pic_from_supabase boolean DEFAULT false;

ALTER TABLE public.instagram_posts 
ADD COLUMN IF NOT EXISTS image_from_supabase boolean DEFAULT false;

-- Add comment to explain the column purpose
COMMENT ON COLUMN public.instagram_profiles.profile_pic_from_supabase IS 'Indica se a imagem de perfil está armazenada no Supabase Storage';
COMMENT ON COLUMN public.instagram_posts.image_from_supabase IS 'Indica se a imagem do post está armazenada no Supabase Storage';