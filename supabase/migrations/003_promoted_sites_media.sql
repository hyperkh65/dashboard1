-- =============================================
-- 홍보 사이트 - 대표 이미지/동영상 지원
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- 1. thumbnail_url 컬럼 추가
--    logo_url: 작은 아이콘 (선택)
--    thumbnail_url: 카드 상단에 표시되는 대표 이미지 또는 동영상 (선택)
ALTER TABLE promoted_sites
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- =============================================
-- 변경 내용 요약
-- thumbnail_url: 사이트 카드에 표시할 대표 이미지/동영상 URL
--   - 이미지: jpg, png, gif, webp 등
--   - 동영상: mp4, webm 등
--   - 파일은 Supabase Storage community-media 버킷에 저장됨
-- =============================================
