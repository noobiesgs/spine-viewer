<template>
    <main :ref="setContianer">
        <canvas :ref="setViewRef" :class="{ 'drop-active': dropActive }" @drop="onDrop" @dragenter="onDragenter"
            @dragover="onDragover" @dragleave="onDragleave" @mousewheel="onMouseWheel" />

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
                <el-collapse-item title="Properties" name="2" v-if="viewModel">
                    <div class="controller-item">
                        <span class="demonstration">File Name</span>
                        <span class="content">{{ viewModel.fileName }}</span>
                    </div>
                    <div class="controller-item">
                        <span class="demonstration">Scale X</span>
                        <el-input-number style="width:210px" :precision="2" v-model="viewModel.scaleX" :step="0.1"
                            :max="scaleConst.max" :min="scaleConst.min" @change="onScaleChange" />
                    </div>
                    <div class="controller-item">
                        <span class="demonstration">Scale Y</span>
                        <el-input-number style="width:210px" :precision="2" v-model="viewModel.scaleY" :step="0.1"
                            :max="scaleConst.max" :min="scaleConst.min" @change="onScaleChange" />
                    </div>
                    <div class="controller-item">
                        <span class="demonstration">Position X</span>
                        <el-input-number style="width:210px" :precision="2" v-model="viewModel.positionX" :step="1"
                            @change="onPositionChange" />
                    </div>
                    <div class="controller-item">
                        <span class="demonstration">Position Y</span>
                        <el-input-number style="width:210px" :precision="2" v-model="viewModel.positionY" :step="1"
                            @change="onPositionChange" />
                    </div>
                </el-collapse-item>
                <el-collapse-item title="Actions" name="3" v-if="viewModel">
                    <div class="controller-item">
                        <el-button-group style="width: 100%;">
                            <el-button type="primary" :disabled="viewModel.isTopmost" style="width: 33.3%;"
                                @click="sendForward">
                                <IconLayerPlus />
                            </el-button>
                            <el-button type="primary" :disabled="viewModel.isBottomNode" style="width: 33.3%;"
                                @click="sendBackward">
                                <IconLayerMinus />
                            </el-button>
                            <el-button type="danger" style="width: 33.3%;" @click="removeSpine" :icon="Delete">
                            </el-button>
                        </el-button-group>
                    </div>
                </el-collapse-item>
                <el-collapse-item title="Loading" name="4">
                    <div class="controller-item">
                        <h4>Drag and drop the skel/json files along with their corresponding atlas and png files into the
                            workspace for loading</h4>
                    </div>
                    <div class="controller-item">
                        <span class="demonstration">Loading Scale</span>
                        <el-input-number style="width:210px" :precision="2" v-model="loadingScale" :step="0.1"
                            :max="scaleConst.max" :min="scaleConst.min" />
                    </div>
                </el-collapse-item>
            </el-collapse>
        </div>
        <div class="footer">
            <span>All files will not be uploaded to the Internet and will be processed
                locally. This website is made for personal hobby use. This website is provided 'as is'
                and
                your use of this website is entirely at your own risk.</span>
        </div>
    </main>
</template>

<script lang="ts">
import { AnimationState } from '@pixi-spine/runtime-3.7';
import { Delete } from '@element-plus/icons-vue'

interface ViewModel {
    animations: string[]
    duration: number
    animationTrack: number
    selectedAnimation: string | null
    sliderDisable: boolean,
    fileName: string,
    scaleX: number,
    scaleY: number,
    positionX: number,
    positionY: number,
    isTopmost: boolean,
    isBottomNode: boolean
}

interface DataModel {
    state: AnimationState,
    spine: Spine
}

interface DragData {
    startX: number,
    startY: number,
    beingDrag: boolean
}
</script>

<script setup lang="ts">
import * as PIXI from 'pixi.js';
import { Spine, TextureAtlas, settings } from 'pixi-spine';
import type { ISkeletonData } from 'pixi-spine';
import { AtlasAttachmentLoader, SkeletonJson } from '@pixi-spine/runtime-3.7';
import SkeletonBinary from '@/spine/SkeletonBinary'

const activeNames = reactive(['1', '2', '3', '4'])
const viewModel = ref<ViewModel | null>(null)
const dropActive = ref(false)
const scaleConst = reactive({
    max: 10,
    min: 0.1
})
const loadingScale = ref(1)

let view: HTMLCanvasElement | undefined
let contianer: HTMLElement | null
let app: PIXI.Application | null
let model: DataModel | null
const dragData: DragData = { startX: 0, startY: 0, beingDrag: false }
const spineMap: Record<string, Spine> = {}

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

function sendBackward(): void {
    if (model && viewModel.value) {
        let index = app!.stage.getChildIndex(model.spine)
        if (index > 0) {
            const targetIndex = index - 1
            const target = app!.stage.getChildAt(targetIndex)
            app!.stage.swapChildren(model.spine, target)

            index = app!.stage.getChildIndex(model.spine)
            viewModel.value.isTopmost = index === app!.stage.children.length - 1
            viewModel.value.isBottomNode = index === 0
        }
    }
}

function sendForward(): void {
    if (model && viewModel.value) {
        let index = app!.stage.getChildIndex(model.spine)
        if (index < app!.stage.children.length - 1) {
            const targetIndex = index + 1
            const target = app!.stage.getChildAt(targetIndex)
            app!.stage.swapChildren(model.spine, target)

            index = app!.stage.getChildIndex(model.spine)
            viewModel.value.isTopmost = index === app!.stage.children.length - 1
            viewModel.value.isBottomNode = index === 0
        }
    }
}

function onPositionChange(): void {
    if (model && viewModel.value) {
        model!.spine.position.set(viewModel.value.positionX, viewModel.value.positionY)
    }
}

function onScaleChange(): void {
    if (model && viewModel.value) {
        model!.spine.scale.set(viewModel.value.scaleX, viewModel.value.scaleY)
    }
}

function onMouseWheel(e: WheelEvent): void {
    if (model) {
        let delta = 0
        if (e.deltaY > 0) {
            delta = -0.01
        }
        else {
            delta = 0.01
        }

        const scale = model.spine.scale
        scale.set(Math.min(scaleConst.max, Math.max(scale.x + delta, scaleConst.min)),
            Math.min(Math.max(scale.y + delta, scaleConst.min), scaleConst.max))

        viewModel.value!.scaleX = scale.x
        viewModel.value!.scaleY = scale.y
    }
}

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

function removeSpine(): void {
    if (model?.spine) {
        const fileName = findFileName(model.spine)
        delete spineMap[fileName]

        app!.stage.removeChild(model.spine)

        model = null
        viewModel.value = null
    }
}

function findFileName(spine: Spine): string {
    let fileName = 'NaN'
    for (const key in spineMap) {
        if (spineMap[key] === spine) {
            fileName = key
            break;
        }
    }
    return fileName
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

    const fileName = findFileName(spine)
    const index = app!.stage.getChildIndex(spine)

    viewModel.value = {
        animations,
        duration: animationData?.duration ?? 0,
        selectedAnimation: animationData?.name,
        animationTrack: state.tracks[0]?.animationLast ?? 0,
        sliderDisable: state.tracks.length === 0,
        fileName,
        scaleX: spine.scale.x,
        scaleY: spine.scale.y,
        positionX: spine.position.x,
        positionY: spine.position.y,
        isTopmost: index === app!.stage.children.length - 1,
        isBottomNode: index === 0
    }

    model = {
        state,
        spine
    }
}

function loadSkeletonData(fileName: string, resources: Partial<Record<string, PIXI.LoaderResource>>): ISkeletonData {
    const atlasText: string = resources[`${fileName}-atlas`]!.data
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
    const binaryData = resources[`${fileName}-skel`]?.data
    let json: any | null = null
    if (binaryData) {
        const skeletonBinary = new SkeletonBinary(new Uint8Array(binaryData))
        skeletonBinary.scale = loadingScale.value
        skeletonBinary.initJson()
        json = skeletonBinary.json
    }
    else {
        json = JSON.parse(resources[`${fileName}-json`]?.data ?? '{}')
        skeletonJson.scale = loadingScale.value
    }
    console.log('json ', json)
    const skeletonData = skeletonJson.readSkeletonData(json)

    return skeletonData
}

function onSpineDataLoaded(fileName: string, loader: PIXI.Loader, resources: Partial<Record<string, PIXI.LoaderResource>>): void {
    const skeletonData = loadSkeletonData(fileName, resources)

    const animation = new Spine(skeletonData)
    animation.position.set(view!.width / 2, view!.height / 2)
    animation.interactive = true
    animation.on('click', () => {
        if (model?.spine !== animation) {
            setCurrentSpine(animation)
        }
    })
    animation.on('pointerdown', (event: PIXI.InteractionEvent) => {
        if (!event.target) {
            return;
        }
        const spine = event.target as Spine
        if (model?.spine !== spine) {
            setCurrentSpine(spine)
        }
        dragData.beingDrag = true
        const parentLocation = event.data.getLocalPosition(spine.parent)
        dragData.startX = spine.x - parentLocation.x
        dragData.startY = spine.y - parentLocation.y
    })
    animation.on('pointerup', () => {
        dragData.beingDrag = false
    })
    animation.on('pointerupoutside', () => {
        dragData.beingDrag = false
    })
    animation.on('pointermove', (event: PIXI.InteractionEvent) => {
        if (dragData.beingDrag && model?.spine) {
            const parentLocation = event.data.getLocalPosition(model.spine.parent)
            parentLocation.x += dragData.startX
            parentLocation.y += dragData.startY
            model.spine.position.set(parentLocation.x, parentLocation.y)
            viewModel.value!.positionX = parentLocation.x
            viewModel.value!.positionY = parentLocation.y
        }
    })

    app?.stage.addChild(animation)
    animation.autoUpdate = true
    spineMap[fileName] = animation
    setCurrentSpine(animation)
    loader.destroy()
}

function loadFiles(files: File[]) {
    const skelRegex = /\.(skel|json)(\.bytes|\.txt)?$/i;
    const atlasRegex = /\.atlas(\.txt)?$/i;
    const textureRegex = /\.png$/i;
    const fileNameRegex = /^(.+?)(\.[^.]*$|$)/;

    const skelFile = files.find(file => skelRegex.test(file.name));
    const atlasFile = files.find(file => atlasRegex.test(file.name));
    const textureFiles = files.filter(file => textureRegex.test(file.name));

    if (!skelFile || !atlasFile || textureFiles.length === 0) {
        return;
    }

    let fileName = skelFile.name
    const match = fileNameRegex.exec(skelFile.name)
    if (match) {
        fileName = match[1]
    }

    const isJson = /\.json(\.bytes|\.txt)?$/i.test(skelFile.name)

    const loader = new PIXI.Loader()
    loader.add(`${fileName}-atlas`, URL.createObjectURL(atlasFile))
    if (isJson) {
        loader.add(`${fileName}-json`, URL.createObjectURL(skelFile), {
            xhrType: PIXI.LoaderResource.XHR_RESPONSE_TYPE.TEXT
        })
    }
    else {
        loader.add(`${fileName}-skel`, URL.createObjectURL(skelFile), {
            xhrType: PIXI.LoaderResource.XHR_RESPONSE_TYPE.BUFFER,
        })
    }

    for (const textureFile of textureFiles) {
        loader.add(textureFile.name, URL.createObjectURL(textureFile), {
            loadType: PIXI.LoaderResource.LOAD_TYPE.IMAGE,
            xhrType: PIXI.LoaderResource.XHR_RESPONSE_TYPE.BLOB,
        })
    }

    loader.load((l, r) => onSpineDataLoaded(fileName, l, r))
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
    width: 370px;
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

main .footer {
    position: fixed;
    width: 100%;
    height: 30px;
    bottom: 0px;
    background-color: rgba(0, 0, 0, 0.509);
    color: white;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>