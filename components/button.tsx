'use client'

import { WorkerTarget } from '@/worker/types'
import { useRef } from 'react'

export default function Button() {
  async function extractFrames() {
    const input = inputRef.current
    if (!input || !input.files) return
    for (const file of input.files) {
      const target = new WorkerTarget(new Worker(new URL('@/worker/extract', import.meta.url)))
      const data = await file.arrayBuffer()
      target.postMessage('video', {
        video: new Uint8Array(data),
        width: 640,
        height: 360,
        chunkLength: 20,
        name: file.name,
      }, [ data ])

      target.addEventListener('finalize', async ({ data }) => {
        const anchor = document.createElement('a')
        anchor.href = data
        anchor.download = file.name.replace(/(\..*)*$/, '.ent')
        anchor.click()
        URL.revokeObjectURL(data)
        target.worker.terminate()
      })
    }
  }

  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <button onClick={() => inputRef.current?.click()} className='block w-full bg-green-400 dark:bg-green-500 hover:brightness-90 dark:hover:brightness-75 border-4 border-green-500 dark:border-green-800 rounded-3xl max-w-[512px] mx-auto p-4'>
      <input type='file' ref={inputRef} onChange={extractFrames} multiple hidden aria-hidden />
      <svg xmlns='http://www.w3.org/2000/svg' width='100%' height={80} viewBox='-60 -120 120 120' fill='none'>
        <path d='M-54-18a12,12,0,0,0,12,12H42a12,12,0,0,0,12-12M0-32v-80m-24,24l24-24l24,24' strokeWidth={6} strokeLinecap='round' className='stroke-green-600 dark:stroke-green-700' />
      </svg>
      <span className='block my-2 text-lime-950'>
        파일 업로드하기<br />
        (Powered By FFmpeg)
      </span>
    </button>
  )
}
