-- =============================================
-- 강의 동영상 시스템 (003_videos)
-- videos + video_views + 포인트 연동
-- =============================================

-- 1. videos 테이블
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  uploader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  view_cost INTEGER NOT NULL DEFAULT 0,          -- 시청자가 지불할 포인트
  uploader_reward INTEGER NOT NULL DEFAULT 0,    -- 업로더가 받을 포인트 (시청당)
  view_count INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_videos_uploader_id ON videos(uploader_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at);

-- 2. video_views 테이블 (시청 기록, 중복 방지)
CREATE TABLE IF NOT EXISTS video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_viewer_id ON video_views(viewer_id);

-- 3. RLS 정책
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read published videos" ON videos;
CREATE POLICY "Anyone can read published videos" ON videos
  FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Auth users can upload videos" ON videos;
CREATE POLICY "Auth users can upload videos" ON videos
  FOR INSERT WITH CHECK (auth.uid() = uploader_id);

DROP POLICY IF EXISTS "Uploader can update own videos" ON videos;
CREATE POLICY "Uploader can update own videos" ON videos
  FOR UPDATE USING (auth.uid() = uploader_id);

DROP POLICY IF EXISTS "Admin can manage all videos" ON videos;
CREATE POLICY "Admin can manage all videos" ON videos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own views" ON video_views;
CREATE POLICY "Users can read own views" ON video_views
  FOR SELECT USING (auth.uid() = viewer_id);

DROP POLICY IF EXISTS "Users can insert own views" ON video_views;
CREATE POLICY "Users can insert own views" ON video_views
  FOR INSERT WITH CHECK (auth.uid() = viewer_id);

DROP POLICY IF EXISTS "Admin can read all video_views" ON video_views;
CREATE POLICY "Admin can read all video_views" ON video_views
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 4. 시청 처리 함수 (포인트 차감 + 업로더 보상 + 조회수 증가)
CREATE OR REPLACE FUNCTION record_video_view(
  p_video_id UUID,
  p_viewer_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_video RECORD;
  v_viewer_points INTEGER;
  v_already_viewed BOOLEAN;
BEGIN
  -- 이미 시청했는지 확인
  SELECT EXISTS (
    SELECT 1 FROM video_views WHERE video_id = p_video_id AND viewer_id = p_viewer_id
  ) INTO v_already_viewed;

  IF v_already_viewed THEN
    RETURN jsonb_build_object('success', true, 'already_viewed', true, 'points_deducted', false);
  END IF;

  -- 동영상 정보 조회
  SELECT * INTO v_video FROM videos WHERE id = p_video_id AND is_published = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'video_not_found');
  END IF;

  -- 본인 동영상이면 포인트 차감 없이 시청 가능
  IF v_video.uploader_id = p_viewer_id THEN
    INSERT INTO video_views (video_id, viewer_id) VALUES (p_video_id, p_viewer_id);
    UPDATE videos SET view_count = view_count + 1 WHERE id = p_video_id;
    RETURN jsonb_build_object('success', true, 'already_viewed', false, 'points_deducted', false, 'own_video', true);
  END IF;

  -- 포인트 필요 시 잔액 확인
  IF v_video.view_cost > 0 THEN
    SELECT points INTO v_viewer_points FROM profiles WHERE id = p_viewer_id;
    IF v_viewer_points < v_video.view_cost THEN
      RETURN jsonb_build_object('success', false, 'error', 'insufficient_points', 'required', v_video.view_cost, 'current', v_viewer_points);
    END IF;

    -- 시청자 포인트 차감
    PERFORM award_points(p_viewer_id, -v_video.view_cost, '강의 시청', 'video', p_video_id);

    -- 업로더 포인트 보상
    IF v_video.uploader_reward > 0 THEN
      PERFORM award_points(v_video.uploader_id, v_video.uploader_reward, '강의 시청 수익', 'video', p_video_id);
    END IF;
  END IF;

  -- 시청 기록 추가 + 조회수 증가
  INSERT INTO video_views (video_id, viewer_id) VALUES (p_video_id, p_viewer_id);
  UPDATE videos SET view_count = view_count + 1 WHERE id = p_video_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_viewed', false,
    'points_deducted', v_video.view_cost > 0,
    'cost', v_video.view_cost
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
