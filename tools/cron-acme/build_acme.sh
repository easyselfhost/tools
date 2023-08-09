#!/bin/bash

build_acme() {
    result="./acme.sh --cron --dns ${DNS_PROVIDER} "
    for domain_env in "${!DOMAIN_@}"; do
        domain=${!domain_env}
        result="$result -d $domain"
    done
    echo $result
}