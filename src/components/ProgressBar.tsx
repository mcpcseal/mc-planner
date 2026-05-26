interface Props {
  value: number  // 0 ~ 1
  className?: string
}

export function ProgressBar({ value, className = '' }: Props) {
  const pct = Math.min(Math.max(value, 0), 1) * 100
  const color = pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-gray-500'

  return (
    <div className={`w-full h-2 bg-gray-700 rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
