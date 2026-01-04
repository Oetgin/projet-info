FROM python:alpine

WORKDIR /usr/src/app

COPY crawler.py .
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "-u", "crawler.py"]

LABEL org.opencontainers.image.source=https://github.com/Oetgin/projet-info