'use client'

import { WorkerTarget, type Step } from '@/worker/target'
import { useEffect, useReducer, useRef, useState } from 'react'

interface ProgressAction {
  type: 'add' | 'delete'
  file: File
}

// const timeFormat = (time: number) => `${time < 3600 ? '' : `${Math.trunc(time / 3600).toString().padStart(2, '0')}:`}${Math.trunc(time % 3600 / 60).toString().padStart(2, '0')}:${Math.trunc(time % 60).toString().padStart(2, '0')}`
const timeFormat = (second: number) => [
  second >= 3600 ? second / 3600 : [], // Hours
  second % 3600 / 60,                  // Minutes
  second % 60,                         // Seconds
].flat().map(v => (~~v + '').padStart(2, '0')).join(':')

function NumberInput({ value, setValue, onChange, ...params }: Readonly<React.JSX.IntrinsicElements['input'] & {
  value?: number
  setValue(value: number): void
}>) {
  return (
    <input {...params} value={value == null || value != value ? '' : value} type='number' onChange={e => (setValue(+(e.target.value || NaN)), onChange?.(e))} className='inline-block w-12 bg-amber-500 p-0.5 rounded-sm' />
  )
}

function DetailNumberInput({ value, setValue, onChange, children, ...params }: Readonly<React.JSX.IntrinsicElements['input'] & {
  value?: number
  setValue(value: number): void
}>) {
  return (
    <dd className='mb-1'>
      <input {...params} value={value == null || value != value ? '' : value} type='number' onChange={e => (setValue(+(e.target.value || NaN)), onChange?.(e))} className='inline-block w-12 bg-amber-500 p-0.5 rounded-sm' />
      {children}
    </dd>
  )
}

function Label({ children, htmlFor }: Readonly<{
  children?: React.ReactNode
  htmlFor: string
}>) {
  return (
    <dt className='text-lg float-left mr-2'>
      <label htmlFor={htmlFor}>{children}</label>
    </dt>
  )
}

function Progress({ progressKey, file, onDeleted }: Readonly<{
  progressKey: React.Key
  file: File
  onDeleted(): void
}>) {
  const [ step, setStep ] = useState<Step>('config')

  const [ width, setWidth ] = useState(640)
  const [ height, setHeight ] = useState(360)
  const [ framerate, setFramerate ] = useState<number>()
  const [ frameHorizontal, setFrameHorizontal ] = useState(5)
  const [ frameVertical, setFrameVertical ] = useState(5)
  const [ divisionSize, setDivisionSize ] = useState<number>()

  const [ videoURL, setVideoURL ] = useState<string>()
  const [ progress, setProgress ] = useState(0)
  const [ checkAbort, setCheckAbort ] = useState(false)
  const [ videoError, setVideoError ] = useState(false)

  const [ startTime, setStartTime ] = useState(0)
  const [ extractTime, setExtractTime ] = useState(0)
  const [ extractDuration, setExtractDuration ] = useState(0)
  const [ extractError, setExtractError ] = useState<string>()

  const videoRef = useRef<HTMLVideoElement>(null)
  const workerRef = useRef<WorkerTarget>(null)

  useEffect(() => {
    const video = videoRef.current
    if (video && video.duration) video.currentTime = progress * video.duration
  }, [ progress ])

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setVideoURL(videoURL => {
      if (videoURL) URL.revokeObjectURL(videoURL)
      return url
    })
    return () => URL.revokeObjectURL(url)
  }, [ file ])

  const isConfiguration = step == 'config'
  useEffect(() => {
    if (step == 'config' || workerRef.current || extractError != null) return

    const target = new WorkerTarget(new Worker(new URL('@/worker', import.meta.url)))
    const anchor = document.createElement('a')

    target.addEventListener('step', ({ data }) => {
      setStep(data)
      if (data == 'done') {
        cancelAnimationFrame(raf)
        setExtractDuration(0)
      }
    })
    target.addEventListener('progress', ({ data }) => setProgress(data))
    target.addEventListener('file', async ({ data }) => {
      if (anchor.href) URL.revokeObjectURL(anchor.href)
      anchor.href = data
      anchor.download = file.name.replace(/(\.[^.]*)?$/, '.ent')
      anchor.click()
    })

    target.addEventListener('error', ({ data }) => (setStep('error'), setExtractError(data)))
    target.worker.addEventListener('error', () => (setStep('error'), setExtractError('변환에 실패했습니다.')))

    target.postMessage('video', {
      file,
      width,
      height,
      framerate,
      frameHorizontal,
      frameVertical,
      divisionSize: divisionSize && divisionSize * 1024 * 1024,
    })

    let raf = requestAnimationFrame(function frame(time) {
      time -= startTime
      setExtractTime(time / 1000)
      setProgress(progress => (setExtractDuration(progress ? (time / progress - time) / 1000 : 0), progress))
      raf = requestAnimationFrame(frame)
    })

    return () => {
      URL.revokeObjectURL(anchor.href)
      target.worker.terminate()
      cancelAnimationFrame(raf)
    }
  }, [ isConfiguration, extractError ]) // eslint-disable-line react-hooks/exhaustive-deps

  function showModal() {
    const dialog = document.getElementById(`options-${progressKey}`)
    if (dialog instanceof HTMLDialogElement) dialog.showModal()
  }

  return (
    <div className='relative min-h-[90px]'>
      <div className='float-left relative w-[160px] h-[90px]'>
        <video
          src={videoURL}
          hidden={videoError}
          onContextMenu={event => event.preventDefault()}
          onError={() => setVideoError(!videoError)}
          className='rounded-xl w-full h-full'
          ref={videoRef}
        />
        <div hidden={!videoError} className='absolute inset-0 flex justify-center items-center'>{`${(progress * 100).toFixed(3)}%`}</div>
      </div>
      <div className='p-2 w-[calc(100%-var(--spacing)*8-160px)] text-ellipsis whitespace-nowrap overflow-hidden'>{file.name}</div>
      <button onClick={() => setCheckAbort(!checkAbort)} className='absolute clear-both w-8 h-8 right-0 top-1 cursor-pointer rounded-full before:absolute before:inset-0 before:duration-250 before:scale-0 before:rounded-full before:bg-gray-500 hover:before:scale-100 before:opacity-25'>
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='-16 -16 32 32' className='relative'>
          <path d='M-10-10l20,20m0-20l-20,20' fill='none' stroke='#111' />
        </svg>
      </button>
      <div className='absolute clear-both w-18.5 h-8.5 p-1 left-full top-1 bg-background rounded-lg border border-gray-200 dark:border-gray-800' hidden={!checkAbort}>
        <button onClick={onDeleted} className='bg-red-400 w-16 rounded-sm cursor-pointer hover:bg-red-500'>중지하기</button>
      </div>
      {step == 'config' ? <>
        <form action={() => (setStartTime(performance.now()), setStep('extract'))} className='w-[calc(100%-var(--spacing)*8-160px)] float-left p-2'>
          <NumberInput id={`width-${progressKey}`} value={width} setValue={setWidth} min={1} step={1} placeholder='너비' required />
          <label htmlFor={`width-${progressKey}`}>×</label>
          <NumberInput id={`height-${progressKey}`} value={height} setValue={setHeight} min={1} step={1} placeholder='높이' required />
          <div className='inline-block pl-2' />
          <NumberInput id={`framerate-${progressKey}`} value={framerate} setValue={setFramerate} min={Number.MIN_VALUE} step='any' placeholder='자동' />
          <label htmlFor={`framerate-${progressKey}`}> FPS</label>
          <button type='button' onClick={showModal} className='ml-2 bg-amber-500 p-0.5 rounded-sm cursor-pointer'>기타 설정</button>
          <button type='submit' className='absolute clear-both w-8 h-8 right-0 top-10 cursor-pointer rounded-full before:absolute before:inset-0 before:duration-250 before:scale-0 before:rounded-full before:bg-gray-500 hover:before:scale-100 before:opacity-25'>
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='-16 -16 32 32' className='relative'>
              <path d='M-10,0l8,10l12-20' fill='none' stroke='var(--color-green-700)' />
            </svg>
          </button>
        </form>
        <dialog id={`options-${progressKey}`} className='m-auto w-96 h-72 rounded-2xl'>
          <h3 className='text-center mt-4 text-3xl'>설정</h3>
          <dl className='p-4'>
            <Label htmlFor={`width-detail-${progressKey}`}>동영상 너비</Label>
            <DetailNumberInput id={`width-detail-${progressKey}`} value={width} setValue={setWidth} min={1} step={1} placeholder='너비' required />
            <Label htmlFor={`height-detail-${progressKey}`}>동영상 높이</Label>
            <DetailNumberInput id={`height-detail-${progressKey}`} value={height} setValue={setHeight} min={1} step={1} placeholder='높이' required />
            <Label htmlFor={`framerate-detail-${progressKey}`}>동영상 FPS</Label>
            <DetailNumberInput id={`framerate-detail-${progressKey}`} value={framerate} setValue={setFramerate} min={Number.MIN_VALUE} step='any' placeholder='자동' />
            <Label htmlFor={`frame-horizontal-${progressKey}`}>모양 당 프레임 가로</Label>
            <DetailNumberInput id={`frame-horizontal-${progressKey}`} value={frameHorizontal} setValue={setFrameHorizontal} min={1} step={1} placeholder='정수' required />
            <Label htmlFor={`frame-vertical-${progressKey}`}>모양 당 프레임 세로</Label>
            <DetailNumberInput id={`frame-vertical-${progressKey}`} value={frameVertical} setValue={setFrameVertical} min={1} step={1} placeholder='정수' required />
            <Label htmlFor={`division-size-${progressKey}`}>분할 내보내기 용량</Label>
            <DetailNumberInput id={`division-size-${progressKey}`} value={divisionSize} setValue={setDivisionSize} min={Number.MIN_VALUE} step='any' placeholder='없음'>
              <label htmlFor={`division-size-${progressKey}`}>MiB</label>
            </DetailNumberInput>
          </dl>
          <form method='dialog'>
            <button className='absolute w-8 h-8 right-2 top-2 cursor-pointer rounded-full before:absolute before:inset-0 before:duration-250 before:scale-0 before:rounded-full before:bg-gray-500 hover:before:scale-100 before:opacity-25'>
              <svg xmlns='http://www.w3.org/2000/svg' viewBox='-16 -16 32 32' className='relative'>
                <path d='M-10-10l20,20m0-20l-20,20' fill='none' stroke='#111' />
              </svg>
            </button>
          </form>
        </dialog>
      </> : <>
        <div className='float-left relative mx-2 w-[calc(100%-var(--spacing)*4-160px)] h-8 rounded-sm bg-neutral-300'>
          <progress data-step={step} className='block absolute w-full h-full inset-0 rounded-sm bg-neutral-300' value={progress} />
          <div className='block absolute w-full h-full inset-0 leading-[calc(var(--spacing)*8)] px-1'>{extractError}</div>
        </div>
        <time className='absolute left-40 top-18 px-2 text-sm'>{timeFormat(extractTime)}</time>
        <time className='absolute right-0 top-18 px-2 text-sm'>{timeFormat(extractDuration)}</time>
      </>}
    </div>
  )
}

export default function Button() {
  const [ dropping, setDropping ] = useState(false)
  const [ progresses, dispatch ] = useReducer<File[], [ProgressAction]>((state, { type, file }) => {
    switch (type) {
      case 'add': return [...state, file]
      case 'delete': return state.filter(prevFile => prevFile != file)
    }
  }, [])
  const countRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileMapRef = useRef(new WeakMap<File, React.Key>)

  function fileAddHandler({ target: { files } }: React.ChangeEvent<HTMLInputElement>) {
    if (!files) return
    for (const file of files) dispatch({ type: 'add', file })
  }

  function dropHandler(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setDropping(false)

    const { dataTransfer: { files } } = event
    if (!files) return
    for (const file of files) dispatch({ type: 'add', file })
  }

  return (
    <div className='max-w-[512px] mx-auto'>
      <button
        onClick={() => inputRef.current?.click()}
        onDragLeave={() => setDropping(false)}
        onDragOver={event => (event.preventDefault(), setDropping(true))}
        onDrop={dropHandler}
        className={`block w-full cursor-pointer select-none bg-green-400 dark:bg-green-500 hover:brightness-90 dark:hover:brightness-75 border-4 border-green-500 dark:border-green-800 rounded-3xl p-4 ${dropping ? 'brightness-90 dark:brightness-75' : ''}`}
      >
        <input type='file' ref={inputRef} onChange={fileAddHandler} multiple hidden />
        <svg xmlns='http://www.w3.org/2000/svg' width='100%' height={80} viewBox='-60 -120 120 120' fill='none'>
          <path d='M-54-18a12,12,0,0,0,12,12H42a12,12,0,0,0,12-12M0-32v-80m-24,24l24-24l24,24' strokeWidth={6} strokeLinecap='round' strokeLinejoin='round' className='stroke-green-600 dark:stroke-green-700' />
        </svg>
        <span className='block my-2 text-lime-950'>
          클릭하거나 파일을 드롭하세요<br />
          (Powered By FFmpeg)
        </span>
      </button>
      {progresses.length ? (
        <ul className='mt-2 bg-yellow-400 p-2 border-4 rounded-3xl border-yellow-600'>{progresses.map((file, i) => (key => (
          <li
            key={key}
            className='text-black text-left'
          >
            {i ? <hr className='m-4 dark:border-gray-800 clear-both' /> : void 0}
            <Progress file={file} progressKey={key} onDeleted={() => dispatch({ type: 'delete', file })} />
          </li>
        ))(fileMapRef.current.get(file) || (key => (fileMapRef.current.set(file, key), key))(++countRef.current)))}
        </ul>
      ) : void 0}
    </div>
  )
}
