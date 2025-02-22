import {Node} from 'prosemirror-model'
import {DecorationSet, DecorationSource, EditorView as ProsemirrorEditorView} from 'prosemirror-view'
import {Selection, TextSelection} from 'prosemirror-state'
import {exitCode} from 'prosemirror-commands'
import {Compartment, EditorState} from '@codemirror/state'
import {EditorView, ViewUpdate, keymap, tooltips} from '@codemirror/view'
import {defaultKeymap, indentWithTab} from '@codemirror/commands'
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from '@codemirror/autocomplete'
import {indentOnInput, indentUnit, bracketMatching, foldGutter, foldKeymap} from '@codemirror/language'
import {linter, setDiagnostics} from '@codemirror/lint'
import {Ctrl} from '@/services'
import {findWords, tabCompletionKeymap} from './completion'
import {highlight, changeLang} from './lang'
import {getTheme} from './theme'
import expand from './expand'
import {prettifyView} from './prettify'
import {mermaidKeywords, mermaidView} from './mermaid'

export class CodeBlockView {
  public dom: HTMLElement
  private editorView: EditorView
  private updating = false
  private clicked = false
  private langExt: Compartment
  private findWordsExt: Compartment
  private keywordsExt: Compartment

  constructor(
    private node: Node,
    private view: ProsemirrorEditorView,
    readonly getPos: () => number | undefined,
    private innerDecos: DecorationSource,
    readonly ctrl: Ctrl,
  ) {
    this.dom = document.createElement('div')
    this.dom.setAttribute('contenteditable', 'false')
    this.dom.classList.add('cm-container')

    this.dom.addEventListener('cm:user_event', (event: any) => {
      this.editorView.dispatch({userEvent: event.detail.userEvent})
    })

    const codeMirrorKeymap = keymap.of([{
      key: 'Backspace',
      run: () => {
        if (!this.editorView.state.doc.length) {
          const offset = this.getPos()
          if (offset === undefined) return false
          const tr = this.view.state.tr.deleteRange(
            Math.max(0, offset - 1),
            offset + this.node.content.size + 1
          )
          this.view.dispatch(tr)
          this.view.focus()
          return true
        }

        return false
      }
    }, {
      key: 'Ctrl-Enter',
      run: () => {
        if (exitCode(this.view.state, this.view.dispatch)) this.view.focus()
        return true
      }
    }, {
      key: 'ArrowUp',
      run: (editorView) => {
        const state = editorView.state
        const selection = state.selection
        const startPos = selection.main.head
        if (!selection.main.empty) return false
        const line = editorView.state.doc.lineAt(startPos)

        if (line.number === 1) {
          let tr = this.view.state.tr
          const nodePos = this.getPos()
          if (nodePos === undefined) return false
          let targetPos = nodePos - 1
          if (nodePos === 0) {
            tr.insert(0, this.view.state.schema.node('paragraph'))
            targetPos = 0
          }

          this.view.dispatch(tr)
          tr = this.view.state.tr
          const selection = Selection.near(tr.doc.resolve(targetPos))
          tr.setSelection(selection).scrollIntoView()
          this.view.dispatch(tr)
          this.view.focus()
          return true
        }

        return false
      }
    }, {
      key: 'ArrowDown',
      run: (editorView) => {
        const state = editorView.state
        const selection = state.selection
        const startPos = selection.main.head
        if (!selection.main.empty) return false
        const line = editorView.state.doc.lineAt(startPos)

        if (line.number === editorView.state.doc.lines) {
          const tr = this.view.state.tr
          const nodePos = this.getPos()
          if (nodePos === undefined) return false
          const targetPos = nodePos + editorView.state.doc.length + 2
          const selection = Selection.near(tr.doc.resolve(targetPos))

          tr.setSelection(selection).scrollIntoView()
          this.view.dispatch(tr)
          this.view.focus()
          return true
        }

        return false
      }
    }])

    this.langExt = new Compartment
    this.findWordsExt = new Compartment
    this.keywordsExt = new Compartment

    const theme = getTheme(this.ctrl.config.codeTheme.value)
    const langSupport = highlight(this.lang)

    this.editorView = new EditorView({
      doc: this.node.textContent,
      extensions: [
        tooltips({parent: this.ctrl.app.layoutRef}),
        codeMirrorKeymap,
        keymap.of(closeBracketsKeymap),
        keymap.of(foldKeymap),
        keymap.of([
          ...defaultKeymap,
          ...completionKeymap,
          ...tabCompletionKeymap,
          indentWithTab,
        ]),
        theme,
        indentOnInput(),
        bracketMatching(),
        foldGutter(),
        closeBrackets(),
        linter(() => []),
        EditorState.tabSize.of(this.ctrl.config.prettier.tabWidth),
        indentUnit.of(
          this.ctrl.config.prettier.useTabs ?
            '\t' :
            ' '.repeat(this.ctrl.config.prettier.tabWidth)
        ),
        expand(this),
        mermaidView(this),
        prettifyView(this),
        changeLang(this, {
          onClose: () => this.editorView.focus(),
          onChange: (lang: string) => {
            const tr = this.view.state.tr
            const nodePos = this.getPos()
            if (nodePos === undefined) return
            tr.setNodeMarkup(nodePos, undefined, {...this.node.attrs, lang})
            this.view.dispatch(tr)
            this.reconfigure()
            this.editorView.dispatch(setDiagnostics(this.editorView.state, []))
            this.editorView.focus()
          }
        }),
        this.langExt.of(langSupport),
        EditorView.updateListener.of((update) => this.forwardUpdate(update)),
        this.findWordsExt.of(langSupport.language.data.of({autocomplete: findWords})),
        ...(this.lang === 'mermaid' ? [
          this.keywordsExt.of(langSupport.language.data.of({
            autocomplete: mermaidKeywords,
          })),
        ] : []),
        autocompletion(),
        EditorView.lineWrapping,
        EditorView.domEventHandlers({
          'mousedown': () => {
            this.clicked = true
          }
        })
      ]
    })

    this.dom.appendChild(this.editorView.dom)

    if (this.innerDecos instanceof DecorationSet) {
      this.innerDecos.find().map((d: any) => {
        const elem = typeof d.type.toDOM === 'function' ? d.type.toDOM() : d.type.toDOM
        this.dom.appendChild(elem)
      })
    }

    this.update(node)
  }

  get lang() {
    return this.node.attrs.lang ?? ''
  }

  forwardUpdate(update: ViewUpdate) {
    if (this.updating || !this.editorView.hasFocus) return

    const nodePos = this.getPos()
    if (nodePos === undefined) return

    let offset = nodePos + 1
    const {main} = update.state.selection
    const selFrom = offset + main.from
    const selTo = offset + main.to
    const pmSel = this.view.state.selection

    if (update.docChanged || pmSel.from != selFrom || pmSel.to != selTo) {
      const tr = this.view.state.tr
      update.changes.iterChanges((fromA, toA, fromB, toB, text) => {
        if (text.length) {
          tr.replaceWith(
            offset + fromA,
            offset + toA,
            this.view.state.schema.text(text.toString())
          )
        } else {
          tr.delete(offset + fromA, offset + toA)
        }
        offset += (toB - fromB) - (toA - fromA)
      })
      tr.setSelection(TextSelection.create(tr.doc, selFrom, selTo))
      this.view.dispatch(tr)
    }

    if (this.clicked) {
      this.clicked = false
      return
    }

    const sel = update.state.selection.main
    if (
      this.editorView.hasFocus &&
      sel.empty &&
      (update.docChanged || update.selectionSet) &&
      this.ctrl.config.typewriterMode
    ) {
      const lineBlock = this.editorView.lineBlockAt(sel.from)
      let {node} = this.editorView.domAtPos(lineBlock.from)
      if (!node) return
      if (node.nodeType === 3) node = node.parentNode as Element
      ;(node as Element).scrollIntoView({
        block: 'center',
        behavior: 'smooth',
      })
    }
  }

  setSelection(anchor: number, head: number) {
    this.editorView.focus()
    this.updating = true
    this.editorView.dispatch({selection: {anchor, head}})
    this.updating = false
  }

  update(node: Node) {
    if (node.type != this.node.type) return false
    const lang = this.lang
    this.node = node
    if (this.updating) return true

    if (node.attrs.hidden) {
      this.dom.classList.add('hidden')
    } else {
      this.dom.classList.remove('hidden')
    }

    if (node.attrs.lang !== lang) {
      this.reconfigure()
    }

    const newText = node.textContent
    const curText = this.editorView.state.doc.toString()

    if (newText != curText) {
      let start = 0
      let curEnd = curText.length
      let newEnd = newText.length
      while (
        start < curEnd &&
        curText.charCodeAt(start) == newText.charCodeAt(start)
      ) {
        ++start
      }

      while (
        curEnd > start &&
        newEnd > start &&
        curText.charCodeAt(curEnd - 1) == newText.charCodeAt(newEnd - 1)
      ) {
        curEnd--
        newEnd--
      }

      this.updating = true
      this.editorView.dispatch({
        changes: {
          from: start,
          to: curEnd,
          insert: newText.slice(start, newEnd)
        }
      })

      this.updating = false
    }

    return true
  }

  reconfigure() {
    const langSupport = highlight(this.lang)

    this.editorView.dispatch({
      effects: [
        this.langExt.reconfigure(langSupport),
        this.findWordsExt.reconfigure(
          langSupport.language.data.of({autocomplete: findWords})
        ),
        ...(this.lang === 'mermaid' ? [
          this.keywordsExt.reconfigure(
            langSupport.language.data.of({
              autocomplete: mermaidKeywords,
            })
          )
        ] : []),
      ]
    })
  }

  destroy() {
    this.editorView.destroy()
  }

  stopEvent(e: Event) {
    // Allow mouse events to allow to drag the code block from prosemirror.
    return !(e instanceof MouseEvent)
  }
}
