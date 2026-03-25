const VERSES = [
  {
    verse: "Verily, with hardship comes ease.",
    reference: "Quran 94:6 (Ash-Sharh)",
    explanation: "No matter how difficult your situation, relief is already on its way. Hardship and ease are intertwined by divine promise."
  },
  {
    verse: "And He found you lost and guided you.",
    reference: "Quran 93:7 (Ad-Duha)",
    explanation: "Even when you feel directionless, remember that guidance has found you before and will find you again."
  },
  {
    verse: "So remember Me; I will remember you. Be grateful to Me, and do not deny Me.",
    reference: "Quran 2:152 (Al-Baqarah)",
    explanation: "Remembrance of Allah is a two-way relationship. When you turn toward Him, He turns toward you."
  },
  {
    verse: "Allah does not burden a soul beyond that it can bear.",
    reference: "Quran 2:286 (Al-Baqarah)",
    explanation: "Whatever you are carrying right now, you have the strength to endure it. You were not given more than you can handle."
  },
  {
    verse: "And whoever puts their trust in Allah, then He will suffice him.",
    reference: "Quran 65:3 (At-Talaq)",
    explanation: "True reliance on Allah means doing your part and then surrendering the outcome. He will take care of the rest."
  },
  {
    verse: "Indeed, Allah is with the patient.",
    reference: "Quran 2:153 (Al-Baqarah)",
    explanation: "Patience is not passive waiting — it is active endurance with faith. And in that patience, you are never alone."
  },
  {
    verse: "And He is with you wherever you are.",
    reference: "Quran 57:4 (Al-Hadid)",
    explanation: "No place is too remote, no moment too insignificant. Allah's awareness and presence encompass everything."
  },
  {
    verse: "My mercy encompasses all things.",
    reference: "Quran 7:156 (Al-A'raf)",
    explanation: "Allah's mercy is not limited or selective — it surrounds every creature and every situation. Let that bring you comfort."
  },
  {
    verse: "And say: My Lord, increase me in knowledge.",
    reference: "Quran 20:114 (Ta-Ha)",
    explanation: "The pursuit of knowledge is a lifelong prayer. Stay humble, stay curious, and keep asking to understand more."
  },
  {
    verse: "So which of the favors of your Lord would you deny?",
    reference: "Quran 55:13 (Ar-Rahman)",
    explanation: "Gratitude begins with noticing. Look around and count the blessings you may have been overlooking."
  },
  {
    verse: "Do not lose hope in the mercy of Allah.",
    reference: "Quran 39:53 (Az-Zumar)",
    explanation: "No matter what you have done or what has happened, despair is never the answer. Allah's mercy is always accessible."
  },
  {
    verse: "And We have certainly made the Quran easy for remembrance, so is there any who will remember?",
    reference: "Quran 54:17 (Al-Qamar)",
    explanation: "Divine guidance is not meant to be inaccessible. It is made easy — the question is whether we make time for it."
  },
  {
    verse: "Indeed, the most noble of you in the sight of Allah is the most righteous of you.",
    reference: "Quran 49:13 (Al-Hujurat)",
    explanation: "True honor is not measured by wealth, status, or lineage, but by the quality of your character and your consciousness of Allah."
  },
  {
    verse: "And speak to people good words.",
    reference: "Quran 2:83 (Al-Baqarah)",
    explanation: "Your words carry weight. Choose kindness in every conversation — it costs nothing but changes everything."
  },
  {
    verse: "Whoever does righteousness, whether male or female, while being a believer — those will enter Paradise.",
    reference: "Quran 4:124 (An-Nisa)",
    explanation: "Good deeds are recognized regardless of who performs them. Faith and action together open every door."
  },
  {
    verse: "And the servants of the Most Merciful are those who walk upon the earth humbly.",
    reference: "Quran 25:63 (Al-Furqan)",
    explanation: "Humility is a hallmark of true faith. Walk gently through the world, both in your steps and your interactions."
  },
  {
    verse: "He knows what is in every heart.",
    reference: "Quran 67:13 (Al-Mulk)",
    explanation: "You don't need to explain yourself to Allah — He already knows your intentions, struggles, and silent prayers."
  },
  {
    verse: "And whoever is grateful — his gratitude is only for the benefit of himself.",
    reference: "Quran 31:12 (Luqman)",
    explanation: "Gratitude transforms you from within. When you give thanks, the first person who benefits is you."
  },
  {
    verse: "And do good; indeed, Allah loves the doers of good.",
    reference: "Quran 2:195 (Al-Baqarah)",
    explanation: "Excellence in action — doing your best in every situation — is itself an act of worship that draws you closer to Allah."
  },
  {
    verse: "Perhaps you hate a thing and it is good for you; and perhaps you love a thing and it is bad for you. And Allah knows, while you do not know.",
    reference: "Quran 2:216 (Al-Baqarah)",
    explanation: "Trust that what feels like loss or disappointment may be a redirection toward something better. Your vision is limited; His is not."
  },
  {
    verse: "And We created you in pairs.",
    reference: "Quran 78:8 (An-Naba)",
    explanation: "Connection and companionship are built into the design of creation. You were never meant to walk through life entirely alone."
  },
  {
    verse: "Indeed, prayer prohibits immorality and wrongdoing.",
    reference: "Quran 29:45 (Al-Ankabut)",
    explanation: "Prayer is not just ritual — it is a shield. Regular connection with Allah naturally steers you away from harm."
  },
  {
    verse: "And We have sent you not except as a mercy to the worlds.",
    reference: "Quran 21:107 (Al-Anbiya)",
    explanation: "The Prophet's mission was rooted in mercy. Let mercy be the lens through which you see and treat others today."
  },
  {
    verse: "Is not Allah sufficient for His servant?",
    reference: "Quran 39:36 (Az-Zumar)",
    explanation: "When fear or worry creeps in, ask yourself this question. The answer is always yes."
  },
  {
    verse: "And your Lord has decreed that you not worship except Him, and to parents, good treatment.",
    reference: "Quran 17:23 (Al-Isra)",
    explanation: "Honoring your parents is placed right alongside the worship of Allah. Kindness to them is a fundamental act of faith."
  },
  {
    verse: "O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient.",
    reference: "Quran 2:153 (Al-Baqarah)",
    explanation: "When life gets heavy, these are your two anchors: patience in your heart and prayer on your lips."
  },
  {
    verse: "Allah does not change the condition of a people until they change what is in themselves.",
    reference: "Quran 13:11 (Ar-Ra'd)",
    explanation: "Transformation starts from within. If you want your circumstances to change, begin with your mindset and your actions."
  },
  {
    verse: "And He gives you of all that you ask Him. And if you should count the favor of Allah, you could not enumerate them.",
    reference: "Quran 14:34 (Ibrahim)",
    explanation: "The blessings in your life are literally uncountable. Pause and appreciate even a fraction of them today."
  },
  {
    verse: "Indeed, with every difficulty there is relief.",
    reference: "Quran 94:5 (Ash-Sharh)",
    explanation: "This verse is so important it is stated twice in the same surah. Relief is not after hardship — it is with it."
  },
  {
    verse: "And hold firmly to the rope of Allah all together and do not become divided.",
    reference: "Quran 3:103 (Aal-Imran)",
    explanation: "Unity and brotherhood are essential. Hold onto your faith and your community — both are sources of strength."
  },
  {
    verse: "And when My servants ask you concerning Me, indeed I am near.",
    reference: "Quran 2:186 (Al-Baqarah)",
    explanation: "Allah does not say He will be near — He says He is near, right now. Your prayers are heard the moment they leave your heart."
  },
  {
    verse: "And those who strive for Us — We will surely guide them to Our ways.",
    reference: "Quran 29:69 (Al-Ankabut)",
    explanation: "Effort and sincerity are met with divine guidance. Keep striving, and the path will become clearer."
  },
  {
    verse: "No soul knows what has been hidden for them of comfort for eyes as a reward for what they used to do.",
    reference: "Quran 32:17 (As-Sajdah)",
    explanation: "The rewards Allah has prepared are beyond imagination. Your good deeds are building something you cannot yet see."
  },
  {
    verse: "And whoever fears Allah — He will make for him a way out.",
    reference: "Quran 65:2 (At-Talaq)",
    explanation: "Consciousness of Allah opens doors you did not know existed. When you honor Him, He creates exits from your difficulties."
  },
  {
    verse: "So be patient. Indeed, the promise of Allah is truth.",
    reference: "Quran 30:60 (Ar-Rum)",
    explanation: "Patience is not blind hope — it is trust in a promise that has never been broken. Hold on."
  },
  {
    verse: "And We have certainly created man and We know what his soul whispers to him, and We are closer to him than his jugular vein.",
    reference: "Quran 50:16 (Qaf)",
    explanation: "Allah's closeness is intimate and profound. He knows your innermost thoughts and is nearer than you can fathom."
  },
  {
    verse: "He it is who sent down tranquility into the hearts of the believers that they would increase in faith along with their present faith.",
    reference: "Quran 48:4 (Al-Fath)",
    explanation: "Inner peace is a gift from Allah. When you feel calm despite the storm, recognize that as a sign of His care."
  },
  {
    verse: "And whoever is patient and forgives — indeed, that is of the matters requiring resolve.",
    reference: "Quran 42:43 (Ash-Shura)",
    explanation: "Forgiveness is not weakness — it requires tremendous courage and strength of character. It is a sign of greatness."
  },
  {
    verse: "Indeed, the hearing, the sight, and the heart — about all those one will be questioned.",
    reference: "Quran 17:36 (Al-Isra)",
    explanation: "Be mindful of what you listen to, watch, and harbor in your heart. You are a steward of your own senses."
  },
  {
    verse: "And whoever saves one life — it is as if he had saved all of mankind.",
    reference: "Quran 5:32 (Al-Ma'idah)",
    explanation: "Every life has infinite value. Even a single act of compassion or rescue reverberates through all of humanity."
  },
  {
    verse: "O mankind, indeed We have created you from male and female and made you peoples and tribes that you may know one another.",
    reference: "Quran 49:13 (Al-Hujurat)",
    explanation: "Diversity is by design. Our differences exist not to divide us, but to enrich our understanding of one another."
  },
  {
    verse: "And say: Work, for Allah will see your work, and so will His Messenger and the believers.",
    reference: "Quran 9:105 (At-Tawbah)",
    explanation: "Your efforts are witnessed and valued. Let this motivate you to bring excellence and sincerity to everything you do today."
  },
  {
    verse: "He created the heavens and the earth in truth. He wraps the night over the day and wraps the day over the night.",
    reference: "Quran 39:5 (Az-Zumar)",
    explanation: "Every sunrise and sunset is a sign of perfect design. The rhythm of day and night reminds us of a Creator in control."
  },
  {
    verse: "And if you are grateful, I will surely increase you in favor.",
    reference: "Quran 14:7 (Ibrahim)",
    explanation: "Gratitude is not just good manners — it is a catalyst for abundance. The more you appreciate, the more you receive."
  },
  {
    verse: "Allah is the Light of the heavens and the earth.",
    reference: "Quran 24:35 (An-Nur)",
    explanation: "In moments of darkness and confusion, turn toward the source of all light. Guidance is always available."
  },
  {
    verse: "And cooperate in righteousness and piety, but do not cooperate in sin and aggression.",
    reference: "Quran 5:2 (Al-Ma'idah)",
    explanation: "Choose your alliances wisely. Support others in what is good, and have the courage to step away from what is harmful."
  },
  {
    verse: "Repel evil by that which is better, and thereupon the one whom between you and him is enmity will become as though he was a devoted friend.",
    reference: "Quran 41:34 (Fussilat)",
    explanation: "Responding to hostility with grace can transform enemies into allies. Kindness is the most powerful response to harm."
  },
  {
    verse: "And in the earth are signs for the certain in faith, and in yourselves. Then will you not see?",
    reference: "Quran 51:20-21 (Adh-Dhariyat)",
    explanation: "Signs of the divine are everywhere — in nature, in your own body, in every moment. Open your eyes and reflect."
  },
  {
    verse: "And those who have believed and whose hearts are assured by the remembrance of Allah. Unquestionably, by the remembrance of Allah hearts are assured.",
    reference: "Quran 13:28 (Ar-Ra'd)",
    explanation: "If your heart is restless, the remedy is remembrance. Peace of mind comes from reconnecting with your Creator."
  },
  {
    verse: "The believers are but brothers, so make settlement between your brothers.",
    reference: "Quran 49:10 (Al-Hujurat)",
    explanation: "Brotherhood in faith carries responsibility. When conflict arises, be a bridge, not a bystander."
  },
  {
    verse: "And do not walk upon the earth arrogantly. Indeed, Allah does not like everyone self-deluded and boastful.",
    reference: "Quran 31:18 (Luqman)",
    explanation: "Arrogance closes doors that humility opens. Walk through life with confidence, but never with conceit."
  },
  {
    verse: "And it is He who accepts repentance from His servants and pardons misdeeds, and He knows what you do.",
    reference: "Quran 42:25 (Ash-Shura)",
    explanation: "No mistake is too great for Allah's forgiveness. Sincere repentance is always met with divine pardon."
  },
  {
    verse: "On no soul does Allah place a burden greater than it can bear. It gets every good that it earns, and it suffers every ill that it earns.",
    reference: "Quran 2:286 (Al-Baqarah)",
    explanation: "You are accountable for your own deeds, and you are capable of bearing your own trials. Trust in your own resilience."
  },
  {
    verse: "And your Lord is the Forgiving, Full of Mercy.",
    reference: "Quran 18:58 (Al-Kahf)",
    explanation: "Forgiveness and mercy are not occasional — they are defining attributes of Allah. Approach Him with hope, not despair."
  },
  {
    verse: "To Allah belongs whatever is in the heavens and whatever is on the earth.",
    reference: "Quran 2:284 (Al-Baqarah)",
    explanation: "Everything belongs to Allah. When you lose something, remember it was always His. When you gain something, remember it still is."
  },
  {
    verse: "Indeed, Allah loves those who act justly.",
    reference: "Quran 49:9 (Al-Hujurat)",
    explanation: "Justice is beloved to Allah. In every decision and interaction, strive to be fair, even when it is difficult."
  },
  {
    verse: "And He found you in need and made you self-sufficient.",
    reference: "Quran 93:8 (Ad-Duha)",
    explanation: "Look back at how far you have come. The One who provided for you then has not forgotten you now."
  },
  {
    verse: "Read! In the name of your Lord who created.",
    reference: "Quran 96:1 (Al-Alaq)",
    explanation: "The very first revelation was a command to read and learn. Knowledge and seeking understanding are at the heart of faith."
  },
  {
    verse: "And He taught Adam the names — all of them.",
    reference: "Quran 2:31 (Al-Baqarah)",
    explanation: "The gift of knowledge was given to humanity from the very beginning. Cherish your ability to learn and understand."
  },
  {
    verse: "And We have certainly honored the children of Adam.",
    reference: "Quran 17:70 (Al-Isra)",
    explanation: "Every human being has inherent dignity. Treat yourself and others with the honor that Allah has already bestowed."
  },
  {
    verse: "Indeed, the patient will be given their reward without account.",
    reference: "Quran 39:10 (Az-Zumar)",
    explanation: "The reward for patience is limitless — beyond calculation. Every moment of endurance is being recorded and honored."
  },
  {
    verse: "And not equal are the good deed and the bad. Repel evil by that which is better.",
    reference: "Quran 41:34 (Fussilat)",
    explanation: "A good deed holds far more weight than a bad one. Choose the higher path, especially when it is harder."
  },
  {
    verse: "O you who have believed, let not your wealth and your children divert you from the remembrance of Allah.",
    reference: "Quran 63:9 (Al-Munafiqun)",
    explanation: "Blessings can become distractions if they pull you away from what matters most. Stay centered in your purpose."
  },
  {
    verse: "And the Hereafter is better for you than the first life.",
    reference: "Quran 93:4 (Ad-Duha)",
    explanation: "This life, with all its beauty, is only the beginning. The best is yet to come — hold onto that hope."
  },
  {
    verse: "And when you have decided, then rely upon Allah. Indeed, Allah loves those who rely upon Him.",
    reference: "Quran 3:159 (Aal-Imran)",
    explanation: "Make your decision with wisdom, then trust Allah with the outcome. Action and reliance go hand in hand."
  },
  {
    verse: "He is the First and the Last, the Ascendant and the Intimate, and He is, of all things, Knowing.",
    reference: "Quran 57:3 (Al-Hadid)",
    explanation: "Allah encompasses all of existence — past, present, future, seen, and unseen. Nothing escapes His knowledge."
  },
  {
    verse: "And to Allah belongs the east and the west. So wherever you turn, there is the Face of Allah.",
    reference: "Quran 2:115 (Al-Baqarah)",
    explanation: "You cannot move beyond Allah's presence. In every direction, in every moment, He is there."
  },
  {
    verse: "And We send down of the Quran that which is a healing and a mercy for the believers.",
    reference: "Quran 17:82 (Al-Isra)",
    explanation: "The Quran is not just a book of rules — it is medicine for the soul. Turn to it when your heart needs healing."
  },
  {
    verse: "And whoever does an atom's weight of good will see it.",
    reference: "Quran 99:7 (Az-Zalzalah)",
    explanation: "No good deed is too small to matter. Every tiny act of kindness is recorded and will be rewarded."
  },
  {
    verse: "Indeed, Allah is Subtle, Acquainted with all things.",
    reference: "Quran 67:14 (Al-Mulk)",
    explanation: "Allah works in ways that are gentle and often invisible. Trust that He is orchestrating things behind the scenes."
  },
];

export function getVerseForDate(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - start) / (1000 * 60 * 60 * 24));
  return VERSES[dayOfYear % VERSES.length];
}
