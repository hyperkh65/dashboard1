-- =============================================
-- posts 테이블에 미디어 URL 배열 컬럼 추가
-- =============================================

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';
