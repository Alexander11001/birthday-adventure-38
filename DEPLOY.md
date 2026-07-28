# Deploy: birthday-adventure-38 (NEW project)

## Вариант 1 — CMD (то, что у тебя открыто)

```cmd
cd /d C:\Users\Aliaksandr\birthday-adventure-38
setup-git.bat
```

## Вариант 2 — PowerShell

```powershell
Set-Location "C:\Users\Aliaksandr\birthday-adventure-38"
.\setup-git.ps1
```

# 1. Git + GitHub (new repo)
if (-not (Test-Path .git)) { git init }
git add .
git commit -m "Birthday adventure quiz: Indy, Tarzan, Pirates, CHGK (38/13 theme)" -a 2>$null
if (-not (git remote get-url origin 2>$null)) {
  gh repo create birthday-adventure-38 --public --source=. --remote=origin --push --description "Birthday adventure quiz site for 38th birthday"
} else {
  git push -u origin HEAD
}

# 2. Cloudflare Pages (NEW project, not birthday-surprise)
npx wrangler whoami
npx wrangler pages project create birthday-adventure-38 --production-branch=main
npx wrangler pages deploy . --project-name=birthday-adventure-38 --branch=main --commit-dirty=true

Write-Host ""
Write-Host "GitHub:  https://github.com/Alexander11001/birthday-adventure-38"
Write-Host "Site:    https://birthday-adventure-38.pages.dev"
```

Or connect Git in Cloudflare Dashboard:
1. https://dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git
2. Repo: `Alexander11001/birthday-adventure-38`
3. Build command: *(empty)* | Output directory: `/`
