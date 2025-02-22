import {PrettierConfig, useState} from '@/state'
import {Drawer, Label, Link, Sub, Text} from './Menu'
import {Button} from './Button'

interface Props {
  onBack: () => void;
}

export const CodeBlockMenu = (props: Props) => {
  const [store, ctrl] = useState()

  const updatePrettier = (opt: Partial<PrettierConfig>) => {
    ctrl.config.updateConfig({
      prettier: {...store.config.prettier, ...opt}
    })
  }

  return (
    <Drawer data-tauri-drag-region="true">
      <Label>Indentation</Label>
      <Sub data-tauri-drag-region="true">
        <Text>
          Tab Width:
          <input
            type="range"
            min="2"
            max="8"
            step="2"
            value={store.config.prettier.tabWidth}
            onInput={(e: any) => updatePrettier({tabWidth: Number(e.target.value)})} />
          {store.config.prettier.tabWidth}
        </Text>
        <Link onClick={() => updatePrettier({useTabs: !store.config.prettier.useTabs})}>
          Use Tabs {store.config.prettier.useTabs && '✅'}
        </Link>
      </Sub>
      <Label>Prettier</Label>
      <Sub data-tauri-drag-region="true">
        <Text>
          Print Width:
          <input
            type="range"
            min="20"
            max="160"
            step="10"
            value={store.config.prettier.printWidth}
            onInput={(e: any) => updatePrettier({printWidth: Number(e.target.value)})} />
          {store.config.prettier.printWidth}
        </Text>
        <Link onClick={() => updatePrettier({semi: !store.config.prettier.semi})}>
          Semicolons {store.config.prettier.semi && '✅'}
        </Link>
        <Link onClick={() => updatePrettier({singleQuote: !store.config.prettier.singleQuote})}>
          Single Quote {store.config.prettier.singleQuote && '✅'}
        </Link>
      </Sub>
      <Button onClick={props.onBack}>↩ Back</Button>
    </Drawer>
  )
}
