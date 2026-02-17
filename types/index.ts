// 등급 타입
export type Grade = '씨앗' | '새싹' | '잎새' | '나무' | '열매' | 'staff'

// 게시판 읽기/쓰기 권한 타입
export type BoardPermission = 'all' | 'member' | '씨앗' | '새싹' | '잎새' | '나무' | '열매' | 'staff'

export interface Profile {
  id: string
  username: string
  full_name: string
  avatar_url: string
  bio: string
  is_member: boolean
  membership_tier: 'free' | 'basic' | 'premium'
  membership_expires_at: string | null
  is_admin: boolean
  grade: Grade
  post_count: number
  comment_count: number
  visit_count: number
  points: number
  total_points: number
  last_visited_at: string | null
  grade_updated_at: string | null
  cafe_joined_at: string
  created_at: string
  updated_at: string
}

export interface Board {
  id: string
  name: string
  slug: string
  description: string | null
  color: string
  icon: string
  order_index: number
  read_permission: BoardPermission
  write_permission: BoardPermission
  comment_permission: BoardPermission
  min_points: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PointLog {
  id: string
  user_id: string
  points: number
  reason: string
  ref_type: string | null
  ref_id: string | null
  created_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string
  color: string
  created_at: string
}

export interface Post {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  cover_image: string
  category_id: string
  author_id: string
  is_published: boolean
  is_members_only: boolean
  view_count: number
  like_count: number
  tags: string[]
  source_url: string
  is_bot_generated: boolean
  notion_page_id: string | null
  published_at: string
  created_at: string
  updated_at: string
  // Joined
  category?: Category
  author?: Profile
}

export interface Course {
  id: string
  title: string
  slug: string
  description: string
  thumbnail: string
  instructor_id: string
  price: number
  is_free: boolean
  is_members_only: boolean
  is_published: boolean
  category: string
  level: 'beginner' | 'intermediate' | 'advanced'
  duration_minutes: number
  lesson_count: number
  enroll_count: number
  tags: string[]
  created_at: string
  updated_at: string
  // Joined
  instructor?: Profile
}

export interface Lesson {
  id: string
  course_id: string
  title: string
  content: string
  video_url: string
  duration_minutes: number
  order_index: number
  is_free_preview: boolean
  created_at: string
}

export interface CommunityPost {
  id: string
  title: string
  content: string
  author_id: string
  // 게시판 (boards 테이블 연동)
  board_id: string | null
  board_slug: string
  // 기존 카테고리 (하위호환)
  category: 'general' | 'question' | 'showcase' | 'news' | 'discussion'
  is_pinned: boolean
  view_count: number
  like_count: number
  comment_count: number
  is_published: boolean
  // 미디어 (이미지/동영상)
  media_urls: string[]
  thumbnail_url: string | null
  tags: string[]
  created_at: string
  updated_at: string
  // Joined
  author?: Profile
  board?: Board
}

export interface Comment {
  id: string
  post_id: string
  author_id: string
  content: string
  parent_id: string | null
  like_count: number
  created_at: string
  updated_at: string
  author?: Profile
}

export interface BotJob {
  id: string
  job_type: string
  status: 'pending' | 'running' | 'success' | 'failed'
  payload: Record<string, unknown>
  result: Record<string, unknown> | null
  error_message: string | null
  scheduled_at: string
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  message?: string
}

// 등급 정보
export const GRADE_INFO: Record<Grade, { label: string; emoji: string; color: string; bg: string; desc: string }> = {
  '씨앗': {
    label: '씨앗',
    emoji: '🌱',
    color: 'text-green-600',
    bg: 'bg-green-100 dark:bg-green-900/30',
    desc: '갓 가입한 새 멤버',
  },
  '새싹': {
    label: '새싹',
    emoji: '🌿',
    color: 'text-emerald-600',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    desc: '7일 이상 또는 활동 5회 이상',
  },
  '잎새': {
    label: '잎새',
    emoji: '🍃',
    color: 'text-teal-600',
    bg: 'bg-teal-100 dark:bg-teal-900/30',
    desc: '30일 이상 AND 활동 10회 이상',
  },
  '나무': {
    label: '나무',
    emoji: '🌳',
    color: 'text-cyan-600',
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    desc: '90일 이상 AND 활동 30회 이상',
  },
  '열매': {
    label: '열매',
    emoji: '🍎',
    color: 'text-orange-600',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    desc: '180일 이상 AND 활동 100회 이상',
  },
  'staff': {
    label: '스탭',
    emoji: '👑',
    color: 'text-yellow-600',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    desc: '운영진',
  },
}

export const GRADE_ORDER: Grade[] = ['씨앗', '새싹', '잎새', '나무', '열매', 'staff']

// 등급 비교 (a >= b 이면 true)
export function gradeGte(a: Grade, b: BoardPermission): boolean {
  if (b === 'all') return true
  if (b === 'member') return true
  if (b === 'staff') return a === 'staff'
  const aIdx = GRADE_ORDER.indexOf(a)
  const bIdx = GRADE_ORDER.indexOf(b as Grade)
  return aIdx >= bIdx
}

// 등급 업그레이드 조건
export const GRADE_REQUIREMENTS = [
  { grade: '씨앗' as Grade, minDays: 0, minActivity: 0 },
  { grade: '새싹' as Grade, minDays: 7, minActivity: 5 },
  { grade: '잎새' as Grade, minDays: 30, minActivity: 10 },
  { grade: '나무' as Grade, minDays: 90, minActivity: 30 },
  { grade: '열매' as Grade, minDays: 180, minActivity: 100 },
]

// 포인트 활동 정보
export const POINT_ACTIONS = [
  { action: '게시글 작성', points: 10, emoji: '✍️' },
  { action: '댓글 작성', points: 5, emoji: '💬' },
  { action: '좋아요 받음', points: 2, emoji: '❤️' },
  { action: '일일 로그인', points: 3, emoji: '📅' },
]
