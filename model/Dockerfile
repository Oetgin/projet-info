FROM python:3.12-slim
# Can't use alpine because prophet need some specific build tools

WORKDIR /usr/src/app

COPY model.py .
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "-u", "model.py"]

LABEL org.opencontainers.image.source=https://github.com/Oetgin/projet-info