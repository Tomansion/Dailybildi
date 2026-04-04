<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="[
      'base-button',
      `base-button--${variant}`,
      { 'base-button--disabled': disabled }
    ]"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    default: 'button',
    validator: (value) => ['button', 'submit', 'reset'].includes(value)
  },
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'danger', 'success'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])
</script>

<style scoped>
.base-button {
  cursor: pointer;
  font-family: inherit;
  border: 1px solid var(--text-primary);
  border-radius: 0;
  padding: 0.5rem 1rem;
  background-color: var(--text-primary);
  color: var(--background);
  transition: all 0.2s;
  font-size: 0.95rem;
  font-weight: 500;
}

.base-button:hover:not(:disabled) {
  opacity: 0.8;
  background-color: var(--text-secondary);
  border-color: var(--text-secondary);
}

.base-button:active:not(:disabled) {
  opacity: 0.6;
}

.base-button--secondary {
  background-color: transparent;
  color: var(--text-primary);
  border: 1px solid var(--text-primary);
}

.base-button--secondary:hover:not(:disabled) {
  background-color: var(--text-primary);
  color: var(--background);
}

.base-button--danger {
  background-color: var(--error);
  color: var(--background);
  border-color: var(--error);
}

.base-button--danger:hover:not(:disabled) {
  opacity: 0.8;
}

.base-button--success {
  background-color: var(--success);
  color: var(--background);
  border-color: var(--success);
}

.base-button--success:hover:not(:disabled) {
  opacity: 0.8;
}

.base-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: var(--disabled);
  border-color: var(--disabled);
  color: var(--text-secondary);
}
</style>
