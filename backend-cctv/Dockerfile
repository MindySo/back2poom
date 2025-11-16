FROM eclipse-temurin:17-jdk-alpine

WORKDIR /app

ENV TZ=Asia/Seoul

RUN apk add --no-cache curl

COPY build/libs/*-SNAPSHOT.jar app.jar

EXPOSE 8082

ENTRYPOINT ["java", "-jar", "app.jar"]
