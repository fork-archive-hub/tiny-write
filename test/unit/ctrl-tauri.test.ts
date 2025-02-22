import {vi, expect, test, beforeEach} from 'vitest'
import {clearMocks, mockIPC} from '@tauri-apps/api/mocks'
import * as db from '@/db'
import {createYUpdateAsString, getText, insertText, waitFor} from './util'

vi.stubGlobal('__TAURI__', {})
vi.stubGlobal('matchMedia', vi.fn(() => ({
  matchMedia: () => ''
})))

vi.mock('mermaid', () => ({}))

vi.mock('@/db', () => ({
  getCanvases: vi.fn(),
  getMeta: vi.fn(),
  setMeta: vi.fn(),
  getConfig: vi.fn(),
  setConfig: vi.fn(),
  getWindow: vi.fn(),
  setWindow: vi.fn(),
  getFiles: vi.fn(),
  deleteFile: vi.fn(),
  updateFile: vi.fn(),
  setSize: vi.fn(),
  getSize: vi.fn(),
  deleteDatabase: vi.fn(),
}))

import {createCtrl} from '@/services'
import {createState} from '@/state'

const lastModified = new Date()

beforeEach(() => {
  vi.restoreAllMocks()
  clearMocks()
  mockIPC((cmd, args: any) => {
    if (cmd === 'get_args') {
      return {}
    } else if (cmd === 'resolve_path') {
      return args.paths[0]
    } else if (cmd === 'get_file_last_modified') {
      return lastModified
    } else if (args?.message?.cmd === 'readTextFile') {
      return args.message.path === 'file1' ? '# File1' : '# File2'
    }
  })
})

test('init - load existing by path', async () => {
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYUpdateAsString('1', ''), path: 'file1', lastModified, active: true}
  ])

  const {ctrl} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init(target)
  expect(ctrl.file.currentFile?.path).toBe('file1')
  expect(getText(ctrl)).toBe('File1')
})

test('init - check text', async () => {
  clearMocks()
  mockIPC((cmd, args: any) => {
    if (cmd === 'get_args') {
      return {file: 'file2'}
    } else if (cmd === 'resolve_path') {
      return args.paths[0]
    } else if (cmd === 'get_file_last_modified') {
      return lastModified
    } else if (args?.message?.cmd === 'readTextFile') {
      return '# File2'
    }
  })

  const {ctrl} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init(target)
  expect(ctrl.file.currentFile?.path).toBe('file2')
  expect(getText(ctrl)).toBe('File2')
})

test('openFile - path in files', async () => {
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', path: 'file1', ydoc: createYUpdateAsString('1', 'Test'), lastModified},
    {id: '2', path: 'file2', ydoc: createYUpdateAsString('2', 'Test 2'), lastModified, active: true},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')

  await ctrl.app.init(target)
  await ctrl.editor.openFile({path: 'file1'})
  expect(store.files.length).toBe(2)
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)
  expect(ctrl.file.currentFile?.path).toBe('file1')
  expect(ctrl.file.currentFile?.lastModified).toEqual(lastModified)
  ctrl.editor.renderEditor(target)

  await waitFor(() => {
    expect(getText(ctrl)).toBe('File1')
  })
})

test('openFile - push path to files', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')

  await ctrl.app.init(target)
  expect(store.files.length).toBe(1)
  insertText(ctrl, 'Test')

  await ctrl.editor.openFile({path: 'file1'})
  expect(store.files.length).toBe(2)
  expect(store.files[0].path).toBe(undefined)
  expect(store.files[1].path).toBe('file1')
  expect(ctrl.file.currentFile?.path).toBe('file1')
  expect(ctrl.file.currentFile?.editorView).toBe(undefined)
  ctrl.editor.renderEditor(target)

  await waitFor(() => {
    expect(getText(ctrl)).toBe('File1')
  })
})

test('openFile - path and text', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.app.init(target)
  expect(store.files.length).toBe(1)

  await ctrl.editor.openFile({path: 'file1'})
  expect(store.files.length).toBe(1)
  ctrl.editor.renderEditor(target)

  await waitFor(() => {
    expect(getText(ctrl)).toBe('File1')
  })
})

test('discard - with path', async () => {
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', path: 'file1', ydoc: createYUpdateAsString('1', 'Test'), lastModified, active: true},
    {id: '2', path: 'file2', ydoc: createYUpdateAsString('2', 'Test 2'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')

  await ctrl.app.init(target)
  expect(store.files.length).toBe(2)

  await ctrl.editor.discard()
  expect(store.files.length).toBe(1)
  expect(ctrl.file.currentFile?.id).toBe('2')
  expect(ctrl.file.currentFile?.path).toBe('file2')
  ctrl.editor.renderEditor(target)

  await waitFor(() => {
    expect(getText(ctrl)).toBe('File2')
  })
})
