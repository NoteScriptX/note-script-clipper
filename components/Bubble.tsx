type Props = {
  x: number
  y: number
  onClick: () => void
}

export function Bubble({ x, y, onClick }: Props) {
  return (
    <button
      className="group pointer-events-auto relative flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-sm text-white backdrop-blur transition-transform hover:scale-[1.14] active:scale-[1.08]"
      onClick={onClick}
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 2147483647
      }}
      type="button">
      <span aria-hidden>✏️</span>
      <span className="pointer-events-none absolute -top-9 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[11px] text-white group-hover:block">
        添加批注
      </span>
    </button>
  )
}
