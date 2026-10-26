from fastapi import FastAPI
from flask import Blueprint

app = FastAPI()
bp = Blueprint("auth", __name__)


@app.get("/health")
def health():
    return {"ok": True}


@bp.route("/login", methods=["POST"])
def login():
    pass
