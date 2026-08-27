#!/bin/bash

LOG="log_$(date +"%Y%m%d_%H%M%S").txt"
echo $LOG
cd /mnt/nv/server_logs/rohanjh/status-getter-test-run/

./status-getter.sh 2>&1 | tee $LOG
