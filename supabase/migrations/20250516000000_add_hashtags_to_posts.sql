-- Add new columns to the instagram_posts table

-- Add hashtags column
ALTER TABLE instagram_posts ADD COLUMN IF NOT EXISTS hashtags JSONB;

-- Add mentions column
ALTER TABLE instagram_posts ADD COLUMN IF NOT EXISTS mentions JSONB;

-- Add product_type column
ALTER TABLE instagram_posts ADD COLUMN IF NOT EXISTS product_type TEXT;

-- Add is_comments_disabled column
ALTER TABLE instagram_posts ADD COLUMN IF NOT EXISTS is_comments_disabled BOOLEAN DEFAULT FALSE; 