-- =============================================
-- 홍보 사이트 테이블
-- Supabase SQL Editor에서 실행하세요
-- =============================================

CREATE TABLE IF NOT EXISTS promoted_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  category TEXT DEFAULT '일반',
  is_active BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE promoted_sites ENABLE ROW LEVEL SECURITY;

-- 읽기: 모든 사용자
CREATE POLICY "promoted_sites_read" ON promoted_sites
  FOR SELECT USING (is_active = TRUE);

-- 관리자 전체 권한 (서비스 롤키 사용 시 RLS 우회)
CREATE POLICY "promoted_sites_admin_all" ON promoted_sites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- 기본 데이터 예시
INSERT INTO promoted_sites (name, url, description, category, order_index) VALUES
  ('2days', 'https://site.2days.kr', '2days 공식 사이트', '파트너', 0)
ON CONFLICT DO NOTHING;
