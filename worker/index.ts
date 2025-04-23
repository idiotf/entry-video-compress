import { FFmpeg, type FileData } from '@ffmpeg/ffmpeg'
import { ParentTarget } from './target'
import { createProject, defaultProject } from './project'
import generateHash from './hash'
import Tar from 'tar-js'

// eslint-disable-next-line no-var
declare var self: WorkerGlobalScope & typeof globalThis

const target = new ParentTarget(self)
target.addEventListener('video', data => (async ({ data: { file, width, height, frameHorizontal, frameVertical, framerate, divisionSize } }) => {
  // Read video file
  const data = await file.arrayBuffer().catch(() => target.postMessage('error', '파일을 읽지 못했습니다.'))
  if (!data) return

  // Load ffmpeg and write video file
  const ffmpeg = new FFmpeg
  await ffmpeg.load()
  await ffmpeg.writeFile(file.name, new Uint8Array(data))

  const tar = new Tar
  const encoder = new TextEncoder

  // Get duration of video
  const parse = (data: FileData) => parseFloat(typeof data == 'object' ? new TextDecoder().decode(data) : data)
  await ffmpeg.ffprobe(['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file.name, '-o', 'd.txt'])
  const duration = parse(await ffmpeg.readFile('d.txt'))

  // Extract the sound
  const soundCode = await ffmpeg.exec(['-i', file.name, 's.mp3'])
  const soundFile = soundCode ? void 0 : await ffmpeg.readFile('s.mp3')
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
    ...(framerate ? ['-r', framerate + ''] : []),
    'f/%d.png',
  ])
  const frameDir = (await ffmpeg.listDir('f')).filter(file => !file.isDir).map(file => ffmpeg.readFile(`f/${file.name}`))
  const frames = frameDir.length
  Promise.all(frameDir).then(() => ffmpeg.terminate())

  target.postMessage('step', 'generating')

  // Join the frames
  const promises: Promise<string>[] = []
  for (let i = 0; i < frameDir.length; ) promises.push((async () => {
    // Create a canvas to merge frames
    const canvas = new OffscreenCanvas(width * frameHorizontal, height * frameVertical)
    const context = canvas.getContext('2d')!

    const promises: Promise<void>[] = []
    for (let vertical = 0; vertical < frameVertical; vertical++) for (let horizontal = 0; horizontal < frameHorizontal; horizontal++) promises.push((async () => {
      const frame = await frameDir[i++]
      if (!frame) return
      const blob = new Blob([ frame ])
      context.drawImage(await createImageBitmap(blob), horizontal * width, vertical * height)
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
  })())

  const json = encoder.encode(JSON.stringify(createProject({
    name: file.name,
    width,
    height,
    chunks: await Promise.all(promises),
    frames,
    framerate: framerate || frames / duration,
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
})(data).catch((reason: unknown) => (target.postMessage('error', '변환에 실패했습니다.'), Promise.reject(reason))))
