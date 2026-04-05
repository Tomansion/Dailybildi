<template>
  <div class="contribution-page">
    <div class="container">
      <h1>Create a Universe</h1>
      <p class="page-subtitle">
        Universes are the visual worlds players build in. Each universe defines
        a unique aesthetic — its background scenery, its block set, and its
        atmosphere.
      </p>

      <section>
        <h2>What is a Universe?</h2>
        <p>
          A universe is a self-contained visual theme. It provides the
          background imagery that sets the scene, and a catalog of block tiles
          that players collect and place day by day to build their creation.
        </p>
        <p style="margin-top: 0.75rem">
          All blocks in a universe share a consistent visual style — same
          palette, same line weight, same rendering approach — so anything built
          feels coherent no matter which blocks the player draws. The only rule
          is <strong>no nudity and no offensive content</strong>. Everything
          else is open.
        </p>

        <div class="examples-grid">
          <div class="example-card">
            <span class="example-tag">Medieval fantasy</span>
            <p>
              Stone towers, ivy, torches, wooden barrels, stained glass, iron
              gates
            </p>
          </div>
          <div class="example-card">
            <span class="example-tag">Science fiction</span>
            <p>
              Hull panels, neon conduits, plasma vents, holographic emitters,
              reactor cores
            </p>
          </div>
          <div class="example-card">
            <span class="example-tag">Biomechanical</span>
            <p>
              Organic tubes, bone struts, pulsing membranes, sinew cables,
              chitinous plates
            </p>
          </div>
          <div class="example-card">
            <span class="example-tag">Traditional Ottoman</span>
            <p>
              Geometric tilework, mashrabiya lattices, arabesques, calligraphy
              panels, faïence details
            </p>
          </div>
          <div class="example-card">
            <span class="example-tag">Underwater</span>
            <p>
              Coral formations, kelp tangles, bioluminescent creatures,
              shipwreck planks, sea fans
            </p>
          </div>
          <div class="example-card">
            <span class="example-tag">Abstract / Geometric</span>
            <p>
              Shapes, gradients, optical patterns, colour fields — no subject,
              pure composition
            </p>
          </div>
          <div class="example-card">
            <span class="example-tag">Cosy cottage</span>
            <p>
              Wooden beams, potted herbs, quilts, cobblestones, warm candlelight
              windows
            </p>
          </div>
          <div class="example-card">
            <span class="example-tag">Retro pixel</span>
            <p>
              8-bit sprites, CRT scanlines, low-palette pixel art rendered at
              block scale
            </p>
          </div>
          <div class="example-card">
            <span class="example-tag">Sky is the limit!</span>
            <p>Endless possibilities, let your imagination run wild</p>
          </div>
        </div>
      </section>

      <section>
        <h2>Folder Structure</h2>
        <p>
          A universe lives in
          <code>public/univers/&lt;universe_slug&gt;/</code> and contains:
        </p>
        <div class="code-block">
          <pre>
public/univers/my_universe/
├── config.json  ← universe configuration file (see below)
├── tiles/
│   ├── tile1.png   ← The name you want, it won't be displayed anywhere
│   ├── tile2.png
│   └── ...
└── world/
    ├── layer1.png   ← background parallax layers
    ├── layer2.png
    └── ...</pre
          >
        </div>
      </section>

      <section>
        <h2>config.json</h2>
        <p>
          This file is the heart of a universe. It declares global display
          settings and the full block catalog.
        </p>

        <div class="code-block">
          <pre>
{
  "backgroundColor": "#fff6e7",
  "worldImageScale": 0.5,
  "blockSize": 40,
  "worldImages": [ ... ],
  "blocks": [ ... ]
}</pre
          >
        </div>

        <div class="field-list">
          <div class="field">
            <code>backgroundColor</code>
            <p>
              CSS hex color shown behind all world images. Should match the
              overall palette of the universe.
            </p>
          </div>
          <div class="field">
            <code>worldImageScale</code>
            <p>
              Scale factor applied to all world background images (<code
                >1.0</code
              >
              = full size). Use <code>0.5</code> for large source images that
              should appear at half resolution.
            </p>
          </div>
          <div class="field">
            <code>blockSize</code>
            <p>
              Size in pixels of one block on the canvas (e.g. <code>40</code>).
              All tile images should be exactly this size.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2>World Images (Parallax Layers)</h2>
        <p>
          The background is composed of multiple PNG layers rendered with a
          parallax effect. Each layer has a <code>distance</code> value that
          controls its parallax speed: negative values scroll slower than the
          camera (far background), positive values scroll faster (foreground
          elements).
        </p>

        <div class="code-block">
          <pre>
"worldImages": [
  { "path": "world/layer1.png",  "distance": -0.5 },
  { "path": "world/layer2.png", "distance":  0   },
  { "path": "world/layer3.png", "distance":  0.5 },
  ...
]</pre
          >
        </div>

        <div class="field-list">
          <div class="field">
            <code>path</code>
            <p>Path to the PNG image, relative to the universe folder.</p>
          </div>
          <div class="field">
            <code>distance</code>
            <p>
              Parallax coefficient. <code>0</code> = scrolls with the camera
              (grounded layer). Negative → slower (sky, ambient light). Positive
              → faster (foreground, clouds).
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2>Blocks</h2>
        <p>
          The <code>"blocks"</code> array defines every tile available in the
          universe. Each block entry follows this shape:
        </p>

        <div class="code-block">
          <pre>
"blocks": [
  { "id": 0,  "layer": 0, "rarity": 1, "imagePath": "tiles/tile1.png"  },
  { "id": 4,  "layer": 1, "rarity": 6, "imagePath": "tiles/tile2.png"  },
  { "id": 11, "layer": 2, "rarity": 9, "imagePath": "tiles/tile3.png" }
]</pre
          >
        </div>

        <div class="field-list">
          <div class="field">
            <code>id</code>
            <p>
              Unique integer identifier for this block within the universe.
              Starts at <code>0</code>.
            </p>
          </div>
          <div class="field">
            <code>layer</code>
            <p>
              Visual stacking order. <code>0</code> = back (background
              decorations, floors). Higher values render on top of lower ones.
              Use layers to ensure foreground details always appear above base
              structures.
            </p>
          </div>
          <div class="field">
            <code>rarity</code>
            <p>
              Controls how often this block is selected in the daily
              distribution. <code>1</code> = very common, higher values = rarer.
              Common blocks (rarity 1–2) form the bulk of building material;
              rare blocks (rarity 8–9) are special accent pieces.
            </p>
          </div>
          <div class="field">
            <code>imagePath</code>
            <p>
              Path to the tile PNG relative to the universe folder. Images must
              be square and exactly <code>blockSize × blockSize</code> pixels
              with a transparent background.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2>Design Tips</h2>
        <ul class="tips-list">
          <li>
            Keep a limited, intentional palette — 4 to 6 colours read better
            than 20.
          </li>
          <li>
            Aim for at least 15–20 blocks to give players enough variety over
            many days.
          </li>
          <li>
            Include a range of rarities: a few very common foundation blocks
            (rarity 1–2), a mid-tier (3–6), and a handful of rare accent pieces
            (7–9).
          </li>
          <li>
            World images look best when they clearly establish the setting, even
            before any blocks are placed.
          </li>
          <li>
            Export tiles as PNG with transparency. A transparent background
            ensures blocks composite correctly on any background colour.
          </li>
        </ul>
      </section>

      <div class="cta-box">
        <h3>Want to submit a universe?</h3>
        <p>
          Open a pull request on the
          <a
            href="https://github.com/Tomansion/Dailybildi"
            target="_blank"
            rel="noopener"
            >GitHub repository</a
          >
          with your universe folder added under <code>public/univers/</code> and
          the corresponding configuration.
        </p>
      </div>

      <section>
        <h2>Example</h2>
        <p>
          The <code>InkCastle</code> is currently implemented as a reference
          universe. You can check out its
          <a
            href="https://github.com/Tomansion/Dailybildi/tree/main/public/univers/ink_castle"
            target="_blank"
            rel="noopener"
            >folder structure and config</a
          >
          to see a complete example of how to set up your own universe.
        </p>
      </section>
      <section>
        <h2>Need help?</h2>
        <p>
          If you have any questions or want feedback on your universe design,
          create an issue on
          <a
            href="https://github.com/Tomansion/Dailybildi/issues"
            target="_blank"
            rel="noopener"
            >GitHub</a
          >
          — we'd love to see what you have in mind and help you bring it to
          life!
        </p>
      </section>
    </div>
  </div>
</template>

<script>
export default {
  name: "UniverseContribution",
};
</script>

<style scoped>
.contribution-page {
  width: 100%;
  min-height: 100%;
  background-color: var(--background);
  padding-bottom: 4rem;
}

.container {
  max-width: 860px;
  margin: 0 auto;
  padding: 0 1rem;
}

.page-subtitle {
  color: var(--text-secondary);
  margin-bottom: 3rem;
  font-size: 1rem;
  max-width: 640px;
}

section {
  margin-bottom: 3rem;
}

section h2 {
  margin-bottom: 0.75rem;
}

section > p {
  margin-bottom: 0.75rem;
}

/* Examples */
.examples-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
  margin-top: 1.25rem;
}

.example-card {
  background-color: var(--surface);
  border: 1px solid var(--border);
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.example-tag {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.example-card p {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
}

/* Code blocks */
.code-block {
  background-color: var(--surface);
  border: 1px solid var(--border);
  padding: 1rem;
  margin: 1rem 0;
  overflow-x: auto;
}

.code-block pre {
  font-family: "Courier New", Courier, monospace;
  font-size: 0.85rem;
  color: var(--text-primary);
  white-space: pre;
  margin: 0;
}

code {
  font-family: "Courier New", Courier, monospace;
  font-size: 0.9em;
  background-color: var(--surface);
  border: 1px solid var(--border);
  padding: 0.1em 0.35em;
}

/* Field list */
.field-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--border);
  margin-top: 1rem;
}

.field {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  align-items: start;
}

.field:last-child {
  border-bottom: none;
}

.field code {
  border: none;
  background: none;
  padding: 0;
  font-weight: 600;
  font-size: 0.85rem;
}

.field p {
  font-size: 0.9rem;
  margin: 0;
}

/* Tips */
.tips-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--border);
  margin-top: 0.75rem;
}

.tips-list li {
  padding: 0.65rem 1rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
}

.tips-list li:last-child {
  border-bottom: none;
}

.tips-list li::before {
  content: "→ ";
  color: var(--text-primary);
  font-weight: 600;
}

/* CTA */
.cta-box {
  background-color: var(--surface);
  border: 1px solid var(--text-primary);
  padding: 1.5rem;
  margin-top: 1rem;
  margin-bottom: 3rem;
}

.cta-box h3 {
  margin-bottom: 0.5rem;
}

.cta-box p {
  font-size: 0.95rem;
}

@media (max-width: 600px) {
  .field {
    grid-template-columns: 1fr;
    gap: 0.25rem;
  }
}
</style>
