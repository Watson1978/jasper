#!/bin/bash
# sqlite3をビルドするにはDEVELOP.mdをみて環境を整える必要がある
if [ -z $ARCH ]; then
    ARCH=x64
fi
npx electron-rebuild -a $ARCH -f -w sqlite3
