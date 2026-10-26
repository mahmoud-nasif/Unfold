from django.urls import path, re_path
from rest_framework import routers

router = routers.DefaultRouter()
router.register(r'carts', CartViewSet)

urlpatterns = [
    path('products/', views.product_list),
    re_path(r'^legacy/', views.legacy),
]
