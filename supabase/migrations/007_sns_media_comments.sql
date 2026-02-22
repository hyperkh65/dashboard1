-- =============================================
-- 007_sns_media_comments.sql
-- SNS 이미지 첨부 + 댓글 기능
-- =============================================

-- sns_post_templates에 comments 컬럼 추가
alter table sns_post_templates
  add column if not exists comments jsonb default '[]'::jsonb;

-- 인덱스 추가 (성능 최적화)
create index if not exists sns_post_templates_user_created
  on sns_post_templates(user_id, created_at desc);

comment on column sns_post_templates.media_urls is '첨부 이미지 URL 배열 (최대 10개)';
comment on column sns_post_templates.comments is '플랫폼별 댓글 [{"platform": "facebook", "text": "..."}]';

-- =============================================
-- Supabase Storage: sns-media 버킷 생성
-- =============================================

-- Storage 버킷 생성 (이미 있으면 무시)
insert into storage.buckets (id, name, public)
values ('sns-media', 'sns-media', true)
on conflict (id) do nothing;

-- Storage 정책: 인증된 사용자만 업로드 가능
create policy "Authenticated users can upload sns-media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'sns-media' and auth.uid()::text = (storage.foldername(name))[1]);

-- Storage 정책: 본인 파일만 삭제 가능
create policy "Users can delete own sns-media"
on storage.objects for delete
to authenticated
using (bucket_id = 'sns-media' and auth.uid()::text = (storage.foldername(name))[1]);

-- Storage 정책: 모든 사용자 읽기 가능 (public 버킷)
create policy "Public can read sns-media"
on storage.objects for select
to public
using (bucket_id = 'sns-media');
