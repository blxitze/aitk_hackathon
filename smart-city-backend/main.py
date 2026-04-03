from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import analyze, metrics
from routers.export import router as export_router

app = FastAPI(title="Smart City Almaty API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(metrics.router)
app.include_router(analyze.router)
app.include_router(export_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
