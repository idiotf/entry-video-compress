'use client'

import { WorkerTarget } from '@/worker/types'
import React, { Fragment, useRef, useState } from 'react'

interface VideoProgress {
  name: string
  checkAbort: boolean
  abort(): void
  start: number
  time: string
  duration: string
  file: File
  videoSrc: string
  state: 'configuration' | 'loading' | 'extracting-sound' | 'extracting-frames' | 'joining' | 'finalizing' | 'done' | 'error' | 'aborted'
  error?: string
  progress: number
  width: number
  height: number
  fps?: number
  framesPerChunk: number
}

export default function Button() {
  async function extractFrames(progress: VideoProgress) {
    const i = progresses.indexOf(progress)
    const { file } = progress
    const target = new WorkerTarget(new Worker(new URL('@/worker/extract', import.meta.url)))

    const timeFormat = (time: number) => `${time < 3600 ? '' : `${Math.trunc(time / 3600).toString().padStart(2, '0')}:`}${Math.trunc(time % 3600 / 60).toString().padStart(2, '0')}:${Math.trunc(time % 60).toString().padStart(2, '0')}`
    let raf = requestAnimationFrame(function frame(time) {
      setProgresses(progresses => {
        const copy = copyProgresses(progresses)
        copy[i].time = timeFormat((time - copy[i].start) / 1000)
        copy[i].duration = timeFormat(copy[i].progress ? ((time - copy[i].start) / copy[i].progress - (time - copy[i].start)) / 1000 : 0)
        return copy
      })
      raf = requestAnimationFrame(frame)
    })

    const errorHandler = (error: string) => (progresses: VideoProgress[]) => {
      const copy = copyProgresses(progresses)
      copy[i].state = 'error'
      copy[i].error = error
      URL.revokeObjectURL(copy[i].videoSrc)
      target.worker.terminate()
      cancelAnimationFrame(raf)
      return copy
    }

    let blobURL = ''
    setProgresses(progresses => {
      const copy = copyProgresses(progresses)
      copy[i].start = performance.now()
      copy[i].state = 'loading'
      copy[i].abort = () => {
        setProgresses(progresses => {
          const copy = copyProgresses(progresses)
          URL.revokeObjectURL(blobURL)
          URL.revokeObjectURL(copy[i].videoSrc)
          target.worker.terminate()
          copy[i].state = 'aborted'
          return copy
        })
        cancelAnimationFrame(raf)
      }
      return copy
    })

    const data = await file.arrayBuffer().catch(() => new Promise<void>(queueMicrotask))
    if (!data) return setProgresses(errorHandler('파일을 읽지 못했습니다.'))

    target.worker.addEventListener('error', () => setProgresses(errorHandler('변환에 실패했습니다.')))

    target.addEventListener('status', ({ data }) => setProgresses(progresses => {
      const copy: VideoProgress[] = copyProgresses(progresses)
      copy[i].state = data
      return copy
    }))

    target.postMessage('video', {
      video: new Uint8Array(data),
      width: progress.width,
      height: progress.height,
      fps: progress.fps,
      framesPerChunk: progress.framesPerChunk,
      name: file.name,
      isOneObject: progress.framesPerChunk == 1,
    }, [ data ])

    target.addEventListener('progress', ({ data }) => setProgresses(progresses => {
      const copy = copyProgresses(progresses)
      const video = document.getElementById(`video-${i}`)
      if (video instanceof HTMLVideoElement && video.duration) video.currentTime = data * video.duration
      copy[i].progress = data
      return copy
    }))

    target.addEventListener('finalize', async ({ data }) => {
      const anchor = document.createElement('a')
      anchor.href = blobURL = data
      anchor.download = file.name.replace(/(\.[^.]*)?$/, '.ent')
      anchor.click()
      setProgresses(progresses => {
        const copy = copyProgresses(progresses)
        copy[i].state = 'done'
        return copy
      })
      cancelAnimationFrame(raf)
    })
  }

  function addVideoProgress(file: File) {
    setProgresses(progresses => {
      const i = progresses.length
      const progress: VideoProgress = {
        name: file.name,
        checkAbort: false,
        abort() {
          setProgresses(progresses => {
            const copy = copyProgresses(progresses)
            URL.revokeObjectURL(copy[i].videoSrc)
            copy[i].state = 'aborted'
            return copy
          })
        },
        time: '00:00',
        duration: '00:00',
        start: performance.now(),
        file,
        videoSrc: URL.createObjectURL(file),
        state: 'configuration',
        progress: 0,
        width: 640,
        height: 360,
        framesPerChunk: 100,
      }
      const newProgresses = [...progresses, progress]
      return newProgresses
    })
  }

  function dropHandler(event: React.DragEvent) {
    event.preventDefault()
    setDropping(false)
    for (const file of event.dataTransfer.files) addVideoProgress(file)
  }

  const copyProgresses = (progresses: VideoProgress[]) => [...progresses.map(progress => ({ ...progress }))]

  const [ dropping, setDropping ] = useState(false)
  const [ progresses, setProgresses ] = useState<VideoProgress[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const notAbortedProgresses = progresses.filter(v => v.state != 'aborted')

  return (
    <div className='max-w-[512px] mx-auto'>
      <button
        id='convert'
        onClick={() => inputRef.current?.click()}
        onDragLeave={() => setDropping(false)}
        onDragOver={event => (event.preventDefault(), setDropping(true))}
        onDrop={dropHandler}
        className={`block w-full cursor-pointer select-none bg-green-400 dark:bg-green-500 hover:brightness-90 dark:hover:brightness-75 border-4 border-green-500 dark:border-green-800 rounded-3xl p-4 ${dropping ? 'brightness-90 dark:brightness-75' : ''}`}
      >
        <input type='file' ref={inputRef} onChange={() => { for (const file of inputRef.current?.files || []) addVideoProgress(file) }} multiple hidden />
        <svg xmlns='http://www.w3.org/2000/svg' width='100%' height={80} viewBox='-60 -120 120 120' fill='none'>
          <path d='M-54-18a12,12,0,0,0,12,12H42a12,12,0,0,0,12-12M0-32v-80m-24,24l24-24l24,24' strokeWidth={6} strokeLinecap='round' strokeLinejoin='round' className='stroke-green-600 dark:stroke-green-700' />
        </svg>
        <span className='block my-2 text-lime-950'>
          클릭하거나 파일을 드롭하세요<br />
          (Powered By FFmpeg)
        </span>
      </button>
      {notAbortedProgresses.length ? <ul className='mt-2 bg-yellow-400 p-2 border-4 rounded-3xl border-yellow-600'>{notAbortedProgresses.map((progress, rawI) => (i => <Fragment key={`a${i}`}>
        {notAbortedProgresses[rawI - 1] ? <hr className='m-4 dark:border-gray-800' /> : []}
        <li className='text-black text-left h-[90px] relative'>
          <div className='float-left relative w-[160px] h-[90px]'>
            <video src={progress.videoSrc} id={`video-${i}`} onContextMenu={event => event.preventDefault()} onError={() => (document.getElementById(`progress-${i}`) || { hidden: false }).hidden = false} className='rounded-xl w-full h-full' />
            <div id={`progress-${i}`} hidden className='absolute inset-0 leading-[100%]'>{`${(progress.progress * 100).toFixed(3)}%`}</div>
          </div>
          <div className='p-2 w-[calc(100%-var(--spacing)*8-160px)] text-ellipsis whitespace-nowrap overflow-hidden'>{progress.name}</div>
          <button onClick={() => setProgresses(progresses => {
            const copy = copyProgresses(progresses)
            copy[i].checkAbort = !copy[i].checkAbort
            return copy
          })} className='absolute w-8 h-8 right-0 top-1 cursor-pointer rounded-full before:absolute before:inset-0 before:duration-250 before:scale-0 before:rounded-full before:bg-gray-500 hover:before:scale-100 before:opacity-25'>
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='-16 -16 32 32' className='relative'>
              <path d='M-10-10l20,20m0-20l-20,20' fill='none' stroke='#111' />
            </svg>
          </button>
          <div className='absolute w-18.5 h-8.5 p-1 left-full top-1 bg-background rounded-lg border border-gray-200 dark:border-gray-800' hidden={!progress.checkAbort}>
            <button onClick={progress.abort} className='bg-red-400 w-16 rounded-sm cursor-pointer hover:bg-red-500'>중지하기</button>
          </div>
          {progress.state == 'configuration' ? <>
            <form action={() => void extractFrames(progress)} className='float-left p-2'>
              <button type='submit' className='absolute w-8 h-8 right-0 top-10 cursor-pointer rounded-full before:absolute before:inset-0 before:duration-250 before:scale-0 before:rounded-full before:bg-gray-500 hover:before:scale-100 before:opacity-25'>
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='-16 -16 32 32' className='relative'>
                  <path d='M-10,0l8,10l12-20' fill='none' stroke='var(--color-green-700)' />
                </svg>
              </button>
              <input type='number' id={`width-${i}`} name='width' min={1} step={1} value={Number.isNaN(Number(progress.width)) ? '' : progress.width} placeholder='너비' required onChange={event => setProgresses(progresses => {
                const copy = copyProgresses(progresses)
                copy[i].width = parseInt(event.target.value)
                return copy
              })} className='w-12 bg-amber-500 p-0.5 rounded-sm' />
              <label htmlFor={`width-${i}`}>×</label>
              <input type='number' id={`height-${i}`} name='height' min={1} step={1} value={Number.isNaN(Number(progress.height)) ? '' : progress.height} placeholder='높이' required onChange={event => setProgresses(progresses => {
                const copy = copyProgresses(progresses)
                copy[i].height = parseInt(event.target.value)
                return copy
              })} className='w-12 bg-amber-500 p-0.5 rounded-sm' />
              <div className='inline-block pl-2'></div>
              <input type='number' id={`fps-${i}`} name='fps' min={Number.MIN_VALUE} step={Number.MIN_VALUE} value={Number.isNaN(Number(progress.fps)) ? '' : progress.fps} onChange={event => setProgresses(progresses => {
                const copy = copyProgresses(progresses)
                copy[i].fps = parseInt(event.target.value)
                return copy
              })} placeholder='자동' className='w-12 bg-amber-500 p-0.5 rounded-sm' />
              <label htmlFor={`fps-${i}`}> FPS</label>
              <button type='button' onClick={() => {
                const dialog = document.getElementById(`options-${i}`)
                if (dialog instanceof HTMLDialogElement) dialog.showModal()
              }} className='ml-2 bg-amber-500 p-0.5 rounded-sm cursor-pointer'>기타 설정</button>
            </form>
          </> : <>
            <div className='float-left relative mx-2 w-[calc(100%-var(--spacing)*4-160px)] h-8 rounded-sm bg-neutral-300'>
              <progress id={`progress-bar-${i}`} data-state={progress.state} className='block absolute w-full h-full inset-0 rounded-sm bg-neutral-300' value={progress.progress} />
              <div className='block absolute w-full h-full inset-0 leading-[calc(var(--spacing)*8)] px-1'>{progress.error}</div>
            </div>
            <time id={`time-current-${i}`} className='absolute left-40 top-18 px-2 text-sm'>{progress.time}</time>
            <time id={`time-duration-${i}`} className='absolute right-0 top-18 px-2 text-sm'>{progress.duration}</time>
          </>}
        </li>
        <dialog id={`options-${i}`} className='m-auto w-full max-w-96 h-72 rounded-2xl'>
          <h3 className='mt-4 text-3xl'>설정</h3>
          <dl className='text-left p-4'>
            <dt className='text-lg float-left mr-2'><label htmlFor={`width-detail-${i}`}>동영상 너비</label></dt>
            <dd className='mb-1'><input type='number' id={`width-detail-${i}`} name='width' min={1} step={1} placeholder='너비' value={Number.isNaN(Number(progress.width)) ? '' : progress.width} onChange={event => setProgresses(progresses => {
              const copy = copyProgresses(progresses)
              copy[i].width = parseInt(event.target.value)
              return copy
            })} className='w-12 bg-amber-500 p-0.5 rounded-sm' /></dd>
            <dt className='text-lg float-left mr-2'><label htmlFor={`height-detail-${i}`}>동영상 높이</label></dt>
            <dd className='mb-1'><input type='number' id={`height-detail-${i}`} name='height' min={1} step={1} placeholder='높이' value={Number.isNaN(Number(progress.height)) ? '' : progress.height} onChange={event => setProgresses(progresses => {
              const copy = copyProgresses(progresses)
              copy[i].height = parseInt(event.target.value)
              return copy
            })} className='w-12 bg-amber-500 p-0.5 rounded-sm' /></dd>
            <dt className='text-lg float-left mr-2'><label htmlFor={`fps-detail-${i}`}>동영상 FPS</label></dt>
            <dd className='mb-1'><input type='number' id={`fps-detail-${i}`} name='height' min={1} step={1} placeholder='FPS' value={Number.isNaN(Number(progress.fps)) ? '' : progress.fps} onChange={event => setProgresses(progresses => {
              const copy = copyProgresses(progresses)
              copy[i].fps = parseInt(event.target.value)
              return copy
            })} className='w-12 bg-amber-500 p-0.5 rounded-sm' /></dd>
            <dt className='text-lg float-left mr-2'><label htmlFor={`fpc-detail-${i}`}>오브젝트 당 프레임 수</label></dt>
            <dd className='mb-1'>
              <input type='number' id={`fpc-detail-${i}`} name='height' min={1} step={1} placeholder='정수' required value={Number.isNaN(Number(progress.framesPerChunk)) ? '' : progress.framesPerChunk} onChange={event => setProgresses(progresses => {
                const copy = copyProgresses(progresses)
                copy[i].framesPerChunk = parseInt(event.target.value)
                return copy
              })} className='w-12 bg-amber-500 p-0.5 rounded-sm' />
              <p>{/*부스트모드를 켜면 1, 아니면 높은 수 권장*/}이 값을 조정 시 버그가 발생할 수 있습니다.</p>
            </dd>
          </dl>
          <form method='dialog'>
            <button className='absolute w-8 h-8 right-2 top-2 cursor-pointer rounded-full before:absolute before:inset-0 before:duration-250 before:scale-0 before:rounded-full before:bg-gray-500 hover:before:scale-100 before:opacity-25'>
              <svg xmlns='http://www.w3.org/2000/svg' viewBox='-16 -16 32 32' className='relative'>
                <path d='M-10-10l20,20m0-20l-20,20' fill='none' stroke='#111' />
              </svg>
            </button>
          </form>
        </dialog>
      </Fragment>)(progresses.indexOf(progress)))}</ul> : []}
    </div>
  )
}
