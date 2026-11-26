#!/bin/bash
cd /Users/augustgweon/Ships/build/staging/r337
echo "START $(date '+%H:%M:%S') load $(uptime | sed 's/.*load averages: //') HEAD $(git -C /Users/augustgweon/Ships rev-parse --short HEAD)" > resume.out
"/Users/augustgweon/Modeling Studio/.venv/bin/python" ../r306/r306_resume.py run4 run1ok run2 run3a >> resume.out 2> resume.err
echo "RESUME EXIT $?  END $(date '+%H:%M:%S')" >> resume.out
