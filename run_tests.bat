@echo off
REM ============================================================
REM  run_tests.bat — Playwright Test Runner for Lab Management
REM  Usage: run_tests.bat [smoke|all|load|headed|report]
REM ============================================================

SET FRONTEND=%~dp0frontend
cd /d "%FRONTEND%"

IF "%1"=="smoke" (
  echo [SMOKE] Running quick auth + page tests...
  npx playwright test auth.spec.js all_pages.spec.js student.spec.js --project=chrome-desktop --workers=2
  GOTO :end
)

IF "%1"=="load" (
  echo [LOAD] Running concurrent user traffic simulation...
  npx playwright test load_concurrent.spec.js --project=concurrent-users --workers=4
  GOTO :end
)

IF "%1"=="headed" (
  echo [HEADED] Running all tests with visible browser window...
  npx playwright test --headed --workers=1 --project=chrome-desktop
  GOTO :end
)

IF "%1"=="report" (
  echo [REPORT] Opening HTML test report...
  npx playwright show-report playwright-report
  GOTO :end
)

IF "%1"=="auth" (
  echo [AUTH] Running authentication tests...
  npx playwright test auth.spec.js --project=chrome-desktop --workers=2
  GOTO :end
)

IF "%1"=="admin" (
  echo [ADMIN] Running admin portal tests...
  npx playwright test admin.spec.js --project=chrome-desktop --workers=2
  GOTO :end
)

IF "%1"=="faculty" (
  echo [FACULTY] Running faculty portal tests...
  npx playwright test faculty.spec.js --project=chrome-desktop
  GOTO :end
)

IF "%1"=="ai" (
  echo [AI] Running AI feature tests...
  npx playwright test ai_features.spec.js --project=chrome-desktop
  GOTO :end
)

REM Default: run ALL tests across Chrome + Firefox + Mobile
echo [ALL] Running full test suite across all browsers and devices...
echo NOTE: Make sure the backend (port 8000) and frontend (port 5173) are running!
echo.
npx playwright test --workers=4
echo.
echo [DONE] Tests complete. Run:  npm run test:report  to view HTML report.

:end
