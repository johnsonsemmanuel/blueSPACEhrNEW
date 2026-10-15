export default function Card({ children, className = '', padding = true, ...props }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-100 shadow-sm transition-all duration-200 ease-out-expo ${padding ? 'p-4' : ''} ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`flex items-center justify-between border-b border-gray-100 pb-3 mb-3 ${className}`}>
      {children}
    </div>
  )
}
