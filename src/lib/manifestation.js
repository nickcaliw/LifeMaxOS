const QUOTES = [
  // Manifestation & Law of Attraction
  { text: "What you think, you become. What you feel, you attract. What you imagine, you create.", author: "Buddha" },
  { text: "Ask for what you want and be prepared to get it.", author: "Maya Angelou" },
  { text: "Whatever you hold in your mind on a consistent basis is exactly what you will experience in your life.", author: "Tony Robbins" },
  { text: "The entire universe is conspiring to give you everything that you want.", author: "Abraham Hicks" },
  { text: "See the things that you want as already yours.", author: "Rhonda Byrne" },
  { text: "Your whole life is a manifestation of the thoughts that go on in your head.", author: "Lisa Nichols" },
  { text: "To bring anything into your life, imagine that it's already there.", author: "Richard Bach" },
  { text: "The law of attraction states that whatever you focus on, think about, read about, and talk about intensely, you're going to attract more of into your life.", author: "Jack Canfield" },
  { text: "Imagination is everything. It is the preview of life's coming attractions.", author: "Albert Einstein" },
  { text: "You create your own universe as you go along.", author: "Winston Churchill" },

  // Neville Goddard
  { text: "Assume the feeling of your wish fulfilled and observe the route that your attention follows.", author: "Neville Goddard" },
  { text: "An awakened imagination works with a purpose. It creates and conserves the desirable, and transforms or destroys the undesirable.", author: "Neville Goddard" },
  { text: "Change your conception of yourself and you will automatically change the world in which you live.", author: "Neville Goddard" },
  { text: "The world is yourself pushed out. Ask yourself what you are pushing out.", author: "Neville Goddard" },

  // Deepak Chopra
  { text: "In the midst of movement and chaos, keep stillness inside of you.", author: "Deepak Chopra" },
  { text: "Every time you are tempted to react in the same old way, ask if you want to be a prisoner of the past or a pioneer of the future.", author: "Deepak Chopra" },
  { text: "You must find the place inside yourself where nothing is impossible.", author: "Deepak Chopra" },
  { text: "The universe has no fixed agenda. Once you make any decision, it works around that decision.", author: "Deepak Chopra" },

  // Eckhart Tolle
  { text: "Realize deeply that the present moment is all you have. Make the NOW the primary focus of your life.", author: "Eckhart Tolle" },
  { text: "Life is the dancer and you are the dance.", author: "Eckhart Tolle" },
  { text: "Whatever the present moment contains, accept it as if you had chosen it.", author: "Eckhart Tolle" },
  { text: "The primary cause of unhappiness is never the situation but your thoughts about it.", author: "Eckhart Tolle" },

  // Wayne Dyer
  { text: "You'll see it when you believe it.", author: "Wayne Dyer" },
  { text: "If you change the way you look at things, the things you look at change.", author: "Wayne Dyer" },
  { text: "Abundance is not something we acquire. It is something we tune into.", author: "Wayne Dyer" },
  { text: "You cannot always control what goes on outside. But you can always control what goes on inside.", author: "Wayne Dyer" },

  // Abraham Hicks
  { text: "A belief is only a thought you continue to think; and when your beliefs match your desires, then your desires must become your reality.", author: "Abraham Hicks" },
  { text: "You are the vibrational writers of the script of your life, and everyone else in the universe is playing the part that you have assigned to them.", author: "Abraham Hicks" },
  { text: "Reach for the thought that feels better, and allow the natural well-being that is yours.", author: "Abraham Hicks" },

  // Rhonda Byrne
  { text: "There is a truth deep down inside of you that has been waiting for you to discover it, and that truth is this: you deserve all good things life has to offer.", author: "Rhonda Byrne" },
  { text: "Your power is in your thoughts, so stay awake. In other words, remember to remember.", author: "Rhonda Byrne" },

  // Oprah Winfrey
  { text: "The biggest adventure you can take is to live the life of your dreams.", author: "Oprah Winfrey" },
  { text: "Be thankful for what you have; you'll end up having more. If you concentrate on what you don't have, you will never, ever have enough.", author: "Oprah Winfrey" },
  { text: "Create the highest, grandest vision possible for your life, because you become what you believe.", author: "Oprah Winfrey" },

  // Louise Hay
  { text: "You have the power to heal your life, and you need to know that. We think so often that we are helpless, but we're not.", author: "Louise Hay" },
  { text: "Every thought we think is creating our future.", author: "Louise Hay" },
  { text: "I do not fix problems. I fix my thinking. Then problems fix themselves.", author: "Louise Hay" },

  // Joe Dispenza
  { text: "Your personality creates your personal reality.", author: "Joe Dispenza" },
  { text: "The best way to predict your future is to create it not from the known, but from the unknown.", author: "Joe Dispenza" },
  { text: "When you are truly focused on an intention for some future outcome, if you can make inner thought more real than the outer environment, the brain won't know the difference.", author: "Joe Dispenza" },
  { text: "Change as a choice, instead of change as a reaction.", author: "Joe Dispenza" },

  // Rumi
  { text: "What you seek is seeking you.", author: "Rumi" },
  { text: "The wound is the place where the Light enters you.", author: "Rumi" },
  { text: "Let yourself be silently drawn by the strange pull of what you really love. It will not lead you astray.", author: "Rumi" },
  { text: "You are not a drop in the ocean. You are the entire ocean in a drop.", author: "Rumi" },
  { text: "Respond to every call that excites your spirit.", author: "Rumi" },

  // Lao Tzu
  { text: "When I let go of what I am, I become what I might be.", author: "Lao Tzu" },
  { text: "Nature does not hurry, yet everything is accomplished.", author: "Lao Tzu" },
  { text: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { text: "Be content with what you have; rejoice in the way things are. When you realize there is nothing lacking, the whole world belongs to you.", author: "Lao Tzu" },

  // Alan Watts
  { text: "The only way to make sense out of change is to plunge into it, move with it, and join the dance.", author: "Alan Watts" },
  { text: "You are an aperture through which the universe is looking at and exploring itself.", author: "Alan Watts" },
  { text: "This is the real secret of life — to be completely engaged with what you are doing in the here and now. And instead of calling it work, realize it is play.", author: "Alan Watts" },

  // Ram Dass
  { text: "The quieter you become, the more you can hear.", author: "Ram Dass" },
  { text: "We're all just walking each other home.", author: "Ram Dass" },
  { text: "Be here now.", author: "Ram Dass" },

  // Thich Nhat Hanh
  { text: "The present moment is filled with joy and happiness. If you are attentive, you will see it.", author: "Thich Nhat Hanh" },
  { text: "Walk as if you are kissing the Earth with your feet.", author: "Thich Nhat Hanh" },
  { text: "Because you are alive, everything is possible.", author: "Thich Nhat Hanh" },

  // Other spiritual teachers & thinkers
  { text: "The only limits in our life are those we impose on ourselves.", author: "Bob Proctor" },
  { text: "You are a living magnet. What you attract into your life is in harmony with your dominant thoughts.", author: "Brian Tracy" },
  { text: "Your task is not to seek for love, but merely to seek and find all the barriers within yourself that you have built against it.", author: "Rumi" },
  { text: "The universe doesn't give you what you ask for with your thoughts; it gives you what you demand with your actions.", author: "Steve Maraboli" },
  { text: "Once you make a decision, the universe conspires to make it happen.", author: "Ralph Waldo Emerson" },
  { text: "With everything that has happened to you, you can either feel sorry for yourself or treat what has happened as a gift. Everything is either an opportunity to grow or an obstacle to keep you from growing.", author: "Wayne Dyer" },
  { text: "The mind is everything. What you think you become.", author: "Buddha" },

  // Anonymous / Universal wisdom
  { text: "Energy flows where attention goes.", author: "Anonymous" },
  { text: "You attract what you are, not what you want. If you want great, then be great.", author: "Anonymous" },
  { text: "Your vibration is your invitation to the universe.", author: "Anonymous" },
  { text: "The universe is not outside of you. Look inside yourself; everything that you want, you already are.", author: "Rumi" },
  { text: "Gratitude is the most powerful prayer. It shifts your energy from lack to abundance in an instant.", author: "Anonymous" },
  { text: "You don't attract what you want. You attract what you are.", author: "Wayne Dyer" },
  { text: "Set your intention, trust the process, and let go of the outcome.", author: "Anonymous" },
  { text: "Alignment is the key. When your thoughts, words, and actions are in harmony, manifestation flows effortlessly.", author: "Anonymous" },
  { text: "The universe is always speaking to us. Sending us little messages, causing coincidences and serendipities, reminding us to stop, to look around, to believe in something else, something more.", author: "Nancy Thayer" },
  { text: "Everything is energy and that's all there is to it. Match the frequency of the reality you want and you cannot help but get that reality.", author: "Darryl Anka" },
];

export function getQuoteForDate(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const idx = (dayOfYear + date.getFullYear() * 7) % QUOTES.length;
  return QUOTES[Math.abs(idx)];
}

export { QUOTES };
