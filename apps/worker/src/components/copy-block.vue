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
  margin-bottom: 1.5rem;
}

.block button {
  display: block;
  margin: -0.5rem 0 0 auto;
}
</style>
