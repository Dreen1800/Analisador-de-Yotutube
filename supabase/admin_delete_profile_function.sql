-- Função SQL para excluir um perfil Instagram diretamente
-- Esta função deve ser executada no SQL Editor do Supabase

-- Criar a função para verificar o papel atual
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT current_setting('request.jwt.claims', true)::jsonb->>'role'
$$;

-- Criar função para excluir perfil com privilégios de administrador
CREATE OR REPLACE FUNCTION public.admin_delete_profile(profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com privilégios do criador (geralmente um superusuário)
AS $$
DECLARE
  profile_exists boolean;
BEGIN
  -- Verificar se o perfil existe
  SELECT EXISTS (
    SELECT 1 FROM public.instagram_profiles 
    WHERE id = profile_id
  ) INTO profile_exists;
  
  IF NOT profile_exists THEN
    RAISE EXCEPTION 'Perfil não encontrado';
  END IF;
  
  -- Excluir o perfil
  DELETE FROM public.instagram_profiles
  WHERE id = profile_id;
  
  -- Verificar se foi excluído
  SELECT EXISTS (
    SELECT 1 FROM public.instagram_profiles 
    WHERE id = profile_id
  ) INTO profile_exists;
  
  -- Retornar sucesso se o perfil não existir mais
  RETURN NOT profile_exists;
END;
$$;

-- Configurar permissões (apenas service_role pode executar esta função)
REVOKE ALL ON FUNCTION public.admin_delete_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_profile(uuid) TO service_role; 