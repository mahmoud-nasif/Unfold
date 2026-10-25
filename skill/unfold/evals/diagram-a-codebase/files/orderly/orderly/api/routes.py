import os
from fastapi import FastAPI, HTTPException
from orderly.core.orders import validate, save_order
from orderly.core.queue import enqueue

app = FastAPI()
API_KEY = os.environ.get("ORDERLY_API_KEY")


@app.post("/orders")
def create_order(order: dict):
    errors = validate(order)
    if errors:
        raise HTTPException(status_code=400, detail=errors)
    order_id = save_order(order)
    enqueue("orders.created", {"id": order_id})
    return {"id": order_id, "status": "accepted"}


@app.get("/orders/{order_id}")
def get_order(order_id: int):
    from orderly.core.orders import load_order
    return load_order(order_id)
