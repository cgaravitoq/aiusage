<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{ text: string }>();

const copied = ref(false);

async function copy(): Promise<void> {
  await navigator.clipboard.writeText(props.text);
  copied.value = true;
}
</script>

<template>
  <div class="block">
    <pre><code>{{ text }}</code></pre>
    <button type="button" @click="copy">{{ copied ? "Copied" : "Copy" }}</button>
  </div>
</template>

<style scoped>
.block {
  margin-bottom: 1rem;
}

.block button {
  display: block;
  margin-left: auto;
}
</style>
