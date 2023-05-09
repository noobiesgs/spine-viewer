<template>
  <router-view />
</template>

<script lang="ts">
import { Component, Vue } from 'vue-facing-decorator'
import { RouterView } from 'vue-router'

@Component({
  components: {}
})
export default class HomeView extends Vue {

}
</script>
