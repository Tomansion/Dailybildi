#!/usr/bin/env python3
"""Test block placement workflow"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.db import init_db, SessionLocal
from app.services.auth_service import AuthService
from app.services.inventory_service import InventoryService
from app.services.world_service import WorldService
from app.services.universe_service import UniverseService
from app.models import User, UserInventory, InventoryBlock, World
import uuid

def test_block_placement():
    """Test complete block placement workflow"""
    init_db()
    db = SessionLocal()
    
    try:
        # 1. Create user via registration
        print("=" * 70)
        print("1️⃣  CREATING USER")
        print("=" * 70)
        username = f"testuser_{uuid.uuid4().hex[:8]}"
        print(f"📝 Registering user: {username}")
        AuthService.register_user(db, username, "password123")
        
        user = db.query(User).filter(User.username == username).first()
        print(f"✓ User created: {user.id}")
        
        # 2. Check inventory after registration
        print("\n" + "=" * 70)
        print("2️⃣  CHECKING INITIAL INVENTORY")
        print("=" * 70)
        inventory = InventoryService.get_user_inventory(db, user.id)
        print(f"✓ Inventory ID: {inventory.id}")
        
        inv_blocks = db.query(InventoryBlock).filter(
            InventoryBlock.inventory_id == inventory.id
        ).all()
        
        print(f"✓ Total unique block types: {len(inv_blocks)}")
        total_qty = sum(b.quantity for b in inv_blocks)
        print(f"✓ Total blocks (sum of quantities): {total_qty}")
        
        if len(inv_blocks) == 0:
            print("❌ ERROR: User has no blocks in inventory!")
            print("   Registration should have distributed 30 blocks")
            return False
        
        # List first 10 blocks
        print("\n📦 First 10 blocks in inventory:")
        for i, block in enumerate(inv_blocks[:10], 1):
            print(f"   {i}. block_catalog_id={block.block_catalog_id!r}, quantity={block.quantity}")
        
        # 3. Try to place the first block
        print("\n" + "=" * 70)
        print("3️⃣  PLACING FIRST BLOCK")
        print("=" * 70)
        
        first_block = inv_blocks[0]
        print(f"🎮 Attempting to place block: {first_block.block_catalog_id!r}")
        print(f"   Available quantity: {first_block.quantity}")
        
        # Initialize user in universe (creates world)
        result = UniverseService.initialize_user_in_universe(db, user.id, "ink_castle")
        world = WorldService.get_user_world(db, user.id)
        print(f"✓ World ID: {world.id}")
        
        # Place the block
        try:
            placed_block = WorldService.place_block(
                db,
                world.id,
                first_block.block_catalog_id,
                grid_x=5,
                grid_y=29,
                z_order=0,
                rotation=0,
                flip_x=False,
                flip_y=False,
                user_id=user.id
            )
            print(f"✓ Block placed successfully!")
            print(f"   Placed block ID: {placed_block.id}")
            print(f"   Grid position: ({placed_block.grid_x}, {placed_block.grid_y})")
            
        except ValueError as e:
            print(f"❌ ERROR placing block: {e}")
            return False
        
        # 4. Verify block was placed
        print("\n" + "=" * 70)
        print("4️⃣  VERIFYING PLACEMENT")
        print("=" * 70)
        
        world_refreshed = WorldService.get_user_world(db, user.id)
        print(f"✓ World has {len(world_refreshed.placed_blocks)} placed blocks")
        
        if len(world_refreshed.placed_blocks) > 0:
            pb = world_refreshed.placed_blocks[0]
            print(f"  Block: {pb.block_catalog_id} at ({pb.grid_x}, {pb.grid_y})")
        
        # 5. Test with the exact block ID from user's request
        print("\n" + "=" * 70)
        print("5️⃣  TESTING WITH USER'S BLOCK ID")
        print("=" * 70)
        
        user_block_id = "block-ink_castle-0"
        print(f"🔍 Looking for block: {user_block_id!r}")
        
        found = db.query(InventoryBlock).filter(
            InventoryBlock.inventory_id == inventory.id,
            InventoryBlock.block_catalog_id == user_block_id
        ).first()
        
        if found:
            print(f"✓ Block found in inventory!")
            print(f"  Quantity: {found.quantity}")
            
            # Try to place it
            try:
                placed_block2 = WorldService.place_block(
                    db,
                    world.id,
                    user_block_id,
                    grid_x=6,
                    grid_y=30,
                    z_order=0,
                    rotation=0,
                    flip_x=False,
                    flip_y=False,
                    user_id=user.id
                )
                print(f"✓ Successfully placed {user_block_id}")
            except ValueError as e:
                print(f"❌ Error placing {user_block_id}: {e}")
        else:
            print(f"❌ Block '{user_block_id}' NOT found in inventory")
            print(f"\n   Available block IDs in inventory:")
            for block in inv_blocks[:5]:
                print(f"   - {block.block_catalog_id!r}")
        
        print("\n" + "=" * 70)
        print("✅ TEST COMPLETE")
        print("=" * 70)
        return True
        
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    success = test_block_placement()
    sys.exit(0 if success else 1)
