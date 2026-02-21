import { Grade, GRADE_INFO } from '@/types'

interface GradeBadgeProps {
  grade: Grade
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export default function GradeBadge({ grade, size = 'sm', showLabel = true }: GradeBadgeProps) {
  const info = GRADE_INFO[grade] || GRADE_INFO['씨앗']

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  const emojiSize = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${info.bg} ${info.color} ${sizeClasses[size]}`}
      title={info.desc}
    >
      <span className={emojiSize[size]}>{info.emoji}</span>
      {showLabel && <span>{info.label}</span>}
    </span>
  )
}
