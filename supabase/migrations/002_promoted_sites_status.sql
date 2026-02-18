-- =============================================
-- 홍보 사이트 - 등급별 제출 + 관리자 승인 시스템
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- 1. 컬럼 추가
ALTER TABLE promoted_sites
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 기존 레코드는 approved로 설정
UPDATE promoted_sites SET status = 'approved' WHERE status IS NULL OR status = 'approved';

-- status 값 제약
ALTER TABLE promoted_sites
  DROP CONSTRAINT IF EXISTS promoted_sites_status_check;
ALTER TABLE promoted_sites
  ADD CONSTRAINT promoted_sites_status_check CHECK (status IN ('pending', 'approved', 'rejected'));

-- 2. 기존 RLS 정책 삭제
DROP POLICY IF EXISTS "promoted_sites_read" ON promoted_sites;
DROP POLICY IF EXISTS "promoted_sites_admin_all" ON promoted_sites;
DROP POLICY IF EXISTS "sites_read_approved" ON promoted_sites;
DROP POLICY IF EXISTS "sites_read_own" ON promoted_sites;
DROP POLICY IF EXISTS "sites_admin_all" ON promoted_sites;
DROP POLICY IF EXISTS "sites_insert_eligible" ON promoted_sites;
DROP POLICY IF EXISTS "sites_update_own_pending" ON promoted_sites;
DROP POLICY IF EXISTS "sites_delete_own_pending" ON promoted_sites;

-- 3. 새 RLS 정책

-- [읽기] 승인된 사이트: 모든 사람
CREATE POLICY "sites_read_approved" ON promoted_sites
  FOR SELECT USING (status = 'approved' AND is_active = TRUE);

-- [읽기] 내 제출물: 본인만
CREATE POLICY "sites_read_own" ON promoted_sites
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND submitted_by = auth.uid()
  );

-- [읽기] 관리자: 전체
CREATE POLICY "sites_read_admin" ON promoted_sites
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- [쓰기] 새싹 이상 등급: 제출 가능 (status = 'pending' 고정)
CREATE POLICY "sites_insert_eligible" ON promoted_sites
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND status = 'pending'
    AND submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND grade IN ('새싹', '잎새', '나무', '열매', 'staff')
    )
  );

-- [수정] 본인 제출 대기 중인 항목: 내용만 수정 가능 (status 변경 불가)
CREATE POLICY "sites_update_own_pending" ON promoted_sites
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND submitted_by = auth.uid()
    AND status = 'pending'
  ) WITH CHECK (
    status = 'pending'
  );

-- [삭제] 본인 대기 중인 항목: 직접 취소 가능
CREATE POLICY "sites_delete_own_pending" ON promoted_sites
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND submitted_by = auth.uid()
    AND status = 'pending'
  );

-- [관리자] 전체 CRUD
CREATE POLICY "sites_admin_all" ON promoted_sites
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- 4. 인덱스
CREATE INDEX IF NOT EXISTS idx_promoted_sites_status ON promoted_sites(status);
CREATE INDEX IF NOT EXISTS idx_promoted_sites_submitted_by ON promoted_sites(submitted_by);

-- =============================================
-- 등급별 제출 권한 요약
-- 씨앗  → 제출 불가
-- 새싹  → 제출 가능 (관리자 승인 필요)
-- 잎새  → 제출 가능
-- 나무  → 제출 가능
-- 열매  → 제출 가능
-- staff → 제출 가능
-- 관리자 → 제출 + 승인/거절/수정/삭제 모두 가능
-- =============================================
