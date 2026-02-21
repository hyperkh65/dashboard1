'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GRADE_VIDEO_MAX_COST, GRADE_INFO, Grade } from '@/types'
import type { Video, Profile } from '@/types'
import {
  Play, Upload, X, Eye, Star, Lock, Plus, Link as LinkIcon,
  Video as VideoIcon, BookOpen, Coins, ChevronRight, AlertCircle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import GradeBadge from '@/components/GradeBadge'

// ─── 동영상 URL 판별 헬퍼 ─────────────────────────────────────────────────
function getYouTubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/)
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1` : null
}
function getVimeoEmbed(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/)
  return m ? `https://player.vimeo.com/video/${m[1]}?autoplay=1` : null
}
function isDirectVideo(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url) || url.includes('/storage/v1/object/public/')
}
function getYouTubeThumbnail(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : null
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────
export default function CoursesPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)

  // 플레이어 모달
  const [activeVideo, setActiveVideo] = useState<Video | null>(null)
  const [watchError, setWatchError] = useState('')
  const [watching, setWatching] = useState(false)

  // 업로드 모달
  const [showUpload, setShowUpload] = useState(false)
  const [videoSource, setVideoSource] = useState<'url' | 'file'>('url')
  const [form, setForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    viewCost: 0,
    uploaderReward: 0,
  })
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setUserProfile(profile as Profile)
    }
    const res = await fetch('/api/videos')
    const data = await res.json()
    setVideos(data.videos || [])
    setLoading(false)
  }

  // ─── 동영상 시청 ──────────────────────────────────────────────────────
  async function handleWatch(video: Video) {
    setWatchError('')

    if (!userProfile) {
      setWatchError('로그인 후 시청할 수 있습니다.')
      return
    }

    setWatching(true)
    setActiveVideo(video)

    const res = await fetch(`/api/videos/${video.id}/watch`, { method: 'POST' })
    const data = await res.json()
    setWatching(false)

    if (!res.ok) {
      setWatchError(data.error || '시청 처리 중 오류가 발생했습니다.')
      setActiveVideo(null)
      return
    }

    // 포인트 차감 반영
    if (data.points_deducted && userProfile) {
      setUserProfile((prev) => prev ? { ...prev, points: prev.points - video.view_cost } : prev)
    }
    // 조회수 + 시청여부 갱신
    setVideos((prev) =>
      prev.map((v) =>
        v.id === video.id ? { ...v, view_count: v.view_count + 1, has_viewed: true } : v
      )
    )
  }

  // ─── 업로드 제출 ──────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    setSubmitting(true)

    try {
      let finalVideoUrl = form.videoUrl

      // 파일 업로드인 경우
      if (videoSource === 'file') {
        if (!fileToUpload) {
          setSubmitError('동영상 파일을 선택해주세요.')
          setSubmitting(false)
          return
        }
        const fd = new FormData()
        fd.append('file', fileToUpload)
        const upRes = await fetch('/api/upload', { method: 'POST', body: fd })
        const upData = await upRes.json()
        if (!upRes.ok) {
          setSubmitError(upData.error || '파일 업로드에 실패했습니다.')
          setSubmitting(false)
          return
        }
        finalVideoUrl = upData.url
      }

      const grade = userProfile?.grade as Grade
      const maxCost = GRADE_VIDEO_MAX_COST[grade] ?? 0

      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          video_url: finalVideoUrl,
          thumbnail_url: form.thumbnailUrl || getYouTubeThumbnail(finalVideoUrl) || null,
          view_cost: Math.min(form.viewCost, maxCost),
          uploader_reward: Math.min(form.uploaderReward, form.viewCost),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error || '등록에 실패했습니다.')
        setSubmitting(false)
        return
      }

      // 목록 갱신
      await loadData()
      setShowUpload(false)
      setForm({ title: '', description: '', videoUrl: '', thumbnailUrl: '', viewCost: 0, uploaderReward: 0 })
      setFileToUpload(null)
    } catch {
      setSubmitError('서버 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── 비디오 플레이어 렌더 ────────────────────────────────────────────
  function renderPlayer(url: string) {
    const yt = getYouTubeEmbed(url)
    if (yt) return <iframe src={yt} className="w-full h-full" allow="autoplay; fullscreen" allowFullScreen />
    const vm = getVimeoEmbed(url)
    if (vm) return <iframe src={vm} className="w-full h-full" allow="autoplay; fullscreen" allowFullScreen />
    if (isDirectVideo(url)) return <video src={url} controls autoPlay className="w-full h-full" />
    // 알 수 없는 URL도 iframe 시도
    return <iframe src={url} className="w-full h-full" allow="autoplay; fullscreen" allowFullScreen />
  }

  // ─── 썸네일 결정 ────────────────────────────────────────────────────
  function getThumbnail(video: Video): string | null {
    if (video.thumbnail_url) return video.thumbnail_url
    return getYouTubeThumbnail(video.video_url)
  }

  // ─── 등급별 최대 비용 ────────────────────────────────────────────────
  const grade = userProfile?.grade as Grade | undefined
  const maxCost = grade ? (GRADE_VIDEO_MAX_COST[grade] ?? 0) : 0
  const canSetCost = maxCost > 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* 헤더 */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
        <div>
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
            <VideoIcon className="w-5 h-5" />
            <span className="font-medium">강의</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">AI 실전 강의</h1>
          <p className="text-gray-600 dark:text-gray-400">
            동영상을 업로드하거나 URL을 등록해서 강의를 공유하세요
          </p>
        </div>
        <div className="flex items-center gap-3">
          {userProfile && (
            <div className="flex items-center gap-1.5 text-sm bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-700">
              <Star className="w-3.5 h-3.5" />
              <span className="font-semibold">{userProfile.points.toLocaleString()}P</span>
            </div>
          )}
          {userProfile && (
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              강의 등록
            </button>
          )}
        </div>
      </div>

      {/* 오류 메시지 */}
      {watchError && (
        <div className="mb-6 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl border border-red-200 dark:border-red-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-sm">{watchError}</span>
          <button onClick={() => setWatchError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* 동영상 목록 */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden">
              <div className="aspect-video bg-gray-200 dark:bg-gray-700" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-24 text-gray-500 dark:text-gray-400">
          <VideoIcon className="w-14 h-14 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium mb-1">등록된 강의가 없습니다</p>
          {userProfile ? (
            <button
              onClick={() => setShowUpload(true)}
              className="mt-4 text-indigo-600 hover:underline text-sm"
            >
              첫 강의를 등록해보세요 →
            </button>
          ) : (
            <p className="text-sm mt-2">로그인 후 강의를 등록할 수 있습니다</p>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => {
            const thumb = getThumbnail(video)
            const canWatch = !userProfile
              ? false
              : video.view_cost === 0 || video.has_viewed || video.uploader_id === userProfile.id || userProfile.points >= video.view_cost
            return (
              <div
                key={video.id}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => handleWatch(video)}
              >
                {/* 썸네일 */}
                <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30">
                  {thumb ? (
                    <img src={thumb} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <VideoIcon className="w-14 h-14 text-indigo-300 dark:text-indigo-700" />
                    </div>
                  )}
                  {/* 재생 오버레이 */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                      <Play className="w-6 h-6 text-indigo-600 ml-1" fill="currentColor" />
                    </div>
                  </div>
                  {/* 비용 뱃지 */}
                  {video.view_cost > 0 && (
                    <div className={`absolute top-2 right-2 flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${video.has_viewed ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'}`}>
                      {video.has_viewed ? '✓ 시청완료' : (
                        <><Coins className="w-3 h-3" />{video.view_cost}P</>
                      )}
                    </div>
                  )}
                  {video.view_cost === 0 && (
                    <div className="absolute top-2 right-2 text-xs font-bold px-2.5 py-1 rounded-full bg-green-500 text-white">
                      무료
                    </div>
                  )}
                  {/* 포인트 부족 잠금 */}
                  {!video.has_viewed && video.view_cost > 0 && userProfile && userProfile.points < video.view_cost && video.uploader_id !== userProfile.id && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-center text-white">
                        <Lock className="w-8 h-8 mx-auto mb-1 opacity-80" />
                        <p className="text-xs opacity-80">{video.view_cost}P 필요</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 내용 */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1.5 leading-snug">
                    {video.title}
                  </h3>
                  {video.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                      {video.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                    <div className="flex items-center gap-2">
                      {video.uploader && (
                        <>
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">
                            {(video.uploader.full_name || video.uploader.username)?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span>{video.uploader.full_name || video.uploader.username}</span>
                          {video.uploader.grade && <GradeBadge grade={video.uploader.grade as any} size="sm" />}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {video.view_count.toLocaleString()}
                    </div>
                  </div>
                  {video.uploader_reward > 0 && (
                    <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      시청당 업로더 +{video.uploader_reward}P 수익
                    </div>
                  )}
                  <div className="mt-1.5 text-[11px] text-gray-400">
                    {formatDistanceToNow(new Date(video.created_at), { addSuffix: true, locale: ko })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── 비디오 플레이어 모달 ──────────────────────────────────────── */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setActiveVideo(null) }}
        >
          <div className="w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl">
            {/* 플레이어 */}
            <div className="aspect-video relative">
              {watching ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                  <div className="text-white text-center">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm opacity-70">로딩 중...</p>
                  </div>
                </div>
              ) : (
                renderPlayer(activeVideo.video_url)
              )}
              <button
                onClick={() => setActiveVideo(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* 정보 */}
            <div className="bg-gray-900 p-4 text-white">
              <h2 className="font-bold text-lg mb-1">{activeVideo.title}</h2>
              {activeVideo.description && (
                <p className="text-gray-400 text-sm line-clamp-2">{activeVideo.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                {activeVideo.uploader && (
                  <span>{activeVideo.uploader.full_name || activeVideo.uploader.username}</span>
                )}
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{activeVideo.view_count.toLocaleString()}회</span>
                {activeVideo.view_cost > 0 && (
                  <span className="text-amber-400 flex items-center gap-1"><Coins className="w-3 h-3" />{activeVideo.view_cost}P 차감됨</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 업로드 모달 ───────────────────────────────────────────────── */}
      {showUpload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowUpload(false) }}
        >
          <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-500" /> 강의 등록
              </h2>
              <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* 제목 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">제목 *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="강의 제목을 입력하세요"
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 내용 요약 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">강의 내용 요약</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="강의 내용을 간략히 설명해주세요"
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* 동영상 소스 탭 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">동영상 *</label>
                <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 mb-3">
                  <button
                    type="button"
                    onClick={() => setVideoSource('url')}
                    className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                      videoSource === 'url'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <LinkIcon className="w-4 h-4" /> URL 입력
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoSource('file')}
                    className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                      videoSource === 'file'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Upload className="w-4 h-4" /> 파일 업로드
                  </button>
                </div>

                {videoSource === 'url' ? (
                  <input
                    type="url"
                    value={form.videoUrl}
                    onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                    placeholder="YouTube, Vimeo 또는 직접 동영상 URL"
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <VideoIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    {fileToUpload ? (
                      <p className="text-sm text-indigo-600 font-medium">{fileToUpload.name}</p>
                    ) : (
                      <>
                        <p className="text-sm text-gray-500">MP4, WEBM, MOV (최대 50MB)</p>
                        <p className="text-xs text-gray-400 mt-1">클릭하여 파일 선택</p>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                    />
                  </div>
                )}
              </div>

              {/* 썸네일 URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  썸네일 URL <span className="text-gray-400 font-normal">(선택, YouTube는 자동 적용)</span>
                </label>
                <input
                  type="url"
                  value={form.thumbnailUrl}
                  onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 포인트 설정 */}
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
                  <Coins className="w-4 h-4" />
                  포인트 설정
                  <span className="ml-auto text-xs font-normal text-amber-600">
                    내 등급 {grade ? GRADE_INFO[grade]?.emoji : ''} 최대 {maxCost}P
                  </span>
                </div>

                {canSetCost ? (
                  <>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">시청 비용 (시청자가 지불)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={maxCost}
                          value={form.viewCost}
                          onChange={(e) => {
                            const v = Math.min(Number(e.target.value), maxCost)
                            setForm({ ...form, viewCost: v, uploaderReward: Math.min(form.uploaderReward, v) })
                          }}
                          className="w-24 border border-gray-300 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="text-sm text-gray-500">P (0 = 무료)</span>
                      </div>
                    </div>
                    {form.viewCost > 0 && (
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">내가 받을 수익 (시청당)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={form.viewCost}
                            value={form.uploaderReward}
                            onChange={(e) => setForm({ ...form, uploaderReward: Math.min(Number(e.target.value), form.viewCost) })}
                            className="w-24 border border-gray-300 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <span className="text-sm text-gray-500">P</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">잎새</span> 등급 이상부터 유료 강의를 등록할 수 있습니다. 지금은 무료로 등록됩니다.
                  </p>
                )}
              </div>

              {submitError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {submitError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />업로드 중...</>
                  ) : (
                    <><Upload className="w-4 h-4" />강의 등록</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
