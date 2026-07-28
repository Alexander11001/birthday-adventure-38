@echo off
chcp 65001 >nul
title Birthday Adventure 38 - Deploy
cd /d "%~dp0"

echo.
echo  ============================================
echo   DEPLOY: birthday-adventure-38
echo  ============================================
echo.

where git >nul 2>&1 || (echo ERROR: git not found. Install Git first. & pause & exit /b 1)
where gh >nul 2>&1 || (echo ERROR: gh not found. Install GitHub CLI first. & pause & exit /b 1)

echo [1/6] git init...
if not exist ".git" git init

echo [2/6] git add + commit...
git add .
git commit -m "Birthday adventure quiz: Indy, Tarzan, Pirates, CHGK (38/13 theme)"
if errorlevel 1 echo (no new changes - OK)

echo [3/6] GitHub repo create + push...
git remote get-url origin >nul 2>&1
if errorlevel 1 (
  gh repo create birthday-adventure-38 --public --source=. --remote=origin --push --description "Birthday adventure quiz site for 38th birthday"
) else (
  git push -u origin HEAD
)

echo [4/6] Wrangler login check...
call npx wrangler whoami
if errorlevel 1 (
  echo Wrangler not logged in - opening login...
  call npx wrangler login
)

echo [5/6] Create Cloudflare Pages project...
call npx wrangler pages project create birthday-adventure-38 --production-branch=main 2>nul

echo [6/6] Deploy to Cloudflare Pages...
call npx wrangler pages deploy . --project-name=birthday-adventure-38 --branch=main --commit-dirty=true

echo.
echo  ============================================
echo   DONE!
echo   GitHub: https://github.com/Alexander11001/birthday-adventure-38
echo   Site:   https://birthday-adventure-38.pages.dev
echo  ============================================
echo.
pause
