#!/usr/bin/env python
"""
Seed the block catalog with initial blocks for the ink_castle universe
Run this script after the first backend start to populate the database
"""

from app.db import SessionLocal, init_db
from app.services.block_service import BlockService

# Sample blocks for the ink_castle universe
SAMPLE_BLOCKS = [
    {
        "block_id": "stone",
        "layer": 0,
        "rarity": 0,
        "universe_id": "ink_castle",
        "image_path": "/univers/ink_castle/tiles/tile_stone_0_0.png"
    },
    {
        "block_id": "brick",
        "layer": 0,
        "rarity": 1,
        "universe_id": "ink_castle",
        "image_path": "/univers/ink_castle/tiles/tile_brick_0_1.png"
    },
    {
        "block_id": "wood",
        "layer": 0,
        "rarity": 2,
        "universe_id": "ink_castle",
        "image_path": "/univers/ink_castle/tiles/tile_wood_0_2.png"
    },
    {
        "block_id": "grass",
        "layer": 1,
        "rarity": 0,
        "universe_id": "ink_castle",
        "image_path": "/univers/ink_castle/tiles/tile_grass_1_0.png"
    },
    {
        "block_id": "flower",
        "layer": 1,
        "rarity": 3,
        "universe_id": "ink_castle",
        "image_path": "/univers/ink_castle/tiles/tile_flower_1_3.png"
    },
    {
        "block_id": "tree",
        "layer": 1,
        "rarity": 4,
        "universe_id": "ink_castle",
        "image_path": "/univers/ink_castle/tiles/tile_tree_1_4.png"
    },
    {
        "block_id": "window",
        "layer": 1,
        "rarity": 2,
        "universe_id": "ink_castle",
        "image_path": "/univers/ink_castle/tiles/tile_window_1_2.png"
    },
    {
        "block_id": "door",
        "layer": 1,
        "rarity": 3,
        "universe_id": "ink_castle",
        "image_path": "/univers/ink_castle/tiles/tile_door_1_3.png"
    },
    {
        "block_id": "roof",
        "layer": 2,
        "rarity": 1,
        "universe_id": "ink_castle",
        "image_path": "/univers/ink_castle/tiles/tile_roof_2_1.png"
    },
    {
        "block_id": "flag",
        "layer": 2,
        "rarity": 5,
        "universe_id": "ink_castle",
        "image_path": "/univers/ink_castle/tiles/tile_flag_2_5.png"
    },
]

if __name__ == "__main__":
    print("Initializing database...")
    init_db()
    
    print("Seeding block catalog...")
    db = SessionLocal()
    
    try:
        BlockService.seed_block_catalog(db, SAMPLE_BLOCKS)
        print(f"✓ Successfully seeded {len(SAMPLE_BLOCKS)} blocks!")
    except Exception as e:
        print(f"✗ Error seeding blocks: {e}")
    finally:
        db.close()
