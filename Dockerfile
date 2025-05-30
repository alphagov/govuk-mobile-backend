FROM amazonlinux:latest AS build

ARG NODE_VERSION=22

RUN yum -y update && \
    yum install -y awscli git gzip tar && \
    curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash - && \
    yum install -y nodejs

WORKDIR /tests

COPY package.json package-lock.json tsconfig.json tsconfig.base.json nx.json vitest.config.ts ./
COPY auth ./auth

COPY ./run-tests.sh /run-tests.sh
RUN chmod +x /run-tests.sh

RUN npm i

ENTRYPOINT ["/run-tests.sh"]