#!/bin/zsh
cd /Users/augustgweon/Ships/build/staging/r359
until grep -q EACH-DONE each1.log; do sleep 3; done
OUT=run3 ./run-each.sh missing2.txt > each2.log 2>&1
