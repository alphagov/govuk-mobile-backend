FROM node:lts-alpine3.22 AS build
	RUN apk update && \
	apk add --no-cache docker curl iputils-ping openssl

RUN mkdir -p /home/node/testrunner
RUN cd /home/node/testrunner
RUN curl -L https://github.com/nektos/act/releases/latest/download/act_Linux_x86_64.tar.gz | tar xz && \
    chmod +x act && mv ./act /usr/local/bin
RUN chown -R node:node /home/node/testrunner

WORKDIR /home/node/testrunner
CMD act --version

