<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  prompt: string;
  openIn: { name: string; href: string }[];
  agents: string[];
}>();

const copied = ref<string | null>(null);

async function copy(prompt: string, agent: string): Promise<void> {
  await navigator.clipboard.writeText(prompt);
  copied.value = agent;
}
</script>

<template>
  <details class="setup">
    <summary>Set up with an AI agent</summary>
    <section v-if="openIn.length">
      <h3>Open in</h3>
      <ul>
        <li v-for="target in openIn" :key="target.name">
          <a :href="target.href" target="_blank" rel="noreferrer">{{
            target.name
          }}</a>
        </li>
      </ul>
    </section>
    <section>
      <h3>Copy for your terminal agent</h3>
      <ul>
        <li v-for="agent in agents" :key="agent">
          <button type="button" @click="copy(prompt, agent)">
            {{ copied === agent ? "Copied" : agent }}
          </button>
        </li>
      </ul>
    </section>
  </details>
</template>

<style scoped>
.setup {
  margin: 0 0 1.75rem;
}

summary {
  cursor: pointer;
  font-weight: 600;
}

section {
  margin-top: 1rem;
}

h3 {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  font-weight: 400;
  opacity: 0.7;
}

ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  margin: 0;
}
</style>
