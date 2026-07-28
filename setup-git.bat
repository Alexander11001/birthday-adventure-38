@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo  Birthday Adventure 38 - Deploy Script
echo ============================================
echo.

REM Git init
if not exist ".git" (
    echo [1/5] git init...
    git init
)

echo [2/5] git add + commit...
git add .
git commit -m "Birthday adventure quiz: Indy, Tarzan, Pirates, CHGK (38/13 theme)" 2>nul
if errorlevel 1 (
    echo Nothing new to commit, continuing...
)

echo [3/5] GitHub push...
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    gh repo create birthday-adventure-38 --public --source=. --remote=origin --push --description "Birthday adventure quiz site for 38th birthday"
) else (
    git push -u origin HEAD
)

echo [4/5] Wrangler auth check...
call npx wrangler whoami

echo [5/5] Cloudflare Pages deploy...
call npx wrangler pages project create birthday-adventure-38 --production-branch=main 2>nul
call npx wrangler pages deploy . --project-name=birthday-adventure-38 --branch=main --commit-dirty=true

echo.
echo ============================================
echo  DONE!
echo  GitHub: https://github.com/Alexander11001/birthday-adventure-38
echo  Site:   https://birthday-adventure-38.pages.dev
echo ============================================
pause
