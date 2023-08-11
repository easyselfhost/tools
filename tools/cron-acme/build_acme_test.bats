load ./build_acme.sh

@test "build acme command with single domain" {
    DNS_PROVIDER="dns_cf"
    DOMAIN_0="example.com"
    local result="$(build_acme)"
    [[ "$result" == "acme.sh --cron --dns dns_cf -d example.com" ]]
}

@test "build acme command with multiple domain" {
    DNS_PROVIDER="dns_cf"
    DOMAIN_0="a.example.com"
    DOMAIN_1="b.example.com"
    local result="$(build_acme)"
    [[ "$result" == "acme.sh --cron --dns dns_cf -d a.example.com -d b.example.com" ]]
}

@test "build cron command with default cron schedule" {
    local result="$(build_cron_command)"
    [[ "$result" == "0 0 * * * root $(build_acme)" ]]
}

@test "build cron command with scedule in environment" {
    CRON="* 1 1 * *"
    local result="$(build_cron_command)"
    [[ "$result" == "* 1 1 * * root $(build_acme)" ]]
}