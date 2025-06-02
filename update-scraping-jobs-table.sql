-- Adicionar novos campos à tabela scraping_jobs para suportar jobs separados
ALTER TABLE scraping_jobs 
ADD COLUMN IF NOT EXISTS job_type TEXT CHECK (job_type IN ('profile_data', 'posts', 'combined')),
ADD COLUMN IF NOT EXISTS parent_job_id UUID REFERENCES scraping_jobs(id) ON DELETE CASCADE;

-- Criar índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_job_type ON scraping_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_parent_job_id ON scraping_jobs(parent_job_id);

-- Atualizar jobs existentes para ter job_type 'combined' (comportamento antigo)
UPDATE scraping_jobs 
SET job_type = 'combined' 
WHERE job_type IS NULL;

-- Comentários para documentação
COMMENT ON COLUMN scraping_jobs.job_type IS 'Tipo do job: profile_data (dados do perfil), posts (posts), combined (comportamento antigo)';
COMMENT ON COLUMN scraping_jobs.parent_job_id IS 'ID do job pai para jobs de posts que dependem de jobs de perfil'; 