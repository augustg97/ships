#!/bin/zsh
cd /Users/augustgweon/Ships/build/staging/r360
until grep -q EACH-DONE each1.log; do sleep 3; done
OUT=run3 ./run-each.sh missing3.txt > each2.log 2>&1
