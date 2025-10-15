/**
 * Environment Configuration
 *
 * This file loads environment variables from .env* files using Next.js's @next/env package.
 * Import this file at the top of scripts, ORM configs, or test setup files that need
 * environment variables outside the Next.js runtime.
 *
 * Environment variable load order:
 * 1. process.env
 * 2. .env.$(NODE_ENV).local
 * 3. .env.local (not loaded when NODE_ENV is "test")
 * 4. .env.$(NODE_ENV)
 * 5. .env
 *
 * @see https://nextjs.org/docs/app/guides/environment-variables#loading-environment-variables-with-nextenv
 */
import { loadEnvConfig } from "@next/env";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

