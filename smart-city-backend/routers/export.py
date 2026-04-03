"""POST /api/export/pdf — PDF report via WeasyPrint + Jinja2."""

from datetime import datetime
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import JSONResponse, Response
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

from models.schemas import ExportRequest

router = APIRouter(tags=["export"])

_TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
env = Environment(loader=FileSystemLoader(str(_TEMPLATES_DIR)))

SCENARIO_LABELS = {
    "normal": "🟢 Штатный режим · 13:00",
    "rush_hour": "🟡 Час пик · 18:00",
    "emergency": "🔴 Аварийный режим · 18:45",
    "morning_peak": "🟡 Утренний пик · 08:00",
    "night": "🔵 Ночной режим · 23:00",
}


def get_speed_status(speed: float) -> str:
    if speed >= 40:
        return "low"
    if speed >= 25:
        return "medium"
    return "high"


def get_incident_status(incidents: int) -> str:
    if incidents <= 5:
        return "low"
    if incidents <= 15:
        return "medium"
    return "high"


def _scenario_label(scenario: str) -> str:
    return SCENARIO_LABELS.get(scenario, scenario)


@router.get("/api/export/health")
async def export_health() -> dict[str, str]:
    return {"status": "export router ok"}


@router.post("/api/export/pdf")
async def export_pdf(data: ExportRequest) -> Response:
    template = env.get_template("report.html")
    html_content = template.render(
        scenario=data.scenario,
        scenario_label=_scenario_label(data.scenario),
        generated_at=datetime.now().strftime("%d.%m.%Y %H:%M"),
        has_live_data=data.has_live_data,
        transport=data.metrics.transport,
        ecology=data.metrics.ecology,
        speed_status=get_speed_status(data.metrics.transport.avg_speed),
        incident_status=get_incident_status(data.metrics.transport.incidents),
        alerts=data.alerts,
        ai=data.ai_insight,
        ai_model=data.ai_model,
    )
    try:
        pdf_bytes = HTML(string=html_content).write_pdf()
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "error": "pdf_generation_failed",
                "detail": str(e),
                "data_sources": {
                    "pdf_engine": "weasyprint",
                    "status": "error",
                },
            },
        )

    filename = (
        f"almaty-report-{data.scenario}-{datetime.now().strftime('%Y%m%d-%H%M')}.pdf"
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
