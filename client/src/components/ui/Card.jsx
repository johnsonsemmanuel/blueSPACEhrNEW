export default function Card({ children, className = '', padding = true }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-100 shadow-sm ${padding ? 'p-5' : ''} ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`flex items-center justify-between border-b border-gray-100 pb-4 mb-4 ${className}`}>
      {children}
    </div>
  )
}
