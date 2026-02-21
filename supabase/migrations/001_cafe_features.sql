-- =============================================
-- AI 인사이트 카페 기능 마이그레이션
-- =============================================

-- 1. profiles 테이블에 등급 관련 컬럼 추가
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS grade TEXT NOT NULL DEFAULT '씨앗',
  ADD COLUMN IF NOT EXISTS post_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visit_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_visited_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS grade_updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS cafe_joined_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '6 months');

-- 2. 게시판(boards) 테이블 생성
CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'MessageSquare',
  order_index INTEGER DEFAULT 0,
  -- 읽기 권한: all, member, 씨앗, 새싹, 잎새, 나무, 열매, staff
  read_permission TEXT NOT NULL DEFAULT 'all',
  -- 쓰기 권한: all, member, 씨앗, 새싹, 잎새, 나무, 열매, staff
  write_permission TEXT NOT NULL DEFAULT 'member',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 게시판 삽입
INSERT INTO boards (name, slug, description, color, icon, order_index, read_permission, write_permission) VALUES
  ('공지사항', 'notice', '운영진 공지사항', '#ef4444', 'Bell', 0, 'all', 'staff'),
  ('자유게시판', 'general', 'AI 관련 자유롭게 이야기해요', '#6366f1', 'MessageSquare', 1, 'all', 'member'),
  ('질문답변', 'question', 'AI 사용에 대해 질문해보세요', '#3b82f6', 'HelpCircle', 2, 'all', 'member'),
  ('AI 인사이트 공유', 'showcase', '발견한 AI 활용 팁과 인사이트를 공유해요', '#8b5cf6', 'Sparkles', 3, 'all', 'member'),
  ('스터디 모집', 'study', '함께 공부할 스터디 멤버를 모집해요', '#10b981', 'BookOpen', 4, 'member', 'member'),
  ('VIP 라운지', 'vip', '우수 멤버만의 프리미엄 공간', '#f59e0b', 'Crown', 5, '열매', '열매')
ON CONFLICT (slug) DO NOTHING;

-- 3. community_posts에 board_id, media_urls, tags 컬럼 추가
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES boards(id),
  ADD COLUMN IF NOT EXISTS board_slug TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 기존 posts의 board_slug를 category 값으로 설정
UPDATE community_posts SET board_slug = 'general' WHERE board_slug IS NULL;

-- 4. 등급 자동 계산 함수
CREATE OR REPLACE FUNCTION calculate_grade(
  p_post_count INTEGER,
  p_comment_count INTEGER,
  p_joined_days INTEGER
) RETURNS TEXT AS $$
BEGIN
  -- 스탭은 수동으로만 부여
  -- 열매: 180일+ AND 100+ 활동
  IF p_joined_days >= 180 AND (p_post_count + p_comment_count) >= 100 THEN
    RETURN '열매';
  -- 나무: 90일+ AND 30+ 활동
  ELSIF p_joined_days >= 90 AND (p_post_count + p_comment_count) >= 30 THEN
    RETURN '나무';
  -- 잎새: 30일+ AND 10+ 활동
  ELSIF p_joined_days >= 30 AND (p_post_count + p_comment_count) >= 10 THEN
    RETURN '잎새';
  -- 새싹: 7일+ OR 5+ 활동
  ELSIF p_joined_days >= 7 OR (p_post_count + p_comment_count) >= 5 THEN
    RETURN '새싹';
  -- 씨앗: 기본
  ELSE
    RETURN '씨앗';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. 게시글 작성시 post_count 증가 + 등급 업데이트 트리거
CREATE OR REPLACE FUNCTION update_post_count_and_grade()
RETURNS TRIGGER AS $$
DECLARE
  v_joined_days INTEGER;
  v_post_count INTEGER;
  v_comment_count INTEGER;
  v_new_grade TEXT;
  v_current_grade TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- post_count 증가
    UPDATE profiles
    SET post_count = post_count + 1
    WHERE id = NEW.author_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles
    SET post_count = GREATEST(0, post_count - 1)
    WHERE id = OLD.author_id;
  END IF;

  -- 등급 재계산 (스탭 제외)
  SELECT
    EXTRACT(DAY FROM NOW() - cafe_joined_at)::INTEGER,
    post_count,
    comment_count,
    grade
  INTO v_joined_days, v_post_count, v_comment_count, v_current_grade
  FROM profiles
  WHERE id = COALESCE(NEW.author_id, OLD.author_id);

  IF v_current_grade != 'staff' THEN
    v_new_grade := calculate_grade(v_post_count, v_comment_count, v_joined_days);
    UPDATE profiles
    SET grade = v_new_grade, grade_updated_at = NOW()
    WHERE id = COALESCE(NEW.author_id, OLD.author_id)
      AND grade != 'staff';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_post_count ON community_posts;
CREATE TRIGGER trg_update_post_count
AFTER INSERT OR DELETE ON community_posts
FOR EACH ROW EXECUTE FUNCTION update_post_count_and_grade();

-- 6. 댓글 작성시 comment_count 증가 + 등급 업데이트 트리거
CREATE OR REPLACE FUNCTION update_comment_count_and_grade()
RETURNS TRIGGER AS $$
DECLARE
  v_joined_days INTEGER;
  v_post_count INTEGER;
  v_comment_count INTEGER;
  v_new_grade TEXT;
  v_current_grade TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles
    SET comment_count = comment_count + 1
    WHERE id = NEW.author_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles
    SET comment_count = GREATEST(0, comment_count - 1)
    WHERE id = OLD.author_id;
  END IF;

  SELECT
    EXTRACT(DAY FROM NOW() - cafe_joined_at)::INTEGER,
    post_count,
    comment_count,
    grade
  INTO v_joined_days, v_post_count, v_comment_count, v_current_grade
  FROM profiles
  WHERE id = COALESCE(NEW.author_id, OLD.author_id);

  IF v_current_grade != 'staff' THEN
    v_new_grade := calculate_grade(v_post_count, v_comment_count, v_joined_days);
    UPDATE profiles
    SET grade = v_new_grade, grade_updated_at = NOW()
    WHERE id = COALESCE(NEW.author_id, OLD.author_id)
      AND grade != 'staff';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_comment_count ON comments;
CREATE TRIGGER trg_update_comment_count
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_comment_count_and_grade();

-- 7. Supabase Storage 버킷 생성 (RLS)
INSERT INTO storage.buckets (id, name, public) VALUES
  ('community-media', 'community-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage 정책: 인증된 사용자만 업로드 가능, 누구나 읽기 가능
DROP POLICY IF EXISTS "Public read" ON storage.objects;
CREATE POLICY "Public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'community-media');

DROP POLICY IF EXISTS "Auth upload" ON storage.objects;
CREATE POLICY "Auth upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'community-media' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Owner delete" ON storage.objects;
CREATE POLICY "Owner delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'community-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 8. 관리자 계정 설정 (이미 존재하는 경우 admin 권한 부여)
-- 관리자 이메일: 2days.kr@gmail.com
-- 이 계정이 회원가입하면 아래 함수가 자동으로 admin 설정
CREATE OR REPLACE FUNCTION auto_set_admin_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- 특정 이메일로 가입하면 자동으로 admin 설정
  IF NEW.email = '2days.kr@gmail.com' THEN
    UPDATE profiles
    SET is_admin = true, grade = 'staff'
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users에 트리거 (signup 시 자동 admin 설정)
DROP TRIGGER IF EXISTS trg_auto_admin ON auth.users;
CREATE TRIGGER trg_auto_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION auto_set_admin_on_signup();

-- 기존에 이미 가입된 경우 수동으로 admin 설정
-- (Supabase 대시보드의 SQL Editor에서 실행 또는 앱 시작 시 자동 처리)
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = '2days.kr@gmail.com' LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    UPDATE profiles SET is_admin = true, grade = 'staff' WHERE id = v_user_id;
  END IF;
END $$;

-- 9. RLS 정책 - boards 테이블
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read active boards" ON boards;
CREATE POLICY "Anyone can read active boards" ON boards
  FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admin can manage boards" ON boards;
CREATE POLICY "Admin can manage boards" ON boards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 10. 등급 표시용 뷰
CREATE OR REPLACE VIEW grade_leaderboard AS
SELECT
  p.id,
  p.username,
  p.full_name,
  p.avatar_url,
  p.grade,
  p.post_count,
  p.comment_count,
  p.post_count + p.comment_count AS total_activity,
  p.cafe_joined_at,
  EXTRACT(DAY FROM NOW() - p.cafe_joined_at)::INTEGER AS joined_days
FROM profiles p
ORDER BY total_activity DESC, p.cafe_joined_at ASC;
