/**
 * PR Branch Alert Script (tmp/*)
 *
 * Posts a Stripe caution comment when a pull request branch starts with "tmp/".
 *
 * @param {object} github - GitHub API client (Octokit)
 * @param {object} context - GitHub Actions context
 */
module.exports = async ({ github, context }) => {
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

  const message = `**Stripe SDK のアップデートが検出されました**

このマージには特別な注意が必要です：

### マージ前の確認事項
- [ ] 決済関連のE2Eテストを実行し、すべて成功することを確認
- [ ] Stripe APIの仕様変更（Breaking Changes）をリリースノートで確認
- [ ] Webhook処理への影響を確認
- [ ] サブスクリプション管理機能の動作確認
- [ ] エラーハンドリングの変更がないか確認

### 参考ドキュメント
- [Stripe Java SDK Changelog](https://github.com/stripe/stripe-java/blob/master/CHANGELOG.md)
- プロジェクト内: \`docs/subscription/\` 配下の決済関連ドキュメント

### テスト環境での確認推奨
本番環境へのデプロイ前に、ステージング環境で以下を確認してください：
- テスト用カード番号での決済フロー
- Webhookイベントの受信と処理
- 既存サブスクリプションへの影響

---
_このコメントは自動生成されました（GitHub Actions）_`;

  try {
    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber,
      body: message,
    });
    console.log(`Comment posted successfully to PR #${prNumber}`);
  } catch (error) {
    console.error(`Failed to post comment: ${error.message}`);
    throw error;
  }

  console.log("Workflow completed");
};
