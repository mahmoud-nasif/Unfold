import argparse
import requests
from orderly.core.queue import dequeue
from orderly.core.orders import mark_shipped

CARRIER_URL = "https://carrier.example.com/shipments"


def handle(job):
    resp = requests.post(CARRIER_URL, json={"order": job["id"]}, timeout=10)
    if resp.status_code != 200:
        return False
    mark_shipped(job["id"], resp.json()["tracking"])
    return True


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--max-retries", type=int, default=3)
    args = p.parse_args()
    while True:
        job = dequeue("orders.created")
        if job is None:
            continue
        for _ in range(args.max_retries):
            if handle(job):
                break


if __name__ == "__main__":
    main()
