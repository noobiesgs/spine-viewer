<template>
  <el-config-provider>
    <router-view />
  </el-config-provider>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-facing-decorator'
import { RouterView } from 'vue-router'

@Component({
  components: {}
})
export default class App extends Vue {

}
</script>
