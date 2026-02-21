-- =============================================
-- 포인트 시스템 + 게시판 강화 마이그레이션
-- =============================================

-- 1. profiles에 포인트 컬럼 추가
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_points INTEGER NOT NULL DEFAULT 0;

-- 2. 포인트 로그 테이블
CREATE TABLE IF NOT EXISTS point_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ref_type TEXT, -- 'post', 'comment', 'like', 'login', 'bonus'
  ref_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_point_logs_user_id ON point_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_point_logs_created_at ON point_logs(created_at);

-- 3. boards 테이블에 포인트 조건 컬럼 추가
ALTER TABLE boards
  ADD COLUMN IF NOT EXISTS min_points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_permission TEXT NOT NULL DEFAULT 'member';

-- 4. 가입인사 게시판 추가 + 기존 게시판 업데이트
INSERT INTO boards (name, slug, description, color, icon, order_index, read_permission, write_permission, comment_permission, min_points) VALUES
  ('가입인사', 'intro', '카페에 오신 것을 환영합니다! 가입 인사를 나눠보세요', '#10b981', 'HandMetal', 1, 'all', 'member', 'member', 0)
ON CONFLICT (slug) DO NOTHING;

-- 기존 게시판 순서 재정렬
UPDATE boards SET order_index = 0 WHERE slug = 'notice';
UPDATE boards SET order_index = 1 WHERE slug = 'intro';
UPDATE boards SET order_index = 2 WHERE slug = 'general';
UPDATE boards SET order_index = 3 WHERE slug = 'question';
UPDATE boards SET order_index = 4 WHERE slug = 'showcase';
UPDATE boards SET order_index = 5 WHERE slug = 'study';
UPDATE boards SET order_index = 6, read_permission = '잎새', min_points = 100 WHERE slug = 'vip';

-- 5. 포인트 지급 함수
CREATE OR REPLACE FUNCTION award_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_ref_type TEXT DEFAULT NULL,
  p_ref_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- 포인트 로그 기록
  INSERT INTO point_logs (user_id, points, reason, ref_type, ref_id)
  VALUES (p_user_id, p_points, p_reason, p_ref_type, p_ref_id);

  -- 프로필 포인트 업데이트
  UPDATE profiles
  SET
    points = GREATEST(0, points + p_points),
    total_points = CASE WHEN p_points > 0 THEN total_points + p_points ELSE total_points END
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 6. 게시글 작성 시 포인트 지급 트리거 (기존 트리거에 포인트 추가)
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
    -- 게시글 작성 포인트 +10
    PERFORM award_points(NEW.author_id, 10, '게시글 작성', 'post', NEW.id);
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET post_count = GREATEST(0, post_count - 1) WHERE id = OLD.author_id;
    -- 게시글 삭제 시 포인트 회수 -10
    PERFORM award_points(OLD.author_id, -10, '게시글 삭제', 'post', OLD.id);
  END IF;

  SELECT
    EXTRACT(DAY FROM NOW() - cafe_joined_at)::INTEGER,
    post_count, comment_count, grade
  INTO v_joined_days, v_post_count, v_comment_count, v_current_grade
  FROM profiles WHERE id = COALESCE(NEW.author_id, OLD.author_id);

  IF v_current_grade != 'staff' THEN
    v_new_grade := calculate_grade(v_post_count, v_comment_count, v_joined_days);
    UPDATE profiles
    SET grade = v_new_grade, grade_updated_at = NOW()
    WHERE id = COALESCE(NEW.author_id, OLD.author_id) AND grade != 'staff';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 7. 댓글 작성 시 포인트 지급 트리거
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
    -- 댓글 작성 포인트 +5
    PERFORM award_points(NEW.author_id, 5, '댓글 작성', 'comment', NEW.id);
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.author_id;
    PERFORM award_points(OLD.author_id, -5, '댓글 삭제', 'comment', OLD.id);
  END IF;

  SELECT
    EXTRACT(DAY FROM NOW() - cafe_joined_at)::INTEGER,
    post_count, comment_count, grade
  INTO v_joined_days, v_post_count, v_comment_count, v_current_grade
  FROM profiles WHERE id = COALESCE(NEW.author_id, OLD.author_id);

  IF v_current_grade != 'staff' THEN
    v_new_grade := calculate_grade(v_post_count, v_comment_count, v_joined_days);
    UPDATE profiles
    SET grade = v_new_grade, grade_updated_at = NOW()
    WHERE id = COALESCE(NEW.author_id, OLD.author_id) AND grade != 'staff';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 8. 좋아요 받으면 포인트 +2 (게시글 작성자에게)
CREATE OR REPLACE FUNCTION handle_post_like()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.like_count > OLD.like_count THEN
    PERFORM award_points(NEW.author_id, 2, '좋아요 받음', 'post', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_post_like ON community_posts;
CREATE TRIGGER trg_post_like
AFTER UPDATE OF like_count ON community_posts
FOR EACH ROW EXECUTE FUNCTION handle_post_like();

-- 9. RLS for point_logs
ALTER TABLE point_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own logs" ON point_logs;
CREATE POLICY "Users can read own logs" ON point_logs
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admin can read all logs" ON point_logs;
CREATE POLICY "Admin can read all logs" ON point_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 10. 포인트 랭킹 뷰
CREATE OR REPLACE VIEW point_ranking AS
SELECT
  p.id, p.username, p.full_name, p.avatar_url, p.grade,
  p.points, p.total_points,
  p.post_count, p.comment_count,
  RANK() OVER (ORDER BY p.total_points DESC) AS rank
FROM profiles p
WHERE p.total_points > 0
ORDER BY p.total_points DESC;
