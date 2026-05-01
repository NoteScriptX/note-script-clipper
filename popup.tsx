import { useState } from "react"

import "~style.css"

function IndexPopup() {
  const [data, setData] = useState("")

  return (
    <div className="w-80 space-y-3 p-4 text-sm text-slate-900">
      <h2 className="text-base font-semibold leading-6">
        欢迎使用 <span className="font-bold">Note Script</span>！
      </h2>
      <input
        className="w-full rounded border border-slate-200 px-2 py-1 outline-none focus:border-slate-400"
        onChange={(e) => setData(e.target.value)}
        value={data}
      />
      <div className="flex items-center justify-between">
        <a
          className="text-sky-700 underline underline-offset-2"
          href="https://www.plasmo.com"
          rel="noreferrer"
          target="_blank">
          Plasmo
        </a>
        <a
          className="text-sky-700 underline underline-offset-2"
          href="https://docs.plasmo.com"
          rel="noreferrer"
          target="_blank">
          View Docs
        </a>
      </div>
    </div>
  )
}

export default IndexPopup
