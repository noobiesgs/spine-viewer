<template>
  <main>
    <div id="drop-area" :class="dropActive ? 'drop-active' : ''" @drop="onDrop" @dragenter="onDragenter"
      @dragover="onDragover" @dragleave="onDragleave">
    </div>
  </main>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-facing-decorator'
import * as PIXI from 'pixi.js';
import { Spine, TextureAtlas } from 'pixi-spine';
import { AtlasAttachmentLoader, SkeletonJson } from 'pixi-spine/node_modules/@pixi-spine/runtime-3.7';
import SkeletonBinary from '@/spine/SkeletonBinary'

@Component({ components: {} })
export default class HomeView extends Vue {
  dropActive = false

  app: PIXI.Application | null = null

  loadFiles(files: File[]) {
    const skelRegex = /\.(skel|json)(\.bytes|\.txt)?$/i;
    const atlasRegex = /\.atlas(\.txt)?$/i;
    const textureRegex = /\.png$/i;

    const skelFile = files.find(file => skelRegex.test(file.name));
    const atlasFile = files.find(file => atlasRegex.test(file.name));
    const textureFile = files.find(file => textureRegex.test(file.name));

    if (!skelFile || !atlasFile || !textureFile) {
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

    loader.add('Doll-png', URL.createObjectURL(textureFile), {
      loadType: PIXI.LoaderResource.LOAD_TYPE.IMAGE,
      xhrType: PIXI.LoaderResource.XHR_RESPONSE_TYPE.BLOB,
    })

    loader.load(this.onSpineDataLoaded)
  }

  mounted(): void {
    this.app = new PIXI.Application({
      backgroundAlpha: 0,
      antialias: true
    })
    document.body.appendChild(this.app.view)

    this.app.resizeTo = document.body
  }

  onSpineDataLoaded(_: PIXI.Loader, resources: Partial<Record<string, PIXI.LoaderResource>>): void {
    const atlasText = resources['Doll-atlas']?.data as string
    const texture = PIXI.BaseTexture.from(resources['Doll-png']?.data as HTMLImageElement)
    const atlas = new TextureAtlas(atlasText, (_, loaderFunction) => {
      loaderFunction(texture)
    })

    const atlasAttachmentLoader = new AtlasAttachmentLoader(atlas)
    const skeletonJson = new SkeletonJson(atlasAttachmentLoader)

    const skeletonBinary = new SkeletonBinary(new Uint8Array(resources['Doll-skel']?.data))
    skeletonBinary.initJson()
    console.log('json ', skeletonBinary.json)
    const skeletonData = skeletonJson.readSkeletonData(skeletonBinary.json)

    const animation = new Spine(skeletonData)
    animation.x = 400
    animation.y = 300

    this.app?.stage.addChild(animation)

    console.log('animations', animation.spineData.animations?.map(a => a.name))

    const firstAnimationName = animation.spineData.animations[0]?.name
    if (firstAnimationName) {
      animation.state.setAnimation(0, firstAnimationName, true)
    }
    animation.autoUpdate = true
  }

  onDrop(event: DragEvent): void {
    event.stopPropagation()
    event.preventDefault()
    this.dropActive = false

    const filelist = event.dataTransfer?.files;

    if (!filelist || filelist.length !== 3) {
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
  width: 300px;
  height: 300px;
  border: 1px solid red;
}

.drop-active {
  background-color: rgba(231, 234, 246, 0.8);
}
</style>