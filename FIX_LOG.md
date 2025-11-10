Fix Log

- frontend/.eslintrc.cjs: use plugin:@typescript-eslint/recommended to resolve config resolution.
- Multiple TS files: remove unused imports/vars; fix types; adjust custom Input usage; resolve ref typing.
- frontend/utils: replace NodeJS.Timeout with ReturnType<typeof setTimeout>.
- Backend scaffold added under backend/ with FastAPI app, security, config, hardware utils.
- Created ARCHITECTURE.md and SECURITY.md.
- Removed backend-temp after creating backup branch.
