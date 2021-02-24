import {Plugin} from 'prosemirror-state'

const dropImage = (schema) => new Plugin({
  props: {
    handleDOMEvents: {
      drop: (view, event) => {
        const text = event.dataTransfer.getData('text/plain')
        const {files} = event.dataTransfer

        if (files.length === 0 && !text) return
        event.preventDefault()

        const insertImage = (src) => {
          const tr = view.state.tr
          const node = schema.nodes.image.create({src})
          const pos = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          }).pos

          tr.insert(pos, node)
          view.dispatch(tr)
        }

        if (files && files.length > 0) {
          for (const file of files) {
            const reader = new FileReader()
            const [mime] = file.type.split('/')

            if (mime === 'image') {
              reader.addEventListener('load', () => {
                const url = reader.result
                insertImage(url)
              })

              reader.readAsDataURL(file)
            }
          }
        }
      }
    }
  }
})

export default {
  plugins: (prev, schema) => [
    ...prev,
    dropImage(schema),
  ]
}
