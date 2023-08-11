# syntax=docker/dockerfile:1

FROM ubuntu:22.04 as tester

COPY . /project

WORKDIR /project

RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && \
    apt-get install -y nodejs

RUN npm install && npm run test && mkdir /scripts && cp *.sh /scripts

FROM ubuntu:22.04 as runner

COPY --from=tester /scripts /scripts

WORKDIR /scripts

RUN apt-get update && apt-get install -y cron && \
    rm -rf /cron.*/* && chmod +x ./run.sh

CMD [ "./run.sh" ]