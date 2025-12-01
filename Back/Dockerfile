# 1. IMAGEN BASE
FROM python:3.13

# 2. VARIABLES DE ENTORNO
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
# Variables para optimizar la compilación de PyMuPDF
ENV PYMUPDF_BUILD_PARALLEL=1
ENV PYMUPDF_SKIP_TESSERACT=0

# 3. INSTALAR DEPENDENCIAS DEL SISTEMA PARA COMPILACIÓN
# PyMuPDF requiere herramientas de compilación C/C++ y bibliotecas adicionales
# Incluimos Tesseract y Leptonica aunque no los usemos, porque PyMuPDF los intenta compilar
# También necesitamos curl/wget para descargar el código fuente de MuPDF durante la compilación
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    g++ \
    make \
    cmake \
    pkg-config \
    curl \
    wget \
    libfreetype6-dev \
    libjpeg-dev \
    zlib1g-dev \
    python3-dev \
    libtesseract-dev \
    libleptonica-dev \
    && rm -rf /var/lib/apt/lists/*

# 4. DIRECTORIO DE TRABAJO
WORKDIR /app

# 5. INSTALAR DEPENDENCIAS DE PYTHON
COPY requirements.txt .

# Actualizar pip, setuptools y wheel para mejor soporte de compilación
# Usar --prefer-binary para intentar usar wheels precompilados primero
# Si no hay wheel disponible, compilará desde fuente (requiere las dependencias del sistema instaladas arriba)
RUN pip install --upgrade pip setuptools wheel && \
    pip install --prefer-binary -r requirements.txt

# 5. COPIAR EL CÓDIGO
COPY . .

# 6. EXPONER EL PUERTO
EXPOSE 8000

# 7. COMANDO DE INICIO
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]