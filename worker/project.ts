import generateHash from './hash'

class Object {
  id = generateHash(4)
  name
  script
  objectType = 'sprite'
  rotateMethod = 'free'
  scene = '7dwq' // 장면 1
  sprite
  selectedPictureId
  lock = false
  entity

  constructor({
    name,
    script,
    scaleX,
    scaleY,
    selectedPicture = 0,
    pictures,
    sounds,
  }: {
    name: string
    script: Script[][]
    scaleX: number
    scaleY: number
    selectedPicture?: number
    pictures: {
      path: string
      name: string
      width: number
      height: number
    }[]
    sounds: {
      id: string
      duration: number
      path: string
      hash: string
      name: string
    }[]
  }) {
    this.name = name
    this.script = JSON.stringify(script)
    this.entity = {
      x: 0,
      y: 0,
      regX: 240 / scaleX,
      regY: 135 / scaleY,
      scaleX,
      scaleY,
      rotation: 0,
      direction: 90,
      width: pictures[0].width,
      height: pictures[0].height,
      font: 'undefinedpx ',
      visible: false,
    }
    this.sprite = {
      pictures: pictures.map(({ width, height, path, name }) => ({
        id: generateHash(4),
        dimension: {
          width,
          height,
        },
        fileurl: path,
        filename: name,
        name,
        imageType: 'png',
      })),
      sounds: sounds.map(sound => ({
        duration: Math.round(sound.duration * 10) / 10,
        ext: '.mp3',
        id: sound.id,
        fileurl: sound.path,
        filename: sound.hash,
        name: sound.name,
      })),
    }
    this.selectedPictureId = this.sprite.pictures[selectedPicture].id
  }
}

interface ScriptInit {
  type: string
  params?: (Script | string | number | null)[]
  statements?: Script[][]
  x?: number
  y?: number
}

class Script {
  id = generateHash(4)
  x
  y
  type
  params
  statements
  movable = null
  deletable = 1
  emphasized = false
  readOnly = null
  copyable = true
  assemble = true
  extensions = []

  constructor(type: string, params?: (Script | string | number | null)[], statements?: Script[][])
  constructor(init: ScriptInit, params?: (Script | string | number | null)[], statements?: Script[][])
  constructor(init: string | ScriptInit, initParams = [], initStatements = []) {
    const {
      type,
      params = initParams,
      statements = initStatements,
      x = 0,
      y = 0,
    } = typeof init == 'string' ? { type: init } : init
    this.type = type
    this.params = params
    this.statements = statements
    this.x = x
    this.y = y
  }
}

interface ProjectInit {
  name: string
  width: number
  height: number
  chunks: string[]
  frames: number
  framerate: number
  frameHorizontal: number
  frameVertical: number
  soundHash?: string
  soundPath?: string
  duration: number
}

const createObject = ({ name, width, height, chunks, frames, framerate, frameHorizontal, frameVertical, soundHash, soundPath, duration }: ProjectInit) => [new Object({
  name,
  scaleX: 480 / width,
  scaleY: 270 / height,
  script: [[
    new Script('when_run_button_click'),
    new Script('show'),
    new Script('choose_project_timer_action', [null, 'START']),
    new Script('sound_something_with_block', [new Script('number', [1])]),
    new Script('repeat_inf', [], [[
      new Script('set_variable', [/* num */'k334', new Script('calc_operation', [null, new Script('calc_basic', [new Script('get_project_timer_value'), 'MULTI', new Script('number', [framerate])]), null, 'floor'])]),
      new Script('_if', [new Script('boolean_basic_operator', [new Script('get_variable', [/* num */'k334']), 'GREATER', new Script('number', [frames])])], [[
        new Script('stop_repeat'),
      ]]),
      new Script('locate_xy', [new Script('calc_basic', [new Script('number', [-480]), 'MULTI', new Script('quotient_and_mod', [null, new Script('get_variable', [/* num */'k334']), null, new Script('number', [frameHorizontal]), null, 'MOD'])]), new Script('calc_basic', [new Script('number', [270]), 'MULTI', new Script('quotient_and_mod', [null, new Script('quotient_and_mod', [null, new Script('get_variable', [/* num */'k334']), null, new Script('number', [frameHorizontal]), null, 'QUOTIENT']), null, new Script('number', [frameVertical]), null, 'MOD'])])]),
      new Script('change_to_some_shape', [new Script('calc_basic', [new Script('number', [1]), 'PLUS', new Script('quotient_and_mod', [null, new Script('get_variable', [/* num */'k334']), null, new Script('number', [frameHorizontal * frameVertical]), null, 'QUOTIENT'])])]),
    ]]),
    new Script('hide'),
  ]],
  pictures: chunks.map(hash => ({
    name: hash,
    path: `temp/${hash.substring(0, 2)}/${hash.substring(2, 4)}/image/${hash}.png`,
    width: width * frameHorizontal,
    height: height * frameVertical,
  })),
  sounds: soundPath && soundHash ? [{
    id: generateHash(4),
    name,
    duration,
    path: soundPath,
    hash: soundHash,
  }]: [],
})]

const createProject = ({ name, width, height, chunks, frames, framerate, frameHorizontal, frameVertical, soundHash, soundPath, duration }: ProjectInit) => ({
  name,
  objects: createObject({ name, width, height, chunks, frames, framerate, frameHorizontal, frameVertical, soundHash, soundPath, duration }),
  scenes: [{
    id: '7dwq',
    name: '장면 1',
  }],
  variables: [{
    name: 'num',
    id: 'k334',
    visible: false,
    value: 0,
    variableType: 'variable',
    isCloud: false,
    isRealTime: false,
    cloudDate: false,
    object: null,
    x: 0,
    y: 0,
  }, {
    name: '초시계',
    id: 'brih',
    visible: false,
    value: 0,
    variableType: 'timer',
    isCloud: false,
    isRealTime: false,
    cloudDate: false,
    object: null,
    x: -Number.MAX_VALUE,
    y: -Number.MAX_VALUE,
  }, {
    name: ' 대답 ',
    id: '1vu8',
    visible: false,
    value: 0,
    variableType: 'answer',
    isCloud: false,
    isRealTime: false,
    cloudDate: false,
    object: null,
    x: 0,
    y: 0,
  }],
  messages: [],
  functions: [],
  tables: [],
  speed: 60,
  interface: {
    menuWidth: 280,
    canvasWidth: 480,
    object: '7y0y',
  },
  expansionBlocks: [],
  aiUtilizeBlocks: [],
  hardwareLiteBlocks: [],
  externalModules: [],
  externalModulesLite: [],
  isPracticalCourse: false,
})

export default createProject
