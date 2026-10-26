var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
app.MapGet("/ping", () => "pong");
app.MapGrpcService<GreeterService>();
app.Run();
