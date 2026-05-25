/**
 * PR Branch Alert Script (tmp/*)
 *
 * Posts a resolvable PR review comment when a pull request branch starts with "tmp/".
 *
 * @param {object} github - GitHub API client (Octokit)
 * @param {object} context - GitHub Actions context
 */
export default async ({ github, context }) => {
  const pullRequest = context.payload.pull_request;

  if (!pullRequest) {
    console.log("No pull_request payload found. Skipping.");
    return;
  }

  const branchName = pullRequest.head.ref;
  const prNumber = pullRequest.number;

  console.log(`Checking branch: ${branchName}`);
  console.log(`PR number: ${prNumber}`);

  const isTmpBranch = /^tmp\//.test(branchName);

  if (!isTmpBranch) {
    console.log("Branch does not match tmp/* pattern. Skipping comment.");
    return;
  }

  const marker = "<!-- tmp-branch-stripe-review-comment -->";

  const message = `**Stripe SDK のアップデートが検出されました**

このマージには特別な注意が必要です：

### マージ前の確認事項
- [ ] Stripe APIの仕様変更（Breaking Changes）をリリースノートで確認したか
- [ ] 依存関係更新後のJDKのバージョンとWebhookのAPIのバージョンが対応しているか確認したか
- [ ] 開発環境でWebhookイベントの受信と処理が正常に行われるかテストしたか

### 参考ドキュメント
- [Stripe Java SDK Changelog](https://github.com/stripe/stripe-java/blob/master/CHANGELOG.md)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Release Notes](https://docs.stripe.com/changelog)
- プロジェクト内: \`docs/subscription/\` 配下の決済関連ドキュメント

---
_このコメントは自動生成されました（GitHub Actions）_

${marker}`;

  try {
    const owner = context.repo.owner;
    const repo = context.repo.repo;

    const { data: existingReviewComments } =
      await github.rest.pulls.listReviewComments({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
      });

    const alreadyPosted = existingReviewComments.some((comment) => {
      const body = comment.body || "";
      const login = comment.user?.login || "";
      return login === "github-actions[bot]" && body.includes(marker);
    });

    if (alreadyPosted) {
      console.log("Review comment already exists. Skipping duplicate post.");
      return;
    }

    const { data: files } = await github.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });

    const targetFile = files.find(
      (file) => (file.status === "modified" || file.status === "added") && file.patch,
    );

    if (!targetFile) {
      throw new Error(
        "Could not find a suitable changed file to attach a resolvable review comment.",
      );
    }

    await github.rest.pulls.createReviewComment({
      owner,
      repo,
      pull_number: prNumber,
      commit_id: pullRequest.head.sha,
      path: targetFile.filename,
      subject_type: "file",
      body: message,
    });

    // ラベルを追加（オプション: 要注意PRであることを視覚的に表現）
    try {
      await github.rest.issues.addLabels({
        owner,
        repo,
        issue_number: prNumber,
        labels: ["⚠️ critical-dependency", "renovate"],
      });
      console.log("✓ Labels added successfully");
    } catch (error) {
      console.log(
        `⚠ Failed to add labels (labels may not exist): ${error.message}`,
      );
      // ラベル追加失敗は無視（ラベルが存在しない場合があるため）
    }

    console.log(`Review comment posted successfully to PR #${prNumber}`);
  } catch (error) {
    console.error(`Failed to post review comment: ${error.message}`);
    throw error;
  }

  console.log("Workflow completed");
};
