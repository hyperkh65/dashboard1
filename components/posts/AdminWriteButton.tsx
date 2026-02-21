'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PenLine } from 'lucide-react'

export default function AdminWriteButton() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.is_admin) setIsAdmin(true)
        })
    })
  }, [])

  if (!isAdmin) return null

  return (
    <Link
      href="/admin/posts/new"
      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
    >
      <PenLine className="w-4 h-4" />
      새 글 작성
    </Link>
  )
}
