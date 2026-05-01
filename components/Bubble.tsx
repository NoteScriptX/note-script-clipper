type Props = {
  x: number
  y: number
  onClick: () => void
}

export function Bubble({ x, y, onClick }: Props) {
  return (
    <button
      className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-base text-slate-800 shadow hover:bg-slate-50 active:bg-slate-100"
      onClick={onClick}
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 2147483647
      }}
      type="button">
      ✏️
    </button>
  )
}

