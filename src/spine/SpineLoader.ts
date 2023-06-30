import * as PIXI from 'pixi.js';
import { Spine, TextureAtlas } from 'pixi-spine';
import type { ISkeletonData } from 'pixi-spine';
import { AtlasAttachmentLoader, SkeletonJson } from '@pixi-spine/runtime-3.7';
import SkeletonBinary from '@/spine/SkeletonBinary'

declare type Callback = (spine: Spine | null, fileName: string | null, error: string | null) => void

export default function LoadSpine(files: File[], scale: number, callback: Callback) {
    try {
        loadFiles(files, scale, callback)
    } catch (e) {
        if (typeof e === 'string') {
            callback(null, null, e)
        }
        else if (e instanceof Error) {
            callback(null, null, e.message)
        }
    }
}

function loadFiles(files: File[], scale: number, callback: Callback) {
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

    loader.load((l, r) => onSpineDataLoaded(fileName, l, r, scale, callback))
}


function onSpineDataLoaded(
    fileName: string,
    loader: PIXI.Loader,
    resources: Partial<Record<string, PIXI.LoaderResource>>,
    scale: number,
    callback: Callback): void {
    let animation: Spine | null = null
    let error: string | null = null
    try {
        const skeletonData = loadSkeletonData(fileName, scale, resources)
        animation = new Spine(skeletonData)
        loader.destroy()
    } catch (e) {
        if (typeof e === 'string') {
            error = e
        }
        else if (e instanceof Error) {
            error = e.message
        }
    }
    callback(animation, fileName, error)
}

function loadSkeletonData(fileName: string, scale: number, resources: Partial<Record<string, PIXI.LoaderResource>>): ISkeletonData {
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
        skeletonBinary.scale = scale
        skeletonBinary.initJson()
        json = skeletonBinary.json
    }
    else {
        json = JSON.parse(resources[`${fileName}-json`]?.data ?? '{}')
        skeletonJson.scale = scale
    }
    console.log('json ', json)
    const skeletonData = skeletonJson.readSkeletonData(json)

    return skeletonData
}