-- Instagram Profiles table
CREATE TABLE instagram_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  instagram_id TEXT NOT NULL,
  username TEXT NOT NULL,
  full_name TEXT,
  biography TEXT,
  followers_count INTEGER,
  follows_count INTEGER,
  posts_count INTEGER,
  profile_pic_url TEXT,
  is_business_account BOOLEAN,
  business_category_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Instagram Posts table
CREATE TABLE instagram_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES instagram_profiles(id) ON DELETE CASCADE,
  instagram_id TEXT NOT NULL,
  short_code TEXT NOT NULL,
  type TEXT,
  url TEXT,
  caption TEXT,
  timestamp TIMESTAMP WITH TIME ZONE,
  likes_count INTEGER,
  comments_count INTEGER,
  video_view_count INTEGER,
  display_url TEXT,
  is_video BOOLEAN,
  hashtags JSONB,
  mentions JSONB,
  product_type TEXT,
  is_comments_disabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- For Apify API keys
CREATE TABLE apify_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  api_key TEXT NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE instagram_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE apify_keys ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own Instagram profiles"
  ON instagram_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Instagram profiles"
  ON instagram_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Instagram profiles"
  ON instagram_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Instagram profiles"
  ON instagram_profiles FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own Instagram posts"
  ON instagram_posts FOR SELECT
  USING (profile_id IN (
    SELECT id FROM instagram_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own Instagram posts"
  ON instagram_posts FOR INSERT
  WITH CHECK (profile_id IN (
    SELECT id FROM instagram_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own Instagram posts"
  ON instagram_posts FOR UPDATE
  USING (profile_id IN (
    SELECT id FROM instagram_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own Instagram posts"
  ON instagram_posts FOR DELETE
  USING (profile_id IN (
    SELECT id FROM instagram_profiles WHERE user_id = auth.uid()
  ));

-- Apify Keys policies
CREATE POLICY "Users can manage their own Apify keys"
  ON apify_keys FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id); 