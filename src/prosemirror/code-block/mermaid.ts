import {EditorView, ViewPlugin, ViewUpdate} from '@codemirror/view'
import {language} from '@codemirror/language'
import mermaid from 'mermaid'
import {CodeBlockView} from './view'
import {CompletionSource} from '@codemirror/autocomplete'

const syntax = {
  flowchart: [
    'subgraph',
  ],
  sequenceDiagram: [
    'actor',
    'activate',
    'deactivate',
    'participant',
    'autonumber',
  ],
  classDiagram: [
    'class',
    '<<interface>>',
    '<<enumeration>>',
  ],
}

export const mermaidKeywords: CompletionSource = (context) => {
  const word = context.matchBefore(/\w*/)
  if (word.from == word.to && !context.explicit) {
    return null
  }

  const type = context.state.doc.line(1).text
  const keywords = syntax[type] ?? Object.keys(syntax)

  return {
    from: word.from,
    options: keywords.map((label: string) => ({label, type: 'keyword'})),
  }
}

export const mermaidView = (codeBlock: CodeBlockView) =>
  ViewPlugin.fromClass(class {
    id = codeBlock.getPos()
    output: HTMLElement

    constructor(private view: EditorView) {}

    destroy() {
      if (this.output) this.output.remove()
      this.output = null
    }

    update(update: ViewUpdate) {
      if (!this.output) {
        this.renderDOM()
        this.updateDOM()
      }

      if (
        update.docChanged ||
        update.startState.facet(language) != update.state.facet(language)
      ) {
        this.updateDOM()
      }
    }

    renderDOM() {
      const div = document.createElement('div')
      div.className = 'mermaid'
      this.output = div
      this.view.dom.appendChild(this.output)
    }

    updateDOM() {
      if (codeBlock.lang !== 'mermaid') {
        this.output.style.display = 'none'
        return
      }

      const content = this.view.state.doc.toString()
      if (!content) {
        this.output.style.display = 'none'
        return
      }

      this.output.style.display = 'flex'
      mermaid.initialize({
        startOnLoad: false,
        theme: codeBlock.options.dark ? 'dark' : 'default',
        fontFamily: `${codeBlock.options.font}, monospace`,
      })

      try {
        mermaid.render(`mermaid-graph-${this.id}`, content, (svgCode) => {
          this.output.innerHTML = svgCode
        })
      } catch (err) {
        const error = document.createElement('code')
        error.textContent = err
        this.output.innerHTML = ''
        this.output.appendChild(error)
        // remove mermaid error div
        const errorDiv = document.getElementById(`dmermaid-graph-${this.id}`)
        errorDiv?.remove()
      }
    }
  })
