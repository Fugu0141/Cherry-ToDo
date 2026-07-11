(() => {
  const policy = window.CherryStoragePolicy;
  if (!policy || policy.hasPersistentConsent()) return;

  const languageKey = "cherry-language-v1";
  const supportedLanguages = ["ja", "en"];
  const copy = {
    ja: {
      languageLabel: "🌐 表示言語 / Display language",
      japanese: "日本語",
      english: "English",
      kicker: "最初に選んでください",
      title: "作ったタスクを、この端末に残しますか？",
      lead: