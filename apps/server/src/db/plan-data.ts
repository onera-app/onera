export const planData = [
  {
    id: "free",
    name: "Free",
    description: "Try encrypted AI chat",
    monthlyPrice: 0,
    yearlyPrice: 0,
    inferenceRequestsLimit: 25,
    storageLimitMb: 100,
    maxEnclaves: 0,
    features: {
      voiceCalls: false,
      voiceInput: false,
      prioritySupport: false,
      dedicatedEnclaves: false,
      customModels: false,
      customEndpoints: false,
      largeModels: false,
      priorityQueue: false,
    },
    dodoPriceIdMonthly: null,
    dodoPriceIdYearly: null,
  },
  {
    id: "starter",
    name: "Starter",
    description: "Private AI for everyday use",
    monthlyPrice: 1200, // $12/mo
    yearlyPrice: 12000, // $120/yr ($10/mo)
    inferenceRequestsLimit: 500,
    storageLimitMb: 2000, // 2 GB
    maxEnclaves: 0,
    features: {
      voiceCalls: false,
      voiceInput: true,
      prioritySupport: false,
      dedicatedEnclaves: false,
      customModels: false,
      customEndpoints: true,
      largeModels: false,
      priorityQueue: false,
    },
    dodoPriceIdMonthly: "pdt_0NY6luwJk4UoMIhsO1mMe", // TODO: Create in Dodo dashboard
    dodoPriceIdYearly: "pdt_0NY6lxXewtV9yLxjq8Yzl",
  },
  {
    id: "pro",
    name: "Pro",
    description: "Serious privacy for serious work",
    monthlyPrice: 2900, // $29/mo
    yearlyPrice: 27600, // $276/yr ($23/mo)
    inferenceRequestsLimit: 5000,
    storageLimitMb: 20000, // 20 GB
    maxEnclaves: 0, // available as add-on, not included
    features: {
      voiceCalls: true,
      voiceInput: true,
      prioritySupport: false,
      dedicatedEnclaves: true, // available as add-on
      customModels: false,
      customEndpoints: true,
      largeModels: true,
      priorityQueue: false,
    },
    dodoPriceIdMonthly: "pdt_0NY6NccyasPmnImIkbocM", // TODO: Create in Dodo dashboard
    dodoPriceIdYearly: "pdt_0NY6Nj9gnxfrsiUrxrlI1",
  },
  {
    id: "privacy_max",
    name: "Privacy Max",
    description: "Maximum privacy, zero compromise",
    monthlyPrice: 4900, // $49/mo
    yearlyPrice: 46800, // $468/yr ($39/mo)
    inferenceRequestsLimit: -1, // unlimited
    storageLimitMb: 100000, // 100 GB
    maxEnclaves: -1, // unlimited (10 hrs/mo included via usage tracking)
    features: {
      voiceCalls: true,
      voiceInput: true,
      prioritySupport: true,
      dedicatedEnclaves: true,
      customModels: true,
      customEndpoints: true,
      largeModels: true,
      priorityQueue: true,
    },
    dodoPriceIdMonthly: "pdt_0NY6mBbYf6BwIo4YKhsrH", // TODO: Create in Dodo dashboard
    dodoPriceIdYearly: "pdt_0NY6mGr6afu5TvwTnrhiL",
  },
  {
    id: "team",
    name: "Team",
    description: "Encrypted AI for your organization",
    monthlyPrice: 3500, // $35/user/mo
    yearlyPrice: 39600, // $396/user/yr ($33/user/mo)
    inferenceRequestsLimit: 5000, // per user, pooled
    storageLimitMb: 20000, // per user
    maxEnclaves: -1,
    features: {
      voiceCalls: true,
      voiceInput: true,
      prioritySupport: true,
      dedicatedEnclaves: true,
      customModels: true,
      customEndpoints: true,
      largeModels: true,
      priorityQueue: true,
    },
    dodoPriceIdMonthly: "pdt_0NY6Nqvklb7ueLbSB4FCz", // TODO: Create in Dodo dashboard
    dodoPriceIdYearly: "pdt_0NY6O27jrS1W7Xfz9PLma",
  },
];
