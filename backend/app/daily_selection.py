"""Daily block selection storage - stores only current day's selections in memory"""
import random
from datetime import date
from app.config import get_settings

settings = get_settings()


class DailySelectionManager:
    """Manages daily block selections stored in memory (current day only)"""
    
    # In-memory cache for current day only
    _cached_date = None  # Current cached date
    _daily_blocks_by_universe = {}  # {universe_id: [block_ids]}
    _initial_blocks_by_universe = {}  # {universe_id: [block_ids]}
    
    @staticmethod
    def _check_day_changed():
        """Check if day has changed and clear cache if needed"""
        today = str(date.today())
        if DailySelectionManager._cached_date != today:
            DailySelectionManager._cached_date = today
            DailySelectionManager._daily_blocks_by_universe.clear()
            DailySelectionManager._initial_blocks_by_universe.clear()
    
    @staticmethod
    def get_or_create_daily_blocks(universe_id: str, available_blocks: list) -> list:
        """
        Get today's daily block selection or create it if it doesn't exist.
        Only stores current day's selection in memory.
        
        Args:
            universe_id: The universe ID
            available_blocks: List of available block configurations from universe config
            
        Returns:
            List of selected block IDs for today
        """
        DailySelectionManager._check_day_changed()
        
        # Check if cached for this universe
        if universe_id in DailySelectionManager._daily_blocks_by_universe:
            return DailySelectionManager._daily_blocks_by_universe[universe_id]
        
        # Create new selection for this universe
        return DailySelectionManager.create_daily_blocks(universe_id, available_blocks)
    
    @staticmethod
    def get_or_create_initial_blocks(universe_id: str, available_blocks: list) -> list:
        """
        Get today's initial block selection (for first-time users) or create it if it doesn't exist.
        All users registering/entering as first-time on the same day get the same 30 blocks.
        Only stores current day's selection in memory.
        
        Args:
            universe_id: The universe ID
            available_blocks: List of available block configurations
            
        Returns:
            List of selected block IDs for initial distribution
        """
        DailySelectionManager._check_day_changed()
        
        # Check if cached for this universe
        if universe_id in DailySelectionManager._initial_blocks_by_universe:
            return DailySelectionManager._initial_blocks_by_universe[universe_id]
        
        # Create new selection for this universe
        return DailySelectionManager.create_initial_blocks(universe_id, available_blocks)
    
    @staticmethod
    def create_daily_blocks(universe_id: str, available_blocks: list) -> list:
        """
        Create a new daily block selection and store for current day.
        
        Args:
            universe_id: The universe ID
            available_blocks: List of available block configurations
            
        Returns:
            List of selected block IDs
        """
        if not available_blocks:
            raise ValueError(f"No blocks available for universe {universe_id}")
        
        # Create weighted selection based on rarity
        weights = []
        for block in available_blocks:
            rarity = block.get("rarity", 0)
            rarity_weight = settings.RARITY_WEIGHTS.get(rarity, 1)
            weights.append(rarity_weight)
        
        # Select DAILY_BLOCKS_COUNT blocks using weighted selection
        selected_count = min(settings.DAILY_BLOCKS_COUNT, len(available_blocks))
        
        indices = random.choices(
            range(len(available_blocks)),
            weights=weights,
            k=selected_count
        )
        
        selected_block_ids = [available_blocks[i]["id"] for i in indices]
        
        # Store in memory cache for current day
        DailySelectionManager._daily_blocks_by_universe[universe_id] = selected_block_ids
        
        return selected_block_ids
    
    @staticmethod
    def create_initial_blocks(universe_id: str, available_blocks: list) -> list:
        """
        Create and store initial block selection for first-time users for current day.
        Deterministic per day - all users on the same day get the same 30 blocks.
        
        Args:
            universe_id: The universe ID
            available_blocks: List of available block configurations
            
        Returns:
            List of selected block IDs (30 total, may have duplicates for rarity)
        """
        if not available_blocks:
            raise ValueError(f"No blocks available for universe {universe_id}")
        
        # Create weighted selection based on rarity
        weights = []
        for block in available_blocks:
            rarity = block.get("rarity", 0)
            rarity_weight = settings.RARITY_WEIGHTS.get(rarity, 1)
            weights.append(rarity_weight)
        
        # Select 30 blocks using weighted selection
        selected_count = settings.INITIAL_BLOCKS_COUNT
        
        indices = random.choices(
            range(len(available_blocks)),
            weights=weights,
            k=selected_count
        )
        
        selected_block_ids = [available_blocks[i]["id"] for i in indices]
        
        # Store in memory cache for current day
        DailySelectionManager._initial_blocks_by_universe[universe_id] = selected_block_ids
        
        # Also create daily blocks if not already cached
        if universe_id not in DailySelectionManager._daily_blocks_by_universe:
            DailySelectionManager.create_daily_blocks(universe_id, available_blocks)
        
        return selected_block_ids
    
    @staticmethod
    def get_cache_stats() -> dict:
        """
        Get statistics about the current cache state.
        
        Returns:
            Dictionary with cache statistics
        """
        return {
            "cached_date": DailySelectionManager._cached_date,
            "daily_selctions_universes": len(DailySelectionManager._daily_blocks_by_universe),
            "initial_blocks_universes": len(DailySelectionManager._initial_blocks_by_universe)
        }
    
    @staticmethod
    def clear_cache():
        """
        Clear all in-memory caches.
        Useful for testing or resetting selections.
        """
        DailySelectionManager._cached_date = None
        DailySelectionManager._daily_blocks_by_universe.clear()
        DailySelectionManager._initial_blocks_by_universe.clear()
