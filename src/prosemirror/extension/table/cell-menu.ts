import {Plugin, PluginKey} from 'prosemirror-state'
import {Decoration, DecorationSet, EditorView} from 'prosemirror-view'
import {selectParentNode} from 'prosemirror-commands'
import {
  cellAround,
  nextCell,
  addColumnAfter,
  addColumnBefore,
  deleteColumn,
  deleteTable,
  CellSelection,
} from 'prosemirror-tables'
import {arrow, computePosition, flip, offset, shift} from '@floating-ui/dom'

const handleIcon =
  '<svg viewBox="0 0 10 10" height="14" width="14"><path d="M3 2a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2zm4-8a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2z"/></svg>'

const createMenu = (type: 'right' | 'left' | 'bottom' | 'top') => {
  const button = document.createElement('span')
  button.setAttribute('contenteditable', 'false')
  button.classList.add('table-menu-button', `table-menu-${type}`)
  button.innerHTML = handleIcon
  return button
}

const pluginKey = new PluginKey('column-ctrl')

const findBottomCell = (pos) => {
  if (pos.node().type.name !== 'table_row') {
    return
  }

  let next = nextCell(pos, 'vert', 1)
  let prev = pos
  while (next != null) {
    prev = next
    next = nextCell(next, 'vert', 1)
  }

  return prev
}

class CellMenuView {
  private tooltip: HTMLElement
  private arrow: HTMLElement

  private onAddColumnBefore = () => {
    const pluginState = pluginKey.getState(this.view.state)
    const pos = this.view.state.doc.resolve(pluginState.currentCell)
    this.setCellSelection(pos)
    addColumnBefore(this.view.state, this.view.dispatch)
    setTimeout(() => this.view.focus())
    return true
  }

  private onAddColumnAfter = () => {
    const pluginState = pluginKey.getState(this.view.state)
    const pos = this.view.state.doc.resolve(pluginState.currentCell)
    this.setCellSelection(pos)
    addColumnAfter(this.view.state, this.view.dispatch)
    setTimeout(() => this.view.focus())
    return true
  }

  private onRemoveColumn = () => {
    const pluginState = pluginKey.getState(this.view.state)
    const pos = this.view.state.doc.resolve(pluginState.currentCell)
    const colCount = pos.node().childCount

    this.setCellSelection(pos)
    if (colCount === 1) {
      deleteTable(this.view.state, this.view.dispatch)
    } else {
      deleteColumn(this.view.state, this.view.dispatch)
    }

    setTimeout(() => this.view.focus())
    return true
  }

  constructor(private view: EditorView) {
    this.tooltip = document.createElement('div')
    this.tooltip.className = 'table-menu-tooltip'

    const addColumnBefore = document.createElement('div')
    addColumnBefore.textContent = 'Add column before'
    addColumnBefore.addEventListener('click', this.onAddColumnBefore)
    this.tooltip.appendChild(addColumnBefore)

    const addColumnAfter = document.createElement('div')
    addColumnAfter.textContent = 'Add column after'
    addColumnAfter.addEventListener('click', this.onAddColumnAfter)
    this.tooltip.appendChild(addColumnAfter)

    const removeColumn = document.createElement('div')
    removeColumn.textContent = 'Remove column'
    removeColumn.addEventListener('click', this.onRemoveColumn)
    this.tooltip.appendChild(removeColumn)

    this.arrow = document.createElement('span')
    this.arrow.className = 'arrow'
    this.tooltip.appendChild(this.arrow)

    view.dom.parentNode.appendChild(this.tooltip)
    this.update(view)
  }

  private onClose = (e) => {
    if (!e.target.closest('.table-menu-tooltip')) {
      const tr = this.view.state.tr
      tr.setMeta(pluginKey, {})
      this.view.dispatch(tr)
    }
  }

  update(view) {
    const pluginState = pluginKey.getState(view.state)
    if (!pluginState.virtualEl) {
      document.removeEventListener('mousedown', this.onClose)
      this.tooltip.style.display = 'none'
      return
    }

    if (this.tooltip.style.display === 'block') {
      return
    }

    this.tooltip.style.display = 'block'
    document.addEventListener('mousedown', this.onClose)

    computePosition(pluginState.virtualEl, this.tooltip, {
      placement: pluginState.virtualEl.direction,
      middleware: [
        offset(10),
        flip(),
        shift(),
        arrow({element: this.arrow}),
      ]
    }).then(({x, y, placement, middlewareData}) => {
      this.tooltip.style.left = `${x}px`
      this.tooltip.style.top = `${y}px`

      const [side] = placement.split('-')
      const staticSide = {
        top: 'bottom',
        right: 'left',
        bottom: 'top',
        left: 'right',
      }[side]

      if (middlewareData.arrow) {
        const {x, y} = middlewareData.arrow
        Object.assign(this.arrow.style, {
          left: x != null ? `${x}px` : '',
          top: y != null ? `${y}px` : '',
          [staticSide]: `${-this.arrow.offsetWidth / 2}px`
        });
      }
    })
  }

  setCellSelection(pos) {
    const tr = this.view.state.tr
    tr.setSelection(new CellSelection(pos))
    tr.setMeta(pluginKey, {})
    this.view.dispatch(tr)
  }
}

export const cellMenu = new Plugin({
  key: pluginKey,
  state: {
    init() {
      return {
        currentCell: undefined,
        virtualEl: undefined,
      }
    },
    apply(tr, prev) {
      const state = tr.getMeta(this)
      return state ?? prev
    }
  },
  view(editorView: EditorView) {
    return new CellMenuView(editorView)
  },
  props: {
    decorations(state) {
      const pluginState = pluginKey.getState(state)
      const decos = []
      const cell = pluginState.currentCell

      try {
        if (cell) {
          const resolved = state.doc.resolve(cell)
          const bottomCell = findBottomCell(resolved)
          if (bottomCell) {
            decos.push(Decoration.widget(bottomCell.pos + 1, createMenu('bottom')))
            decos.push(Decoration.widget(cell + 1, createMenu('right')))
            decos.push(Decoration.widget(cell + 1, createMenu('left')))
          }
        }
      } catch (e) {
        // nextCell throws errors if undo removes a column
      }

      return DecorationSet.create(state.doc, decos)
    },
    handleDOMEvents: {
      mousemove(view, event) {
        const target = event.target as HTMLElement
        const pluginState = pluginKey.getState(view.state)
        if (pluginState.virtualEl) {
          return false
        }

        if (pluginState.currentCell && !target.closest('table')) {
          const tr = view.state.tr
          tr.setMeta(pluginKey, {...pluginState, currentCell: undefined})
          view.dispatch(tr)
        }

        const pos = view.posAtCoords({left: event.x, top: event.y})
        if (!pos) return
        const resolved = view.state.doc.resolve(pos.pos)
        const cell = cellAround(resolved)
        if (!cell) return

        if (cell && pluginState.currentCell !== cell.pos) {
          const tr = view.state.tr
          tr.setMeta(pluginKey, {...pluginState, currentCell: cell.pos})
          view.dispatch(tr)
          return false
        }
      },
      mouseup: (view, event: MouseEvent) => {
        const target = event.target as Element

        if (target.classList.contains('table-menu-button')) {
          const pluginState = pluginKey.getState(view.state)
          const pos = view.state.doc.resolve(pluginState.currentCell)
          const tr = view.state.tr
          const box = (event.target as Element).getBoundingClientRect()
          const direction = target.classList.contains('table-menu-left') ? 'left'
            : target.classList.contains('table-menu-right') ? 'right'
            : target.classList.contains('table-menu-bottom') ? 'bottom' : 'left'
          const virtualEl = {
            getBoundingClientRect: () => box,
            direction,
          }

          tr.setSelection(new CellSelection(pos))
          tr.setMeta(pluginKey, {...pluginState, virtualEl})
          view.dispatch(tr)
          selectParentNode(view.state, view.dispatch)
          return true
        }
      }
    }
  }
})
