import sqlite3

DB = "orders.db"


def validate(order):
    errors = []
    if not order.get("items"):
        errors.append("no items")
    if order.get("total", 0) <= 0:
        errors.append("total must be positive")
    return errors


def save_order(order):
    con = sqlite3.connect(DB)
    cur = con.execute("INSERT INTO orders(total, status) VALUES (?, 'new')", (order["total"],))
    con.commit()
    return cur.lastrowid


def load_order(order_id):
    con = sqlite3.connect(DB)
    return con.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()


def mark_shipped(order_id, tracking):
    con = sqlite3.connect(DB)
    con.execute("UPDATE orders SET status='shipped', tracking=? WHERE id=?", (tracking, order_id))
    con.commit()
