import React from 'react'
import Image from 'next/image'
import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg font-semibold',
    xl: 'w-24 h-24 text-2xl font-bold',
  }

  if (src && src.trim() !== '') {
    return (
      <div className={cn('relative rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0', sizeMap[size], className)}>
        <Image
          src={src}
          alt={name || 'Avatar'}
          fill
          sizes="(max-width: 768px) 100vw, 96px"
          className="object-cover"
          unoptimized
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 border border-white shadow-sm font-medium',
        sizeMap[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  )
}
