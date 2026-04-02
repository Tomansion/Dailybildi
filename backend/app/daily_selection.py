"""Daily block selection storage - stores daily selections in JSON files instead of database"""
import json
import random
from datetime import datetime, date
from pathlib import Path
from app.config import get_settings

settings = get_settings()


class DailySelectionManager:
    """Manages daily block selections stored in JSON files"""
    
    # Path where daily selections are stored
    DAILY_SELECTIONS_DIR = Path(__file__).parent.parent / "data" / "daily_selections"
    
    @staticmethod
    def _ensure_dir():
        """Ensure the daily selections directory exists"""
        DailySelectionManager.DAILY_SELECTIONS_DIR.mkdir(parents=True, exist_ok=True)
    
    @staticmethod
    def _get_selection_file(date_str: str) -> Path:
        """Get the file path for a specific date's selection"""
        DailySelectionManager._ensure_dir()
        return DailySelectionManager.DAILY_SELECTIONS_DIR / f"{date_str}.json"
    
    @staticmethod
    def get_or_create_daily_blocks(universe_id: str, available_blocks: list) -> list:
        """
        Get today's daily block selection or create it if it doesn't exist.
        
        Args:
            universe_id: The universe ID
            available_blocks: List of available block configurations from universe config
            
        Returns:
            List of selected block IDs for today
        """
        today = str(date.today())
        selection_file = DailySelectionManager._get_selection_file(today)
        
        # Check if today's selection already exists
        if selection_file.exists():
            try:
                with open(selection_file, 'r') as f:
                    data = json.load(f)
                    if data.get("universe_id") == universe_id:
                        return data.get("daily_blocks", [])
            except Exception as e:
                print(f"Error reading daily selection file {selection_file}: {e}")
        
        # Create new selection
        return DailySelectionManager.create_daily_blocks(today, universe_id, available_blocks)
    
    @staticmethod
    def get_or_create_initial_blocks(universe_id: str, available_blocks: list) -> list:
        """
        Get today's initial block selection (for first-time users) or create it if it doesn't exist.
        All users registering/entering as first-time on the same day get the same 30 blocks.
        
        Args:
            universe_id: The universe ID
            available_blocks: List of available block configurations
            
        Returns:
            List of selected block IDs for initial distribution (with quantities)
        """
        today = str(date.today())
        selection_file = DailySelectionManager._get_selection_file(today)
        
        # Check if today's selection already exists
        if selection_file.exists():
            try:
                with open(selection_file, 'r') as f:
                    data = json.load(f)
                    if data.get("universe_id") == universe_id and "initial_blocks" in data:
                        return data.get("initial_blocks", [])
            except Exception as e:
                print(f"Error reading initial blocks file {selection_file}: {e}")
        
        # Create new selection (will also create daily blocks if needed)
        return DailySelectionManager.create_initial_blocks(today, universe_id, available_blocks)
    
    @staticmethod
    def create_daily_blocks(date_str: str, universe_id: str, available_blocks: list) -> list:
        """
        Create and store a new daily block selection.
        
        Args:
            date_str: Date string (YYYY-MM-DD format)
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
        
        # Read existing data if file exists
        selection_file = DailySelectionManager._get_selection_file(date_str)
        existing_data = {}
        if selection_file.exists():
            try:
                with open(selection_file, 'r') as f:
                    existing_data = json.load(f)
            except Exception:
                pass
        
        # Update with daily blocks
        selection_data = {
            "date": date_str,
            "universe_id": universe_id,
            "daily_blocks": selected_block_ids,
            "created_at": datetime.utcnow().isoformat(),
            **{k: v for k, v in existing_data.items() if k not in ["daily_blocks", "created_at"]}
        }
        
        try:
            with open(selection_file, 'w') as f:
                json.dump(selection_data, f, indent=2)
        except Exception as e:
            print(f"Error writing daily selection file {selection_file}: {e}")
            raise
        
        return selected_block_ids
    
    @staticmethod
    def create_initial_blocks(date_str: str, universe_id: str, available_blocks: list) -> list:
        """
        Create and store initial block selection for first-time users on a given day.
        Deterministic per day - all users on the same day get the same 30 blocks.
        
        Args:
            date_str: Date string (YYYY-MM-DD format)
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
        
        # Read existing data if file exists
        selection_file = DailySelectionManager._get_selection_file(date_str)
        existing_data = {}
        if selection_file.exists():
            try:
                with open(selection_file, 'r') as f:
                    existing_data = json.load(f)
            except Exception:
                pass
        
        # Create daily blocks if not present
        daily_blocks = existing_data.get("daily_blocks")
        if not daily_blocks:
            # Generate daily blocks as well
            daily_weights = []
            for block in available_blocks:
                rarity = block.get("rarity", 0)
                rarity_weight = settings.RARITY_WEIGHTS.get(rarity, 1)
                daily_weights.append(rarity_weight)
            
            daily_indices = random.choices(
                range(len(available_blocks)),
                weights=daily_weights,
                k=min(settings.DAILY_BLOCKS_COUNT, len(available_blocks))
            )
            daily_blocks = [available_blocks[i]["id"] for i in daily_indices]
        
        # Store the selection
        selection_data = {
            "date": date_str,
            "universe_id": universe_id,
            "initial_blocks": selected_block_ids,
            "daily_blocks": daily_blocks,
            "created_at": datetime.utcnow().isoformat()
        }
        
        try:
            with open(selection_file, 'w') as f:
                json.dump(selection_data, f, indent=2)
        except Exception as e:
            print(f"Error writing initial blocks file {selection_file}: {e}")
            raise
        
        return selected_block_ids
    
    @staticmethod
    def clear_old_selections(days_to_keep: int = 7):
        """
        Clean up old daily selection files.
        
        Args:
            days_to_keep: Number of days of history to keep
        """
        DailySelectionManager._ensure_dir()
        
        today = date.today()
        cutoff_date = today.replace(day=today.day - days_to_keep) if today.day > days_to_keep else today
        
        for selection_file in DailySelectionManager.DAILY_SELECTIONS_DIR.glob("*.json"):
            try:
                file_date = datetime.fromisoformat(selection_file.stem).date()
                if file_date < cutoff_date:
                    selection_file.unlink()
            except Exception as e:
                print(f"Error processing {selection_file}: {e}")
