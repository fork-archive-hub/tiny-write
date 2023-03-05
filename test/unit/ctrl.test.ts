import {vi, expect, test, beforeEach} from 'vitest'
import * as db from '@/db'
import {createYdoc, insertText, waitFor, pause} from './util'

vi.stubGlobal('matchMedia', vi.fn(() => ({
  matchMedia: () => ''
})))

vi.stubGlobal('location', vi.fn(() => ({
  pathname: ''
})))

vi.mock('mermaid', () => ({}))

vi.mock('@/db', () => ({
  getEditor: vi.fn(),
  setEditor: vi.fn(),
  getConfig: vi.fn(),
  setConfig: vi.fn(),
  getWindow: vi.fn(),
  setWindow: vi.fn(),
  getFiles: vi.fn(),
  deleteFile: vi.fn(),
  updateFile: vi.fn(),
}))

vi.mock('y-websocket', () => ({
  WebsocketProvider: vi.fn(() => ({
    awareness: {
      setLocalStateField: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      getLocalState: vi.fn(),
    },
    disconnect: vi.fn(),
    connect: vi.fn(),
    on: vi.fn(),
  }))
}))

import {createCtrl} from '@/ctrl'
import {createState, Version} from '@/state'

beforeEach(() => {
  vi.restoreAllMocks()
})

const lastModified = new Date()

test('setState', () => {
  const {ctrl, store} = createCtrl(createState())
  ctrl.setState({fullscreen: true})
  expect(store.fullscreen).toBe(true)
})

test('init', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.collab?.ydoc).not.toBe(undefined)
})

test('init - new file if no id', async () => {
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYdoc('Text'), lastModified},
    {id: '2', ydoc: createYdoc('Test 2'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.files.length).toBe(3)
  expect(store.editor?.editorView?.state.doc.textContent).toBe('')
  expect(store.editor?.id).not.toBe(1)
  expect(store.editor?.id).not.toBe(2)
})

test('init - existing file', async () => {
  vi.spyOn(db, 'getEditor').mockResolvedValue({id: '2'})
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYdoc('Test'), lastModified},
    {id: '2', ydoc: createYdoc('Test 2'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.files.length).toBe(2)
  await waitFor(() => {
    expect(store.editor?.editorView?.state.doc.textContent).toBe('Test 2')
  })
})

test('init - join', async () => {
  vi.spyOn(db, 'getEditor').mockResolvedValue({id: '1'})
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYdoc('Test'), lastModified},
    {id: '2', ydoc: createYdoc('Test 2'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState({args: {room: '3'}}))
  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.files.length).toBe(3)
  expect(store.editor?.id).toBe('3')
  expect(store.editor?.editorView?.state.doc.textContent).toBe('')
})

test('init - dir', async () => {
  vi.spyOn(db, 'getEditor').mockResolvedValue({id: '1'})
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYdoc('Test'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState({args: {dir: ['~/Desktop/Aaaa.md']}}))
  const target = document.createElement('div')

  await ctrl.init(target)
  expect(store.files.length).toBe(1)
  expect(store.editor?.id).toBe('1')
  expect(store.editor?.editorView?.state.doc.textContent).toBe('')
  expect(store.args?.dir).toEqual(['~/Desktop/Aaaa.md'])
})

test('init - dir no current file', async () => {
  const {ctrl, store} = createCtrl(createState({
    args: {dir: ['~/Desktop/Aaaa.md']},
  }))

  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.files.length).toBe(0)
  expect(store.editor?.id).toBe(undefined)
  expect(store.editor?.editorView?.state.doc.textContent).toBe('')
  expect(store.args?.dir).toEqual(['~/Desktop/Aaaa.md'])
})

test('newFile', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')

  await ctrl.init(target)
  insertText(store.editor!.editorView!, 'Test')
  expect(store.editor?.editorView?.state.doc.textContent).toEqual('Test')

  await ctrl.newFile()
  expect(store.editor?.editorView?.state.doc.textContent).toEqual('')
  expect(store.files.length).toBe(2)
  expect(store.files[0].ydoc).not.toBe(undefined)
  expect(store.files[1].ydoc).not.toBe(undefined)
})

test('newFile - empty', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  await ctrl.newFile()
  expect(store.files.length).toBe(1)
  await ctrl.newFile()
  expect(store.files.length).toBe(1)
})

test('newFile - collab', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')

  await ctrl.init(target)
  insertText(store.editor!.editorView!, 'Test')

  ctrl.startCollab()
  const id = store.editor?.id

  await ctrl.newFile()
  expect(store.files.length).toBe(2)
  expect(store.editor?.editorView?.state.doc.textContent).toEqual('')
  expect(store.editor?.id).not.toEqual(id)
  expect(store.collab?.started).toBe(false)
  expect(store.files[0].ydoc).not.toBe(undefined)
  expect(store.files.find((f) => f.id === id)).not.toBeNull()
})

test('openFile - existing', async () => {
  vi.spyOn(db, 'getEditor').mockResolvedValue({id: '1'})
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYdoc('Test'), lastModified},
    {id: '2', ydoc: createYdoc('Test 2'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)

  await waitFor(() => {
    expect(store.editor?.editorView?.state.doc.textContent).toBe('Test')
  })

  await ctrl.openFile({id: '2'})
  expect(store.files.length).toBe(2)
  await waitFor(() => {
    expect(store.editor?.editorView?.state.doc.textContent).toBe('Test 2')
  })
})

test('openFile - not found', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  const id = store.editor?.id
  expect(store.files.length).toBe(1)
  await ctrl.openFile({id: '123'})
  expect(store.files.length).toBe(1)
  expect(store.editor?.id).toBe(id)
})

test('openFile - delete empty', async () => {
  vi.spyOn(db, 'getEditor').mockResolvedValue({id: '1'})
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYdoc(''), lastModified},
    {id: '2', ydoc: createYdoc('Test 2'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  await ctrl.openFile({id: '2'})
  expect(store.files.length).toBe(1)

  await waitFor(() => {
    expect(store.editor?.editorView?.state.doc.textContent).toBe('Test 2')
  })
})

test('openFile - open collab', async () => {
  const file = {id: 'room-123', ydoc: createYdoc('Test'), lastModified}
  vi.spyOn(db, 'getFiles').mockResolvedValue([file])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  await ctrl.openFile(file)
  await waitFor(() => {
    expect(store.editor?.editorView?.state.doc.textContent).toBe('Test')
    expect(store.editor?.id).toBe('room-123')
    expect(store.files.length).toBe(1)
  })
})

test('openFile - open from collab', async () => {
  vi.spyOn(db, 'getEditor').mockResolvedValue({id: '1'})
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYdoc('Test'), lastModified},
    {id: '2', ydoc: createYdoc('Test 2'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.files.length).toBe(2)
  ctrl.startCollab()
  await pause(10)

  expect(store.files.length).toBe(2)
  expect(store.collab?.started).toBe(true)

  await ctrl.openFile({id: '2'})
  expect(store.files.length).toBe(2)
  expect(store.collab?.started).toBe(false)
  await waitFor(() => {
    expect(store.editor?.editorView?.state.doc.textContent).toBe('Test 2')
  })
})

test('discard - open collab', async () => {
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: 'room-123', ydoc: createYdoc('Test'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState())

  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.files.length).toBe(2)
  await ctrl.discard()

  await waitFor(() => {
    expect(store.editor?.editorView?.state.doc.textContent).toBe('Test')
    expect(store.editor?.id).toBe('room-123')
    expect(store.files.length).toBe(1)
  })
})

test('discard - with text', async () => {
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYdoc('Test'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)

  insertText(store.editor!.editorView!, '111')
  expect(store.files.length).toBe(2)

  await ctrl.discard()
  expect(store.editor?.editorView?.state.doc.textContent).toBe('')
  expect(store.files.length).toBe(2)

  await ctrl.discard()
  await waitFor(() => {
    expect(store.editor?.editorView?.state.doc.textContent).toBe('Test')
    expect(store.files.length).toBe(1)
  })
})

test('discard - close collab', async () => {
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYdoc('Test'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  expect(store.files.length).toBe(2)

  ctrl.startCollab()
  expect(store.files.length).toBe(2)
  insertText(store.editor!.editorView!, '111')

  await ctrl.discard()
  await waitFor(() => {
    expect(store.editor?.editorView?.state.doc.textContent).toBe('Test')
    expect(store.files.length).toBe(1)
  })
})

test('clean', async () => {
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYdoc('Test'), lastModified},
  ])

  const error = {id: 'fail'}
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')

  await ctrl.init(target)
  insertText(store.editor!.editorView!, 'Test')
  expect(store.editor?.editorView?.state.doc.textContent).toBe('Test')

  ctrl.setState('error', error)
  expect(store.error).toBe(error)

  await ctrl.clean()
  expect(store.error).toBe(undefined)
  expect(store.editor?.id).not.toBe('1')
  expect(store.editor?.editorView?.state.doc.textContent).toBe('')
  expect(store.files.length).toBe(1)
})

test('startCollab - from empty state', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  ctrl.startCollab()
  expect(store.editor?.editorView?.state.doc.textContent).toBe('')
  expect(store.editor?.id).not.toBe(undefined)
  expect(store.collab?.started).toBe(true)
  expect(store.collab?.provider).not.toBe(undefined)
  ctrl.stopCollab()
})

test('startCollab - with text', async () => {
  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')

  await ctrl.init(target)
  expect(store.editor?.editorView).not.toBe(undefined)
  insertText(store.editor!.editorView!, 'Test')

  ctrl.startCollab()
  expect(store.editor?.editorView?.state.doc.textContent).toBe('Test')
  expect(store.editor?.id).not.toBe(undefined)
  expect(store.collab?.started).toBe(true)
  expect(store.collab?.provider).not.toBe(undefined)
})

test('startCollab - join new file', async () => {
  vi.spyOn(db, 'getEditor').mockResolvedValue({id: '1'})
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYdoc('Test'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState({args: {room: '2'}}))
  const target = document.createElement('div')
  await ctrl.init(target)

  expect(store.editor?.editorView?.state.doc.textContent).toBe('')
  expect(store.editor?.id).toBe('2')
  expect(store.files.length).toBe(2)
  expect(store.collab?.started).toBe(true)
  expect(store.collab?.provider).not.toBe(undefined)
})

test('startCollab - join existing file', async () => {
  vi.spyOn(db, 'getEditor').mockResolvedValue({id: '1'})
  vi.spyOn(db, 'getFiles').mockResolvedValue([
    {id: '1', ydoc: createYdoc('Test'), lastModified},
    {id: '2', ydoc: createYdoc('Test 2'), lastModified},
  ])

  const {ctrl, store} = createCtrl(createState({args: {room: '2'}}))
  const target = document.createElement('div')
  await ctrl.init(target)

  // Not sure if updateText should be called.
  expect(store.editor?.editorView?.state.doc.textContent).toBe('')
  expect(store.editor?.id).toBe('2')
  expect(store.files.length).toBe(2)
  expect(store.collab?.started).toBe(true)
  expect(store.collab?.provider).not.toBe(undefined)
})

test('applyVersion', async () => {
  const getVersions = () =>
    store.collab?.ydoc?.getArray('versions').toArray() as Version[]

  const {ctrl, store} = createCtrl(createState())
  const target = document.createElement('div')
  await ctrl.init(target)
  insertText(store.editor!.editorView!, 'Test')
  expect(store.editor?.editorView?.state.doc.textContent).toBe('Test')
  expect(getVersions().length).toBe(0)

  ctrl.addVersion()
  await pause(10)

  expect(getVersions().length).toBe(1)
  insertText(store.editor!.editorView!, '123')
  expect(store.editor?.editorView?.state.doc.textContent).toBe('Test123')

  ctrl.renderVersion(getVersions()[0])
  await pause(10)

  expect(store.editor?.editorView?.state.doc.textContent).toBe('Test')

  ctrl.applyVersion(getVersions()[0])
  await pause(10)

  expect(store.editor?.editorView?.state.doc.textContent).toBe('Test')
})
