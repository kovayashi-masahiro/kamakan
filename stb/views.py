from django.shortcuts import render

# Creafrom django.shortcuts import render
def index(request):
    return render(request, 'stb/index.html')
def stb(request):
    return render(request, 'stb/stb.html')
# Create your views here.te your views here.
