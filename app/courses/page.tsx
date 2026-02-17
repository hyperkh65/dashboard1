import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BookOpen, Clock, Users, Star, Lock } from 'lucide-react'

export const revalidate = 60

export default async function CoursesPage() {
  const supabase = await createClient()

  const { data: courses } = await supabase
    .from('courses')
    .select('*, instructor:profiles(username, full_name, avatar_url)')
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  const levelColors = {
    beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    intermediate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  const levelLabels = { beginner: '입문', intermediate: '중급', advanced: '고급' }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-3">
          <BookOpen className="w-5 h-5" />
          <span className="font-medium">강의</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">AI 실전 강의</h1>
        <p className="text-gray-600 dark:text-gray-400">
          실무에 바로 적용할 수 있는 AI 도구 강의를 배워보세요
        </p>
      </div>

      {courses && courses.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.slug}`}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden card-hover block"
            >
              {course.thumbnail ? (
                <div className="aspect-video overflow-hidden">
                  <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                  <BookOpen className="w-12 h-12 text-purple-300" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${levelColors[course.level as keyof typeof levelColors]}`}>
                    {levelLabels[course.level as keyof typeof levelLabels]}
                  </span>
                  {course.is_members_only && (
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full">
                      <Lock className="w-3 h-3" /> 멤버 전용
                    </span>
                  )}
                  {course.is_free && !course.is_members_only && (
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full">
                      무료
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {course.title}
                </h3>
                {course.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                    {course.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {course.duration_minutes}분
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" /> {course.lesson_count}개 레슨
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {course.enroll_count}명 수강
                  </span>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  {course.instructor && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs">
                        {course.instructor.full_name?.[0] || 'I'}
                      </div>
                      <span>{course.instructor.full_name || course.instructor.username}</span>
                    </div>
                  )}
                  <span className="font-bold text-gray-900 dark:text-white">
                    {course.is_free ? '무료' : `${course.price.toLocaleString()}원`}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>강의를 준비 중입니다. 곧 업데이트됩니다!</p>
        </div>
      )}
    </div>
  )
}
