#!/bin/bash

function build_acme() {
    local acme_path="${ACME_PATH:-acme.sh}"
    local result="$acme_path --cron --dns ${DNS_PROVIDER} "
    for domain_env in "${!DOMAIN_@}"; do
        local domain=${!domain_env}
        result="$result -d $domain"
    done
    echo $result
}

function build_cron_command() {
    local cron="${CRON:-0 0 * * *}"
    echo "$cron root $(build_acme)"
}