"""Load blocks from filesystem config instead of database"""

import json
from pathlib import Path
from functools import lru_cache
from typing import List, Dict, Optional


class BlockConfig:
    """Represents a single block from config.json"""

    def __init__(
        self,
        block_id: str,
        layer: int,
        rarity: int,
        image_path: str,
        universe_id: str,
        width: int = 1,
        height: int = 1,
    ):
        self.id = f"block-{universe_id}-{block_id}"
        self.block_id = str(block_id)
        self.layer = layer
        self.rarity = rarity
        self.image_path = image_path
        self.universe_id = universe_id
        self.width = width
        self.height = height

    def to_dict(self) -> dict:
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "block_id": self.block_id,
            "layer": self.layer,
            "rarity": self.rarity,
            "image_path": self.image_path,
            "universe_id": self.universe_id,
            "width": self.width,
            "height": self.height,
        }


class BlockLoader:
    """Load blocks from filesystem config.json files"""

    # Cache blocks per universe
    _cache: Dict[str, List[BlockConfig]] = {}

    @staticmethod
    def get_universe_path(universe_id: str) -> Path:
        """Get the path to universe folder"""
        # Backend is at /backend, public is at /public
        project_root = Path(__file__).parent.parent.parent.parent
        return project_root / "public" / "univers" / universe_id

    @staticmethod
    def load_blocks(universe_id: str) -> List[BlockConfig]:
        """Load blocks from config.json for a universe"""
        # Return cached if available
        if universe_id in BlockLoader._cache:
            return BlockLoader._cache[universe_id]

        universe_path = BlockLoader.get_universe_path(universe_id)
        config_path = universe_path / "config.json"

        if not config_path.exists():
            print(f"⚠️  Config file not found: {config_path}")
            return []

        try:
            with open(config_path, "r") as f:
                config = json.load(f)

            blocks = []
            for block_data in config.get("blocks", []):
                block = BlockConfig(
                    block_id=str(block_data["id"]),
                    layer=block_data["layer"],
                    rarity=block_data["rarity"],
                    image_path=block_data["imagePath"],
                    universe_id=universe_id,
                    width=block_data.get("width", 1),
                    height=block_data.get("height", 1),
                )
                blocks.append(block)

            # Cache the blocks
            BlockLoader._cache[universe_id] = blocks

            print(
                f"✅ Loaded {len(blocks)} blocks for universe '{universe_id}' from {config_path}"
            )
            return blocks

        except json.JSONDecodeError as e:
            print(f"❌ Error parsing {config_path}: {e}")
            return []
        except Exception as e:
            print(f"❌ Error loading blocks from {config_path}: {e}")
            return []

    @staticmethod
    def get_block_by_id(universe_id: str, block_id: str) -> Optional[BlockConfig]:
        """Get a specific block by ID"""
        blocks = BlockLoader.load_blocks(universe_id)
        for block in blocks:
            if block.block_id == str(block_id):
                return block
        return None

    @staticmethod
    def clear_cache():
        """Clear the block cache (useful for testing)"""
        BlockLoader._cache.clear()
