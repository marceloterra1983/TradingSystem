# PostgreSQL Migration Design Document

[Previous content remains the same...]

## FastAPI Integration

### FastAPI + Prisma Architecture
```python
# app/dependencies.py
from prisma import Prisma
from fastapi import Depends

prisma = Prisma()

async def get_prisma():
    await prisma.connect()
    try:
        yield prisma
    finally:
        await prisma.disconnect()

# app/models.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class IdeaBase(BaseModel):
    title: str
    description: Optional[str]
    status: str = "DRAFT"
    tags: List[str] = []

class IdeaCreate(IdeaBase):
    pass

class Idea(IdeaBase):
    id: str
    created_at: datetime
    updated_at: datetime
    author_id: str

    class Config:
        orm_mode = True

# app/routers/ideas.py
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_prisma
from app.models import IdeaCreate, Idea

router = APIRouter()

@router.post("/ideas/", response_model=Idea)
async def create_idea(idea: IdeaCreate, prisma=Depends(get_prisma)):
    try:
        db_idea = await prisma.idea.create({
            "data": {
                "title": idea.title,
                "description": idea.description,
                "status": idea.status,
                "tags": idea.tags,
                "author_id": "current-user"  # Replace with auth
            }
        })
        return db_idea
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/ideas/", response_model=List[Idea])
async def list_ideas(
    skip: int = 0,
    limit: int = 10,
    prisma=Depends(get_prisma)
):
    ideas = await prisma.idea.find_many(
        skip=skip,
        take=limit,
        order={"created_at": "desc"}
    )
    return ideas
```

### FastAPI Configuration
```python
# app/main.py
from fastapi import FastAPI
from app.routers import ideas, documents
from app.dependencies import prisma

app = FastAPI(
    title="TradingSystem API",
    description="API for managing trading ideas and documentation",
    version="1.0.0"
)

@app.on_event("startup")
async def startup():
    await prisma.connect()

@app.on_event("shutdown")
async def shutdown():
    await prisma.disconnect()

app.include_router(
    ideas.router,
    prefix="/api/v1",
    tags=["ideas"]
)

app.include_router(
    documents.router,
    prefix="/api/v1",
    tags=["documents"]
)
```

### Middleware Configuration
```python
# app/middleware.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from prisma.errors import PrismaError
from starlette.requests import Request
from starlette.responses import JSONResponse

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compression
app.add_middleware(GZipMiddleware)

# Error handling
@app.exception_handler(PrismaError)
async def prisma_exception_handler(request: Request, exc: PrismaError):
    return JSONResponse(
        status_code=400,
        content={"message": str(exc)},
    )
```

### Data Validation
```python
# app/validators.py
from pydantic import BaseModel, validator
from typing import List, Optional
from datetime import datetime

class DocumentBase(BaseModel):
    path: str
    title: str
    content: str
    metadata: Optional[dict] = None
    status: str = "DRAFT"

    @validator("path")
    def validate_path(cls, v):
        if not v.startswith("/"):
            raise ValueError("Path must start with /")
        return v

    @validator("status")
    def validate_status(cls, v):
        allowed = ["DRAFT", "PUBLISHED", "ARCHIVED"]
        if v not in allowed:
            raise ValueError(f"Status must be one of: {allowed}")
        return v
```

### Testing Setup
```python
# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies import prisma

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture(autouse=True)
async def setup_teardown():
    await prisma.connect()
    yield
    await prisma.disconnect()

# tests/test_ideas.py
def test_create_idea(client):
    response = client.post(
        "/api/v1/ideas/",
        json={
            "title": "Test Idea",
            "description": "Test Description",
            "tags": ["test"]
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Idea"
```

### Migration Scripts
```python
# scripts/migrate_to_postgres.py
import asyncio
from prisma import Prisma
import json
from pathlib import Path

async def migrate_ideas():
    prisma = Prisma()
    await prisma.connect()

    # Read LowDB file
    with open("data/ideas.json") as f:
        data = json.load(f)

    # Migrate each idea
    for idea in data["ideas"]:
        await prisma.idea.create({
            "data": {
                "title": idea["title"],
                "description": idea.get("description"),
                "status": idea.get("status", "DRAFT"),
                "tags": idea.get("tags", []),
                "author_id": idea.get("author_id", "migrated")
            }
        })

    await prisma.disconnect()

if __name__ == "__main__":
    asyncio.run(migrate_ideas())
```

### Performance Optimization
```python
# app/cache.py
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.decorator import cache

@router.get("/ideas/popular/", response_model=List[Idea])
@cache(expire=300)  # Cache for 5 minutes
async def get_popular_ideas(prisma=Depends(get_prisma)):
    return await prisma.idea.find_many(
        order={"votes": "desc"},
        take=10
    )
```

### Background Tasks
```python
# app/tasks.py
from fastapi import BackgroundTasks
from app.notifications import send_notification

@router.post("/ideas/", response_model=Idea)
async def create_idea(
    idea: IdeaCreate,
    background_tasks: BackgroundTasks,
    prisma=Depends(get_prisma)
):
    db_idea = await prisma.idea.create({
        "data": idea.dict()
    })

    # Add notification to background tasks
    background_tasks.add_task(
        send_notification,
        "New idea created",
        f"Idea '{idea.title}' was created"
    )

    return db_idea
```

This FastAPI integration provides:
- Type-safe database access with Prisma
- Request validation with Pydantic
- API documentation with Swagger/OpenAPI
- Background task processing
- Caching support
- Testing infrastructure
- Migration utilities

The architecture follows FastAPI best practices while leveraging Prisma's type safety and database access features.

[Rest of the original content remains the same...]