import Tar from 'tar-js'
import generateHash from '@/worker/hash'
import createProject, { Chunk } from '@/worker/project'
import { ParentTarget } from '@/worker/types'
import { FFmpeg, ProgressEvent } from '@ffmpeg/ffmpeg'

async function joinFrames({ col, row, blankRow, minusRow, frames, tar, width, height }: { col: number, row: number, blankRow: number, minusRow: number, frames: ImageBitmap[], tar: Tar, width: number, height: number }) {
  const canvas = new OffscreenCanvas(width * col, height * minusRow)
  const context = canvas.getContext('2d')
  if (!context) throw new TypeError('Cannot use Canvas2D')

  frames.slice(col * (row - blankRow), col * (row - blankRow + minusRow)).forEach((bitmap, i) => {
    context.drawImage(bitmap, i % col * canvas.width / col, Math.trunc(i / col) * canvas.height / minusRow, canvas.width / col, canvas.height / minusRow)
    bitmap.close()
  })

  const { promise, resolve, reject } = Promise.withResolvers<Chunk>()
  const reader = new FileReader
  reader.readAsArrayBuffer(await canvas.convertToBlob())
  reader.addEventListener('load', () => {
    if (!(reader.result instanceof ArrayBuffer)) return
    const name = generateHash()
    const path = `temp/${name.substring(0, 2)}/${name.substring(2, 4)}/image/${name}.png`
    tar.append(path, new Uint8Array(reader.result))
    resolve({
      path,
      name,
      width: canvas.width,
      height: canvas.height,
      row: row - blankRow + minusRow,
    })
  })
  reader.addEventListener('error', () => reject(reader.error))
  reader.addEventListener('abort', () => reject(reader.error))
  return promise
}

async function extract(ffmpeg: FFmpeg, tar: Tar, width: number, height: number, chunks: number, name: string, fps?: number) {
  const [ frameData, soundData ] = await Promise.all([
    ffmpeg.exec(['-i', name, '-s', `${width}x${height}`, ...(fps ? ['-r', fps.toString()] : []), 'f/%d.png'])
      .then(() => ffmpeg.listDir('f'))
      .then(files => Promise.all(files.filter(v => !v.isDir).map(v => ffmpeg.readFile('f/' + v.name)))),
    ffmpeg.exec(['-i', name, 's.mp3'])
      .then(code => code ? null : ffmpeg.readFile('s.mp3')),
  ])
  ffmpeg.terminate()

  console.log('Loading frames...')
  const frames = await Promise.all(frameData.map(frame => createImageBitmap(new Blob([ frame ], { type: 'image/png' }))))
  const sound = typeof soundData == 'object' ? soundData : encoder.encode(soundData)

  const soundName = generateHash()
  const soundPath = `temp/${soundName.substring(0, 2)}/${soundName.substring(2, 4)}/sound/${soundName}.mp3`

  if (sound) tar.append(soundPath, new Uint8Array(sound))

  const col = Math.round(Math.sqrt(frames.length / chunks))
  const row = Math.ceil(frames.length / col)

  // Join frames to canvases
  const promises: Promise<Chunk>[] = []
  let rows = 0
  for (let i = 0, blankRow = row; i < chunks; i++) {
    const minusRow = Math.floor(blankRow / (chunks - i))
    const promise = joinFrames({
      col,
      row,
      blankRow,
      minusRow,
      frames,
      tar,
      width,
      height,
    })
    promise.then(() => console.log(`Loaded chunk ${++rows}/${chunks}`))
    promises.push(promise)
    blankRow -= minusRow
  }

  return {
    chunks: await Promise.all(promises),
    soundName: sound ? soundName : void 0,
    soundPath: sound ? soundPath : void 0,
    col,
    frames,
  }
}

const encoder = new TextEncoder
const decoder = new TextDecoder
const target = new ParentTarget(self)
target.addEventListener('video', async ({ data: { video, width, height, chunkLength = 1, fps, name } }) => {
  const tar = new Tar

  console.log('Loading...')
  // Extract frames and a sound with FFmpeg
  const ffmpeg = new FFmpeg
  await ffmpeg.load()

  await Promise.all([
    ffmpeg.writeFile(name, video),
    ffmpeg.createDir('f'),
  ])

  const progressCallback = ({ progress }: ProgressEvent) => console.log(`Progressing... ${(progress * 100).toFixed(3)}%`)
  ffmpeg.on('progress', progressCallback)
  const [ { chunks, soundName, soundPath, col, frames }, duration ] = await Promise.all([
    extract(ffmpeg, tar, width, height, chunkLength, name, fps),
    ffmpeg.ffprobe(['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', name, '-o', 'd.txt'])
      .then(() => ffmpeg.readFile('d.txt', 'utf8'))
      .then(data => parseFloat(typeof data == 'object' ? decoder.decode(data) : data))
  ])
  ffmpeg.off('progress', progressCallback)

  tar.append('temp/project.json', encoder.encode(JSON.stringify(createProject({
    name,
    chunks,
    soundName,
    soundPath,
    col,
    frames: frames.length,
    duration,
  }))))
  
  if (false) {
    const gzip = new CompressionStream('gzip')
    const writer = gzip.writable.getWriter()
    writer.write(tar.out)
  
    const blob = new Blob([ await new Response(gzip.readable).blob() ], { type: 'application/x-entryapp' })
    target.postMessage('finalize', URL.createObjectURL(blob))
  } else {
    const blob = new Blob([ tar.out ], { type: 'application/x-entryapp' })
    target.postMessage('finalize', URL.createObjectURL(blob))
  }
})
