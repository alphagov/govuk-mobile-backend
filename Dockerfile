FROM amazonlinux:latest AS build

ARG NODE_VERSION=20

RUN yum -y update && \
    yum install -y awscli git gzip nodejs tar

RUN npm i -g nx

COPY run-tests.sh .
ENTRYPOINT ["./run-tests.sh"]