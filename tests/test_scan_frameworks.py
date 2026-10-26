"""Framework-aware I/O detection in scripts/scan_repo.py, against tests/fixtures/polyglot.

Each case reads: given one small real-looking file per framework, when the fixture is scanned,
then the signal is reported with its kind, detail and file:line.
"""
import shutil
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests" / "fixtures" / "polyglot"
sys.path.insert(0, str(ROOT / "skill" / "unfold" / "scripts"))
import scan_repo  # noqa: E402


@pytest.fixture(scope="module")
def signals(tmp_path_factory):
    # A copy outside any git work tree, so the plain folder walk is what gets tested
    root = tmp_path_factory.mktemp("poly") / "polyglot"
    shutil.copytree(FIXTURE, root)
    report = scan_repo.scan(root)
    return {(cat, s["kind"], s["detail"], s["at"]) for cat, items in report["signals"].items() for s in items}, report


@pytest.mark.parametrize("cat, kind, detail, at", [
    # Spring
    ("http", "route", "Request /api/orders", "spring/src/main/java/shop/OrderController.java:4"),
    ("http", "route", "Get /{id}", "spring/src/main/java/shop/OrderController.java:6"),
    ("http", "route", "Post /bulk", "spring/src/main/java/shop/OrderController.java:9"),
    ("messaging", "kafka consumer", "orders.created", "spring/src/main/java/shop/OrderController.java:12"),
    ("messaging", "kafka producer", "orders.shipped", "spring/src/main/java/shop/OrderController.java:14"),
    # NestJS
    ("http", "controller", "orders", "nest/src/orders.controller.ts:3"),
    ("http", "route", "Get :id", "nest/src/orders.controller.ts:5"),
    ("http", "route", "Post", "nest/src/orders.controller.ts:8"),
    ("messaging", "nest message", "order_created", "nest/src/orders.controller.ts:11"),
    # FastAPI, Flask, Django
    ("http", "route", "/health", "py/api.py:8"),
    ("http", "route", "/login", "py/api.py:13"),
    ("http", "route", "carts", "django/shop/urls.py:5"),
    ("http", "route", "/products/", "django/shop/urls.py:8"),
    ("http", "route", "/^legacy/", "django/shop/urls.py:9"),
    # Express
    ("http", "route", "/webhooks/stripe", "express/server.js:5"),
    ("http", "route", "/items", "express/server.js:6"),
    # ASP.NET
    ("http", "route prefix", "api/[controller]", "aspnet/OrdersController.cs:4"),
    ("http", "route", "HttpGet {id}", "aspnet/OrdersController.cs:7"),
    ("http", "route", "HttpPost", "aspnet/OrdersController.cs:10"),
    ("http", "route", "Get /ping", "aspnet/Program.cs:3"),
    # gRPC and protobuf
    ("rpc", "grpc service", "OrderService", "proto/orders.proto:5"),
    ("rpc", "grpc method", "GetOrder(GetOrderRequest) -> Order", "proto/orders.proto:6"),
    ("rpc", "grpc method", "WatchOrders(stream WatchRequest) -> stream OrderEvent", "proto/orders.proto:7"),
    ("rpc", "grpc server", "GreeterService", "aspnet/Program.cs:4"),
    ("rpc", "grpc server", "OrderService", "go/main.go:5"),
    ("rpc", "grpc client", "Inventory", "go/main.go:6"),
    # Kafka, RabbitMQ, NATS, Redis
    ("messaging", "kafka consumer", "payments", "py/messaging.py:4"),
    ("messaging", "kafka producer", "invoices", "py/messaging.py:6"),
    ("messaging", "rabbitmq queue", "emails", "py/messaging.py:7"),
    ("messaging", "rabbitmq publish", "emails", "py/messaging.py:8"),
    ("messaging", "nats", "telemetry.>", "py/messaging.py:9"),
    ("messaging", "redis pub/sub", "cache-invalidate", "py/messaging.py:10"),
    ("messaging", "nats", "orders.audit", "go/main.go:7"),
    ("messaging", "redis pub/sub", "prices", "go/main.go:8"),
    # Terraform, Kubernetes, GitHub Actions
    ("infra", "terraform module", "vpc", "infra/terraform/main.tf:1"),
    ("infra", "terraform resource", "aws_s3_bucket.uploads", "infra/terraform/main.tf:5"),
    ("infra", "terraform resource", "aws_sqs_queue.orders", "infra/terraform/main.tf:9"),
    ("infra", "k8s deployment", "Deployment/shop-api", "infra/k8s/app.yaml:2"),
    ("infra", "k8s service", "Service/shop-api", "infra/k8s/app.yaml:9"),
    ("infra", "k8s ingress", "Ingress/shop", "infra/k8s/app.yaml:17"),
    ("http", "ingress path", "/api", "infra/k8s/app.yaml:24"),
    ("infra", "ci workflow", "CI (on: push, pull_request)", ".github/workflows/ci.yml:1"),
])
def test_framework_signal_is_detected_with_file_and_line(signals, cat, kind, detail, at):
    assert (cat, kind, detail, at) in signals[0]


def test_python_grpc_registration_is_merged_with_go_and_counted(signals):
    # Given the same service registered in Python and Go, then one line with both places
    item = next(s for s in signals[1]["signals"]["rpc"] if s["kind"] == "grpc server" and s["detail"] == "OrderService")
    assert item["count"] == 2 and item["also"] == ["py/messaging.py:12"]


def test_generated_minified_and_lock_files_are_skipped(signals):
    # Given a protoc output, an @generated client, a .min.js bundle and a lock file
    found, report = signals
    details = {d for _, _, d, _ in found}
    # Then none of their signals appear, and the skips are counted
    assert not {"GENERATED_ONLY", "/generated-route", "/minified"} & details
    assert report["skipped"] == {"generated/minified": 3, "lock": 1}


def test_terraform_counts_as_a_language(signals):
    assert "Terraform" in {x["language"] for x in signals[1]["languages"]}
