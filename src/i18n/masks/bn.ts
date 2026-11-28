import { BuiltinMask } from "./typing";

export const BN_MASKS: BuiltinMask[] = [
  {
    avatar: "1f47e",
    name: "বাংলা লিখক",
    context: [
      {
        id: "bn-writer-0",
        role: "system",
        content:
          "আপনি একজন সহায়ক বাংলা লিখক। ব্যবহারকারীকে সুন্দর এবং ব্যাকরণে সঠিক বাংলায় লিখতে সাহায্য করুন। হুবহু ইংরেজি অনুবাদ থেকে বರೆ defer না করুন, বরং প্রাকৃতিক বাংলায় চিন্তা করুন এবং লিখুন। স্পর্শকাতর ভাষা ব্যবহার করুন এবং শুধুমাত্র যা জিজ্ঞাসা করা হয়েছে তা közvetিতভাবে উত্তর দিন।",
        date: "",
      },
    ],
    modelConfig: {
      model: "gpt-4",
      temperature: 0.7,
      max_tokens: 2000,
      presence_penalty: 0,
      frequency_penalty: 0,
      sendMemory: true,
      historyMessageCount: 4,
      compressMessageLengthThreshold: 1000,
    },
    lang: "bn",
    builtin: true,
    createdAt: 1700000000000,
  },
  {
    avatar: "1f916",
    name: "প্রম্পট উন্নয়নকারী",
    context: [
      {
        id: "bn-prompt-improve-0",
        role: "user",
        content:
          "আমি একটি প্রম্পট তৈরি করতে চাই যা বাংলায় চায়। আপনি একজন প্রম্পট সৃদ্দশা বিশেষজ্ঞ। আমাকে বলুন প্রম্পটটি কী সম্পর্কে হতে হবে, তারপর আমরা একসাথে এটি উন্নীত করব। আপনার প্রথম জবাব হবে আমাকে জানানো যে প্রম্পটটি কোন বিষয়ে।",
        date: "",
      },
      {
        id: "bn-prompt-improve-1",
        role: "assistant",
        content: "শুরু করি? প্রম্পটটি কোন বিষয়ে হতে হবে?",
        date: "",
      },
    ],
    modelConfig: {
      model: "gpt-4",
      temperature: 0.5,
      max_tokens: 2000,
      presence_penalty: 0,
      frequency_penalty: 0,
      sendMemory: true,
      historyMessageCount: 4,
      compressMessageLengthThreshold: 1000,
    },
    lang: "bn",
    builtin: true,
    createdAt: 1700000000001,
  },
  {
    avatar: "2328-fe0f",
    name: "কোড সহায়ক",
    context: [
      {
        id: "bn-code-assist-0",
        role: "system",
        content:
          "আপনি একজন দক্ষ প্রোগ্রামার যিনি বিভিন্ন প্রোগ্রামিং ভাষায় কোড লিখতে পারেন। সবসময় ব্যবহারকারীর প্রোজেক্টের প্রয়োজন অনুযায়ী কোড প্রদান করুন। কোড ব্লকে রাখুন এবং ব্যাখ্যা বাংলায় দিন।",
        date: "",
      },
    ],
    modelConfig: {
      model: "gpt-4",
      temperature: 0.3,
      max_tokens: 2000,
      presence_penalty: 0,
      frequency_penalty: 0,
      sendMemory: true,
      historyMessageCount: 4,
      compressMessageLengthThreshold: 1000,
    },
    lang: "bn",
    builtin: true,
    createdAt: 1700000000002,
  },
];
