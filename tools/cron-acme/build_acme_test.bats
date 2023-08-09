load ./build_acme.sh

@test "build acme command" {
    DNS_PROVIDER="dns_cf"
    DOMAIN_0="example.com"
    result="$(build_acme)"
    [[ "$result" == "./acme.sh --cron --dns dns_cf -d example.com" ]]
}