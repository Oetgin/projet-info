FROM python:alpine

WORKDIR /usr/src/app

COPY backend.py .
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

ENV FLASK_APP=backend.py
CMD ["flask", "run"]

LABEL org.opencontainers.image.source=https://github.com/Oetgin/projet-info