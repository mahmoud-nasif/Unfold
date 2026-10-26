import os
from kafka import KafkaConsumer, KafkaProducer

consumer = KafkaConsumer('payments', bootstrap_servers=os.environ.get('KAFKA_BROKERS'))
producer = KafkaProducer()
producer.send('invoices', b'x')
channel.queue_declare(queue='emails')
channel.basic_publish(exchange='', routing_key='emails', body=b'hi')
nc.subscribe("telemetry.>")
r.publish('cache-invalidate', key)
server = grpc.server(pool)
orders_pb2_grpc.add_OrderServiceServicer_to_server(OrderService(), server)
stub = orders_pb2_grpc.InventoryStub(channel)
