# End-to-End Testing with testRigor

This directory contains the end-to-end testing setup for **EverShop** using **testRigor**.

## Overview

testRigor is an AI-powered end-to-end testing platform that lets you write tests in plain English. This setup enables automated testing of EverShop’s admin and storefront flows from a user’s perspective.

## How it Works

1. **GitHub Actions**: Automated workflow in `.github/workflows/evershop-testrigor.yml` that:
   - Checks out the repository
   - Sets up Node.js (for the testRigor CLI)
   - Starts EverShop locally using the official Docker Compose setup
   - Seeds demo data inside the EverShop container
   - Creates an admin user (credentials pulled from GitHub secrets)
   - Waits for EverShop to be available at `http://localhost:3000`
   - Runs the testRigor test suite via CLI against the EverShop Admin UI (`http://localhost:3000/admin`)
   - Loads test cases and reusable rules directly from:
     - `packages/evershop/src/Tests/e2e-testcases/testcases/**/*.txt`
     - `packages/evershop/src/Tests/e2e-testcases/reusable-rules/**/*.txt`

2. **testRigor CLI**:
   - Executes plain-English tests on the testRigor platform. The workflow triggers this [EverShop test suite](https://app.testrigor.com/test-suites/oJvBxgjY5A8Pw48hj/test-cases).
   - Reads test cases and reusable rules directly from this repo via:
     - `--test-cases-path packages/evershop/src/Tests/e2e-testcases/testcases/**/*.txt`
     - `--rules-path packages/evershop/src/Tests/e2e-testcases/reusable-rules/**/*.txt`
   - Uses `--localhost` to run against the EverShop instance started by GitHub Actions.

## Usage

### Local Testing
#### Creating an Account on testRigor

1. **Visit the testRigor website:**

   - Go to [testRigor](https://www.testrigor.com/).

2. **Sign up for a new account:**

   - Click on the "Sign Up" button on the top right corner.
   - Select the "Public Open Source" version.
   - Fill in the required details and follow the instructions to complete the registration.

3. **Verify your email and log in:**

   - Check your email inbox for a verification email from testRigor.
   - Click on the verification link to activate your account.
   - Once your account is activated, log in.

4. **Create a test sute:**
   - After logging into your account, create a test suite.

#### Running EverShop Locally + Executing Tests
```bash
# 1) Start EverShop locally using official Docker Compose
curl -sSL https://raw.githubusercontent.com/evershopcommerce/evershop/main/docker-compose.yml > docker-compose.yml
docker compose up -d

# 2) Seed demo data and create an admin user inside the app container
APP_CONTAINER=$(docker ps --format '{{.Names}}' | grep evershop-app | head -n 1)

docker exec "$APP_CONTAINER" npm run seed -- --all
docker exec "$APP_CONTAINER" npm run user:create -- \
  --email "<ADMIN_EMAIL>" \
  --password "<ADMIN_PASSWORD>" \
  --name "Admin"

# 3) Install testRigor CLI (Node 18+ required)
npm install -g testrigor-cli

# 4) Run testRigor tests (requires valid Suite ID and Token)
testrigor test-suite run <SUITE_ID> \
  --token <CI_TOKEN> \
  --localhost \
  --test-cases-path packages/evershop/src/Tests/e2e-testcases/testcases/**/*.txt \
  --rules-path packages/evershop/src/Tests/e2e-testcases/reusable-rules/**/*.txt \
  --url "http://localhost:3000/admin"
```
### CI/CD Testing
Tests automatically run via GitHub Actions when:
- Pushing to any branch
- Creating pull requests to any branch

## Configuration
Set these GitHub repository secrets/variables:

### Secrets:
- `TESTRIGOR_CICD_TOKEN`: Your testRigor authentication token (from CI/CD Integration page)
- `ADMIN_EMAIL`: Email used to create the EverShop admin user in CI
- `ADMIN_PASS`: Password used to create the EverShop admin user in CI

### Variables
- `TESTRIGOR_SUITE_ID`: The testRigor test suite identifier

## Learn More

- [testRigor Documentation](https://testrigor.com/docs/)
- [testRigor CLI Reference](https://testrigor.com/command-line)
