import generateHash from './hash'

export interface Chunk {
  path: string
  name: string
  width: number
  height: number
  row: number
}

export interface ProjectInit {
  name: string
  chunks: Chunk[],
  soundPath?: string
  soundName?: string
  col: number
  frames: number
  duration: number
  isOneObject: boolean
}

class Object {
  id = generateHash(4)
  name
  script
  objectType = 'sprite'
  rotateMethod = 'free'
  scene = '7dwq'
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
        filename: sound.name,
        name,
      })),
    }
    this.selectedPictureId = this.sprite.pictures[selectedPicture].id
  }
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

  constructor({
    type,
    params,
    statements,
    x = 0,
    y = 0,
  }: {
    type: string
    params: (Script | string | number | null)[]
    statements: Script[][]
    x?: number
    y?: number
  }) {
    this.type = type
    this.params = params
    this.statements = statements
    this.x = x
    this.y = y
  }
}

const createObject = ({ name, chunks, soundPath, soundName, col, duration, frames, isOneObject }: ProjectInit) => isOneObject ? [new Object({
  name,
  scaleX: 480 / chunks[0].width,
  scaleY: 270 / chunks[0].height,
  script: [[new Script({
    type: 'when_run_button_click',
    params: [null],
    statements: [],
  }), new Script({
    type: 'start_scene',
    params: ['7dwq', null],
    statements: [],
  })], [new Script({
    type: 'when_scene_start',
    params: [null],
    statements: [],
    y: 76,
  }), new Script({
    type: 'show',
    params: [null],
    statements: [],
  }), new Script({
    type: 'choose_project_timer_action',
    params: [null, 'START', null, null],
    statements: [],
  }), new Script({
    type: 'sound_something_with_block',
    params: [new Script({
      type: 'number',
      params: [1],
      statements: [],
    }), null],
    statements: [],
  }), new Script({
    type: 'repeat_while_true',
    params: [new Script({
      type: 'boolean_basic_operator',
      params: [new Script({
        type: 'get_project_timer_value',
        params: [null, null],
        statements: [],
      }), 'GREATER_OR_EQUAL', new Script({
        type: 'get_variable',
        params: ['49r4', null],
        statements: [],
      })],
      statements: [],
    }), 'until', null],
    statements: [[new Script({
      type: 'change_to_some_shape',
      params: [new Script({
        type: 'calc_basic',
        params: [new Script({
          type: 'calc_operation',
          params: [null, new Script({
            type: 'calc_basic',
            params: [new Script({
              type: 'calc_basic',
              params: [new Script({
                type: 'get_project_timer_value',
                params: [null, null],
                statements: [],
              }), 'MULTI', new Script({
                type: 'get_variable',
                params: ['qro9', null],
                statements: [],
              })],
              statements: [],
            }), 'DIVIDE', new Script({
              type: 'get_variable',
              params: ['49r4', null],
              statements: [],
            })],
            statements: [],
          }), null, 'floor'],
          statements: [],
        }), 'PLUS', new Script({
          type: 'number',
          params: [1],
          statements: [],
        })],
        statements: [],
      })],
      statements: [],
    })]],
  }), new Script({
    type: 'hide',
    params: [null],
    statements: [],
  })]],
  pictures: chunks.map(({ path, name, width, height }) => ({ path, name, width, height })), // Remove the row property
  sounds: soundPath && soundName ? [{
    id: generateHash(4),
    duration,
    path: soundPath,
    name: soundName,
  }] : [],
})] : chunks.map((chunk, i) => new Object({
  name: chunk.name,
  scaleX: 480 * col / chunk.width,
  scaleY: 270 * (chunk.row - (chunks[i - 1]?.row || 0)) / chunk.height,
  script: [[new Script({
    type: 'when_scene_start',
    params: [null],
    statements: [],
  }), new Script({
    type: 'show',
    params: [null],
    statements: [],
  }), new Script({
    type: 'repeat_inf',
    params: [null, null],
    statements: [[new Script({
      type: 'set_variable',
      params: ['yri3', new Script({
        type: 'calc_operation',
        params: [null, new Script({
          type: 'calc_basic',
          params: [new Script({
            type: 'calc_basic',
            params: [new Script({
              type: 'calc_basic',
              params: [new Script({
                type: 'get_project_timer_value',
                params: [null, null],
                statements: [],
              }), 'MINUS', new Script({
                type: 'number',
                params: [(chunks[i - 1]?.row || 0) * col * duration / frames],
                statements: [],
              })],
              statements: [],
            }), 'MULTI', new Script({
              type: 'get_variable',
              params: ['qro9', null],
              statements: [],
            })],
            statements: [],
          }), 'DIVIDE', new Script({
            type: 'get_variable',
            params: ['49r4', null],
            statements: [],
          })],
          statements: [],
        }), null, 'floor'],
        statements: [],
      }), null],
      statements: [],
    }), new Script({
      type: 'locate_xy',
      params: [new Script({
        type: 'calc_basic',
        params: [new Script({
          type: 'number',
          params: [-480],
          statements: [],
        }), 'MULTI', new Script({
          type: 'quotient_and_mod',
          params: [null, new Script({
            type: 'get_variable',
            params: ['yri3', null],
            statements: [],
          }), null, new Script({
            type: 'get_variable',
            params: ['voni', null],
            statements: [],
          }), null, 'MOD'],
          statements: [],
        })],
        statements: [],
      }), new Script({
        type: 'calc_basic',
        params: [new Script({
          type: 'number',
          params: [270],
          statements: [],
        }), 'MULTI', new Script({
          type: 'quotient_and_mod',
          params: [null, new Script({
            type: 'get_variable',
            params: ['yri3', null],
            statements: [],
          }), null, new Script({
            type: 'get_variable',
            params: ['voni', null],
            statements: [],
          }), null, 'QUOTIENT'],
          statements: [],
        })],
        statements: [],
      }), null],
      statements: [],
    })]],
  })]],
  pictures: [chunk],
  sounds: [],
})).concat([new Object({
  name,
  scaleX: 1,
  scaleY: 1,
  script: [[new Script({
    type: 'when_run_button_click',
    params: [null],
    statements: [],
  }), new Script({
    type: 'start_scene',
    params: ['7dwq', null],
    statements: [],
  })], [new Script({
    type: 'when_scene_start',
    params: [null],
    statements: [],
    y: 76,
  }), new Script({
    type: 'choose_project_timer_action',
    params: [null, 'START', null, null],
    statements: [],
  }), new Script({
    type: 'sound_something_with_block',
    params: [new Script({
      type: 'number',
      params: [1],
      statements: [],
    }), null],
    statements: [],
  })]],
  pictures: [{
    path: './bower_components/entry-js/images/_1x1.png',
    name,
    width: 1,
    height: 1,
  }],
  sounds: soundPath && soundName ? [{
    id: generateHash(4),
    duration,
    path: soundPath,
    name: soundName,
  }] : [],
})])

export const createProject = ({ name, chunks, soundPath, soundName, col, frames, duration, isOneObject }: ProjectInit) => ({
  objects: createObject({ name, chunks, soundPath, soundName, col, frames, duration, isOneObject }),
  scenes: [{
    id: '7dwq',
    name: '장면 1',
  }],
  variables: [{
    name: 'col',
    id: 'voni',
    visible: false,
    value: col,
    variableType: 'variable',
    isCloud: false,
    isRealTime: false,
    cloudDate: false,
    object: null,
    x: 0,
    y: 0,
  }, {
    name: 'frs',
    id: 'qro9',
    visible: false,
    value: frames,
    variableType: 'variable',
    isCloud: false,
    isRealTime: false,
    cloudDate: false,
    object: null,
    x: 0,
    y: 0,
  }, {
    name: 'num',
    id: 'yri3',
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
    name: 'dur',
    id: '49r4',
    visible: false,
    value: duration,
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
  name,
})
