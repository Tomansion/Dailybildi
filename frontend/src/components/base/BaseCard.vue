<template>
  <div class="base-card">
    <slot />
  </div>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'elevated'].includes(value)
  }
})
</script>

<style scoped>
.base-card {
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0;
  padding: 1rem;
}
</style>
