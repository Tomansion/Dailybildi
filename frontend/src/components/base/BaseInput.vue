<template>
  <div class="base-input-group">
    <label v-if="label" :for="id" class="form-label">{{ label }}</label>
    <input
      :id="id"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      class="base-input"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  label: {
    type: String,
    default: null
  },
  type: {
    type: String,
    default: 'text',
    validator: (value) => [
      'text',
      'email',
      'password',
      'number',
      'tel',
      'url',
      'search'
    ].includes(value)
  },
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  required: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  }
})

const id = computed(() => `input-${Math.random().toString(36).slice(2)}`)

defineEmits(['update:modelValue'])
</script>

<style scoped>
.base-input-group {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.form-label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.base-input {
  background-color: var(--background);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 0;
  padding: 0.5rem 0.75rem;
  font-family: inherit;
  font-size: 0.95rem;
  transition: border-color 0.2s;
  width: 100%;
}

.base-input::placeholder {
  color: var(--text-secondary);
  opacity: 1;
}

.base-input:focus {
  outline: none;
  border-color: var(--text-primary);
  box-shadow: none;
}

.base-input:disabled {
  background-color: var(--surface);
  color: var(--text-secondary);
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
