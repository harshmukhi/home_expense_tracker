/**
 * Intelligent categorization and classification engine for financial transactions.
 */

export const MASTER_CATEGORIES = [
  'Groceries',
  'Vegetables and Fruits',
  'Food and Dining',
  'Restaurants',
  'Electricity',
  'Water',
  'Gas',
  'Internet',
  'Mobile Recharge',
  'Rent',
  'Maintenance',
  'Household Supplies',
  'Shopping',
  'Medical',
  'Transportation',
  'Fuel',
  'Education',
  'Entertainment',
  'Subscriptions',
  'Travel',
  'Insurance',
  'EMIs',
  'Personal Expenses',
  'Internal Transfer',
  'Credit Card Repayment',
  'Salary / Income',
  'Other',
] as const;

export type MasterCategory = typeof MASTER_CATEGORIES[number];

export const PAYMENT_METHODS = [
  'Cash',
  'Debit Card',
  'Credit Card',
  'UPI',
  'Bank Transfer',
  'Cheque',
  'Wallet',
  'Net Banking',
  'Other',
] as const;

export type PaymentMethod = typeof PAYMENT_METHODS[number];

export interface ClassificationResult {
  category: string;
  paymentMethod: PaymentMethod;
  bank?: string;
  cardOrAccount?: string;
  isInternalTransfer: boolean;
  isCreditCardRepayment: boolean;
  uncertainCategorisation: boolean;
  detectedType?: 'EXPENSE' | 'INCOME' | 'TRANSFER';
}

const CATEGORY_RULES: { category: string; keywords: string[] }[] = [
  {
    category: 'Electricity',
    keywords: ['bescom', 'tneb', 'mseb', 'torrent power', 'discom', 'electric', 'electricity bill', 'uppcl', 'dhbvn', 'bses'],
  },
  {
    category: 'Water',
    keywords: ['bwssb', 'water board', 'water tanker', 'water bill', 'jal board', 'mineral water', 'water can'],
  },
  {
    category: 'Gas',
    keywords: ['hp gas', 'indane', 'bharat gas', 'piped gas', 'igl', 'mgl', 'adani gas', 'gas cylinder', 'lpg'],
  },
  {
    category: 'Internet',
    keywords: ['act fibernet', 'airtel broadband', 'jiofiber', 'jio fiber', 'wi-fi', 'wifi', 'hathway', 'tata play fiber', 'broadband'],
  },
  {
    category: 'Mobile Recharge',
    keywords: ['prepaid recharge', 'postpaid bill', 'airtel recharge', 'jio recharge', 'vi recharge', 'vodafone', 'bsnl recharge'],
  },
  {
    category: 'Rent',
    keywords: ['house rent', 'flat rent', 'apartment rent', 'owner rent', 'landlord', 'room rent', 'rent payment'],
  },
  {
    category: 'Maintenance',
    keywords: ['society maintenance', 'rwa maintenance', 'building maintenance', 'plumbing', 'electrician work', 'electrician', 'apartment maintenance', 'plumber', 'carpenter', 'repair', 'ac repair', 'ac service', 'painting', 'whitewash'],
  },
  {
    category: 'Vegetables and Fruits',
    keywords: ['vegetables', 'fruits', 'mandi', 'sabzi', 'freshtohome', 'country delight', 'fal sabzi', 'otipy'],
  },
  {
    category: 'Groceries',
    keywords: [
      'blinkit', 'zepto', 'instamart', 'bigbasket', 'dmart', 'reliance fresh', 'nature basket',
      'spencer', 'supermarket', 'kirana', 'provisions', 'groceries', 'more retail', 'star bazaar', 'milkbasket',
      'milk', 'dairy', 'curd', 'paneer', 'butter milk', 'buttermilk', 'ghee', 'bread', 'eggs', 'atta', 'rice', 'dal'
    ],
  },
  {
    category: 'Food and Dining',
    keywords: ['swiggy', 'zomato', 'eatsure', 'magicpin', 'chai point', 'starbucks', 'mcdonald', 'burger king', 'domino', 'pizza hut', 'kfc', 'cafe', 'bakery', 'breakfast', 'lunch', 'dinner', 'biryani', 'food exp', 'food', 'snacks', 'tea', 'coffee', 'canteen'],
  },
  {
    category: 'Restaurants',
    keywords: ['restaurant', 'dining', 'bistro', 'dhabha', 'hotel dining', 'barbeque nation', 'buffet', 'food court'],
  },
  {
    category: 'Fuel',
    keywords: ['petrol', 'diesel', 'hpcl', 'bpcl', 'iocl', 'indian oil', 'shell petrol', 'cng filling', 'fuel station'],
  },
  {
    category: 'Transportation',
    keywords: ['uber', 'ola cab', 'rapido', 'namma yatri', 'metro rail', 'irctc', 'redbus', 'toll plaza', 'fastag', 'auto fare'],
  },
  {
    category: 'Subscriptions',
    keywords: ['netflix', 'spotify', 'amazon prime', 'hotstar', 'disney+', 'youtube premium', 'apple.com/bill', 'google storage', 'chatgpt', 'openai', 'icloud'],
  },
  {
    category: 'Shopping',
    keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'zara', 'h&m', 'shoppers stop', 'croma', 'reliance digital', 'nykaa', 'tata cliq', 'ikea', 'dupatta', 'saree', 'suit', 'kurti', 'shirt', 'pant', 'dress', 'clothing', 'cloth', 'tailor', 'footwear', 'shoes', 'chappal'],
  },
  {
    category: 'Household Supplies',
    keywords: ['urban company', 'cleaning supplies', 'detergent', 'hardware store', 'home depot', 'pest control', 'maid salary', 'cook salary', 'bed sheet', 'bedsheet', 'pillow', 'curtain', 'blanket', 'quilt', 'mattress', 'home décor', 'home decor', 'decor', 'furnishing', 'pull over', 'pullover'],
  },
  {
    category: 'Medical',
    keywords: ['apollo pharmacy', 'pharmacy', 'chemist', '1mg', 'pharmeasy', 'hospital', 'clinic', 'dr.', 'doctor consultation', 'diagnostics', 'lal pathlabs', 'metropolis', 'dentist', 'medicine', 'medicines', 'tablet', 'pharma', 'medical'],
  },
  {
    category: 'Education',
    keywords: ['school fee', 'college fee', 'tuition', 'coaching', 'coursera', 'udemy', 'books store', 'uniform', 'exam fee'],
  },
  {
    category: 'Entertainment',
    keywords: ['bookmyshow', 'pvr', 'inox', 'cinepolis', 'movie ticket', 'gaming', 'amusement park', 'concert'],
  },
  {
    category: 'Travel',
    keywords: ['makemytrip', 'cleartrip', 'goibibo', 'air india', 'indigo', 'vistara', 'hotel booking', 'resort', 'flight ticket'],
  },
  {
    category: 'Insurance',
    keywords: ['lic of india', 'hdfc ergo', 'icici lombard', 'star health', 'tata aig', 'max life', 'life insurance', 'health insurance', 'car insurance', 'bike insurance', 'policybazaar'],
  },
  {
    category: 'EMIs',
    keywords: ['home loan emi', 'car loan emi', 'personal loan', 'bajaj finance', 'hdfc bank emi', 'sbi loan emi', 'loan instalment', 'emi debit', 'equitas loan', 'nach debit'],
  },
  {
    category: 'Personal Expenses',
    keywords: ['salon', 'spa', 'barber', 'haircut', 'gym', 'fitness', 'cult.fit', 'beauty parlour', 'cosmetics'],
  },
];

const KNOWN_BANKS = [
  { name: 'HDFC Bank', keywords: ['hdfc', 'hdfcbank'] },
  { name: 'State Bank of India', keywords: ['sbi', 'state bank of india'] },
  { name: 'ICICI Bank', keywords: ['icici', 'icicibank'] },
  { name: 'Axis Bank', keywords: ['axis', 'axisbank', 'uti bank'] },
  { name: 'Kotak Mahindra Bank', keywords: ['kotak', 'kotak mahindra'] },
  { name: 'Punjab National Bank', keywords: ['pnb', 'punjab national'] },
  { name: 'Bank of Baroda', keywords: ['bob', 'bank of baroda'] },
  { name: 'IndusInd Bank', keywords: ['indusind'] },
  { name: 'Yes Bank', keywords: ['yes bank'] },
  { name: 'Federal Bank', keywords: ['federal bank'] },
  { name: 'IDFC First Bank', keywords: ['idfc', 'idfc first'] },
  { name: 'Standard Chartered', keywords: ['stan c', 'standard chartered'] },
  { name: 'Citibank', keywords: ['citi', 'citibank'] },
  { name: 'American Express', keywords: ['amex', 'american express'] },
];

export function classifyTransaction(description: string, rawPaymentMode?: string): ClassificationResult {
  const desc = (description || '').toLowerCase();
  const modeStr = (rawPaymentMode || '').toLowerCase();
  const combined = `${desc} ${modeStr}`;

  // 1. Detect internal transfer & credit card repayment
  const isCreditCardRepayment =
    desc.includes('cc payment') ||
    desc.includes('credit card payment') ||
    desc.includes('credit card bill') ||
    desc.includes('card payment received') ||
    desc.includes('hdfc card bill') ||
    desc.includes('sbi card') ||
    desc.includes('icici card bill') ||
    desc.includes('autopay card');

  const isInternalTransfer =
    !isCreditCardRepayment &&
    (desc.includes('transfer to self') ||
      desc.includes('own account') ||
      desc.includes('self transfer') ||
      desc.includes('transfer from own') ||
      desc.includes('internal fund trf') ||
      desc.includes('sweep trf') ||
      desc.includes('auto sweep'));

  // 2. Detect Payment Method
  let paymentMethod: PaymentMethod = 'Other';
  if (
    modeStr.includes('upi') ||
    desc.includes('upi/') ||
    desc.includes('/upi') ||
    desc.includes('@upi') ||
    desc.includes('@okaxis') ||
    desc.includes('@okhdfcbank') ||
    desc.includes('@oksbi') ||
    desc.includes('@paytm') ||
    desc.includes('@ybl') ||
    desc.includes('@axl') ||
    desc.includes('@ibl') ||
    desc.includes('phonepe') ||
    desc.includes('gpay') ||
    desc.includes('google pay') ||
    desc.includes('paytm upi')
  ) {
    paymentMethod = 'UPI';
  } else if (
    modeStr.includes('credit card') ||
    desc.includes('credit card') ||
    desc.includes('cc txn') ||
    desc.includes('pos cc')
  ) {
    paymentMethod = 'Credit Card';
  } else if (
    modeStr.includes('debit card') ||
    desc.includes('pos/') ||
    desc.includes('ecom/') ||
    desc.includes('debit card') ||
    desc.includes('visa pos') ||
    desc.includes('mastercard pos')
  ) {
    paymentMethod = 'Debit Card';
  } else if (
    modeStr.includes('cash') ||
    desc.includes('cash wdl') ||
    desc.includes('atm wdl') ||
    desc.includes('atm withdrawal') ||
    desc.includes('cash withdrawal') ||
    desc.includes('cash deposit') ||
    desc.startsWith('cash ') ||
    desc === 'cash'
  ) {
    paymentMethod = 'Cash';
  } else if (
    modeStr.includes('neft') ||
    modeStr.includes('rtgs') ||
    modeStr.includes('imps') ||
    desc.includes('neft') ||
    desc.includes('rtgs') ||
    desc.includes('imps') ||
    desc.includes('bank transfer') ||
    desc.includes('fund transfer')
  ) {
    paymentMethod = 'Bank Transfer';
  } else if (modeStr.includes('net banking') || desc.includes('netbanking') || desc.includes('inb transfer')) {
    paymentMethod = 'Net Banking';
  } else if (modeStr.includes('cheque') || desc.includes('chq') || desc.includes('cheque')) {
    paymentMethod = 'Cheque';
  } else if (modeStr.includes('wallet') || desc.includes('paytm wallet') || desc.includes('amazon pay balance')) {
    paymentMethod = 'Wallet';
  } else if (modeStr.includes('card') || desc.includes('card')) {
    // Default to Debit Card if just 'Card' without credit specified
    paymentMethod = 'Debit Card';
  }

  // 3. Detect Bank
  let detectedBank: string | undefined;
  for (const b of KNOWN_BANKS) {
    if (b.keywords.some((k) => combined.includes(k))) {
      detectedBank = b.name;
      break;
    }
  }

  // 4. Detect Card / Account suffix
  let cardOrAccount: string | undefined;
  const cardMatch = combined.match(/(?:card|a\/c|acct|ending|xx|x{2,}|no\.?)\s*[:#-]?\s*([0-9]{4})/i);
  if (cardMatch) {
    cardOrAccount = `Ending ${cardMatch[1]}`;
  }

  // 5. Detect Category
  if (isCreditCardRepayment) {
    return {
      category: 'Credit Card Repayment',
      paymentMethod,
      bank: detectedBank,
      cardOrAccount,
      isInternalTransfer: true,
      isCreditCardRepayment: true,
      uncertainCategorisation: false,
      detectedType: 'TRANSFER',
    };
  }

  if (isInternalTransfer) {
    return {
      category: 'Internal Transfer',
      paymentMethod,
      bank: detectedBank,
      cardOrAccount,
      isInternalTransfer: true,
      isCreditCardRepayment: false,
      uncertainCategorisation: false,
      detectedType: 'TRANSFER',
    };
  }

  // Check for salary / income
  if (
    desc.includes('salary') ||
    desc.includes('dividend') ||
    desc.includes('interest credit') ||
    desc.includes('cashback received') ||
    desc.includes('refund received')
  ) {
    return {
      category: 'Salary / Income',
      paymentMethod,
      bank: detectedBank,
      cardOrAccount,
      isInternalTransfer: false,
      isCreditCardRepayment: false,
      uncertainCategorisation: false,
      detectedType: 'INCOME',
    };
  }

  // Match against predefined category keywords
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (desc.includes(kw)) {
        return {
          category: rule.category,
          paymentMethod,
          bank: detectedBank,
          cardOrAccount,
          isInternalTransfer: false,
          isCreditCardRepayment: false,
          uncertainCategorisation: false,
        };
      }
    }
  }

  // Fallback to "Other" and flag uncertain
  return {
    category: 'Other',
    paymentMethod,
    bank: detectedBank,
    cardOrAccount,
    isInternalTransfer: false,
    isCreditCardRepayment: false,
    uncertainCategorisation: true,
  };
}

