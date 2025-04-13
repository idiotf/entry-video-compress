import { FFmpeg } from '@ffmpeg/ffmpeg'
import { ParentTarget } from './target'
import createProject from './project'
import generateHash from './hash'
import Tar from 'tar-js'

// eslint-disable-next-line no-var
declare var self: WorkerGlobalScope & typeof globalThis

const target = new ParentTarget(self)
target.addEventListener('video', async ({ data: { file, width, height, frameHorizontal, frameVertical, framerate } }) => {
  const ffmpeg = new FFmpeg
  await ffmpeg.load()

  const data = await file.arrayBuffer().catch(() => target.postMessage('error', '파일을 읽지 못했습니다.'))
  if (!data) return
  await ffmpeg.writeFile(file.name, new Uint8Array(data))

  const tar = new Tar
  const encoder = new TextEncoder

  // Get duration of video
  await ffmpeg.ffprobe(['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file.name, '-o', 'd.txt'])
  const duration = (duration => parseFloat(typeof duration == 'object' ? new TextDecoder().decode(duration) : duration))(await ffmpeg.readFile('d.txt'))

  // Extract the sound
  const soundCode = await ffmpeg.exec(['-i', file.name, 's.mp3'])
  const soundFile = soundCode ? void 0 : await ffmpeg.readFile('s.mp3')
  const sound = typeof soundFile == 'object' ? soundFile : encoder.encode(soundFile)

  const soundHash = sound && generateHash()
  const soundPath = soundHash && `temp/${soundHash.substring(0, 2)}/${soundHash.substring(2, 4)}/sound/${soundHash}.mp3`
  if (soundPath) tar.append(soundPath, sound)

  // Extract the frames
  ffmpeg.on('progress', ({ progress }) => target.postMessage('progress', progress))
  await ffmpeg.createDir('f')
  const videoCode = await ffmpeg.exec([
    '-i', file.name,
    '-s', `${width}x${height}`,
    ...(framerate ? ['-r', framerate + ''] : []),
    'f/%d.png',
  ])
  const frameDir = videoCode ? [] : (await ffmpeg.listDir('f')).filter(file => !file.isDir).map(file => file.name)

  target.postMessage('step', 'generating')

  // Join the frames
  const promises: Promise<string>[] = []
  for (let i = 0; i < frameDir.length; ) promises.push((async () => {
    const canvas = new OffscreenCanvas(width * frameHorizontal, height * frameVertical)
    const context = canvas.getContext('2d')
    if (!context) throw new TypeError('Cannot use Canvas2D')

    const promises: Promise<void>[] = []
    for (let vertical = 0; vertical < frameVertical; vertical++)
      for (let horizontal = 0; horizontal < frameHorizontal; horizontal++)
        promises.push((async () => {
          const name = frameDir[i++]
          if (!name) return
          const frame = await ffmpeg.readFile(`f/${name}`)
          const blob = new Blob([ frame ])
          context.drawImage(await createImageBitmap(blob), horizontal * width, vertical * height)
        })())

    await Promise.all(promises)
    const hash = generateHash()
    tar.append(`temp/${hash.substring(0, 2)}/${hash.substring(2, 4)}/image/${hash}.png`, new Uint8Array(await (await canvas.convertToBlob()).arrayBuffer()))
    return hash
  })())

  const chunks = await Promise.all(promises)
  ffmpeg.terminate()

  const frames = frameDir.length
  const blob = new Blob([ tar.append('temp/project.json', encoder.encode(JSON.stringify(createProject({
    name: file.name,
    width,
    height,
    chunks,
    frames,
    framerate: framerate || frames / duration,
    frameHorizontal,
    frameVertical,
    soundHash,
    soundPath,
    duration,
  })))) ])
  target.postMessage('done', URL.createObjectURL(blob))
})
