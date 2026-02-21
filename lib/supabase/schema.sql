-- AI 인사이트 허브 데이터베이스 스키마
-- Supabase SQL 에디터에서 실행하세요

-- 사용자 프로필 (auth.users 확장)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_member BOOLEAN DEFAULT FALSE,
  membership_tier TEXT DEFAULT 'free' CHECK (membership_tier IN ('free', 'basic', 'premium')),
  membership_expires_at TIMESTAMPTZ,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 카테고리
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 게시글 (AI 인사이트, 뉴스, 분석)
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  cover_image TEXT,
  category_id UUID REFERENCES categories(id),
  author_id UUID REFERENCES profiles(id),
  is_published BOOLEAN DEFAULT FALSE,
  is_members_only BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  source_url TEXT,
  is_bot_generated BOOLEAN DEFAULT FALSE,
  notion_page_id TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 강의 (Courses)
CREATE TABLE IF NOT EXISTS courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  thumbnail TEXT,
  instructor_id UUID REFERENCES profiles(id),
  price INTEGER DEFAULT 0,
  is_free BOOLEAN DEFAULT TRUE,
  is_members_only BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,
  category TEXT,
  level TEXT DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  duration_minutes INTEGER DEFAULT 0,
  lesson_count INTEGER DEFAULT 0,
  enroll_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 강의 레슨
CREATE TABLE IF NOT EXISTS lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  duration_minutes INTEGER DEFAULT 0,
  order_index INTEGER NOT NULL,
  is_free_preview BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 수강 등록
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  completed_lessons UUID[] DEFAULT '{}',
  progress_percent INTEGER DEFAULT 0,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

-- 커뮤니티 게시판
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  author_id UUID REFERENCES profiles(id),
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'question', 'showcase', 'news', 'discussion')),
  is_pinned BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 댓글
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id),
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 좋아요
CREATE TABLE IF NOT EXISTS likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  community_post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 봇 작업 로그
CREATE TABLE IF NOT EXISTS bot_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed')),
  payload JSONB,
  result JSONB,
  error_message TEXT,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notion 동기화 로그
CREATE TABLE IF NOT EXISTS notion_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id),
  notion_page_id TEXT,
  sync_type TEXT CHECK (sync_type IN ('create', 'update', 'delete')),
  status TEXT CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 카테고리 삽입
INSERT INTO categories (name, slug, description, color) VALUES
  ('AI 뉴스', 'ai-news', '최신 AI 관련 뉴스와 소식', '#6366f1'),
  ('AI 도구', 'ai-tools', 'AI 도구 리뷰 및 사용법', '#8b5cf6'),
  ('프롬프트 엔지니어링', 'prompt-engineering', '효과적인 프롬프트 작성법', '#06b6d4'),
  ('AI 비즈니스', 'ai-business', 'AI를 활용한 비즈니스 전략', '#10b981'),
  ('튜토리얼', 'tutorial', 'AI 도구 사용 튜토리얼', '#f59e0b')
ON CONFLICT (slug) DO NOTHING;

-- RLS 정책
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- profiles 정책
CREATE POLICY "프로필 공개 조회" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "자신의 프로필 수정" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "자신의 프로필 삽입" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- posts 정책
CREATE POLICY "공개 게시글 조회" ON posts FOR SELECT
  USING (is_published = TRUE AND (is_members_only = FALSE OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_member = TRUE)));
CREATE POLICY "관리자 게시글 관리" ON posts FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- community_posts 정책
CREATE POLICY "커뮤니티 게시글 조회" ON community_posts FOR SELECT USING (is_published = TRUE);
CREATE POLICY "인증된 사용자 커뮤니티 작성" ON community_posts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = author_id);
CREATE POLICY "자신의 커뮤니티 게시글 수정" ON community_posts FOR UPDATE
  USING (auth.uid() = author_id);

-- comments 정책
CREATE POLICY "댓글 공개 조회" ON comments FOR SELECT USING (TRUE);
CREATE POLICY "인증된 사용자 댓글 작성" ON comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = author_id);

-- enrollments 정책
CREATE POLICY "자신의 수강 정보 조회" ON enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "수강 등록" ON enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "수강 진도 업데이트" ON enrollments FOR UPDATE USING (auth.uid() = user_id);

-- 유저 생성 시 프로필 자동 생성 함수
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 게시글 조회수 업데이트 함수
CREATE OR REPLACE FUNCTION increment_view_count(post_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts SET view_count = view_count + 1 WHERE id = post_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
