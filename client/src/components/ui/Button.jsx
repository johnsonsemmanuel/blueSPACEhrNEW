export default function Button({ children, variant = 'primary', className = '', size = 'md', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
    secondary: 'bg-gray-100 text-deep-600 hover:bg-gray-200 active:bg-gray-300',
    outline: 'border border-gray-200 bg-white text-deep-600 hover:bg-gray-50 active:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    ghost: 'text-deep-500 hover:bg-gray-100 active:bg-gray-200',
  }

  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 text-sm',
    lg: 'h-10 px-5 text-sm',
  }

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}
