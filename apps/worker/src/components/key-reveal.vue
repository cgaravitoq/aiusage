<script setup lang="ts">
import CopyBlock from "@/components/copy-block.vue";

defineProps<{
  apiKey: string;
  commands: string[];
  snippet: string;
}>();
</script>

<template>
  <h1>Your API key</h1>
  <p>Store this key in your collector config; it is shown once.</p>
  <CopyBlock :text="apiKey" />
  <h2>Install the collector</h2>
  <CopyBlock v-for="command in commands" :key="command" :text="command" />
  <h2>Embed the widget</h2>
  <CopyBlock :text="snippet" />
</template>
