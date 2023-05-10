<template>
  <main ref="contianer">
    <canvas ref="view" :class="{ 'drop-active': dropActive }" @drop="onDrop" @dragenter="onDragenter"
      @dragover="onDragover" @dragleave="onDragleave"></canvas>

    <div class="animation-controller">
      <el-collapse v-model="activeNames">
        <el-collapse-item title="Player" name="1" v-if="currenSpine">
          <div class="controller-item">
            <span class="demonstration">Animations</span>
            <el-select placeholder="---" v-model="currenSpine.currentAnimationName" @change="animiationSelectChnaged">
              <el-option v-for="item in currenSpine.animations" :key="item" :label="item" :value="item">
              </el-option>
            </el-select>
          </div>
          <div class="controller-item">
            <el-slider :show-tooltip="false" v-model="currenSpine.currentAnimationTrack" :step="0.01"
              :max="currenSpine.currentAnimationDuration" @input="onTrackTimeChanged" />
          </div>
          <div class="controller-item">
            <span class="demonstration">Duration</span>
            <span class="content">
              <el-input-number style="width: 100%;" :precision="2" v-model="currenSpine.currentAnimationTrack"
                :step="0.01" :max="currenSpine.currentAnimationDuration" @change="onTrackTimeChanged" /></span>
          </div>
          <div class="controller-item">
            <el-button-group style="width: 100%;">
              <el-button type="success" style="width: 50%;" @click="playAnimation">
                <IconPlay />
              </el-button>
              <el-button type="danger" style="width: 50%;" @click="stopAnimation">
                <IconStop />
              </el-button>
            </el-button-group>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>
  </main>
</template>

<script lang="ts">
import { Component, Vue, Ref } from 'vue-facing-decorator'
import * as PIXI from 'pixi.js';
import { Spine, TextureAtlas, settings } from 'pixi-spine';
import { AtlasAttachmentLoader, SkeletonJson, AnimationState } from 'pixi-spine/node_modules/@pixi-spine/runtime-3.7';
import SkeletonBinary from '@/spine/SkeletonBinary'
import IconPlay from '@/components/icons/IconPlay.vue'
import IconStop from '@/components/icons/IconStop.vue'

interface SpineData {
  animation: Spine
  state: AnimationState
  animations: string[]
  currentAnimationDuration: number
  currentAnimationTrack: number
  currentAnimationName: string | null
}

@Component({ components: { IconPlay, IconStop } })
export default class HomeView extends Vue {
  dropActive = false

  app: PIXI.Application | null = null

  @Ref
  readonly contianer!: HTMLElement

  @Ref
  readonly view!: HTMLCanvasElement

  interval: number | undefined

  activeNames: string[] = ['1']

  currenSpine: SpineData | null = null

  lastManualUpdate: number = 0

  get screenWidth(): number {
    return window.innerWidth
  }

  get screenHeight(): number {
    return window.innerHeight
  }

  loadFiles(files: File[]) {
    const skelRegex = /\.(skel|json)(\.bytes|\.txt)?$/i;
    const atlasRegex = /\.atlas(\.txt)?$/i;
    const textureRegex = /\.png$/i;

    const skelFile = files.find(file => skelRegex.test(file.name));
    const atlasFile = files.find(file => atlasRegex.test(file.name));
    const textureFiles = files.filter(file => textureRegex.test(file.name));

    if (!skelFile || !atlasFile || textureFiles.length === 0) {
      return;
    }

    const isJson = /\.json(\.bytes|\.txt)?$/i.test(skelFile.name)

    const loader = new PIXI.Loader()
    loader.add('Doll-atlas', URL.createObjectURL(atlasFile))
    if (isJson) {
      loader.add('Doll-json', URL.createObjectURL(skelFile), {
        xhrType: PIXI.LoaderResource.XHR_RESPONSE_TYPE.TEXT
      })
    }
    else {
      loader.add('Doll-skel', URL.createObjectURL(skelFile), {
        xhrType: PIXI.LoaderResource.XHR_RESPONSE_TYPE.BUFFER,
      })
    }

    for (const textureFile of textureFiles) {
      loader.add(textureFile.name, URL.createObjectURL(textureFile), {
        loadType: PIXI.LoaderResource.LOAD_TYPE.IMAGE,
        xhrType: PIXI.LoaderResource.XHR_RESPONSE_TYPE.BLOB,
      })
    }

    loader.load(this.onSpineDataLoaded)
  }

  mounted(): void {
    this.app = new PIXI.Application({
      backgroundAlpha: 0,
      antialias: false,
      resolution: 1,
      autoDensity: false,
      view: this.view
    })
    this.app.resizeTo = this.contianer
  }

  playAnimation(): void {
    clearInterval(this.interval)
    if (settings.GLOBAL_AUTO_UPDATE && this.currenSpine && this.currenSpine.currentAnimationName) {
      this.currenSpine.animation.state.setAnimation(0, this.currenSpine.currentAnimationName, true)
    }
    else {
      settings.GLOBAL_AUTO_UPDATE = true
    }
    this.interval = setInterval(this.trackerCallback, 1000 / 30)
  }

  stopAnimation(): void {
    clearInterval(this.interval)
    if (this.currenSpine && this.currenSpine.currentAnimationName) {
      this.currenSpine.animation.state.clearTracks()
      this.currenSpine.animation.skeleton.setToSetupPose()
      this.currenSpine.currentAnimationTrack = 0
    }
    settings.GLOBAL_AUTO_UPDATE = true
  }

  onSpineDataLoaded(loader: PIXI.Loader, resources: Partial<Record<string, PIXI.LoaderResource>>): void {
    const atlasText = resources['Doll-atlas']?.data as string
    const atlas = new TextureAtlas(atlasText, (path, loaderFunction) => {
      const textureResource = resources[path]
      if (textureResource === undefined) {
        throw 'texture resource not found: ' + path
      }
      const texture = PIXI.BaseTexture.from(textureResource.data as HTMLImageElement)
      loaderFunction(texture)
    })

    const atlasAttachmentLoader = new AtlasAttachmentLoader(atlas)
    const skeletonJson = new SkeletonJson(atlasAttachmentLoader)
    const skeletonBinary = new SkeletonBinary(new Uint8Array(resources['Doll-skel']?.data))
    skeletonBinary.initJson()
    console.log('json ', skeletonBinary.json)
    const skeletonData = skeletonJson.readSkeletonData(skeletonBinary.json)

    const animation = new Spine(skeletonData)
    animation.x = this.view.width / 2
    animation.y = this.view.height / 2
    animation.interactive = true
    animation.on('click', (event: PIXI.InteractionEvent) => {
      console.log('e', event)
      console.log('indexOf', this.app?.stage.children.indexOf(animation))
    })

    this.app?.stage.addChild(animation)
    animation.autoUpdate = true
    this.setCurrentAnimation(animation)
    loader.destroy()
  }

  animiationSelectChnaged(): void {
    this.stopAnimation()
    if (this.currenSpine !== null) {
      const animationData = this.currenSpine.animation.spineData.animations.find(a => a.name === this.currenSpine?.currentAnimationName)
      this.currenSpine.currentAnimationDuration = animationData!.duration as number
    }
  }

  onTrackTimeChanged(): void {
    const currentTime = new Date().getTime()
    if (currentTime - this.lastManualUpdate < 1000 / 30) {
      return
    }
    this.lastManualUpdate = currentTime
    if (this.currenSpine) {
      settings.GLOBAL_AUTO_UPDATE = false
      const track = this.currenSpine.state.tracks[0]
      if (track) {
        track.setAnimationLast(this.currenSpine.currentAnimationTrack as number)
        track.trackTime = this.currenSpine.currentAnimationTrack as number
        this.currenSpine.animation.update(0)
      }
    }
  }

  setCurrentAnimation(animation: Spine): void {
    const animations = animation.spineData.animations?.map(a => a.name) || []
    const animationData = animation.spineData.animations[0]
    const state = animation.state as AnimationState;

    this.currenSpine = {
      animation,
      animations,
      state,
      currentAnimationTrack: state.tracks[0]?.animationLast ?? 0,
      currentAnimationDuration: animationData?.duration ?? 0,
      currentAnimationName: animationData?.name ?? null,
    }
  }

  trackerCallback(): void {
    if (settings.GLOBAL_AUTO_UPDATE && this.currenSpine) {
      const state = this.currenSpine.state
      const track = state.tracks[0]
      if (track) {
        this.currenSpine.currentAnimationTrack = track.animationLast
      }
    }
  }

  onDrop(event: DragEvent): void {
    event.stopPropagation()
    event.preventDefault()
    this.dropActive = false

    const filelist = event.dataTransfer?.files;

    if (!filelist || filelist.length < 3) {
      return;
    }

    const files: File[] = new Array<File>(filelist.length);

    for (let i = 0; i < filelist.length; i++) {
      files[i] = filelist[i]
    }

    this.loadFiles(files)
  }

  onDragleave(event: DragEvent): void {
    event.stopPropagation()
    event.preventDefault()
    this.dropActive = false
  }

  onDragenter(event: DragEvent): void {
    event.stopPropagation()
    event.preventDefault()
    this.dropActive = true
  }

  onDragover(event: DragEvent): void {
    event.stopPropagation()
    event.preventDefault()
    this.dropActive = true
  }
}

</script>

<style scoped>
#drop-area {
  height: 200px;
  border: 1px solid red;
}

.drop-active {
  background-color: rgba(231, 234, 246, 0.8);
}

main {
  background-image: url("@/assets/images/background.png");
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
}

.animation-controller {
  background-color: white;
  position: fixed;
  top: 20px;
  right: 20px;
  width: 350px;
  padding: 15px 15px;
  border-radius: 10px;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.5);
}

.controller-item {
  display: flex;
  align-items: center;
  margin-left: 12px;
  margin-right: 12px;
}

.controller-item .demonstration {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  line-height: 44px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 0;
}

.controller-item .content {
  font-size: 14px;
  color: var(--el-text-color-primary);
  line-height: 44px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 0;
}

.controller-item .demonstration+.content {
  flex: 0 0 70%;
}
</style>