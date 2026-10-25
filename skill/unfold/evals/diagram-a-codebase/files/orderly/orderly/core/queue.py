import json
import redis

r = redis.Redis()


def enqueue(topic, payload):
    r.lpush(topic, json.dumps(payload))


def dequeue(topic, timeout=5):
    item = r.brpop(topic, timeout=timeout)
    return json.loads(item[1]) if item else None
