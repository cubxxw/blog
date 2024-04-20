---
title: 'OpenIM: Building an Efficient Version Control and Testing Workflow'
ShowRssButtonInSectionTermList: true
cover.image:
date: 2024-01-15T21:13:07+08:00
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - blog
  - openim
  - github
categories:
  - Development
description: >
    The success of an open-source project largely depends on its quality management and collaborative processes. In the OpenIM open-source community, the standardization of project management and testing processes is crucial to ensure the quality and stability of the codebase. This document provides a brief overview of our testing strategy, branch management, quality control policies, and how they are applied to the main branch, PR testing branches, and stable release branches to meet the needs of developers, testers, and community managers. Additionally, we will introduce the standards, testing schemes, and project management strategies of the OpenIM open-source community, aiming to provide clear guidance to ensure project stability and sustainability.

---

The success of an open-source project largely depends on its quality management and collaborative processes. In the OpenIM open-source community, the standardization of project management and testing processes is crucial to ensure the quality and stability of the codebase. This document provides a brief overview of our testing strategy, branch management, quality control policies, and how they are applied to the main branch, PR testing branches, and stable release branches to meet the needs of developers, testers, and community managers. Additionally, we will introduce the standards, testing schemes, and project management strategies of the OpenIM open-source community, aiming to provide clear guidance to ensure project stability and sustainability.

## Branch Management and Version Control

For OpenIM, branch versioning strategies are especially important, involving deployment branch strategies and image versioning strategies. These two aspects are detailed in the following articles:

- [Branch and Tag Versioning Strategy](https://github.com/openimsdk/open-im-server/blob/main/docs/contrib/version.md)
- [Image Versioning Strategy](https://github.com/openimsdk/open-im-server/blob/main/docs/contrib/images.md)

**In summary:**

In the OpenIM community, the **`main`** branch is considered the representative of the stable version. All code must undergo rigorous code review and testing to ensure its quality and stability before being merged into the **`main`** branch.

The **`release`** branch is used for releasing stable versions. The image versions used in `openim-docker` and `openim-k8s` are also named `release-v3.*`. Any changes on the **`release`** branch should be well-planned additions of features or fixes for known issues. Testing efforts should focus on the **`release`** branch to ensure the reliability of the release versions.

## Testing Strategy

### Testing on the Main Branch

Testing on the **`main`** branch should cover core functionalities and critical paths to ensure the stability of basic features. Testing work includes unit testing, integration testing, and end-to-end testing, all of which are automated and require no manual intervention.

### Testing on Release Branches

For three repositories: https://github.com/openimsdk/open-im-server, https://github.com/openimsdk/chat, and https://github.com/openimsdk/openim-sdk-core:

Testing on the **`release`** branch demands stricter standards. The testing team should thoroughly test all functionalities, with particular emphasis on checking whether previously known issues have been resolved. Ensuring there are no potential issues before a release is essential.

**PR Merge Rules:**

Taking [this PR](https://github.com/openimsdk/open-im-server/pull/1750) as an example:

Firstly, the PR title, "PR title: fix pageFindUser". It's important to note that `git commit` messages follow a specific format:

```jsx
<type>[optional scope]: <description>
```

For all release branches, we require the following format:

- The type remains the same as before:
    - `git commit` types can be one of the following:
        1. `feat`: New feature (feature)
        2. `fix`: Bug fix
        3. `docs`: Documentation
        4. `style`: Code style (no code changes affecting execution)
        5. `refactor`: Code refactor (neither adding a feature nor fixing a bug)
        6. `test`: Adding tests
        7. `chore`: Build process or auxiliary tool changes
        8. `perf`: Performance improvement
        9. `revert`: Revert changes
        10. `build`: Build process
        11. `ci`: Continuous integration
        12. `update`: Update
        13. `add`: Addition
        14. `delete`: Deletion
        15. `init`: Initialization
        16. `merge`: Merge
        17. `move`: Move
        18. `rename`: Rename
        19. `sync`: Sync
        20. `release`: Release
        21. `hotfix`: Hotfix for production
        22. `optimize`: Optimization
- Additional `[optional scope]` is required and should be filled with `release-v3.5`.
- `<description>` should describe the purpose of the PR.

Thus, a correct PR title description should be:

```jsx
fix(release-v3.5): fix user search page issue
```

> For more documentation, refer to: https://github.com/cubxxw/awesome-cs-course/blob/master/Git/README.md
> 

### Pull Request (PR) Testing Branches

Every submitted PR should have corresponding testing branches. These branches can be for feature testing or bug testing, and the specific testing criteria are determined by the branch owner. However, when testing branches are merged into the `main` or `release-v3.5` branches, they must adhere to the requirements of the respective main branches.

## Project Management

The OpenIM community adopts a transparent project management approach to facilitate better collaboration and project monitoring.

Based on OpenIM's branch design specifications, different strategies are applied to `main`, `release-v3.*`, and other branches for project management:

### PR Workflow

- After submitting a PR, it must pass review by at least two core developers.
- The PR must pass all automated tests and should not introduce new issues.
- Once approved, it can be merged into the **`main`** branch.
- If the PR also urgently addresses issues on the release-3.5 branch, the following steps are required:
    - Set the **Milestone** to `v3.5` on the corresponding linked issue for this PR.
    - Resolve the issue associated with the **Milestone** `v3.5` on the `release-v3.5` branch and create a PR.
    - After automated testing passes for this PR, manual testing is required (manual testing documentation should be defined).
    - Provide screenshots of manual testing in the **`🎯 Describe how to verify it`** section of the PR description.

### Review Guidelines

- Reviews should focus on code quality, performance, security, and documentation.
- Reviewers should provide specific feedback and suggestions for improvement.
- Comment on code issues and provide modification suggestions.
- If the PR has no issues, then it can be approved.

### Release Branch Testing Steps

- [ ] Regularly check the openim-server, openim-chat, openim-sdk-core repositories.
- [ ] Check if the PR title adheres to the standards.
- [ ] Determine the problem being addressed through the issue, PR description, and code.
- [ ] Verify if the PR-linked issue has the corresponding **Milestone**.
- [ ] Check for testing screenshots; if not available, perform testing and add screenshots.
- [ ] If the review passes, use the `/lgtm` command in the comments.
- [ ] If the review fails, provide error information and screenshots in the comments.

### Note: How to Test this PR

Using https://github.com/openimsdk/open-im-server/pull/1750 as an example, you have two deployment options:

**Server Deployment**:

- Request a dedicated test server from OpenIM.
- Stop all previous containers:
    - `docker stop

 $(docker ps -qa)`
    - `docker rmi $(docker ps -qa)`
    - `docker network prune -f`
- Fetch the corresponding code using `gh` or `git`:
    
    ![Untitled](https://prod-files-secure.s3.us-west-2.amazonaws.com/75a5484a-0cd7-4657-9986-f815c6264948/c901955c-6450-487d-8f68-8f9c8e3fd9b7/Untitled.png)
    
- Enter the test directory, open the `docker-compose.yaml` file, and uncomment the sections for `openim-chat`, `openim-admin`, `prometheus`, `alertmanager`, `node-exporter`, and `grafana`.

In addition to local or server testing, you can also use GitHub's `codespaces`.

> Learn more at: https://docs.github.com/en/codespaces/getting-started/quickstart
> 

In `codespaces`, use port forwarding to access the openim-web for testing.

### Future Automation Testing Design

The OpenIM community plans to continually improve automation test coverage to reduce manual testing efforts. More automation test scripts will be developed to ensure code quality and stability.

## Conclusion

The OpenIM open-source community is dedicated to providing high-quality open-source instant messaging solutions. Through strict standards, testing strategies, and project management, we can ensure the success and sustainability of the project. We welcome more contributors, developers, and community managers to participate and collaborate. We hope these guidelines contribute to the growth of our community and projects.