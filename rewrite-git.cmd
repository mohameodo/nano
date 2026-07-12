@echo off
cd /d "%~dp0"
git checkout --orphan newroot
git rm -rf --cached .
git add -A
for /f %%i in ('git write-tree') do set TREE=%%i
for /f %%i in ('git commit-tree %TREE% -m "shiopa"') do set COMMIT=%%i
git update-ref refs/heads/main %COMMIT%
git symbolic-ref HEAD refs/heads/main
git reset --hard %COMMIT%
git branch -D newroot 2>nul
del /f /q rewrite-git.cmd 2>nul
