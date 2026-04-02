#!/usr/bin/env python3
"""
Seed all universes and their blocks to the database from config.json files
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.db import init_db, SessionLocal
from app.services.universe_service import UniverseService

def main():
    """Seed all universes from their config.json files"""
    # Initialize database
    init_db()
    
    # Get database session
    db = SessionLocal()
    
    try:
        # Get all available universes
        universes = UniverseService.list_universes()
        
        if not universes:
            print("❌ No universes found!")
            return
        
        total_seeded = 0
        
        for universe in universes:
            universe_id = universe['id']
            block_count = universe['block_count']
            print(f"\n📦 Seeding universe: {universe_id}")
            print(f"   Blocks available in config.json: {block_count}")
            
            # Seed blocks for this universe from config.json
            count = UniverseService.seed_universe_blocks(db, universe_id)
            total_seeded += count
            
            if count > 0:
                print(f"   ✅ Seeded {count} new blocks to database")
            else:
                print(f"   ℹ️ All {block_count} blocks already in database")
        
        print(f"\n✅ Successfully seeded {total_seeded} total blocks to database across {len(universes)} universes!")
        print("💾 Blocks are sourced from config.json files")
        print("📋 Daily selections are stored in backend/app/data/daily_selections/")
        
    except Exception as e:
        print(f"❌ Error seeding universes: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
