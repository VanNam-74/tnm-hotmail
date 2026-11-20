from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.services import eoffice
from app.core.config import config_manager

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
        
        if body.remember_me:
            config_manager.update("login", "remember", "true")
            config_manager.update("login", "user", body.username)
            config_manager.update("login", "password", body.password)
        else:
            config_manager.update("login", "remember", "")
            config_manager.update("login", "user", "")
            config_manager.update("login", "password", "")
            
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


@router.get("/remembered")
async def remembered():
    p = config_manager.parser
    remember = p.get("login", "remember", fallback="").strip().lower() == "true"
    if not remember:
        return {"remember": False, "username": "", "password": ""}
    return {
        "remember": True,
        "username": p.get("login", "user", fallback=""),
        "password": p.get("login", "password", fallback=""),
    }
