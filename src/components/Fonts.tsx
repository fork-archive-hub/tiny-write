import {createEffect, onMount} from 'solid-js'
import {Ctrl} from '@/services'
import {useState} from '@/state'

export default () => {
  const [, ctrl] = useState()

  onMount(() => {
    setupFonts(ctrl)
  })

  createEffect(() => {
    const root = document.documentElement

    root.style.setProperty('--background', ctrl.config.theme.background)
    root.style.setProperty('--foreground', ctrl.config.theme.foreground)
    root.style.setProperty('--foreground-80', `${ctrl.config.theme.foreground}cc`)
    root.style.setProperty('--foreground-60', `${ctrl.config.theme.foreground}99`)
    root.style.setProperty('--foreground-50', `${ctrl.config.theme.foreground}80`)
    root.style.setProperty('--foreground-20', `${ctrl.config.theme.foreground}33`)
    root.style.setProperty('--foreground-10', `${ctrl.config.theme.foreground}1a`)
    root.style.setProperty('--foreground-5', `${ctrl.config.theme.foreground}0D`)
    root.style.setProperty('--primary-background', ctrl.config.theme.primaryBackground)
    root.style.setProperty('--primary-background-50', `${ctrl.config.theme.primaryBackground}80`)
    root.style.setProperty('--primary-background-20', `${ctrl.config.theme.primaryBackground}33`)
    root.style.setProperty('--primary-foreground', ctrl.config.theme.primaryForeground)
    root.style.setProperty('--selection-border', `${ctrl.config.theme.primaryBackground}44`)
    root.style.setProperty('--selection', ctrl.config.theme.selection)
    root.style.setProperty('--tooltip-background', ctrl.config.theme.tooltipBackground)
    root.style.setProperty('--border', ctrl.config.theme.border)
    root.style.setProperty('--border-30', `${ctrl.config.theme.border}4d`)
    root.style.setProperty('--border-20', `${ctrl.config.theme.border}33`)
    root.style.setProperty('--font-family', ctrl.config.fontFamily)
    root.style.setProperty('--font-family-monospace', ctrl.config.getFontFamily({monospace: true}))
    root.style.setProperty('--font-family-bold', ctrl.config.getFontFamily({bold: true}))
    root.style.setProperty('--font-family-italic', ctrl.config.getFontFamily({italic: true}))
    root.style.setProperty('--font-size', `${ctrl.config.fontSize}px`)
    root.style.setProperty('--font-size-h1', `${ctrl.config.fontSize * 1.8}px`)
    root.style.setProperty('--font-size-h2', `${ctrl.config.fontSize * 1.4}px`)
    root.style.setProperty('--font-size-h3', `${ctrl.config.fontSize * 1.2}px`)
    root.style.setProperty('--border-radius', ctrl.config.borderRadius)
    root.style.setProperty('--menu-font-family', ctrl.config.DEFAULT_FONT)
    root.style.setProperty('--menu-font-size', '14px')
  })

  return <></>
}

const setupFonts = (ctrl: Ctrl) => {
  let styles = ''
  for (const k of Object.keys(ctrl.config.fonts)) {
    const font = ctrl.config.fonts[k]
    if (font.regular) {
      styles += `
        @font-face {
          font-family: '${font.value}';
          src: url('${font.regular}');
        }
      `
    }
    if (font.bold) {
      styles += `
        @font-face {
          font-family: '${font.value} bold';
          src: url('${font.bold}');
        }
      `
    }
    if (font.italic) {
      styles += `
        @font-face {
          font-family: '${font.value} italic';
          src: url('${font.italic}');
        }
      `
    }
  }

  const style = document.createElement('style')
  style.textContent = styles
  document.head.append(style)
}
