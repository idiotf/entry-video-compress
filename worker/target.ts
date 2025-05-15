export interface ParentMessages {
  video: {
    file: File
    width: number
    height: number
    framerate?: number
    frameHorizontal: number
    frameVertical: number
    divisionSize?: number
    memorySaving: boolean
  }
}

export interface WorkerMessages {
  step: Step
  progress: number
  file: string
  error: string | null
}

export type Step = 'config' | 'extract' | 'generating' | 'done' | 'error'

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface WorkerTarget extends EventTarget {
  addEventListener<K extends keyof WorkerMessages>(type: K, listener: (this: WorkerTarget, ev: MessageEvent<WorkerMessages[K]>) => any, options?: boolean | AddEventListenerOptions): void // eslint-disable-line @typescript-eslint/no-explicit-any
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void
  removeEventListener<K extends keyof WorkerMessages>(type: K, listener: (this: WorkerTarget, ev: MessageEvent<WorkerMessages[K]>) => any, options?: boolean | EventListenerOptions): void // eslint-disable-line @typescript-eslint/no-explicit-any
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class WorkerTarget extends EventTarget {
  constructor(public readonly worker: Worker) {
    super()
    worker.addEventListener('message', <K extends keyof WorkerMessages>({ data: [ type, data ] }: MessageEvent<[ K, WorkerMessages[K] ]>) => {
      this.dispatchEvent(new MessageEvent(type, { data }))
    })
  }

  postMessage<K extends keyof ParentMessages>(type: K, data: ParentMessages[K]): void
  postMessage<K extends keyof ParentMessages>(type: K, data: ParentMessages[K], transfer: Transferable[]): void
  postMessage<K extends keyof ParentMessages>(type: K, data: ParentMessages[K], transfer: Transferable[] = []) {
    this.worker.postMessage([ type, data ], { transfer })
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface ParentTarget extends EventTarget {
  addEventListener<K extends keyof ParentMessages>(type: K, listener: (this: ParentTarget, ev: MessageEvent<ParentMessages[K]>) => any, options?: boolean | AddEventListenerOptions): void // eslint-disable-line @typescript-eslint/no-explicit-any
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void
  removeEventListener<K extends keyof ParentMessages>(type: K, listener: (this: ParentTarget, ev: MessageEvent<ParentMessages[K]>) => any, options?: boolean | EventListenerOptions): void // eslint-disable-line @typescript-eslint/no-explicit-any
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class ParentTarget extends EventTarget {
  constructor(public readonly target: WorkerGlobalScope & typeof globalThis) {
    super()
    target.addEventListener('message', <K extends keyof ParentMessages>({ data: [ type, data ] }: MessageEvent<[ K, ParentMessages[K] ]>) => {
      this.dispatchEvent(new MessageEvent(type, { data }))
    })
  }

  postMessage<K extends keyof WorkerMessages>(type: K, data: WorkerMessages[K]): void
  postMessage<K extends keyof WorkerMessages>(type: K, data: WorkerMessages[K], transfer: Transferable[]): void
  postMessage<K extends keyof WorkerMessages>(type: K, data: WorkerMessages[K], transfer: Transferable[] = []) {
    this.target.postMessage([ type, data ], { transfer })
  }
}
