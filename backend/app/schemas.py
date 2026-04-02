from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class UserRegisterRequest(BaseModel):
    username: str
    password: str


class UserLoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: str
    username: str
    created_at: datetime
    first_login_at: Optional[datetime] = None
    received_initial_blocks: bool

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class BlockCatalogResponse(BaseModel):
    id: str
    block_id: str
    layer: int
    rarity: int
    universe_id: str
    image_path: str

    class Config:
        from_attributes = True


class InventoryBlockResponse(BaseModel):
    id: str
    block_catalog_id: str
    quantity: int
    acquired_date: datetime
    block_catalog: BlockCatalogResponse

    class Config:
        from_attributes = True


class UserInventoryResponse(BaseModel):
    id: str
    user_id: str
    updated_at: datetime
    blocks: list[InventoryBlockResponse]

    class Config:
        from_attributes = True


class PlacedBlockRequest(BaseModel):
    block_catalog_id: str
    grid_x: int
    grid_y: int
    rotation: int = 0
    flip_x: bool = False
    flip_y: bool = False
    z_order: int


class PlacedBlockUpdateRequest(BaseModel):
    grid_x: Optional[int] = None
    grid_y: Optional[int] = None
    rotation: Optional[int] = None
    flip_x: Optional[bool] = None
    flip_y: Optional[bool] = None
    z_order: Optional[int] = None


class PlacedBlockResponse(BaseModel):
    id: str
    world_id: str
    block_catalog_id: str
    grid_x: int
    grid_y: int
    rotation: int
    flip_x: bool
    flip_y: bool
    z_order: int
    placed_at: datetime
    block_catalog: BlockCatalogResponse

    class Config:
        from_attributes = True


class WorldResponse(BaseModel):
    id: str
    user_id: str
    universe_id: str
    created_at: datetime
    updated_at: datetime
    like_count: int
    placed_blocks: list[PlacedBlockResponse] = []

    class Config:
        from_attributes = True


class LikeResponse(BaseModel):
    id: str
    user_id: str
    world_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class CommunityWorldResponse(BaseModel):
    id: str
    user_id: str
    universe_id: str
    created_at: datetime
    updated_at: datetime
    like_count: int
    user: UserResponse
    placed_blocks: list[PlacedBlockResponse] = []

    class Config:
        from_attributes = True


class PaginatedResponse(BaseModel):
    items: list[CommunityWorldResponse]
    total: int
    skip: int
    limit: int
    has_more: bool
