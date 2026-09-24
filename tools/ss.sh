#!/bin/sh
# ai3000 线上 SSH 包装：密码只走 SSHPASS 环境变量，不落盘
: "${SSHPASS:?export SSHPASS first}"
export SSH_ASKPASS=/tmp/askpass.sh SSH_ASKPASS_REQUIRE=force
exec setsid -w ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  -o PreferredAuthentications=password -o PubkeyAuthentication=no \
  -o LogLevel=ERROR root@192.168.111.111 "$@"
