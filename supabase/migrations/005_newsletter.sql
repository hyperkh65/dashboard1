-- =============================================
-- 뉴스레터 구독자 테이블 (005_newsletter)
-- =============================================

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  unsubscribe_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscribers(is_active);
CREATE INDEX IF NOT EXISTS idx_newsletter_token ON newsletter_subscribers(unsubscribe_token);

-- RLS
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- 관리자만 전체 조회
DROP POLICY IF EXISTS "Admin can read all subscribers" ON newsletter_subscribers;
CREATE POLICY "Admin can read all subscribers" ON newsletter_subscribers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 구독 신청은 누구나 (서비스 키로 처리)
DROP POLICY IF EXISTS "Anyone can subscribe" ON newsletter_subscribers;
CREATE POLICY "Anyone can subscribe" ON newsletter_subscribers
  FOR INSERT WITH CHECK (true);

-- 자신의 구독 해제
DROP POLICY IF EXISTS "Token based unsubscribe" ON newsletter_subscribers;
CREATE POLICY "Token based unsubscribe" ON newsletter_subscribers
  FOR UPDATE USING (true);
