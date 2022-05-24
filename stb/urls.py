from django.urls import path

from . import views

app_name = 'stb'

urlpatterns = [
    path('', views.stb, name='stb'),
    path('/stb', views.stb, name='stb'),
]