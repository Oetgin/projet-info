FROM python:alpine

WORKDIR /usr/src/app

COPY backend.py .
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "-u", "backend.py"]

LABEL org.opencontainers.image.source=https://github.com/Oetgin/projet-info