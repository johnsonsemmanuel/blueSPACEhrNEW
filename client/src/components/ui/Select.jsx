export default function Select({ label, error, options, placeholder, className = '', ...props }) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-xs font-semibold text-deep-500 uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        className={`flex h-9 w-full rounded-md border bg-white px-3 py-2 text-base text-deep-600 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
          error ? 'border-red-400' : 'border-gray-200'
        } ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
