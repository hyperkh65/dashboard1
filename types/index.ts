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
  created_at: string
  updated_at: string
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
  category: 'general' | 'question' | 'showcase' | 'news' | 'discussion'
  is_pinned: boolean
  view_count: number
  like_count: number
  comment_count: number
  is_published: boolean
  created_at: string
  updated_at: string
  // Joined
  author?: Profile
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
