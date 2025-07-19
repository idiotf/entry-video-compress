import { FFmpeg, type FileData } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'
import { ParentTarget } from './target'
import { createProject, defaultProject } from './project'
import generateHash from './hash'
import Tar from 'tar-js'

declare const self: WorkerGlobalScope & typeof globalThis

const encoder = new TextEncoder
const decoder = new TextDecoder

const target = new ParentTarget(self)
target.addEventListener('video', data => (async ({ data: { file, width, height, framerate, boostMode, frameHorizontal, frameVertical, divisionSize, memorySaving, multiThread } }) => {
  // Read video file
  const data = await file.arrayBuffer().then(data => new Uint8Array(data), reason => {
    target.postMessage('error', '파일을 읽지 못했습니다.')
    throw reason
  })

  // Load ffmpeg and write video file
  const baseURL = multiThread ? 'https://unpkg.com/@ffmpeg/core-mt@0.12.10/dist/umd' : 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd'
  const [ coreURL, wasmURL, workerURL ] = await Promise.all([
    toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    multiThread ? toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript') : void 0,
  ])

  const ffmpeg = new FFmpeg
  await ffmpeg.load({
    coreURL,
    wasmURL,
    workerURL,
  })
  await ffmpeg.writeFile(file.name, data)

  const tar = new Tar

  // Get fps of video
  if (!framerate) {
    const parseFileData = (data: FileData) => typeof data == 'object' ? decoder.decode(data) : data
    await ffmpeg.ffprobe([
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=avg_frame_rate',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      file.name,
      '-o', 'd.txt',
    ])
    const [ a, b ] = parseFileData(await ffmpeg.readFile('d.txt')).split('/').map(v => +v)
    framerate = a / b
  }

  // Extract the sound
  const soundFile = await ffmpeg.exec(['-i', file.name, 's.mp3']) ? void 0 : await ffmpeg.readFile('s.mp3')
  const sound = typeof soundFile == 'string' ? encoder.encode(soundFile) : soundFile

  const soundHash = sound && generateHash()
  const soundPath = soundHash && `temp/${soundHash.substring(0, 2)}/${soundHash.substring(2, 4)}/${soundHash}.mp3`
  if (soundPath) tar.append(soundPath, sound)

  // Extract the frames
  ffmpeg.on('progress', ({ progress }) => target.postMessage('progress', progress))
  await ffmpeg.createDir('f')
  await ffmpeg.exec([
    '-i', file.name,
    '-s', `${width}x${height}`,
    '-r', framerate + '',
    'f/%d.png',
  ])

  const frames = (await ffmpeg.listDir('f')).filter(file => !file.isDir).map(file => ffmpeg.readFile(`f/${file.name}`))
  if (!frames.length) {
    const parse = (data: FileData) => parseFloat(typeof data == 'object' ? decoder.decode(data) : data)
    await ffmpeg.ffprobe(['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file.name, '-o', 'd.txt'])
    const duration = parse(await ffmpeg.readFile('d.txt'))

    const canvas = new OffscreenCanvas(width, height)
    const renderer = canvas.getContext('bitmaprenderer')!

    target.addEventListener('fallbackFrame', ({ data: [ i, bitmap ] }) => {
      renderer.transferFromImageBitmap(bitmap)
      frames[i] = canvas.convertToBlob().then(v => v.arrayBuffer()).then(v => new Uint8Array(v))
    })

    target.postMessage('extractFrameFallback', { framerate, duration })
    await new Promise((resolve, reject) => {
      target.addEventListener('fallbackDone', resolve, { once: true })
      target.addEventListener('fallbackError', reject, { once: true })
    })

    // frames.length = (frames = await new Promise((resolve, reject) => {
    //   target.addEventListener('fallbackFrame', ({ data }) => resolve((renderer.transferFromImageBitmap(data), canvas.convertToBlob().then(v => v.arrayBuffer()).then(v => new Uint8Array(v)))), { once: true })
    //   target.addEventListener('fallbackError', ({ data }) => (target.postMessage('error', '프레임을 추출하지 못했습니다.'), reject(data)), { once: true })
    // })).length
  }

  // Get duration of audio
  const parse = (data: FileData) => parseFloat(typeof data == 'object' ? decoder.decode(data) : data)
  await ffmpeg.ffprobe(['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', 's.mp3', '-o', 'd.txt'])
  const duration = parse(await ffmpeg.readFile('d.txt'))

  await ffmpeg.deleteFile('s.mp3').catch(() => {})
  await ffmpeg.deleteFile('d.txt').catch(() => {})
  Promise.all(frames).then(() => ffmpeg.terminate())

  target.postMessage('step', 'generating')

  // Join the frames
  const promises = boostMode ? await (async () => {
    async function addFrame(promise: Promise<FileData>) {
      frameHorizontal = frameVertical = 1
      const frame = await promise
      const hash = generateHash()
      const data = typeof frame == 'string' ? encoder.encode(frame) : frame
      if (divisionSize && tar.written + data.length > divisionSize) {
        target.postMessage('file', URL.createObjectURL(new Blob([ tar.append('temp/project.json', encoder.encode(JSON.stringify(defaultProject))) ])))
        tar.clear()
      }
      tar.append(`temp/${hash.substring(0, 2)}/${hash.substring(2, 4)}/image/${hash}.png`, data)
      return hash
    }

    const promises = []
    for (const promise of frames) promises.push(memorySaving ? await addFrame(promise) : addFrame(promise))
    return promises
  })() : await (async () => {
    let i = 0
    async function joinFrames(canvas: OffscreenCanvas, context: OffscreenCanvasRenderingContext2D) {
      const promises: Promise<void>[] = []
      for (let vertical = 0; vertical < frameVertical; vertical++) for (let horizontal = 0; horizontal < frameHorizontal; horizontal++) promises.push((async () => {
        const frame = await frames[i++]
        if (!frame) return
        const blob = new Blob([ frame ])
        const bitmap = await createImageBitmap(blob)
        context.drawImage(bitmap, horizontal * width, vertical * height)
        bitmap.close()
      })())

      await Promise.all(promises)
      const hash = generateHash()
      const data = new Uint8Array(await (await canvas.convertToBlob()).arrayBuffer())
      if (divisionSize && tar.written + data.length > divisionSize) {
        target.postMessage('file', URL.createObjectURL(new Blob([ tar.append('temp/project.json', encoder.encode(JSON.stringify(defaultProject))) ])))
        tar.clear()
      }
      tar.append(`temp/${hash.substring(0, 2)}/${hash.substring(2, 4)}/image/${hash}.png`, data)
      return hash
    }

    const promises = []
    if (memorySaving) {
      const canvas = new OffscreenCanvas(width * frameHorizontal, height * frameVertical)
      const context = canvas.getContext('2d')!
      while (i < frames.length) {
        promises.push(await joinFrames(canvas, context))
        context.clearRect(0, 0, canvas.width, canvas.height)
      }
    } else while (i < frames.length) {
      const canvas = new OffscreenCanvas(width * frameHorizontal, height * frameVertical)
      const context = canvas.getContext('2d')!
      promises.push(joinFrames(canvas, context))
    }
    return promises
  })()

  const json = encoder.encode(JSON.stringify(createProject({
    name: file.name,
    width,
    height,
    chunks: await Promise.all(promises),
    frames: frames.length,
    framerate,
    frameHorizontal,
    frameVertical,
    soundHash,
    soundPath,
    duration,
  })))

  if (divisionSize && tar.written + json.length > divisionSize) {
    target.postMessage('file', URL.createObjectURL(new Blob([ tar.append('temp/project.json', encoder.encode(JSON.stringify(defaultProject))) ])))
    tar.clear()
  }

  target.postMessage('file', URL.createObjectURL(new Blob([ tar.append('temp/project.json', json) ])))
  target.postMessage('step', 'done')
  target.postMessage('progress', 1)
})(data).catch((reason: unknown) => {
  target.postMessage('error', null)
  throw reason
}))
