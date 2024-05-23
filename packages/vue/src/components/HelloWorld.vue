<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BoxKeyPair } from 'tweetnacl';

const { generateKey } = defineProps<{ msg: string, generateKey: (secret: string) => BoxKeyPair }>()

const count = ref(0)
const decode = (u: Uint8Array) => new TextDecoder('utf-16').decode(u);
const generatedKey = computed(() => generateKey(`${(count.value * new Date().valueOf()).toString()}secretsecretsecretsecretsecret!`.slice(0, 32)));
</script>

<template>
  <h1>{{ msg }}</h1>

  <div class="card">
    <button type="button" @click="count++">generate new key pair</button>
  </div>
  <h2>public: {{ decode(generatedKey.publicKey) }}</h2>
  <h2>private: {{ decode(generatedKey.secretKey) }}</h2>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
