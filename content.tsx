import cssText from "data-text:~style.css"
import type {
  PlasmoCSConfig,
  PlasmoGetShadowHostId,
  PlasmoGetStyle
} from "plasmo"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { AnnotationCard } from "~components/AnnotationCard"
import { Bubble } from "~components/Bubble"
import {
  createFingerprintFromSelection,
  getMergedClientRects,
  locateRangeFromFingerprint
} from "~utils/anchor"
import {
  CONTENT_OPEN_SIDEPANEL_WITH_ANNOTATION,
  sendToBackground,
  STORAGE_UPDATED
} from "~utils/messaging"
import {
  getAnnotationsByUrl,
  NSX_ANNOTATIONS_KEY,
  upsertAnnotation,
  type NsXAnnotation
} from "~utils/storage"

export const config: PlasmoCSConfig = {
  matches: ["http://*/*", "https://*/*"],
  all_frames: false
}

export const getShadowHostId: PlasmoGetShadowHostId = () => "nsx-clipper-csui"

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

type BubbleState =
  | {
      visible: false
    }
  | {
      visible: true
      x: number
      y: number
      selectionText: string
    }

type HighlightRect = {
  id: string
  rects: DOMRect[]
  status: "ok" | "maybe_lost"
}

type DraftAnnotation = {
  id: string
  url: string
  pageTitle: string
  createdAt: number
  selectedText: string
  anchor: NsXAnnotation["anchor"]
  locateStatus: "ok" | "maybe_lost"
}

type CardState =
  | { visible: false }
  | {
      visible: true
      x: number
      y: number
      arrowSide: "left" | "right"
      draft: DraftAnnotation
    }

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v))

const shouldIgnoreSelection = (selection: Selection): boolean => {
  const node = selection.anchorNode
  if (!node) return false
  const root = (node as any).getRootNode?.()
  if (root && root instanceof ShadowRoot) {
    const host = root.host as HTMLElement | null
    if (host?.id === "nsx-clipper-csui") return true
  }
  const el = (node as any).parentElement ?? null
  if (!el) return false
  return Boolean(
    (el as Element).closest(
      "input,textarea,select,option,pre,code,kbd,samp,script,style"
    )
  )
}

const getSelectionRect = (selection: Selection): DOMRect | null => {
  if (!selection.rangeCount) return null
  const r = selection.getRangeAt(0)
  const rect = r.getBoundingClientRect()
  if (rect.width > 0 && rect.height > 0) return rect
  const rects = Array.from(r.getClientRects())
  if (rects.length === 0) return null
  const left = Math.min(...rects.map((x) => x.left))
  const top = Math.min(...rects.map((x) => x.top))
  const right = Math.max(...rects.map((x) => x.right))
  const bottom = Math.max(...rects.map((x) => x.bottom))
  return new DOMRect(left, top, right - left, bottom - top)
}

const computeBubblePosition = (rect: DOMRect) => {
  const bubbleSize = 28
  const padding = 8
  const yMid = clamp(
    rect.top + rect.height / 2 - bubbleSize / 2,
    padding,
    window.innerHeight - bubbleSize - padding
  )

  const xRight = rect.right + padding
  if (xRight + bubbleSize + padding <= window.innerWidth) {
    return { x: xRight, y: yMid }
  }

  const xLeft = rect.left - padding - bubbleSize
  if (xLeft >= padding) {
    return { x: xLeft, y: yMid }
  }

  const xBelow = clamp(
    rect.left,
    padding,
    window.innerWidth - bubbleSize - padding
  )
  const yBelow = clamp(
    rect.bottom + padding,
    padding,
    window.innerHeight - bubbleSize - padding
  )
  return { x: xBelow, y: yBelow }
}

const computeCardPositionFromBubble = (bubble: {
  x: number
  y: number
}): { x: number; y: number; arrowSide: "left" | "right" } => {
  const bubbleSize = 28
  const cardWidth = 300
  const estimatedHeight = 360
  const padding = 12
  const preferRight = bubble.x + bubbleSize + 8
  const preferLeft = bubble.x - 8 - cardWidth
  const canRight = preferRight + cardWidth + padding <= window.innerWidth
  const canLeft = preferLeft >= padding
  const x = canRight
    ? preferRight
    : canLeft
      ? preferLeft
      : clamp(preferRight, padding, window.innerWidth - cardWidth - padding)

  const y = clamp(
    bubble.y - 20,
    padding,
    window.innerHeight - estimatedHeight - padding
  )

  return { x, y, arrowSide: canRight ? "left" : canLeft ? "right" : "left" }
}

const genId = () => {
  try {
    return crypto.randomUUID()
  } catch {
    return `a_${Date.now()}_${Math.random().toString(16).slice(2)}`
  }
}

export default function Content() {
  const [bubble, setBubble] = useState<BubbleState>({ visible: false })
  const [card, setCard] = useState<CardState>({ visible: false })
  const [highlights, setHighlights] = useState<HighlightRect[]>([])
  const [ephemeralRects, setEphemeralRects] = useState<DOMRect[]>([])
  const rafRef = useRef<number | null>(null)
  const ephemeralTimerRef = useRef<number | null>(null)
  const ephemeralRectsRef = useRef<DOMRect[]>([])

  const url = useMemo(() => window.location.href, [])

  const refreshHighlights = useCallback(async () => {
    try {
      const annotations = await getAnnotationsByUrl(url)
      const next: HighlightRect[] = []
      for (const a of annotations) {
        const located = locateRangeFromFingerprint({
          selectedText: a.selectedText,
          xpath: a.anchor.xpath,
          prefix: a.anchor.prefix,
          suffix: a.anchor.suffix,
          context: a.anchor.context
        })
        if (!located.range) {
          next.push({ id: a.id, rects: [], status: located.status })
          continue
        }
        next.push({
          id: a.id,
          rects: getMergedClientRects(located.range),
          status: located.status
        })
      }
      setHighlights(next)
    } catch {
      // ignore
    }
  }, [url])

  useEffect(() => {
    refreshHighlights()
  }, [card.visible, refreshHighlights])

  useEffect(() => {
    const listener = (message: any) => {
      if (message?.type !== STORAGE_UPDATED) return
      const p = message.payload
      if (p?.key !== NSX_ANNOTATIONS_KEY) return
      if (p.urls && !p.urls.includes(url)) return
      refreshHighlights()
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [refreshHighlights, url])

  useEffect(() => {
    const onMouseUp = () => {
      const selection = window.getSelection()
      if (!selection) return
      setCard({ visible: false })
      const selected = selection.toString().trim()
      if (!selected) {
        setBubble({ visible: false })
        return
      }
      if (shouldIgnoreSelection(selection)) {
        setBubble({ visible: false })
        return
      }
      const rect = getSelectionRect(selection)
      if (!rect) return
      const pos = computeBubblePosition(rect)
      setBubble({
        visible: true,
        x: pos.x,
        y: pos.y,
        selectionText: selected
      })
    }

    const onScrollOrResize = () => {
      setBubble({ visible: false })
      setCard({ visible: false })
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        refreshHighlights()
      })
    }

    const onMouseDown = (e: MouseEvent) => {
      const path = e.composedPath()
      if (
        path.some(
          (p) => p instanceof HTMLElement && p.id === "nsx-clipper-csui"
        )
      ) {
        return
      }
      if (ephemeralTimerRef.current != null) {
        window.clearTimeout(ephemeralTimerRef.current)
        ephemeralTimerRef.current = null
      }
      if (card.visible) {
        setEphemeralRects(ephemeralRectsRef.current)
        ephemeralTimerRef.current = window.setTimeout(() => {
          ephemeralRectsRef.current = []
          setEphemeralRects([])
          ephemeralTimerRef.current = null
        }, 2500)
      } else {
        ephemeralRectsRef.current = []
        setEphemeralRects([])
      }
      setBubble({ visible: false })
      setCard({ visible: false })
    }

    document.addEventListener("mouseup", onMouseUp, true)
    document.addEventListener("mousedown", onMouseDown, true)
    window.addEventListener("scroll", onScrollOrResize, true)
    window.addEventListener("resize", onScrollOrResize, true)

    return () => {
      document.removeEventListener("mouseup", onMouseUp, true)
      document.removeEventListener("mousedown", onMouseDown, true)
      window.removeEventListener("scroll", onScrollOrResize, true)
      window.removeEventListener("resize", onScrollOrResize, true)
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      if (ephemeralTimerRef.current != null) {
        window.clearTimeout(ephemeralTimerRef.current)
        ephemeralTimerRef.current = null
      }
    }
  }, [card.visible, refreshHighlights])

  const onBubbleClick = useCallback(async () => {
    const selection = window.getSelection()
    if (!selection) return
    if (!selection.rangeCount) return
    const fp = createFingerprintFromSelection(selection)
    if (!fp) return

    setBubble({ visible: false })
    const r = selection.getRangeAt(0)
    const rects = getMergedClientRects(r)
    ephemeralRectsRef.current = rects
    setEphemeralRects(rects)
    if (ephemeralTimerRef.current != null) {
      window.clearTimeout(ephemeralTimerRef.current)
      ephemeralTimerRef.current = null
    }
    const pos = bubble.visible
      ? computeCardPositionFromBubble({ x: bubble.x, y: bubble.y })
      : { x: 12, y: 12, arrowSide: "left" as const }
    const draft: DraftAnnotation = {
      id: genId(),
      url,
      pageTitle: document.title || "",
      createdAt: Date.now(),
      selectedText: fp.selectedText,
      anchor: {
        xpath: fp.xpath,
        prefix: fp.prefix,
        suffix: fp.suffix,
        context: fp.context
      },
      locateStatus: "ok"
    }

    selection.removeAllRanges()
    setCard({
      visible: true,
      x: pos.x,
      y: pos.y,
      arrowSide: pos.arrowSide,
      draft
    })
  }, [bubble, url])

  const saveDraft = useCallback(
    async (draft: DraftAnnotation, note: string) => {
      try {
        const annotation: NsXAnnotation = {
          id: draft.id,
          url: draft.url,
          pageTitle: draft.pageTitle,
          createdAt: draft.createdAt,
          selectedText: draft.selectedText,
          note,
          anchor: draft.anchor,
          locateStatus: draft.locateStatus
        }
        await upsertAnnotation(annotation)
        await refreshHighlights()
      } catch {
        // ignore
      }
    },
    [refreshHighlights]
  )

  return (
    <div className="pointer-events-none">
      <div
        className="pointer-events-none"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2147483646
        }}>
        {highlights.flatMap((h) =>
          h.rects.map((r, idx) => (
            <mark
              key={`${h.id}_${idx}`}
              className="pointer-events-none rounded bg-yellow-300/60"
              style={{
                position: "fixed",
                left: r.left,
                top: r.top,
                width: r.width,
                height: r.height
              }}
            />
          ))
        )}
        {ephemeralRects.map((r, idx) => (
          <mark
            key={`ephemeral_${idx}`}
            className="pointer-events-none rounded bg-indigo-200/60"
            style={{
              position: "fixed",
              left: r.left,
              top: r.top,
              width: r.width,
              height: r.height
            }}
          />
        ))}
      </div>

      {bubble.visible ? (
        <Bubble x={bubble.x} y={bubble.y} onClick={onBubbleClick} />
      ) : null}

      {card.visible ? (
        <AnnotationCard
          initialNote=""
          onClose={() => setCard({ visible: false })}
          onCreateTask={async (note) => {
            const draft = card.draft
            await saveDraft(draft, note)
            try {
              await sendToBackground({
                type: CONTENT_OPEN_SIDEPANEL_WITH_ANNOTATION,
                payload: {
                  annotationId: draft.id,
                  url: draft.url,
                  selectedText: draft.selectedText
                }
              })
            } catch {
              // ignore
            }
          }}
          onSave={async (note) => {
            const draft = card.draft
            await saveDraft(draft, note)
          }}
          arrowSide={card.arrowSide}
          pageTitle={card.draft.pageTitle}
          selectedText={card.draft.selectedText}
          x={card.x}
          y={card.y}
        />
      ) : null}
    </div>
  )
}