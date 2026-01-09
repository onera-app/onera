"""
Cortex Backend - Minimal FastAPI server for E2EE chat storage
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from routers import auth, chats, credentials, user_keys
from database import init_db

app = FastAPI(
    title="Cortex API",
    description="E2EE Chat Backend",
    version="0.1.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5175", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(chats.router, prefix="/api/v1/chats", tags=["Chats"])
app.include_router(credentials.router, prefix="/api/v1/credentials", tags=["Credentials"])
app.include_router(user_keys.router, prefix="/api/v1/user-keys", tags=["User Keys"])


@app.on_event("startup")
async def startup():
    await init_db()


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
