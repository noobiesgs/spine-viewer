// Supports Spine 3.3 , 3.4, 3.5, 3.6

export default class SkeletonBinary {
  private position: number = 0
  private scale: number = 1

  chars: string | null = null
  json: any = {}

  constructor(private data: Uint8Array) {}

  readByte(): number {
    return this.position < this.data.length ? this.data[this.position++] : 0
  }

  readBoolean(): boolean {
    return this.readByte() !== 0
  }

  readShort(): number {
    return (this.readByte() << 8) | this.readByte()
  }

  readInt(optimizePositive: boolean | null): number {
    if (optimizePositive === null) {
      return (
        (this.readByte() << 24) | (this.readByte() << 16) | (this.readByte() << 8) | this.readByte()
      )
    }
    let b = this.readByte()
    let result = b & 0x7f
    if ((b & 0x80) !== 0) {
      b = this.readByte()
      result |= (b & 0x7f) << 7
      if ((b & 0x80) !== 0) {
        b = this.readByte()
        result |= (b & 0x7f) << 14
        if ((b & 0x80) !== 0) {
          b = this.readByte()
          result |= (b & 0x7f) << 21
          if ((b & 0x80) !== 0) {
            b = this.readByte()
            result |= (b & 0x7f) << 28
          }
        }
      }
    }

    return optimizePositive ? result : (result >> 1) ^ -(result & 1)
  }

  private bytes2Float32(bytes: number): number {
    const sign = bytes & 0x80000000 ? -1 : 1
    let exponent = ((bytes >> 23) & 0xff) - 127
    let significand = bytes & ~(-1 << 23)

    if (exponent === 128) {
      return sign * (significand ? Number.NaN : Number.POSITIVE_INFINITY)
    }

    if (exponent === -127) {
      if (significand === 0) {
        return sign * 0.0
      }
      exponent = -126
      significand /= 1 << 22
    } else {
      significand = (significand | (1 << 23)) / (1 << 23)
    }

    return sign * significand * Math.pow(2, exponent)
  }

  readFloat(): number {
    return this.bytes2Float32(
      (this.readByte() << 24) +
        (this.readByte() << 16) +
        (this.readByte() << 8) +
        (this.readByte() << 0)
    )
  }

  readFloatArray(n: number, scale: number): number[] {
    const array: number[] = []
    if (scale === 1) {
      for (let i = 0; i < n; i++) {
        array[i] = this.readFloat()
      }
    } else {
      for (let i = 0; i < n; i++) {
        array[i] = this.readFloat() * scale
      }
    }
    return array
  }

  readVertices(vertexCount: number): number[] {
    if (!this.readBoolean()) {
      const verticesLength = vertexCount << 1
      return this.readFloatArray(verticesLength, this.scale)
    }

    const vertices: number[] = []
    for (let i = 0; i < vertexCount; i++) {
      const boneCount = this.readInt(true)
      vertices.push(boneCount)
      for (let j = 0; j < boneCount; j++) {
        vertices.push(this.readInt(true))
        vertices.push(this.readFloat() * this.scale)
        vertices.push(this.readFloat() * this.scale)
        vertices.push(this.readFloat())
      }
    }
    return vertices
  }

  readShortArray(): number[] {
    const n = this.readInt(true)
    const array: number[] = []
    for (let i = 0; i < n; i++) {
      array[i] = this.readShort()
    }
    return array
  }

  readIntArray(): number[] {
    const n = this.readInt(true)
    const array: number[] = []
    for (let i = 0; i < n; i++) {
      array[i] = this.readInt(true)
    }
    return array
  }

  readHex(): string {
    const hex = this.readByte().toString(16)
    return hex.length === 2 ? hex : '0' + hex
  }

  readColor(): string {
    return this.readHex() + this.readHex() + this.readHex() + this.readHex()
  }

  readString(): string | null {
    let charCount = this.readInt(true)
    switch (charCount) {
      case 0:
        return null
      case 1:
        return ''
    }

    charCount--
    this.chars = ''
    let b = 0
    for (let i = 0; i < charCount; ) {
      b = this.readByte()
      switch (b >> 4) {
        case 12:
        case 13:
          this.chars += String.fromCharCode(((b & 0x1f) << 6) | (this.readByte() & 0x3f))
          i += 2
          break
        case 14:
          this.chars += String.fromCharCode(
            ((b & 0x0f) << 12) | ((this.readByte() & 0x3f) << 6) | (this.readByte() & 0x3f)
          )
          i += 3
          break
        default:
          this.chars += String.fromCharCode(b)
          i++
      }
    }

    return this.chars
  }

  checkSkel(minorVersion: number, skeleton: any, nonessential: boolean) {
    if (nonessential) {
      if (minorVersion >= 5) {
        skeleton.fps = this.readFloat()
      }
      const images = this.readString()
      skeleton.images = images === null || images.length === 0 ? undefined : images
    }
  }

  readBones(minorVersion: number, bones: any[], nonessential: boolean) {
    for (let i = 0; i < bones.length; i++) {
      const bone: any = {}
      bone.name = this.readString()

      if (i > 0) {
        const parentIndex = this.readInt(true)
        bone.parent = bones[parentIndex].name
      }

      const rotation = this.readFloat()
      if (rotation !== 0) {
        bone.rotation = rotation
      }
      const x = this.readFloat()
      if (x !== 0) {
        bone.x = x * this.scale
      }
      const y = this.readFloat()
      if (y !== 0) {
        bone.y = y * this.scale
      }
      const scaleX = this.readFloat()
      if (scaleX !== 1) {
        bone.scaleX = scaleX
      }
      const scaleY = this.readFloat()
      if (scaleY !== 1) {
        bone.scaleY = scaleY
      }
      const shearX = this.readFloat()
      if (shearX !== 0) {
        bone.shearX = shearX
      }
      const shearY = this.readFloat()
      if (shearY !== 0) {
        bone.shearY = shearY
      }
      const length = this.readFloat()
      if (length !== 0) {
        bone.length = length * this.scale
      }

      if (minorVersion <= 4) {
        bone.inheritRotation = this.readBoolean()
        bone.inheritScale = this.readBoolean()
      } else {
        bone.transform = TransformMode[this.readInt(true)]
      }

      if (nonessential) {
        bone.color = this.readColor()
      }

      bones[i] = bone
    }
  }

  readSlots(minorVersion: number, bones: any[], slots: any[]) {
    for (let i = 0; i < slots.length; i++) {
      const slot: any = {}
      const slotName = this.readString()
      const boneIndex = this.readInt(true)

      slot.name = slotName
      slot.bone = bones[boneIndex].name

      const color = this.readColor()
      if (color !== 'ffffffff') {
        slot.color = color
      }

      if (minorVersion >= 6) {
        const dark = this.readColor()
        if (dark !== 'ffffffff') {
          slot.dark = dark
        }
      }

      slot.attachment = this.readString()
      slot.blend = BlendMode[this.readInt(true)]

      slots[i] = slot
    }
  }

  checkIkConstraints(minorVersion: number, ikConstraints: any) {
    if (minorVersion >= 5) {
      ikConstraints.order = this.readInt(true)
    }
  }

  readIK(minorVersion: number, ik: any[]) {
    for (let i = 0; i < ik.length; i++) {
      const ikConstraints: any = {}
      ikConstraints.name = this.readString()
      this.checkIkConstraints(minorVersion, ikConstraints)
      ikConstraints.bones = new Array(this.readInt(true))
      for (let j = 0; j < ikConstraints.bones.length; j++) {
        ikConstraints.bones[j] = this.json.bones[this.readInt(true)].name
      }
      ikConstraints.target = this.json.bones[this.readInt(true)].name
      ikConstraints.mix = this.readFloat()
      ikConstraints.bendPositive = this.readByte() != 255 // 1 = true, -1 (255) = false
      ik[i] = ikConstraints
    }
  }

  checkTransform(minorVersion: number, transformConst: any) {
    if (minorVersion >= 5) {
      transformConst.order = this.readInt(true)
    }
  }

  readTransform(minorVersion: number, transform: any[]) {
    for (let i = 0; i < transform.length; i++) {
      const transformConst: any = {}
      transformConst.name = this.readString()
      this.checkTransform(minorVersion, transformConst)
      const bones = new Array(this.readInt(true))
      for (let ii = 0, nn = bones.length; ii < nn; ii++) {
        bones[ii] = this.json.bones[this.readInt(true)].name
      }
      transformConst.bones = bones
      transformConst.target = this.json.bones[this.readInt(true)].name
      if (minorVersion === 6) {
        // Spine 3.6.x support
        transformConst.local = this.readBoolean()
        transformConst.relative = this.readBoolean()
      }
      transformConst.rotation = this.readFloat()
      transformConst.x = this.readFloat() * this.scale
      transformConst.y = this.readFloat() * this.scale
      transformConst.scaleX = this.readFloat()
      transformConst.scaleY = this.readFloat()
      transformConst.shearY = this.readFloat()
      transformConst.rotateMix = this.readFloat()
      transformConst.translateMix = this.readFloat()
      transformConst.scaleMix = this.readFloat()
      transformConst.shearMix = this.readFloat()
      transform[i] = transformConst
    }
  }

  checkPath(minorVersion: number, pathConst: any) {
    if (minorVersion >= 5) {
      pathConst.order = this.readInt(true)
    }
  }

  readPath(minorVersion: number, path: any[]) {
    for (let i = 0; i < path.length; i++) {
      const pathConst: any = {}
      pathConst.name = this.readString()
      this.checkPath(minorVersion, pathConst)
      pathConst.bones = new Array(this.readInt(true))
      for (let ii = 0, nn = pathConst.bones.length; ii < nn; ii++) {
        pathConst.bones[ii] = this.json.bones[this.readInt(true)].name
      }
      pathConst.target = this.json.slots[this.readInt(true)].name
      pathConst.positionMode = PositionMode[this.readInt(true)]
      pathConst.spacingMode = SpacingMode[this.readInt(true)]
      pathConst.rotateMode = RotateMode[this.readInt(true)]
      pathConst.rotation = this.readFloat()
      pathConst.position = this.readFloat()
      if (pathConst.positionMode == 'fixed') {
        pathConst.position *= this.scale
      }
      pathConst.spacing = this.readFloat()
      if (pathConst.spacingMode == 'length' || pathConst.spacingMode == 'fixed') {
        pathConst.spacing *= this.scale
      }
      pathConst.rotateMix = this.readFloat()
      pathConst.translateMix = this.readFloat()
      path[i] = pathConst
    }
  }

  readEvents(events: any, eventsName: any[]) {
    for (let i = 0, n = this.readInt(true); i < n; i++) {
      const eventName = this.readString() as string
      const event: any = {}
      event.int = this.readInt(false)
      event.float = this.readFloat()
      event.string = this.readString()
      events[eventName] = event
      eventsName.push(eventName)
    }
  }

  initJson() {
    this.json.skeleton = {}
    const skeleton = this.json.skeleton
    skeleton.hash = this.readString()
    if (skeleton.hash.length === 0) {
      delete skeleton.hash
    }
    skeleton.spine = this.readString()
    if (skeleton.spine.length === 0) {
      delete skeleton.spine
    }
    skeleton.width = this.readFloat()
    skeleton.height = this.readFloat()
    const nonessential = this.readBoolean()
    const version = skeleton.spine || '0.0.0'
    const majorVersion = parseInt(version.split(/\./)[0])
    const minorVersion = parseInt(version.split(/\./)[1])

    console.log('Version', version)

    if (majorVersion !== 3 || minorVersion > 6 || minorVersion < 3) {
      throw 'spine version not match'
    }

    console.log('spine v=', skeleton.spine, nonessential)

    this.checkSkel(minorVersion, skeleton, nonessential)

    this.json.bones = new Array(this.readInt(true))
    const bones = this.json.bones
    this.readBones(minorVersion, bones, nonessential)

    this.json.slots = new Array(this.readInt(true))
    const slots = this.json.slots
    this.readSlots(minorVersion, bones, slots)

    this.json.ik = new Array(this.readInt(true))
    const ik = this.json.ik
    this.readIK(minorVersion, ik)

    this.json.transform = new Array(this.readInt(true))
    const transform = this.json.transform
    this.readTransform(minorVersion, transform)

    this.json.path = new Array(this.readInt(true))
    const path = this.json.path
    this.readPath(minorVersion, path)

    this.json.skins = {}
    this.json.skinsName = new Array()
    const skins = this.json.skins
    const defaultSkin = this.readSkin(nonessential)
    if (defaultSkin !== null) {
      skins['default'] = defaultSkin
      this.json.skinsName.push('default')
    }
    const n = this.readInt(true)
    for (let i = 0; i < n; i++) {
      const skinName = this.readString() as string
      const skin = this.readSkin(nonessential)
      skins[skinName] = skin
      this.json.skinsName.push(skinName)
    }

    this.json.events = {}
    this.json.eventsName = []
    const events = this.json.events
    const eventsName = this.json.eventsName
    this.readEvents(events, eventsName)

    this.json.animations = {}
    const animations = this.json.animations
    for (let i = 0, n = this.readInt(true); i < n; i++) {
      console.log('animation count: ', n)
      const animationName = this.readString() as string
      const animation = this.readAnimation()
      animations[animationName] = animation
    }
  }

  readSkin(nonessential: boolean) {
    const slotCount = this.readInt(true)
    if (slotCount === 0) return null
    const skin: any = {}
    for (let i = 0; i < slotCount; i++) {
      const slotIndex = this.readInt(true)
      const slot: any = {}
      for (let j = 0, n = this.readInt(true); j < n; j++) {
        const name = this.readString() as string
        const attachment = this.readAttachment(name, nonessential)
        if (attachment !== null) {
          slot[name] = attachment
        }
      }
      skin[this.json.slots[slotIndex].name] = slot
    }
    return skin
  }

  readAttachment(attachmentName: string, nonessential: boolean) {
    const scale = this.scale
    let name = this.readString()
    if (name === null) {
      name = attachmentName
    }
    switch (AttachmentType[this.readByte()]) {
      case 'region': {
        let path = this.readString()
        if (path === null) {
          path = name
        }
        const region: any = {}
        region.type = 'region'
        region.name = name
        region.path = path.trim() // HACK: trim path name for some SD
        region.rotation = this.readFloat()
        region.x = this.readFloat() * scale
        region.y = this.readFloat() * scale
        region.scaleX = this.readFloat()
        region.scaleY = this.readFloat()
        region.width = this.readFloat() * scale
        region.height = this.readFloat() * scale
        region.color = this.readColor()
        return region
      }
      case 'boundingbox': {
        const box: any = {}
        box.type = 'boundingbox'
        box.name = name
        const vertexCount = this.readInt(true)
        box.vertexCount = vertexCount
        box.vertices = this.readVertices(vertexCount)
        if (nonessential) {
          box.color = this.readColor()
        }
        return box
      }
      case 'mesh': {
        let path = this.readString()
        if (path === null) path = name
        const mesh: any = {}
        mesh.type = 'mesh'
        mesh.name = name
        mesh.path = path
        mesh.color = this.readColor()
        const vertexCount = this.readInt(true)
        mesh.uvs = this.readFloatArray(vertexCount << 1, 1)
        mesh.triangles = this.readShortArray()
        mesh.vertices = this.readVertices(vertexCount)
        // mesh.hull = this.readInt(true) << 1;
        mesh.hull = this.readInt(true)
        if (nonessential) {
          mesh.edges = this.readShortArray()
          mesh.width = this.readFloat() * scale
          mesh.height = this.readFloat() * scale
        }
        return mesh
      }
      case 'linkedmesh': {
        let path = this.readString()
        if (path === null) path = name
        const linkedmesh: any = {}
        linkedmesh.type = 'linkedmesh'
        linkedmesh.name = name
        linkedmesh.path = path
        linkedmesh.color = this.readColor()
        linkedmesh.skin = this.readString()
        linkedmesh.parent = this.readString()
        linkedmesh.deform = this.readBoolean()
        if (nonessential) {
          linkedmesh.width = this.readFloat() * scale
          linkedmesh.height = this.readFloat() * scale
        }
        return linkedmesh
      }
      case 'path': {
        const path: any = {}
        path.type = 'path'
        path.name = name
        path.closed = this.readBoolean()
        path.constantSpeed = this.readBoolean()
        const vertexCount = this.readInt(true)
        path.vertexCount = vertexCount
        path.vertices = this.readVertices(vertexCount)
        const lengths = new Array(vertexCount / 3)
        for (let i = 0; i < lengths.length; i++) {
          lengths[i] = this.readFloat() * scale
        }
        path.lengths = lengths
        if (nonessential) {
          path.color = this.readColor()
        }
        return path
      }
      case 'point': {
        const point: any = {}
        point.type = 'point'
        point.name = name
        point.rotation = this.readFloat()
        point.x = this.readFloat() * scale
        point.y = this.readFloat() * scale
        if (nonessential) {
          point.color = this.readColor()
        }
        return point
      }
      case 'clipping': {
        const clipping: any = {}
        clipping.type = 'clipping'
        clipping.name = name
        clipping.end = this.json.slots[this.readInt(true)].name
        const vertexCount = this.readInt(true)
        clipping.vertexCount = vertexCount
        clipping.vertices = this.readVertices(vertexCount)
        if (nonessential) {
          clipping.color = this.readColor()
        }
        return clipping
      }
    }
    return null
  }

  private readCurve(frameIndex: number, timeline: any): void {
    switch (this.readByte()) {
      case 0: //CURVE_LINEAR
        // DO NOTHING. YOU MUST NOT SET sth for 'linear'
        // timeline[frameIndex].curve = "linear";
        break
      case 1: //CURVE_STEPPED
        timeline[frameIndex].curve = 'stepped'
        break
      case 2: {
        //CURVE_BEZIER
        const cx1 = this.readFloat()
        const cy1 = this.readFloat()
        const cx2 = this.readFloat()
        const cy2 = this.readFloat()
        timeline[frameIndex].curve = [cx1, cy1, cx2, cy2]
        break
      }
    }
  }

  readAnimation() {
    const animation: any = {}
    const scale = this.scale
    let duration = 0

    // Slot timelines.
    const slots: any = {}
    for (let i = 0, n = this.readInt(true); i < n; i++) {
      const slotIndex = this.readInt(true)
      const slotMap: any = {}
      const timeCount = this.readInt(true)
      for (let ii = 0; ii < timeCount; ii++) {
        const timelineType = this.readByte()
        const frameCount = this.readInt(true)
        switch (timelineType) {
          case 0: {
            //SLOT_ATTACHMENT
            const timeline = new Array(frameCount)
            for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
              const time = this.readFloat()
              const attachmentName = this.readString()
              timeline[frameIndex] = {}
              timeline[frameIndex].time = time
              timeline[frameIndex].name = attachmentName
            }
            slotMap.attachment = timeline
            duration = Math.max(duration, timeline[frameCount - 1].time)
            break
          }
          case 1: {
            //SLOT_COLOR
            const timeline = new Array(frameCount)
            for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
              const time = this.readFloat()
              const color = this.readColor()
              timeline[frameIndex] = {}
              timeline[frameIndex].time = time
              timeline[frameIndex].color = color
              if (frameIndex < frameCount - 1) {
                this.readCurve(frameIndex, timeline)
              }
            }
            slotMap.color = timeline
            duration = Math.max(duration, timeline[frameCount - 1].time)
            break
          }
          case 2: {
            //SLOT_TWO_COLOR
            const timeline = new Array(frameCount)
            for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
              const time = this.readFloat()
              const light = this.readColor()
              const dark = this.readColor()
              timeline[frameIndex] = {}
              timeline[frameIndex].time = time
              timeline[frameIndex].light = light
              timeline[frameIndex].dark = dark
              if (frameIndex < frameCount - 1) {
                this.readCurve(frameIndex, timeline)
              }
            }
            slotMap.twoColor = timeline
            duration = Math.max(duration, timeline[frameCount - 1].time)
            break
          }
        }
      }
      slots[this.json.slots[slotIndex].name] = slotMap
    }
    animation.slots = slots

    // Bone timelines.
    const bones: any = {}
    for (let i = 0, n = this.readInt(true); i < n; i++) {
      const boneIndex = this.readInt(true)
      const boneMap: any = {}
      for (let ii = 0, nn = this.readInt(true); ii < nn; ii++) {
        const timelineType = this.readByte()
        const frameCount = this.readInt(true)
        switch (timelineType) {
          case 0: {
            //BONE_ROTATE
            const timeline = new Array(frameCount)
            for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
              const time = this.readFloat()
              const angle = this.readFloat()
              timeline[frameIndex] = {}
              timeline[frameIndex].time = time
              timeline[frameIndex].angle = angle
              if (frameIndex < frameCount - 1) {
                this.readCurve(frameIndex, timeline)
              }
            }
            boneMap.rotate = timeline
            duration = Math.max(duration, timeline[frameCount - 1].time)
            break
          }
          case 1: //BONE_TRANSLATE
          case 2: //BONE_SCALE
          case 3: {
            //BONE_SHEAR
            const timeline = new Array(frameCount)
            let timelineScale = 1
            if (timelineType == 1) {
              //BONE_TRANSLATE
              timelineScale = scale
            }
            for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
              const tltime = this.readFloat()
              const tlx = this.readFloat()
              const tly = this.readFloat()
              timeline[frameIndex] = {}
              timeline[frameIndex].time = tltime
              timeline[frameIndex].x = tlx * timelineScale
              timeline[frameIndex].y = tly * timelineScale
              if (frameIndex < frameCount - 1) {
                this.readCurve(frameIndex, timeline)
              }
            }
            if (timelineType == 1) {
              boneMap.translate = timeline
            } else if (timelineType == 2) {
              boneMap.scale = timeline
            } else {
              boneMap.shear = timeline
            }
            duration = Math.max(duration, timeline[frameCount - 1].time)
            break
          }
        }
      }
      bones[this.json.bones[boneIndex].name] = boneMap
    }
    animation.bones = bones

    // IK timelines.
    const ik: any = {}
    for (let i = 0, n = this.readInt(true); i < n; i++) {
      const ikIndex = this.readInt(true)
      const frameCount = this.readInt(true)
      const timeline = new Array(frameCount)
      for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
        const time = this.readFloat()
        const mix = this.readFloat()
        const bendPositive = this.readByte() != 255 // 1 = true, -1 (255) = false;
        timeline[frameIndex] = {}
        timeline[frameIndex].time = time
        timeline[frameIndex].mix = mix
        timeline[frameIndex].bendPositive = bendPositive
        if (frameIndex < frameCount - 1) {
          this.readCurve(frameIndex, timeline)
        }
      }
      ik[this.json.ik[ikIndex].name] = timeline
      duration = Math.max(duration, timeline[frameCount - 1].time)
    }
    animation.ik = ik

    // Transform timelines.
    const transform: any = {}
    for (let i = 0, n = this.readInt(true); i < n; i++) {
      const transformIndex = this.readInt(true)
      const frameCount = this.readInt(true)
      const timeline = new Array(frameCount)
      for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
        timeline[frameIndex] = {}
        timeline[frameIndex].time = this.readFloat()
        timeline[frameIndex].rotateMix = this.readFloat()
        timeline[frameIndex].translateMix = this.readFloat()
        timeline[frameIndex].scaleMix = this.readFloat()
        timeline[frameIndex].shearMix = this.readFloat()
        if (frameIndex < frameCount - 1) {
          this.readCurve(frameIndex, timeline)
        }
      }
      transform[this.json.transform[transformIndex].name] = timeline
      duration = Math.max(duration, timeline[frameCount - 1].time)
    }
    animation.transform = transform

    // Path timelines.
    const paths: any = {}
    for (let i = 0, n = this.readInt(true); i < n; i++) {
      const pathIndex = this.readInt(true)
      const pathConst = this.json.path[pathIndex]
      const pathMap: any = {}
      for (let ii = 0, nn = this.readInt(true); ii < nn; ii++) {
        const timelineType = this.readByte()
        const frameCount = this.readInt(true)
        switch (timelineType) {
          case 0: //PATH_POSITION
          case 1: {
            //PATH_SPACING
            const timeline = new Array(frameCount)
            let timelineScale = 1
            if (timelineType == 1) {
              //PATH_SPACING
              if (pathConst.spacingMode == 'length' || pathConst.spacingMode == 'fixed') {
                timelineScale = this.scale
              }
            } else {
              //PATH_POSITION
              if (pathConst.positionMode == 'fixed') {
                timelineScale = this.scale
              }
            }
            for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
              const time = this.readFloat()
              const f = this.readFloat()
              timeline[frameIndex] = {}
              timeline[frameIndex].time = time
              if (timelineType == 0) {
                timeline[frameIndex].position = f * timelineScale
              } else {
                timeline[frameIndex].spacing = f * timelineScale
              }
              if (frameIndex < frameCount - 1) this.readCurve(frameIndex, timeline)
            }
            if (timelineType == 0) {
              pathMap.position = timeline
            } else {
              pathMap.spacing = timeline
            }
            duration = Math.max(duration, timeline[frameCount - 1].time)
            break
          }
          case 2: {
            //PATH_MIX
            const timeline = new Array(frameCount)
            for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
              const time = this.readFloat()
              const rotateMix = this.readFloat()
              const translateMix = this.readFloat()
              timeline[frameIndex] = {}
              timeline[frameIndex].time = time
              timeline[frameIndex].rotateMix = rotateMix
              timeline[frameIndex].translateMix = translateMix
              if (frameIndex < frameCount - 1) this.readCurve(frameIndex, timeline)
            }
            pathMap.mix = timeline
            duration = Math.max(duration, timeline[frameCount - 1].time)
            break
          }
        }
      }
      paths[this.json.path[pathIndex].name] = pathMap
    }
    animation.paths = paths

    // Deform timelines.
    const deform: any = {}
    for (let i = 0, n = this.readInt(true); i < n; i++) {
      const skinIndex = this.readInt(true)
      const skinName = this.json.skinsName[skinIndex]
      const skin: any = {}
      for (let ii = 0, nn = this.readInt(true); ii < nn; ii++) {
        const slotIndex = this.readInt(true)
        const slotAtt = this.json.slots[slotIndex]
        const slot: any = {}
        for (let iii = 0, nnn = this.readInt(true); iii < nnn; iii++) {
          const meshName = this.readString() as string
          const frameCount = this.readInt(true)
          const timeline = new Array(frameCount)
          for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
            const time = this.readFloat()
            const end = this.readInt(true)
            timeline[frameIndex] = {}
            timeline[frameIndex].time = time
            if (end != 0) {
              const vertices = new Array(end)
              const start = this.readInt(true)
              if (this.scale == 1) {
                for (let v = 0; v < end; v++) {
                  vertices[v] = this.readFloat()
                }
              } else {
                for (let v = 0; v < end; v++) {
                  vertices[v] = this.readFloat() * this.scale
                }
              }
              timeline[frameIndex].offset = start
              timeline[frameIndex].vertices = vertices
            }
            if (frameIndex < frameCount - 1) this.readCurve(frameIndex, timeline)
          }
          slot[meshName] = timeline
          duration = Math.max(duration, timeline[frameCount - 1].time)
        }
        skin[slotAtt.name] = slot
      }
      deform[skinName] = skin
    }
    animation.deform = deform

    // Draw order timeline.
    const drawOrderCount = this.readInt(true)
    if (drawOrderCount > 0) {
      const drawOrders = new Array(drawOrderCount)
      for (let i = 0; i < drawOrderCount; i++) {
        const drawOrderMap: any = {}
        const time = this.readFloat()
        const offsetCount = this.readInt(true)
        const offsets = new Array(offsetCount)
        for (let ii = 0; ii < offsetCount; ii++) {
          const offsetMap: any = {}
          const slotIndex = this.readInt(true)
          offsetMap.slot = this.json.slots[slotIndex].name
          const dooffset = this.readInt(true)
          offsetMap.offset = dooffset
          offsets[ii] = offsetMap
        }
        drawOrderMap.offsets = offsets
        drawOrderMap.time = time
        drawOrders[i] = drawOrderMap
      }
      duration = Math.max(duration, drawOrders[drawOrderCount - 1].time)
      animation.drawOrder = drawOrders
    }

    // Event timeline.
    const eventCount = this.readInt(true)
    if (eventCount > 0) {
      const events = new Array(eventCount)
      for (let i = 0; i < eventCount; i++) {
        const time = this.readFloat()
        const name = this.json.eventsName[this.readInt(true)]
        const eventData = this.json.events[name]
        const e: any = {}
        e.name = name
        e.int = this.readInt(false)
        e.float = this.readFloat()
        e.string = this.readBoolean() ? this.readString() : eventData.string
        e.time = time
        events[i] = e
      }
      duration = Math.max(duration, events[eventCount - 1].time)
      animation.events = events
    }
    return animation
  }
}

const TransformMode = [
  'normal',
  'onlyTranslation',
  'noRotationOrReflection',
  'noScale',
  'noScaleOrReflection'
]
const BlendMode = ['normal', 'additive', 'multiply', 'screen']
const PositionMode = ['fixed', 'percent']
const SpacingMode = ['length', 'fixed', 'percent']
const RotateMode = ['tangent', 'chain', 'chainScale']
const AttachmentType = ['region', 'boundingbox', 'mesh', 'linkedmesh', 'path', 'point', 'clipping']
