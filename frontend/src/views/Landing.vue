<template>
  <div class="landing-container">
    <!-- Left Side - Concept -->
    <div class="landing-left">
      <div class="landing-content">
        <h1>DailyBildi</h1>
        <p class="subtitle">Build block by block as days go by</p>
        
        <div class="concept">
          <div class="concept-item">
            <div class="concept-header">
              <img src="/icons/blocks.svg" alt="Blocks" class="concept-icon" />
              <h3>New Blocks Every Day</h3>
            </div>
            <p>Receive 10 unique blocks at 00:00. Everyone gets the same blocks on the same day, but you create your own unique masterpiece.</p>
          </div>
          
          <div class="concept-item">
            <div class="concept-header">
              <img src="/icons/bricks.svg" alt="Bricks" class="concept-icon" />
              <h3>Place & Build</h3>
            </div>
            <p>Place blocks on an infinite canvas following a grid. Rotate and flip your blocks, your creation grows day by day.</p>
          </div>
          
          <div class="concept-item">
            <div class="concept-header">
              <img src="/icons/heart.svg" alt="Community" class="concept-icon" />
              <h3>Community</h3>
            </div>
            <p>View other creators' worlds, like their creations, and see what others are building.</p>
          </div>
          
          <div class="concept-item">
            <div class="concept-header">
              <img src="/icons/logo.svg" alt="Universes" class="concept-icon" />
              <h3>Multiple Universes</h3>
            </div>
            <p>Build in different universes with unique aesthetics – from medieval castles to sci-fi landscapes, each with its own block catalog.</p>
          </div>

          <div class="concept-item">
            <div class="concept-header">
              <img src="/icons/bird.svg" alt="Open Source" class="concept-icon" />
              <h3>Free and Open Source</h3>
            </div>
            <p>Built with open source technologies. Everyone can contribute and help shape the future of DailyBildi.</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Right Side - Action Buttons -->
    <div class="landing-right">
      <div class="landing-actions">
        <div class="action-card">
          <h2>Get Started</h2>
          <p>Join the daily building community</p>
          
          <div class="button-group">
            <router-link to="/login" class="action-button login-button">
              Login
            </router-link>
            <router-link to="/register" class="action-button register-button">
              Create Account
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// This component doesn't need any logic
// It's purely presentational
</script>

<style scoped>
.landing-container {
  display: flex;
  height: 100%;
}

@media (max-width: 1024px) {
  .landing-container {
    flex-direction: column;
    height: auto;
  }
}

/* Left Side */
.landing-left {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background-color: var(--background);
}

@media (max-width: 1024px) {
  .landing-left {
    padding: 1rem;
    min-height: auto;
  }
}

.landing-content {
  max-width: 500px;
  width: 100%;
}

.landing-content h1 {
  font-size: 3.5rem;
  margin: 0 0 0.5rem 0;
  padding: 0;
}

@media (max-width: 768px) {
  .landing-content h1 {
    font-size: 2.5rem;
  }
}

.subtitle {
  font-size: 1.25rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.concept {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 2rem;
}

.concept-item {
}

.concept-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.concept-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
}

.concept-item h3 {
  font-size: 1.1rem;
  margin: 0;
  color: var(--text-primary);
}

.concept-item p {
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0;
}

/* Right Side */
.landing-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background-color: var(--surface);
  border-left: 1px solid var(--border);
}

@media (max-width: 1024px) {
  .landing-right {
    border-left: none;
    border-top: 1px solid var(--border);
    min-height: auto;
  }
}

@media (max-width: 768px) {
  .landing-right {
    padding: 1rem;
  }
}

.landing-actions {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.action-card {
  background-color: var(--background);
  border: 1px solid var(--border);
  padding: 2rem;
  text-align: center;
}

.action-card h2 {
  margin-top: 0;
  font-size: 1.75rem;
}

.action-card p {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.action-button {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  display: block;
  border-radius: 0;
  transition: all 0.2s;
  border: 1px solid var(--text-primary);
  cursor: pointer;
}

.login-button {
  background-color: var(--text-primary);
  color: var(--background);
  border-color: var(--text-primary);
}

.login-button:hover {
  opacity: 0.9;
}

.register-button {
  background-color: transparent;
  color: var(--text-primary);
  border-color: var(--text-primary);
}

.register-button:hover {
  background-color: var(--text-primary);
  color: var(--background);
}

</style> 