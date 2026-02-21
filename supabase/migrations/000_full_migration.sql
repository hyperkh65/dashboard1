-- =============================================
-- AI 인사이트 카페 - 전체 마이그레이션 (001 + 002 통합)
-- Supabase SQL Editor에서 한 번에 실행하세요
-- =============================================

-- ==================== 001: 카페 기본 기능 ====================

-- 1. profiles 테이블에 카페 관련 컬럼 추가
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS grade TEXT NOT NULL DEFAULT '씨앗',
  ADD COLUMN IF NOT EXISTS post_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visit_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_visited_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS grade_updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS cafe_joined_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '6 months'),
  ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_points INTEGER NOT NULL DEFAULT 0;

-- 2. 게시판(boards) 테이블 생성
CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'MessageSquare',
  order_index INTEGER DEFAULT 0,
  read_permission TEXT NOT NULL DEFAULT 'all',
  write_permission TEXT NOT NULL DEFAULT 'member',
  comment_permission TEXT NOT NULL DEFAULT 'member',
  min_points INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 게시판 삽입
INSERT INTO boards (name, slug, description, color, icon, order_index, read_permission, write_permission, comment_permission, min_points) VALUES
  ('공지사항',        'notice',   '운영진 공지사항',                           '#ef4444', 'Bell',         0, 'all',    'staff',  'member', 0),
  ('가입인사',        'intro',    '카페에 오신 것을 환영합니다! 인사 나눠요',   '#10b981', 'Hand',         1, 'all',    'member', 'member', 0),
  ('자유게시판',      'general',  'AI 관련 자유롭게 이야기해요',               '#6366f1', 'MessageSquare',2, 'all',    'member', 'member', 0),
  ('질문답변',        'question', 'AI 사용에 대해 질문해보세요',               '#3b82f6', 'HelpCircle',   3, 'all',    'member', 'member', 0),
  ('AI 인사이트 공유','showcase', '발견한 AI 활용 팁과 인사이트를 공유해요',   '#8b5cf6', 'Sparkles',     4, 'all',    'member', 'member', 0),
  ('스터디 모집',     'study',    '함께 공부할 스터디 멤버를 모집해요',        '#10b981', 'BookOpen',     5, 'member', 'member', 'member', 0),
  ('VIP 라운지',      'vip',      '잎새 이상 + 100P 이상만의 프리미엄 공간',  '#f59e0b', 'Crown',        6, '잎새',   '열매',   '잎새',   100)
ON CONFLICT (slug) DO UPDATE SET
  comment_permission = EXCLUDED.comment_permission,
  min_points = EXCLUDED.min_points,
  order_index = EXCLUDED.order_index;

-- 3. community_posts 테이블 확장
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES boards(id),
  ADD COLUMN IF NOT EXISTS board_slug TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

UPDATE community_posts SET board_slug = 'general' WHERE board_slug IS NULL;

-- 4. 포인트 로그 테이블
CREATE TABLE IF NOT EXISTS point_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ref_type TEXT,
  ref_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_point_logs_user_id ON point_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_point_logs_created_at ON point_logs(created_at);

-- ==================== 함수 정의 ====================

-- 5. 등급 자동 계산 함수
CREATE OR REPLACE FUNCTION calculate_grade(
  p_post_count INTEGER,
  p_comment_count INTEGER,
  p_joined_days INTEGER
) RETURNS TEXT AS $$
BEGIN
  IF p_joined_days >= 180 AND (p_post_count + p_comment_count) >= 100 THEN RETURN '열매';
  ELSIF p_joined_days >= 90 AND (p_post_count + p_comment_count) >= 30 THEN RETURN '나무';
  ELSIF p_joined_days >= 30 AND (p_post_count + p_comment_count) >= 10 THEN RETURN '잎새';
  ELSIF p_joined_days >= 7 OR (p_post_count + p_comment_count) >= 5 THEN RETURN '새싹';
  ELSE RETURN '씨앗';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. 포인트 지급 함수 (트리거 함수보다 먼저 선언)
CREATE OR REPLACE FUNCTION award_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_ref_type TEXT DEFAULT NULL,
  p_ref_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO point_logs (user_id, points, reason, ref_type, ref_id)
  VALUES (p_user_id, p_points, p_reason, p_ref_type, p_ref_id);

  UPDATE profiles
  SET
    points = GREATEST(0, points + p_points),
    total_points = CASE WHEN p_points > 0 THEN total_points + p_points ELSE total_points END
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 7. 게시글 카운트 + 포인트 + 등급 트리거 함수
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
    UPDATE profiles SET post_count = post_count + 1 WHERE id = NEW.author_id;
    PERFORM award_points(NEW.author_id, 10, '게시글 작성', 'post', NEW.id);
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET post_count = GREATEST(0, post_count - 1) WHERE id = OLD.author_id;
    PERFORM award_points(OLD.author_id, -10, '게시글 삭제', 'post', OLD.id);
  END IF;

  SELECT EXTRACT(DAY FROM NOW() - cafe_joined_at)::INTEGER, post_count, comment_count, grade
  INTO v_joined_days, v_post_count, v_comment_count, v_current_grade
  FROM profiles WHERE id = COALESCE(NEW.author_id, OLD.author_id);

  IF v_current_grade != 'staff' THEN
    v_new_grade := calculate_grade(v_post_count, v_comment_count, v_joined_days);
    UPDATE profiles SET grade = v_new_grade, grade_updated_at = NOW()
    WHERE id = COALESCE(NEW.author_id, OLD.author_id) AND grade != 'staff';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 8. 댓글 카운트 + 포인트 + 등급 트리거 함수
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
    UPDATE profiles SET comment_count = comment_count + 1 WHERE id = NEW.author_id;
    PERFORM award_points(NEW.author_id, 5, '댓글 작성', 'comment', NEW.id);
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.author_id;
    PERFORM award_points(OLD.author_id, -5, '댓글 삭제', 'comment', OLD.id);
  END IF;

  SELECT EXTRACT(DAY FROM NOW() - cafe_joined_at)::INTEGER, post_count, comment_count, grade
  INTO v_joined_days, v_post_count, v_comment_count, v_current_grade
  FROM profiles WHERE id = COALESCE(NEW.author_id, OLD.author_id);

  IF v_current_grade != 'staff' THEN
    v_new_grade := calculate_grade(v_post_count, v_comment_count, v_joined_days);
    UPDATE profiles SET grade = v_new_grade, grade_updated_at = NOW()
    WHERE id = COALESCE(NEW.author_id, OLD.author_id) AND grade != 'staff';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 9. 좋아요 포인트 트리거 함수
CREATE OR REPLACE FUNCTION handle_post_like()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.like_count > OLD.like_count THEN
    PERFORM award_points(NEW.author_id, 2, '좋아요 받음', 'post', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==================== 트리거 등록 ====================

DROP TRIGGER IF EXISTS trg_update_post_count ON community_posts;
CREATE TRIGGER trg_update_post_count
AFTER INSERT OR DELETE ON community_posts
FOR EACH ROW EXECUTE FUNCTION update_post_count_and_grade();

DROP TRIGGER IF EXISTS trg_update_comment_count ON comments;
CREATE TRIGGER trg_update_comment_count
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_comment_count_and_grade();

DROP TRIGGER IF EXISTS trg_post_like ON community_posts;
CREATE TRIGGER trg_post_like
AFTER UPDATE OF like_count ON community_posts
FOR EACH ROW EXECUTE FUNCTION handle_post_like();

-- ==================== 관리자 설정 ====================

CREATE OR REPLACE FUNCTION auto_set_admin_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = '2days.kr@gmail.com' THEN
    UPDATE profiles SET is_admin = true, grade = 'staff' WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_admin ON auth.users;
CREATE TRIGGER trg_auto_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION auto_set_admin_on_signup();

DO $$
DECLARE v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = '2days.kr@gmail.com' LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    UPDATE profiles SET is_admin = true, grade = 'staff' WHERE id = v_user_id;
  END IF;
END $$;

-- ==================== Storage ====================

INSERT INTO storage.buckets (id, name, public) VALUES ('community-media', 'community-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read" ON storage.objects;
CREATE POLICY "Public read" ON storage.objects FOR SELECT USING (bucket_id = 'community-media');

DROP POLICY IF EXISTS "Auth upload" ON storage.objects;
CREATE POLICY "Auth upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'community-media' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Owner delete" ON storage.objects;
CREATE POLICY "Owner delete" ON storage.objects FOR DELETE USING (bucket_id = 'community-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ==================== RLS 정책 ====================

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read active boards" ON boards;
CREATE POLICY "Anyone can read active boards" ON boards FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admin can manage boards" ON boards;
CREATE POLICY "Admin can manage boards" ON boards FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

ALTER TABLE point_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own logs" ON point_logs;
CREATE POLICY "Users can read own logs" ON point_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admin can read all logs" ON point_logs;
CREATE POLICY "Admin can read all logs" ON point_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ==================== 뷰 ====================

CREATE OR REPLACE VIEW grade_leaderboard AS
SELECT p.id, p.username, p.full_name, p.avatar_url, p.grade,
  p.post_count, p.comment_count, p.post_count + p.comment_count AS total_activity,
  p.cafe_joined_at, EXTRACT(DAY FROM NOW() - p.cafe_joined_at)::INTEGER AS joined_days
FROM profiles p ORDER BY total_activity DESC, p.cafe_joined_at ASC;

CREATE OR REPLACE VIEW point_ranking AS
SELECT p.id, p.username, p.full_name, p.avatar_url, p.grade,
  p.points, p.total_points, p.post_count, p.comment_count,
  RANK() OVER (ORDER BY p.total_points DESC) AS rank
FROM profiles p WHERE p.total_points > 0 ORDER BY p.total_points DESC;
