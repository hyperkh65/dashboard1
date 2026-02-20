'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyButton({
  text,
  label = '복사',
  dark = false,
}: {
  text: string
  label?: string
  dark?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg shrink-0 transition-colors ${
        dark
          ? copied
            ? 'bg-green-600 text-white'
            : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
          : copied
          ? 'bg-green-100 text-green-700 border border-green-200'
          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
      }`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? '복사됨!' : label}
    </button>
  )
}
