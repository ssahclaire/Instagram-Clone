export default function AuthCard({ children, footer }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-8 md:bg-ig-bg">
      <div className="w-full max-w-[350px]">
        <div className="bg-white px-10 pb-6 pt-10 md:border md:border-ig-border">
          <h1 className="mb-8 text-center font-logo text-[52px] leading-none">Instagram</h1>
          {children}
        </div>
        {footer && <div className="mt-3 bg-white px-10 py-5 text-center text-sm md:border md:border-ig-border">{footer}</div>}
      </div>
    </div>
  )
}

export function Divider() {
  return (
    <div className="my-4 flex items-center gap-4 text-[13px] font-semibold text-ig-secondary">
      <span className="h-px flex-1 bg-ig-border" />
      또는
      <span className="h-px flex-1 bg-ig-border" />
    </div>
  )
}

/** Input with floating label like Instagram's login inputs. */
export function FloatingInput({ label, value, onChange, type = 'text', right, invalid, ...rest }) {
  return (
    <label className={`relative mb-1.5 flex items-center rounded-[3px] border bg-ig-bg ${invalid ? 'border-ig-red' : 'border-ig-border focus-within:border-neutral-400'}`}>
      <span
        className={`pointer-events-none absolute left-2 origin-left text-ig-secondary transition-all ${
          value ? 'top-[5px] text-[10px]' : 'top-1/2 -translate-y-1/2 text-xs'
        }`}
      >
        {label}
      </span>
      <input
        value={value}
        onChange={onChange}
        type={type}
        aria-label={label}
        className={`h-[38px] w-full bg-transparent px-2 text-xs outline-none ${value ? 'pt-3.5' : ''}`}
        {...rest}
      />
      {right}
    </label>
  )
}
