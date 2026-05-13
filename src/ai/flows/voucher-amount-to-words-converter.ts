'use server';
/**
 * @fileOverview This file implements a Genkit flow to convert numerical amounts
 * in Omani Rial to their word format, including baisa for decimal values.
 *
 * - voucherAmountToWordsConverter - A function that converts a numerical amount to words.
 * - VoucherAmountToWordsConverterInput - The input type for the conversion.
 * - VoucherAmountToWordsConverterOutput - The return type for the conversion.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {convertAmountToWords} from '@/lib/amount-utils';

const VoucherAmountToWordsConverterInputSchema = z
  .object({
    amountInRO: z
      .number()
      .describe('The numerical amount in Omani Rial to be converted to words.'),
  })
  .describe('Input schema for converting a numerical Omani Rial amount to words.');
export type VoucherAmountToWordsConverterInput = z.infer<
  typeof VoucherAmountToWordsConverterInputSchema
>;

const VoucherAmountToWordsConverterOutputSchema = z
  .object({
    amountInWords: z
      .string()
      .describe('The numerical amount converted into its word format.'),
  })
  .describe('Output schema for the Omani Rial amount in word format.');
export type VoucherAmountToWordsConverterOutput = z.infer<
  typeof VoucherAmountToWordsConverterOutputSchema
>;

const voucherAmountToWordsConverterFlow = ai.defineFlow(
  {
    name: 'voucherAmountToWordsConverterFlow',
    inputSchema: VoucherAmountToWordsConverterInputSchema,
    outputSchema: VoucherAmountToWordsConverterOutputSchema,
  },
  async input => {
    // Use the local deterministic utility for conversion
    const amountInWords = convertAmountToWords(input.amountInRO);
    return {amountInWords};
  }
);

export async function voucherAmountToWordsConverter(
  input: VoucherAmountToWordsConverterInput
): Promise<VoucherAmountToWordsConverterOutput> {
  return voucherAmountToWordsConverterFlow(input);
}
