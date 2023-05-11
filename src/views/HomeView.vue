<template>
    <main :ref="setContianer">
        <canvas :ref="setViewRef" :class="{ 'drop-active': dropActive }" @drop="onDrop" @dragenter="onDragenter"
            @dragover="onDragover" @dragleave="onDragleave" />

        <div class="animation-controller">
            <el-collapse v-model="activeNames">
                <el-collapse-item title="Player" name="1" v-if="viewModel">
                    <div class="controller-item">
                        <span class="demonstration">Animations</span>
                        <el-select placeholder="---" v-model="viewModel.selectedAnimation"
                            @change="animiationSelectChanged">
                            <el-option v-for="item in viewModel.animations" :key="item" :label="item" :value="item">
                            </el-option>
                        </el-select>
                    </div>
                    <div class="controller-item">
                        <el-slider :show-tooltip="false" v-model="viewModel.animationTrack" :step="0.01"
                            :disabled="viewModel.sliderDisable" :max="viewModel.duration" @input="onTrackTimeChanged" />
                    </div>
                    <div class="controller-item">
                        <span class="demonstration">Duration</span>
                        <span class="content">
                            <el-input-number style="width: 100%;" :precision="2" v-model="viewModel.animationTrack"
                                :disabled="viewModel.sliderDisable" :step="0.01" :max="viewModel.duration"
                                @change="onTrackTimeChanged" /></span>
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
import { AnimationState } from 'pixi-spine/node_modules/@pixi-spine/runtime-3.7';
import IconPlay from '@/components/icons/IconPlay.vue'
import IconStop from '@/components/icons/IconStop.vue'

interface ViewModel {
    animations: string[]
    duration: number
    animationTrack: number
    selectedAnimation: string | null
    sliderDisable: boolean
}

interface DataModel {
    state: AnimationState,
    spine: Spine
}
</script>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import * as PIXI from 'pixi.js';
import { Spine, TextureAtlas, settings } from 'pixi-spine';
import { AtlasAttachmentLoader, SkeletonJson } from 'pixi-spine/node_modules/@pixi-spine/runtime-3.7';
import SkeletonBinary from '@/spine/SkeletonBinary'

const activeNames = reactive(['1'])
const viewModel = ref<ViewModel | null>(null)
const dropActive = ref(false)

let view: HTMLCanvasElement | undefined
let contianer: HTMLElement | null
let app: PIXI.Application | null
let model: DataModel | null

function setViewRef(refDom: any): void {
    if (refDom) { view = refDom as HTMLCanvasElement }
    else { view = undefined }
}

function setContianer(refDom: any): void {
    if (refDom) { contianer = refDom as HTMLElement }
    else { view = undefined }
}

onMounted(() => {
    app = new PIXI.Application({
        backgroundAlpha: 0,
        antialias: false,
        resolution: 1,
        autoDensity: false,
        view: view
    })
    app.ticker.maxFPS = 30
    app.ticker.minFPS = 10
    app.resizeTo = contianer!

    app.ticker.add(animationTrack)
})

function animiationSelectChanged(): void {
    stopAnimation()
    if (model) {
        const animationData = model.spine.spineData.animations.find(a => a.name === viewModel.value?.selectedAnimation)
        viewModel.value!.duration = animationData!.duration
    }
}

function onTrackTimeChanged(val: number): void {
    if (model && viewModel.value) {
        settings.GLOBAL_AUTO_UPDATE = false
        const track = model.state.tracks[0]
        if (track) {
            viewModel.value.animationTrack = val
            track.setAnimationLast(val)
            track.trackTime = val
            model.spine.update(0)
        }
    }
}

function playAnimation(): void {
    settings.GLOBAL_AUTO_UPDATE = true
    if (settings.GLOBAL_AUTO_UPDATE && model && viewModel.value?.selectedAnimation && model.state.tracks.length === 0) {
        model.state.setAnimation(0, viewModel.value.selectedAnimation, true)
        viewModel.value!.sliderDisable = false
    }
}

function stopAnimation(): void {
    if (model && viewModel.value?.selectedAnimation) {
        model.state.clearTracks()
        model.spine.skeleton.setToSetupPose()
        viewModel.value!.animationTrack = 0
        viewModel.value!.sliderDisable = true
    }
    settings.GLOBAL_AUTO_UPDATE = true
}

function animationTrack(_: number): void {
    if (settings.GLOBAL_AUTO_UPDATE && model) {
        var track = model!.state.tracks[0]
        if (track && track.animationLast >= 0) {
            viewModel.value!.animationTrack = track.animationLast
        }
    }
}

function setCurrentSpine(spine: Spine): void {
    const animations = spine.spineData.animations?.map(a => a.name) || []
    const animationData = spine.spineData.animations[0]
    const state = spine.state as AnimationState

    viewModel.value = {
        animations,
        duration: animationData?.duration ?? 0,
        selectedAnimation: animationData?.name,
        animationTrack: state.tracks[0]?.animationLast ?? 0,
        sliderDisable: true
    }

    model = {
        state,
        spine
    }
}

function onSpineDataLoaded(loader: PIXI.Loader, resources: Partial<Record<string, PIXI.LoaderResource>>): void {
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
    animation.x = view!.width / 2
    animation.y = view!.height / 2
    animation.interactive = true
    animation.on('click', (event: PIXI.InteractionEvent) => {
        console.log('e', event)
        console.log('indexOf', app?.stage.children.indexOf(animation))
    })

    app?.stage.addChild(animation)
    animation.autoUpdate = true
    setCurrentSpine(animation)
    loader.destroy()
}

function loadFiles(files: File[]) {
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

    loader.load(onSpineDataLoaded)
}

function onDrop(event: DragEvent): void {
    event.stopPropagation()
    event.preventDefault()
    dropActive.value = false

    const filelist = event.dataTransfer?.files;

    if (!filelist || filelist.length < 3) {
        return;
    }

    const files: File[] = new Array<File>(filelist.length);

    for (let i = 0; i < filelist.length; i++) {
        files[i] = filelist[i]
    }

    loadFiles(files)
}

function onDragleave(event: DragEvent): void {
    event.stopPropagation()
    event.preventDefault()
    dropActive.value = false
}

function onDragenter(event: DragEvent): void {
    event.stopPropagation()
    event.preventDefault()
    dropActive.value = true
}

function onDragover(event: DragEvent): void {
    event.stopPropagation()
    event.preventDefault()
    dropActive.value = true
}

</script>


<style scoped>
main {
    background-image: url("@/assets/images/background.png");
    width: 100vw;
    height: 100vh;
    border: 0;
    display: flex;
    justify-content: center;
}

main canvas {
    width: 100%;
}

main .drop-active {
    background-color: rgba(231, 234, 246, 0.8);
}

main .animation-controller {
    background-color: white;
    position: fixed;
    top: 20px;
    right: 20px;
    width: 350px;
    padding: 15px 15px;
    border-radius: 10px;
    box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.5);
}


main .animation-controller .controller-item {
    display: flex;
    align-items: center;
    margin-left: 12px;
    margin-right: 12px;
}

main .animation-controller .controller-item .demonstration {
    font-size: 14px;
    color: var(--el-text-color-secondary);
    line-height: 44px;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 0;
}

main .animation-controller .controller-item .content {
    font-size: 14px;
    color: var(--el-text-color-primary);
    line-height: 44px;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 0;
}

main .animation-controller .controller-item .demonstration+.content {
    flex: 0 0 70%;
}
</style>