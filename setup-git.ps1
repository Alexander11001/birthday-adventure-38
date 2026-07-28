# Скрипт: git init + GitHub repo
# Запусти в PowerShell: .\setup-git.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Set-Location $root

# Копируем hero-картинку если есть
$heroSrc = "$env:USERPROFILE\.cursor\projects\C-Users-ALIAKS-1-AppData-Local-Temp-6ccda2d7-d82c-41b4-ba84-38ef8f31e639\assets\hero-adventure.png"
$assetsDir = Join-Path $root "assets"
New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null
if (Test-Path $heroSrc) {
    Copy-Item $heroSrc (Join-Path $assetsDir "hero-adventure.png") -Force
    Write-Host "Hero image copied to assets/"
}

if (-not (Test-Path ".git")) {
    git init
}

git add .
git status

git commit -m @"
Initial commit: birthday adventure quiz site (38/13 theme)

Interactive birthday site with Indiana Jones, Tarzan, Pirates themes,
CHGK-style quizzes, crossword, and animations.
"@

$hash = git rev-parse HEAD
Write-Host "Commit: $hash"

gh auth status
gh repo create birthday-adventure-38 --public --source=. --remote=origin --push --description "Birthday adventure quiz: Indy, Tarzan, Pirates, CHGK"

Write-Host "Done! Open https://github.com/$(gh api user -q .login)/birthday-adventure-38"
