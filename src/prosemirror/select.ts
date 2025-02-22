import {Plugin, PluginKey, Selection, TextSelection} from 'prosemirror-state'
import {Decoration, DecorationSet, EditorView} from 'prosemirror-view'
import {ProseMirrorExtension} from '@/prosemirror'
import {isTauri} from '@/env'
import {Ctrl} from '@/services'

interface Coords {
  fromX: number;
  fromY: number;
  toX?: number;
  toY?: number;
}

interface Position {
  top: number;
  bottom: number;
  left: number;
  right: number;
  pos: number;
  nodeSize: number;
}

const resolvePos = (view: EditorView, pos: number) => {
  try {
    return view.state.doc.resolve(pos)
  } catch (err) {
    // ignore
  }
}

class SelectView {
  coords?: Coords
  positions: Position[] = []
  canvas?: HTMLCanvasElement

  constructor(private view: EditorView, private ctrl: Ctrl) {
    document.addEventListener('mousedown', this.onMouseDown)
  }

  destroy() {
    document.removeEventListener('mousedown', this.onMouseDown)
    document.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('mouseup', this.onMouseUp)
  }

  private select() {
    if (!this.coords?.toX || !this.coords?.toY) return
    const fromY = Math.min(this.coords.fromY, this.coords.toY)
    const toY = Math.max(this.coords.fromY, this.coords.toY)

    let min = -1
    let max = -1
    for (let i = 0; i < this.positions.length; i++) {
      const pos = this.positions[i]
      const nextPos = this.positions[i+1]
      const nextBottom = Math.max(pos.bottom, nextPos?.top ?? pos.bottom)

      if (
        (fromY < pos.top || fromY < nextBottom) &&
        (toY > pos.top || toY > nextBottom)
      ) {
        if (pos.pos < min || min === -1) min = pos.pos
        if (pos.pos + pos.nodeSize > max || max === -1) max = pos.pos + pos.nodeSize
      }
    }

    if (min === -1 || max === -1) {
      this.collapse(this.coords.fromX, this.coords.fromY)
      return
    }

    const from = resolvePos(this.view, min)
    const to = resolvePos(this.view, max)
    if (!from || !to) return
    const sel = TextSelection.between(from, to)
    const tr = this.view.state.tr
    tr.setSelection(sel)
    tr.setMeta(pluginKey, {from: from.pos, to: to.pos})
    if (!this.view.hasFocus()) this.view.focus()
    this.view.dispatch(tr)
  }

  private collapse(left: number, top: number) {
    const pos = this.view.posAtCoords({left, top})?.pos ?? 0
    const sel = Selection.near(this.view.state.doc.resolve(pos))
    const tr = this.view.state.tr
    tr.setSelection(sel)
    tr.setMeta(pluginKey, null)
    this.view.dispatch(tr)
    return
  }

  private onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return
    this.onMouseUp(e)

    const isInnerNodes =
      e.target !== this.view.dom &&
      e.target !== this.view.dom.parentNode &&
      e.target !== this.view.dom.parentNode?.parentNode

    const isTauriDragRegion =
      isTauri() &&
      (e.target as HTMLElement)?.dataset?.tauriDragRegion === 'true' &&
      !this.ctrl.app.fullscreen

    if (isInnerNodes || isTauriDragRegion) {
      return
    }

    document.addEventListener('mouseup', this.onMouseUp)
    document.addEventListener('mousemove', this.onMouseMove)
    e.preventDefault()
    e.stopPropagation()

    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.canvas.style.position = 'absolute'
    this.canvas.style.userSelect = 'none'
    this.canvas.style.left = '0'
    this.canvas.style.top = '0'
    this.canvas.style.zIndex = '100000'
    this.canvas.style.pointerEvents = 'none'
    document.body.appendChild(this.canvas)

    this.view.state.doc.forEach((node, offset) => {
      const coords = this.view.coordsAtPos(offset + 1)
      this.positions.push({
        ...coords,
        pos: offset,
        nodeSize: node.nodeSize,
      })
    })

    // Set focus to prosemirror if in code_block
    if (!this.view.hasFocus()) {
      this.collapse(e.pageX, e.pageY)
      this.view.focus()
    }

    this.coords = {fromX: e.pageX, fromY: e.pageY}
    document.body.appendChild(this.canvas)
  }

  private onMouseMove = (e: MouseEvent) => {
    if (!this.canvas || !this.coords) return
    e.preventDefault()
    e.stopPropagation()
    this.coords.toX = e.pageX
    this.coords.toY = e.pageY
    const context = this.canvas.getContext('2d')!
    context.clearRect(0, 0, this.canvas.width, this.canvas.height)

    context.beginPath();
    context.fillStyle = this.ctrl.config.theme.selection
    context.lineWidth = 2
    context.strokeStyle = this.ctrl.config.theme.primaryBackground
    context.roundRect(
      this.coords.fromX,
      this.coords.fromY,
      this.coords.toX - this.coords.fromX,
      this.coords.toY - this.coords.fromY,
      3
    )
    context.fill()
    context.stroke()
    this.select()
  }

  private onMouseUp = (e: MouseEvent) => {
    const selection = pluginKey.getState(this.view.state)
    if (selection && !this.coords) {
      this.collapse(e.pageX, e.pageY)
    }

    document.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('mouseup', this.onMouseUp)
    this.canvas?.remove()
    this.positions = []
    this.canvas = undefined
    this.coords = undefined
  }
}

const pluginKey = new PluginKey('select')

const select = (ctrl: Ctrl) => new Plugin({
  key: pluginKey,
  state: {
    init() {
      return null
    },
    apply(tr, prev) {
      const selection = tr.getMeta(pluginKey)
      return selection === undefined ? prev : selection
    }
  },
  props: {
    decorations(state) {
      const decos: Decoration[] = []
      const selection = pluginKey.getState(state)
      if (!selection) return
      if (selection.from === selection.to) {
        return DecorationSet.empty
      }

      try {
        state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          decos.push(Decoration.node(pos, pos + node.nodeSize, {
            class: 'selected',
          }))
        })
      } catch (e) {
        // ignore
      }

      return DecorationSet.create(state.doc, decos)
    }
  },
  view(editorView) {
    return new SelectView(editorView, ctrl)
  }
})

export default (ctrl: Ctrl): ProseMirrorExtension => ({
  plugins: (prev) => [
    ...prev,
    select(ctrl),
  ]
})
