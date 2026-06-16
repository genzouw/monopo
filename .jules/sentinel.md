## 2025-02-15 - [Pin Action SHAs to Prevent Supply Chain Attacks]

**Vulnerability:** Third-party GitHub Actions like `github/codeql-action/upload-sarif` were referenced via mutable version tags (e.g., `@v4`) rather than immutable commit SHAs.
**Learning:** Mutable tags can be moved by malicious actors if they compromise the upstream repository, leading to the execution of untrusted code in our CI/CD pipelines (a supply chain attack).
**Prevention:** Always pin third-party actions to an exact 40-character commit SHA (e.g., `@8aad20d150bbac5944a9f9d289da16a4b0d87c1e # v4`) to ensure immutability and reproducibility.
