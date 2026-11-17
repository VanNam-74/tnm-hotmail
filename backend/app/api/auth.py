from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.services import eoffice

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginBody(BaseModel):
    username: str
    password: str
    remember_me: bool = False


@router.post("/login")
async def login(body: LoginBody, request: Request):
    status, data = await eoffice.login(body.username, body.password)
    if status == 200:
        request.session["user"] = data.get("username") or body.username
        return JSONResponse({"status": 200, "message": "Login successful", "user": request.session["user"]})
    if status == 401:
        return JSONResponse(status_code=401, content={"status": 401, "message": "Wrong username or password"})
    return JSONResponse(status_code=status,
                        content={"status": status, "message": data.get("message", "Login error")})


@router.post("/logout")
async def logout(request: Request):
    request.session.clear()
    return {"status": 200, "message": "Signed out"}


@router.get("/me")
async def me(request: Request):
    user = request.session.get("user")
    return {"authenticated": bool(user), "user": user}
