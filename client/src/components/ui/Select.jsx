export default function Select({ label, error, options, placeholder, className = '', ...props }) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="form-label">{label}</label>
      )}
      <select
        className={`form-select ${error ? 'form-error' : ''} ${className}`}
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
