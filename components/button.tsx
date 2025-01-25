'use client'

import { WorkerTarget } from '@/worker/types'
import React, { Fragment, useRef, useState } from 'react'

interface VideoProgress {
  name: string
  videoSrc: string
  state: 'extracting-frames' | 'extracting-sound' | 'joining' | 'finalizing' | 'done' | 'error'
  progress: number
}

export default function Button() {
  async function extractFrames() {
    const input = inputRef.current
    if (!input || !input.files) return
    const newProgresses = [...input.files].map((file): VideoProgress => ({
      name: file.name,
      videoSrc: URL.createObjectURL(file),
      state: 'extracting-frames',
      progress: 0,
    }))
    setProgresses(progresses => [...progresses, ...newProgresses])
    for (let i = 0; i < input.files.length; i++) {
      const file = input.files[i]
      const progress: VideoProgress = newProgresses[i]
      const target = new WorkerTarget(new Worker(new URL('@/worker/extract', import.meta.url)))
      const data = await file.arrayBuffer().catch(() => {})
      if (!data) {
        setProgresses(progresses => {
          const copy: VideoProgress[] = structuredClone(progresses)
          copy[i].state = 'error'
          return copy
        })
        continue
      }
      target.worker.addEventListener('error', () => setProgresses(progresses => {
        const copy: VideoProgress[] = structuredClone(progresses)
        copy[i].state = 'error'
        return copy
      }))
      target.postMessage('video', {
        video: new Uint8Array(data),
        width: 640,
        height: 360,
        chunkLength: 20,
        name: file.name,
      }, [ data ])

      target.addEventListener('progress', ({ data }) => {
        const video = document.getElementById(`video-${i}`)
        if (video instanceof HTMLVideoElement && video.duration) video.currentTime = data * video.duration
        setProgresses(progresses => {
          const copy: VideoProgress[] = structuredClone(progresses)
          copy[i].progress = data
          return copy
        })
      })

      target.addEventListener('finalize', async ({ data }) => {
        setProgresses(progresses => progresses.filter(target => target != progress))
        const anchor = document.createElement('a')
        anchor.href = data
        anchor.download = file.name.replace(/(\..*)*$/, '.ent')
        anchor.click()
        queueMicrotask(() => {
          URL.revokeObjectURL(data)
          URL.revokeObjectURL(progress.videoSrc)
          target.worker.terminate()
        })
      })
    }
    inputRef.current = input.parentNode?.insertBefore(input.cloneNode() as HTMLInputElement, input) || null
    input.remove()
  }

  function dropHandler(event: React.DragEvent) {
    event.preventDefault()
    setDropping(false)

  }

  const [ dropping, setDropping ] = useState(false)
  const [ progresses, setProgresses ] = useState<VideoProgress[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className='max-w-[512px] mx-auto'>
      <button
        id='convert'
        onClick={() => inputRef.current?.click()}
        onDragLeave={() => setDropping(false)}
        onDragOver={event => (event.preventDefault(), setDropping(true))}
        onDrop={dropHandler}
        className={`block w-full select-none bg-green-400 dark:bg-green-500 hover:brightness-90 dark:hover:brightness-75 border-4 border-green-500 dark:border-green-800 rounded-3xl p-4 ${dropping ? 'brightness-90 dark:brightness-75' : ''}`}
      >
        <input type='file' ref={inputRef} onChange={extractFrames} multiple hidden />
        <svg xmlns='http://www.w3.org/2000/svg' width='100%' height={80} viewBox='-60 -120 120 120' fill='none'>
          <path d='M-54-18a12,12,0,0,0,12,12H42a12,12,0,0,0,12-12M0-32v-80m-24,24l24-24l24,24' strokeWidth={6} strokeLinecap='round' strokeLinejoin='round' className='stroke-green-600 dark:stroke-green-700' />
        </svg>
        <span className='block my-2 text-lime-950'>
          클릭하거나 파일을 드롭하세요<br />
          (Powered By FFmpeg)
        </span>
      </button>
      {progresses.length ? <ul className='mt-2 bg-yellow-400 p-2 border-4 rounded-3xl border-yellow-600'>{[...progresses].map((progress, i) => <Fragment key={`a${i}`}>
        {i ? <hr className='m-4 dark:border-gray-800' /> : []}
        <li className='text-black text-left h-[90px]'>
          <div className='float-left relative'>
            <video src={progress.videoSrc} id={`video-${i}`} width={160} height={90} onContextMenu={event => event.preventDefault()} onError={() => (document.getElementById(`progress-${i}`) || { hidden: false }).hidden = false} className='rounded-xl' />
            <div id={`progress-${i}`} hidden className='absolute inset-0 leading-[100%]'>{`${(progress.progress * 100).toFixed(3)}%`}</div>
          </div>
          <div className='p-2 overflow-ellipsis whitespace-nowrap overflow-hidden'>{progress.name}</div>
          <div className='float-left m-2 w-[calc(100%-176px)] h-8 rounded bg-loading'></div>
        </li>
      </Fragment>)}</ul> : []}
    </div>
  )
}
