FROM eclipse-temurin:17-jdk-alpine

WORKDIR /app

ENV TZ=Asia/Seoul

# Install dependencies for Chrome/Chromium
RUN apk add --no-cache \
    curl \
    chromium \
    chromium-chromedriver \
    font-noto \
    font-noto-cjk \
    && rm -rf /var/cache/apk/*

# Set Chrome/Chromium environment variables
ENV CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/lib/chromium/ \
    CHROMIUM_FLAGS="--no-sandbox --disable-dev-shm-usage --disable-gpu"

COPY build/libs/*-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
