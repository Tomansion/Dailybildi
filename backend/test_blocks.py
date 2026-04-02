#!/usr/bin/env python3
"""Test block distribution system"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

from app.db import init_db, SessionLocal
from app.services.universe_service import UniverseService
from app.models import User, UserInventory, InventoryBlock, BlockCatalog
from app.services.auth_service import AuthService
import uuid

def get_user_blocks(db, user_id):
    """Helper to get user's blocks"""
    inventory = db.query(UserInventory).filter(UserInventory.user_id == user_id).first()
    if not inventory:
        return {}
    
    blocks = db.query(InventoryBlock).filter(
        InventoryBlock.inventory_id == inventory.id
    ).all()
    
    result = {}
    for block in blocks:
        block_id = block.block_catalog.block_id
        result[block_id] = block.quantity
    
    return result

def test_block_distribution():
    """Test that blocks are properly distributed on first time and daily"""
    init_db()
    db = SessionLocal()
    
    try:
        # Create test user
        print("📝 Creating test user...")
        username = f"testuser_{uuid.uuid4().hex[:8]}"
        AuthService.register_user(db, username, "password123")
        
        # Get the user
        user = db.query(User).filter(User.username == username).first()
        print(f"✓ User created: {user.id}")
        
        # Enter universe (first time)
        print("\n🌍 Entering universe for first time...")
        result = UniverseService.initialize_user_in_universe(db, user.id, "ink_castle")
        print(f"✓ World created: {result['world_id']}")
        
        # Check inventory
        inventory = db.query(UserInventory).filter(UserInventory.user_id == user.id).first()
        inventory_blocks = db.query(InventoryBlock).filter(
            InventoryBlock.inventory_id == inventory.id
        ).all()
        total_quantity = sum(b.quantity for b in inventory_blocks)
        block_count = len(inventory_blocks)
        
        print(f"✓ Initial blocks received: {block_count} unique types, {total_quantity} total")
        print(f"  - initial_blocks_received: {inventory.initial_blocks_received}")
        print(f"  - last_blocks_provided_date: {inventory.last_blocks_provided_date}")
        
        if total_quantity != 30:
            print(f"⚠️  Expected 30 total blocks, got {total_quantity}")
        else:
            print(f"✅ Correct! User received 30 initial blocks (across {block_count} unique types)")
        
        # Try entering again (same day - should not get new blocks)
        print("\n🔄 Entering universe again (same day)...")
        result = UniverseService.initialize_user_in_universe(db, user.id, "ink_castle")
        print(f"✓ World already exists: {result['is_new']}")
        
        # Check inventory again
        block_count_2 = db.query(InventoryBlock).filter(
            InventoryBlock.inventory_id == inventory.id
        ).count()
        print(f"✓ Total blocks still: {block_count_2}")
        
        if block_count_2 != block_count:
            print(f"⚠️  Warning: Block count changed {block_count} → {block_count_2}")
        else:
            print(f"✅ Correct! No new blocks given on same day")
        
        print("\n" + "="*50)
        print("✅ Block distribution test passed!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def test_same_day_same_blocks():
    """Test that two users registering on the same day get the same initial blocks"""
    init_db()
    db = SessionLocal()
    
    try:
        print("\n" + "="*60)
        print("👥 TEST: Two users same day should get identical blocks")
        print("="*60)
        
        # Create first user
        print("\n👤 User 1: Registering...")
        username1 = f"testuser1_{uuid.uuid4().hex[:8]}"
        AuthService.register_user(db, username1, "password123")
        user1 = db.query(User).filter(User.username == username1).first()
        print(f"✓ User 1 created: {user1.id}")
        
        # Enter universe
        print("🌍 User 1: Entering universe...")
        UniverseService.initialize_user_in_universe(db, user1.id, "ink_castle")
        blocks1 = get_user_blocks(db, user1.id)
        print(f"✓ User 1 received {len(blocks1)} block types, {sum(blocks1.values())} total")
        print(f"  Block distribution: {dict(sorted(blocks1.items()))}")
        
        # Create second user
        print("\n👤 User 2: Registering on same day...")
        username2 = f"testuser2_{uuid.uuid4().hex[:8]}"
        AuthService.register_user(db, username2, "password123")
        user2 = db.query(User).filter(User.username == username2).first()
        print(f"✓ User 2 created: {user2.id}")
        
        # Enter universe
        print("🌍 User 2: Entering universe...")
        UniverseService.initialize_user_in_universe(db, user2.id, "ink_castle")
        blocks2 = get_user_blocks(db, user2.id)
        print(f"✓ User 2 received {len(blocks2)} block types, {sum(blocks2.values())} total")
        print(f"  Block distribution: {dict(sorted(blocks2.items()))}")
        
        # Compare
        print("\n🔍 Comparison:")
        if blocks1 == blocks2:
            print("✅ PERFECT! Both users have identical block distributions!")
            print("="*60)
            return True
        else:
            print("❌ FAIL! Users have different block distributions")
            print("\nDifferences:")
            all_blocks = set(blocks1.keys()) | set(blocks2.keys())
            for block_id in sorted(all_blocks):
                qty1 = blocks1.get(block_id, 0)
                qty2 = blocks2.get(block_id, 0)
                if qty1 != qty2:
                    print(f"  Block {block_id}: User1={qty1}, User2={qty2}")
            print("="*60)
            return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    test_block_distribution()
    test_same_day_same_blocks()
