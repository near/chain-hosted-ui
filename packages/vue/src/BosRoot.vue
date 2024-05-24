<script setup lang="ts">
import * as nacl from 'tweetnacl';
import App from './App.vue'
const generateKey = (secret: string) => nacl.box.keyPair.fromSecretKey(new TextEncoder().encode(secret));
</script>

<template>
  <App :generate-key="generateKey" />
</template>
