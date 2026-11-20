# Changelog

## [6.0.2] - 2026-11-19

### Added

- [#306](https://github.com/Azure/k8s-create-secret/pull/306) Add 20 HTTP integration cases covering secret requests, API failures, malformed inputs and responses, and sensitive-value disclosure; run the suite in CI

### Changed

- [#282](https://github.com/Azure/k8s-create-secret/pull/282) Enforce a seven-day dependency freshness period and check signed commits
- Bump npm dependencies: `@kubernetes/client-node`, `@types/node`, `esbuild`, `prettier`, `typescript`, `vitest`, `ip-address`, `js-yaml`, `postcss`, `source-map-js`, `undici`, `vite` (#267, #273, #278, #279, #280, #281, #286, #288, #290, #291, #293, #295, #297, #300, #302, #303, #304, #308)
- Bump GitHub Actions: `actions/checkout`, `actions/setup-node`, `actions/stale`, `github/codeql-action`, `Azure/action-release-workflows`, and other grouped action updates (#266, #274, #275, #284, #285, #296, #299, #307)

### Fixed

- [#272](https://github.com/Azure/k8s-create-secret/pull/272) Quiet expected delete-404 responses while reporting other deletion failures
- [#305](https://github.com/Azure/k8s-create-secret/pull/305) Handle Kubernetes API errors without logging full responses
- [#306](https://github.com/Azure/k8s-create-secret/pull/306) Prevent secret disclosure in error logs by using HTTP status codes and fixed diagnostics instead of server-provided messages or arbitrary exception text
- [#301](https://github.com/Azure/k8s-create-secret/pull/301) Enable stale issue and PR cleanup after 74 inactive days

## [6.0.1] - 2026-06-22

### Changed

- [#243](https://github.com/Azure/k8s-create-secret/pull/243) Move husky to devDependencies, add version sync pre-commit hook
- [#254](https://github.com/Azure/k8s-create-secret/pull/254) Remove deprecated OliverMKing release workflow, pin actions to SHA
- Bump npm dependencies: `ip-address`, `@types/node`, `ws`, `vitest`, `esbuild`, `js-yaml`, `form-data`, `undici`, `typescript` (#241, #244, #246, #247, #250, #251, #252, #255, #258, #260, #261, #262, #263, #264, #265)
- Bump GitHub Actions: `github/codeql-action` and other grouped action updates in `.github/workflows` (#242, #245, #248, #249, #253, #256, #259)

### Fixed

- [#257](https://github.com/Azure/k8s-create-secret/pull/257) Stop logging full API responses and error objects to workflow logs

## [6.0.0] - 2026-04-20

### Added

- [#172](https://github.com/Azure/k8s-create-secret/pull/172) Added logic for TLS secret type handling
- [#166](https://github.com/Azure/k8s-create-secret/pull/166) Add husky pre-commit hook

### Changed

- [#238](https://github.com/Azure/k8s-create-secret/pull/238) Migrate project to ESM with esbuild and vitest
- [#229](https://github.com/Azure/k8s-create-secret/pull/229) Update Node.js runtime from node20 to node24
- [#215](https://github.com/Azure/k8s-create-secret/pull/215) Use docker driver in minikube setup
- [#180](https://github.com/Azure/k8s-create-secret/pull/180) Update CODEOWNERS
- Bump npm dependencies: `@types/node`, `prettier`, `undici`, `@actions/http-client`, `handlebars`, `picomatch`, `minimatch`, `js-yaml`, `glob`, `tar-fs`, `form-data`, `jest` (#174, #175, #178, #179, #194, #201, #203, #205, #206, #209, #213, #223, #226, #231, #235, #236)
- Bump GitHub Actions: `github/codeql-action`, `actions/setup-node`, and other grouped action updates in `.github/workflows` (#163, #164, #169, #170, #182, #183, #184, #185, #186, #187, #188, #189, #190, #191, #197, #198, #199, #200, #204, #207, #208, #210, #211, #212, #214, #216, #217, #218, #219, #221, #224, #225, #227, #228, #233, #237)

### Fixed

- [#168](https://github.com/Azure/k8s-create-secret/pull/168) Fix for generic secret types

## [5.0.1] - 2024-09-06

### Changed

- #102 Upgrade dev dependencies
- #101 add dependabot

## [5.0.0] - 2024-03-22

### Changed

- #98 Upgrade to node 20
- #89 update minkube action to get ubuntu 22.04 support
