export MY_ROOT_PATH=$PWD

t() {
    npm --prefix ${MY_ROOT_PATH}/tools/scripts run build
    node ${MY_ROOT_PATH}/tools/scripts/dist/main.js "$@"
}

r() {
    npm --prefix ${MY_ROOT_PATH}/tools/scripts run "$@"
}

n() {
    npm --prefix ${MY_ROOT_PATH}/tools/scripts "$@"
}