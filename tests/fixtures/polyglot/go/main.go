package main

func main() {
	s := grpc.NewServer()
	pb.RegisterOrderServiceServer(s, &server{})
	client := pb.NewInventoryClient(conn)
	nc.Publish("orders.audit", data)
	rdb.Publish(ctx, "prices", msg)
}
