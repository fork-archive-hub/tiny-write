import {onCleanup, onMount, Show} from 'solid-js'
import {css} from 'solid-styled-components'
import {CanvasEditorElement, ElementType, useState} from '@/state'
import {CanvasEditor} from './Editor'
import {Scroll} from './Layout'
import Bounds from './Bounds'

export default ({element}: {element: CanvasEditorElement}) => {
  const [store, ctrl] = useState()
  let containerRef!: HTMLDivElement
  let editorRef!: HTMLDivElement

  const onSelect = () => {
    ctrl.canvas.select(element.id)
  }

  const onDoubleClick = () => {
    ctrl.canvas.select(element.id, true)
  }

  onMount(() => {
    ctrl.canvas.renderEditor(element, editorRef!)
  })

  onCleanup(() => {
    ctrl.canvas.destroyElement(element.id)
  })

  return (
    <>
      <Show when={!element.active}>
        <Bounds
          id={element.id}
          elementType={ElementType.Editor}
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          selected={element.selected}
          onSelect={onSelect}
          onDoubleClick={onDoubleClick}
        />
      </Show>
      <Scroll
        ref={containerRef}
        class={css`
          position: absolute;
          left: ${element.x.toString()}px;
          top: ${element.y.toString()}px;
          width: ${element.width.toString()}px;
          min-height: ${element.height.toString()}px;
          max-height: ${element.height.toString()}px;
          border-radius: 5px;
          z-index: 1;
          user-select: none;
          pointer-events: none;
          ${element.active ? `
            box-shadow: 0 0 0 3px var(--primary-background);
            user-select: auto;
            pointer-events: auto;
          ` : element.selected ? `
            box-shadow: 0 0 0 3px var(--border);
          ` : `
            box-shadow: 0 0 0 2px var(--border);
          `}
        `}
      >
        <CanvasEditor
          config={store.config}
          markdown={false}
          ref={editorRef}
        />
      </Scroll>
    </>
  )
}
