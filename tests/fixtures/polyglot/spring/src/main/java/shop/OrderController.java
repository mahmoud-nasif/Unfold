package shop;

@RestController
@RequestMapping("/api/orders")
public class OrderController {
    @GetMapping("/{id}")
    public Order get(@PathVariable long id) { return repo.find(id); }

    @PostMapping(path = "/bulk")
    public void bulk(@RequestBody List<Order> orders) { orders.forEach(this::save); }

    @KafkaListener(topics = "orders.created", groupId = "shop")
    public void onCreated(String payload) {
        kafkaTemplate.send("orders.shipped", payload);
    }
}
