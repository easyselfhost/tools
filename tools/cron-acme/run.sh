#!/bin/bash

source ./build_acme.sh

function main() {
    echo "$(build_cron_command)" > /etc/cron.d/cronjob && \
    chmod 0644 /etc/cron.d/cronjob && \
    cron -f
}

main