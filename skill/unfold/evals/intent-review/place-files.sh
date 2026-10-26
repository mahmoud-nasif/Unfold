#!/usr/bin/env bash
# The orderly fixture as a git repo: main, plus a branch cancel-orders that adds order cancellation.
set -eu
cp -R "$(dirname "$0")/../diagram-a-codebase/files/." .
cd orderly
g() { git -c user.name=eval -c user.email=eval@example.com -c init.defaultBranch=main "$@"; }
g init -q
g add -A
g commit -qm "orderly: orders API and shipping worker"
g checkout -qb cancel-orders
cat >> orderly/core/orders.py <<'EOF'


def cancel_order(order_id):
    con = sqlite3.connect(DB)
    cur = con.execute("UPDATE orders SET status='cancelled' WHERE id=? AND status='new'", (order_id,))
    con.commit()
    return cur.rowcount == 1


def is_cancelled(order_id):
    con = sqlite3.connect(DB)
    row = con.execute("SELECT status FROM orders WHERE id = ?", (order_id,)).fetchone()
    return row is not None and row[0] == "cancelled"
EOF
cat >> orderly/api/routes.py <<'EOF'


@app.post("/orders/{order_id}/cancel")
def cancel(order_id: int):
    from orderly.core.orders import cancel_order
    if not cancel_order(order_id):
        raise HTTPException(status_code=409, detail="order already shipped or unknown")
    return {"id": order_id, "status": "cancelled"}
EOF
python3 - <<'EOF'
from pathlib import Path
p = Path("orderly/worker/main.py")
s = p.read_text()
s = s.replace("from orderly.core.orders import mark_shipped", "from orderly.core.orders import mark_shipped, is_cancelled")
s = s.replace("def handle(job):\n", "def handle(job):\n    if is_cancelled(job[\"id\"]):\n        return True\n")
p.write_text(s)
EOF
g add -A
g commit -qm "Let customers cancel an order before it ships"
