import { config } from 'dotenv';
config();

import { voucherAmountToWordsConverter } from './flows/voucher-amount-to-words-converter';

if (require.main === module || process.argv[1].includes('dev.ts')) {
  console.log('--- Genkit Dev Mode ---');
  voucherAmountToWordsConverter({ amountInRO: 123.450 })
    .then(result => {
      console.log('Result for 123.450:', result);
    })
    .catch(err => {
      console.error('Error:', err);
    });
}