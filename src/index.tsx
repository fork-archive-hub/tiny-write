import React from 'react'
import {render} from 'react-dom'
import {ProseMirrorState} from './prosemirror/prosemirror'
import Main from './Main'
import {newState} from './reducer'

export interface Config {
  theme: string;
  codeTheme: string;
  font: string;
  fontSize: number;
  contentWidth: number;
  alwaysOnTop: boolean;
  typewriterMode: boolean;
  dragHandle: boolean;
}

export interface ErrorObject {
  id: string;
  props?: unknown;
}

export interface Collab {
  started: boolean;
  error?: boolean;
  socket?: any;
  room?: string;
  users?: string[];
  initialized?: boolean;
}

export interface Args {
  cwd: string;
  file?: string;
  text: any;
}

export type LoadingType = 'loading' | 'roundtrip' | 'initialized' | 'error'

export interface State {
  text?: ProseMirrorState;
  lastModified?: Date;
  files: File[];
  config: Config;
  error?: ErrorObject;
  loading: LoadingType;
  fullscreen: boolean;
  collab?: Collab;
  path?: string;
  args?: Args;
}

export interface File {
  text?: {doc: unknown; selection: unknown};
  lastModified?: string;
  path?: string;
}

render(
  <React.StrictMode>
    <Main state={newState()} />
  </React.StrictMode>,
  document.getElementById('container')
)
