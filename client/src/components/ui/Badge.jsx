export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
  }

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

export function statusBadge(status) {
  const map = {
    Approved: { variant: 'success', label: 'Approved' },
    Pending: { variant: 'warning', label: 'Pending' },
    Rejected: { variant: 'danger', label: 'Rejected' },
  }
  const s = map[status] || { variant: 'default', label: status }
  return <Badge variant={s.variant}>{s.label}</Badge>
}
