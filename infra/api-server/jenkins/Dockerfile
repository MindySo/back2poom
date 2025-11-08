FROM jenkins/jenkins:lts

USER root

# 필수 패키지 설치
RUN apt-get update && apt-get install -y \
    docker.io \
    git \
    curl \
    unzip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# AWS CLI v2 설치
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf aws awscliv2.zip

# 모든 디렉토리 허용
RUN git config --system --add safe.directory '*'

# EC2의 docker 그룹과 동일한 GID로 docker 그룹 생성/수정
RUN groupadd -g 122 docker || groupmod -g 122 docker

# jenkins 사용자를 docker 그룹에 추가
RUN usermod -aG docker jenkins

# Docker Compose 설치
RUN mkdir -p /usr/local/lib/docker/cli-plugins && \
    curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose && \
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Symbolic link 생성
RUN ln -s /usr/local/lib/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose

# Java 환경변수
ENV JAVA_HOME=/opt/java/openjdk

# Jenkins 사용자로 전환 (보안)
USER jenkins
