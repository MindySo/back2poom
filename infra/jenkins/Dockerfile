FROM jenkins/jenkins:lts

USER root

# 필수 패키지 설치
RUN apt-get update && apt-get install -y \
    docker.io \
    git \
    curl \
    openjdk-17-jdk \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 모든 디렉토리 허용
RUN git config --system --add safe.directory '*'

# Docker Compose 설치
RUN mkdir -p /usr/local/lib/docker/cli-plugins && \
    curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose && \
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Symbolic link 생성
RUN ln -s /usr/local/lib/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose

# Java 환경변수 : 백에 몇 쓰는지 물어보기
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# Jenkins 사용자로 전환 (보안)
USER jenkins