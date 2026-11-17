import json

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from app.repositories import account_repo
from app.services.detail import build_detail_emails

router = APIRouter(prefix="/api/filter", tags=["filter"])


@router.get("/profiles")
def profiles(page: int = Query(1, ge=1), limit: int = Query(25, ge=1, le=500)):
    offset = (page - 1) * limit
    result = account_repo.paginate(offset=offset, limit=limit)
    return {
        "total": result["total"],
        "page": page,
        "limit": limit,
        "data": result["data"],
        "all_status": account_repo.status_counts(),
    }

@router.post("/search")
def search(payload: dict, page: int = Query(1, ge=1), limit: int = Query(25, ge=1, le=500)):
    emails = payload.get("emails")
    if emails is None and payload.get("email"):
        emails = [payload["email"]]
    account_ids = payload.get("account_ids")
    print("account_ids ", account_ids)
    if account_ids is None and payload.get("account_id"):
        account_ids = [payload["account_id"]]

    result = account_repo.search(
        account_ids=account_ids,
        emails=emails,
        status=payload.get("status") or None,
        date_from=(payload.get("date_range") or {}).get("from"),
        date_to=(payload.get("date_range") or {}).get("to"),
    )
    start = (page - 1) * limit
    return {"total": len(result), "page": page, "limit": limit, "data": result[start:start + limit]}


@router.get("/status-counts")
def status_counts():
    return {"data": account_repo.status_counts()}


@router.get("/detail/{account_id}")
def detail(account_id: int):
    acc = account_repo.get_detail(account_id)
    if not acc:
        return JSONResponse(status_code=404, content={"message": "Not found"})
    listmail = acc.get("listmail")
    if isinstance(listmail, str):
        try:
            listmail = json.loads(listmail)
        except Exception:
            listmail = {}
    emails = build_detail_emails(listmail or {})
    return {"account": {k: v for k, v in acc.items() if k != "listmail"}, "emails": emails}
