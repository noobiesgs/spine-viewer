<script setup lang="ts">
import SkeletonBinary from '@/spine/SkeletonBinary'

defineProps<{
  msg: string
}>()

async function handleFileChange(event: Event) : Promise<void> {
  const target = event.target as HTMLInputElement
  if (target.files){
    const buff = new Uint8Array(await target.files[0].arrayBuffer())
    const skel = new SkeletonBinary(buff)
    skel.initJson()
  } 
}

</script>

<template>
  <div class="greetings">
    <input type="file" v-on:change="(e)=>handleFileChange(e)">
  </div>
</template>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  top: -10px;
}

h3 {
  font-size: 1.2rem;
}

.greetings h1,
.greetings h3 {
  text-align: center;
}

@media (min-width: 1024px) {
  .greetings h1,
  .greetings h3 {
    text-align: left;
  }
}
</style>
