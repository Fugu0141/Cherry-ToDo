(() => {
  if (!window.CherryI18n) return;

  const labels = {
    ja: { label: "言語", japanese: "日本語", english: "English" },
    en: { label: "Language", japanese: "日本語", english: "English" }
  };

  const storagePromptCopy = {
    ja: {
      kicker: "最初に選んでください",
      title: "作ったタスクを、この端末に残しますか？",
      lead: "Cherryから外へ送信されることはありません。あとで変更もできます。",
      persistentTitle: "この