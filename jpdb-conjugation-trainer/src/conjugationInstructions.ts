import type { ConjugationType, WordType } from './types';

export const VERB_CONJUGATION_INSTRUCTIONS: Partial<Record<ConjugationType, string>> = {
  'non-past-affirmative-casual': `
**Non-past affirmative (casual/dictionary form)**
This is the dictionary form of the verb.
• Ichidan verbs: Keep the -る ending (e.g., 食べる)
• Godan verbs: Keep the -u ending (e.g., 書く, 飲む, 話す)
• Irregular verbs: する, 来る (くる)
  `.trim(),

  'non-past-affirmative-polite': `
**Non-past affirmative (polite)**
Use the ます-stem + ます.
• Ichidan verbs: Remove -る and add ます (食べる → 食べます)
• Godan verbs: Change final -u to -i and add ます (書く → 書きます, 飲む → 飲みます)
• Irregular verbs: する → します, 来る (くる) → 来ます (きます)
• Irregular honorific: なさる → なさいます (the polite stem is なさい-, not なさり-)
  `.trim(),

  'past-affirmative-casual': `
**Past affirmative (casual)**
• Ichidan verbs: Remove -る and add た (食べる → 食べた)
• Godan verbs: Use te-form rules but with た/だ instead of て/で
  - う/つ/る → った (帰る → 帰った)
  - ぬ/ぶ/む → んだ (飲む → 飲んだ)
  - く → いた (書く → 書いた)
  - ぐ → いだ (泳ぐ → 泳いだ)
  - す → した (話す → 話した)
  - Exception: 行く → 行った (not 行いた)
• Irregular verbs: する → した, 来る (くる) → 来た (きた)
  `.trim(),

  'past-affirmative-polite': `
**Past affirmative (polite)**
Use the ます-stem + ました.
• Ichidan verbs: Remove -る, add ました (食べる → 食べました)
• Godan verbs: Change final -u to -i, add ました (書く → 書きました)
• Irregular verbs: する → しました, 来る (くる) → 来ました (きました)
• Irregular honorific: なさる → なさいました (the polite stem is なさい-, not なさり-)
  `.trim(),

  'negative-casual': `
**Negative (casual)**
Add ない to the verb stem.
• Ichidan verbs: Remove -る and add ない (食べる → 食べない)
• Godan verbs: Change final -u to -a and add ない (書く → 書かない, 飲む → 飲まない)
• Exception: う → わない (買う → 買わない)
• Irregular verbs: する → しない, 来る (くる) → 来ない (こない), ある → ない
  `.trim(),

  'negative-polite': `
**Negative (polite)**
Use the ます-stem + ません.
• Ichidan verbs: Remove -る, add ません (食べる → 食べません)
• Godan verbs: Change final -u to -i, add ません (書く → 書きません)
• Irregular verbs: する → しません, 来る (くる) → 来ません (きません), ある → ありません
• Irregular honorific: なさる → なさいません (the polite stem is なさい-, not なさり-)
  `.trim(),

  'negative-past-casual': `
**Negative past (casual)**
Build the negative form first, then change ない to なかった.

**Step 1: Build the negative form**
• Ichidan verbs: Remove -る and add ない (食べる → 食べない)
• Godan verbs: Change final -u to -a and add ない (書く → 書かない, 飲む → 飲まない)
• Exception: う → わない (買う → 買わない)
• Irregular verbs: する → しない, 来る (くる) → 来ない (こない), ある → ない

**Step 2: Change ない to なかった**
• 食べない → 食べなかった
• 書かない → 書かなかった
• 買わない → 買わなかった
• しない → しなかった
• 来ない (こない) → 来なかった (こなかった)
• ない → なかった (for ある)
  `.trim(),

  'negative-past-polite': `
**Negative past (polite)**
Use the ます-stem + ませんでした.
• Ichidan verbs: 食べません → 食べませんでした
• Godan verbs: 書きません → 書きませんでした
• Irregular verbs: する → しませんでした, 来る (くる) → 来ませんでした (きませんでした), ある → ありませんでした
• Irregular honorific: なさる → なさいませんでした (the polite stem is なさい-, not なさり-)
  `.trim(),

  'progressive-casual': `
**Progressive present (casual) - "is doing"**
Use te-form + いる.
• Ichidan verbs: Remove -る, add ている (食べる → 食べている)
• Godan verbs: Te-form + いる
  - う/つ/る → っている (帰る → 帰っている)
  - ぬ/ぶ/む → んでいる (飲む → 飲んでいる)
  - く → いている (書く → 書いている)
  - ぐ → いでいる (泳ぐ → 泳いでいる)
  - す → している (話す → 話している)
• Irregular verbs: する → している, 来る (くる) → 来ている (きている)
  `.trim(),

  'progressive-polite': `
**Progressive present (polite) - "is doing"**
Use te-form + います.
• Same as progressive-casual, but replace いる with います
• 食べる → 食べています
• 書く → 書いています
• Irregular verbs: する → しています, 来る (くる) → 来ています (きています)
  `.trim(),

  'progressive-past-casual': `
**Progressive past (casual) - "was doing"**
Use te-form + いた.
• Same as progressive-casual, but replace いる with いた
• 食べる → 食べていた
• 書く → 書いていた
• Irregular verbs: する → していた, 来る (くる) → 来ていた (きていた)
  `.trim(),

  'progressive-past-polite': `
**Progressive past (polite) - "was doing"**
Use te-form + いました.
• Same as progressive-casual, but replace いる with いました
• 食べる → 食べていました
• 書く → 書いていました
• Irregular verbs: する → していました, 来る (くる) → 来ていました (きていました)
  `.trim(),

  'negative-progressive-casual': `
**Negative progressive present (casual) - "is not doing"**
Use te-form + いない.
• Same as progressive-casual, but replace いる with いない
• 食べる → 食べていない
• 書く → 書いていない
• Irregular verbs: する → していない, 来る (くる) → 来ていない (きていない), ある → ない
  `.trim(),

  'negative-progressive-polite': `
**Negative progressive present (polite) - "is not doing"**
Use te-form + いません.
• Same as progressive-casual, but replace いる with いません
• 食べる → 食べていません
• 書く → 書いていません
• Irregular verbs: する → していません, 来る (くる) → 来ていません (きていません), ある → ありません
  `.trim(),

  'negative-progressive-past-casual': `
**Negative progressive past (casual) - "was not doing"**
Use te-form + いなかった.
• Same as progressive-casual, but replace いる with いなかった
• 食べる → 食べていなかった
• 書く → 書いていなかった
• Irregular verbs: する → していなかった, 来る (くる) → 来ていなかった (きていなかった), ある → なかった
  `.trim(),

  'negative-progressive-past-polite': `
**Negative progressive past (polite) - "was not doing"**
Use te-form + いませんでした.
• Same as progressive-casual, but replace いる with いませんでした
• 食べる → 食べていませんでした
• 書く → 書いていませんでした
• Irregular verbs: する → していませんでした, 来る (くる) → 来ていませんでした (きていませんでした), ある → ありませんでした
  `.trim(),

  'te-form': `
**て-form**
• Ichidan verbs: Remove -る and add て (食べる → 食べて)
• Godan verbs:
  - う/つ/る → って (買う → 買って, 持つ → 持って, 帰る → 帰って)
  - ぬ/ぶ/む → んで (死ぬ → 死んで, 遊ぶ → 遊んで, 飲む → 飲んで)
  - く → いて (書く → 書いて)
  - ぐ → いで (泳ぐ → 泳いで)
  - す → して (話す → 話して)
  - Exception: 行く → 行って (not 行いて)
• Irregular verbs: する → して, 来る (くる) → 来て (きて)
  `.trim(),

  'tai-casual': `
**Want to (casual) - たい form**
Express desire to do something.
• Ichidan verbs: Remove -る and add たい (食べる → 食べたい)
• Godan verbs: Change final -u to -i and add たい (書く → 書きたい, 飲む → 飲みたい)
• Irregular verbs: する → したい, 来る (くる) → 来たい (きたい)
• Irregular honorific: なさる → なさいたい (the polite stem is なさい-, not なさり-)
  `.trim(),

  'tai-polite': `
**Want to (polite) - たいです form**
Express desire to do something politely.
• Same as tai-casual, but add です at the end
• Ichidan verbs: Remove -る and add たいです (食べる → 食べたいです)
• Godan verbs: Change final -u to -i and add たいです (書く → 書きたいです)
• Irregular verbs: する → したいです, 来る (くる) → 来たいです (きたいです)
• Irregular honorific: なさる → なさいたいです (the polite stem is なさい-, not なさり-)
  `.trim(),

  'sou-casual': `
**Looks/seems like (~そう)**
This form expresses that something looks or seems like it's about to happen or is in a certain state based on appearance.
• Ichidan verbs: Remove 〜る and add 〜そう (食べる → 食べそう)
• Godan verbs: Change final -u to -i and add 〜そう (書く → 書きそう, 降る → 降りそう)
• Irregular verbs: する → しそう, 来る (くる) → 来そう (きそう)
• Irregular honorific: なさる → なさいそう (the polite stem is なさい-, not なさり-)
  `.trim(),

  'sou-polite': `
**Looks/seems like (~そう) (polite)**
This form expresses that something looks or seems like it's about to happen or is in a certain state based on appearance.

First, form the casual "sou" (~そう) version:
• Ichidan verbs: Remove 〜る and add 〜そう (食べる → 食べそう)
• Godan verbs: Change final -u to -i and add 〜そう (書く → 書きそう, 降る → 降りそう)
• Irregular verbs: する → しそう, 来る (くる) → 来そう (きそう)
• Irregular honorific: なさる → なさいそう (the polite stem is なさい-, not なさり-)

Then add です for the polite form:
• 食べそう → 食べそうです
• 降りそう → 降りそうです
  `.trim(),

  'volitional-casual': `
**Volitional (casual) - "Let's" form**
This form is used to suggest an action or express intention in a casual setting.
• Ichidan verbs: Remove the final -る and add 〜よう (食べる → 食べよう)
• Godan verbs: Change the final -u sound to its corresponding -o sound and add 〜う.
  - 書く (kaku) → 書こう (kakou)
  - 飲む (nomu) → 飲もう (nomou)
  - 話す (hanasu) → 話そう (hanasou)
  - 買う (kau) → 買おう (kaou)
• Irregular verbs:
  - する → しよう
  - 来る (くる) → 来よう (こよう)
  `.trim(),

  'volitional-polite': `
**Volitional (polite) - "Let's" form**
This is the polite version of the "let's" form, commonly used with peers or in semi-formal situations.
• Use the ます-stem + ましょう.
• Ichidan verbs: Remove -る and add 〜ましょう (食べる → 食べましょう)
• Godan verbs: Change the final -u sound to -i and add 〜ましょう.
  - 書く (kaku) → 書きましょう (kakimashou)
  - 飲む (nomu) → 飲みましょう (nomimashou)
• Irregular verbs:
  - する → しましょう
  - 来る (くる) → 来ましょう (kimashou)
• Irregular honorific: なさる → なさいましょう (the polite stem is なさい-, not なさり-)
  `.trim(),
};

export const ADJECTIVE_CONJUGATION_INSTRUCTIONS: Partial<Record<ConjugationType, string>> = {
  'non-past-affirmative-casual': `
**Non-past affirmative (casual/dictionary form) — い-adjectives**
This is the adjective as you find it in the dictionary.
• Use the word as-is: 高い
• Watch out for “fake い-adjectives” that are actually な-adjectives (きれい, きらい) → they don’t use 〜く forms
• Exception: いい stays いい here (often written よい in formal/written style)
  `.trim(),

  'non-past-affirmative-polite': `
**Non-past affirmative (polite) — い-adjectives**
Add です to the dictionary form.
• 高い → 高いです
• いい → いいです
  `.trim(),

  'negative-casual': `
**Negative (casual) — い-adjectives**
Make it “not ~” by switching the final い to くない.
• 高い → 高くない
• Exception: いい uses the よい pattern → よくない
  `.trim(),

  'negative-polite': `
**Negative (polite) — い-adjectives**
Two common polite negatives (same meaning; different formality).
• Casual-polite: 高くないです / よくないです
• Formal: 高くありません / よくありません
  `.trim(),

  'past-affirmative-casual': `
**Past affirmative (casual) — い-adjectives**
Make it past by switching the final い to かった.
• 高い → 高かった
• Exception: いい → よかった
  `.trim(),

  'past-affirmative-polite': `
**Past affirmative (polite) — い-adjectives**
Use the past form + です.
• 高かった → 高かったです
• よかった → よかったです (for いい)
  `.trim(),

  'negative-past-casual': `
**Negative past (casual) — い-adjectives**
Build the negative form first, then change ない to なかった.

**Step 1: Build the negative form**
• Switch the final い to くない (高い → 高くない)
• Exception: いい uses the よい pattern → よくない

**Step 2: Change ない to なかった**
• 高くない → 高くなかった
• よくない → よくなかった (for いい)
  `.trim(),

  'negative-past-polite': `
**Negative past (polite) — い-adjectives**
Two common polite negative-past forms (same meaning; different formality).
• Casual-polite: 高くなかったです / よくなかったです
• Formal: 高くありませんでした / よくありませんでした
  `.trim(),

  'te-form': `
**て-form — い-adjectives**
Switch the final い to くて.
• 高い → 高くて
• Exception: いい → よくて
• Negative て-form: start from 〜くない and change the final い to くて (高くない → 高くなくて / よくない → よくなくて)
  `.trim(),

  'sou-casual': `
**Looks/seems like (~そう)**
This form expresses that something looks or seems a certain way.
• い-adjectives: Remove the final 〜い and add そう (高い → 高そう, 美味しい → おいしそう)
• Exception: いい → よさそう
• Exception: ない → なさそう. This also applies to negative forms ending in 〜くない (美味しくない → おいしくなさそう).
  `.trim(),

  'sou-polite': `
**Looks/seems like (~そう) (polite)**
This form expresses that something looks or seems a certain way.

First, form the casual "sou" (~そう) version:
• い-adjectives: Remove the final 〜い and add そう (高い → 高そう, 美味しい → おいしそう)
• Exception: いい → よさそう
• Exception: ない → なさそう. This also applies to negative forms ending in 〜くない (美味しくない → おいしくなさそう).

Then add です for the polite form:
• 高そう → 高そうです
• よさそう → よさそうです
  `.trim(),
};

export function getConjugationInstruction(type: ConjugationType, wordType: WordType): string {
  if (wordType === 'adjective') {
    return ADJECTIVE_CONJUGATION_INSTRUCTIONS[type] || '';
  }
  return VERB_CONJUGATION_INSTRUCTIONS[type] || '';
}

// Keeping it for backward compatibility if any component still uses it directly
export const CONJUGATION_INSTRUCTIONS = VERB_CONJUGATION_INSTRUCTIONS;
