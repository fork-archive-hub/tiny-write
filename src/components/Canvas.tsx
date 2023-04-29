import {useState} from '@/state'
import {Gesture} from '@use-gesture/vanilla'
import {For, onCleanup, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import CanvasGrid from './CanvasGrid'
import CanvasEditor from './CanvasEditor'
import {Vec} from '@tldraw/vec'

const Container = styled('div')`
  width: 100%;
  height: 100%;
  touch-action: none;
  overflow: hidden;
  position: relative;
`

const Board = styled('div')`
  position: absolute;
  top: 0;
  left: 0;
  contain: layout style size;
  width: 1px;
  height: 1px;
`

export default () => {
  const [, ctrl] = useState()
  const scaleBounds = {min: 0.5, max: 10}
  let ref!: HTMLDivElement

  const zoomTo = (next: number, center?: number[]) => {
    if (!ctrl.canvas.currentCanvas?.camera) return

    if (center === undefined) {
      const {width, height} = ref.getBoundingClientRect()
      center = Vec.toFixed([width / 2, height / 2])
    }

    const {zoom, point} = ctrl.canvas.currentCanvas.camera
    const p0 = Vec.sub(Vec.div(center, zoom), point)
    const p1 = Vec.sub(Vec.div(center, next), point)
    const [x, y] = Vec.toFixed(Vec.add(point, Vec.sub(p1, p0)))
    ctrl.canvas.updateCamera({zoom: next, point: [x, y]})
  }

  onMount(() => {
    const preventGesture = (e: TouchEvent) => e.preventDefault()
    // @ts-ignore
    document.addEventListener('gesturestart', preventGesture)
    // @ts-ignore
    document.addEventListener('gesturechange', preventGesture)
    // @ts-ignore
    document.addEventListener('gestureend', preventGesture)

    const gesture = new Gesture(ref, {
      onPinch: ({origin: [ox, oy], offset: [s]}) => {
        zoomTo(s, [ox, oy])
      },
      onWheel: ({event, pinching, offset: [x, y]}) => {
        if (pinching) return false
        event.preventDefault()
        ctrl.canvas.updateCameraPoint([-x, -y])
      },
    }, {
      target: ref,
      eventOptions: {passive: false},
      wheel: {
        from: () => [
          -(ctrl.canvas.currentCanvas?.camera.point[0] ?? 0),
          -(ctrl.canvas.currentCanvas?.camera.point[1] ?? 0),
        ],
      },
      pinch: {
        scaleBounds,
        from: () => [(ctrl.canvas.currentCanvas!.camera.zoom ?? 0), 0]
      },
    })

    onCleanup(() => {
      gesture.destroy()
      // @ts-ignore
      document.removeEventListener('gesturestart', preventGesture)
      // @ts-ignore
      document.removeEventListener('gesturechange', preventGesture)
      // @ts-ignore
      document.removeEventListener('gestureend', preventGesture)
    })
  })

  return (
    <Container ref={ref}>
      <CanvasGrid />
      <Board style={{
        transform: `
          scale(${ctrl.canvas.currentCanvas?.camera.zoom})
          translateX(${ctrl.canvas.currentCanvas?.camera.point[0]}px)
          translateY(${ctrl.canvas.currentCanvas?.camera.point[1]}px)
        `
      }}>
        <For each={ctrl.canvas.currentCanvas?.elements}>
          {(element) =>
            element.type === 'editor' ? <CanvasEditor element={element} /> :
            null
          }
        </For>
      </Board>
    </Container>
  )
}
