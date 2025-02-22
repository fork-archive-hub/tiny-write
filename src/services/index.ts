import {Store, createStore, SetStoreFunction} from 'solid-js/store'
import {State} from '@/state'
import {AppService} from './AppService'
import {ChangeSetService} from './ChangeSetService'
import {ConfigService} from './ConfigService'
import {EditorService} from './EditorService'
import {FileService} from './FileService'
import {CollabService} from './CollabService'
import {CanvasService} from './CanvasService'
import {ImageService} from './ImageService'

export class Ctrl {
  app!: AppService
  config!: ConfigService
  editor!: EditorService
  changeSet!: ChangeSetService
  file!: FileService
  collab!: CollabService
  canvas!: CanvasService
  image!: ImageService

  constructor(
    store: Store<State>,
    setState: SetStoreFunction<State>,
  ) {
    this.app = new AppService(this, store, setState)
    this.config = new ConfigService(this, store, setState)
    this.editor = new EditorService(this, store, setState)
    this.changeSet = new ChangeSetService(this, store, setState)
    this.file = new FileService(this, store, setState)
    this.collab = new CollabService(this, store, setState)
    this.canvas = new CanvasService(this, store, setState)
    this.image = new ImageService(this)
  }
}

export const createCtrl = (initial: State) => {
  const [store, setState] = createStore<Store<State>>(initial)
  const ctrl = new Ctrl(store, setState)
  return {store, ctrl}
}
